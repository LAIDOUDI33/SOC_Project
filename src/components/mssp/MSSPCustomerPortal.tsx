'use client';

// ============================================================
// National SOC Platform - MSSP Customer Portal Dashboard
// Multi-tenant customer self-service portal
// ============================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  FileText,
  Ticket,
  Users,
  Settings,
  Bell,
  Download,
  ExternalLink,
  Plus,
  Search,
  RefreshCw,
  BarChart3,
  PieChart,
  Target,
  Zap,
} from 'lucide-react';

// Types
interface DashboardData {
  total_alerts: number;
  critical_alerts: number;
  resolved_today: number;
  mttr_hours: number;
  active_incidents: number;
  open_critical: number;
  avg_resolution_time: number;
  compliance_score: number;
  open_findings: number;
  remediated_this_month: number;
  sla_compliance_rate: number;
  sla_breaches_this_month: number;
  alerts_trend_24h: Array<{ hour: string; count: number }>;
  incidents_by_severity: Record<string, number>;
  recent_alerts: any[];
  recent_incidents: any[];
  open_tickets: any[];
}

interface PortalInfo {
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan_type: string;
    logo_url?: string;
    primary_color?: string;
    support_email?: string;
    support_phone?: string;
  };
  stats: {
    users: number;
    alerts: number;
    incidents: number;
  };
  features: string[];
}

