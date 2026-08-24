'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Shield, Users, Settings, FileText, Activity, Key, Clock,
  Search, Plus, Edit2, Trash2, Eye, RefreshCw, Download,
  Filter, ChevronDown, ChevronRight, X, Check, AlertTriangle,
  Server, Database, Globe, Lock, Unlock, UserPlus, UserCheck,
  UserX, Calendar, BarChart3, Terminal, Save, Ban, CheckCircle,
  XCircle, Pause, Play, ArrowLeft, MoreVertical, Copy,
  Building2, Plug, Code, Scale, ShieldCheck, KeyRound,
  HardDrive, Wifi, Cpu, MemoryStick, Globe2, Webhook,
  UserCog, Layers, Network, Workflow, ClipboardList,
  AlertCircle, CheckSquare, Square, Upload, Link as LinkIcon,
  ExternalLink, Trash, Edit, View, ToggleLeft, ToggleRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface User {
  id: string
  email: string
  name: string
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'LOCKED'
  department?: string
  phone?: string
  mfaEnabled: boolean
  role?: { id: string; name: string; description?: string }
  tenantId?: string
  tenantName?: string
  createdAt: string
  lastLoginAt?: string
  _count?: { sessions: number; auditLogs: number }
}

interface Role {
  id: string
  name: string
  description?: string
  permissions: Permission[]
  isSystemRole: boolean
  _count?: { users: number }
}

interface Permission {
  id: string
  name: string
  description: string
  module: string
  action: string
}

interface Tenant {
  id: string
  name: string
  slug: string
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'EXPIRED'
  plan: 'ENTERPRISE' | 'PROFESSIONAL' | 'STANDARD' | 'TRIAL'
  maxUsers: number
  maxEventsPerSecond: number
  retentionDays: number
  features: string[]
  createdAt: string
  updatedAt: string
  _count?: { users: number; incidents: number }
}

interface Session {
  id: string
  userId: string
  isActive: boolean
  ipAddress?: string
  userAgent?: string
  deviceInfo?: string
  location?: string
  createdAt: string
  lastActiveAt: string
  user?: { id: string; email: string; name: string; role?: { name: string } }
}

interface AuditLog {
  id: string
  userId: string
  action: string
  entityType: string
  entityId?: string
  details?: string
  ipAddress?: string
  userAgent?: string
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  createdAt: string
  user?: { name: string; email: string }
}

interface SystemConfig {
  key: string
  value: string
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON'
  category: string
  description: string
  isSensitive: boolean
  updatedAt: string
}

interface Integration {
  id: string
  name: string
  type: 'SIEM' | 'EDR' | 'TIPL' | 'SOAR' | 'TICKET' | 'CLOUD' | 'VULN' | 'IDENTITY'
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'CONFIGURING'
  config: Record<string, any>
  lastSyncAt?: string
  errorCount: number
  createdAt: string
}

interface DetectionRule {
  id: string
  name: string
  type: 'SIGMA' | 'YARA' | 'SURICATA' | 'BEHAVIORAL' | 'STATISTICAL'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'ACTIVE' | 'DRAFT' | 'DISABLED' | 'TESTING'
  author: string
  mitreTechniques?: string[]
  falsePositiveRate: number
  detectionCount: number
  lastModified: string
  createdAt: string
}

interface ApiKey {
  id: string
  name: string
  key: string
  prefix: string
  permissions: string[]
  rateLimit: number
  lastUsedAt?: string
  expiresAt?: string
  isActive: boolean
  createdBy: string
  createdAt: string
}

