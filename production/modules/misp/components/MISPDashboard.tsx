/**
 * 🇩🇿 National SOC - MISP Threat Intelligence Dashboard
 * Threat intelligence platform UI component
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
  Search,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Globe,
  Fingerprint,
  Users,
  TrendingUp,
  Database,
  Eye,
  Plus,
  RefreshCw,
  Radar,
  Target,
  Bug,
  Lock,
  Activity,
  FileWarning,
  Download,
} from 'lucide-react';

// Types
interface MISPDashboardProps {
  className?: string;
}

// Mock data for development
const mockData = {
  health: {
    healthy: true,
    version: '2.4.150',
    user: 'soc-analyst@soc.dz',
  },
  stats: {
    totalEvents: 1247,
    totalAttributes: 45892,
    totalIOCs: 12345,
    eventsToday: 18,
    eventsThisWeek: 127,
    topTags: [
      { tag: 'apt28', count: 234 },
      { tag: 'ransomware', count: 189 },
      { tag: 'phishing', count: 156 },
      { tag: 'apt29', count: 134 },
      { tag: 'malware', count: 98 },
    ],
    topTypes: [
      { type: 'ip-dst', count: 12450 },
      { type: 'domain', count: 8934 },
      { type: 'url', count: 6721 },
      { type: 'sha256', count: 5432 },
      { type: 'md5', count: 4123 },
    ],
  },
  recentEvents: [
    { id: 'evt-001', info: 'APT28 Campaign - Diplomatic Targets', date: '2026-07-25', threat_level_id: 1, analysis: 0, attribute_count: 45, tags: ['apt28', 'diplomatic', 'spearphish'] },
    { id: 'evt-002', info: 'LockBit Ransomware Variant Analysis', date: '2026-07-25', threat_level_id: 1, analysis: 1, attribute_count: 32, tags: ['ransomware', 'lockbit', 'encryption'] },
    { id: 'evt-003', info: 'Phishing Kit - Banking Sector', date: '2026-07-24', threat_level_id: 2, analysis: 2, attribute_count: 28, tags: ['phishing', 'banking', 'credential-theft'] },
    { id: 'evt-004', info: 'Cobalt Strike Configuration Extracted', date: '2026-07-24', threat_level_id: 1, analysis: 1, attribute_count: 56, tags: ['cobalt-strike', 'c2', 'beacon'] },
    { id: 'evt-005', info: 'Emotet Botnet Infrastructure Update', date: '2026-07-23', threat_level_id: 2, analysis: 0, attribute_count: 67, tags: ['emotet', 'botnet', 'loader'] },
  ],
  threatActors: [
    { name: 'APT28 (Fancy Bear)', description: 'Russian GRU-linked group targeting government and diplomatic entities worldwide.' },
    { name: 'APT29 (Cozy Bear)', description: 'Russian SVR-linked group known for sophisticated supply chain attacks.' },
    { name: 'Lazarus Group', description: 'North Korean state-sponsored actor targeting financial institutions and cryptocurrency.' },
    { name: 'Conti Ransomware', description: 'Russian-speaking ransomware-as-a-service operation targeting critical infrastructure.' },
    { name: 'FIN7 (Carbanak)', description: 'Financially motivated threat actor specializing in POS malware and ransomware.' },
  ],
  feedStatus: { enabled: 45, total: 62 },
};

// ────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ────────────────────────────────────────────────────────

function ThreatLevelBadge({ level }: { level: number }) {
  const config = {
    1: { label: 'High', variant: 'destructive' as const, icon: AlertTriangle },
    2: { label: 'Medium', variant: 'default' as const, className: 'bg-orange-500 text-white' },
    3: { label: 'Low', variant: 'secondary' as const, className: 'bg-yellow-500 text-white' },
    4: { label: 'Undefined', variant: 'outline' as const },
  };
  
  const { ...props } = config[level] || config[4];
  return <Badge {...props}>{config[level].label}</Badge>;
}

function AnalysisStatusBadge({ status }: { status: number }) {
  const config = {
    0: { label: 'Initial', color: 'text-blue-600 bg-blue-100' },
    1: { label: 'Ongoing', color: 'text-orange-600 bg-orange-100' },
    2: { label: 'Completed', color: 'text-green-600 bg-green-100' },
  };
  
  const { label, color } = config[status] || config[0];
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{label}</span>;
}

function RiskScoreBar({ score }: { score: number }) {
  let color = 'bg-green-500';
  if (score >= 80) color = 'bg-red-500';
  else if (score >= 60) color = 'bg-orange-500';
  else if (score >= 40) color = 'bg-yellow-500';

  return (
    <div className="flex items-center gap-2">
      <Progress value={score} className={`h-2 w-24 [&>div]:${color}`} />
      <span className="text-sm font-medium w-10">{score}</span>
    </div>
  );
}

function DataTypeIcon({ type }: { type: string }) {
  switch (type?.toLowerCase()) {
    case 'ip-dst':
    case 'ip-src':
      return <Globe className="w-4 h-4 text-blue-500" />;
    case 'domain':
      return <Globe className="w-4 h-4 text-purple-500" />;
    case 'md5':
    case 'sha1':
    case 'sha256':
      return <Fingerprint className="w-4 h-4 text-green-500" />;
    case 'url':
    case 'uri':
      return <Link className="w-4 h-4 text-orange-500" />;
    default:
      return <FileWarning className="w-4 h-4 text-gray-500" />;
  }
}

// ────────────────────────────────────────────────────────
// INDICATOR CHECK DIALOG
// ────────────────────────────────────────────────────────

function IndicatorCheckDialog() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [type, setType] = useState('any');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCheck = async () => {
    if (!value.trim()) return;
    
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock result based on value
    setResult({
      indicator: value,
      found: value.includes('evil') || value.includes('malware') || value.includes('185'),
      isWarningList: false,
      matches: value.includes('185') ? [{ type: 'ip-dst', value, event_id: 'evt-001' }] : [],
      matchCount: value.includes('185') ? 1 : 0,
      riskScore: value.includes('185') ? 85 : value.includes('evil') ? 65 : 15,
      recommendation: value.includes('185') ? 'HIGH RISK - Immediate investigation recommended.' : 'LOW RISK - No significant threats found.',
    });
    
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1">
          <Search className="w-4 h-4" />
          Check Indicator
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radar className="w-5 h-5" />
            Indicator Lookup
          </DialogTitle>
          <DialogDescription>
            Check an IP, domain, hash, or URL against MISP threat intelligence database.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter IP, domain, hash, or URL..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              className="font-mono"
            />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Type</SelectItem>
                <SelectItem value="ip-dst">IP Address</SelectItem>
                <SelectItem value="domain">Domain</SelectItem>
                <SelectItem value="md5">MD5 Hash</SelectItem>
                <SelectItem value="sha256">SHA256</SelectItem>
                <SelectItem value="url">URL</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleCheck} disabled={!value.trim() || loading}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Check
            </Button>
          </div>

          {/* Result */}
          {result && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-medium truncate max-w-[300px]">
                  {result.indicator}
                </span>
                <Badge variant={result.found ? 'destructive' : 'secondary'}>
                  {result.found ? 'FOUND' : 'NOT FOUND'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Risk Score:</span>
                  <RiskScoreBar score={result.riskScore} />
                </div>
                <div>
                  <span className="text-muted-foreground">Matches:</span>
                  <span className="ml-2 font-medium">{result.matchCount}</span>
                </div>
              </div>

              <div className="p-3 bg-muted rounded text-sm">
                <strong>Recommendation:</strong> {result.recommendation}
              </div>

              {result.matches.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Related Events:</p>
                  {result.matches.map((match: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs bg-accent p-2 rounded mb-1">
                      <DataTypeIcon type={match.type} />
                      <span>{match.type}</span>
                      <span className="text-muted-foreground">→ Event {match.event_id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          {result && (
            <Button onClick={() => {
              // Would add to TheHive case
              alert('IOC added to investigation queue');
            }}>
              Add to Case
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────
// CREATE EVENT DIALOG
// ────────────────────────────────────────────────────────

function CreateEventDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [threatLevel, setThreatLevel] = useState('2');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('Creating event:', { title, threatLevel, tags });
    setLoading(false);
    setOpen(false);
    setTitle('');
    setTags('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1">
          <Plus className="w-4 h-4" />
          New Event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create Threat Event</DialogTitle>
          <DialogDescription>
            Create a new threat intelligence event in MISP. IOCs can be added after creation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="event-title" className="text-sm font-medium">
              Event Title / Info <span className="text-red-500">*</span>
            </label>
            <Input
              id="event-title"
              placeholder="e.g., APT28 Campaign - Target Analysis"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Threat Level</label>
              <Select value={threatLevel} onValueChange={setThreatLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">High (1)</SelectItem>
                  <SelectItem value="2">Medium (2)</SelectItem>
                  <SelectItem value="3">Low (3)</SelectItem>
                  <SelectItem value="4">Undefined (4)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Distribution</label>
              <Select defaultValue="0">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Your Organization Only</SelectItem>
                  <SelectItem value="1">This Community</SelectItem>
                  <SelectItem value="2">Connected Communities</SelectItem>
                  <SelectItem value="4">All Communities</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="event-tags" className="text-sm font-medium">
              Tags (comma-separated)
            </label>
            <Input
              id="event-tags"
              placeholder="apt28, phishing, spearphish"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
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
            {loading ? 'Creating...' : 'Create Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────

export function MISPDashboard({ className }: MISPDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className={className} space-y-6}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Radar className="w-6 h-6 text-red-600" />
            Threat Intelligence (MISP)
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Malware Information Sharing Platform • IOC Management & Enrichment
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IndicatorCheckDialog />
          <CreateEventDialog />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{mockData.stats.totalEvents.toLocaleString()}</p>
              </div>
              <Database className="w-8 h-8 text-blue-100 bg-blue-500 rounded-full p-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total IOCs</p>
                <p className="text-2xl font-bold text-red-600">{mockData.stats.totalIOCs.toLocaleString()}</p>
              </div>
              <Shield className="w-8 h-8 text-red-100 bg-red-500 rounded-full p-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Events</p>
                <p className="text-2xl font-bold text-green-600">{mockData.stats.eventsToday}</p>
              </div>
              <Activity className="w-8 h-8 text-green-100 bg-green-500 rounded-full p-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Feeds</p>
                <p className="text-2xl font-bold text-purple-600">{mockData.feedStatus.enabled}/{mockData.feedStatus.total}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-100 bg-purple-500 rounded-full p-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">MISP Status</p>
                <p className="text-lg font-bold text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> v{mockData.health.version}
                </p>
              </div>
              <Target className="w-8 h-8 text-green-100 bg-green-500 rounded-full p-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="actors">Threat Actors</TabsTrigger>
          <TabsTrigger value="ioc-types">IOC Types</TabsTrigger>
          <TabsTrigger value="feeds">Feeds</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  Recent Threat Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {mockData.recentEvents.map((event) => (
                      <div key={event.id} className="p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{event.info}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <ThreatLevelBadge level={event.threat_level_id} />
                              <AnalysisStatusBadge status={event.analysis} />
                            </div>
                            <div className="flex gap-1 mt-2">
                              {event.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                                  {tag}
                                </Badge>
                              ))}
                              {event.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  +{event.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{event.date}</p>
                            <p className="text-xs mt-1">{event.attribute_count} IOCs</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Top Tags & IOC Types */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Threat Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockData.stats.topTags.map((tag, idx) => (
                      <div key={tag.tag} className="flex items-center gap-3">
                        <span className="w-6 text-sm text-muted-foreground">{idx + 1}</span>
                        <Badge variant="outline" className="flex-1 justify-start">
                          {tag.tag}
                        </Badge>
                        <span className="text-sm font-medium w-10 text-right">{tag.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">IOC Type Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockData.stats.topTypes.map((type) => (
                      <div key={type.type} className="flex items-center gap-3">
                        <DataTypeIcon type={type.type} />
                        <span className="w-20 text-sm font-mono">{type.type}</span>
                        <Progress 
                          value={(type.count / mockData.stats.topTypes[0].count) * 100} 
                          className="flex-1 h-2"
                        />
                        <span className="text-sm font-medium w-16 text-right">
                          {type.count.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>All Threat Events</CardTitle>
              <CardDescription>Browse and search all threat intelligence events</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Threat</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>IOCs</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockData.recentEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-mono text-xs">{event.id}</TableCell>
                        <TableCell className="max-w-[250px]">
                          <span className="truncate block text-sm font-medium">{event.info}</span>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{event.date}</TableCell>
                        <TableCell><ThreatLevelBadge level={event.threat_level_id} /></TableCell>
                        <TableCell><AnalysisStatusBadge status={event.analysis} /></TableCell>
                        <TableCell className="text-center">{event.attribute_count}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 max-w-[150px] overflow-hidden">
                            {event.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs px-1 py-0 truncate">
                                {tag}
                              </Badge>
                            ))}
                          </div>
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

        {/* Threat Actors Tab */}
        <TabsContent value="actors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Active Threat Actors
              </CardTitle>
              <CardDescription>Known adversary groups tracked in MISP</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockData.threatActors.map((actor, idx) => (
                  <Card key={idx} className="hover:border-red-300 transition-colors">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Bug className="w-10 h-10 text-red-100 bg-red-500 rounded-full p-2 shrink-0" />
                        <div>
                          <h3 className="font-semibold">{actor.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                            {actor.description}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">State-Sponsored</Badge>
                            <Badge variant="outline">Active</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IOC Types Tab */}
        <TabsContent value="ioc-types">
          <Card>
            <CardHeader>
              <CardTitle>IOC Type Statistics</CardTitle>
              <CardDescription>Distribution of indicator types across all events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockData.stats.topTypes.map((type) => (
                  <div key={type.type} className="flex items-center gap-4 p-3 rounded-lg border">
                    <DataTypeIcon type={type.type} />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium uppercase text-sm">{type.type}</span>
                        <span className="text-lg font-bold">{type.count.toLocaleString()}</span>
                      </div>
                      <Progress 
                        value={(type.count / mockData.stats.totalAttributes) * 100} 
                        className="h-3"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {((type.count / mockData.stats.totalAttributes) * 100).toFixed(1)}% of total attributes
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feeds Tab */}
        <TabsContent value="feeds">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Threat Feed Sources
                </span>
                <Button variant="outline" size="sm">
                  Fetch All Feeds
                </Button>
              </CardTitle>
              <CardDescription>
                External threat intelligence feeds configured for automatic import
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-4 text-center">
                    <CheckCircle className="w-8 h-8 mx-auto text-green-500 mb-2" />
                    <p className="text-2xl font-bold text-green-600">{mockData.feedStatus.enabled}</p>
                    <p className="text-sm text-green-700">Enabled Feeds</p>
                  </CardContent>
                </Card>
                <Card className="border-gray-200 bg-gray-50">
                  <CardContent className="pt-4 text-center">
                    <XCircle className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-2xl font-bold text-gray-600">{mockData.feedStatus.total - mockData.feedStatus.enabled}</p>
                    <p className="text-sm text-gray-600">Disabled Feeds</p>
                  </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-4 text-center">
                    <RefreshCw className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                    <p className="text-2xl font-bold text-blue-600">{mockData.feedStatus.total}</p>
                    <p className="text-sm text-blue-700">Total Configured</p>
                  </CardContent>
                </Card>
              </div>

              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Popular feeds include:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>CIRCL OSINT Feed</li>
                  <li>Malware Bazaar</li>
                  <li>AlienVault OTX</li>
                  <li>AZORult Tracker</li>
                  <li>Feodo Tracker (C2 domains)</li>
                  <li>Blocklist.de Abuse</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MISPDashboard;
