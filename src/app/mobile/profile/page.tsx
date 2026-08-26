'use client'

import React, { useState } from 'react'
import { MobileLayout } from '../layout'
import { MobileCard } from '@/components/mobile/MobileCard'
import { 
  User, 
  Bell, 
  Shield, 
  Moon, 
  Globe,
  ChevronRight,
  LogOut,
  Settings,
  Smartphone,
  Wifi,
  Database,
  Trash2,
  Info,
  HelpCircle,
  MessageSquare,
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function MobileProfilePage() {
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [language, setLanguage] = useState<'fr' | 'en'>('fr')
  const [hapticFeedback, setHapticFeedback] = useState(true)

  const user = {
    name: 'Karim Benali',
    role: 'Analyste SOC Senior',
    email: 'k.benali@djezzy.dz',
    avatar: null,
    team: 'Équipe de Réponse aux Incidents',
    shift: 'Matin (08h00 - 16h00)',
    phone: '+213 555 123 456'
  }

  return (
    <MobileLayout title="Profil">
      <div className="p-4 space-y-6">
        {/* User Profile Card */}
        <section aria-label="Informations utilisateur">
          <MobileCard variant="default">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: '#E31837' }}
              >
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              
              {/* User info */}
              <div className="flex-1">
                <h2 className="font-semibold text-lg">{user.name}</h2>
                <p className="text-sm text-gray-500">{user.role}</p>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-500">En ligne</span>
                </div>
              </div>
              
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>

            {/* Additional info */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <InfoRow icon={<MessageSquare className="w-4 h-4" />} label="Email" value={user.email} />
              <InfoRow icon={<Smartphone className="w-4 h-4" />} label="Téléphone" value={user.phone} />
              <InfoRow icon={<Shield className="w-4 h-4" />} label="Équipe" value={user.team} />
              <InfoRow icon={<Bell className="w-4 h-4" />} label="Poste" value={user.shift} />
            </div>
          </MobileCard>
        </section>

        {/* Quick Stats */}
        <section aria-label="Statistiques rapides">
          <div className="grid grid-cols-3 gap-3">
            <StatBox value="247" label="Alertes traitées" color="blue" />
            <StatBox value="12" label="Incidents résolus" color="green" />
            <StatBox value="98.5%" label="SLA respecté" color="purple" />
          </div>
        </section>

        {/* Settings */}
        <section aria-label="Paramètres">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Paramètres
          </h2>

          <div className="space-y-2">
            {/* Dark Mode Toggle */}
            <SettingToggle
              icon={<Moon className="w-5 h-5" />}
              label="Mode sombre"
              description="Interface en couleurs sombres"
              enabled={darkMode}
              onToggle={() => {
                setDarkMode(!darkMode)
                if ('vibrate' in navigator) navigator.vibrate(10)
              }}
            />

            {/* Notifications Toggle */}
            <SettingToggle
              icon={<Bell className="w-5 h-5" />}
              label="Notifications push"
              description="Recevoir les alertes critiques"
              enabled={notifications}
              onToggle={() => {
                setNotifications(!notifications)
                if ('vibrate' in navigator) navigator.vibrate(10)
              }}
            />

            {/* Language Selection */}
            <MobileCard variant="default" onClick={() => {
              setLanguage(language === 'fr' ? 'en' : 'fr')
              if ('vibrate' in navigator) navigator.vibrate(10)
            }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="text-sm font-medium">Langue</div>
                    <div className="text-xs text-gray-500">Langue de l&apos;interface</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-djezzy-red" style={{ color: '#E31837' }}>
                    {language === 'fr' ? 'Français' : 'English'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </MobileCard>

            {/* Haptic Feedback */}
            <SettingToggle
              icon={<Smartphone className="w-5 h-5" />}
              label="Retour haptique"
              description="Vibrations tactiles"
              enabled={hapticFeedback}
              onToggle={() => {
                setHapticFeedback(!hapticFeedback)
                if (hapticFeedback && 'vibrate' in navigator) navigator.vibrate(20)
              }}
            />
          </div>
        </section>

        {/* Data & Storage */}
        <section aria-label="Données et stockage">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Données & Stockage
          </h2>

          <div className="space-y-2">
            <StorageItem
              icon={<Wifi className="w-5 h-5" />}
              label="Cache hors ligne"
              description="IOCs et données mises en cache"
              size="24.5 MB"
              action="Vider"
            />

            <StorageItem
              icon={<Database className="w-5 h-5" />}
              label="File d&apos;attente sync"
              description="Actions en attente de synchronisation"
              size="3 actions"
              action="Voir"
            />

            <button
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border 
                         border-gray-200 dark:border-gray-700 active:scale-[0.98] transition-all min-h-[56px]"
              onClick={() => {
                if (confirm('Vider toutes les données locales ?')) {
                  console.log('Clear all data')
                }
              }}
            >
              <div className="flex items-center gap-3 text-red-600">
                <Trash2 className="w-5 h-5" />
                <div>
                  <div className="text-sm font-medium">Effacer toutes les données</div>
                  <div className="text-xs opacity-70">Supprimer cache, historique et paramètres</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </section>

        {/* Support & About */}
        <section aria-label="Support et à propos">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Support
          </h2>

          <div className="space-y-2">
            <MobileCard variant="default">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium">Centre d&apos;aide</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </MobileCard>

            <MobileCard variant="default">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium">Contacter le support</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </MobileCard>

            <MobileCard variant="default">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium">À propos</span>
                </div>
                <span className="text-xs text-gray-400">v1.0.0</span>
              </div>
            </MobileCard>
          </div>
        </section>

        {/* Logout Button */}
        <button
          className={cn(
            "w-full flex items-center justify-center gap-2 py-4 rounded-xl",
            "font-medium text-white transition-all active:scale-[0.98]",
            "min-h-[56px]"
          )}
          style={{ backgroundColor: '#E31837' }}
          onClick={() => {
            if (confirm('Se déconnecter ?')) {
              console.log('Logout')
            }
          }}
        >
          <LogOut className="w-5 h-5" />
          Déconnexion
        </button>

        {/* Version info */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">
            Djezzy SOC Mobile v1.0.0
          </p>
          <p className="text-xs text-gray-400 mt-1">
            © 2024 Djezzy Algeria
          </p>
        </div>

        <div className="h-8" />
      </div>
    </MobileLayout>
  )
}

// Sub-components
function InfoRow({ 
  icon, 
  label, 
  value 
}: { 
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-gray-400">{icon}</div>
      <span className="text-xs text-gray-500 w-20">{label}</span>
      <span className="text-sm font-medium truncate">{value}</span>
    </div>
  )
}

function StatBox({ 
  value, 
  label, 
  color 
}: { 
  value: string | number
  label: string
  color: 'blue' | 'green' | 'purple'
}) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600',
    green: 'bg-green-50 dark:bg-green-950/30 text-green-600',
    purple: 'bg-purple-50 dark:bg-purple-950/30 text-purple-600'
  }

  return (
    <div className={cn("rounded-xl p-3 text-center", colors[color])}>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] opacity-70 mt-1">{label}</div>
    </div>
  )
}

