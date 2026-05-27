const CACHE_VERSION = 'v2';
const CACHE_NAME = `portfolio-cache-${CACHE_VERSION}`;

// Core assets to pre-cache (App Shell)
const APP_SHELL = [
  '/',
  '/index.html',
  '/pages/work.html',
  '/pages/blog.html',
  '/pages/post.html',
  '/pages/behind.html',
  '/404.html',
  '/css/global.css',
  '/css/home.css',
  '/css/work.css',
  '/css/blog.css',
  '/css/post.css',
  '/css/behind.css',
  '/css/404.css',
  '/js/global.js',
  '/js/blueprint.js',
  '/js/home-loader.js',
  '/js/home.js',
  '/js/work-loader.js',
  '/js/work.js',
  '/js/blog-loader.js',
  '/js/blog.js',
  '/js/post-loader.js',
  '/js/post.js',
  '/js/behind-loader.js',
  '/js/behind.js',
  '/js/404.js'
];

// Install Event: Pre-cache the App Shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Add all shell files. We use map and catch to ensure that if one fails,
      // it doesn't fail the whole installation.
      return Promise.allSettled(
        APP_SHELL.map(url => cache.add(url).catch(err => console.warn(`[SW] Failed to cache ${url}:`, err)))
      );
    })
  );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`[SW] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Route traffic to the correct caching strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Exclude non-GET requests or browser extension requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Strategy 1: Stale-While-Revalidate for dynamic data (JSON, Markdown)
  // Check if it's hitting our local data folder or the external CDN data endpoint
  const isDataRequest = url.pathname.includes('/data/') || url.hostname === 'cdn.ianurag.site';

  if (isDataRequest) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request, { ignoreSearch: true });
        
        // Fetch fresh data in the background
        const networkFetch = fetch(request).then((networkResponse) => {
          // Update the cache if the response is valid
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch((error) => {
          console.warn('[SW] Network fetch failed for data, relying solely on cache.', error);
          return new Response(JSON.stringify({ error: 'Offline', message: 'Data fetch failed and no cache available.' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        });

        // Return the cached response instantly if we have it, otherwise wait for the network
        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  // Strategy 2: Cache-First (Fallback to Network) for static App Shell and external assets
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        // Fix for ERR_FAILED: Returning a redirected response to a navigation request is blocked by Chrome
        if (cachedResponse.redirected && request.mode === 'navigate') {
          return new Response(cachedResponse.body, {
            status: cachedResponse.status,
            statusText: cachedResponse.statusText,
            headers: cachedResponse.headers
          });
        }
        return cachedResponse;
      }

      // Not in cache, fetch from network and add to cache
      return fetch(request).then((networkResponse) => {
        // Only cache valid responses (e.g. ignore 404s or opaque responses if they error)
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
          return networkResponse;
        }

        // Cache external assets (Fonts, JS libraries, etc) and local assets missing from shell
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return networkResponse;
      }).catch((error) => {
        console.warn('[SW] Offline and resource not in cache:', request.url);
        // Prevent returning undefined, which causes ERR_FAILED
        return new Response('Offline or Network Error. Please check your connection.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});
