/**
 * National SOC Platform - Incident Response Center Component
 * 
 * Comprehensive DFIR incident response interface:
 * - Active incidents kanban board
 * - Incident detail sidebar
 * - Playbook runner visualization
 * - Task checklist with assignments
 * - Evidence viewer/manager
 * - Timeline visualization
 * - Team workload distribution
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, Shield, Clock, CheckCircle, XCircle, Play,
  Users, FileText, GitBranch, Activity, Search, Plus,
  ArrowRight, Calendar, User, Lock, Download, Eye,
  Bug, Virus, Network, Phone, Server
} from 'lucide-react';

// Types
interface Incident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'new' | 'investigating' | 'contained' | 'eradicated' | 'recovered';
  category: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  playbook?: string;
  progress: number;
  tasksCompleted: number;
  tasksTotal: number;
  evidenceCount: number;
}

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignee?: string;
  phase: string;
}

interface EvidenceItem {
  id: string;
  name: string;
  type: string;
  status: 'valid' | 'corrupted' | 'pending';
  size: string;
  collectedAt: string;
}

// Mock data
const mockIncidents: Incident[] = [
  {
    id: 'INC-001',
    title: 'Ransomware Detection - Finance Department',
    severity: 'critical',
    status: 'contained',
    category: 'ransomware',
    assignedTo: 'Ahmed Benali',
    createdAt: '2024-01-15T08:30:00Z',
    updatedAt: '2024-01-15T14:20:00Z',
    playbook: 'PB-RANSOMWARE-001',
    progress: 45,
    tasksCompleted: 9,
    tasksTotal: 20,
    evidenceCount: 15,
  },
  {
    id: 'INC-002',
    title: 'SS7 Signaling Attack Detected',
    severity: 'critical',
    status: 'investigating',
    category: 'ss7_attack',
    assignedTo: 'Fatima Zerhouni',
    createdAt: '2024-01-15T10:15:00Z',
    updatedAt: '2024-01-15T12:45:00Z',
    playbook: 'PB-SS7-ATTACK-001',
    progress: 25,
    tasksCompleted: 3,
    tasksTotal: 12,
    evidenceCount: 8,
  },
  {
    id: 'INC-003',
    title: 'Suspicious Insider Activity - HR System',
    severity: 'high',
    status: 'new',
    category: 'insider_threat',
    createdAt: '2024-01-15T11:30:00Z',
    updatedAt: '2024-01-15T11:30:00Z',
    progress: 0,
    tasksCompleted: 0,
    tasksTotal: 15,
    evidenceCount: 3,
  },
  {
    id: 'INC-004',
    title: 'SIM Swap Fraud Pattern Identified',
    severity: 'high',
    status: 'investigating',
    category: 'telecom_fraud',
    assignedTo: 'Karim Hadj',
    createdAt: '2024-01-14T16:00:00Z',
    updatedAt: '2024-01-15T09:30:00Z',
    progress: 60,
    tasksCompleted: 6,
    tasksTotal: 10,
    evidenceCount: 22,
  },
];

const mockTasks: Task[] = [
  { id: 'T1', title: 'Verify ransomware detection', status: 'completed', assignee: 'System', phase: 'Detection' },
  { id: 'T2', title: 'Assess initial scope', status: 'completed', assignee: 'Ahmed B.', phase: 'Detection' },
  { id: 'T3', title: 'Escalate to IR Lead', status: 'completed', assignee: 'System', phase: 'Detection' },
  { id: 'T4', title: 'Isolate patient zero', status: 'in_progress', assignee: 'Ahmed B.', phase: 'Containment' },
  { id: 'T5', title: 'Block C2 domains at firewall', status: 'pending', phase: 'Containment' },
  { id: 'T6', title: 'Preserve forensic images', status: 'pending', phase: 'Containment' },
  { id: 'T7', title: 'Identify ransomware strain', status: 'pending', phase: 'Eradication' },
  { id: 'T8', title: 'Clean infected systems', status: 'pending', phase: 'Eradication' },
];

const mockEvidence: EvidenceItem[] = [
  { id: 'E1', name: 'WORKSTATION-042_memory.dmp', type: 'Memory Capture', status: 'valid', size: '8.2 GB', collectedAt: '2024-01-15T08:45:00Z' },
  { id: 'E2', name: 'WORKSTATION-042_disk.E01', type: 'Disk Image', status: 'valid', size: '256 GB', collectedAt: '2024-01-15T09:10:00Z' },
  { id: 'E3', name: 'network_capture.pcap', type: 'PCAP', status: 'valid', size: '1.2 GB', collectedAt: '2024-01-15T08:35:00Z' },
  { id: 'E4', name: 'SS7_signaling_logs.json', type: 'Log Export', status: 'valid', size: '45 MB', collectedAt: '2024-01-15T10:20:00Z' },
  { id: 'E5', name: 'suspicious_file.exe', type: 'Malware Sample', status: 'pending', size: '2.3 MB', collectedAt: '2024-01-15T08:40:00Z' },
];

export function IncidentResponseCenter() {
  const [selectedIncident, setSelectedIncident] = useState<Incident>(mockIncidents[0]);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredIncidents = filterStatus === 'all' 
    ? mockIncidents 
    : mockIncidents.filter(i => i.status === filterStatus);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      case 'investigating': return <Activity className="h-4 w-4 text-orange-500" />;
      case 'contained': return <Shield className="h-4 w-4 text-yellow-500" />;
      case 'eradicated': return <Bug className="h-4 w-4 text-green-500" />;
      case 'recovered': return <CheckCircle className="h-4 w-4 text-green-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ransomware': return <Lock className="h-4 w-4" />;
      case 'ss7_attack': return <Phone className="h-4 w-4" />;
      case 'insider_threat': return <User className="h-4 w-4" />;
      case 'telecom_fraud': return <Network className="h-4 w-4" />;
      case 'malware': return <Virus className="h-4 w-4" />;
      default: return <Server className="h-4 w-4" />;
    }
  };

  const getTaskStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Play className="h-4 w-4 text-blue-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Incident Response Center</h2>
          <p className="text-muted-foreground">
            Digital Forensics & Incident Response operations hub
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Incident
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical/High</p>
                <p className="text-2xl font-bold text-red-600">3</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Investigations</p>
                <p className="text-2xl font-bold">{mockIncidents.filter(i => ['new', 'investigating'].includes(i.status)).length}</p>
              </div>
              <Activity className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Contained</p>
                <p className="text-2xl font-bold text-yellow-600">{mockIncidents.filter(i => i.status === 'contained').length}</p>
              </div>
              <Shield className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Evidence Items</p>
                <p className="text-2xl font-bold">{mockIncidents.reduce((sum, i) => sum + i.evidenceCount, 0)}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incidents List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Active Incidents</CardTitle>
              <Badge variant="secondary">{filteredIncidents.length}</Badge>
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {['all', 'new', 'investigating', 'contained'].map(status => (
                <Button
                  key={status}
                  variant={filterStatus === status ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setFilterStatus(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[550px] pr-4">
              <div className="space-y-3">
                {filteredIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      selectedIncident?.id === incident.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedIncident(incident)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-mono text-xs text-muted-foreground">{incident.id}</span>
                      <Badge variant="outline" className={getSeverityColor(incident.severity)}>
                        {incident.severity}
                      </Badge>
                    </div>

                    <h4 className="font-medium text-sm mb-1 line-clamp-2">{incident.title}</h4>
                    
                    <div className="flex items-center gap-2 mt-2 mb-3">
                      {getStatusIcon(incident.status)}
                      <span className="text-xs capitalize text-muted-foreground">{incident.status.replace('_', ' ')}</span>
                      <span className="mx-1 text-gray-300">•</span>
                      {getCategoryIcon(incident.category)}
                      <span className="text-xs text-muted-foreground">{incident.category.replace('_', ' '))}</span>
                    </div>

                    <Progress value={incident.progress} className="h-1.5 mb-2" />
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{incident.tasksCompleted}/{incident.tasksTotal} tasks</span>
                      <span>{incident.evidenceCount} evidence</span>
                    </div>

                    {incident.assignedTo && (
                      <div className="mt-2 pt-2 border-t flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span className="text-xs truncate">{incident.assignedTo}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Incident Details */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            {selectedIncident && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-muted-foreground">{selectedIncident.id}</span>
                      <Badge variant="outline" className={getSeverityColor(selectedIncident.severity)}>
                        {selectedIncident.severity}
                      </Badge>
                      <Badge variant="secondary">{selectedIncident.status.replace('_', ' ')}</Badge>
                    </div>
                    <CardTitle className="text-lg">{selectedIncident.title}</CardTitle>
                  </div>
                  {selectedIncident.playbook && (
                    <Button variant="outline" size="sm">
                      <GitBranch className="mr-2 h-4 w-4" />
                      Run Playbook
                    </Button>
                  )}
                </div>
                <CardDescription className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Created: {new Date(selectedIncident.createdAt).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" />
                    Updated: {new Date(selectedIncident.updatedAt).toLocaleString()}
                  </span>
                  {selectedIncident.assignedTo && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {selectedIncident.assignedTo}
                    </span>
                  )}
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent>
            {selectedIncident ? (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="tasks">Tasks ({selectedIncident.tasksTotal})</TabsTrigger>
                  <TabsTrigger value="evidence">Evidence ({selectedIncident.evidenceCount})</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="team">Team</TabsTrigger>
                </TabsList>

                <TabsContent value="tasks" className="mt-4">
                  <div className="space-y-2">
                    {['Detection', 'Containment', 'Eradication', 'Recovery'].map(phase => (
                      <div key={phase}>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            phase === 'Detection' ? 'bg-green-500' :
                            phase === 'Containment' ? 'bg-blue-500' :
                            'bg-gray-300'
                          }`} />
                          {phase}
                          <Badge variant="outline" className="text-xs ml-auto">
                            {mockTasks.filter(t => t.phase === phase && t.status === 'completed').length}/
                            {mockTasks.filter(t => t.phase === phase).length}
                          </Badge>
                        </h4>
                        <div className="ml-4 space-y-1 mb-4">
                          {mockTasks.filter(t => t.phase === phase).map(task => (
                            <div
                              key={task.id}
                              className={`flex items-center justify-between p-2 rounded-md text-sm ${
                                task.status === 'completed' ? 'bg-green-50 dark:bg-green-950/20' :
                                task.status === 'in_progress' ? 'bg-blue-50 dark:bg-blue-950/20' :
                                'bg-muted/50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {getTaskStatusIcon(task.status)}
                                <span>{task.title}</span>
                              </div>
                              {task.assignee && (
                                <span className="text-xs text-muted-foreground">{task.assignee}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="evidence" className="mt-4">
                  <div className="space-y-2">
                    {mockEvidence.map(evidence => (
                      <div key={evidence.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{evidence.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span>{evidence.type}</span>
                              <span>•</span>
                              <span>{evidence.size}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={
                            evidence.status === 'valid' ? 'border-green-500 text-green-700' :
                            evidence.status === 'corrupted' ? 'border-red-500 text-red-700' :
                            'border-yellow-500 text-yellow-700'
                          }>
                            {evidence.status}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <Button variant="outline" className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Evidence Item
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {[
                          { time: '08:30', event: 'Initial alert received', type: 'alert', severity: 'critical' },
                          { time: '08:35', event: 'IR Lead notified', type: 'notification', severity: 'info' },
                          { time: '08:45', event: 'Memory capture initiated', type: 'collection', severity: 'info' },
                          { time: '09:10', event: 'Disk image acquisition started', type: 'collection', severity: 'info' },
                          { time: '09:30', event: 'Patient zero isolated', type: 'containment', severity: 'warning' },
                          { time: '10:15', event: 'C2 domains blocked at firewall', type: 'containment', severity: 'success' },
                          { time: '14:20', event: 'Scope assessment complete', type: 'analysis', severity: 'info' },
                        ].map((item, idx) => (
                          <div key={idx} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className={`w-3 h-3 rounded-full ${
                                item.severity === 'critical' ? 'bg-red-500' :
                                item.severity === 'warning' ? 'bg-orange-500' :
                                item.severity === 'success' ? 'bg-green-500' :
                                'bg-blue-500'
                              }`} />
                              {idx < 6 && <div className="w-0.5 h-12 bg-border" />}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs text-muted-foreground">{item.time}</span>
                                <Badge variant="outline" className="text-xs">{item.type}</Badge>
                              </div>
                              <p className="text-sm">{item.event}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="team" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { name: 'Ahmed Benali', role: 'IR Lead', status: 'active', currentTask: 'Containment - Isolate patient zero' },
                      { name: 'Fatima Zerhouni', role: 'Threat Hunter', status: 'active', currentTask: 'Analysis - SS7 attack reconstruction' },
                      { name: 'Karim Hadj', role: 'DFIR Analyst', status: 'busy', currentTask: 'Forensics - Memory analysis' },
                      { name: 'Sara Meziani', role: 'SOC Analyst', status: 'available', currentTask: null },
                    ].map((member, idx) => (
                      <Card key={idx}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                                member.status === 'active' ? 'bg-green-500' :
                                member.status === 'busy' ? 'bg-orange-500' :
                                'bg-gray-400'
                              }`}>
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="font-medium">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.role}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className={
                              member.status === 'active' ? 'border-green-500 text-green-700' :
                              member.status === 'busy' ? 'border-orange-500 text-orange-700' :
                              'border-gray-400 text-gray-600'
                            }>
                              {member.status}
                            </Badge>
                          </div>
                          
                          {member.currentTask && (
                            <div className="mt-3 p-2 rounded bg-muted text-xs">
                              <p className="text-muted-foreground">Current task:</p>
                              <p className="truncate">{member.currentTask}</p>
                            </div>
                          )}

                          <div className="mt-3 flex gap-1">
                            <Button variant="outline" size="sm" className="flex-1 text-xs">
                              Message
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1 text-xs">
                              Assign Task
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select an incident to view details</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default IncidentResponseCenter;
