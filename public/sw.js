const CACHE = "shopmate-shell-v1";
const APP_SHELL = ["/", "/voice", "/settings", "/shopmate-icon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  // Never cache API responses: shop data must come from the authoritative
  // database layer, not an arbitrary stale browser response.
  if (new URL(request.url).pathname.startsWith("/api/")) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
