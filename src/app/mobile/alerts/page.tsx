'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { MobileLayout } from '../layout'
import { MobileCard, MobileCardSkeleton } from '@/components/mobile/MobileCard'
import { MobileAlertCard, QuickAckButton } from '@/components/mobile/MobileAlertCard'
import { 
  Search, 
  Filter, 
  SlidersHorizontal,
  CheckCircle,
  Bell,
  BellOff,
  ChevronDown,
  X,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types
type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low' | 'info'
type TimeFilter = 'all' | '1h' | '6h' | '24h' | '7d' | '30d'

interface Alert {
  id: string
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  source: string
  category: string
  timestamp: Date
  isAcknowledged: boolean
  ioc?: string
}

// Mock data
const mockAlerts: Alert[] = [
  {
    id: '1',
    title: 'Tentative d\'intrusion détectée - Réseau Algérie Telecom',
    description: 'Multiple failed login attempts from IP 196.20.45.123 detected on VPN gateway. Pattern matches brute force attack signature.',
    severity: 'critical',
    source: 'IDS',
    category: 'Intrusion',
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    isAcknowledged: false,
    ioc: '196.20.45.123'
  },
  {
    id: '2',
    title: 'Anomalie de trafic - Data Center Oran',
    description: 'Unusual outbound traffic pattern detected on server cluster DC-OR-03. Volume exceeds baseline by 340%.',
    severity: 'high',
    source: 'SIEM',
    category: 'Network',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    isAcknowledged: false
  },
  {
    id: '3',
    title: 'Signature malware Emotet détectée',
    description: 'Emotet variant signature match in email attachment received by user@Djezzy.dz',
    severity: 'high',
    source: 'AV',
    category: 'Malware',
    timestamp: new Date(Date.now() - 28 * 60 * 1000),
    isAcknowledged: true
  },
  {
    id: '4',
    title: 'Accès privilégié hors horaires',
    description: 'Admin account accessed critical system outside normal working hours (23:45)',
    severity: 'medium',
    source: 'SIEM',
    category: 'Access',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    isAcknowledged: false
  },
  {
    id: '5',
    title: 'Mise à jour critique requise - Firewall',
    description: 'Critical security patch available for Palo Alto firewall firmware version 12.3. Addresses CVE-2024-XXXXX',
    severity: 'medium',
    source: 'VULN',
    category: 'Vulnerability',
    timestamp: new Date(Date.now() - 120 * 60 * 1000),
    isAcknowledged: false
  },
  {
    id: '6',
    title: 'DNS Tunneling suspecté',
    description: 'Unusual DNS query patterns detected from workstation WS-ALG-0456. Possible data exfiltration attempt.',
    severity: 'high',
    source: 'DNS',
    category: 'Exfiltration',
    timestamp: new Date(Date.now() - 180 * 60 * 1000),
    isAcknowledged: false
  },
  {
    id: '7',
    title: 'Politique DLP violée',
    description: 'Attempt to upload sensitive document to personal cloud storage blocked.',
    severity: 'medium',
    source: 'DLP',
    category: 'Data Loss',
    timestamp: new Date(Date.now() - 240 * 60 * 1000),
    isAcknowledged: true
  },
  {
    id: '8',
    title: 'Certificat SSL expirant',
    description: 'SSL certificate for api.Djezzy.dz expires in 7 days. Renewal required.',
    severity: 'low',
    source: 'MONITOR',
    category: 'Certificate',
    timestamp: new Date(Date.now() - 360 * 60 * 1000),
    isAcknowledged: false
  }
]

export default function MobileAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts)
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showDetail, setShowDetail] = useState<string | null>(null)
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set())
  const [notificationPrefs, setNotificationPrefs] = useState({
    critical: true,
    high: true,
    medium: false,
    low: false
  })

  // Filter alerts based on search and filters
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          alert.title.toLowerCase().includes(query) ||
          alert.description.toLowerCase().includes(query) ||
          alert.source.toLowerCase().includes(query) ||
          (alert.ioc && alert.ioc.toLowerCase().includes(query))
        if (!matchesSearch) return false
      }

      // Severity filter
      if (severityFilter !== 'all' && alert.severity !== severityFilter) return false

      // Time filter
      if (timeFilter !== 'all') {
        const now = new Date()
        const alertTime = alert.timestamp
        const diffMs = now.getTime() - alertTime.getTime()
        
        const timeLimits: Record<TimeFilter, number> = {
          '1h': 60 * 60 * 1000,
          '6h': 6 * 60 * 60 * 1000,
          '24h': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
          'all': Infinity
        }

        if (diffMs > timeLimits[timeFilter]) return false
      }

      return true
    })
  }, [alerts, searchQuery, severityFilter, timeFilter])

  // Stats
  const stats = useMemo(() => ({
    total: filteredAlerts.length,
    unacknowledged: filteredAlerts.filter(a => !a.isAcknowledged).length,
    critical: filteredAlerts.filter(a => a.severity === 'critical').length,
    high: filteredAlerts.filter(a => a.severity === 'high').length
  }), [filteredAlerts])

  // Handlers
  const handleAcknowledge = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === id ? { ...a, isAcknowledged: true } : a
    ))
    setSelectedAlerts(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const handleDismiss = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
    setSelectedAlerts(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const handleBulkAcknowledge = useCallback(() => {
    selectedAlerts.forEach(id => handleAcknowledge(id))
    setSelectedAlerts(new Set())
    if ('vibrate' in navigator) navigator.vibrate([20, 50, 20])
  }, [selectedAlerts, handleAcknowledge])

  const toggleSelectAlert = useCallback((id: string) => {
    setSelectedAlerts(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  return (
    <MobileLayout 
      title="Alertes"
      rightAction={
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "p-2 rounded-xl transition-all min-h-[44px] min-w-[44px]",
            showFilters ? "bg-djezzy-red text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
          style={showFilters ? { backgroundColor: '#E31837' } : undefined}
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      }
      headerContent={
        /* Search bar */
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher alertes, IOC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm
                         placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-djezzy-red/50"
              style={{ '--tw-ring-color': '#E31837' } as React.CSSProperties}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          
          {/* Quick filter chips */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            {(['all', 'critical', 'high', 'medium'] as SeverityFilter[]).map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                  "min-h-[36px] touch-manipulation",
                  severityFilter === sev
                    ? "text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200"
                )}
                style={severityFilter === sev ? { backgroundColor: '#E31837' } : undefined}
              >
                {sev === 'all' ? 'Toutes' : sev === 'critical' ? 'Critique' : sev === 'high' ? 'Élevé' : 'Moyen'}
                {sev !== 'all' && (
                  <span className="ml-1 opacity-70">
                    ({alerts.filter(a => a.severity === sev).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        {/* Stats summary */}
        <div className="grid grid-cols-4 gap-2">
          <StatBox label="Total" value={stats.total} color="gray" />
          <StatBox label="Nouvelles" value={stats.unacknowledged} color="red" />
          <StatBox label="Critiques" value={stats.critical} color="red" />
          <StatBox label="Élevées" value={stats.high} color="orange" />
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <MobileCard variant="default" className="animate-slide-down">
            <div className="space-y-4">
              {/* Time filter */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Période</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['1h', '6h', '24h', '7d', '30d', 'all'] as TimeFilter[]).map(time => (
                    <button
                      key={time}
                      onClick={() => setTimeFilter(time)}
                      className={cn(
                        "py-2 px-3 rounded-lg text-xs font-medium transition-all",
                        "min-h-[36px] touch-manipulation",
                        timeFilter === time
                          ? "bg-djezzy-red text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600"
                      )}
                      style={timeFilter === time ? { backgroundColor: '#E31837' } : undefined}
                    >
                      {time === 'all' ? 'Tout' : time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notification preferences */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <label className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5" />
                  Notifications push
                </label>
                <div className="space-y-2">
                  {(Object.keys(notificationPrefs) as Array<keyof typeof notificationPrefs>).map(sev => (
                    <button
                      key={sev}
                      onClick={() => setNotificationPrefs(prev => ({
                        ...prev,
                        [sev]: !prev[sev]
                      }))}
                      className="w-full flex items-center justify-between py-2 px-3 rounded-lg 
                                 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors min-h-[44px]"
                    >
                      <span className="text-sm capitalize">{sev === 'critical' ? 'Critique' : sev === 'high' ? 'Élevé' : sev === 'medium' ? 'Moyen' : 'Faible'}</span>
                      {notificationPrefs[sev] ? (
                        <Bell className="w-4 h-4 text-green-500" />
                      ) : (
                        <BellOff className="w-4 h-4 text-gray-300" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bulk actions */}
              {selectedAlerts.size > 0 && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={handleBulkAcknowledge}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-3 rounded-xl",
                      "font-medium text-sm text-white transition-all active:scale-[0.98]",
                      "min-h-[48px] touch-manipulation"
                    )}
                    style={{ backgroundColor: '#E31837' }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Acquitter ({selectedAlerts.size})
                  </button>
                </div>
              )}
            </div>
          </MobileCard>
        )}

        {/* Selection mode indicator */}
        {selectedAlerts.size > 0 && (
          <div className="fixed top-[calc(env(safe-area-inset-top)+140px)] left-4 right-4 z-30 
                        bg-djezzy-red text-white px-4 py-3 rounded-xl shadow-lg animate-slide-down
                        flex items-center justify-between"
            style={{ backgroundColor: '#E31837' }}>
            <span className="text-sm font-medium">
              {selectedAlerts.size} sélectionnée(s)
            </span>
            <button
              onClick={() => setSelectedAlerts(new Set())}
              className="text-xs underline"
            >
              Annuler
            </button>
          </div>
        )}

        {/* Alerts list */}
        <section aria-label="Liste des alertes">
          <div className="space-y-3">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Aucune alerte trouvée</p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSeverityFilter('all')
                    setTimeFilter('all')
                  }}
                  className="mt-3 text-sm text-djezzy-red font-medium"
                  style={{ color: '#E31837' }}
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <div key={alert.id} className="relative">
                  {/* Selection checkbox (long press to select) */}
                  {selectedAlerts.size > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSelectAlert(alert.id)
                      }}
                      className={cn(
                        "absolute -left-2 -top-2 z-10 w-6 h-6 rounded-full border-2",
                        "flex items-center justify-center transition-all",
                        selectedAlerts.has(alert.id)
                          ? "border-djezzy-red bg-djezzy-red text-white"
                          : "border-gray-300 bg-white"
                      )}
                      style={{ borderColor: selectedAlerts.has(alert.id) ? '#E31837' : undefined, backgroundColor: selectedAlerts.has(alert.id) ? '#E31837' : undefined }}
                    >
                      {selectedAlerts.has(alert.id) && (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  <MobileAlertCard
                    {...alert}
                    onAcknowledge={handleAcknowledge}
                    onDismiss={handleDismiss}
                    onClick={(id) => setShowDetail(showDetail === id ? null : id)}
                    className={cn(
                      "transition-all duration-200",
                      showDetail === alert.id && "ring-2 ring-djezzy-red ring-offset-2"
                    )}
                    style={showDetail === alert.id ? { '--tw-ring-color': '#E31837' } as React.CSSProperties : undefined}
                  />

                  {/* Detail view */}
                  {showDetail === alert.id && (
                    <AlertDetailView 
                      alert={alert} 
                      onClose={() => setShowDetail(null)}
                      onAcknowledge={() => handleAcknowledge(alert.id)}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Offline queue indicator */}
        <OfflineQueueIndicator count={2} />

        <div className="h-20" />
      </div>

      {/* Quick Ack FAB */}
      {stats.unacknowledged > 0 && (
        <QuickAckButton 
          count={stats.unacknowledged} 
          onClick={() => {
            filteredAlerts.filter(a => !a.isAcknowledged).forEach(a => handleAcknowledge(a.id))
          }} 
        />
      )}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down {
          animation: slide-down 0.25s ease-out;
        }
      `}</style>
    </MobileLayout>
  )
}

// Sub-components
function StatBox({ 
  label, 
  value, 
  color 
}: { 
  label: string
  value: number
  color: 'red' | 'orange' | 'green' | 'gray'
}) {
  const colors = {
    red: 'text-red-600 bg-red-50 dark:bg-red-950/30',
    orange: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
    green: 'text-green-600 bg-green-50 dark:bg-green-950/30',
    gray: 'text-gray-600 bg-gray-50 dark:bg-gray-900/30'
  }

  return (
    <div className={cn("rounded-xl p-3 text-center", colors[color])}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] opacity-70">{label}</div>
    </div>
  )
}

function AlertDetailView({ 
  alert, 
  onClose, 
  onAcknowledge 
}: { 
  alert: Alert
  onClose: () => void
  onAcknowledge: () => void
}) {
  return (
    <MobileCard variant="default" className="mt-2 animate-slide-down">
      <div className="space-y-4">
        {/* Header with close button */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-sm">{alert.title}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {alert.source} • {alert.category}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 min-h-[36px] min-w-[36px]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Full description */}
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {alert.description}
        </p>

        {/* IOC info */}
        {alert.ioc && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-xl border border-yellow-200">
            <div className="text-xs font-medium text-yellow-700 mb-1">IOC Associé</div>
            <code className="text-sm font-mono text-yellow-800 break-all">{alert.ioc}</code>
          </div>
        )}

        {/* Timestamp */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          <span>{alert.timestamp.toLocaleString('fr-FR')}</span>
        </div>

        {/* Actions */}
        {!alert.isAcknowledged && (
          <button
            onClick={onAcknowledge}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 rounded-xl",
              "font-medium text-sm text-white transition-all active:scale-[0.98]",
              "min-h-[48px] touch-manipulation"
            )}
            style={{ backgroundColor: '#E31837' }}
          >
            <CheckCircle className="w-4 h-4" />
            Acquitter cette alerte
          </button>
        )}
      </div>
    </MobileCard>
  )
}

function OfflineQueueIndicator({ count }: { count: number }) {
  if (count === 0) return null

  return (
    <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 
                   border border-orange-200 rounded-xl">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
        <span className="text-xs text-orange-700">
          {count} action(s) en attente de synchronisation
        </span>
      </div>
      <button className="text-xs font-medium text-orange-600 underline">
        Voir
      </button>
    </div>
  )
}
