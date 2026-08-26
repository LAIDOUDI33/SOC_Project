/**
 * Push Notification Service for Djezzy SOC Mobile PWA
 * 
 * This service handles:
 * - Web Push API integration
 * - Notification categories (critical, warning, info)
 * - Quiet hours configuration
 * - Delivery receipt tracking
 * - Rich notification templates
 * - Action buttons in notifications
 * - Do Not Disturb modes
 */

// Types
export type NotificationCategory = 'critical' | 'warning' | 'info' | 'update'
export type NotificationAction = 'acknowledge' | 'escalate' | 'view' | 'dismiss'

export interface NotificationPayload {
  id: string
  title: string
  body: string
  category: NotificationCategory
  icon?: string
  image?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
  actions?: NotificationActionDef[]
  requireInteraction?: boolean
  timestamp?: number
}

export interface NotificationActionDef {
  action: NotificationAction
  title: string
  icon?: string
}

export interface QuietHoursConfig {
  enabled: boolean
  startHour: number // 0-23
  endHour: number // 0-23
  allowCritical?: boolean // Allow critical notifications during quiet hours
}

export interface DeliveryReceipt {
  notificationId: string
  delivered: boolean
  deliveredAt?: Date
  readAt?: Date
  actionTaken?: NotificationAction
}

export interface PushNotificationConfig {
  vapidPublicKey: string
  serverEndpoint: string
  defaultQuietHours: QuietHoursConfig
}

// Default configuration
const DEFAULT_CONFIG: PushNotificationConfig = {
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  serverEndpoint: '/api/mobile/push',
  defaultQuietHours: {
    enabled: false,
    startHour: 22,
    endHour: 7,
    allowCritical: true
  }
}

// Rich notification templates
const NOTIFICATION_TEMPLATES: Record<string, Omit<NotificationPayload, 'id' | 'timestamp'>> = {
  critical_alert: {
    title: '🚨 Alerte Critique - Djezzy SOC',
    body: 'Une alerte critique nécessite votre attention immédiate',
    category: 'critical',
    icon: '/icons/alert-critical.png',
    tag: 'critical-alert',
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'Voir', icon: '/icons/view.png' },
      { action: 'acknowledge', title: 'Acquitter', icon: '/icons/ack.png' },
      { action: 'escalate', title: 'Escalader', icon: '/icons/escalate.png' }
    ]
  },
  high_alert: {
    title: '⚠️ Alerte Élevée - Djezzy SOC',
    body: 'Nouvelle alerte de haute priorité détectée',
    category: 'warning',
    icon: '/icons/alert-high.png',
    tag: 'high-alert',
    actions: [
      { action: 'view', title: 'Voir' },
      { action: 'acknowledge', title: 'Acquitter' }
    ]
  },
  incident_update: {
    title: '📋 Mise à jour Incident',
    body: 'Un incident assigné a été mis à jour',
    category: 'info',
    icon: '/icons/incident.png',
    tag: 'incident-update',
    actions: [
      { action: 'view', title: 'Voir détails' }
    ]
  },
  threat_intel: {
    title: '🔒 Nouvelle Intelligence Menace',
    body: 'Nouvel IOC ou feed de menace disponible',
    category: 'info',
    icon: '/icons/threat.png',
    tag: 'threat-intel',
    actions: [
      { action: 'view', title: 'Consulter' }
    ]
  },
  system_update: {
    title: '🔄 Mise à jour Système',
    body: 'Le système a été mis à jour',
    category: 'update',
    icon: '/icons/update.png',
    tag: 'system-update'
  }
}

class PushNotificationService {
  private config: PushNotificationConfig
  private registration: ServiceWorkerRegistration | null = null
  private quietHours: QuietHoursConfig
  private deliveryReceipts: Map<string, DeliveryReceipt> = new Map()
  private isDnDEnabled: boolean = false
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map()

