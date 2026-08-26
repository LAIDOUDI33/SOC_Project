'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { MobileLayout } from './layout'
import { MobileCard, MobileCardSkeleton } from '@/components/mobile/MobileCard'
import { MobileAlertCard } from '@/components/mobile/MobileAlertCard'
import { QuickAckButton } from '@/components/mobile/MobileAlertCard'
import { 
  AlertTriangle, 
  Shield, 
  Activity, 
  Clock, 
  Users, 
  CheckCircle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Bell,
  Zap,
  Target,
  ClipboardList,
  MessageSquare,
  Calendar,
  MapPin
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// Mock data for demonstration
const mockAlerts = [
  {
    id: '1',
    title: 'Tentative d\'intrusion détectée - Réseau Algérie Telecom',
    description: 'Multiple failed login attempts from IP 196.20.x.x detected on VPN gateway',
    severity: 'critical' as const,
    source: 'IDS',
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    isAcknowledged: false
  },
  {
    id: '2',
    title: 'Anomalie de trafic - Data Center Oran',
    description: 'Unusual outbound traffic pattern detected on server cluster DC-OR-03',
    severity: 'high' as const,
    source: 'SIEM',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    isAcknowledged: false
  },
  {
    id: '3',
    title: 'Signature malware détectée',
    description: 'Emotet variant signature match in email attachment',
    severity: 'medium' as const,
    source: 'AV',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    isAcknowledged: true
  },
  {
    id: '4',
    title: 'Mise à jour de sécurité requise',
    description: 'Critical patch available for firewall firmware version 12.3',
    severity: 'low' as const,
    source: 'VULN',
    timestamp: new Date(Date.now() - 120 * 60 * 1000),
    isAcknowledged: false
  }
]

const mockMetrics = {
  critical: 5,
  high: 18,
  medium: 42,
  low: 127,
  totalActiveIncidents: 3,
  mttr: '4.2h',
  slaCompliance: '94.7%'
}

const mockTasks = [
  { id: '1', title: 'Revue quotidienne des alertes', priority: 'high', completed: false },
  { id: '2', title: 'Mise à jour playbooks Q3', priority: 'medium', completed: true },
  { id: '3', title: 'Formation équipe nouvelle procédure', priority: 'low', completed: false }
]

const shiftInfo = {
  currentShift: 'Matin (08h00 - 16h00)',
  shiftLead: 'Karim B.',
  handoverNotes: '3 incidents en cours, attention au ticket INC-2024-0892',
  nextShiftTime: '16h00'
}

export default function MobileDashboard() {
  const [alerts, setAlerts] = useState(mockAlerts)
  const [isLoading, setIsLoading] = useState(false)
  const [showAllAlerts, setShowAllAlerts] = useState(4)

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsLoading(false)
  }, [])

  useRefreshHandler(handleRefresh)

  // Handle acknowledge
  const handleAcknowledge = useCallback((id: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, isAcknowledged: true } : alert
    ))
  }, [])

  // Handle dismiss
  const handleDismiss = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id))
  }, [])

  // Unacknowledged count for FAB
  const unackCount = alerts.filter(a => !a.isAcknowledged).length

  return (
    <MobileLayout 
      title="Tableau de bord"
      rightAction={
        <Link 
          href="/mobile/alerts"
          className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 
                     active:scale-95 transition-all min-h-[44px] min-w-[44px]"
        >
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          {unackCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold 
                           rounded-full flex items-center justify-center animate-pulse">
              {unakCount > 99 ? '99+' : unackCount}
            </span>
          )}
        </Link>
      }
    >
      <div className="p-4 space-y-6">
        {/* Critical Alerts Summary */}
        <section aria-label="Résumé des alertes critiques">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              État des Alertes
            </h2>
            <button className="text-xs text-djezzy-red font-medium" style={{ color: '#E31837' }}>
              Voir tout
            </button>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            <MetricBox
              label="Critique"
              value={mockMetrics.critical}
              color="red"
              trend="up"
            />
            <MetricBox
              label="Élevé"
              value={mockMetrics.high}
              color="orange"
              trend="up"
            />
            <MetricBox
              label="Moyen"
              value={mockMetrics.medium}
              color="yellow"
              trend="down"
            />
            <MetricBox
              label="Faible"
              value={mockMetrics.low}
              color="green"
              trend="stable"
            />
          </div>
        </section>

        {/* Quick Actions */}
        <section aria-label="Actions rapides">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Actions Rapides
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <QuickActionButton
              icon={<CheckCircle className="w-6 h-6" />}
              label="Acquitter"
              color="green"
              onClick={() => console.log('Acknowledge all')}
            />
            <QuickActionButton
              icon={<ArrowRight className="w-6 h-6" />}
              label="Escalader"
              color="orange"
              onClick={() => console.log('Escalate')}
            />
            <QuickActionButton
              icon={<Target className="w-6 h-6" />}
              label="Enquêter"
              color="blue"
              onClick={() => console.log('Investigate')}
            />
          </div>
        </section>

        {/* Live Incident Feed */}
        <section aria-label="Flux d'alertes en direct">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-djezzy-red" style={{ color: '#E31837' }} />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Alertes Récentes
              </h2>
              <span className="flex items-center gap-1 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <Link 
              href="/mobile/alerts"
              className="flex items-center gap-1 text-xs text-djezzy-red font-medium"
              style={{ color: '#E31837' }}
            >
              Tout voir
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <>
                <MobileCardSkeleton />
                <MobileCardSkeleton />
              </>
            ) : (
              alerts.slice(0, showAllAlerts).map((alert) => (
                <MobileAlertCard
                  key={alert.id}
                  {...alert}
                  onAcknowledge={handleAcknowledge}
                  onDismiss={handleDismiss}
                  onClick={(id) => console.log('View alert:', id)}
                />
              ))
            )}
            
            {!isLoading && alerts.length > showAllAlerts && (
              <button
                onClick={() => setShowAllAlerts(prev => prev + 4)}
                className={cn(
                  "w-full py-3 text-sm font-medium rounded-xl border-2 border-dashed",
                  "border-gray-200 dark:border-gray-700 text-gray-500",
                  "hover:border-djezzy-red hover:text-djezzy-red",
                  "active:scale-[0.98] transition-all min-h-[44px]",
                  "touch-manipulation"
                )}
                style={{ '--tw-border-color': '#E31837' } as React.CSSProperties}
              >
                Charger plus d&apos;alertes
              </button>
            )}
          </div>
        </section>

        {/* Network Status Overview */}
        <section aria-label="État du réseau">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            État du Système
          </h2>
          <MobileCard variant="metric" expandable expandedContent={
            <div className="space-y-3">
              <StatusRow label="SIEM Platform" status="operational" />
              <StatusRow label="EDR Sensors" status="degraded" />
              <StatusRow label="Network Monitoring" status="operational" />
              <StatusRow label="Threat Intelligence" status="operational" />
              <StatusRow label="Backup Systems" status="maintenance" />
            </div>
          }>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-xl">
                <div className="text-2xl font-bold text-green-600">{mockMetrics.slaCompliance}</div>
                <div className="text-xs text-gray-500">SLA Aujourd&apos;hui</div>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                <div className="text-2xl font-bold text-blue-600">{mockMetrics.mttr}</div>
                <div className="text-xs text-gray-500">MTTR Moyen</div>
              </div>
            </div>
          </MobileCard>
        </section>

        {/* Personal Task List */}
        <section aria-label="Mes tâches">
          <div className="flex items-center justify-between mb-3">
            <ClipboardList className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white ml-2">
              Mes Tâches
            </h2>
            <span className="text-xs text-gray-500">
              {mockTasks.filter(t => !t.completed).length} en cours
            </span>
          </div>
          
          <div className="space-y-2">
            {mockTasks.map(task => (
              <TaskItem key={task.id} {...task} />
            ))}
          </div>
        </section>

        {/* Shift Information */}
        <section aria-label="Information d'équipe">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Information d&apos;Équipe
          </h2>
          <MobileCard variant="default">
            <div className="space-y-3">
              {/* Current shift */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Poste actuel</div>
                  <div className="text-sm font-medium">{shiftInfo.currentShift}</div>
                </div>
              </div>
              
              {/* Shift lead */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Chef d&apos;équipe</div>
                  <div className="text-sm font-medium">{shiftInfo.shiftLead}</div>
                </div>
              </div>
              
              {/* Next shift */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                  <Calendar className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Prochain poste</div>
                  <div className="text-sm font-medium">{shiftInfo.nextShiftTime}</div>
                </div>
              </div>
              
              {/* Handover notes */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Notes de relève</div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                      {shiftInfo.handoverNotes}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </MobileCard>
        </section>

        {/* Bottom spacing for FAB */}
        <div className="h-20" />
      </div>

      {/* Quick Acknowledge FAB */}
      <QuickAckButton 
        count={unackCount} 
        onClick={() => {
          alerts.filter(a => !a.isAcknowledged).forEach(a => handleAcknowledge(a.id))
        }} 
      />

      {/* Custom styles */}
      <style jsx>{`
        .djezzy-red {
          color: #E31837;
        }
      `}</style>
    </MobileLayout>
  )
}

// Sub-components
function MetricBox({ 
  label, 
  value, 
  color, 
  trend 
}: { 
  label: string
  value: number
  color: 'red' | 'orange' | 'yellow' | 'green'
  trend: 'up' | 'down' | 'stable'
}) {
  const colors = {
    red: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-600', border: 'border-red-200' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-600', border: 'border-orange-200' },
    yellow: { bg: 'bg-yellow-50 dark:bg-yellow-950/30', text: 'text-yellow-600', border: 'border-yellow-200' },
    green: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-600', border: 'border-green-200' }
  }

  return (
    <div className={cn(
      "rounded-xl border p-3 text-center",
      colors[color].bg,
      colors[color].border
    )}>
      <div className={cn("text-xl font-bold", colors[color].text)}>
        {value}
      </div>
      <div className="text-[10px] text-gray-500 mt-1">{label}</div>
      <div className="flex justify-center mt-1">
        {trend === 'up' ? (
          <TrendingUp className="w-3 h-3 text-red-500" />
        ) : trend === 'down' ? (
          <TrendingDown className="w-3 h-3 text-green-500" />
        ) : (
          <Minus className="w-3 h-3 text-gray-400" />
        )}
      </div>
    </div>
  )
}

function QuickActionButton({
  icon,
  label,
  color,
  onClick
}: {
  icon: React.ReactNode
  label: string
  color: 'green' | 'orange' | 'blue'
  onClick: () => void
}) {
  const colors = {
    green: 'bg-green-50 hover:bg-green-100 text-green-600 active:bg-green-200',
    orange: 'bg-orange-50 hover:bg-orange-100 text-orange-600 active:bg-orange-200',
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-600 active:bg-blue-200'
  }

  return (
    <button
      onClick={() => {
        onClick()
        if ('vibrate' in navigator) navigator.vibrate(15)
      }}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-xl",
        "transition-all duration-150 active:scale-95",
        "touch-manipulation min-h-[80px]",
        colors[color]
      )}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

function TaskItem({ 
  title, 
  priority, 
  completed 
}: { 
  title: string
  priority: string
  completed: boolean 
}) {
  const priorityColors = {
    high: 'bg-red-100 text-red-600',
    medium: 'bg-yellow-100 text-yellow-600',
    low: 'bg-gray-100 text-gray-600'
  }

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-xl border",
      completed ? "bg-gray-50 border-gray-200 opacity-70" : "bg-white border-gray-200 dark:border-gray-700"
    )}>
      <button
        onClick={() => {
          if ('vibrate' in navigator) navigator.vibrate(10)
        }}
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
          completed 
            ? "bg-green-500 border-green-500 text-white" 
            : "border-gray-300 hover:border-djezzy-red"
        )}
        style={!completed ? { '--tw-border-color': '#E31837' } as React.CSSProperties : undefined}
      >
        {completed && <CheckCircle className="w-4 h-4" />}
      </button>
      
      <span className={cn(
        "flex-1 text-sm",
        completed && "line-through text-gray-500"
      )}>
        {title}
      </span>
      
      <span className={cn(
        "text-[10px] px-2 py-0.5 rounded-full font-medium",
        priorityColors[priority as keyof typeof priorityColors]
      )}>
        {priority === 'high' ? 'Haute' : priority === 'medium' ? 'Moyenne' : 'Basse'}
      </span>
    </div>
  )
}

function StatusRow({ 
  label, 
  status 
}: { 
  label: string
  status: 'operational' | 'degraded' | 'maintenance' | 'down'
}) {
  const statusConfig = {
    operational: { color: 'bg-green-500', text: 'Opérationnel' },
    degraded: { color: 'bg-yellow-500', text: 'Dégradé' },
    maintenance: { color: 'bg-blue-500', text: 'Maintenance' },
    down: { color: 'bg-red-500', text: 'Hors service' }
  }

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn("w-2 h-2 rounded-full", statusConfig[status].color)} />
        <span className="text-xs text-gray-500">{statusConfig[status].text}</span>
      </div>
    </div>
  )
}

// Hook for handling pull-to-refresh
function useRefreshHandler(handler: () => Promise<void>) {
  useEffect(() => {
    const handleRefresh = async () => await handler()
    window.addEventListener('mobile-refresh', handleRefresh)
    return () => window.removeEventListener('mobile-refresh', handleRefresh)
  }, [handler])
}