interface SystemHealth {
  healthScore: number
  cpu: { usage: number; cores: number; temperature?: number }
  memory: { used: number; total: number; percentage: number }
  disk: { used: number; total: number; percentage: number }
  network: { latency: number; bandwidth: { in: number; out: number } }
  database: { status: string; connections: number; queryTime: number }
  services: { name: string; status: string; uptime: number; version: string }[]
  alerts: { severity: string; message: string; timestamp: string }[]
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function AdminNavItem({
  icon,
  label,
  active,
  onClick,
  badge,
  expanded,
  onExpand,
  children
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  badge?: number
  expanded?: boolean
  onExpand?: () => void
  children?: React.ReactNode
}) {
  return (
    <div>
      <button
        onClick={children ? onExpand : onClick}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
          active
            ? 'bg-red-600/20 text-red-400 border border-red-600/30'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
      >
        {icon}
        <span className="flex-1 text-left">{label}</span>
        {badge && (
          <Badge variant="secondary" className="bg-slate-700 text-slate-300 text-xs">
            {badge}
          </Badge>
        )}
        {children && (
          <ChevronRight
            className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        )}
      </button>
      {children && expanded && (
        <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-3">
          {children}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/30',
    INACTIVE: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    SUSPENDED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    LOCKED: 'bg-red-500/20 text-red-400 border-red-500/30',
    TRIAL: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    EXPIRED: 'bg-red-500/20 text-red-400 border-red-500/30',
    CONNECTED: 'bg-green-500/20 text-green-400 border-green-500/30',
    DISCONNECTED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    ERROR: 'bg-red-500/20 text-red-400 border-red-500/30',
    CONFIGURING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    DRAFT: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    TESTING: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    DISABLED: 'bg-red-500/20 text-red-400 border-red-500/30',
    INFO: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    WARNING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30'
  }

  return (
    <Badge variant="outline" className={variants[status] || variants.INFO}>
      {status}
    </Badge>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    LOW: 'text-blue-400 bg-blue-500/10',
    MEDIUM: 'text-yellow-400 bg-yellow-500/10',
    HIGH: 'text-orange-400 bg-orange-500/10',
    CRITICAL: 'text-red-400 bg-red-500/10'
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[severity] || colors.LOW}`}>
      {severity}
    </span>
  )
}

function ActionButton({
  icon: Icon,
  label,
  variant = 'default',
  size = 'sm',
  onClick,
  disabled = false,
  className = ''
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  variant?: 'default' | 'ghost' | 'destructive' | 'outline'
  size?: 'sm' | 'icon'
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={className}
      title={label}
    >
      <Icon className="h-4 w-4" />
      {size !== 'icon' && <span className="ml-1">{label}</span>}
    </Button>
  )
}

// =============================================================================
// MAIN ADMIN INTERFACE COMPONENT
// =============================================================================

export function FullAdminInterface() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isLoading, setIsLoading] = useState(false)
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  
  // Data states
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [detectionRules, setDetectionRules] = useState<DetectionRule[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedTenant, setSelectedTenant] = useState<string>('all')

  // Dialog states
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Expanded sidebar sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    users: false,
    system: false,
    security: false
  })

  // ===========================================================================
  // DATA FETCHING FUNCTIONS
  // ===========================================================================

  const fetchSystemHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/system')
      if (res.ok) {
        const data = await res.json()
        setSystemHealth(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch system health:', error)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (selectedStatus !== 'all') params.set('status', selectedStatus)
      
      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.data || data)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }, [searchQuery, selectedStatus])

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/roles')
      if (res.ok) {
        const data = await res.json()
        setRoles(data.data || data)
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error)
    }
  }, [])

  const fetchTenants = useCallback(async () => {
    try {
      const res = await fetch('/api/mssp')
      if (res.ok) {
        const data = await res.json()
        setTenants(data.tenants || data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error)
    }
  }, [])

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sessions')
      if (res.ok) {
        const data = await res.json()
        setSessions(data.data || data)
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }
  }, [])

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/audit')
      if (res.ok) {
        const data = await res.json()
        setAuditLogs(data.data || data)
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    }
  }, [])

  const fetchIntegrations = useCallback(async () => {
    try {
      // Mock data for integrations
      setIntegrations([
        {
          id: '1',
          name: 'Wazuh SIEM',
          type: 'SIEM',
          status: 'CONNECTED',
          config: { endpoint: 'https://wazuh.example.com', apiKey: '***' },
          lastSyncAt: new Date().toISOString(),
          errorCount: 0,
          createdAt: '2024-01-15T10:00:00Z'
        },
        {
          id: '2',
          name: 'CrowdStrike EDR',
          type: 'EDR',
          status: 'CONNECTED',
          config: { clientId: 'cs-12345', region: 'us-1' },
          lastSyncAt: new Date().toISOString(),
          errorCount: 0,
          createdAt: '2024-02-01T08:00:00Z'
        },
        {
          id: '3',
          name: 'MISP Threat Intel',
          type: 'TIPL',
          status: 'ERROR',
          config: { url: 'https://misp.example.com', api_key: '***' },
          errorCount: 5,
          createdAt: '2024-03-10T14:00:00Z'
        },
        {
          id: '4',
          name: 'ServiceNow ITSM',
          type: 'TICKET',
          status: 'CONFIGURING',
          config: { instance: 'dev12345.service-now.com' },
          errorCount: 0,
          createdAt: '2024-04-05T09:00:00Z'
        }
      ])
    } catch (error) {
      console.error('Failed to fetch integrations:', error)
    }
  }, [])

  const fetchDetectionRules = useCallback(async () => {
    try {
      // Mock data for detection rules
      setDetectionRules([
        {
          id: '1',
          name: 'Suspicious PowerShell Execution',
          type: 'SIGMA',
          severity: 'HIGH',
          status: 'ACTIVE',
          author: 'detection-team',
          mitreTechniques: ['T1059.001'],
          falsePositiveRate: 0.05,
          detectionCount: 234,
          lastModified: '2024-06-15T10:30:00Z',
          createdAt: '2024-01-20T14:00:00Z'
        },
        {
          id: '2',
          name: 'Lateral Movement via RDP',
          type: 'SIGMA',
          severity: 'CRITICAL',
          status: 'ACTIVE',
          author: 'threat-hunters',
          mitreTechniques: ['T1021.001'],
          falsePositiveRate: 0.02,
          detectionCount: 89,
          lastModified: '2024-06-14T16:45:00Z',
          createdAt: '2024-02-10T09:00:00Z'
        },
        {
          id: '3',
          name: 'Emotet YARA Rule',
          type: 'YARA',
          severity: 'CRITICAL',
          status: 'ACTIVE',
          author: 'malware-analysis',
          falsePositiveRate: 0.01,
          detectionCount: 12,
          lastModified: '2024-06-13T11:20:00Z',
          createdAt: '2024-03-25T15:00:00Z'
        }
      ])
    } catch (error) {
      console.error('Failed to fetch detection rules:', error)
    }
  }, [])

  const fetchApiKeys = useCallback(async () => {
    try {
      // Mock data for API keys
      setApiKeys([
        {
          id: '1',
          name: 'Production API Key',
          key: 'cs_prod_sk_****************************',
          prefix: 'cs_prod_sk',
          permissions: ['read', 'write', 'admin'],
          rateLimit: 1000,
          lastUsedAt: new Date().toISOString(),
          isActive: true,
          createdBy: 'admin@cybersoc.local',
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          name: 'SIEM Integration Key',
          key: 'cs_siem_****************************',
          prefix: 'cs_siem',
          permissions: ['read', 'write'],
          rateLimit: 500,
          lastUsedAt: new Date(Date.now() - 3600000).toISOString(),
          isActive: true,
          createdBy: 'integration-admin@cybersoc.local',
          createdAt: '2024-02-15T10:00:00Z'
        }
      ])
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    }
  }, [])

  // Initial data loading
  useEffect(() => {
    fetchSystemHealth()
    fetchUsers()
    fetchRoles()
    fetchTenants()
    fetchSessions()
    fetchAuditLogs()
    fetchIntegrations()
    fetchDetectionRules()
    fetchApiKeys()
  }, [
    fetchSystemHealth, fetchUsers, fetchRoles, fetchTenants,
    fetchSessions, fetchAuditLogs, fetchIntegrations,
    fetchDetectionRules, fetchApiKeys
  ])

  // ===========================================================================
  // ACTION HANDLERS
  // ===========================================================================

  const handleCreateUser = async (userData: Partial<User>) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })
      if (res.ok) {
        toast.success('User created successfully')
        setUserDialogOpen(false)
        fetchUsers()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Failed to create user')
      }
    } catch (error) {
      toast.error('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateUser = async (id: string, userData: Partial<User>) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })
      if (res.ok) {
        toast.success('User updated successfully')
        setSelectedUser(null)
        fetchUsers()
      } else {
        toast.error('Failed to update user')
      }
    } catch (error) {
      toast.error('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return
    
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('User deleted successfully')
        fetchUsers()
      } else {
        toast.error('Failed to delete user')
      }
    } catch (error) {
      toast.error('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleUserStatus = async (user: User) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    await handleUpdateUser(user.id, { status: newStatus })
  }

  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to terminate this session?')) return
    
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Session terminated')
        fetchSessions()
      } else {
        toast.error('Failed to terminate session')
      }
    } catch (error) {
      toast.error('Network error occurred')
    }
  }

  const handleRevokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return
    
    try {
      // Mock revocation
      setApiKeys(prev => prev.map(key =>
        key.id === keyId ? { ...key, isActive: false } : key
      ))
      toast.success('API key revoked')
    } catch (error) {
      toast.error('Failed to revoke API key')
    }
  }

  const handleToggleRuleStatus = async (ruleId: string) => {
    try {
      setDetectionRules(prev => prev.map(rule =>
        rule.id === ruleId
          ? { ...rule, status: rule.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' }
          : rule
      ))
      toast.success('Rule status updated')
    } catch (error) {
      toast.error('Failed to update rule status')
    }
  }

  const handleExportData = async (type: string) => {
    toast.info(`Exporting ${type} data...`)
    // Simulate export
    setTimeout(() => {
      toast.success(`${type} data exported successfully`)
    }, 1500)
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // ===========================================================================
  // RENDER HELPERS
  // ===========================================================================

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  // ===========================================================================
  // MAIN RENDER
  // ===========================================================================

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ================================================================= */}
      {/* ADMIN HEADER                                                      */}
      {/* ================================================================= */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Shield className="h-8 w-8 text-red-500" />
            <div>
              <h1 className="text-xl font-bold">CyberSOC Administration</h1>
              <p className="text-sm text-slate-400">Full Privileges Control Panel</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-green-500 text-green-400 animate-pulse">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              Super Admin
            </Badge>
            
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Globe2 className="h-4 w-4" />
              <span>Global Scope</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                fetchSystemHealth()
                fetchUsers()
                fetchSessions()
                fetchAuditLogs()
              }}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* ================================================================= */}
        {/* SIDEBAR NAVIGATION                                               */}
        {/* ================================================================= */}
        <aside className="w-72 border-r border-slate-800 min-h-[calc(100vh-73px)] bg-slate-900/30 p-4 overflow-y-auto">
          <nav className="space-y-1">
            {/* Dashboard */}
            <AdminNavItem
              icon={<Activity className="h-4 w-4" />}
              label="Dashboard"
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
            />

            {/* User Management Section */}
            <AdminNavItem
              icon={<Users className="h-4 w-4" />}
              label="User Management"
              active={['users', 'roles', 'sessions'].includes(activeTab)}
              onClick={() => setActiveTab('users')}
              badge={users.length}
              expanded={expandedSections.users}
              onExpand={() => toggleSection('users')}
            >
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full text-left px-2 py-1.5 rounded text-xs ${
                  activeTab === 'users' ? 'text-red-400 bg-slate-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                All Users
              </button>
              <button
                onClick={() => setActiveTab('roles')}
                className={`w-full text-left px-2 py-1.5 rounded text-xs ${
                  activeTab === 'roles' ? 'text-red-400 bg-slate-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                Roles & Permissions
              </button>
              <button
                onClick={() => setActiveTab('sessions')}
                className={`w-full text-left px-2 py-1.5 rounded text-xs ${
                  activeTab === 'sessions' ? 'text-red-400 bg-slate-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                Active Sessions
              </button>
            </AdminNavItem>

            {/* Tenant Management */}
            <AdminNavItem
              icon={<Building2 className="h-4 w-4" />}
              label="Tenant Management"
              active={activeTab === 'tenants'}
              onClick={() => setActiveTab('tenants')}
              badge={tenants.length}
            />

            {/* Integrations */}
            <AdminNavItem
              icon={<Plug className="h-4 w-4" />}
              label="Integrations"
              active={activeTab === 'integrations'}
              onClick={() => setActiveTab('integrations')}
              badge={integrations.filter(i => i.status === 'ERROR').length}
            />

            {/* Detection Engineering */}
            <AdminNavItem
              icon={<Code className="h-4 w-4" />}
              label="Detection Rules"
              active={activeTab === 'detections'}
              onClick={() => setActiveTab('detections')}
              badge={detectionRules.filter(r => r.status === 'ACTIVE').length}
            />

            {/* Security Section */}
            <AdminNavItem
              icon={<Lock className="h-4 w-4" />}
              label="Security"
              active={['audit', 'api-keys', 'security'].includes(activeTab)}
              onClick={() => setActiveTab('audit')}
              expanded={expandedSections.security}
              onExpand={() => toggleSection('security')}
            >
              <button
                onClick={() => setActiveTab('audit')}
                className={`w-full text-left px-2 py-1.5 rounded text-xs ${
                  activeTab === 'audit' ? 'text-red-400 bg-slate-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                Audit Logs
              </button>
              <button
                onClick={() => setActiveTab('api-keys')}
                className={`w-full text-left px-2 py-1.5 rounded text-xs ${
                  activeTab === 'api-keys' ? 'text-red-400 bg-slate-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                API Keys
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`w-full text-left px-2 py-1.5 rounded text-xs ${
                  activeTab === 'security' ? 'text-red-400 bg-slate-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                Security Settings
              </button>
            </AdminNavItem>

            {/* System Section */}
            <AdminNavItem
              icon={<Server className="h-4 w-4" />}
              label="System"
              active={['health', 'maintenance', 'config'].includes(activeTab)}
              onClick={() => setActiveTab('health')}
              expanded={expandedSections.system}
              onExpand={() => toggleSection('system')}
            >
              <button
                onClick={() => setActiveTab('health')}
                className={`w-full text-left px-2 py-1.5 rounded text-xs ${
                  activeTab === 'health' ? 'text-red-400 bg-slate-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                System Health
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`w-full text-left px-2 py-1.5 rounded text-xs ${
                  activeTab === 'maintenance' ? 'text-red-400 bg-slate-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                Maintenance Mode
              </button>
              <button
                onClick={() => setActiveTab('config')}
                className={`w-full text-left px-2 py-1.5 rounded text-xs ${
                  activeTab === 'config' ? 'text-red-400 bg-slate-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                Configuration
              </button>
            </AdminNavItem>
          </nav>

          {/* Quick Stats */}
          <Separator className="my-4 bg-slate-800" />
          
          <div className="space-y-3 px-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Quick Stats
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/50 rounded p-2 text-center">
                <div className="text-lg font-bold text-white">{users.length}</div>
                <div className="text-xs text-slate-400">Users</div>
              </div>
              <div className="bg-slate-800/50 rounded p-2 text-center">
                <div className="text-lg font-bold text-white">{tenants.length}</div>
                <div className="text-xs text-slate-400">Tenants</div>
              </div>
              <div className="bg-slate-800/50 rounded p-2 text-center">
                <div className="text-lg font-bold text-green-400">
                  {sessions.filter(s => s.isActive).length}
                </div>
                <div className="text-xs text-slate-400">Active</div>
              </div>
              <div className="bg-slate-800/50 rounded p-2 text-center">
                <div className="text-lg font-bold text-yellow-400">
                  {auditLogs.filter(l => l.severity === 'ERROR' || l.severity === 'CRITICAL').length}
                </div>
                <div className="text-xs text-slate-400">Alerts</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ================================================================= */}
        {/* MAIN CONTENT AREA                                                */}
        {/* ================================================================= */}
        <main className="flex-1 p-6 overflow-y-auto min-h-[calc(100vh-73px)]">
          {/* =============================================================== */}
          {/* DASHBOARD TAB                                                    */}
          {/* =============================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Administration Dashboard</h2>
                  <p className="text-slate-400 mt-1">
                    Complete platform control and monitoring
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleExportData('dashboard')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </div>

              {/* Health Score Cards */}
              {systemHealth && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                      <CardDescription>Health Score</CardDescription>
                      <CardTitle className={`text-3xl ${
                        systemHealth.healthScore >= 90 ? 'text-green-400' :
                        systemHealth.healthScore >= 70 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {systemHealth.healthScore}%
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                      <CardDescription>Total Users</CardDescription>
                      <CardTitle className="text-3xl">{users.length}</CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                      <CardDescription>Active Sessions</CardDescription>
                      <CardTitle className="text-3xl text-green-400">
                        {sessions.filter(s => s.isActive).length}
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                      <CardDescription>Tenants</CardDescription>
                      <CardTitle className="text-3xl">{tenants.length}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>
              )}

              {/* System Resources */}
              {systemHealth && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Cpu className="h-5 w-5 text-blue-400" />
                        System Resources
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-400">CPU Usage</span>
                          <span>{systemHealth.cpu.usage}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              systemHealth.cpu.usage > 80 ? 'bg-red-500' :
                              systemHealth.cpu.usage > 60 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${systemHealth.cpu.usage}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-400">Memory</span>
                          <span>{formatBytes(systemHealth.memory.used)} / {formatBytes(systemHealth.memory.total)}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              systemHealth.memory.percentage > 80 ? 'bg-red-500' :
                              systemHealth.memory.percentage > 60 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${systemHealth.memory.percentage}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-400">Disk</span>
                          <span>{formatBytes(systemHealth.disk.used)} / {formatBytes(systemHealth.disk.total)}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              systemHealth.disk.percentage > 80 ? 'bg-red-500' :
                              systemHealth.disk.percentage > 60 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${systemHealth.disk.percentage}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-400" />
                        Recent Alerts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-3">
                          {systemHealth.alerts?.slice(0, 5).map((alert, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-2 rounded bg-slate-800/50">
                              <Badge
                                variant="outline"
                                className={
                                  alert.severity === 'CRITICAL' ? 'border-red-500 text-red-400' :
                                  alert.severity === 'ERROR' ? 'border-orange-500 text-orange-400' :
                                  'border-yellow-500 text-yellow-400'
                                }
                              >
                                {alert.severity}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{alert.message}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {formatDate(alert.timestamp)}
                                </p>
                              </div>
                            </div>
                          )) || (
                            <p className="text-slate-500 text-sm text-center py-4">
                              No recent alerts
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Services Status */}
              {systemHealth?.services && (
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5 text-purple-400" />
                      Service Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {systemHealth.services.map((service, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              service.status === 'running' ? 'bg-green-500' :
                              service.status === 'degraded' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`} />
                            <div>
                              <div className="font-medium text-sm">{service.name}</div>
                              <div className="text-xs text-slate-500">v{service.version}</div>
                            </div>
                          </div>
                          <Badge variant="outline" className={
                            service.status === 'running' ? 'border-green-500 text-green-400' :
                            service.status === 'degraded' ? 'border-yellow-500 text-yellow-400' :
                            'border-red-500 text-red-400'
                          }>
                            {service.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* USER MANAGEMENT TAB                                              */}
          {/* =============================================================== */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">User Management</h2>
                  <p className="text-slate-400 mt-1">
                    Manage all platform users across tenants
                  </p>
                </div>
                <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Add a new user to the platform. They will receive an email invitation.
                      </DialogDescription>
                    </DialogHeader>
                    < CreateUserForm onSubmit={handleCreateUser} isLoading={isLoading} />
                  </DialogContent>
                </Dialog>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-slate-800 border-slate-700"
                    />
                  </div>
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[160px] bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="LOCKED">Locked</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                  <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700">
                    <SelectValue placeholder="All Tenants" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tenants</SelectItem>
                    {tenants.map(tenant => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchUsers}>
                  <Filter className="h-4 w-4 mr-2" />
                  Apply
                </Button>
              </div>

              {/* Users Table */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700 hover:bg-slate-800/50">
                        <TableHead className="text-slate-400">User</TableHead>
                        <TableHead className="text-slate-400">Role</TableHead>
                        <TableHead className="text-slate-400">Tenant</TableHead>
                        <TableHead className="text-slate-400">Status</TableHead>
                        <TableHead className="text-slate-400">MFA</TableHead>
                        <TableHead className="text-slate-400">Last Login</TableHead>
                        <TableHead className="text-slate-400 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map(user => (
                        <TableRow key={user.id} className="border-slate-800">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-medium text-sm">
                                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-slate-500">{user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-slate-700">
                              {user.role?.name || 'Unassigned'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {user.tenantName || '-'}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={user.status} />
                          </TableCell>
                          <TableCell>
                            {user.mfaEnabled ? (
                              <ShieldCheck className="h-4 w-4 text-green-400" />
                            ) : (
                              <XCircle className="h-4 w-4 text-slate-500" />
                            )}
                          </TableCell>
                          <TableCell className="text-slate-400 text-sm">
                            {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <ActionButton
                                icon={Eye}
                                label="View Details"
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedUser(user)}
                              />
                              <ActionButton
                                icon={Edit2}
                                label="Edit User"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setUserDialogOpen(true)
                                }}
                              />
                              <ActionButton
                                icon={user.status === 'ACTIVE' ? Ban : UserCheck}
                                label={user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                variant={user.status === 'ACTIVE' ? 'destructive' : 'ghost'}
                                size="icon"
                                onClick={() => handleToggleUserStatus(user)}
                              />
                              <ActionButton
                                icon={Trash2}
                                label="Delete User"
                                variant="destructive"
                                size="icon"
                                onClick={() => handleDeleteUser(user.id)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {users.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No users found matching your criteria</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* =============================================================== */}
          {/* ROLES & PERMISSIONS TAB                                         */}
          {/* =============================================================== */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Roles & Permissions</h2>
                  <p className="text-slate-400 mt-1">
                    Define access controls and permission sets
                  </p>
                </div>
                <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Create New Role</DialogTitle>
                      <DialogDescription>
                        Define a new role with specific permissions.
                      </DialogDescription>
                    </DialogHeader>
                    <CreateRoleForm onSubmit={async (data) => {
                      toast.success(`Role "${data.name}" created`)
                      setRoleDialogOpen(false)
                      fetchRoles()
                    }} isLoading={isLoading} />
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roles.map(role => (
                  <Card
                    key={role.id}
                    className={`bg-slate-900/50 border-slate-800 transition-all hover:border-slate-700 ${
                      role.isSystemRole ? 'ring-1 ring-yellow-500/30' : ''
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {role.name}
                            {role.isSystemRole && (
                              <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-400">
                                System
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {role.description || 'No description provided'}
                          </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Permissions</span>
                          <span className="text-white">{role.permissions?.length || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Users Assigned</span>
                          <span className="text-white">{role._count?.users || 0}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mt-3">
                          {role.permissions?.slice(0, 3).map(permission => (
                            <Badge
                              key={permission.id}
                              variant="secondary"
                              className="text-xs bg-slate-700"
                            >
                              {permission.name}
                            </Badge>
                          ))}
                          {(role.permissions?.length || 0) > 3 && (
                            <Badge variant="secondary" className="text-xs bg-slate-700">
                              +{role.permissions!.length - 3} more
                            </Badge>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => toast.info(`Editing role: ${role.name}`)}
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          {!role.isSystemRole && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-red-400 border-red-500/30 hover:bg-red-500/10"
                              onClick={() => {
                                if (confirm(`Delete role "${role.name}"?`)) {
                                  toast.success('Role deleted')
                                  fetchRoles()
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          /* ACTIVE SESSIONS TAB                                             */
          {/* =============================================================== */}
          {activeTab === 'sessions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Active Sessions</h2>
                  <p className="text-slate-400 mt-1">
                    Monitor and manage user sessions across the platform
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="border-green-500 text-green-400">
                    {sessions.filter(s => s.isActive).length} Active
                  </Badge>
                  <Button variant="outline" onClick={() => handleExportData('sessions')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700 hover:bg-slate-800/50">
                        <TableHead className="text-slate-400">User</TableHead>
                        <TableHead className="text-slate-400">IP Address</TableHead>
                        <TableHead className="text-slate-400">Device</TableHead>
                        <TableHead className="text-slate-400">Location</TableHead>
                        <TableHead className="text-slate-400">Created</TableHead>
                        <TableHead className="text-slate-400">Last Active</TableHead>
                        <TableHead className="text-slate-400">Status</TableHead>
                        <TableHead className="text-slate-400 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map(session => (
                        <TableRow key={session.id} className="border-slate-800">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="font-medium">{session.user?.name}</div>
                              <div className="text-sm text-slate-500">{session.user?.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {session.ipAddress || '-'}
                          </TableCell>
                          <TableCell className="text-slate-300 max-w-[200px] truncate">
                            {session.deviceInfo || session.userAgent?.substring(0, 40) + '...' || '-'}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {session.location || '-'}
                          </TableCell>
                          <TableCell className="text-slate-400 text-sm">
                            {formatDate(session.createdAt)}
                          </TableCell>
                          <TableCell className="text-slate-400 text-sm">
                            {formatDate(session.lastActiveAt)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                session.isActive
                                  ? 'border-green-500 text-green-400'
                                  : 'border-slate-500 text-slate-400'
                              }
                            >
                              {session.isActive ? 'Active' : 'Expired'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {session.isActive && (
                              <ActionButton
                                icon={XCircle}
                                label="Terminate Session"
                                variant="destructive"
                                size="icon"
                                onClick={() => handleTerminateSession(session.id)}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* =============================================================== */}
          {/* TENANT MANAGEMENT TAB                                          */}
          {/* =============================================================== */}
          {activeTab === 'tenants' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Tenant Management</h2>
                  <p className="text-slate-400 mt-1">
                    Manage MSSP multi-tenant configurations
                  </p>
                </div>
                <Dialog open={tenantDialogOpen} onOpenChange={setTenantDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Building2 className="h-4 w-4 mr-2" />
                      Add Tenant
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Create New Tenant</DialogTitle>
                      <DialogDescription>
                        Set up a new tenant organization with isolated resources.
                      </DialogDescription>
                    </DialogHeader>
                    <CreateTenantForm onSubmit={async (data) => {
                      toast.success(`Tenant "${data.name}" created`)
                      setTenantDialogOpen(false)
                      fetchTenants()
                    }} isLoading={isLoading} />
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {tenants.map(tenant => (
                  <Card key={tenant.id} className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-blue-400" />
                            {tenant.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {tenant.slug}
                          </CardDescription>
                        </div>
                        <StatusBadge status={tenant.status} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-slate-400">Plan</div>
                            <div className="font-medium">{tenant.plan}</div>
                          </div>
                          <div>
                            <div className="text-sm text-slate-400">Users</div>
                            <div className="font-medium">{tenant._count?.users || 0} / {tenant.maxUsers}</div>
                          </div>
                          <div>
                            <div className="text-sm text-slate-400">EPS Limit</div>
                            <div className="font-medium">{tenant.maxEventsPerSecond.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-sm text-slate-400">Retention</div>
                            <div className="font-medium">{tenant.retentionDays} days</div>
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-slate-400 mb-2">Enabled Features</div>
                          <div className="flex flex-wrap gap-1">
                            {tenant.features.map(feature => (
                              <Badge
                                key={feature}
                                variant="secondary"
                                className="text-xs bg-slate-700"
                              >
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-slate-800">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => toast.info(`Opening settings for: ${tenant.name}`)}
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Configure
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => toast.info(`Viewing dashboard for: ${tenant.name}`)}
                          >
                            <BarChart3 className="h-3 w-3 mr-1" />
                            Dashboard
                          </Button>
                          {tenant.status === 'ACTIVE' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10"
                              onClick={() => {
                                if (confirm(`Suspend tenant "${tenant.name}"?`)) {
                                  toast.success('Tenant suspended')
                                  fetchTenants()
                                }
                              }}
                            >
                              <Pause className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* INTEGRATIONS TAB                                                 */}
          {/* =============================================================== */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Integrations</h2>
                  <p className="text-slate-400 mt-1">
                    Manage third-party system connections
                  </p>
                </div>
                <Button>
                  <Plug className="h-4 w-4 mr-2" />
                  Add Integration
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {integrations.map(integration => (
                  <Card
                    key={integration.id}
                    className="bg-slate-900/50 border-slate-800"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            integration.type === 'SIEM' ? 'bg-blue-500/20 text-blue-400' :
                            integration.type === 'EDR' ? 'bg-green-500/20 text-green-400' :
                            integration.type === 'TIPL' ? 'bg-purple-500/20 text-purple-400' :
                            integration.type === 'SOAR' ? 'bg-orange-500/20 text-orange-400' :
                            integration.type === 'TICKET' ? 'bg-cyan-500/20 text-cyan-400' :
                            'bg-slate-700 text-slate-300'
                          }`}>
                            {integration.type === 'SIEM' && <Database className="h-5 w-5" />}
                            {integration.type === 'EDR' && <Shield className="h-5 w-5" />}
                            {integration.type === 'TIPL' && <AlertTriangle className="h-5 w-5" />}
                            {integration.type === 'SOAR' && <Workflow className="h-5 w-5" />}
                            {integration.type === 'TICKET' && <ClipboardList className="h-5 w-5" />}
                            {!['SIEM', 'EDR', 'TIPL', 'SOAR', 'TICKET'].includes(integration.type) && (
                              <Plug className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-base">{integration.name}</CardTitle>
                            <Badge variant="secondary" className="mt-1 text-xs bg-slate-700">
                              {integration.type}
                            </Badge>
                          </div>
                        </div>
                        <StatusBadge status={integration.status} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {integration.lastSyncAt && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Last Sync</span>
                            <span>{formatDate(integration.lastSyncAt)}</span>
                          </div>
                        )}
                        
                        {integration.errorCount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Errors</span>
                            <span className="text-red-400">{integration.errorCount}</span>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          {integration.status === 'CONNECTED' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => toast.info(`Testing connection to ${integration.name}...`)}
                              >
                                Test Connection
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => toast.info(`Syncing ${integration.name}...`)}
                              >
                                Sync Now
                              </Button>
                            </>
                          )}
                          
                          {integration.status === 'ERROR' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-yellow-400 border-yellow-500/30"
                              onClick={() => toast.info(`Reconfiguring ${integration.name}...`)}
                            >
                              Reconfigure
                            </Button>
                          )}
                          
                          {integration.status === 'DISCONNECTED' && (
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => toast.info(`Connecting to ${integration.name}...`)}
                            >
                              Connect
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Remove integration "${integration.name}"?`)) {
                                toast.success('Integration removed')
                                fetchIntegrations()
                              }
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* DETECTION RULES TAB                                              */}
          {/* =============================================================== */}
          {activeTab === 'detections' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Detection Rules</h2>
                  <p className="text-slate-400 mt-1">
                    Manage Sigma, YARA, and behavioral detection rules
                  </p>
                </div>
                <Button>
                  <Code className="h-4 w-4 mr-2" />
                  Import Rules
                </Button>
              </div>

              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700 hover:bg-slate-800/50">
                        <TableHead className="text-slate-400">Rule Name</TableHead>
                        <TableHead className="text-slate-400">Type</TableHead>
                        <TableHead className="text-slate-400">Severity</TableHead>
                        <TableHead className="text-slate-400">Status</TableHead>
                        <TableHead className="text-slate-400">FP Rate</TableHead>
                        <TableHead className="text-slate-400">Detections</TableHead>
                        <TableHead className="text-slate-400">Author</TableHead>
                        <TableHead className="text-slate-400">Updated</TableHead>
                        <TableHead className="text-slate-400 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detectionRules.map(rule => (
                        <TableRow key={rule.id} className="border-slate-800">
                          <TableCell>
                            <div className="font-medium">{rule.name}</div>
                            {rule.mitreTechniques && rule.mitreTechniques.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {rule.mitreTechniques.map(tech => (
                                  <Badge
                                    key={tech}
                                    variant="outline"
                                    className="text-xs border-purple-500/50 text-purple-400"
                                  >
                                    {tech}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-slate-700">
                              {rule.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <SeverityBadge severity={rule.severity} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={rule.status} />
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {(rule.falsePositiveRate * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {rule.detectionCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {rule.author}
                          </TableCell>
                          <TableCell className="text-slate-400 text-sm">
                            {formatDate(rule.lastModified)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <ActionButton
                                icon={rule.status === 'ACTIVE' ? Pause : Play}
                                label={rule.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleRuleStatus(rule.id)}
                              />
                              <ActionButton
                                icon={Eye}
                                label="View Rule"
                                variant="ghost"
                                size="icon"
                                onClick={() => toast.info(`Viewing rule: ${rule.name}`)}
                              />
                              <ActionButton
                                icon={Edit2}
                                label="Edit Rule"
                                variant="ghost"
                                size="icon"
                                onClick={() => toast.info(`Editing rule: ${rule.name}`)}
                              />
                              <ActionButton
                                icon={Trash2}
                                label="Delete Rule"
                                variant="destructive"
                                size="icon"
                                onClick={() => {
                                  if (confirm(`Delete rule "${rule.name}"?`)) {
                                    toast.success('Rule deleted')
                                    fetchDetectionRules()
                                  }
                                }}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* =============================================================== */}
          {/* AUDIT LOGS TAB                                                   */}
          {/* =============================================================== */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Audit Logs</h2>
                  <p className="text-slate-400 mt-1">
                    Complete audit trail of all administrative actions
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleExportData('audit')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Logs
                  </Button>
                </div>
              </div>

              {/* Severity Filters */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-slate-400"
                  onClick={() => toast.info('Showing all logs')}
                >
                  All ({auditLogs.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-400 border-red-500/30"
                  onClick={() => toast.info('Filtering critical logs')}
                >
                  Critical ({auditLogs.filter(l => l.severity === 'CRITICAL').length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-orange-400 border-orange-500/30"
                  onClick={() => toast.info('Filtering errors')}
                >
                  Errors ({auditLogs.filter(l => l.severity === 'ERROR').length})
                </Button>
              </div>

              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700 hover:bg-slate-800/50 sticky top-0 bg-slate-900 z-10">
                          <TableHead className="text-slate-400">Timestamp</TableHead>
                          <TableHead className="text-slate-400">Severity</TableHead>
                          <TableHead className="text-slate-400">User</TableHead>
                          <TableHead className="text-slate-400">Action</TableHead>
                          <TableHead className="text-slate-400">Entity</TableHead>
                          <TableHead className="text-slate-400">IP Address</TableHead>
                          <TableHead className="text-slate-400">Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map(log => (
                          <TableRow key={log.id} className="border-slate-800">
                            <TableCell className="text-slate-400 text-sm whitespace-nowrap">
                              {formatDate(log.createdAt)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  log.severity === 'CRITICAL' ? 'border-red-500 text-red-400' :
                                  log.severity === 'ERROR' ? 'border-orange-500 text-orange-400' :
                                  log.severity === 'WARNING' ? 'border-yellow-500 text-yellow-400' :
                                  'border-blue-500 text-blue-400'
                                }
                              >
                                {log.severity}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {log.user?.name || 'System'}
                            </TableCell>
                            <TableCell className="text-slate-300 font-mono text-sm">
                              {log.action}
                            </TableCell>
                            <TableCell className="text-slate-400">
                              {log.entityType}
                              {log.entityId && ` (${log.entityId.substring(0, 8)}...)`}
                            </TableCell>
                            <TableCell className="text-slate-400 font-mono text-sm">
                              {log.ipAddress || '-'}
                            </TableCell>
                            <TableCell className="text-slate-400 text-sm max-w-[200px] truncate">
                              {log.details || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}

          {/* =============================================================== */}
          {/* API KEYS TAB                                                     */}
          {/* =============================================================== */}
          {activeTab === 'api-keys' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">API Keys</h2>
                  <p className="text-slate-400 mt-1">
                    Manage programmatic access credentials
                  </p>
                </div>
                <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <KeyRound className="h-4 w-4 mr-2" />
                      Generate Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Generate API Key</DialogTitle>
                      <DialogDescription>
                        Create a new API key for programmatic access.
                      </DialogDescription>
                    </DialogHeader>
                    <CreateApiKeyForm onSubmit={async (data) => {
                      toast.success(`API key "${data.name}" generated`)
                      setApiKeyDialogOpen(false)
                      fetchApiKeys()
                    }} isLoading={isLoading} />
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {apiKeys.map(apiKey => (
                  <Card key={apiKey.id} className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-yellow-400" />
                            {apiKey.name}
                          </CardTitle>
                          <CardDescription className="mt-1 font-mono text-xs">
                            {apiKey.key}
                          </CardDescription>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            apiKey.isActive
                              ? 'border-green-500 text-green-400'
                              : 'border-slate-500 text-slate-500'
                          }
                        >
                          {apiKey.isActive ? 'Active' : 'Revoked'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-slate-400">Rate Limit</div>
                            <div>{apiKey.rateLimit} req/min</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Created By</div>
                            <div>{apiKey.createdBy}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Last Used</div>
                            <div>
                              {apiKey.lastUsedAt
                                ? formatDate(apiKey.lastUsedAt)
                                : 'Never'}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400">Expires</div>
                            <div>
                              {apiKey.expiresAt
                                ? formatDate(apiKey.expiresAt)
                                : 'Never'}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-slate-400 text-sm mb-2">Permissions</div>
                          <div className="flex flex-wrap gap-1">
                            {apiKey.permissions.map(perm => (
                              <Badge
                                key={perm}
                                variant="secondary"
                                className="text-xs bg-slate-700"
                              >
                                {perm}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-slate-800">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              navigator.clipboard.writeText(apiKey.key)
                              toast.success('API key copied to clipboard')
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          {apiKey.isActive ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-yellow-400 border-yellow-500/30"
                              onClick={() => handleRevokeApiKey(apiKey.id)}
                            >
                              Revoke
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-green-400 border-green-500/30"
                              onClick={() => {
                                setApiKeys(prev =>
                                  prev.map(k =>
                                    k.id === apiKey.id ? { ...k, isActive: true } : k
                                  )
                                )
                                toast.success('API key reactivated')
                              }}
                            >
                              Reactivate
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400"
                            onClick={() => {
                              if (confirm('Delete this API key permanently?')) {
                                setApiKeys(prev => prev.filter(k => k.id !== apiKey.id))
                                toast.success('API key deleted')
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* SYSTEM HEALTH TAB                                                */}
          {/* =============================================================== */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">System Health</h2>
                  <p className="text-slate-400 mt-1">
                    Monitor platform infrastructure and services
                  </p>
                </div>
                <Button variant="outline" onClick={fetchSystemHealth}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {systemHealth && (
                <>
                  {/* Overall Health */}
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-green-400" />
                        Platform Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="text-center">
                          <div className={`text-4xl font-bold ${
                            systemHealth.healthScore >= 90 ? 'text-green-400' :
                            systemHealth.healthScore >= 70 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {systemHealth.healthScore}%
                          </div>
                          <div className="text-sm text-slate-400 mt-1">Health Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-4xl font-bold text-blue-400">
                            {systemHealth.services.filter(s => s.status === 'running').length}/{systemHealth.services.length}
                          </div>
                          <div className="text-sm text-slate-400 mt-1">Services Running</div>
                        </div>
                        <div className="text-center">
                          <div className="text-4xl font-bold text-purple-400">
                            {systemHealth.database.connections}
                          </div>
                          <div className="text-sm text-slate-400 mt-1">DB Connections</div>
                        </div>
                        <div className="text-center">
                          <div className="text-4xl font-bold text-cyan-400">
                            {systemHealth.database.queryTime.toFixed(0)}ms
                          </div>
                          <div className="text-sm text-slate-400 mt-1">Avg Query Time</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Resource Usage */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-slate-900/50 border-slate-800">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Cpu className="h-5 w-5" />
                          CPU & Memory
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-slate-400">CPU Usage</span>
                            <span className="font-mono">{systemHealth.cpu.usage}%</span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${
                                systemHealth.cpu.usage > 80 ? 'bg-red-500' :
                                systemHealth.cpu.usage > 60 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${systemHealth.cpu.usage}%` }}
                            />
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {systemHealth.cpu.cores} cores available
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-slate-400">Memory Usage</span>
                            <span className="font-mono">{systemHealth.memory.percentage}%</span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${
                                systemHealth.memory.percentage > 80 ? 'bg-red-500' :
                                systemHealth.memory.percentage > 60 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${systemHealth.memory.percentage}%` }}
                            />
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {formatBytes(systemHealth.memory.used)} of {formatBytes(systemHealth.memory.total)}
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-slate-400">Disk Usage</span>
                            <span className="font-mono">{systemHealth.disk.percentage}%</span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${
                                systemHealth.disk.percentage > 80 ? 'bg-red-500' :
                                systemHealth.disk.percentage > 60 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${systemHealth.disk.percentage}%` }}
                            />
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {formatBytes(systemHealth.disk.used)} of {formatBytes(systemHealth.disk.total)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-slate-800">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Wifi className="h-5 w-5" />
                          Network
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="text-sm text-slate-400">Latency</div>
                            <div className="text-xl font-bold text-green-400">
                              {systemHealth.network.latency}ms
                            </div>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="text-sm text-slate-400">Inbound</div>
                            <div className="text-xl font-bold text-blue-400">
                              {formatBytes(systemHealth.network.bandwidth.in)}/s
                            </div>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="text-sm text-slate-400">Outbound</div>
                            <div className="text-xl font-bold text-purple-400">
                              {formatBytes(systemHealth.network.bandwidth.out)}/s
                            </div>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="text-sm text-slate-400">Status</div>
                            <div className="text-xl font-bold text-green-400">
                              Healthy
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Services Detail */}
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        Service Status Detail
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {systemHealth.services.map((service, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-3 h-3 rounded-full ${
                                service.status === 'running' ? 'bg-green-500' :
                                service.status === 'degraded' ? 'bg-yellow-500 animate-pulse' :
                                'bg-red-500 animate-pulse'
                              }`} />
                              <div>
                                <div className="font-medium">{service.name}</div>
                                <div className="text-sm text-slate-500">
                                  Version {service.version} · Uptime {(service.uptime / 3600000).toFixed(1)}h
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <Badge
                                variant="outline"
                                className={
                                  service.status === 'running' ? 'border-green-500 text-green-400' :
                                  service.status === 'degraded' ? 'border-yellow-500 text-yellow-400' :
                                  'border-red-500 text-red-400'
                                }
                              >
                                {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toast.info(`Restarting ${service.name}...`)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Placeholder tabs for remaining sections */}
          {['security', 'maintenance', 'config'].includes(activeTab) && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold capitalize">{activeTab.replace('-', ' ')}</h2>
                  <p className="text-slate-400 mt-1">
                    Configuration and management options
                  </p>
                </div>
              </div>
              
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="py-12 text-center">
                  <Settings className="h-12 w-12 mx-auto text-slate-600 mb-4" />
                  <h3 className="text-lg font-medium text-slate-300 mb-2">
                    Coming Soon
                  </h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    The {activeTab.replace('-', ' ')} section is under development.
                    Check back soon for updates.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// =============================================================================
// FORM SUB-COMPONENTS
// =============================================================================

function CreateUserForm({
  onSubmit,
  isLoading
}: {
  onSubmit: (data: Partial<User>) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    department: '',
    phone: '',
    roleId: '',
    tenantId: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name"
          placeholder="Enter full name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="bg-slate-800 border-slate-700"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          placeholder="user@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="bg-slate-800 border-slate-700"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            placeholder="Engineering"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            className="bg-slate-800 border-slate-700"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            placeholder="+1 234 567 8900"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="bg-slate-800 border-slate-700"
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => {}}
          className="bg-slate-800 border-slate-700"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create User'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function CreateRoleForm({
  onSubmit,
  isLoading
}: {
  onSubmit: (data: Partial<Role>) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  })

  const availablePermissions = [
    { id: 'users.read', name: 'Read Users', module: 'users', action: 'read' },
    { id: 'users.write', name: 'Manage Users', module: 'users', action: 'write' },
    { id: 'users.delete', name: 'Delete Users', module: 'users', action: 'delete' },
    { id: 'roles.read', name: 'Read Roles', module: 'roles', action: 'read' },
    { id: 'roles.write', name: 'Manage Roles', module: 'roles', action: 'write' },
    { id: 'incidents.read', name: 'Read Incidents', module: 'incidents', action: 'read' },
    { id: 'incidents.write', name: 'Manage Incidents', module: 'incidents', action: 'write' },
    { id: 'alerts.read', name: 'Read Alerts', module: 'alerts', action: 'read' },
    { id: 'alerts.write', name: 'Manage Alerts', module: 'alerts', action: 'write' },
    { id: 'system.admin', name: 'System Admin', module: 'system', action: 'admin' },
  ]

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="role-name">Role Name *</Label>
        <Input
          id="role-name"
          placeholder="e.g., Security Analyst"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="bg-slate-800 border-slate-700"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="role-description">Description</Label>
        <Textarea
          id="role-description"
          placeholder="Describe the role's purpose..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="bg-slate-800 border-slate-700"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Permissions</Label>
        <div className="max-h-[200px] overflow-y-auto space-y-2 p-2 bg-slate-800/50 rounded-md border border-slate-700">
          {availablePermissions.map(perm => (
            <label
              key={perm.id}
              className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={formData.permissions.includes(perm.id)}
                onChange={() => togglePermission(perm.id)}
                className="rounded border-slate-600 bg-slate-700 text-red-500 focus:ring-red-500"
              />
              <div>
                <div className="text-sm font-medium">{perm.name}</div>
                <div className="text-xs text-slate-500">{perm.module}.{perm.action}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          className="bg-slate-800 border-slate-700"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Role'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function CreateTenantForm({
  onSubmit,
  isLoading
}: {
  onSubmit: (data: Partial<Tenant>) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    plan: 'TRIAL' as Tenant['plan'],
    maxUsers: 10,
    maxEventsPerSecond: 1000,
    retentionDays: 30,
    features: [] as string[]
  })

  const availableFeatures = [
    'SIEM', 'XDR', 'NDR', 'UEBA', 'SOAR', 'TIP',
    'Threat Hunting', 'DFIR', 'Compliance', 'AI Copilot',
    'MSSP Mode', 'API Access', 'SSO', 'MFA'
  ]

  const toggleFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tenant-name">Organization Name *</Label>
          <Input
            id="tenant-name"
            placeholder="Acme Corp"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-slate-800 border-slate-700"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="tenant-slug">Slug *</Label>
          <Input
            id="tenant-slug"
            placeholder="acme-corp"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
            className="bg-slate-800 border-slate-700"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="plan">Subscription Plan</Label>
        <Select
          value={formData.plan}
          onValueChange={(value) => setFormData({ ...formData, plan: value as Tenant['plan'] })}
        >
          <SelectTrigger className="bg-slate-800 border-slate-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TRIAL">Trial (14 days)</SelectItem>
            <SelectItem value="STANDARD">Standard</SelectItem>
            <SelectItem value="PROFESSIONAL">Professional</SelectItem>
            <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="max-users">Max Users</Label>
          <Input
            id="max-users"
            type="number"
            value={formData.maxUsers}
            onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 0 })}
            className="bg-slate-800 border-slate-700"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="max-eps">Max EPS</Label>
          <Input
            id="max-eps"
            type="number"
            value={formData.maxEventsPerSecond}
            onChange={(e) => setFormData({ ...formData, maxEventsPerSecond: parseInt(e.target.value) || 0 })}
            className="bg-slate-800 border-slate-700"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="retention">Retention (days)</Label>
          <Input
            id="retention"
            type="number"
            value={formData.retentionDays}
            onChange={(e) => setFormData({ ...formData, retentionDays: parseInt(e.target.value) || 0 })}
            className="bg-slate-800 border-slate-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Enabled Features</Label>
        <div className="grid grid-cols-3 gap-2">
          {availableFeatures.map(feature => (
            <label
              key={feature}
              className="flex items-center gap-2 p-2 rounded bg-slate-800/50 cursor-pointer hover:bg-slate-700/50"
            >
              <input
                type="checkbox"
                checked={formData.features.includes(feature)}
                onChange={() => toggleFeature(feature)}
                className="rounded border-slate-600 bg-slate-700 text-red-500 focus:ring-red-500"
              />
              <span className="text-sm">{feature}</span>
            </label>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          className="bg-slate-800 border-slate-700"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Tenant'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function CreateApiKeyForm({
  onSubmit,
  isLoading
}: {
  onSubmit: (data: Partial<ApiKey>) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    name: '',
    permissions: [] as string[],
    rateLimit: 100,
    expiresAt: ''
  })

  const availablePermissions = [
    'read', 'write', 'admin', 'users:manage',
    'incidents:manage', 'alerts:manage', 'reports:generate'
  ]

  const togglePermission = (perm: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="key-name">Key Name *</Label>
        <Input
          id="key-name"
          placeholder="e.g., Production API Key"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="bg-slate-800 border-slate-700"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rate-limit">Rate Limit (req/min)</Label>
          <Input
            id="rate-limit"
            type="number"
            value={formData.rateLimit}
            onChange={(e) => setFormData({ ...formData, rateLimit: parseInt(e.target.value) || 0 })}
            className="bg-slate-800 border-slate-700"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="expires">Expiration (optional)</Label>
          <Input
            id="expires"
            type="date"
            value={formData.expiresAt}
            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
            className="bg-slate-800 border-slate-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Permissions</Label>
        <div className="grid grid-cols-2 gap-2">
          {availablePermissions.map(perm => (
            <label
              key={perm}
              className="flex items-center gap-2 p-2 rounded bg-slate-800/50 cursor-pointer hover:bg-slate-700/50"
            >
              <input
                type="checkbox"
                checked={formData.permissions.includes(perm)}
                onChange={() => togglePermission(perm)}
                className="rounded border-slate-600 bg-slate-700 text-red-500 focus:ring-red-500"
              />
              <span className="text-sm">{perm}</span>
            </label>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          className="bg-slate-800 border-slate-700"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Key'}
        </Button>
      </DialogFooter>
    </form>
  )
}
