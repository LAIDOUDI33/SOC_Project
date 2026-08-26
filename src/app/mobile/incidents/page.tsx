'use client'

import React, { useState, useCallback } from 'react'
import { MobileLayout } from '../layout'
import { MobileCard } from '@/components/mobile/MobileCard'
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  User, 
  MessageSquare,
  CheckCircle2,
  Camera,
  FileText,
  Plus,
  Send,
  ChevronRight,
  Phone,
  Video,
  ClipboardList,
  Users,
  Calendar,
  Tag
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types
type IncidentStatus = 'active' | 'contained' | 'eradicated' | 'resolved' | 'closed'
type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low'

interface TimelineEvent {
  id: string
  type: 'status_change' | 'task_completed' | 'evidence_added' | 'comment' | 'assignment'
  timestamp: Date
  user: string
  content: string
}

interface Task {
  id: string
  title: string
  assignedTo: string
  completed: boolean
  priority: 'high' | 'medium' | 'low'
}

interface Message {
  id: string
  user: string
  avatar?: string
  content: string
  timestamp: Date
  isOwn: boolean
}

interface Incident {
  id: string
  title: string
  description: string
  status: IncidentStatus
  severity: IncidentSeverity
  assignee: string
  createdAt: Date
  updatedAt: Date
  location?: string
  timeline: TimelineEvent[]
  tasks: Task[]
  messages: Message[]
}

// Mock data
const mockIncidents: Incident[] = [
  {
    id: 'INC-2024-0892',
    title: 'Attaque Ransomware - Poste Finance',
    description: 'Détection d\'activité ransomware sur un poste du service finance. Isolation en cours.',
    status: 'active',
    severity: 'critical',
    assignee: 'Karim B.',
    createdAt: new Date(Date.now() - 45 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000),
    location: 'Siège Alger, 3ème étage, Bureau F-312',
    timeline: [
      { id: '1', type: 'assignment', timestamp: new Date(Date.now() - 45 * 60 * 1000), user: 'System', content: 'Incident créé et assigné à Karim B.' },
      { id: '2', type: 'status_change', timestamp: new Date(Date.now() - 40 * 60 * 1000), user: 'Karim B.', content: 'Statut changé vers Actif' },
      { id: '3', type: 'evidence_added', timestamp: new Date(Date.now() - 35 * 60 * 1000), user: 'Karim B.', content: 'Capture écran ajoutée' },
      { id: '4', type: 'comment', timestamp: new Date(Date.now() - 20 * 60 * 1000), user: 'Amina K.', content: 'Je confirme l\'activité suspecte. L\'ISO a été contacté.' },
      { id: '5', type: 'task_completed', timestamp: new Date(Date.now() - 10 * 60 * 1000), user: 'Karim B.', content: 'Isolation réseau effectuée' },
    ],
    tasks: [
      { id: 't1', title: 'Isoler le poste infecté', assignedTo: 'Karim B.', completed: true, priority: 'high' },
      { id: 't2', title: 'Analyser le vecteur d\'infection', assignedTo: 'Amina K.', completed: false, priority: 'high' },
      { id: 't3', title: 'Scanner les postes voisins', assignedTo: 'Youssef M.', completed: false, priority: 'medium' },
      { id: 't4', title: 'Préparer rapport initial', assignedTo: 'Karim B.', completed: false, priority: 'low' },
    ],
    messages: [
      { id: 'm1', user: 'Amina K.', content: 'L\'utilisateur a ouvert une pièce jointe suspecte ce matin.', timestamp: new Date(Date.now() - 25 * 60 * 1000), isOwn: false },
      { id: 'm2', user: 'Moi', content: 'Merci. Je lance le scan complet maintenant.', timestamp: new Date(Date.now() - 22 * 60 * 1000), isOwn: true },
      { id: 'm3', user: 'Amina K.', content: 'Je préviens le DSI pour la communication.', timestamp: new Date(Date.now() - 18 * 60 * 1000), isOwn: false },
    ]
  },
  {
    id: 'INC-2024-0891',
    title: 'Fuite de données potentielle - Cloud',
    description: 'Transfert anormal de données détecté vers un stockage cloud externe non autorisé.',
    status: 'contained',
    severity: 'high',
    assignee: 'Amina K.',
    createdAt: new Date(Date.now() - 180 * 60 * 1000),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000),
    timeline: [
      { id: '1', type: 'assignment', timestamp: new Date(Date.now() - 180 * 60 * 1000), user: 'System', content: 'Incident créé' },
      { id: '2', type: 'status_change', timestamp: new Date(Date.now() - 120 * 60 * 1000), user: 'Amina K.', content: 'Accès révoqué - Contenu' },
    ],
    tasks: [
      { id: 't5', title: 'Révoquer les accès cloud', assignedTo: 'Amina K.', completed: true, priority: 'high' },
      { id: 't6', title: 'Auditer les données transférées', assignedTo: 'Youssef M.', completed: false, priority: 'high' },
    ],
    messages: []
  },
  {
    id: 'INC-2024-0890',
    title: 'Tentative de phishing ciblé',
    description: 'Campagne de phishing détectée visant les cadres supérieurs. 12 emails bloqués.',
    status: 'resolved',
    severity: 'medium',
    assignee: 'Youssef M.',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    tasks: [],
    messages: []
  }
]

