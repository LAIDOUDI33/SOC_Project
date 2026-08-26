/**
 * Offline-First Data Synchronization Service for Djezzy SOC Mobile PWA
 * 
 * This service handles:
 * - Service worker registration
 * - Queue for offline actions
 * - Conflict resolution strategy
 * - Background sync registration
 * Data persistence (IndexedDB wrapper)
 * - Sync status indicator
 * - Retry logic with exponential backoff
 */

// Types
export interface SyncAction {
  id: string
  type: 'create' | 'update' | 'delete' | 'acknowledge' | 'escalate'
  resource: string // e.g., 'alerts', 'incidents', 'tasks'
  resourceId?: string
  payload: Record<string, unknown>
  timestamp: number
  retryCount: number
  status: 'pending' | 'syncing' | 'completed' | 'failed'
  error?: string
}

export interface SyncStatus {
  isOnline: boolean
  pendingActions: number
  lastSyncTime: Date | null
  isSyncing: boolean
  syncError: string | null
}

export interface CacheConfig {
  name: string
  version: number
  maxAge: number // in milliseconds
}

export interface ConflictResolutionStrategy {
  type: 'last-write-wins' | 'server-wins' | 'client-wins' | 'manual'
  mergeFn?: (local: unknown, remote: unknown) => unknown
}

