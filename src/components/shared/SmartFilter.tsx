'use client'

import React, { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Search, Filter, X, Plus, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover'

export interface FilterState {
  severity?: string[]
  status?: string[]
  source?: string[]
  dateRange?: string
  searchQuery?: string
  customFilters?: Record<string, string[]>
}

interface SmartFilterProps {
  onFilterChange: (filters: Partial<FilterState>) => void
  placeholder?: string
  showSeverityFilter?: boolean
  showStatusFilter?: boolean
  showSourceFilter?: boolean
  showDateRangeFilter?: boolean
  className?: string
  initialFilters?: Partial<FilterState>
}

const severityOptions = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low', color: 'bg-blue-500' },
  { value: 'info', label: 'Info', color: 'bg-slate-500' }
]

const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' }
]

const sourceOptions = [
  { value: 'siem', label: 'SIEM/Wazuh' },
  { value: 'edr', label: 'EDR/GRR' },
  { value: 'network', label: 'Network/Suricata' },
  { value: 'telecom', label: 'Telecom Probe' },
  { value: 'threat-intel', label: 'Threat Intel' },
  { value: 'user', label: 'User Report' }
]

const dateRangeOptions = [
  { value: '1h', label: 'Last Hour' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' }
]

export function SmartFilter({
  onFilterChange,
  placeholder = 'Search...',
  showSeverityFilter = true,
  showStatusFilter = true,
  showSourceFilter = false,
  showDateRangeFilter = false,
  className,
  initialFilters = {}
}: SmartFilterProps) {
  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery || '')
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>(initialFilters.severity || [])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(initialFilters.status || [])
  const [selectedSources, setSelectedSources] = useState<string[]>(initialFilters.source || [])
  const [selectedDateRange, setSelectedDateRange] = useState(initialFilters.dateRange || '')

  // Debounced search handler
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    onFilterChange({ searchQuery: value })
  }, [onFilterChange])

  // Toggle filter option
  const toggleOption = (
    value: string,
    selected: string[],
    setSelected: (values: string[]) => void,
    filterKey: keyof FilterState
  ) => {
    let newSelected: string[]
    
    if (selected.includes(value)) {
      newSelected = selected.filter(v => v !== value)
    } else {
      newSelected = [...selected, value]
    }
    
    setSelected(newSelected)
    onFilterChange({ [filterKey]: newSelected })
  }

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedSeverities([])
    setSelectedStatuses([])
    setSelectedSources([])
    setSelectedDateRange('')
    onFilterChange({
      searchQuery: '',
      severity: [],
      status: [],
      source: [],
      dateRange: ''
    })
  }

  // Count active filters
  const activeFilterCount = 
    selectedSeverities.length + 
    selectedStatuses.length + 
    selectedSources.length + 
    (selectedDateRange ? 1 : 0)

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          id="alert-search"
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 pr-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
        />
        {searchQuery && (
          <button
            onClick={() => handleSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Severity Filter */}
        {showSeverityFilter && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'gap-1.5 border-slate-600 text-slate-300 hover:bg-slate-700',
                  selectedSeverities.length > 0 && 'border-blue-500/50 text-blue-400'
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                Severity
                {selectedSeverities.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-500/20 text-blue-400 ml-1">
                    {selectedSeverities.length}
                  </Badge>
                )}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 bg-slate-800 border-slate-700 p-2" align="start">
              <p className="text-xs font-medium text-slate-400 mb-2">Select Severities</p>
              <div className="space-y-1">
                {severityOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => toggleOption(option.value, selectedSeverities, setSelectedSeverities, 'severity')}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors',
                      selectedSeverities.includes(option.value) 
                        ? 'bg-blue-500/20 text-blue-300' 
                        : 'text-slate-300 hover:bg-slate-700'
                    )}
                  >
                    <span className={cn('w-2.5 h-2.5 rounded-full', option.color)} />
                    {option.label}
                    {selectedSeverities.includes(option.value) && (
                      <CheckIcon className="ml-auto h-4 w-4 text-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Status Filter */}
        {showStatusFilter && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'gap-1.5 border-slate-600 text-slate-300 hover:bg-slate-700',
                  selectedStatuses.length > 0 && 'border-purple-500/50 text-purple-400'
                )}
              >
                Status
                {selectedStatuses.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-purple-500/20 text-purple-400 ml-1">
                    {selectedStatuses.length}
                  </Badge>
                )}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 bg-slate-800 border-slate-700 p-2" align="start">
              <p className="text-xs font-medium text-slate-400 mb-2">Select Status</p>
              <div className="space-y-1">
                {statusOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => toggleOption(option.value, selectedStatuses, setSelectedStatuses, 'status')}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors',
                      selectedStatuses.includes(option.value) 
                        ? 'bg-purple-500/20 text-purple-300' 
                        : 'text-slate-300 hover:bg-slate-700'
                    )}
                  >
                    {option.label}
                    {selectedStatuses.includes(option.value) && (
                      <CheckIcon className="ml-auto h-4 w-4 text-purple-400" />
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Source Filter */}
        {showSourceFilter && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'gap-1.5 border-slate-600 text-slate-300 hover:bg-slate-700',
                  selectedSources.length > 0 && 'border-cyan-500/50 text-cyan-400'
                )}
              >
                Source
                {selectedSources.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-cyan-500/20 text-cyan-400 ml-1">
                    {selectedSources.length}
                  </Badge>
                )}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 bg-slate-800 border-slate-700 p-2" align="start">
              <p className="text-xs font-medium text-slate-400 mb-2">Select Sources</p>
              <div className="space-y-1">
                {sourceOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => toggleOption(option.value, selectedSources, setSelectedSources, 'source')}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors',
                      selectedSources.includes(option.value) 
                        ? 'bg-cyan-500/20 text-cyan-300' 
                        : 'text-slate-300 hover:bg-slate-700'
                    )}
                  >
                    {option.label}
                    {selectedSources.includes(option.value) && (
                      <CheckIcon className="ml-auto h-4 w-4 text-cyan-400" />
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Date Range Filter */}
        {showDateRangeFilter && (
          <Select value={selectedDateRange} onValueChange={(value) => {
            setSelectedDateRange(value)
            onFilterChange({ dateRange: value })
          }}>
            <SelectTrigger className="w-[130px] h-8 bg-slate-800 border-slate-600 text-sm">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              {dateRangeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Clear All */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-slate-400 hover:text-red-400 h-8"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedSeverities.map(sev => {
            const config = severityOptions.find(s => s.value === sev)!
            return (
              <Badge
                key={sev}
                variant="secondary"
                className="gap-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer pr-1"
                onClick={() => toggleOption(sev, selectedSeverities, setSelectedSeverities, 'severity')}
              >
                <span className={cn('w-2 h-2 rounded-full', config.color)} />
                {config.label}
                <X className="h-3 w-3" />
              </Badge>
            )
          })}
          
          {selectedStatuses.map(status => (
            <Badge
              key={status}
              variant="secondary"
              className="gap-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer pr-1"
              onClick={() => toggleOption(status, selectedStatuses, setSelectedStatuses, 'status')}
            >
              {status}
              <X className="h-3 w-3" />
            </Badge>
          ))}

          {selectedSources.map(source => (
            <Badge
              key={source}
              variant="secondary"
              className="gap-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer pr-1"
              onClick={() => toggleOption(source, selectedSources, setSelectedSources, 'source')}
            >
              {sourceOptions.find(s => s.value === source)?.label || source}
              <X className="h-3 w-3" />
            </Badge>
          ))}

          {selectedDateRange && (
            <Badge
              variant="secondary"
              className="gap-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer pr-1"
              onClick={() => {
                setSelectedDateRange('')
                onFilterChange({ dateRange: '' })
              }}
            >
              📅 {dateRangeOptions.find(d => d.value === selectedDateRange)?.label}
              <X className="h-3 w-3" />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

// Simple check icon for filter selections
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 4L6 11L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default SmartFilter
