// Service Worker for Jugendausschuss Leonberg - Protokoll Generator
const CACHE_NAME = "ja-protokoll-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        "/",
        "/index.html",
        "/favicon.png",
        "/icon-192.png",
        "/icon-512.png",
        "/apple-touch-icon.png",
        "/manifest.json"
      ]).catch((err) => console.warn("PWA Cache Vorbereitung:", err));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first with fallback to cache for static assets (API requests are always live)
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Do not cache API endpoints
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && event.request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
