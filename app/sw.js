'use strict';
const CACHE_PREFIX = `ibc-pwa-${new URL(self.registration.scope).pathname}-`;
const CACHE_NAME = `${CACHE_PREFIX}v8-sermon12`;
const FILES = ['./', 'index.html', 'app.css', 'audio.css', 'audio-catalog.js', 'catalog-utils.js', 'playback-progress.js', 'app.js', 'pwa.js', 'catalog.json', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
const SHELL_URLS = new Set(FILES.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => {
  // Revalidate even if the browser HTTP cache still has an earlier release.
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(
    [...SHELL_URLS].map(url => new Request(url, { cache: 'reload' }))
  )));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)))));
});
self.addEventListener('message', event => {
  // Activation is requested only after the user presses the update button.
  if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch', event => {
  // Never intercept R2, range requests, Facebook, or anything outside the exact app shell.
  if (event.request.method !== 'GET' || event.request.headers.has('range') || !SHELL_URLS.has(event.request.url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(event.request, { cache: 'no-cache', signal: controller.signal });
      if (response.ok) {
        // Storage quota failure must not prevent a successful online response.
        try { await cache.put(event.request, response.clone()); } catch { /* Online response still works. */ }
        return response;
      }
      return (await cache.match(event.request)) || response;
    } catch {
      return (await cache.match(event.request)) || new Response('No hay conexión. Vuelve a intentarlo cuando tengas Internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    } finally {
      clearTimeout(timeout);
    }
  })());
});