const statusConfig: Record<IncidentStatus, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Actif', color: 'text-red-600 bg-red-100 dark:bg-red-950/30', bgColor: 'bg-red-500' },
  contained: { label: 'Contenu', color: 'text-orange-600 bg-orange-100 dark:bg-orange-950/30', bgColor: 'bg-orange-500' },
  eradicated: { label: 'Éradiqué', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950/30', bgColor: 'bg-yellow-500' },
  resolved: { label: 'Résolu', color: 'text-green-600 bg-green-100 dark:bg-green-950/30', bgColor: 'bg-green-500' },
  closed: { label: 'Fermé', color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30', bgColor: 'bg-gray-500' }
}

const severityColors: Record<IncidentSeverity, string> = {
  critical: '#E31837',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E'
}

export default function MobileIncidentsPage() {
  const [incidents] = useState<Incident[]>(mockIncidents)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [activeTab, setActiveTab] = useState<'timeline' | 'tasks' | 'chat'>('timeline')
  const [newMessage, setNewMessage] = useState('')
  const [showChecklist, setShowChecklist] = useState(false)

  // Handle task completion
  const handleTaskComplete = useCallback((incidentId: string, taskId: string) => {
    if (!selectedIncident || selectedIncident.id !== incidentId) return
    
    setSelectedIncident(prev => {
      if (!prev) return prev
      return {
        ...prev,
        tasks: prev.tasks.map(t => 
          t.id === taskId ? { ...t, completed: !t.completed } : t
        )
      }
    })
    
    if ('vibrate' in navigator) navigator.vibrate(15)
  }, [selectedIncident])

  // Handle sending message
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !selectedIncident) return
    
    const message: Message = {
      id: `m-${Date.now()}`,
      user: 'Moi',
      content: newMessage,
      timestamp: new Date(),
      isOwn: true
    }

    setSelectedIncident(prev => {
      if (!prev) return prev
      return {
        ...prev,
        messages: [...prev.messages, message]
      }
    })
    
    setNewMessage('')
    if ('vibrate' in navigator) navigator.vibrate(10)
  }, [newMessage, selectedIncident])

  return (
    <MobileLayout 
      title="Incidents"
      rightAction={
        <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 
                           active:scale-95 transition-all min-h-[44px] min-w-[44px]"
          onClick={() => console.log('New incident')}
        >
          <Plus className="w-5 h-5 text-djezzy-red" style={{ color: '#E31837' }} />
        </button>
      }
    >
      <div className="p-4 space-y-4">
        {/* Active incidents summary */}
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-red-50 to-orange-50 
                       dark:from-red-950/20 dark:to-orange-950/20 rounded-2xl border border-red-200">
          <div className="p-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {incidents.filter(i => i.status === 'active').length}
            </div>
            <div className="text-xs text-gray-500">Incident(s) actif(s)</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-lg font-semibold text-orange-600">
              {incidents.filter(i => i.severity === 'critical' && i.status !== 'closed').length}
            </div>
            <div className="text-xs text-gray-500">Critique</div>
          </div>
        </div>

        {/* Incidents list or detail view */}
        {!selectedIncident ? (
          /* Incidents list */
          <section aria-label="Liste des incidents" className="space-y-3">
            {incidents.map(incident => (
              <MobileCard
                key={incident.id}
                variant={incident.severity === 'critical' ? 'alert' : incident.severity === 'high' ? 'warning' : 'default'}
                onClick={() => {
                  setSelectedIncident(incident)
                  if ('vibrate' in navigator) navigator.vibrate(10)
                }}
                header={
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-medium text-gray-500">{incident.id}</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", statusConfig[incident.status].color)}>
                      {statusConfig[incident.status].label}
                    </span>
                  </div>
                }
                footer={
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{incident.assignee}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatRelativeTime(incident.updatedAt)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                }
              >
                <div className="space-y-2">
                  {/* Severity indicator */}
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: severityColors[incident.severity] }}
                    />
                    <h3 className="font-semibold text-sm line-clamp-1">{incident.title}</h3>
                  </div>
                  
                  {/* Description */}
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {incident.description}
                  </p>
                  
                  {/* Location if available */}
                  {incident.location && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{incident.location}</span>
                    </div>
                  )}
                </div>
              </MobileCard>
            ))}
          </section>
        ) : (
          /* Incident detail view */
          <IncidentDetailView
            incident={selectedIncident}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onTaskComplete={(taskId) => handleTaskComplete(selectedIncident.id, taskId)}
            onClose={() => setSelectedIncident(null)}
            newMessage={newMessage}
            onMessageChange={setNewMessage}
            onSendMessage={handleSendMessage}
            showChecklist={showChecklist}
            onToggleChecklist={() => setShowChecklist(!showChecklist)}
          />
        )}

        <div className="h-16" />
      </div>
    </MobileLayout>
  )
}

