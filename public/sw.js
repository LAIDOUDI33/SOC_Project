/**
 * Service Worker for Djezzy SOC Mobile PWA
 * 
 * Features:
 * - Cache-first strategy for static assets
 * - Network-first for API calls
 * - Background sync queue
 * - Push notification handler
 * - Cache versioning and cleanup
 */

// Version and cache names
const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE_NAME = `soc-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `soc-dynamic-${CACHE_VERSION}`;
const API_CACHE_NAME = `soc-api-${CACHE_VERSION}`;
const IOC_CACHE_NAME = `soc-ioc-cache-${CACHE_VERSION}`;

// Assets to pre-cache during installation
const PRECACHE_ASSETS = [
  '/',
  '/mobile',
  '/mobile/alerts',
  '/mobile/incidents',
  '/mobile/threat-intel',
  '/manifest.json',
  // Core styles and scripts will be cached on first use
];

// API endpoints that should use network-first strategy
const API_PATTERNS = [
  /\/api\//,
  /\/mobile\/api\//
];

// Static asset patterns
const STATIC_PATTERNS = [
  /\.js$/,
  /\.css$/,
  /\.(png|jpg|jpeg|gif|svg|ico|webp)$/,
  /\.woff2?$/,
  /\.ttf$/
];

// Install event - precache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[SW] Precache failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('soc-') && 
                     name !== STATIC_CACHE_NAME &&
                     name !== DYNAMIC_CACHE_NAME &&
                     name !== API_CACHE_NAME &&
                     name !== IOC_CACHE_NAME;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - handle requests with appropriate strategies
self.addEventListener('fetch', (event: FetchEvent & { request: Request }) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Determine strategy based on request type
  if (isAPIRequest(url)) {
    // Network-first for API calls
    event.respondWith(networkFirstStrategy(request, API_CACHE_NAME));
  } else if (isStaticAsset(url.pathname)) {
    // Cache-first for static assets
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE_NAME));
  } else if (isNavigationRequest(request)) {
    // Network-first for navigation, fallback to cached shell
    event.respondWith(navigationStrategy(request));
  } else {
    // Stale-while-revalidate for other resources
    event.respondWith(staleWhileRevalidateStrategy(request, DYNAMIC_CACHE_NAME));
  }
});

// Push event - handle push notifications
self.addEventListener('push', (event: PushEvent) => {
  console.log('[SW] Push received');
  
  let data = {
    title: 'Djezzy SOC',
    body: 'Nouvelle notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'general',
    data: {},
    actions: []
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data || {},
    vibrate: [100, 50, 100],
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('[SW] Notification clicked');
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  // Handle action buttons
  if (action === 'acknowledge') {
    // Queue acknowledge action for sync
    queueSyncAction({
      type: 'acknowledge',
      resource: 'alerts',
      resourceId: data.alertId,
      payload: { acknowledged: true, timestamp: Date.now() }
    });
    
    // Open alerts page
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('/mobile/alerts') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/mobile/alerts');
        }
      })
    );
    return;
  }

  if (action === 'escalate') {
    // Queue escalate action
    queueSyncAction({
      type: 'update',
      resource: 'incidents',
      resourceId: data.incidentId,
      payload: { status: 'escalated', timestamp: Date.now() }
    });
  }

  if (action === 'view' || !action) {
    // Default action - open relevant page
    const targetUrl = data.url || '/mobile';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if target is already open
          for (const client of clientList) {
            if (client.url.includes(targetUrl) && 'focus' in client) {
              return client.focus();
            }
          }
          // Open new window
          if (clients.openWindow) {
            return clients.openWindow(targetUrl);
          }
        })
    );
  }
});

// Notification close event
self.addEventListener('notificationclose', (event: NotificationEvent) => {
  console.log('[SW] Notification closed');
  
  // Track dismissal analytics if needed
  const data = event.notification.data || {};
  
  // Could send to analytics endpoint
  /*
  fetch('/api/analytics/notification-dismissed', {
    method: 'POST',
    body: JSON.stringify({ notificationId: data.id, dismissedAt: Date.now() })
  });
  */
});

// Background sync event
self.addEventListener('sync', (event: SyncEvent) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-queue') {
    event.waitUntil(processSyncQueue());
  }
  
  if (event.tag === 'sync-iocs') {
    event.waitUntil(syncIOCCache());
  }
});

// Message event - handle messages from clients
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_STATUS':
      event.source?.postMessage({
        type: 'STATUS',
        payload: {
          cacheVersion: CACHE_VERSION,
          isOnline: navigator.onLine
        }
      });
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(clearAllCaches());
      break;
      
    case 'PRELOAD_IOCS':
      event.waitUntil(preloadIOCs(payload?.count || 100));
      break;
  }
});

// ============================================
// Caching Strategies
// ============================================

/**
 * Cache-first strategy - serves from cache, falls back to network
 */
async function cacheFirstStrategy(request: Request, cacheName: string): Promise<Response> {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    updateCacheInBackground(request, cacheName);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return offline fallback if available
    return getOfflineFallback(request);
  }
}

/**
 * Network-first strategy - tries network, falls back to cache
 */
async function networkFirstStrategy(request: Request, cacheName: string): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for API requests
    return getOfflineFallback(request);
  }
}

/**
 * Stale-while-revalidate - serves from cache while updating
 */
async function staleWhileRevalidateStrategy(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const networkPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse); // Fall back to cache on error

  return cachedResponse || networkPromise;
}

/**
 * Navigation strategy - serve app shell, fallback to cached pages
 */
async function navigationStrategy(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Try to serve cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to cached root/mobile page
    const cachedShell = await caches.match('/mobile');
    if (cachedShell) {
      return cachedShell;
    }
    
    // Final offline fallback
    return getOfflineFallback(request);
  }
}

// ============================================
// Helper Functions
// ============================================

function isAPIRequest(url: URL): boolean {
  return API_PATTERNS.some(pattern => pattern.test(url.pathname));
}

function isStaticAsset(pathname: string): boolean {
  return STATIC_PATTERNS.some(pattern => pattern.test(pathname));
}

function isNavigationRequest(request: Request): boolean {
  return request.mode === 'navigate';
}

async function updateCacheInBackground(request: Request, cacheName: string): Promise<void> {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silent fail - cache update is not critical
  }
}

async function getOfflineFallback(request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  // For API requests, return a JSON response indicating offline status
  if (isAPIRequest(url)) {
    return new Response(JSON.stringify({
      error: 'offline',
      message: 'Vous êtes actuellement hors ligne. Cette action sera synchronisée ultérieurement.',
      queued: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // For navigation requests, try to serve the offline page
  const offlinePage = await caches.match('/offline.html');
  if (offlinePage) {
    return offlinePage;
  }
  
  // Generic offline response
  return new Response(
    `<html>
      <body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;text-align:center;color:#666">
        <div>
          <h1>Hors ligne</h1>
          <p>Vérifiez votre connexion internet.</p>
        </div>
      </body>
    </html>`,
    {
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    }
  );
}

// ============================================
// Sync Queue Management
// ============================================

interface SyncAction {
  id: string;
  type: string;
  resource: string;
  resourceId?: string;
  payload: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

let syncQueue: SyncAction[] = [];

function queueSyncAction(action: Omit<SyncAction, 'id' | 'timestamp' | 'retryCount'>): void {
  const syncAction: SyncAction = {
    ...action,
    id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    retryCount: 0
  };
  
  syncQueue.push(syncAction);
  
  // Persist to IndexedDB for reliability
  saveToSyncQueueDB(syncAction);
}

async function processSyncQueue(): Promise<void> {
  if (!navigator.onLine) {
    console.log('[SW] Offline - skipping sync queue processing');
    return;
  }

  const pendingActions = syncQueue.filter(a => a.retryCount < 5);
  
  if (pendingActions.length === 0) {
    console.log('[SW] No pending sync actions');
    return;
  }

  console.log(`[SW] Processing ${pendingActions.length} sync action(s)`);

  for (const action of pendingActions) {
    try {
      const endpoint = getEndpointForAction(action);
      const method = getMethodForAction(action.type);
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.payload)
      });

      if (response.ok) {
        // Remove from queue
        syncQueue = syncQueue.filter(a => a.id !== action.id);
        removeFromSyncQueueDB(action.id);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      action.retryCount++;
      console.error(`[SW] Sync action failed (${action.retryCount}/5):`, action.id, error);
      
      // Update in DB
      updateInSyncQueueDB(action);
    }
  }
}

function getEndpointForAction(action: SyncAction): string {
  const endpoints: Record<string, string> = {
    alerts: '/api/alerts',
    incidents: '/api/incidents',
    tasks: '/api/tasks',
    iocs: '/api/threats'
  };
  
  let endpoint = endpoints[action.resource] || `/api/${action.resource}`;
  if (action.resourceId) {
    endpoint += `/${action.resourceId}`;
  }
  return endpoint;
}

function getMethodForAction(type: string): string {
  switch (type) {
    case 'create': return 'POST';
    case 'update':
    case 'acknowledge':
    case 'escalate': return 'PUT';
    case 'delete': return 'DELETE';
    default: return 'POST';
  }
}

// ============================================
// IndexedDB for Sync Queue Persistence
// ============================================

function openSyncQueueDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('soc-sync-queue-sw', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('actions')) {
        db.createObjectStore('actions', { keyPath: 'id' });
      }
    };
  });
}

async function saveToSyncQueueDB(action: SyncAction): Promise<void> {
  try {
    const db = await openSyncQueueDB();
    const tx = db.transaction('actions', 'readwrite');
    tx.objectStore('actions').put(action);
  } catch (error) {
    console.error('[SW] Failed to save to sync DB:', error);
  }
}

async function removeFromSyncQueueDB(id: string): Promise<void> {
  try {
    const db = await openSyncQueueDB();
    const tx = db.transaction('actions', 'readwrite');
    tx.objectStore('actions').delete(id);
  } catch (error) {
    console.error('[SW] Failed to remove from sync DB:', error);
  }
}

async function updateInSyncQueueDB(action: SyncAction): Promise<void> {
  await saveToSyncQueueDB(action);
}

// ============================================
// IOC Cache Functions
// ============================================

async function syncIOCCache(): Promise<void> {
  if (!navigator.onLine) return;
  
  try {
    const response = await fetch('/api/threats?limit=200&cached=true');
    if (response.ok) {
      const iocs = await response.json();
      const cache = await caches.open(IOC_CACHE_NAME);
      
      // Store IOCs in cache
      await cache.put(
        '/api/cache/iocs/all',
        new Response(JSON.stringify(iocs), {
          headers: { 
            'Content-Type': 'application/json',
            'x-cache-timestamp': Date.now().toString()
          }
        })
      );
      
      console.log(`[SW] Cached ${iocs.length || 0} IOCs`);
    }
  } catch (error) {
    console.error('[SW] IOC sync failed:', error);
  }
}

async function preloadIOCs(count: number): Promise<void> {
  await syncIOCCache();
}

// ============================================
// Cache Cleanup
// ============================================

async function clearAllCaches(): Promise<void> {
  const names = await caches.keys();
  await Promise.all(names.map(name => caches.delete(name)));
  console.log('[SW] All caches cleared');
}

declare interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<any>): void;
}

declare interface FetchEvent extends Event {
  request: Request;
  respondWith(response: Promise<Response> | Response): void;
  passThrough(): void;
}

declare interface PushEvent extends Event {
  data: PushMessageData | null;
  waitUntil(promise: Promise<any>): void;
}

declare interface PushMessageData {
  json(): any;
  text(): string;
}

declare interface NotificationEvent extends Event {
  notification: Notification;
  action: string;
  waitUntil(promise: Promise<any>): void;
}

declare interface SyncEvent extends Event {
  tag: string;
  lastChance: boolean;
  waitUntil(promise: Promise<any>): void;
}

declare interface ExtendableMessageEvent extends MessageEvent {
  source: Client | ServiceWorker | MessagePort | null;
  ports: ReadonlyArray<MessagePort>;
  data: any;
}

declare interface Client {
  url: string;
  focus(): Promise<Client>;
  navigate(url: string): Promise<Client>;
  readonly focused: boolean;
  readonly visibilityState: DocumentVisibilityState;
  readonly type: ClientType;
  readonly frameType: FrameType;
  readonly id: string;
  readonly url: string;
}

type ClientType = 'window' | 'worker' | 'sharedworker';
type FrameType = 'top-level' | 'nested' | 'none';

declare namespace global {
  var clients: Clients;
}

interface Clients {
  matchAll(options?: ClientQueryOptions): Promise<Client[]>;
  openWindow(url: string): Promise<Client | undefined>;
  claim(): Promise<undefined>;
}

interface ClientQueryOptions {
  includeUncontrolled?: boolean;
  type?: ClientType;
}
