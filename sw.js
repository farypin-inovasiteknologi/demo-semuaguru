const CACHE_NAME = 'semua-guru-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './nilai.js',
  './laporan.js',
  './logosemuaguru.png'
];

// Instalasi Service Worker & Caching File Statis
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Intercept Request & Strategi Cache First / Network Fallback
self.addEventListener('fetch', (event) => {
  // Jangan cache POST request atau request ke Google Script API
  if (event.request.method !== 'GET' || event.request.url.includes('script.google.com')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Kembalikan file dari cache jika ada
        if (response) {
          return response;
        }
        // Jika tidak ada di cache, ambil dari internet
        return fetch(event.request).then(
          function(response) {
            // Cek apakah response valid
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Simpan response baru ke cache (dinamis)
            var responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(() => {
          // Offline fallback
        });
      })
  );
});

// Membersihkan Cache lama saat ada update Service Worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});
