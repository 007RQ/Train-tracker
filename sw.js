/* PULSE Service Worker — offline app shell */
const CACHE_NAME = 'pulse-training-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

// Установка и кеширование файлов
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

// Активация и очистка старого кеша
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

// Работа приложения офлайн
self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // HTML: сначала сеть, затем кеш
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);

        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);

          cache.put(
            './index.html',
            response.clone()
          );
        }

        return response;

      } catch (_) {
        return (
          await caches.match('./index.html')
        ) || (
          await caches.match('./')
        );
      }
    })());

    return;
  }

  // Статические файлы: сначала кеш
  event.respondWith((async () => {
    const cached = await caches.match(request);

    if (cached) return cached;

    try {
      const response = await fetch(request);

      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);

        cache.put(
          request,
          response.clone()
        );
      }

      return response;

    } catch (_) {
      return new Response('Offline', {
        status: 503,
        statusText: 'Offline'
      });
    }
  })());
});
