
const CACHE_NAME = 'supashop-v2';
const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS = [
    '/',
    '/offline.html',
    '/manifest.json',
    '/logo.png',
    '/favicon.png',
    '/android-chrome-192x192.png',
    '/android-chrome-512x512.png',
];

// Install — precache the app shell and offline fallback
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    self.skipWaiting();
});

// Activate — drop old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            )
        )
    );
    self.clients.claim();
});

// Fetch strategy:
// - Navigations: network-first, fall back to cached page, then /offline.html
// - Images: cache-first with network fallback
// - Everything else same-origin: network-first with cache fallback
// - API requests are always network-only (never cached) to avoid stale data
self.addEventListener('fetch', (event) => {
    const request = event.request;

    if (request.method !== 'GET') return;
    if (!request.url.startsWith(self.location.origin)) return;

    const url = new URL(request.url);

    // Never cache API responses — stale reads would be dangerous for inventory/sales
    if (url.pathname.startsWith('/api/')) {
        return; // Let the browser handle it normally
    }

    // Navigation requests
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
                    return response;
                })
                .catch(async () => {
                    const cached = await caches.match(request);
                    if (cached) return cached;
                    const offline = await caches.match(OFFLINE_URL);
                    return offline || new Response('Offline', { status: 503, statusText: 'Offline' });
                })
        );
        return;
    }

    // Images — cache-first
    if (request.destination === 'image') {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) =>
                cache.match(request).then((cached) =>
                    cached || fetch(request).then((res) => {
                        if (res.ok) cache.put(request, res.clone());
                        return res;
                    }).catch(() => cached || Response.error())
                )
            )
        );
        return;
    }

    // Default: network-first, fall back to cache
    event.respondWith(
        fetch(request)
            .then((res) => {
                if (res.ok) {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
                }
                return res;
            })
            .catch(() => caches.match(request))
    );
});
