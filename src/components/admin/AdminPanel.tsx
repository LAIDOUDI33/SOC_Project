'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Shield, Users, Settings, FileText, Activity, Key, Clock,
  Search, Plus, Edit2, Trash2, Eye, RefreshCw, Download,
  Filter, ChevronDown, ChevronRight, X, Check, AlertTriangle,
  Server, Database, Globe, Lock, Unlock, UserPlus, UserCheck,
  UserX, Calendar, BarChart3, Terminal, Save, Ban, CheckCircle,
  XCircle, Pause, Play, ArrowLeft, MoreVertical, Copy
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

// Types
interface User {
  id: string
  email: string
  name: string
  status: string
  department?: string
  phone?: string
  mfaEnabled: boolean
  role?: { id: string; name: string; description?: string }
  createdAt: string
  lastLoginAt?: string
  _count?: { sessions: number; auditLogs: number }
}

interface Role {
  id: string
  name: string
  description?: string
  permissions: string[]
  isSystemRole: boolean
  _count?: { users: number }
}

interface Session {
  id: string
  userId: string
  isActive: boolean
  ipAddress?: string
  userAgent?: string
  deviceInfo?: string
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
  severity?: string
  createdAt: string
  user?: { name: string; email: string }
}

interface SystemHealth {
  healthScore: number
  users: any
  sessions: any
  incidents: any
  alerts: any
  threats: any
  systemHealth: any
  database: any
}

interface ScheduledJob {
  id: string
  name: string
  action: string
  schedule: string
  enabled: boolean
  lastRun: string | null
  nextRun: string | null
  createdAt: string
  lastResult?: any
}

// Admin Panel Component
export function AdminPanel() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isLoading, setIsLoading] = useState(false)
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  
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
  
  // Fetch system health on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    fetchSystemHealth()
  }, [fetchSystemHealth])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Admin Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Shield className="h-8 w-8 text-red-500" />
            <div>
              <h1 className="text-xl font-bold">SOC Administration</h1>
              <p className="text-sm text-slate-400">Full Privileges Control Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-green-500 text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Admin Mode
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchSystemHealth}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-slate-800 min-h-[calc(100vh-73px)] bg-slate-900/30 p-4">
          <nav className="space-y-2">
            <AdminNavItem 
              icon={<Activity className="h-4 w-4" />} 
              label="Dashboard" 
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
            />
            <AdminNavItem 
              icon={<Users className="h-4 w-4" />} 
              label="User Management" 
              active={activeTab === 'users'}
              onClick={() => setActiveTab('users')}
            />
            <AdminNavItem 
              icon={<Shield className="h-4 w-4" />} 
              label="Roles & Permissions" 
              active={activeTab === 'roles'}
              onClick={() => setActiveTab('roles')}
            />
            <AdminNavItem 
              icon={<Clock className="h-4 w-4" />} 
              label="Sessions" 
              active={activeTab === 'sessions'}
              onClick={() => setActiveTab('sessions')}
            />
            <AdminNavItem 
              icon={<FileText className="h-4 w-4" />} 
              label="Audit Logs" 
              active={activeTab === 'audit'}
              onClick={() => setActiveTab('audit')}
            />
            <AdminNavItem 
              icon={<Lock className="h-4 w-4" />} 
              label="Security Settings" 
              active={activeTab === 'security'}
              onClick={() => setActiveTab('security')}
            />
            <AdminNavItem 
              icon={<Terminal className="h-4 w-4" />} 
              label="Maintenance & Jobs" 
              active={activeTab === 'maintenance'}
              onClick={() => setActiveTab('maintenance')}
            />
          </nav>

          {/* Quick Stats */}
          {systemHealth && (
            <div className="mt-8 pt-6 border-t border-slate-800">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <StatItem label="Health Score" value={`${systemHealth.healthScore}%`} color={systemHealth.healthScore > 80 ? 'text-green-400' : systemHealth.healthScore > 60 ? 'text-yellow-400' : 'text-red-400'} />
                <StatItem label="Active Users" value={systemHealth.users?.byStatus?.ACTIVE || 0} />
                <StatItem label="Active Sessions" value={systemHealth.sessions?.total || 0} />
                <StatItem label="Open Incidents" value={systemHealth.incidents?.open || 0} />
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-73px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Dashboard Tab */}
            <TabsContent value="dashboard">
              <AdminDashboard healthData={systemHealth} onRefresh={fetchSystemHealth} />
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <UserManagement />
            </TabsContent>

            {/* Roles Tab */}
            <TabsContent value="roles">
              <RoleManagement />
            </TabsContent>

            {/* Sessions Tab */}
            <TabsContent value="sessions">
              <SessionManagement />
            </TabsContent>

            {/* Audit Logs Tab */}
            <TabsContent value="audit">
              <AuditLogsViewer />
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <SecuritySettings />
            </TabsContent>

            {/* Maintenance Tab */}
            <TabsContent value="maintenance">
              <MaintenancePanel />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}

