'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { X, Keyboard, Command } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

export interface ShortcutConfig {
  key: string
  description: string
  category?: string
  action?: () => void
}

interface KeyboardShortcutsHelpProps {
  shortcuts: ShortcutConfig[]
  onClose: () => void
  className?: string
  title?: string
}

const categories = [
  { id: 'navigation', label: 'Navigation', icon: '🧭' },
  { id: 'actions', label: 'Actions', icon: '⚡' },
  { id: 'view', label: 'View', icon: '👁️' },
  { id: 'general', label: 'General', icon: '⚙️' }
]

function formatKey(key: string): React.ReactNode {
  // Handle special key combinations
  if (key.includes('+')) {
    const parts = key.split('+')
    return (
      <span className="flex items-center gap-0.5">
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-slate-500 text-xs">+</span>}
            <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded bg-slate-700 border border-slate-600 text-xs font-mono font-medium text-white shadow-sm">
              {part.trim()}
            </kbd>
          </React.Fragment>
        ))}
      </span>
    )
  }

  // Single keys with special formatting
  switch (key.toLowerCase()) {
    case 'enter':
      return <kbd className="inline-flex items-center justify-center min-w-[40px] h-6 px-2 rounded bg-slate-700 border border-slate-600 text-xs font-medium text-white">↵ Enter</kbd>
    case 'space':
      return <kbd className="inline-flex items-center justify-center min-w-[50px] h-6 px-2 rounded bg-slate-700 border border-slate-600 text-xs font-medium text-white">Space</kbd>
    case 'arrowup':
    case 'arrowdown':
    case 'arrowleft':
    case 'arrowright':
      const arrow = key.replace('arrow', '').charAt(0).toUpperCase() + key.slice(5)
      return <kbd className="inline-flex items-center justify-center w-8 h-6 rounded bg-slate-700 border border-slate-600 text-xs font-medium text-white">{arrow === 'Up' ? '↑' : arrow === 'Down' ? '↓' : arrow === 'Left' ? '←' : '→'}</kbd>
    case '/':
      return <kbd className="inline-flex items-center justify-center w-8 h-6 rounded bg-slate-700 border border-slate-600 text-sm font-mono font-medium text-center text-white">/</kbd>
    case '?':
      return <kbd className="inline-flex items-center justify-center w-8 h-6 rounded bg-slate-700 border border-slate-600 text-sm font-mono font-medium text-center text-white">?</kbd>
    default:
      return (
        <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded bg-slate-700 border border-slate-600 text-sm font-mono font-medium text-white uppercase">
          {key}
        </kbd>
      )
  }
}

export function KeyboardShortcutsHelp({
  shortcuts,
  onClose,
  className,
  title = 'Keyboard Shortcuts'
}: KeyboardShortcutsHelpProps) {
  // Group shortcuts by category if provided, otherwise use 'general'
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'general'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(shortcut)
    return acc
  }, {} as Record<string, ShortcutConfig[]>)

  // Sort categories to match predefined order
  const orderedCategories = Object.keys(groupedShortcuts).sort((a, b) => {
    const aIndex = categories.findIndex(c => c.id === a)
    const bIndex = categories.findIndex(c => c.id === b)
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex)
  })

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent 
        className={cn(
          'bg-slate-900 border-slate-700 max-w-lg max-h-[80vh] overflow-hidden',
          className
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-blue-400" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] pr-2 -mr-2">
          {/* Quick tip */}
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-300 flex items-start gap-2">
              <span>💡</span>
              <span>Press <kbd className="mx-1 px-1.5 py-0.5 rounded bg-blue-500/20 text-xs font-mono">?</kbd> anytime to show this help dialog</span>
            </p>
          </div>

          {/* Categories */}
          {orderedCategories.map(categoryId => {
            const category = categories.find(c => c.id === categoryId)
            const categoryShortcuts = groupedShortcuts[categoryId]

            return (
              <div key={categoryId} className="mb-4 last:mb-0">
                {/* Category Header */}
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <span>{category?.icon || '📋'}</span>
                  {category?.label || categoryId}
                </h3>

                {/* Shortcuts Grid */}
                <div className="space-y-1.5">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded hover:bg-slate-800 transition-colors group"
                    >
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                        {shortcut.description}
                      </span>
                      <div className="ml-4">
                        {formatKey(shortcut.key)}
                      </div>
                    </div>
                  ))}
                </div>

                {categoryId !== orderedCategories[orderedCategories.length - 1] && (
                  <Separator className="mt-4 bg-slate-800" />
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-2 border-t border-slate-700 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Shortcuts may vary based on current context
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
          >
            Got it!
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Non-modal version for inline display
interface ShortcutListProps {
  shortcuts: ShortcutConfig[]
  columns?: number
  showCategories?: boolean
  className?: string
}

export function ShortcutList({ 
  shortcuts, 
  columns = 1, 
  showCategories = true,
  className 
}: ShortcutListProps) {
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'general'
    if (!acc[category]) acc[category] = []
    acc[category].push(shortcut)
    return acc
  }, {} as Record<string, ShortcutConfig[]>)

  return (
    <div className={cn('grid gap-4', `grid-cols-${columns}`, className)}>
      {Object.entries(groupedShortcuts).map(([categoryId, categoryShortcuts]) => (
        <div key={categoryId}>
          {showCategories && (
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {categories.find(c => c.id === categoryId)?.label || categoryId}
            </h4>
          )}
          <div className="space-y-1">
            {categoryShortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-slate-400">{shortcut.description}</span>
                {formatKey(shortcut.key)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Hook for handling keyboard shortcuts
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return
      }

      // Build the key representation
      let keyStr = event.key.toLowerCase()
      
      if (event.metaKey || event.ctrlKey) {
        keyStr = `${event.metaKey ? '⌘' : 'Ctrl'}+${event.key.length === 1 ? event.key.toUpperCase() : event.key}`
      }
      if (event.shiftKey && !event.metaKey && !event.ctrlKey) {
        keyStr = `Shift+${event.key.toUpperCase()}`
      }

      // Find matching shortcut
      const matchingShortcut = shortcuts.find(s => 
        s.key.toLowerCase() === keyStr || 
        s.key.toLowerCase() === event.key.toLowerCase()
      )

      if (matchingShortcut?.action) {
        event.preventDefault()
        matchingShortcut.action()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}

export default KeyboardShortcutsHelp