export default function MSSPCustomerPortal() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [portalInfo, setPortalInfo] = useState<PortalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showTicketDialog, setShowTicketDialog] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchPortalData();
  }, []);

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      
      const [dashboardRes, portalRes] = await Promise.all([
        fetch('/api/mssp?action=dashboard'),
        fetch('/api/mssp'),
      ]);
      
      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setDashboardData(data);
      }
      
      if (portalRes.ok) {
        const info = await portalRes.json();
        setPortalInfo(info);
      }
    } catch (error) {
      console.error('Failed to fetch MSSP portal data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      CRITICAL: 'bg-red-100 text-red-800 border-red-200',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      LOW: 'bg-green-100 text-green-800 border-green-200',
      INFO: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return colors[severity] || colors.INFO;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      NEW: { color: 'bg-blue-100 text-blue-800', icon: <Bell className="h-3 w-3" /> },
      ACKNOWLEDGED: { color: 'bg-yellow-100 text-yellow-800', icon: <Eye className="h-3 w-3" /> },
      IN_PROGRESS: { color: 'bg-purple-100 text-purple-800', icon: <RefreshCw className="h-3 w-3" /> },
      RESOLVED: { color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3 w-3" /> },
      ESCALATED: { color: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-3 w-3" /> },
    };
    
    const config = statusConfig[status] || statusConfig.NEW;
    return (
      <Badge variant="outline" className={config.color}>
        {config.icon}
        <span className="ml-1">{status.replace('_', ' ')}</span>
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with tenant branding */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {portalInfo?.tenant?.logo_url ? (
            <img
              src={portalInfo.tenant.logo_url}
              alt={portalInfo.tenant.name}
              className="h-12 w-auto rounded"
            />
          ) : (
            <Shield
              className="h-10 w-10"
              style={{ color: portalInfo?.tenant?.primary_color || undefined }}
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{portalInfo?.tenant?.name || 'Security Portal'}</h1>
            <p className="text-sm text-muted-foreground capitalize">
              {portalInfo?.tenant?.plan_type || 'Professional'} Plan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchPortalData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          
          <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Ticket className="mr-2 h-4 w-4" />
                Open Ticket
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Support Ticket</DialogTitle>
                <DialogDescription>
                  Describe your issue and our team will respond promptly.
                </DialogDescription>
              </DialogHeader>
              <CreateTicketForm onSubmit={() => setShowTicketDialog(false)} />
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Active Alerts"
              value={dashboardData?.total_alerts || 0}
              icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
              trend={dashboardData?.critical_alerts > 0 ? 'up' : 'stable'}
              subtitle={`${dashboardData?.critical_alerts || 0} critical`}
            />
            
            <KPICard
              title="Open Incidents"
              value={dashboardData?.active_incidents || 0}
              icon={<Shield className="h-5 w-5 text-red-500" />}
              trend={dashboardData?.open_critical > 0 ? 'up' : 'down'}
              subtitle={`${dashboardData?.open_critical || 0} critical`}
            />

            <KPICard
              title="Compliance Score"
              value={`${dashboardData?.compliance_score || 0}%`}
              icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
              trend={dashboardData?.compliance_score >= 80 ? 'good' : 'warning'}
              subtitle={`${dashboardData?.open_findings || 0} findings`}
            />

            <KPICard
              title="SLA Compliance"
              value={`${dashboardData?.sla_compliance_rate || 0}%`}
              icon={<Target className="h-5 w-5 text-blue-500" />}
              trend={dashboardData?.sla_compliance_rate >= 95 ? 'good' : 'warning'}
              subtitle={`${dashboardData?.sla_breaches_this_month || 0} breaches`}
            />
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Alerts Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Alerts Trend (24h)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-end gap-1">
                  {(dashboardData?.alerts_trend_24h || []).map((point, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary/20 rounded-t"
                        style={{
                          height: `${Math.min(100, (point.count / Math.max(...(dashboardData?.alerts_trend_24h?.map(p => p.count) || [1]))) * 100)}%`,
                        }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {point.hour.split(':')[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Incidents by Severity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Incidents by Severity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(dashboardData?.incidents_by_severity || {}).map(([severity, count]) => (
                    <div key={severity} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          severity === 'CRITICAL' ? 'bg-red-500' :
                          severity === 'HIGH' ? 'bg-orange-500' :
                          severity === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                        }`} />
                        <span className="capitalize text-sm">{severity.toLowerCase()}</span>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                  
                  {Object.keys(dashboardData?.incidents_by_severity || {}).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No active incidents
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Alerts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent Alerts</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('alerts')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(dashboardData?.recent_alerts || []).slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(alert.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Open Tickets */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Open Tickets</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('support')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(dashboardData?.open_tickets || []).slice(0, 5).map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          #{ticket.id.slice(0, 8)} • Created {new Date(ticket.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          ticket.priority === 'critical' ? 'border-red-200 text-red-700' :
                          ticket.priority === 'high' ? 'border-orange-200 text-orange-700' :
                          'border-gray-200'
                        }
                      >
                        {ticket.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Security Alerts</CardTitle>
                <div className="flex items-center gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="search"
                      placeholder="Search alerts..."
                      className="pl-9 pr-4 py-2 border rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(dashboardData?.recent_alerts || []).map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {alert.title}
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(alert.status)}</TableCell>
                      <TableCell>{alert.source}</TableCell>
                      <TableCell>
                        {new Date(alert.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents">
          <Card>
            <CardHeader>
              <CardTitle>Security Incidents</CardTitle>
              <CardDescription>
                Track and monitor security incidents affecting your organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updates</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(dashboardData?.recent_incidents || []).map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell className="font-medium">{incident.title}</TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(incident.severity)}>
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(incident.status)}</TableCell>
                      <TableCell>
                        {new Date(incident.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{incident._count?.updates || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: 'Executive Summary', description: 'High-level security overview for leadership', icon: BarChart3, format: 'PDF' },
              { name: 'Incident Report', description: 'Detailed incident analysis and trends', icon: FileText, format: 'PDF' },
              { name: 'Compliance Report', description: 'ARTP/ANSSI compliance status', icon: Shield, format: 'PDF' },
              { name: 'Alert Summary', description: 'Alert volume and classification breakdown', icon: Activity, format: 'CSV' },
              { name: 'MTTR Analysis', description: 'Mean time to resolution metrics', icon: Clock, format: 'PDF' },
              { name: 'Threat Intelligence', description: 'IOC and threat actor analysis', icon: Zap, format: 'PDF' },
            ].map((report) => (
              <Card key={report.name} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <report.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{report.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {report.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Format: {report.format}</span>
                    <Button size="sm" variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Request
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Support</CardTitle>
                <CardDescription>
                  Need help? Our security analysts are available 24/7.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Email Support</p>
                    <p className="text-sm text-muted-foreground">
                      {portalInfo?.tenant?.support_email || 'soc-support@djezzy.dz'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Phone Support</p>
                    <p className="text-sm text-muted-foreground">
                      {portalInfo?.tenant?.support_phone || '+213 XX XXX XXX'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Response Time</p>
                    <p className="text-sm text-muted-foreground">
                      P1: &lt;15min • P2: &lt;1hr • P3: &lt;4hrs
                    </p>
                  </div>
                </div>

                <Button className="w-full" onClick={() => setShowTicketDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Ticket
                </Button>
              </CardContent>
            </Card>

            {/* Recent Tickets */}
            <Card>
              <CardHeader>
                <CardTitle>Your Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(dashboardData?.open_tickets || []).map((ticket) => (
                    <div key={ticket.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-sm">{ticket.subject}</span>
                        <Badge
                          variant="outline"
                          className={
                            ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                            ticket.status === 'in_progress' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }
                        >
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        #{ticket.id.slice(0, 8)} • Updated {new Date(ticket.updated_at).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {ticket.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {ticket.category || 'general'}
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {(dashboardData?.open_tickets || []).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Ticket className="mx-auto h-12 w-12 mb-3 opacity-50" />
                      <p>No open tickets</p>
                      <Button variant="outline" className="mt-3" onClick={() => setShowTicketDialog(true)}>
                        Create your first ticket
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Sub-components
function KPICard({
  title,
  value,
  icon,
  trend,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'stable' | 'good' | 'warning';
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {trend === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
          {trend === 'down' && <TrendingDown className="h-4 w-4 text-green-500" />}
          {trend === 'good' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          {trend === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function CreateTicketForm({ onSubmit }: { onSubmit: () => void }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('general');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/mssp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-ticket',
          subject,
          description,
          priority,
          category,
        }),
      });

      if (response.ok) {
        onSubmit();
      }
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div>
        <label className="text-sm font-medium">Subject *</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 w-full px-3 py-2 border rounded-md"
          placeholder="Brief description of your issue"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Description *</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full px-3 py-2 border rounded-md"
          rows={4}
          placeholder="Detailed description of the issue or question"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Priority</label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="billing">Billing</SelectItem>
              <SelectItem value="feature_request">Feature Request</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => onSubmit()}>
          Cancel
        </Button>
        <Button type="submit">Submit Ticket</Button>
      </div>
    </form>
  );
}
