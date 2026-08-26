/**
 * 🇩🇿 National SOC - TheHive Case Management Dashboard
 * Incident response and case management UI component
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FolderOpen,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Play,
  Pause,
  Flag,
  Users,
  TrendingUp,
  Target,
  Zap,
  Shield,
  FileText,
  Link2,
} from 'lucide-react';

// Types
interface TheHiveDashboardProps {
  className?: string;
}

// Mock data for development
const mockData = {
  summary: {
    openCases: 23,
    inProgressCases: 15,
    resolvedToday: 8,
    criticalOpen: 3,
    totalActive: 38,
  },
  urgentCases: [
    { id: 'case-001', title: 'Ransomware Detection - Finance Dept', severity: 1, status: 'Open', createdAt: '2026-07-25T09:30:00Z', tags: ['ransomware', 'critical', 'finance'], assignee: 'Ahmed B.' },
    { id: 'case-002', title: 'Data Exfiltration Attempt - External IP', severity: 1, status: 'InProgress', createdAt: '2026-07-25T08:15:00Z', tags: ['exfiltration', 'network', 'apt'], assignee: 'Fatima Z.' },
    { id: 'case-003', title: 'Phishing Campaign - Multiple Users', severity: 1, status: 'Open', createdAt: '2026-07-25T07:45:00Z', tags: ['phishing', 'email', 'user'], assignee: null },
  ],
  recentCases: [
    { id: 'case-010', title: 'Malware Analysis - Suspicious PDF', severity: 2, status: 'Open', createdAt: '2026-07-24T16:20:00Z', tags: ['malware', 'pdf'] },
    { id: 'case-011', title: 'Unauthorized Access - Admin Account', severity: 2, status: 'InProgress', createdAt: '2026-07-24T14:55:00Z', tags: ['access', 'privilege'] },
    { id: 'case-012', title: 'SQL Injection - Web Application', severity: 3, status: 'Resolved', createdAt: '2026-07-24T11:30:00Z', tags: ['webapp', 'injection'] },
    { id: 'case-013', title: 'Policy Violation - USB Device', severity: 4, status: 'Resolved', createdAt: '2026-07-24T09:15:00Z', tags: ['dlp', 'policy'] },
    { id: 'case-014', title: 'Brute Force Attack - SSH Server', severity: 2, status: 'Open', createdAt: '2026-07-24T22:40:00Z', tags: ['ssh', 'bruteforce'] },
  ],
  tasks: [
    { id: 'task-001', title: 'Initial Triage & Assessment', status: 'Completed', assignee: 'Ahmed B.', caseId: 'case-001' },
    { id: 'task-002', title: 'Collect IOCs', status: 'InProgress', assignee: 'Karim M.', caseId: 'case-001' },
    { id: 'task-003', title: 'Threat Intel Enrichment', status: 'Waiting', assignee: null, caseId: 'case-001' },
    { id: 'task-004', title: 'Containment Actions', status: 'Waiting', assignee: null, caseId: 'case-001' },
  ],
  observables: [
    { id: 'obs-001', dataType: 'ip', data: '185.220.101.[REDACTED]', ioc: true, sighted: true, tags: ['c2', 'malicious'] },
    { id: 'obs-002', dataType: 'domain', data: 'evil-example[.]com', ioc: true, sighted: false, tags: ['phishing', 'c2'] },
    { id: 'obs-003', dataType: 'hash', data: 'a1b2c3d4e5f6...', ioc: true, sighted: false, tags: ['ransomware'] },
    { id: 'obs-004', dataType: 'mail', data: 'ceo-fraud@[REDACTED].com', ioc: true, sighted: true, tags: ['bec', 'phishing'] },
  ],
  metrics: {
    severityDistribution: { critical: 3, high: 12, medium: 18, low: 7 },
    avgResolutionTime: 18.5, // hours
    casesByDay: [
      { date: '2026-07-19', count: 5 },
      { date: '2026-07-20', count: 8 },
      { date: '2026-07-21', count: 12 },
      { date: '2026-07-22', count: 9 },
      { date: '2026-07-23', count: 15 },
      { date: '2026-07-24', count: 11 },
      { date: '2026-07-25', count: 7 },
    ],
  },
};

// ────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ────────────────────────────────────────────────────────

function SeverityBadge({ level }: { level: number }) {
  const config = {
    1: { label: 'Critical', variant: 'destructive' as const, icon: AlertTriangle },
    2: { label: 'High', variant: 'default' as const, className: 'bg-red-500 text-white' },
    3: { label: 'Medium', variant: 'secondary' as const, className: 'bg-yellow-500 text-white' },
    4: { label: 'Low', variant: 'outline' as const },
  };
  
  const { label, ...props } = config[level] || config[4];
  return <Badge {...props}>{label}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    Open: { icon: FolderOpen, color: 'text-blue-600 bg-blue-100' },
    InProgress: { icon: Play, color: 'text-orange-600 bg-orange-100' },
    Resolved: { icon: CheckCircle, color: 'text-green-600 bg-green-100' },
    Deleted: { icon: Pause, color: 'text-gray-600 bg-gray-100' },
  };
  
  const { icon: Icon, color } = config[status as keyof typeof config] || config.Open;
  return (
    <Badge variant="outline" className={`${color} gap-1`}>
      <Icon className="w-3 h-3" />
      {status}
    </Badge>
  );
}

function TaskStatusBadge({ status }: { status: string }) {
  const colors = {
    Waiting: 'bg-gray-100 text-gray-700',
    InProgress: 'bg-blue-100 text-blue-700',
    Completed: 'bg-green-100 text-green-700',
    Cancel: 'bg-red-100 text-red-700',
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || colors.Waiting}`}>
      {status}
    </span>
  );
}

function DataTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'ip': return <span className="text-blue-500">🌐</span>;
    case 'domain': return <span className="text-purple-500">🔗</span>;
    case 'hash': return <span className="text-green-500">🔐</span>;
    case 'url': return <span className="text-orange-500">🔗</span>;
    case 'mail': return <span className="text-red-500">✉️</span>;
    default: return <span>📄</span>;
  }
}

// ────────────────────────────────────────────────────────
// CREATE CASE DIALOG
// ────────────────────────────────────────────────────────

function CreateCaseDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('2');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('Creating case:', { title, description, severity });
    setLoading(false);
    setOpen(false);
    setTitle('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1">
          <Plus className="w-4 h-4" />
          New Case
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Case</DialogTitle>
          <DialogDescription>
            Create a new incident response case. Tasks and observables can be added after creation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="title"
              placeholder="Enter case title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Critical (1)</SelectItem>
                  <SelectItem value="2">High (2)</SelectItem>
                  <SelectItem value="3">Medium (3)</SelectItem>
                  <SelectItem value="4">Low (4)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">TLP Level</label>
              <Select defaultValue="2">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">White (Public)</SelectItem>
                  <SelectItem value="1">Green (Community)</SelectItem>
                  <SelectItem value="2">Amber (Internal)</SelectItem>
                  <SelectItem value="3">Red (Need-to-know)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description (Markdown supported)
            </label>
            <textarea
              id="description"
              placeholder="Describe the incident..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-input rounded-md text-sm resize-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input type="checkbox" id="playbook" defaultChecked />
            <label htmlFor="playbook" className="text-sm">
              Create investigation playbook tasks automatically
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!title.trim() || loading}
          >
            {loading ? 'Creating...' : 'Create Case'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────

export function TheHiveDashboard({ className }: TheHiveDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className={className} space-y-6}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-orange-600" />
            Case Management (TheHive)
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            SOAR Platform • Incident Response & Case Management
          </p>
        </div>
        <CreateCaseDialog />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Open Cases</p>
                <p className="text-3xl font-bold text-blue-600">{mockData.summary.openCases}</p>
                <p className="text-xs text-muted-foreground">{mockData.summary.totalActive} total active</p>
              </div>
              <FolderOpen className="w-10 h-10 text-blue-100 bg-blue-500 rounded-full p-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold text-orange-600">{mockData.summary.inProgressCases}</p>
                <p className="text-xs text-muted-foreground">Being investigated</p>
              </div>
              <Play className="w-10 h-10 text-orange-100 bg-orange-500 rounded-full p-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resolved Today</p>
                <p className="text-3xl font-bold text-green-600">{mockData.summary.resolvedToday}</p>
                <p className="text-xs text-muted-foreground">Avg: {mockData.metrics.avgResolutionTime}h resolution</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-100 bg-green-500 rounded-full p-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Critical Open</p>
                <p className="text-3xl font-bold text-red-600">{mockData.summary.criticalOpen}</p>
                <p className="text-xs text-red-500">Needs immediate attention</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-100 bg-red-500 rounded-full p-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cases">All Cases</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="observables">IOCs</TabsTrigger>
          <TabsTrigger value="metrics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Urgent Cases */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Urgent Cases (Critical/High)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {mockData.urgentCases.map((case_) => (
                      <div key={case_.id} className="p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{case_.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <SeverityBadge level={case_.severity} />
                              <StatusBadge status={case_.status} />
                            </div>
                            <div className="flex gap-1 mt-2">
                              {case_.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {new Date(case_.createdAt).toLocaleDateString()}
                            </p>
                            {case_.assignee && (
                              <p className="text-xs mt-1">→ {case_.assignee}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockData.recentCases.map((case_) => (
                        <TableRow key={case_.id}>
                          <TableCell className="max-w-[200px]">
                            <span className="truncate block text-sm">{case_.title}</span>
                          </TableCell>
                          <TableCell>
                            <SeverityBadge level={case_.severity} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={case_.status} />
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {new Date(case_.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* All Cases Tab */}
        <TabsContent value="cases">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Cases</CardTitle>
                  <CardDescription>Browse and search all incident cases</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search cases..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-[250px]"
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...mockData.urgentCases, ...mockData.recentCases].map((case_) => (
                      <TableRow key={case_.id}>
                        <TableCell className="font-mono text-xs">{case_.id}</TableCell>
                        <TableCell className="max-w-[250px]">
                          <div className="truncate font-medium">{case_.title}</div>
                          <div className="flex gap-1 mt-1">
                            {case_.tags?.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell><SeverityBadge level={case_.severity} /></TableCell>
                        <TableCell><StatusBadge status={case_.status} /></TableCell>
                        <TableCell>{case_.assignee || '-'}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(case_.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Investigation Tasks</CardTitle>
              <CardDescription>Task management for active investigations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span>Total Tasks: {mockData.tasks.length}</span>
                  <span>•</span>
                  <span>Completed: {mockData.tasks.filter(t => t.status === 'Completed').length}</span>
                  <span>•</span>
                  <span>In Progress: {mockData.tasks.filter(t => t.status === 'InProgress').length}</span>
                  <span>•</span>
                  <span>Waiting: {mockData.tasks.filter(t => t.status === 'Waiting').length}</span>
                </div>

                <div className="border rounded-lg divide-y">
                  {mockData.tasks.map((task) => (
                    <div key={task.id} className="p-4 flex items-center justify-between hover:bg-accent/50">
                      <div className="flex items-center gap-3">
                        <TaskStatusBadge status={task.status} />
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Case: {task.caseId} • {task.assignee || 'Unassigned'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.status === 'Waiting' && (
                          <Button size="sm" variant="outline">Start</Button>
                        )}
                        {task.status === 'InProgress' && (
                          <Button size="sm" variant="outline">Complete</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Observables Tab */}
        <TabsContent value="observables">
          <Card>
            <CardHeader>
              <CardTitle>Indicators of Compromise (IOCs)</CardTitle>
              <CardDescription>Extracted observables across all cases</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>IOC</TableHead>
                      <TableHead>Sighted</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockData.observables.map((obs) => (
                      <TableRow key={obs.id}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DataTypeIcon type={obs.dataType} />
                            <span className="text-xs uppercase">{obs.dataType}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm max-w-[200px] truncate">
                          {obs.data}
                        </TableCell>
                        <TableCell>
                          {obs.ioc ? (
                            <Badge variant="destructive" className="gap-1">
                              <Shield className="w-3 h-3" /> IOC
                            </Badge>
                          ) : (
                            <Badge variant="secondary">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {obs.sighted ? (
                            <Badge className="bg-green-100 text-green-700 gap-1">
                              <CheckCircle className="w-3 h-3" /> Yes
                            </Badge>
                          ) : (
                            <Badge variant="outline">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {obs.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">
                              <Link2 className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <FileText className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="metrics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Severity Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Severity Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(mockData.metrics.severityDistribution).map(([level, count]) => (
                    <div key={level} className="flex items-center gap-3">
                      <span className="w-16 text-sm capitalize">{level}</span>
                      <div className="flex-1">
                        <Progress 
                          value={(count / Object.values(mockData.metrics.severityDistribution).reduce((a, b) => a + b)) * 100} 
                          className="h-3"
                        />
                      </div>
                      <span className="w-8 text-sm text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cases Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cases Created (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mockData.metrics.casesByDay.map((day) => (
                    <div key={day.date} className="flex items-center gap-3">
                      <span className="w-24 text-xs text-muted-foreground">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded transition-all"
                          style={{ width: `${(day.count / Math.max(...mockData.metrics.casesByDay.map(d => d.count))) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 text-sm text-right">{day.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TheHiveDashboard;
