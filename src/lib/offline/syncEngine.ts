'use client';

import { useEffect, useState } from 'react';
import {
    listQueuedSales,
    removeQueuedSale,
    markAttempt,
    countQueuedSales,
    QueuedSale,
} from './saleQueue';

const API_BASE_URL =
    typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/api'
        : 'http://localhost:3000/api';

const POLL_INTERVAL_MS = 30_000;
const MAX_ATTEMPTS_BEFORE_BACKOFF = 5;
const BACKOFF_COOLDOWN_MS = 5 * 60_000;

async function postSale(entry: QueuedSale): Promise<Response> {
    const token =
        typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-shop-id': entry.shopId,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const body = {
        ...entry.payload,
        clientTempId: entry.clientTempId,
        fromOfflineSync: true,
    };

    return fetch(`${API_BASE_URL}/sales`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
}

export interface DrainReport {
    synced: number;
    failed: number;
    skipped: number;
    errors: Array<{ clientTempId: string; error: string }>;
}

export async function drainQueue(): Promise<DrainReport> {
    const now = Date.now();
    const report: DrainReport = { synced: 0, failed: 0, skipped: 0, errors: [] };

    const items = await listQueuedSales();
    if (items.length === 0) return report;

    for (const entry of items) {
        // Exponential-ish cooldown: after N failures, wait before retrying again.
        if (
            entry.attempts >= MAX_ATTEMPTS_BEFORE_BACKOFF &&
            entry.lastAttemptAt &&
            now - entry.lastAttemptAt < BACKOFF_COOLDOWN_MS
        ) {
            report.skipped++;
            continue;
        }

        try {
            const res = await postSale(entry);
            if (res.ok) {
                await removeQueuedSale(entry.clientTempId);
                report.synced++;
                continue;
            }

            // 401/403 — auth has expired. Leave queued and stop draining; nothing else will succeed.
            if (res.status === 401 || res.status === 403) {
                const text = await res.text().catch(() => 'Auth failed');
                await markAttempt(entry.clientTempId, `Auth: ${text.slice(0, 160)}`);
                report.failed++;
                report.errors.push({ clientTempId: entry.clientTempId, error: 'Auth expired — please sign in again' });
                break;
            }

            const payload = await res.json().catch(() => ({}));
            const message = payload?.error || `HTTP ${res.status}`;
            await markAttempt(entry.clientTempId, message);
            report.failed++;
            report.errors.push({ clientTempId: entry.clientTempId, error: message });
        } catch (err: any) {
            // Network-level failure — keep in queue for retry.
            await markAttempt(entry.clientTempId, err?.message || 'Network error');
            report.failed++;
            report.errors.push({ clientTempId: entry.clientTempId, error: err?.message || 'Network error' });
        }
    }

    return report;
}

// ============================================================================
// React hooks
// ============================================================================

type Listener = () => void;
const listeners = new Set<Listener>();

function emitChange() {
    for (const l of listeners) {
        try { l(); } catch { /* swallow */ }
    }
}

/**
 * Call after enqueueing a new sale so any mounted hooks refresh their counts.
 */
export function notifyQueueChanged() {
    emitChange();
}

/**
 * Hook: returns live queue count + online status + manual drain trigger.
 * Also runs the background sync loop once (first hook to mount owns the loop).
 */
export function useOfflineQueue() {
    const [count, setCount] = useState(0);
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true,
    );
    const [draining, setDraining] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const refresh = async () => {
            const n = await countQueuedSales();
            if (!cancelled) setCount(n);
        };

        const drain = async () => {
            if (cancelled) return;
            if (typeof navigator !== 'undefined' && !navigator.onLine) return;
            setDraining(true);
            try {
                const report = await drainQueue();
                if (!cancelled) {
                    setLastError(report.errors[0]?.error || null);
                    await refresh();
                }
            } finally {
                if (!cancelled) setDraining(false);
            }
        };

        const onOnline = () => {
            if (cancelled) return;
            setIsOnline(true);
            drain();
        };
        const onOffline = () => {
            if (cancelled) return;
            setIsOnline(false);
        };

        const listener: Listener = () => refresh();
        listeners.add(listener);

        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);

        // Initial: count + try to drain anything left over from last session
        refresh();
        drain();

        const interval = window.setInterval(() => {
            if (cancelled) return;
            if (!navigator.onLine) return;
            // Only bother with a drain pass if there's something to drain.
            countQueuedSales().then((n) => {
                if (n > 0) drain();
            });
        }, POLL_INTERVAL_MS);

        return () => {
            cancelled = true;
            listeners.delete(listener);
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
            window.clearInterval(interval);
        };
    }, []);

    const drainNow = async () => {
        if (draining) return;
        setDraining(true);
        try {
            const report = await drainQueue();
            setLastError(report.errors[0]?.error || null);
            const n = await countQueuedSales();
            setCount(n);
            emitChange();
        } finally {
            setDraining(false);
        }
    };

    return { count, isOnline, draining, lastError, drainNow };
}