// Incident Detail View Component
function IncidentDetailView({
  incident,
  activeTab,
  onTabChange,
  onTaskComplete,
  onClose,
  newMessage,
  onMessageChange,
  onSendMessage,
  showChecklist,
  onToggleChecklist
}: {
  incident: Incident
  activeTab: 'timeline' | 'tasks' | 'chat'
  onTabChange: (tab: 'timeline' | 'tasks' | 'chat') => void
  onTaskComplete: (taskId: string) => void
  onClose: () => void
  newMessage: string
  onMessageChange: (value: string) => void
  onSendMessage: () => void
  showChecklist: boolean
  onToggleChecklist: () => void
}) {
  return (
    <div className="space-y-4 animate-slide-in">
      {/* Back button and header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px]"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-base truncate">{incident.title}</h2>
          <p className="text-xs text-gray-500 font-mono">{incident.id}</p>
        </div>
        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", statusConfig[incident.status].color)}>
          {statusConfig[incident.status].label}
        </span>
      </div>

      {/* Quick info cards */}
      <div className="grid grid-cols-2 gap-3">
        <InfoCard icon={<User className="w-4 h-4" />} label="Assigné à" value={incident.assignee} />
        <InfoCard icon={<Tag className="w-4 h-4" />} label="Sévérité" value={
          <span style={{ color: severityColors[incident.severity] }}>
            {incident.severity === 'critical' ? 'Critique' : incident.severity === 'high' ? 'Élevé' : incident.severity === 'medium' ? 'Moyen' : 'Faible'}
          </span>
        } />
        {incident.location && (
          <InfoCard icon={<MapPin className="w-4 h-4" />} label="Location" value="Voir carte" isLink />
        )}
        <InfoCard icon={<Calendar className="w-4 h-4" />} label="Créé" value={formatRelativeTime(incident.createdAt)} />
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-4 gap-2">
        <ActionButton icon={<Camera className="w-5 h-5" />} label="Photo" onClick={() => console.log('Camera')} />
        <ActionButton icon={<FileText className="w-5 h-5" />} label="Fichier" onClick={() => console.log('File')} />
        <ActionButton icon={<Phone className="w-5 h-5" />} label="Appeler" onClick={() => console.log('Call')} />
        <ActionButton icon={<Video className="w-5 h-5" />} label="Visio" onClick={() => console.log('Video')} />
      </div>

      {/* Tab navigation */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {[
          { id: 'timeline' as const, label: 'Chronologie', icon: <Clock className="w-4 h-4" /> },
          { id: 'tasks' as const, label: `Tâches (${incident.tasks.filter(t => !t.completed).length})`, icon: <ClipboardList className="w-4 h-4" /> },
          { id: 'chat' as const, label: `Chat (${incident.messages.length})`, icon: <MessageSquare className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium",
              "transition-all duration-200 touch-manipulation min-h-[40px]",
              activeTab === tab.id
                ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {activeTab === 'timeline' && <TimelineView events={incident.timeline} />}
        {activeTab === 'tasks' && (
          <TasksView 
            tasks={incident.tasks} 
            onComplete={onTaskComplete}
            showChecklist={showChecklist}
            onToggleChecklist={onToggleChecklist}
          />
        )}
        {activeTab === 'chat' && (
          <ChatView
            messages={incident.messages}
            newMessage={newMessage}
            onMessageChange={onMessageChange}
            onSendMessage={onSendMessage}
          />
        )}
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

// Sub-components
function InfoCard({ 
  icon, 
  label, 
  value, 
  isLink = false 
}: { 
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  isLink?: boolean
}) {
  return (
    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className={cn(
        "text-sm font-medium",
        isLink && "text-blue-600 cursor-pointer"
      )}>
        {value}
      </div>
    </div>
  )
}

function ActionButton({ 
  icon, 
  label, 
  onClick 
}: { 
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={() => {
        onClick()
        if ('vibrate' in navigator) navigator.vibrate(10)
      }}
      className="flex flex-col items-center justify-center p-3 bg-white dark:bg-gray-800 
                 rounded-xl border border-gray-200 dark:border-gray-700
                 active:scale-95 transition-all min-h-[70px] touch-manipulation"
    >
      {icon}
      <span className="text-[10px] text-gray-600 mt-1">{label}</span>
    </button>
  )
}

function TimelineView({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="space-y-0">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-3 pb-4 last:pb-0">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <TimelineDot type={event.type} />
            {index < events.length - 1 && (
              <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-900 dark:text-white">{event.user}</span>
              <span className="text-[10px] text-gray-400">{formatRelativeTime(event.timestamp)}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{event.content}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function TimelineDot({ type }: { type: TimelineEvent['type'] }) {
  const colors: Record<TimelineEvent['type'], string> = {
    status_change: 'bg-blue-500',
    task_completed: 'bg-green-500',
    evidence_added: 'bg-purple-500',
    comment: 'bg-yellow-500',
    assignment: 'bg-orange-500'
  }

  return (
    <div className={cn("w-3 h-3 rounded-full ring-4 ring-white dark:ring-gray-900", colors[type])} />
  )
}

function TasksView({ 
  tasks, 
  onComplete, 
  showChecklist,
  onToggleChecklist
}: { 
  tasks: Task[]
  onComplete: (id: string) => void
  showChecklist: boolean
  onToggleChecklist: () => void
}) {
  const completedCount = tasks.filter(t => t.completed).length

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Progression</span>
          <span>{completedCount}/{tasks.length} tâches</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / tasks.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Tasks list */}
      <div className="space-y-2">
        {tasks.map(task => (
          <div
            key={task.id}
            onClick={() => onComplete(task.id)}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border transition-all",
              "touch-manipulation active:scale-[0.98]",
              task.completed
                ? "bg-green-50 dark:bg-green-950/10 border-green-200"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            )}
          >
            <button className={cn(
              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
              task.completed
                ? "border-green-500 bg-green-500 text-white"
                : "border-gray-300"
            )}>
              {task.completed && <CheckCircle2 className="w-4 h-4" />}
            </button>
            
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium",
                task.completed && "line-through text-gray-500"
              )}>
                {task.title}
              </p>
              <p className="text-xs text-gray-500">Assigné: {task.assignedTo}</p>
            </div>
            
            <span className={cn(
              "w-2 h-2 rounded-full",
              task.priority === 'high' ? "bg-red-500" :
              task.priority === 'medium' ? "bg-yellow-500" : "bg-green-500"
            )} />
          </div>
        ))}
      </div>

      {/* Response procedure checklist toggle */}
      <button
        onClick={onToggleChecklist}
        className={cn(
          "w-full flex items-center justify-between p-4 rounded-xl border",
          "transition-colors touch-manipulation min-h-[48px]",
          showChecklist 
            ? "border-djezzy-red bg-red-50 dark:bg-red-950/10" 
            : "border-gray-200 dark:border-gray-700"
        )}
        style={{ borderColor: showChecklist ? '#E31837' : undefined }}
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          <span className="text-sm font-medium">Procédure de réponse</span>
        </div>
        <ChevronRight className={cn(
          "w-4 h-4 transition-transform",
          showChecklist && "rotate-90"
        )} />
      </button>

      {/* Checklist content */}
      {showChecklist && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl space-y-3 animate-slide-down">
          <h4 className="text-sm font-semibold">Playbook: Ransomware</h4>
          {[
            'Confirmer l\'incident',
            'Isoler les systèmes affectés',
            'Préserver les preuves',
            'Notifier les parties prenantes',
            'Démarrer l\'analyse forensique',
            'Coordonner avec l\'équipe ER'
          ].map((item, i) => (
            <label key={i} className="flex items-center gap-3 py-2 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 rounded border-gray-300" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function ChatView({
  messages,
  newMessage,
  onMessageChange,
  onSendMessage
}: {
  messages: Message[]
  newMessage: string
  onMessageChange: (value: string) => void
  onSendMessage: () => void
}) {
  return (
    <div className="flex flex-col h-[350px]">
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-3">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            Aucun message pour le moment
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.isOwn ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "max-w-[80%] px-4 py-2.5 rounded-2xl",
                msg.isOwn
                  ? "bg-djezzy-red text-white rounded-br-md"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md"
              )}
              style={msg.isOwn ? { backgroundColor: '#E31837' } : undefined}
              >
                {!msg.isOwn && (
                  <div className="text-[10px] font-medium opacity-70 mb-1">{msg.user}</div>
                )}
                <p className="text-sm">{msg.content}</p>
                <div className={cn(
                  "text-[10px] mt-1 text-right",
                  msg.isOwn ? "opacity-70" : "opacity-50"
                )}>
                  {formatRelativeTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
          placeholder="Écrire un message..."
          className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm
                     placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-djezzy-red/50
                     min-h-[44px]"
          style={{ '--tw-ring-color': '#E31837' } as React.CSSProperties}
        />
        <button
          onClick={onSendMessage}
          disabled={!newMessage.trim()}
          className={cn(
            "p-3 rounded-xl text-white transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "active:scale-95 min-h-[44px] min-w-[44px]",
            newMessage.trim() ? "hover:shadow-md" : ""
          )}
          style={{ backgroundColor: '#E31837' }}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

// Utility functions
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'À l\'instant'
  if (diffMins < 60) return `Il y a ${diffMins}min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays}j`
  
  return date.toLocaleDateString('fr-FR')
}
