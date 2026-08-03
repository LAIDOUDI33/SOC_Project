'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Download, FileText, FileSpreadsheet, Code, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

export type ExportFormat = 'pdf' | 'csv' | 'json' | 'html'

interface DataExporterProps {
  onExport: (format: ExportFormat) => Promise<void> | void
  formats?: ExportFormat[]
  label?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  className?: string
  disabled?: boolean
}

const formatConfig: Record<ExportFormat, { 
  label: string
  icon: React.ReactNode
  extension: string
  mimeType: string
}> = {
  pdf: {
    label: 'PDF Report',
    icon: <FileText className="h-4 w-4" />,
    extension: '.pdf',
    mimeType: 'application/pdf'
  },
  csv: {
    label: 'CSV Data',
    icon: <FileSpreadsheet className="h-4 w-4" />,
    extension: '.csv',
    mimeType: 'text/csv'
  },
  json: {
    label: 'JSON Data',
    icon: <Code className="h-4 w-4" />,
    extension: '.json',
    mimeType: 'application/json'
  },
  html: {
    label: 'HTML Report',
    icon: <FileText className="h-4 w-4" />,
    extension: '.html',
    mimeType: 'text/html'
  }
}

export function DataExporter({
  onExport,
  formats = ['pdf', 'csv', 'json'],
  label,
  size = 'md',
  variant = 'outline',
  className,
  disabled = false
}: DataExporterProps) {
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null)
  const [exportedFormat, setExportedFormat] = useState<ExportFormat | null>(null)

  const handleExport = async (format: ExportFormat) => {
    try {
      setIsExporting(format)
      await onExport(format)
      setExportedFormat(format)
      
      // Reset success state after 2 seconds
      setTimeout(() => setExportedFormat(null), 2000)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(null)
    }
  }

  const sizeClasses = {
    sm: 'h-7 text-xs px-2',
    md: 'h-9 text-sm px-3',
    lg: 'h-11 text-base px-4'
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size === 'sm' ? 'sm' : size === 'lg' ? 'default' : 'default'}
          disabled={disabled || isExporting !== null}
          className={cn(
            'gap-2',
            sizeClasses[size],
            variant === 'outline' && 'border-slate-600 text-slate-300 hover:bg-slate-700',
            className
          )}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Exporting...</span>
            </>
          ) : exportedFormat ? (
            <>
              <Check className="h-4 w-4 text-green-400" />
              <span>Exported</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>{label || 'Export'}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-slate-700">
        {formats.map((format) => {
          const config = formatConfig[format]
          return (
            <DropdownMenuItem
              key={format}
              onClick={() => handleExport(format)}
              disabled={isExporting !== null}
              className="flex items-center gap-2 text-slate-300 focus:bg-slate-700 focus:text-white cursor-pointer"
            >
              {isExporting === format ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                config.icon
              )}
              <span>{config.label}</span>
              <span className="ml-auto text-xs text-slate-500">{config.extension}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Standalone export button for single format
interface ExportButtonProps {
  format: ExportFormat
  onExport: () => Promise<void> | void
  className?: string
  disabled?: boolean
}

export function ExportButton({ 
  format, 
  onExport, 
  className,
  disabled = false 
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exported, setExported] = useState(false)

  const config = formatConfig[format]

  const handleClick = async () => {
    try {
      setIsExporting(true)
      await onExport()
      setExported(true)
      setTimeout(() => setExported(false), 2000)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isExporting}
      variant="outline"
      size="sm"
      className={cn(
        'gap-1.5 border-slate-600 text-slate-300 hover:bg-slate-700',
        className
      )}
    >
      {isExporting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : exported ? (
        <Check className="h-3.5 w-3.5 text-green-400" />
      ) : (
        config.icon
      )}
      <span className="text-xs">
        {config.label.split(' ')[0]}
      </span>
    </Button>
  )
}

export default DataExporter
