// Service Worker for Offline-First Exam Platform
const CACHE_VERSION = 'exam-app-v1';
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_DYNAMIC = `${CACHE_VERSION}-dynamic`;
const CACHE_API = `${CACHE_VERSION}-api`;

// Files to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith('exam-app-') && name !== CACHE_STATIC && name !== CACHE_DYNAMIC && name !== CACHE_API)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - network first for API, cache first for assets
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // API calls - Network First (with cache fallback)
  if (url.pathname.includes('/api/')) {
    event.respondWith(networkFirstStrategy(request));
  }
  // Static assets - Cache First (with network fallback)
  else {
    event.respondWith(cacheFirstStrategy(request));
  }
});

// Network First Strategy (for API calls)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_API);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'No network connection' }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 503
      }
    );
  }
}

// Cache First Strategy (for static assets)
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Return cached version immediately
    // Update cache in background
    fetch(request)
      .then(networkResponse => {
        if (networkResponse.ok) {
          caches.open(CACHE_DYNAMIC).then(cache => {
            cache.put(request, networkResponse);
          });
        }
      })
      .catch(() => {});
    
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_DYNAMIC);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for:', request.url);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_STATIC);
      return cache.match('/index.html');
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Background Sync - sync exam results when online
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-exam-results') {
    event.waitUntil(syncExamResults());
  }
});

async function syncExamResults() {
  console.log('[SW] Syncing exam results...');
  
  try {
    // Open IndexedDB and get pending results
    const db = await openIndexedDB();
    const tx = db.transaction(['answers'], 'readonly');
    const store = tx.objectStore('answers');
    const results = await store.getAll();
    
    const pendingResults = results.filter(r => !r.synced);
    
    if (pendingResults.length === 0) {
      console.log('[SW] No pending results to sync');
      return;
    }
    
    // Sync each result
    for (const result of pendingResults) {
      try {
        const response = await fetch('/api/sync/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result)
        });
        
        if (response.ok) {
          // Mark as synced
          const updateTx = db.transaction(['answers'], 'readwrite');
          const updateStore = updateTx.objectStore('answers');
          result.synced = true;
          await updateStore.put(result);
          console.log('[SW] Synced result:', result.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync result:', result.id, error);
      }
    }
    
    console.log('[SW] Sync complete');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ExamDB', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Message handler - communicate with app
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_EXAM') {
    event.waitUntil(cacheExamData(event.data.payload));
  }
});

async function cacheExamData(examData) {
  console.log('[SW] Caching exam data for offline use');
  
  try {
    const cache = await caches.open(CACHE_API);
    
    // Cache exam data as a Response object
    const response = new Response(
      JSON.stringify(examData),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    await cache.put(`/api/exam/${examData.id}`, response);
    console.log('[SW] Exam data cached successfully');
  } catch (error) {
    console.error('[SW] Failed to cache exam data:', error);
  }
}

console.log('[SW] Service Worker loaded');