  constructor(config?: Partial<PushNotificationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.quietHours = { ...this.config.defaultQuietHours }
    
    // Initialize event listeners map
    this.listeners.set('notificationreceived', new Set())
    this.listeners.set('notificationclick', new Set())
    this.listeners.set('notificationclose', new Set())
    this.listeners.set('permissionchange', new Set())
  }

  /**
   * Initialize the push notification service
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if push notifications are supported
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('[PushService] Push notifications not supported')
        return false
      }

      // Register service worker for push
      this.registration = await navigator.serviceWorker.ready

      // Listen for permission changes
      this.setupPermissionListener()

      // Load saved preferences from localStorage
      this.loadPreferences()

      console.log('[PushService] Initialized successfully')
      return true
    } catch (error) {
      console.error('[PushService] Initialization failed:', error)
      return false
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('[PushService] Notifications not supported')
      return 'denied'
    }

    const permission = await Notification.requestPermission()
    this.emit('permissionchange', permission)
    
    if (permission === 'granted') {
      console.log('[PushService] Notification permission granted')
      await this.subscribeToPush()
    }

    return permission
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied'
    }
    return Notification.permission
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.registration) {
      console.warn('[PushService] No service worker registration')
      return null
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.config.vapidPublicKey)
      })

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription)

      console.log('[PushService] Subscribed to push notifications')
      return subscription
    } catch (error) {
      console.error('[PushService] Subscription failed:', error)
      return null
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.registration) return false

    try {
      const subscription = await this.registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        await this.removeSubscriptionFromServer(subscription)
        console.log('[PushService] Unsubscribed from push notifications')
      }
      return true
    } catch (error) {
      console.error('[PushService] Unsubscribe failed:', error)
      return false
    }
  }

  /**
   * Show a local notification
   */
  async showNotification(payload: NotificationPayload): Promise<void> {
    // Check permissions
    if (this.getPermissionStatus() !== 'granted') {
      console.warn('[PushService] No notification permission')
      return
    }

    // Check quiet hours
    if (this.isInQuietHours() && !this.shouldBypassQuietHours(payload)) {
      console.log('[PushService] Notification suppressed (quiet hours)')
      return
    }

    // Check DND mode
    if (this.isDnDEnabled && payload.category !== 'critical') {
      console.log('[PushService] Notification suppressed (DND)')
      return
    }

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/default.png',
        image: payload.image,
        badge: payload.badge || '/icons/badge.png',
        tag: payload.tag,
        data: payload.data,
        requireInteraction: payload.requireInteraction,
        actions: payload.actions?.map(a => ({
          action: a.action,
          title: a.title,
          icon: a.icon
        }))
      })

      // Track delivery
      this.trackDelivery(payload.id)

      // Handle click
      notification.onclick = (event) => {
        event.preventDefault()
        this.handleNotificationClick(payload, event)
      }

      // Handle close
      notification.onclose = () => {
        this.emit('notificationclose', payload)
      }

      this.emit('notificationreceived', payload)
    } catch (error) {
      console.error('[PushService] Failed to show notification:', error)
    }
  }

  /**
   * Show notification using template
   */
  async showTemplateNotification(
    templateName: string,
    overrides?: Partial<NotificationPayload>
  ): Promise<void> {
    const template = NOTIFICATION_TEMPLATES[templateName]
    if (!template) {
      console.error(`[PushService] Template not found: ${templateName}`)
      return
    }

    await this.showNotification({
      id: `tmpl-${Date.now()}`,
      ...template,
      ...overrides,
      timestamp: Date.now()
    })
  }

  /**
   * Configure quiet hours
   */
  setQuietHours(config: Partial<QuietHoursConfig>): void {
    this.quietHours = { ...this.quietHours, ...config }
    this.savePreferences()
  }

  /**
   * Enable/Disable Do Not Disturb mode
   */
  setDnDEnabled(enabled: boolean): void {
    this.isDnDEnabled = enabled
    this.savePreferences()
  }

  /**
   * Get delivery receipts
   */
  getDeliveryReceipt(notificationId: string): DeliveryReceipt | undefined {
    return this.deliveryReceipts.get(notificationId)
  }

  /**
   * Get all delivery receipts
   */
  getAllDeliveryReceipts(): DeliveryReceipt[] {
    return Array.from(this.deliveryReceipts.values())
  }

  /**
   * Event listener management
   */
  on(event: string, callback: (...args: unknown[]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  private emit(event: string, data?: unknown): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`[PushService] Error in ${event} listener:`, error)
      }
    })
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(): boolean {
    if (!this.quietHours.enabled) return false

    const now = new Date()
    const currentHour = now.getHours()

    if (this.quietHours.startHour <= this.quietHours.endHour) {
      // Normal range (e.g., 22:00 - 07:00 doesn't work here, would be 07:00 - 22:00)
      return currentHour >= this.quietHours.startHour && currentHour < this.quietHours.endHour
    } else {
      // Overnight range (e.g., 22:00 - 07:00)
      return currentHour >= this.quietHours.startHour || currentHour < this.quietHours.endHour
    }
  }

  /**
   * Determine if notification should bypass quiet hours
   */
  private shouldBypassQuietHours(payload: NotificationPayload): boolean {
    return this.quietHours.allowCritical && payload.category === 'critical'
  }

  /**
   * Track notification delivery
   */
  private trackDelivery(notificationId: string): void {
    const receipt: DeliveryReceipt = {
      notificationId,
      delivered: true,
      deliveredAt: new Date()
    }
    this.deliveryReceipts.set(notificationId, receipt)
  }

  /**
   * Handle notification click
   */
  private handleNotificationClick(
    payload: NotificationPayload,
    event: Event
  ): void {
    const notification = event.target as Notification
    
    // Update receipt
    const receipt = this.deliveryReceipts.get(payload.id)
    if (receipt) {
      receipt.readAt = new Date
    }

    // Emit click event with action info
    this.emit('notificationclick', {
      payload,
      action: (event as unknown as { action?: string }).action
    })

    // Focus or open window
    if (window.focus) {
      window.focus()
    }

    notification.close()
  }

  /**
   * Setup permission change listener
   */
  private setupPermissionListener(): void {
    // Note: Permission changes don't have a native event in most browsers
    // This is handled through the requestPermission flow
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences(): void {
    try {
      localStorage.setItem('push-notifications-prefs', JSON.stringify({
        quietHours: this.quietHours,
        isDnDEnabled: this.isDnDEnabled
      }))
    } catch (error) {
      console.error('[PushService] Failed to save preferences:', error)
    }
  }

  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): void {
    try {
      const prefs = localStorage.getItem('push-notifications-prefs')
      if (prefs) {
        const parsed = JSON.parse(prefs)
        this.quietHours = { ...this.quietHours, ...parsed.quietHours }
        this.isDnDEnabled = parsed.isDnDEnabled ?? false
      }
    } catch (error) {
      console.error('[PushService] Failed to load preferences:', error)
    }
  }

  /**
   * Send subscription to server
   */
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch(this.config.serverEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          subscription: subscription.toJSON()
        })
      })
    } catch (error) {
      console.error('[PushService] Failed to send subscription to server:', error)
    }
  }

  /**
   * Remove subscription from server
   */
  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch(this.config.serverEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unsubscribe',
          subscription: subscription.toJSON()
        })
      })
    } catch (error) {
      console.error('[PushService] Failed to remove subscription from server:', error)
    }
  }

  /**
   * Convert URL-safe base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')
    
    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    
    return outputArray
  }
}

// Singleton instance
let pushNotificationServiceInstance: PushNotificationService | null = null

export function getPushNotificationService(config?: Partial<PushNotificationConfig>): PushNotificationService {
  if (!pushNotificationServiceInstance) {
    pushNotificationServiceInstance = new PushNotificationService(config)
  }
  return pushNotificationServiceInstance
}

// Export types and utilities
export { NOTIFICATION_TEMPLATES }
export type { PushNotificationService }
