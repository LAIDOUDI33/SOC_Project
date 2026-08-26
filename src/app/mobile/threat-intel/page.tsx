'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { MobileLayout } from '../layout'
import { MobileCard, MobileCardSkeleton } from '@/components/mobile/MobileCard'
import { 
  Search, 
  Shield, 
  AlertTriangle, 
  Globe, 
  Fingerprint,
  Hash,
  Download,
  Star,
  ExternalLink,
  Clock,
  TrendingUp,
  WifiOff,
  ChevronRight,
  X,
  Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types
type IOCCategory = 'ip' | 'domain' | 'url' | 'hash' | 'email'
type ThreatLevel = 'critical' | 'high' | 'medium' | 'low' | 'info'
type FeedCategory = 'apt' | 'malware' | 'phishing' | 'vulnerability' | 'campaign'

interface IOC {
  id: string
  value: string
  category: IOCCategory
  threatLevel: ThreatLevel
  description: string
  source: string
  firstSeen: Date
  lastSeen: Date
  tags: string[]
  isTracked?: boolean
}

interface ThreatFeed {
  id: string
  title: string
  category: FeedCategory
  severity: ThreatLevel
  summary: string
  publishedAt: Date
  iocsCount: number
  read: boolean
}

// Mock data
const mockIOCs: IOC[] = [
  {
    id: 'ioc-1',
    value: '196.20.45.123',
    category: 'ip',
    threatLevel: 'critical',
    description: 'IP associée à une campagne APT28 récente. Multiples tentatives d\'intrusion détectées.',
    source: 'MISP',
    firstSeen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    lastSeen: new Date(Date.now() - 2 * 60 * 1000),
    tags: ['APT', 'Brute Force', 'VPN'],
    isTracked: true
  },
  {
    id: 'ioc-2',
    value: 'malware-Djezzy.dz.xyz',
    category: 'domain',
    threatLevel: 'high',
    description: 'Domain typosquatting utilisé pour du phishing ciblé.',
    source: 'ThreatFox',
    firstSeen: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    lastSeen: new Date(Date.now() - 30 * 60 * 1000),
    tags: ['Phishing', 'Typosquatting']
  },
  {
    id: 'ioc-3',
    value: 'a1b2c3d4e5f6...',
    category: 'hash',
    threatLevel: 'high',
    description: 'Hash SHA256 de l\'exécutable Emotet variant.',
    source: 'VirusTotal',
    firstSeen: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    lastSeen: new Date(Date.now() - 45 * 60 * 1000),
    tags: ['Emotet', 'Trojan', 'Banking']
  },
  {
    id: 'ioc-4',
    value: 'admin@Djezzy-security-update.com',
    category: 'email',
    threatLevel: 'medium',
    description: 'Adresse email utilisée dans une campagne BEC (Business Email Compromise).',
    source: 'Internal',
    firstSeen: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    lastSeen: new Date(Date.now() - 120 * 60 * 1000),
    tags: ['BEC', 'CEO Fraud']
  }
]

const mockFeeds: ThreatFeed[] = [
  {
    id: 'feed-1',
    title: 'Campagne Emotet - Mise à jour Q4 2024',
    category: 'malware',
    severity: 'high',
    summary: 'Nouvelle variante d\'Emotet détectée avec techniques anti-sandbox améliorées.',
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    iocsCount: 47,
    read: false
  },
  {
    id: 'feed-2',
    title: 'APT28 - Activité régionale accrue',
    category: 'apt',
    severity: 'critical',
    summary: 'Augmentation significative des activités liées à APT28 dans la région MENA.',
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    iocsCount: 156,
    read: false
  },
  {
    id: 'feed-3',
    title: 'Vulnérabilité Zero-Day: Cisco ASA',
    category: 'vulnerability',
    severity: 'critical',
    summary: 'Vulnérabilité critique permettant RCE sur les pare-feu Cisco ASA.',
    publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    iocsCount: 12,
    read: true
  },
  {
    id: 'feed-4',
    title: 'Phishing Bancaire Algérien',
    category: 'phishing',
    severity: 'medium',
    summary: 'Nouvelles campagnes de phishing ciblant les banques algériennes.',
    publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    iocsCount: 23,
    read: false
  }
]

const categoryConfig: Record<IOCCategory, { icon: React.ReactNode; label: string; color: string }> = {
  ip: { icon: <Globe className="w-4 h-4" />, label: 'Adresse IP', color: 'text-blue-600 bg-blue-100' },
  domain: { icon: <Globe className="w-4 h-4" />, label: 'Domaine', color: 'text-purple-600 bg-purple-100' },
  url: { icon: <ExternalLink className="w-4 h-4" />, label: 'URL', color: 'text-orange-600 bg-orange-100' },
  hash: { icon: <Hash className="w-4 h-4" />, label: 'Hash', color: 'text-green-600 bg-green-100' },
  email: { icon: <Fingerprint className="w-4 h-4" />, label: 'Email', color: 'text-red-600 bg-red-100' }
}

const threatLevelConfig: Record<ThreatLevel, { color: string; bgColor: string; label: string }> = {
  critical: { color: '#E31837', bgColor: 'bg-red-100 dark:bg-red-950/30', label: 'Critique' },
  high: { color: '#F97316', bgColor: 'bg-orange-100 dark:bg-orange-950/30', label: 'Élevé' },
  medium: { color: '#EAB308', bgColor: 'bg-yellow-100 dark:bg-yellow-950/30', label: 'Moyen' },
  low: { color: '#22C55E', bgColor: 'bg-green-100 dark:bg-green-950/30', label: 'Faible' },
  info: { color: '#6B7280', bgColor: 'bg-gray-100 dark:bg-gray-900/30', label: 'Info' }
}

export default function MobileThreatIntelPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<IOCCategory | 'all'>('all')
  const [selectedIOC, setSelectedIOC] = useState<IOC | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isOfflineMode, setIsOfflineMode] = useState(false)

  // Filter IOCs
  const filteredIOCs = useMemo(() => {
    return mockIOCs.filter(ioc => {
      if (selectedCategory !== 'all' && ioc.category !== selectedCategory) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return ioc.value.toLowerCase().includes(query) || 
               ioc.description.toLowerCase().includes(query) ||
               ioc.tags.some(tag => tag.toLowerCase().includes(query))
      }
      return true
    })
  }, [searchQuery, selectedCategory])

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800))
    setIsSearching(false)
    
    if ('vibrate' in navigator) navigator.vibrate(10)
  }, [searchQuery])

  // Toggle tracking
  const toggleTracking = useCallback((id: string) => {
    console.log('Toggle tracking for:', id)
    if ('vibrate' in navigator) navigator.vibrate(15)
  }, [])

  return (
    <MobileLayout 
      title="Intel Menaces"
      rightAction={
        /* Offline cache indicator */
        <button
          onClick={() => setIsOfflineMode(!isOfflineMode)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
            "min-h-[36px]",
            isOfflineMode 
              ? "bg-green-100 text-green-700" 
              : "bg-gray-100 text-gray-600"
          )}
        >
          {isOfflineMode ? (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Cache</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Hors ligne</span>
            </>
          )}
        </button>
      }
      headerContent={
        /* Quick lookup search */
        <div className="p-3 space-y-3">
          {/* Main search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Recherche rapide IP, domaine, hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className={cn(
                "w-full pl-10 pr-10 py-3 rounded-xl text-sm",
                "bg-gray-100 dark:bg-gray-800 placeholder:text-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-djezzy-red/50"
              )}
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

          {/* Category quick filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(['all', 'ip', 'domain', 'hash', 'email'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap",
                  "transition-all touch-manipulation min-h-[40px]",
                  selectedCategory === cat
                    ? "text-white shadow-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200"
                )}
                style={selectedCategory === cat ? { backgroundColor: '#E31837' } : undefined}
              >
                {cat !== 'all' && categoryConfig[cat].icon}
                <span>{cat === 'all' ? 'Tous' : categoryConfig[cat].label}</span>
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span>{filteredIOCs.length} IOC(s) trouvé(s)</span>
            {isOfflineMode && (
              <span className="flex items-center gap-1 text-green-600">
                <Download className="w-3 h-3" />
                Disponible hors ligne
              </span>
            )}
          </div>
        </div>
      }
    >
      <div className="p-4 space-y-6">
        {/* Selected IOC Detail */}
        {selectedIOC ? (
          <IOCDetailView 
            ioc={selectedIOC} 
            onClose={() => setSelectedIOC(null)}
            onToggleTrack={() => toggleTracking(selectedIOC.id)}
          />
        ) : (
          <>
            {/* Threat Level Summary */}
            <section aria-label="Résumé des menaces">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-djezzy-red" style={{ color: '#E31837' }} />
                Niveau de Menace Actuel
              </h2>
              
              <MobileCard variant="alert">
                <div className="space-y-3">
                  {/* Overall threat gauge */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-red-600">ÉLEVÉ</div>
                      <div className="text-xs text-gray-500 mt-1">Activité anormale détectée</div>
                    </div>
                    <div className="relative w-16 h-16">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="28" fill="none" stroke="#f3f4f6" strokeWidth="6" />
                        <circle 
                          cx="32" cy="32" r="28" fill="none" 
                          stroke="#E31837" strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={`${75 * 176} 176`}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                      </div>
                    </div>
                  </div>

                  {/* Breakdown by level */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-100">
                    {(['critical', 'high', 'medium', 'low'] as ThreatLevel[]).map(level => (
                      <div key={level} className="text-center">
                        <div 
                          className="text-lg font-bold"
                          style={{ color: threatLevelConfig[level].color }}
                        >
                          {mockIOCs.filter(i => i.threatLevel === level).length || 0}
                        </div>
                        <div className="text-[10px] text-gray-500">{threatLevelConfig[level].label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </MobileCard>
            </section>

            {/* IOC List */}
            <section aria-label="Liste des IOCs">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  IOCs Récents
                </h2>
                <button className="text-xs font-medium text-djezzy-red" style={{ color: '#E31837' }}>
                  Voir tout
                </button>
              </div>

              <div className="space-y-3">
                {isSearching ? (
                  <>
                    <MobileCardSkeleton lines={3} />
                    <MobileCardSkeleton lines={3} />
                  </>
                ) : filteredIOCs.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Aucun IOC trouvé</p>
                  </div>
                ) : (
                  filteredIOCs.map(ioc => (
                    <IOCCard 
                      key={ioc.id} 
                      ioc={ioc} 
                      onClick={() => {
                        setSelectedIOC(ioc)
                        if ('vibrate' in navigator) navigator.vibrate(10)
                      }}
                      onToggleTrack={() => toggleTracking(ioc.id)}
                    />
                  ))
                )}
              </div>
            </section>

            {/* Threat Feeds */}
            <section aria-label="Flux de menaces">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Flux de Menaces
              </h2>

              <div className="space-y-3">
                {mockFeeds.map(feed => (
                  <FeedCard key={feed.id} feed={feed} />
                ))}
              </div>
            </section>

            {/* Offline Cache Status */}
            {isOfflineMode && (
              <OfflineCacheStatus />
            )}

            <div className="h-16" />
          </>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </MobileLayout>
  )
}

// Sub-components
function IOCCard({ 
  ioc, 
  onClick, 
  onToggleTrack 
}: { 
  ioc: IOC
  onClick: () => void
  onToggleTrack: () => void
}) {
  const cat = categoryConfig[ioc.category]
  const level = threatLevelConfig[ioc.threatLevel]

  return (
    <MobileCard
      variant={ioc.threatLevel === 'critical' ? 'alert' : ioc.threatLevel === 'high' ? 'warning' : 'default'}
      onClick={onClick}
      header={
        <div className="flex items-center justify-between">
          <div className={cn("flex items-center gap-2 px-2 py-1 rounded-lg", cat.color)}>
            {cat.icon}
            <span className="text-[10px] font-semibold uppercase">{cat.label}</span>
          </div>
          <div className={cn("flex items-center gap-1", level.bgColor)}>
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: level.color }}
            />
            <span className="text-[10px] font-semibold" style={{ color: level.color }}>
              {level.label}
            </span>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <Clock className="w-3 h-3" />
            <span>Vu il y a {formatTimeAgo(ioc.lastSeen)}</span>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleTrack()
            }}
            className={cn(
              "flex items-center gap-1 p-1.5 rounded-lg transition-colors min-h-[32px]",
              ioc.isTracked 
                ? "text-yellow-500 bg-yellow-50" 
                : "text-gray-400 hover:text-yellow-500 hover:bg-gray-50"
            )}
          >
            <Star className={cn("w-4 h-4", ioc.isTracked && "fill-current")} />
          </button>
        </div>
      }
    >
      <div className="space-y-2">
        {/* IOC Value */}
        <code className="block text-sm font-mono break-all text-gray-900 dark:text-white">
          {ioc.value}
        </code>
        
        {/* Description */}
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
          {ioc.description}
        </p>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {ioc.tags.slice(0, 3).map(tag => (
            <span 
              key={tag}
              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-[10px] text-gray-600 rounded-full"
            >
              #{tag}
            </span>
          ))}
          {ioc.tags.length > 3 && (
            <span className="px-2 py-0.5 text-[10px] text-gray-400">
              +{ioc.tags.length - 3}
            </span>
          )}
        </div>
      </div>
    </MobileCard>
  )
}

function IOCDetailView({ 
  ioc, 
  onClose, 
  onToggleTrack 
}: { 
  ioc: IOC
  onClose: () => void
  onToggleTrack: () => void
}) {
  const cat = categoryConfig[ioc.category]
  const level = threatLevelConfig[ioc.threatLevel]

  return (
    <div className="space-y-4 animate-slide-in">
      {/* Back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px]"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <h2 className="font-semibold text-base truncate">Détail IOC</h2>
      </div>

      {/* Main info card */}
      <MobileCard variant={ioc.threatLevel === 'critical' ? 'alert' : 'default'}>
        <div className="space-y-4">
          {/* Category and level */}
          <div className="flex items-center justify-between">
            <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl", cat.color)}>
              {cat.icon}
              <span className="text-xs font-semibold uppercase">{cat.label}</span>
            </div>
            <div 
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
              style={{ backgroundColor: level.color }}
            >
              {level.label.toUpperCase()}
            </div>
          </div>

          {/* IOC Value */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <code className="block text-base font-mono break-all text-gray-900 dark:text-white">
              {ioc.value}
            </code>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {ioc.description}
          </p>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            <MetaItem label="Source" value={ioc.source} />
            <MetaItem label="Première vue" value={ioc.firstSeen.toLocaleDateString('fr-FR')} />
            <MetaItem label="Dernière vue" value={formatTimeAgo(ioc.lastSeen)} />
            <MetaItem label="Tags" value={`${ioc.tags.length} tag(s)`} />
          </div>

          {/* Tags list */}
          <div className="flex flex-wrap gap-2">
            {ioc.tags.map(tag => (
              <span 
                key={tag}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            <button
              onClick={onToggleTrack}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium",
                "transition-all active:scale-[0.98] min-h-[48px]",
                ioc.isTracked
                  ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              <Star className={cn("w-4 h-4", ioc.isTracked && "fill-current")} />
              {ioc.isTracked ? 'Suivi' : 'Suivre'}
            </button>
            
            <button
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium
                         text-white active:scale-[0.98] transition-all min-h-[48px]"
              style={{ backgroundColor: '#E31837' }}
            >
              <ExternalLink className="w-4 h-4" />
              Analyser
            </button>
          </div>
        </div>
      </MobileCard>

      {/* Related indicators */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Indicateurs Connexes</h3>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div 
              key={i}
              className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border 
                         border-gray-200 dark:border-gray-700"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Hash className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <code className="text-xs font-mono truncate block">related-indicator-{i}.example</code>
                <span className="text-[10px] text-gray-500">Connexion forte ({90 - i * 10}%)</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.25s ease-out;
        }
      `}</style>
    </div>
  )
}

function FeedCard({ feed }: { feed: ThreatFeed }) {
  const categoryColors: Record<FeedCategory, string> = {
    apt: '#E31837',
    malware: '#F97316',
    phishing: '#EAB308',
    vulnerability: '#EF4444',
    campaign: '#8B5CF6'
  }

  const categoryLabels: Record<FeedCategory, string> = {
    apt: 'APT',
    malware: 'Malware',
    phishing: 'Phishing',
    vulnerability: 'Vulnérabilité',
    campaign: 'Campagne'
  }

  return (
    <MobileCard variant="default" expandable expandedContent={
      <div className="space-y-3">
        <p className="text-sm text-gray-700 dark:text-gray-300">{feed.summary}</p>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{feed.iocsCount} IOC(s) associé(s)</span>
          <button className="text-djezzy-red font-medium" style={{ color: '#E31837' }}>
            Voir les IOCs →
          </button>
        </div>
      </div>
    }>
      <div className="flex items-start gap-3">
        {/* Category indicator */}
        <div 
          className="w-1 h-12 rounded-full flex-shrink-0"
          style={{ backgroundColor: categoryColors[feed.category] }}
        />
        
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span 
                className="px-2 py-0.5 rounded text-[10px] font-semibold text-white"
                style={{ backgroundColor: categoryColors[feed.category] }}
              >
                {categoryLabels[feed.category]}
              </span>
              {!feed.read && (
                <span className="w-2 h-2 rounded-full bg-djezzy-red animate-pulse" 
                      style={{ backgroundColor: '#E31837' }} />
              )}
            </div>
            <span className="text-[10px] text-gray-500 whitespace-nowrap">
              {formatTimeAgo(feed.publishedAt)}
            </span>
          </div>
          
          {/* Title */}
          <h4 className={cn(
            "text-sm font-medium line-clamp-2",
            !feed.read ? "text-gray-900 dark:text-white" : "text-gray-600"
          )}>
            {feed.title}
          </h4>
          
          {/* Summary preview */}
          <p className="text-xs text-gray-500 line-clamp-1">{feed.summary}</p>
        </div>
      </div>
    </MobileCard>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{value}</div>
    </div>
  )
}

function OfflineCacheStatus() {
  return (
    <MobileCard variant="success">
      <div className="flex items-center gap-3">
        <Download className="w-5 h-5 text-green-600" />
        <div className="flex-1">
          <div className="text-sm font-medium text-green-700">Cache hors ligne actif</div>
          <div className="text-xs text-green-600">24 IOCs disponibles • Dernière sync: il y a 15min</div>
        </div>
      </div>
    </MobileCard>
  )
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'à l\'instant'
  if (diffMins < 60) return `${diffMins}min`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}j`
  
  return date.toLocaleDateString('fr-FR')
}
