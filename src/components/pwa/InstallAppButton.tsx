'use client';

import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

const DISMISS_KEY = 'supashop:install-dismissed-at';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type BIPEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function detectIOSSafari(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    return isIOS && isSafari;
}

function isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
        window.matchMedia?.('(display-mode: standalone)').matches ||
        // iOS
        (navigator as any).standalone === true
    );
}

function wasRecentlyDismissed(): boolean {
    if (typeof localStorage === 'undefined') return false;
    const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return ts > 0 && Date.now() - ts < DISMISS_COOLDOWN_MS;
}

export default function InstallAppButton() {
    const [installEvent, setInstallEvent] = useState<BIPEvent | null>(null);
    const [showIosHint, setShowIosHint] = useState(false);
    const [installed, setInstalled] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (isStandalone()) {
            setInstalled(true);
            return;
        }
        if (wasRecentlyDismissed()) {
            setDismissed(true);
            return;
        }

        const onBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallEvent(e as BIPEvent);
        };
        const onAppInstalled = () => {
            setInstalled(true);
            setInstallEvent(null);
        };

        window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        window.addEventListener('appinstalled', onAppInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
            window.removeEventListener('appinstalled', onAppInstalled);
        };
    }, []);

    const handleInstall = async () => {
        // Chrome/Edge/Android path: native prompt is available
        if (installEvent) {
            try {
                await installEvent.prompt();
                const { outcome } = await installEvent.userChoice;
                if (outcome === 'accepted') {
                    setInstalled(true);
                }
                setInstallEvent(null);
            } catch {
                // Swallow — user closed or event was stale
            }
            return;
        }
        // iOS Safari path: no prompt event — show instructions
        if (detectIOSSafari()) {
            setShowIosHint(true);
        }
    };

    const dismiss = () => {
        try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {
            /* ignore */
        }
        setDismissed(true);
        setInstallEvent(null);
    };

    if (installed || dismissed) return null;

    // Show button only when: Chrome/Edge/Android has fired the event, OR we detect iOS Safari.
    const iosEligible = detectIOSSafari();
    if (!installEvent && !iosEligible) return null;

    return (
        <>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={handleInstall}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                    title="Install Supashop as an app — works offline"
                >
                    <Download className="w-3.5 h-3.5" />
                    <span>Install app</span>
                </button>
                <button
                    type="button"
                    onClick={dismiss}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5"
                    title="Not now"
                    aria-label="Dismiss install prompt"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>

            {showIosHint && (
                <div
                    className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4"
                    onClick={() => setShowIosHint(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Install Supashop</h3>
                            <button
                                type="button"
                                onClick={() => setShowIosHint(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                aria-label="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                            <li className="flex items-start gap-2">
                                <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                                <span>
                                    Tap the <Share className="inline w-4 h-4 align-text-bottom" /> Share button at the bottom of Safari.
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                                <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                                <span>Tap <strong>Add</strong>. Supashop will open from your home screen and work offline.</span>
                            </li>
                        </ol>
                        <button
                            type="button"
                            onClick={() => setShowIosHint(false)}
                            className="mt-5 w-full py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