// Navigation Item Component
function AdminNavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active 
          ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

// Stat Item Component
function StatItem({ label, value, color = 'text-slate-200' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  )
}

// Dashboard Component
function AdminDashboard({ healthData, onRefresh }: { healthData: SystemHealth | null; onRefresh: () => void }) {
  if (!healthData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-400 bg-green-500/10 border-green-500/20'
    if (score >= 70) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    return 'text-red-400 bg-red-500/10 border-red-500/20'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Overview</h2>
          <p className="text-slate-400 mt-1">Real-time monitoring and statistics</p>
        </div>
        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh Data
        </Button>
      </div>

      {/* Health Score Card */}
      <Card className={`border ${getHealthColor(healthData.healthScore)}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-70">Overall System Health</p>
              <p className={`text-5xl font-bold mt-2`}>{healthData.healthScore}%</p>
            </div>
            <Activity className="h-16 w-16 opacity-20" />
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="opacity-70">Database</p>
              <p className="font-semibold">{healthData.systemHealth?.database?.status || 'Unknown'}</p>
            </div>
            <div>
              <p className="opacity-70">Stale Sessions</p>
              <p className="font-semibold">{healthData.systemHealth?.staleSessions || 0}</p>
            </div>
            <div>
              <p className="opacity-70">Locked Users</p>
              <p className="font-semibold">{healthData.systemHealth?.lockedUsers || 0}</p>
            </div>
            <div>
              <p className="opacity-70">Uptime</p>
              <p className="font-semibold">{Math.floor(healthData.systemHealth?.processInfo?.uptime / 3600)}h</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Users" value={healthData.users?.total || 0} icon={<Users className="h-5 w-5" />} color="blue" />
        <StatsCard title="Active Sessions" value={healthData.sessions?.total || 0} icon={<Clock className="h-5 w-5" />} color="green" />
        <StatsCard title="Open Incidents" value={healthData.incidents?.open || 0} icon={<AlertTriangle className="h-5 w-5" />} color="red" />
        <StatsCard title="Active Alerts" value={healthData.alerts?.open || 0} icon={<FileText className="h-5 w-5" />} color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {healthData.recentLogs?.slice(0, 10).map((log: AuditLog) => (
                  <div key={log.id} className="flex items-start gap-3 p-2 rounded hover:bg-slate-800/50">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-400 truncate">{log.details}</p>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow label="Node Version" value={healthData.systemHealth?.processInfo?.nodeVersion} />
            <InfoRow label="Platform" value={healthData.systemHealth?.processInfo?.platform} />
            <InfoRow label="Memory Usage" value={`${Math.round((healthData.systemHealth?.processInfo?.memory?.heapUsed || 0) / 1024 / 1024)} MB`} />
            
            <Separator className="bg-slate-700" />
            
            <h4 className="font-semibold text-sm">Database Records</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <InfoRow label="Users" value={healthData.database?.users || 0} />
              <InfoRow label="Sessions" value={healthData.database?.sessions || 0} />
              <InfoRow label="Audit Logs" value={healthData.database?.audits || 0} />
              <InfoRow label="Incidents" value={healthData.database?.incidents || 0} />
              <InfoRow label="Alerts" value={healthData.database?.alerts || 0} />
              <InfoRow label="SS7 Messages" value={healthData.database?.ss7 || 0} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Stats Card Component
function StatsCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: 'blue' | 'green' | 'red' | 'yellow' }) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400',
    green: 'from-green-500/20 to-green-600/10 border-green-500/20 text-green-400',
    red: 'from-red-500/20 to-red-600/10 border-red-500/20 text-red-400',
    yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/20 text-yellow-400',
  }

  return (
    <Card className={`bg-gradient-to-br ${colors[color]} border`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">{title}</p>
            <p className="text-3xl font-bold mt-1">{value.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-lg bg-black/20">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

// Info Row Component
function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

// User Management Component
function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 })

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '20',
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      })
      
      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.data.users)
        setPagination(data.data.pagination)
      }
    } catch (error) {
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, searchQuery, statusFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleCreateUser = async (formData: FormData) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData))
      })
      
      if (res.ok) {
        toast.success('User created successfully')
        setShowCreateDialog(false)
        fetchUsers()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create user')
      }
    } catch (error) {
      toast.error('Failed to create user')
    }
  }

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (res.ok) {
        toast.success(`User ${newStatus.toLowerCase()}`)
        fetchUsers()
      }
    } catch (error) {
      toast.error('Failed to update user status')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('User deleted')
        fetchUsers()
      }
    } catch (error) {
      toast.error('Failed to delete user')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'INACTIVE': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      case 'SUSPENDED': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'LOCKED': return 'bg-red-500/10 text-red-400 border-red-500/20'
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-slate-400 mt-1">Manage user accounts and permissions</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4 mr-2" /> Create User</Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>Add a new user to the platform</DialogDescription>
            </DialogHeader>
            <form action={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" required className="bg-slate-800 border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" name="email" type="email" required className="bg-slate-800 border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" name="department" className="bg-slate-800 border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" className="bg-slate-800 border-slate-600" />
              </div>
              <DialogFooter>
                <Button type="submit">Create User</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-600"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-slate-800 border-slate-600">
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
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>MFA</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-slate-700">
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-slate-400">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-600">
                        {user.role?.name || 'No Role'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(user.status)}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.mfaEnabled ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-slate-500" />
                      )}
                    </TableCell>
                    <TableCell>{user._count?.sessions || 0}</TableCell>
                    <TableCell className="text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(user)}
                        >
                          {user.status === 'ACTIVE' ? (
                            <Pause className="h-4 w-4 text-yellow-400" />
                          ) : (
                            <Play className="h-4 w-4 text-green-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
              <p className="text-sm text-slate-400">
                Showing {(pagination.page - 1) * 20 + 1}-{Math.min(pagination.page * 20, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Role Management Component
function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles')
      if (res.ok) {
        const data = await res.json()
        setRoles(data.data.roles)
      }
    } catch (error) {
      toast.error('Failed to fetch roles')
    } finally {
      setLoading(false)
    }
  }

  const permissionCategories = {
    'User Management': ['users:read', 'users:create', 'users:update', 'users:delete'],
    'Incident Management': ['incidents:read', 'incidents:create', 'incidents:update', 'incidents:delete'],
    'Alert Management': ['alerts:read', 'alerts:acknowledge', 'alerts:escalate'],
    'Threat Intelligence': ['threats:read', 'threats:create', 'threats:update', 'threats:delete'],
    'Threat Hunting': ['hunting:read', 'hunting:create', 'hunting:execute'],
    'Analytics & Reports': ['analytics:read', 'reports:read', 'reports:create'],
    'System Administration': ['system:admin', 'system:config', 'system:maintenance'],
    'Security': ['audit:read', 'sessions:terminate', 'apikeys:create'],
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Roles & Permissions</h2>
          <p className="text-slate-400 mt-1">Manage roles and their associated permissions</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button><Shield className="h-4 w-4 mr-2" /> Create Role</Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>Define a new role with specific permissions</DialogDescription>
            </DialogHeader>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role-name">Role Name</Label>
                <Input id="role-name" placeholder="e.g., Security Analyst" className="bg-slate-800 border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-desc">Description</Label>
                <Textarea id="role-desc" placeholder="Role description..." className="bg-slate-800 border-slate-600" />
              </div>
              
              <div className="space-y-3">
                <Label>Permissions</Label>
                <ScrollArea className="h-64 border border-slate-700 rounded-md p-4">
                  <div className="space-y-4">
                    {Object.entries(permissionCategories).map(([category, perms]) => (
                      <div key={category}>
                        <p className="text-sm font-semibold mb-2">{category}</p>
                        <div className="grid grid-cols-2 gap-2 ml-2">
                          {perms.map(perm => (
                            <label key={perm} className="flex items-center gap-2 text-sm">
                              <input type="checkbox" className="rounded bg-slate-800" />
                              <span className="text-slate-300">{perm}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              
              <DialogFooter>
                <Button type="button" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button type="submit">Create Role</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-800 animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-slate-700 rounded w-32 mb-4" />
                <div className="h-4 bg-slate-700 rounded w-full mb-2" />
                <div className="h-4 bg-slate-700 rounded w-2/3" />
              </CardContent>
            </Card>
          ))
        ) : (
          roles.map((role) => (
            <Card 
              key={role.id} 
              className={`bg-slate-900/50 border cursor-pointer transition-all ${
                selectedRole?.id === role.id ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-slate-800 hover:border-slate-700'
              }`}
              onClick={() => setSelectedRole(selectedRole?.id === role.id ? null : role)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-red-400" />
                    <CardTitle className="text-base">{role.name}</CardTitle>
                  </div>
                  {role.isSystemRole && (
                    <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">
                      System
                    </Badge>
                  )}
                </div>
                {role.description && (
                  <CardDescription className="text-sm">{role.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{role.permissions.length} permissions</span>
                  <span className="text-slate-400">{role._count?.users || 0} users</span>
                </div>
                
                {selectedRole?.id === role.id && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Permissions</p>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 8).map(perm => (
                        <Badge key={perm} variant="outline" className="text-xs border-slate-600">
                          {perm}
                        </Badge>
                      ))}
                      {role.permissions.length > 8 && (
                        <Badge variant="outline" className="text-xs border-slate-600">
                          +{role.permissions.length - 8} more
                        </Badge>
                      )}
                    </div>
                    
                    {!role.isSystemRole && (
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline"><Edit2 className="h-3 w-3 mr-1" /> Edit</Button>
                        <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10">
                          <Trash2 className="h-3 w-3 mr-1" /> Delete
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

// Session Management Component
function SessionManagement() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchSessions()
  }, [filter])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50', status: filter })
      const res = await fetch(`/api/admin/sessions?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data.data.sessions)
        setStats(data.data.statistics)
      }
    } catch (error) {
      toast.error('Failed to fetch sessions')
    } finally {
      setLoading(false)
    }
  }

  const terminateSession = async (sessionId: string) => {
    if (!confirm('Terminate this session?')) return
    
    try {
      const res = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force-logout', sessionId })
      })
      
      if (res.ok) {
        toast.success('Session terminated')
        fetchSessions()
      }
    } catch (error) {
      toast.error('Failed to terminate session')
    }
  }

  const terminateStaleSessions = async () => {
    if (!confirm('Terminate all stale sessions (inactive for 2+ hours)?')) return
    
    try {
      const res = await fetch('/api/admin/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terminateAllStale: true })
      })
      
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message)
        fetchSessions()
      }
    } catch (error) {
      toast.error('Failed to terminate stale sessions')
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Session Management</h2>
          <p className="text-slate-400 mt-1">Monitor and manage active user sessions</p>
        </div>
        <Button variant="destructive" onClick={terminateStaleSessions}>
          <Trash2 className="h-4 w-4 mr-2" /> Clean Stale Sessions
        </Button>
      </div>

      {/* Session Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniStatCard label="Active Now" value={stats.activeLast5min} color="green" />
          <MiniStatCard label="Last 30 min" value={stats.activeLast30min} color="blue" />
          <MiniStatCard label="Last Hour" value={stats.activeLast1hour} color="yellow" />
          <MiniStatCard label="Stale (>2h)" value={stats.staleSessions} color="red" />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'active', 'inactive'].map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      {/* Sessions List */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id} className="border-slate-700">
                    <TableCell>
                      <div>
                        <p className="font-medium">{session.user?.name || 'Unknown'}</p>
                        <p className="text-sm text-slate-400">{session.user?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={session.isActive ? 'default' : 'secondary'} className={session.isActive ? 'bg-green-500/10 text-green-400' : ''}>
                        {session.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{session.ipAddress || '-'}</TableCell>
                    <TableCell className="text-slate-400">{formatTimeAgo(session.lastActiveAt)}</TableCell>
                    <TableCell className="text-slate-400">{formatTimeAgo(session.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {session.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => terminateSession(session.id)}
                        >
                          <Ban className="h-4 w-4 text-red-400" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Mini Stat Card for Sessions
function MiniStatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
  }

  return (
    <Card className={`border ${colors[color]}`}>
      <CardContent className="p-4 text-center">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs opacity-70">{label}</p>
      </CardContent>
    </Card>
  )
}

// Audit Logs Viewer Component
function AuditLogsViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '100',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
      })
      
      const res = await fetch(`/api/admin/audit?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.data.logs)
      }
    } catch (error) {
      toast.error('Failed to fetch audit logs')
    } finally {
      setLoading(false)
    }
  }

  const exportLogs = async (format: 'json' | 'csv') => {
    try {
      const res = await fetch('/api/admin/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export', format, filters })
      })
      
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit-logs.${format}`
        a.click()
        toast.success(`Exported as ${format.toUpperCase()}`)
      }
    } catch (error) {
      toast.error('Failed to export logs')
    }
  }

  const getActionColor = (action: string) => {
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'text-blue-400'
    if (action.includes('CREATE') || action.includes('ADD')) return 'text-green-400'
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'text-red-400'
    if (action.includes('UPDATE') || action.includes('CHANGE')) return 'text-yellow-400'
    return 'text-slate-300'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit Logs</h2>
          <p className="text-slate-400 mt-1">View and export system audit trail</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportLogs('csv')}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => exportLogs('json')}>
            <Download className="h-4 w-4 mr-2" /> Export JSON
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                className="pl-10 bg-slate-800 border-slate-600"
              />
            </div>
            <Input
              placeholder="Action type..."
              value={filters.action}
              onChange={(e) => setFilters(f => ({ ...f, action: e.target.value }))}
              className="bg-slate-800 border-slate-600"
            />
            <Input
              placeholder="Entity type..."
              value={filters.entityType}
              onChange={(e) => setFilters(f => ({ ...f, entityType: e.target.value }))}
              className="bg-slate-800 border-slate-600"
            />
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
              className="bg-slate-800 border-slate-600"
            />
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
              className="bg-slate-800 border-slate-600"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={fetchLogs}><Filter className="h-4 w-4 mr-2" /> Apply Filters</Button>
            <Button 
              variant="outline" 
              onClick={() => setFilters({ search: '', action: '', entityType: '', startDate: '', endDate: '' })}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent sticky top-0 bg-slate-900">
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="border-slate-700">
                      <TableCell className="text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className={`font-mono text-sm ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{log.user?.name || 'System'}</span>
                        {log.user?.email && (
                          <p className="text-xs text-slate-400">{log.user.email}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs border-slate-600">
                          {log.entityType}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-slate-300">
                        {log.details || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-400">
                        {log.ipAddress || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Security Settings Component
function SecuritySettings() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [ipToBlock, setIpToBlock] = useState('')
  const [blockReason, setBlockReason] = useState('')

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/security')
      if (res.ok) {
        const data = await res.json()
        setConfig(data.data)
      }
    } catch (error) {
      toast.error('Failed to fetch security config')
    } finally {
      setLoading(false)
    }
  }

  const blockIP = async () => {
    if (!ipToBlock) return
    
    try {
      const res = await fetch('/api/admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'block-ip', ipAddress: ipToBlock, reason: blockReason })
      })
      
      if (res.ok) {
        toast.success(`IP ${ipToBlock} blocked`)
        setIpToBlock('')
        setBlockReason('')
        fetchConfig()
      }
    } catch (error) {
      toast.error('Failed to block IP')
    }
  }

  const createAPIKey = async () => {
    try {
      const res = await fetch('/api/admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-api-key', name: `Key-${Date.now()}` })
      })
      
      if (res.ok) {
        const data = await res.json()
        setNewApiKey(data.data.keyValue)
        toast.success('API key created')
        fetchConfig()
      }
    } catch (error) {
      toast.error('Failed to create API key')
    }
  }

  const revokeAPIKey = async (keyId: string) => {
    if (!confirm('Revoke this API key?')) return
    
    try {
      const res = await fetch('/api/admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke-api-key', keyId })
      })
      
      if (res.ok) {
        toast.success('API key revoked')
        fetchConfig()
      }
    } catch (error) {
      toast.error('Failed to revoke API key')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Security Settings</h2>
        <p className="text-slate-400 mt-1">Configure security policies and access controls</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* IP Management */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" /> IP Access Control
            </CardTitle>
            <CardDescription>Block or whitelist IP addresses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="IP address to block"
                value={ipToBlock}
                onChange={(e) => setIpToBlock(e.target.value)}
                className="bg-slate-800 border-slate-600 font-mono"
              />
              <Button onClick={blockIP} variant="destructive">
                <Ban className="h-4 w-4" />
              </Button>
            </div>
            <Input
              placeholder="Reason (optional)"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="bg-slate-800 border-slate-600"
            />

            <Separator className="bg-slate-700" />

            <div>
              <h4 className="text-sm font-semibold mb-2 text-red-400">Blocked IPs ({config?.ipManagement?.blocked?.length || 0})</h4>
              <ScrollArea className="h-40">
                <div className="space-y-2">
                  {config?.ipManagement?.blocked?.slice(0, 10).map((ip: any) => (
                    <div key={ip.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded text-sm">
                      <span className="font-mono">{ip.ipAddress}</span>
                      <span className="text-xs text-slate-400">{ip.reason}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" /> API Keys
                </CardTitle>
                <CardDescription>Manage programmatic access</CardDescription>
              </div>
              <Button onClick={createAPIKey} size="sm">
                <Plus className="h-4 w-4 mr-1" /> New Key
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {newApiKey && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-xs text-yellow-400 font-semibold mb-1">⚠️ Save this key now - it won't be shown again!</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-slate-800 p-2 rounded font-mono break-all">{newApiKey}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(newApiKey)
                      toast.success('Copied to clipboard')
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {config?.apiKeys?.map((key: any) => (
                <div key={key.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                  <div>
                    <p className="font-medium text-sm">{key.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{key.keyPrefix}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{key.permissions.join(', ')}</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => revokeAPIKey(key.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {(!config?.apiKeys || config.apiKeys.length === 0) && (
                <p className="text-sm text-slate-400 text-center py-4">No API keys created yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CORS Configuration */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" /> CORS Configuration
            </CardTitle>
            <CardDescription>Cross-Origin Resource Sharing settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Allowed Origins</Label>
              <div className="space-y-2">
                {config?.cors?.allowedOrigins?.map((origin: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-slate-800/50 rounded text-sm font-mono">
                    <span className="flex-1">{origin}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoRow label="Max Age" value={`${config?.cors?.maxAge}s`} />
              <InfoRow label="Credentials" value={config?.cors?.credentials ? 'Enabled' : 'Disabled'} />
            </div>
          </CardContent>
        </Card>

        {/* Rate Limiting */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" /> Rate Limiting
            </CardTitle>
            <CardDescription>API rate limit configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-slate-800/50 rounded">
              <p className="text-sm font-medium mb-2">Global Limits</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoRow label="Window" value={`${config?.rateLimits?.global?.windowMs / 1000}s`} />
                <InfoRow label="Max Requests" value={config?.rateLimits?.global?.maxRequests} />
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Endpoint Overrides</p>
              {Object.entries(config?.rateLimits?.endpoints || {}).map(([endpoint, limits]: [string, any]) => (
                <div key={endpoint} className="flex items-center justify-between p-2 bg-slate-800/50 rounded text-sm">
                  <code className="font-mono text-xs">{endpoint}</code>
                  <span className="text-slate-400">{limits.maxRequests}/{limits.windowMs / 1000}s</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security Features */}
        <Card className="bg-slate-900/50 border-slate-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> Security Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Password Policy</h4>
                <div className="space-y-1 text-sm">
                  <InfoRow label="Min Length" value={config?.features?.passwordPolicy?.minLength} />
                  <InfoRow label="Uppercase Required" value={config?.features?.passwordPolicy?.requireUppercase ? 'Yes' : 'No'} />
                  <InfoRow label="Special Chars" value={config?.features?.passwordPolicy?.requireSpecialChars ? 'Yes' : 'No'} />
                  <InfoRow label="Expiry (days)" value={config?.features?.passwordPolicy?.maxAgeDays} />
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Authentication</h4>
                <div className="space-y-1 text-sm">
                  <InfoRow label="MFA Required" value={config?.features?.mfaRequired ? 'Yes' : 'No'} />
                  <InfoRow label="Session Timeout" value={`${config?.features?.sessionTimeout / 3600}h`} />
                  <InfoRow label="Max Login Attempts" value={config?.features?.maxLoginAttempts} />
                  <InfoRow label="Lockout Duration" value={`${config?.features?.lockoutDuration / 60}m`} />
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Security Headers</h4>
                <div className="space-y-1 text-sm text-xs font-mono">
                  {Object.entries(config?.securityHeaders || {}).map(([header, value]: [string, any]) => (
                    <div key={header} className="flex justify-between">
                      <span className="text-slate-400">{header}</span>
                      <span className="truncate ml-2 max-w-24">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Maintenance Panel Component
function MaintenancePanel() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([])
  const [loading, setLoading] = useState(true)
  const [taskResult, setTaskResult] = useState<any>(null)
  const [executingTask, setExecutingTask] = useState<string | null>(null)

  useEffect(() => {
    fetchMaintenanceData()
  }, [])

  const fetchMaintenanceData = async () => {
    try {
      const res = await fetch('/api/admin/maintenance')
      if (res.ok) {
        const data = await res.json()
        setJobs(data.data.jobs)
      }
    } catch (error) {
      toast.error('Failed to fetch maintenance data')
    } finally {
      setLoading(false)
    }
  }

  const executeTask = async (task: string) => {
    setExecutingTask(task)
    setTaskResult(null)
    
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute-task', task })
      })
      
      if (res.ok) {
        const data = await res.json()
        setTaskResult(data.data)
        toast.success(`Task ${task} completed`)
        fetchMaintenanceData()
      }
    } catch (error) {
      toast.error('Failed to execute task')
    } finally {
      setExecutingTask(null)
    }
  }

  const toggleJob = async (jobId: string) => {
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-job', jobId })
      })
      
      if (res.ok) {
        const data = await res.json()
        setJobs(jobs => jobs.map(j => j.id === jobId ? data.data : j))
      }
    } catch (error) {
      toast.error('Failed to toggle job')
    }
  }

  const taskIcons: Record<string, React.ReactNode> = {
    'cleanup-sessions': <Clock className="h-5 w-5" />,
    'clear-cache': <RefreshCw className="h-5 w-5" />,
    'backup': <Database className="h-5 w-5" />,
    'health-check': <Activity className="h-5 w-5" />,
    'cleanup-audit-logs': <Trash2 className="h-5 w-5" />,
    'generate-report': <BarChart3 className="h-5 w-5" />,
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Maintenance & Scheduled Jobs</h2>
        <p className="text-slate-400 mt-1">Run maintenance tasks and manage cron jobs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" /> Quick Actions
            </CardTitle>
            <CardDescription>Execute maintenance tasks immediately</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { id: 'cleanup-sessions', label: 'Cleanup Stale Sessions', desc: 'Remove inactive sessions' },
              { id: 'clear-cache', label: 'Clear Cache', desc: 'Clear all system caches' },
              { id: 'backup', label: 'Database Backup', desc: 'Create backup now' },
              { id: 'health-check', label: 'Health Check', desc: 'Run diagnostics' },
              { id: 'cleanup-audit-logs', label: 'Clean Old Logs', desc: 'Remove 90+ day logs' },
              { id: 'generate-report', label: 'Generate Report', desc: 'Create security report' },
            ].map(task => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-700 rounded">
                    {taskIcons[task.id]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{task.label}</p>
                    <p className="text-xs text-slate-400">{task.desc}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => executeTask(task.id)}
                  disabled={executingTask === task.id}
                >
                  {executingTask === task.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    'Run'
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Task Result */}
        {taskResult && (
          <Card className="bg-slate-900/50 border-green-500/20">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" /> Task Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-slate-800 p-4 rounded overflow-auto max-h-64">
                {JSON.stringify(taskResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Scheduled Jobs */}
        <Card className="bg-slate-900/50 border-slate-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Scheduled Jobs
            </CardTitle>
            <CardDescription>Automated maintenance tasks with cron scheduling</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead>Job Name</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id} className="border-slate-700">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {taskIcons[job.action]}
                          <span className="font-medium">{job.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-slate-800 px-2 py-1 rounded">{job.schedule}</code>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Never'}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {job.nextRun ? new Date(job.nextRun).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={job.enabled}
                          onCheckedChange={() => toggleJob(job.id)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => executeTask(job.action)}
                          disabled={executingTask === job.action}
                        >
                          {executingTask === job.action ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminPanel
