'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { 
  Clock, User, MessageSquare, CheckCircle, AlertTriangle,
  FileText, ArrowRight, Play, RotateCcw, Tag
} from 'lucide-react'

interface TimelineEvent {
  id: string
  type: 'action' | 'note' | 'status-change' | 'evidence' | 'assignment' | 'alert' | 'custom'
  timestamp: Date
  user: string
  content: string
  metadata?: Record<string, unknown>
  icon?: React.ReactNode
}

interface TimelineViewerProps {
  events: TimelineEvent[]
  compact?: boolean
  showUser?: boolean
  className?: string
}

const eventTypeConfig = {
  action: { 
    color: 'bg-blue-500', 
    label: 'Action', 
    icon: Play,
    ringColor: 'ring-blue-500/20'
  },
  note: { 
    color: 'bg-purple-500', 
    label: 'Note', 
    icon: MessageSquare,
    ringColor: 'ring-purple-500/20'
  },
  'status-change': { 
    color: 'bg-yellow-500', 
    label: 'Status Change', 
    icon: RotateCcw,
    ringColor: 'ring-yellow-500/20'
  },
  evidence: { 
    color: 'bg-green-500', 
    label: 'Evidence', 
    icon: FileText,
    ringColor: 'ring-green-500/20'
  },
  assignment: { 
    color: 'bg-orange-500', 
    label: 'Assignment', 
    icon: User,
    ringColor: 'ring-orange-500/20'
  },
  alert: { 
    color: 'bg-red-500', 
    label: 'Alert', 
    icon: AlertTriangle,
    ringColor: 'ring-red-500/20'
  },
  custom: { 
    color: 'bg-slate-500', 
    label: 'Event', 
    icon: Clock,
    ringColor: 'ring-slate-500/20'
  }
}

function formatTimestamp(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function TimelineViewer({ 
  events, 
  compact = false, 
  showUser = true,
  className 
}: TimelineViewerProps) {
  if (!events || events.length === 0) {
    return (
      <div className={cn('text-center py-8 text-slate-500', className)}>
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No timeline events</p>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {/* Vertical line */}
      <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-700" />
      
      <div className="space-y-4">
        {events.map((event, index) => {
          const config = eventTypeConfig[event.type]
          const IconComponent = event.icon ? null : config.icon

          return (
            <div key={event.id} className="relative flex gap-4 group">
              {/* Event dot */}
              <div className={cn(
                'relative z-10 flex-shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center ring-4 bg-slate-900',
                config.ringColor
              )}>
                {event.icon ? (
                  <span className="text-sm">{event.icon}</span>
                ) : (
                  <IconComponent className="h-3.5 w-3.5 text-white" />
                )}
              </div>

              {/* Content */}
              <div className={cn(
                'flex-1 pb-1 min-w-0',
                compact && 'pb-0'
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-slate-200 break-words',
                      compact ? 'text-xs' : 'text-sm'
                    )}>
                      {event.content}
                    </p>

                    {!compact && showUser && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {event.user}
                      </p>
                    )}

                    {/* Metadata display */}
                    {!compact && event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Object.entries(event.metadata).map(([key, value]) => (
                          <span 
                            key={key}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-400"
                          >
                            <Tag className="h-2.5 w-2.5" />
                            <span className="capitalize">{key}:</span>
                            <span>{String(value)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <time className={cn(
                    'text-slate-500 whitespace-nowrap flex-shrink-0',
                    compact ? 'text-[10px]' : 'text-xs'
                  )}>
                    {formatTimestamp(event.timestamp)}
                  </time>
                </div>

                {/* Compact mode shows user inline */}
                {compact && showUser && (
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    by {event.user}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Investigation Timeline Builder Component
interface TimelineBuilderProps {
  onAddEvent?: (event: Omit<TimelineEvent, 'id'>) => void
  currentUserId?: string
  className?: string
}

export function TimelineBuilder({ 
  onAddEvent, 
  currentUserId = 'Current User',
  className 
}: TimelineBuilderProps) {
  const [newNote, setNewNote] = React.useState('')
  const [eventType, setEventType] = React.useState<TimelineEvent['type']>('note')

  const handleSubmit = () => {
    if (!newNote.trim()) return

    onAddEvent?.({
      type: eventType,
      timestamp: new Date(),
      user: currentUserId,
      content: newNote.trim()
    })

    setNewNote('')
  }

  return (
    <div className={cn('p-4 bg-slate-800 rounded-lg border border-slate-700 space-y-3', className)}>
      <div className="flex gap-2">
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value as TimelineEvent['type'])}
          className="h-9 px-2 rounded border border-slate-600 bg-slate-700 text-white text-xs"
        >
          <option value="note">Note</option>
          <option value="action">Action</option>
          <option value="evidence">Evidence</option>
          <option value="status-change">Status Change</option>
        </select>

        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Add to timeline..."
          className="flex-1 h-9 px-3 rounded border border-slate-600 bg-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
        />

        <button
          onClick={handleSubmit}
          disabled={!newNote.trim()}
          className="h-9 px-4 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}

export default TimelineViewer
