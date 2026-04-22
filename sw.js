// ============================================================
// SERVICE WORKER - Voto Electrónico Municipal Escolar
// Versión: 2.0
// Permite que la app funcione completamente offline
// ============================================================

const CACHE_NAME = 'voto-escolar-v2';

// Archivos que se cachean para funcionar offline
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap'
];

// INSTALAR: cachear archivos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Si falla el cache de fuentes (sin internet), no bloquear instalación
        return cache.addAll(['./index.html', './manifest.json']);
      });
    }).then(() => self.skipWaiting())
  );
});

// ACTIVAR: limpiar caches viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// FETCH: estrategia Cache First para assets, Network First para API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Solicitudes a Google Apps Script: siempre red (sin caché)
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleapis.com')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'Sin conexión a internet' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Assets locales: Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      }).catch(() => {
        // Fallback a index.html si no hay conexión
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