// Default configuration
const DEFAULT_CACHE_CONFIGS: CacheConfig[] = [
  { name: 'soc-alerts', version: 1, maxAge: 15 * 60 * 1000 }, // 15 minutes
  { name: 'soc-incidents', version: 1, maxAge: 30 * 60 * 1000 }, // 30 minutes
  { name: 'soc-iocs', version: 1, maxAge: 60 * 60 * 1000 }, // 1 hour
  { name: 'soc-feeds', version: 1, maxAge: 2 * 60 * 60 * 1000 }, // 2 hours
  { name: 'soc-static', version: 1, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
]

const SYNC_QUEUE_DB_NAME = 'soc-sync-queue'
const SYNC_QUEUE_STORE_NAME = 'actions'
const SYNC_QUEUE_VERSION = 1

class OfflineSyncService {
  private db: IDBDatabase | null = null
  private syncQueue: SyncAction[] = []
  private isOnline: boolean = navigator.onLine
  private isSyncing: boolean = false
  private lastSyncTime: Date | null = null
  private syncError: string | null = null
  private syncInterval: ReturnType<typeof setInterval> | null = null
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map()
  private cacheConfigs: CacheConfig[]
  private retryBaseDelay: number = 1000 // 1 second
  private retryMaxDelay: number = 60000 // 1 minute
  private retryMaxAttempts: number = 5

  constructor(cacheConfigs?: CacheConfig[]) {
    this.cacheConfigs = cacheConfigs || DEFAULT_CACHE_CONFIGS
    
    // Initialize event listeners map
    this.listeners.set('statuschange', new Set())
    this.listeners.set('syncstart', new Set())
    this.listeners.set('synccomplete', new Set())
    this.listeners.set('syncerror', new Set())
    this.listeners.set('actionqueued', new Set())
    this.listeners.set('actioncompleted', new Set())

    // Setup online/offline listeners
    this.setupNetworkListeners()
  }

  /**
   * Initialize the offline sync service
   */
  async initialize(): Promise<boolean> {
    try {
      // Open IndexedDB for sync queue
      await this.openDatabase()
      
      // Load existing queue from DB
      await this.loadQueueFromDB()
      
      // Register service worker
      await this.registerServiceWorker()
      
      // Start periodic sync check
      this.startPeriodicSync()
      
      console.log('[OfflineSync] Initialized successfully')
      return true
    } catch (error) {
      console.error('[OfflineSync] Initialization failed:', error)
      return false
    }
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      pendingActions: this.syncQueue.filter(a => a.status === 'pending').length,
      lastSyncTime: this.lastSyncTime,
      isSyncing: this.isSyncing,
      syncError: this.syncError
    }
  }

  /**
   * Queue an action for synchronization
   */
  async queueAction(action: Omit<SyncAction, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    const syncAction: SyncAction = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    }

    // Add to memory queue
    this.syncQueue.push(syncAction)
    
    // Persist to IndexedDB
    await this.saveActionToDB(syncAction)
    
    // Emit event
    this.emit('actionqueued', syncAction)
    this.emitStatusChange()

    // Try to sync immediately if online
    if (this.isOnline && !this.isSyncing) {
      this.processQueue()
    }

    console.log(`[OfflineSync] Action queued: ${syncAction.id}`)
    return syncAction.id
  }

  /**
   * Get data from cache with fallback to network
   */
  async getCachedData<T>(cacheName: string, key: string, fetchFn?: () => Promise<T>): Promise<T | null> {
    try {
      // Try to get from cache first
      const cached = await this.getFromCache<T>(cacheName, key)
      
      if (cached) {
        console.log(`[OfflineSync] Cache hit: ${cacheName}/${key}`)
        return cached
      }

      // If not in cache and we have a fetch function, fetch and cache
      if (fetchFn && this.isOnline) {
        const data = await fetchFn()
        await this.setToCache(cacheName, key, data)
        return data
      }

      return null
    } catch (error) {
      console.error(`[OfflineSync] Error getting cached data: ${error}`)
      return null
    }
  }

  /**
   * Preload data into cache
   */
  async preloadCache(cacheName: string, data: Record<string, unknown>): Promise<void> {
    try {
      const cache = await caches.open(cacheName)
      
      for (const [key, value] of Object.entries(data)) {
        const response = new Response(JSON.stringify(value), {
          headers: { 'Content-Type': 'application/json' }
        })
        await cache.put(`/api/cache/${cacheName}/${key}`, response)
      }
      
      console.log(`[OfflineSync] Preloaded cache: ${cacheName}`)
    } catch (error) {
      console.error(`[OfflineSync] Error preloading cache: ${error}`)
    }
  }

  /**
   * Clear specific cache
   */
  async clearCache(cacheName?: string): Promise<void> {
    try {
      if (cacheName) {
        await caches.delete(cacheName)
        console.log(`[OfflineSync] Cleared cache: ${cacheName}`)
      } else {
        const names = await caches.keys()
        for (const name of names) {
          if (name.startsWith('soc-')) {
            await caches.delete(name)
          }
        }
        console.log('[OfflineSync] Cleared all SOC caches')
      }
    } catch (error) {
      console.error('[OfflineSync] Error clearing cache:', error)
    }
  }

  /**
   * Force sync now
   */
  async forceSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline')
    }
    
    await this.processQueue()
  }

  /**
   * Clear failed actions from queue
   */
  clearFailedActions(): void {
    this.syncQueue = this.syncQueue.filter(a => a.status !== 'failed')
    this.clearFailedFromDB()
    this.emitStatusChange()
  }

  /**
   * Retry a specific failed action
   */
  async retryAction(actionId: string): Promise<void> {
    const action = this.syncQueue.find(a => a.id === actionId)
    if (!action || action.status !== 'failed') return

    action.status = 'pending'
    action.retryCount = 0
    action.error = undefined
    await this.updateActionInDB(action)
    
    if (this.isOnline && !this.isSyncing) {
      this.processQueue()
    }
  }

  /**
   * Event listener management
   */
  on(event: string, callback: (...args: unknown[]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }
    
    if (this.db) {
      this.db.close()
    }
    
    this.listeners.clear()
  }

  // Private methods

  /**
   * Open IndexedDB database
   */
  private openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(SYNC_QUEUE_DB_NAME, SYNC_QUEUE_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE_NAME)) {
          const store = db.createObjectStore(SYNC_QUEUE_STORE_NAME, { keyPath: 'id' })
          store.createIndex('status', 'status', { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('resource', 'resource', { unique: false })
        }
      }
    })
  }

  /**
   * Load queue from IndexedDB
   */
  private async loadQueueFromDB(): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(SYNC_QUEUE_STORE_NAME, 'readonly')
      const store = transaction.objectStore(SYNC_QUEUE_STORE_NAME)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.syncQueue = request.result || []
        resolve()
      }
    })
  }

  /**
   * Save action to IndexedDB
   */
  private saveActionToDB(action: SyncAction): Promise<void> {
    if (!this.db) return Promise.resolve()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(SYNC_QUEUE_STORE_NAME, 'readwrite')
      const store = transaction.objectStore(SYNC_QUEUE_STORE_NAME)
      const request = store.put(action)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Update action in IndexedDB
   */
  private updateActionInDB(action: SyncAction): Promise<void> {
    return this.saveActionToDB(action)
  }

  /**
   * Remove action from IndexedDB
   */
  private removeActionFromDB(actionId: string): Promise<void> {
    if (!this.db) return Promise.resolve()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(SYNC_QUEUE_STORE_NAME, 'readwrite')
      const store = transaction.objectStore(SYNC_QUEUE_STORE_NAME)
      const request = store.delete(actionId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Clear failed actions from DB
   */
  private clearFailedFromDB(): Promise<void> {
    if (!this.db) return Promise.resolve()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(SYNC_QUEUE_STORE_NAME, 'readwrite')
      const store = transaction.objectStore(SYNC_QUEUE_STORE_NAME)
      const index = store.index('status')
      const request = index.openCursor(IDBKeyRange.only('failed'))

      request.onerror = () => reject(request.error)
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }
    })
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })
        
        // Register background sync if available
        if ('sync' in registration) {
          await registration.sync.register('sync-queue')
        }

        console.log('[OfflineSync] Service worker registered')
      } catch (error) {
        console.error('[OfflineSync] Service worker registration failed:', error)
      }
    }
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true
      console.log('[OfflineSync] Back online')
      this.emitStatusChange()
      
      // Process queue when back online
      if (!this.isSyncing) {
        this.processQueue()
      }
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      console.log('[OfflineSync] Went offline')
      this.emitStatusChange()
    })

    // Initial state
    this.isOnline = navigator.onLine
  }

  /**
   * Start periodic sync interval
   */
  private startPeriodicSync(): void {
    // Check every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing && this.hasPendingActions()) {
        this.processQueue()
      }
    }, 30000)
  }

  /**
   * Check if there are pending actions
   */
  private hasPendingActions(): boolean {
    return this.syncQueue.some(a => a.status === 'pending')
  }

  /**
   * Process the sync queue
   */
  private async processQueue(): Promise<void> {
    if (this.isSyncing) return
    
    const pendingActions = this.syncQueue.filter(a => a.status === 'pending')
    if (pendingActions.length === 0) return

    this.isSyncing = true
    this.syncError = null
    this.emit('syncstart')
    this.emitStatusChange()

    try {
      for (const action of pendingActions) {
        await this.executeAction(action)
      }

      this.lastSyncTime = new Date()
      this.syncError = null
      this.emit('synccomplete')
    } catch (error) {
      this.syncError = error instanceof Error ? error.message : 'Unknown error'
      this.emit('syncerror', this.syncError)
      console.error('[OfflineSync] Sync error:', error)
    } finally {
      this.isSyncing = false
      this.emitStatusChange()
    }
  }

  /**
   * Execute a single sync action
   */
  private async executeAction(action: SyncAction): Promise<void> {
    action.status = 'syncing'
    await this.updateActionInDB(action)

    try {
      // Determine API endpoint based on resource
      const endpoint = this.getEndpointForAction(action)
      
      // Make API call
      const response = await fetch(endpoint, {
        method: this.getMethodForAction(action),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.payload)
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      // Mark as completed
      action.status = 'completed'
      await this.updateActionInDB(action)
      
      // Remove from memory queue after delay
      setTimeout(() => {
        this.syncQueue = this.syncQueue.filter(a => a.id !== action.id)
        this.removeActionFromDB(action.id)
      }, 5000)

      this.emit('actioncompleted', action)

    } catch (error) {
      action.retryCount++
      
      if (action.retryCount >= this.retryMaxAttempts) {
        action.status = 'failed'
        action.error = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[OfflineSync] Action failed after ${this.retryMaxAttempts} attempts:`, action.id)
      } else {
        // Reset to pending for retry with backoff
        action.status = 'pending'
        const delay = this.calculateBackoffDelay(action.retryCount)
        console.log(`[OfflineSync] Retrying action ${action.id} in ${delay}ms`)
        
        setTimeout(() => {
          if (this.isOnline && !this.isSyncing) {
            this.processQueue()
          }
        }, delay)
      }
      
      await this.updateActionInDB(action)
    }
  }

  /**
   * Get API endpoint for action
   */
  private getEndpointForAction(action: SyncAction): string {
    const baseEndpoints: Record<string, string> = {
      alerts: '/api/alerts',
      incidents: '/api/incidents',
      tasks: '/api/tasks',
      iocs: '/api/threats',
      notes: '/api/notes'
    }

    let endpoint = baseEndpoints[action.resource] || `/api/${action.resource}`
    
    if (action.resourceId && (action.type === 'update' || action.type === 'delete')) {
      endpoint += `/${action.resourceId}`
    }

    return endpoint
  }

  /**
   * Get HTTP method for action
   */
  private getMethodForAction(action: SyncAction): string {
    switch (action.type) {
      case 'create': return 'POST'
      case 'update':
      case 'acknowledge':
      case 'escalate': return 'PUT'
      case 'delete': return 'DELETE'
      default: return 'POST'
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(retryCount: number): number {
    const delay = Math.min(
      this.retryBaseDelay * Math.pow(2, retryCount),
      this.retryMaxDelay
    )
    // Add jitter (±20%)
    return delay * (0.8 + Math.random() * 0.4)
  }

  /**
   * Get data from cache
   */
  private async getFromCache<T>(cacheName: string, key: string): Promise<T | null> {
    try {
      const cache = await caches.open(cacheName)
      const response = await cache.match(`/api/cache/${cacheName}/${key}`)
      
      if (!response) return null
      
      // Check cache age
      const cacheHeader = response.headers.get('x-cache-timestamp')
      if (cacheHeader) {
        const cachedTime = parseInt(cacheHeader, 10)
        const config = this.cacheConfigs.find(c => c.name === cacheName)
        
        if (config && (Date.now() - cachedTime) > config.maxAge) {
          // Cache expired
          await cache.delete(`/api/cache/${cacheName}/${key}`)
          return null
        }
      }
      
      return await response.json() as T
    } catch {
      return null
    }
  }

  /**
   * Set data in cache
   */
  private async setToCache(cacheName: string, key: string, data: unknown): Promise<void> {
    try {
      const cache = await caches.open(cacheName)
      const response = new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'x-cache-timestamp': Date.now().toString()
        }
      })
      await cache.put(`/api/cache/${cacheName}/${key}`, response)
    } catch (error) {
      console.error('[OfflineSync] Error setting cache:', error)
    }
  }

  /**
   * Emit status change event
   */
  private emitStatusChange(): void {
    this.emit('statuschange', this.getStatus())
  }

  /**
   * Emit event
   */
  private emit(event: string, data?: unknown): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`[OfflineSync] Error in ${event} listener:`, error)
      }
    })
  }
}

// Singleton instance
let offlineSyncServiceInstance: OfflineSyncService | null = null

export function getOfflineSyncService(configs?: CacheConfig[]): OfflineSyncService {
  if (!offlineSyncServiceInstance) {
    offlineSyncServiceInstance = new OfflineSyncService(configs)
  }
  return offlineSyncServiceInstance
}

// Export types and utilities
export type { OfflineSyncService }