function SettingToggle({
  icon,
  label,
  description,
  enabled,
  onToggle
}: {
  icon: React.ReactNode
  label: string
  description: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <MobileCard variant="default">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-gray-600">{icon}</div>
          <div>
            <div className="text-sm font-medium">{label}</div>
            <div className="text-xs text-gray-500">{description}</div>
          </div>
        </div>
        
        {/* Custom toggle switch */}
        <button
          onClick={onToggle}
          className={cn(
            "relative w-12 h-7 rounded-full transition-colors duration-200",
            "touch-manipulation min-h-[44px] min-w-[48px]",
            enabled ? "bg-djezzy-red" : "bg-gray-300"
          )}
          style={{ backgroundColor: enabled ? '#E31837' : undefined }}
        >
          <div className={cn(
            "absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
            enabled ? "translate-x-6" : "translate-x-1"
          )}>
            {enabled && (
              <CheckCircle className="w-full h-full text-djezzy-red p-0.5" style={{ color: '#E31837' }} />
            )}
          </div>
        </button>
      </div>
    </MobileCard>
  )
}

function StorageItem({
  icon,
  label,
  description,
  size,
  action
}: {
  icon: React.ReactNode
  label: string
  description: string
  size: string
  action: string
}) {
  return (
    <MobileCard variant="default">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-gray-600">{icon}</div>
          <div>
            <div className="text-sm font-medium">{label}</div>
            <div className="text-xs text-gray-500">{description}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{size}</span>
          <button className="px-3 py-1 text-xs font-medium text-djezzy-red hover:bg-red-50 
                             rounded-lg transition-colors min-h-[32px]"
            style={{ color: '#E31837' }}
          >
            {action}
          </button>
        </div>
      </div>
    </MobileCard>
  )
}
