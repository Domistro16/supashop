'use client';

import { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useOfflineQueue } from '@/lib/offline/syncEngine';

export default function OfflineQueueIndicator() {
    const { count, isOnline, draining, lastError, drainNow } = useOfflineQueue();
    const [open, setOpen] = useState(false);

    // Hide completely when everything is fine (online, empty queue, no errors).
    if (isOnline && count === 0 && !lastError) return null;

    const tone = !isOnline
        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
        : count > 0
            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';

    const Icon = !isOnline ? CloudOff : count > 0 ? AlertTriangle : CheckCircle2;

    const label = !isOnline
        ? `Offline${count > 0 ? ` · ${count} pending` : ''}`
        : count > 0
            ? `${count} pending`
            : 'Synced';

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${tone}`}
                title="Offline sync status"
            >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
            </button>

            {open && (
                <div
                    className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl p-3 z-50"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-2 mb-2">
                        {isOnline ? (
                            <Cloud className="w-4 h-4 text-green-600" />
                        ) : (
                            <CloudOff className="w-4 h-4 text-red-600" />
                        )}
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {isOnline ? 'Online' : 'Offline'}
                        </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {count === 0
                            ? 'No sales waiting to sync.'
                            : `${count} sale${count === 1 ? '' : 's'} ${isOnline ? 'queued for sync' : 'saved offline'}.`}
                    </div>
                    {lastError && (
                        <div className="text-xs text-red-600 dark:text-red-400 mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
                            Last error: {lastError}
                        </div>
                    )}
                    {count > 0 && isOnline && (
                        <button
                            type="button"
                            onClick={() => {
                                drainNow();
                            }}
                            disabled={draining}
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${draining ? 'animate-spin' : ''}`} />
                            {draining ? 'Syncing…' : 'Sync now'}
                        </button>
                    )}
                    {!isOnline && (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                            Sales will sync automatically when connection returns.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
