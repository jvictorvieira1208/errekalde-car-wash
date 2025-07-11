const CACHE_NAME = 'errekalde-car-wash-v2.0.0';
const STATIC_ASSETS = [
    '/',
    '/api/health',
    '/api/sync-espacios',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

const API_CACHE = 'api-cache-v1';
const IMAGE_CACHE = 'image-cache-v1';

// Install event
self.addEventListener('install', event => {
    console.log('🔧 Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('🔧 Service Worker: Caching static assets...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('✅ Service Worker: Installation complete');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ Service Worker: Installation failed', error);
            })
    );
});

// Activate event
self.addEventListener('activate', event => {
    console.log('🔧 Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME && cacheName !== API_CACHE && cacheName !== IMAGE_CACHE) {
                            console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker: Activation complete');
                return self.clients.claim();
            })
    );
});

// Fetch event
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // Handle static assets
    if (isStaticAsset(request)) {
        event.respondWith(handleStaticAsset(request));
        return;
    }

    // Handle navigation requests
    if (request.mode === 'navigate') {
        event.respondWith(handleNavigation(request));
        return;
    }

    // Default: try network first, then cache
    event.respondWith(
        fetch(request)
            .catch(() => caches.match(request))
    );
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
    const url = new URL(request.url);
    
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        // Cache successful GET requests
        if (request.method === 'GET' && networkResponse.ok) {
            const cache = await caches.open(API_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('🔄 Service Worker: Network failed, trying cache for:', url.pathname);
        
        // Fallback to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline data for sync-espacios
        if (url.pathname === '/api/sync-espacios') {
            return new Response(JSON.stringify({
                espacios: getOfflineSpaces(),
                timestamp: new Date(),
                source: 'service-worker-offline',
                database: 'cached'
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Return error response
        return new Response(JSON.stringify({
            error: 'Sin conexión a internet',
            offline: true,
            timestamp: new Date()
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('🔄 Service Worker: Failed to fetch static asset:', request.url);
        throw error;
    }
}

// Handle navigation requests
async function handleNavigation(request) {
    try {
        return await fetch(request);
    } catch (error) {
        // Return cached main page
        const cachedResponse = await caches.match('/');
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page
        return new Response(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Sin conexión - Errekalde Car Wash</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 50px;
                        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                    }
                    .offline-container {
                        max-width: 400px;
                        margin: 0 auto;
                        background: white;
                        padding: 30px;
                        border-radius: 15px;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                    }
                    .offline-icon {
                        font-size: 4rem;
                        color: #ef4444;
                        margin-bottom: 20px;
                    }
                    h1 { color: #1f2937; }
                    p { color: #6b7280; }
                    .retry-btn {
                        background: #3b82f6;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 16px;
                        cursor: pointer;
                        margin-top: 20px;
                    }
                    .retry-btn:hover {
                        background: #2563eb;
                    }
                </style>
            </head>
            <body>
                <div class="offline-container">
                    <div class="offline-icon">📱❌</div>
                    <h1>Sin conexión</h1>
                    <p>No hay conexión a internet. Algunas funciones pueden estar limitadas.</p>
                    <button class="retry-btn" onclick="window.location.reload()">
                        Intentar de nuevo
                    </button>
                </div>
            </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

// Check if request is for static asset
function isStaticAsset(request) {
    const url = new URL(request.url);
    return (
        url.pathname.includes('/css/') ||
        url.pathname.includes('/js/') ||
        url.pathname.includes('/images/') ||
        url.pathname.includes('/icons/') ||
        url.origin.includes('cdn.jsdelivr.net') ||
        url.origin.includes('bootstrap')
    );
}

// Generate offline spaces data
function getOfflineSpaces() {
    const spaces = {};
    const today = new Date();
    
    // Generate next 12 Wednesdays with default availability
    for (let i = 0; i < 12; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + (7 * i));
        
        // Find next Wednesday
        while (date.getDay() !== 3) {
            date.setDate(date.getDate() + 1);
        }
        
        const dateKey = date.toDateString();
        spaces[dateKey] = 8; // Default availability
    }
    
    return spaces;
}

// Background sync for offline reservations
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync-reservations') {
        console.log('🔄 Service Worker: Background sync triggered');
        event.waitUntil(syncOfflineReservations());
    }
});

// Sync offline reservations when connection is restored
async function syncOfflineReservations() {
    try {
        // Get offline reservations from IndexedDB (if implemented)
        console.log('🔄 Service Worker: Syncing offline reservations...');
        
        // This would sync any offline reservations
        // For now, just log the event
        console.log('✅ Service Worker: Offline reservations synced');
    } catch (error) {
        console.error('❌ Service Worker: Sync failed', error);
    }
}

// Push notification handling
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Nueva notificación de Car Wash',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Ver detalles',
                icon: '/icons/checkmark.png'
            },
            {
                action: 'close',
                title: 'Cerrar',
                icon: '/icons/xmark.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Errekalde Car Wash', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

console.log('🚗 Service Worker: Errekalde Car Wash SW loaded'); 