'use client';

/**
 * Fraud Detection Panel Component
 * Djezzy National SOC Platform - SS7 Tools Suite
 * 
 * Fraud alerts dashboard:
 * - Active fraud alerts list
 * - Fraud type breakdown (IRSF, SIM swap, etc.)
 * - Detection timeline
 * - Blocked subscribers count
 * - Financial impact estimation (DZD)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, AlertTriangle, AlertCircle, ShieldAlert, ShieldCheck,
  Clock, DollarSign, Users, Ban, Eye, Search, Filter,
  TrendingUp, TrendingDown, Minus, Plus, ChevronDown,
  Activity, Lock, Globe, Phone, CreditCard, MapPin,
  RefreshCw, Download, ExternalLink, CheckCircle2, XCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend
} from 'recharts';

// Types
interface FraudAlert {
  id: string;
  timestamp: Date;
  type: FraudType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: AlertStatus;
  confidence: number;
  subscriber?: {
    msisdn: string;
    imsi: string;
    maskedMSISDN: string;
    maskedIMSI: string;
  };
  indicators: string[];
  financialImpact?: {
    estimatedLossDZD: number;
  };
  ruleName: string;
}

enum FraudType {
  IRSF = 'irsf',
  SIM_SWAP = 'sim_swap',
  WANGIRI = 'wangiri',
  BYPASS_FRAUD = 'bypass_fraud',
  PREMIUM_RATE_ABUSE = 'premium_rate_abuse',
  ROAMING_ANOMALY = 'roaming_anomaly',
  INTERCEPTION = 'interception',
  CLONING = 'cloning',
}

enum AlertStatus {
  NEW = 'new',
  INVESTIGATING = 'investigating',
  CONFIRMED = 'confirmed',
  BLOCKED = 'blocked',
  RESOLVED = 'resolved',
}

// Colors and config
const FRAUD_TYPE_COLORS: Record<FraudType, string> = {
  [FraudType.IRSF]: '#ef4444',
  [FraudType.SIM_SWAP]: '#f97316',
  [FraudType.WANGIRI]: '#eab308',
  [FraudType.BYPASS_FRAUD]: '#a855f7',
  [FraudType.PREMIUM_RATE_ABUSE]: '#ec4899',
  [FraudType.ROAMING_ANOMALY]: '#06b6d4',
  [FraudType.INTERCEPTION]: '#dc2626',
  [FraudType.CLONING]: '#991b1b',
};

const SEVERITY_CONFIG: Record<string, { color: string; bgClass: string; icon: React.ReactNode }> = {
  critical: { 
    color: '#dc2626', 
    bgClass: 'bg-red-500/20 border-red-500/50 text-red-400', 
    icon: <ShieldAlert className="w-4 h-4" /> 
  },
  high: { 
    color: '#f97316', 
    bgClass: 'bg-orange-500/20 border-orange-500/50 text-orange-400', 
    icon: <AlertTriangle className="w-4 h-4" /> 
  },
  medium: { 
    color: '#eab308', 
    bgClass: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400', 
    icon: <AlertCircle className="w-4 h-4" /> 
  },
  low: { 
    color: '#22c55e', 
    bgClass: 'bg-green-500/20 border-green-500/50 text-green-400', 
    icon: <Shield className="w-4 h-4" /> 
  },
};

const STATUS_CONFIG: Record<AlertStatus, { label: string; color: string; icon: React.ReactNode }> = {
  [AlertStatus.NEW]: { label: 'New', color: '#3b82f6', icon: <Activity className="w-3 h-3" /> },
  [AlertStatus.INVESTIGATING]: { label: 'Investigating', color: '#eab308', icon: <Search className="w-3 h-3" /> },
  [AlertStatus.CONFIRMED]: { label: 'Confirmed', color: '#f97316', icon: <CheckCircle2 className="w-3 h-3" /> },
  [AlertStatus.BLOCKED]: { label: 'Blocked', color: '#dc2626', icon: <Ban className="w-3 h-3" /> },
  [AlertStatus.RESOLVED]: { label: 'Resolved', color: '#22c55e', icon: <ShieldCheck className="w-3 h-3" /> },
};

const chartConfig = {
  count: { label: 'Count', color: '#3b82f6' },
} satisfies ChartConfig;

// Sample data generators
function generateFraudAlerts(): FraudAlert[] {
  const now = new Date();
  
  return [
    {
      id: 'fraud_001',
      timestamp: new Date(now.getTime() - 5 * 60000),
      type: FraudType.IRSF,
      severity: 'critical',
      status: AlertStatus.INVESTIGATING,
      confidence: 94,
      subscriber: {
        msisdn: '+213550123456',
        imsi: '603011234567890',
        maskedMSISDN: '+21355****56',
        maskedIMSI: '60301********',
      },
      indicators: ['irsf_high_volume_international', 'irsf_premium_rate_target'],
      financialImpact: { estimatedLossDZD: 45000 },
      ruleName: 'High Volume International Calls to Premium Destinations',
    },
    {
      id: 'fraud_002',
      timestamp: new Date(now.getTime() - 12 * 60000),
      type: FraudType.SIM_SWAP,
      severity: 'critical',
      status: AlertStatus.NEW,
      confidence: 89,
      subscriber: {
        msisdn: '+213661987654',
        imsi: '603019876543210',
        maskedMSISDN: '+21366****54',
        maskedIMSI: '60301********',
      },
      indicators: ['sim_swap_multiple_attempts', 'sim_swap_auth_failure_burst'],
      financialImpact: { estimatedLossDZD: 125000 },
      ruleName: 'Multiple SIM Provisioning Attempts',
    },
    {
      id: 'fraud_003',
      timestamp: new Date(now.getTime() - 25 * 60000),
      type: FraudType.WANGIRI,
      severity: 'medium',
      status: AlertStatus.INVESTIGATING,
      confidence: 76,
      subscriber: {
        msisdn: '+213772345678',
        imsi: '603012345678901',
        maskedMSISDN: '+21377****78',
        maskedIMSI: '60301********',
      },
      indicators: ['wangiri_one_ring', 'wangiri_short_duration'],
      financialImpact: { estimatedLossDZD: 2500 },
      ruleName: 'One-Ring Call Pattern Detection',
    },
    {
      id: 'fraud_004',
      timestamp: new Date(now.getTime() - 45 * 60000),
      type: FraudType.BYPASS_FRAUD,
      severity: 'high',
      status: AlertStatus.CONFIRMED,
      confidence: 91,
      subscriber: {
        msisdn: '+213553456789',
        imsi: '603013456789012',
        maskedMSISDN: '+21355****89',
        maskedIMSI: '60301********',
      },
      indicators: ['bypass_fraud_gsm_gateway', 'bypass_fraud_simbox'],
      financialImpact: { estimatedLossDZD: 280000 },
      ruleName: 'GSM Gateway / Simbox Detection',
    },
    {
      id: 'fraud_005',
      timestamp: new Date(now.getTime() - 58 * 60000),
      type: FraudType.ROAMING_ANOMALY,
      severity: 'high',
      status: AlertStatus.NEW,
      confidence: 95,
      subscriber: {
        msisdn: '+213684567890',
        imsi: '603014567890123',
        maskedMSISDN: '+21368****90',
        maskedIMSI: '60301********',
      },
      indicators: ['roaming_anomaly_fast_travel', 'roaming_anomaly_impossible'],
      financialImpact: { estimatedLossDZD: 85000 },
      ruleName: 'Impossible Roaming Speed Detection',
    },
    {
      id: 'fraud_006',
      timestamp: new Date(now.getTime() - 85 * 60000),
      type: FraudType.IRSF,
      severity: 'high',
      status: AlertStatus.BLOCKED,
      confidence: 87,
      subscriber: {
        msisdn: '+213595678901',
        imsi: '603015678901234',
        maskedMSISDN: '+21359****01',
        maskedIMSI: '60301********',
      },
      indicators: ['irsf_suspicious_pattern', 'irsf_high_volume_international'],
      financialImpact: { estimatedLossDZD: 32000 },
      ruleName: 'IRSF Pattern - Exactly 60 Second Calls',
    },
    {
      id: 'fraud_007',
      timestamp: new Date(now.getTime() - 120 * 60000),
      type: FraudType.CLONING,
      severity: 'critical',
      status: AlertStatus.INVESTIGATING,
      confidence: 92,
      subscriber: {
        msisdn: '+213706789012',
        imsi: '603016789012345',
        maskedMSISDN: '+21370****12',
        maskedIMSI: '60301********',
      },
      indicators: ['cloning_detected', 'imei_mismatch'],
      financialImpact: { estimatedLossDZD: 180000 },
      ruleName: 'IMEI Cloning Detected',
    },
    {
      id: 'fraud_008',
      timestamp: new Date(now.getTime() - 150 * 60000),
      type: FraudType.PREMIUM_RATE_ABUSE,
      severity: 'medium',
      status: AlertStatus.RESOLVED,
      confidence: 71,
      subscriber: {
        msisdn: '+213617890123',
        imsi: '603017890123456',
        maskedMSISDN: '+21361****23',
        maskedIMSI: '60301********',
      },
      indicators: ['premium_rate_abuse'],
      financialImpact: { estimatedLossDZD: 8500 },
      ruleName: 'Premium Rate Abuse',
    },
  ];
}

function generateFraudTypeBreakdown(): Array<{ type: FraudType; name: string; count: number; impact: number }> {
  return [
    { type: FraudType.IRSF, name: 'IRSF', count: 47, impact: 1250000 },
    { type: FraudType.SIM_SWAP, name: 'SIM Swap', count: 23, impact: 2875000 },
    { type: FraudType.WANGIRI, name: 'Wangiri', count: 156, impact: 390000 },
    { type: FraudType.BYPASS_FRAUD, name: 'Bypass Fraud', count: 18, impact: 2240000 },
    { type: FraudType.PREMIUM_RATE_ABUSE, name: 'Premium Rate', count: 34, impact: 289000 },
    { type: FraudType.ROAMING_ANOMALY, name: 'Roaming Anomaly', count: 12, impact: 1020000 },
    { type: FraudType.CLONING, name: 'Cloning', count: 8, impact: 1440000 },
    { type: FraudType.INTERCEPTION, name: 'Interception', count: 3, impact: 300000 },
  ];
}

function generateTimelineData(): Array<{ time: string; alerts: number; blocked: number; resolved: number }> {
  const data = [];
  for (let i = 24; i >= 0; i--) {
    data.push({
      time: `${i}h ago`,
      alerts: Math.floor(Math.random() * 15) + (i < 4 ? 10 : 0),
      blocked: Math.floor(Math.random() * 5) + (i < 2 ? 3 : 0),
      resolved: Math.floor(Math.random() * 8),
    });
  }
  return data.reverse();
}

// Main Component
export default function FraudDetectionPanel() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<FraudAlert[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize data
  useEffect(() => {
    setAlerts(generateFraudAlerts());
    setIsLoading(false);
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...alerts];

    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(a => a.severity === selectedSeverity);
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(a => a.type === selectedType);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(a => a.status === selectedStatus);
    }

    setFilteredAlerts(filtered);
  }, [alerts, selectedSeverity, selectedType, selectedStatus]);

  const fraudTypeBreakdown = generateFraudTypeBreakdown();
  const timelineData = generateTimelineData();

  // Calculate summary stats
  const totalAlerts = alerts.length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const highAlerts = alerts.filter(a => a.severity === 'high').length;
  const blockedCount = alerts.filter(a => a.status === AlertStatus.BLOCKED).length;
  const totalEstimatedLoss = alerts.reduce((sum, a) => sum + (a.financialImpact?.estimatedLossDZD || 0), 0);

  const handleBlockSubscriber = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, status: AlertStatus.BLOCKED as AlertStatus } : a
    ));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-400" />
            Fraud Detection Center
          </h2>
          <p className="text-gray-400 mt-1">Real-time telecom fraud monitoring & response</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={criticalAlerts > 0 ? 'text-red-400 border-red-400 animate-pulse' : 'text-green-400 border-green-400'}>
            {criticalAlerts > 0 ? `${criticalAlerts} CRITICAL` : 'All Clear'}
          </Badge>
          
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => setAlerts(generateFraudAlerts())}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard
          title="Total Alerts"
          value={totalAlerts.toString()}
          icon={<AlertTriangle className="w-5 h-5 text-yellow-400" />}
          trend={totalAlerts > 20 ? 'up' : 'stable'}
        />
        <SummaryCard
          title="Critical"
          value={criticalAlerts.toString()}
          icon={<ShieldAlert className="w-5 h-5 text-red-400" />}
          highlight={criticalAlerts > 0}
        />
        <SummaryCard
          title="High Priority"
          value={highAlerts.toString()}
          icon={<AlertCircle className="w-5 h-5 text-orange-400" />}
        />
        <SummaryCard
          title="Blocked"
          value={blockedCount.toString()}
          icon={<Ban className="w-5 h-5 text-purple-400" />}
        />
        <SummaryCard
          title="Est. Loss (DZD)"
          value={`${(totalEstimatedLoss / 1000).toFixed(0)}K`}
          icon={<DollarSign className="w-5 h-5 text-green-400" />}
          isCurrency
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts List (takes 2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <Filter className="w-4 h-4 text-gray-400" />
                
                <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                  <SelectTrigger className="w-[130px] bg-slate-800 border-slate-600">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[140px] bg-slate-800 border-slate-600">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.values(FraudType).map(type => (
                      <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[130px] bg-slate-800 border-slate-600">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {Object.values(AlertStatus).map(status => (
                      <SelectItem key={status} value={status}>{STATUS_CONFIG[status].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-gray-500 text-sm ml-auto">
                  Showing {filteredAlerts.length} of {totalAlerts} alerts
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Alerts List */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg">Active Fraud Alerts</CardTitle>
              <CardDescription>Click to expand details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredAlerts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-green-500/30" />
                    <p>No alerts match current filters</p>
                  </div>
                ) : (
                  filteredAlerts.map(alert => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      isExpanded={expandedAlert === alert.id}
                      onToggle={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
                      onBlock={() => handleBlockSubscriber(alert.id)}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Fraud Type Breakdown */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-purple-400" />
                Fraud by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <PieChart>
                  <Pie
                    data={fraudTypeBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {fraudTypeBreakdown.map(entry => (
                      <Cell key={entry.type} fill={FRAUD_TYPE_COLORS[entry.type]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
              
              <div className="mt-3 space-y-2">
                {fraudTypeBreakdown.slice(0, 5).map(entry => (
                  <div key={entry.type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: FRAUD_TYPE_COLORS[entry.type] }} />
                      <span className="text-gray-300">{entry.name}</span>
                    </div>
                    <span className="text-white font-mono">{entry.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Timeline Chart */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Detection Timeline
              </CardTitle>
              <CardDescription>Last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[150px] w-full">
                <AreaChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 9 }} interval={4} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="alerts" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="resolved" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start bg-slate-800 border-slate-600 hover:bg-slate-700">
                <Ban className="w-4 h-4 mr-2 text-red-400" />
                Block Selected Subscriber
              </Button>
              <Button variant="outline" className="w-full justify-start bg-slate-800 border-slate-600 hover:bg-slate-700">
                <ExternalLink className="w-4 h-4 mr-2 text-blue-400" />
                Report to ANRT
              </Button>
              <Button variant="outline" className="w-full justify-start bg-slate-800 border-slate-600 hover:bg-slate-700">
                <Download className="w-4 h-4 mr-2 text-green-400" />
                Export Evidence Package
              </Button>
              <Button variant="outline" className="w-full justify-start bg-slate-800 border-slate-600 hover:bg-slate-700">
                <Lock className="w-4 h-4 mr-2 text-purple-400" />
                Initiate Legal Intercept
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Sub-components
function SummaryCard({ 
  title, 
  value, 
  icon, 
  trend, 
  highlight, 
  isCurrency 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  trend?: 'up' | 'down' | 'stable'; 
  highlight?: boolean;
  isCurrency?: boolean;
}) {
  return (
    <Card className={`bg-slate-900/50 ${highlight ? 'border-red-500/50 ring-1 ring-red-500/30' : 'border-slate-700'}`}>
      <CardContent className="pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          {icon}
          {trend && (
            <span className={`text-xs ${trend === 'up' ? 'text-red-400' : 'text-gray-500'}`}>
              {trend === 'up' ? '↑' : '→'}
            </span>
          )}
        </div>
        <div className={`text-xl font-bold ${isCurrency ? 'text-green-400' : 'text-white'}`}>
          {value}
        </div>
        <p className="text-gray-500 text-xs mt-1">{title}</p>
      </CardContent>
    </Card>
  );
}

function AlertCard({ 
  alert, 
  isExpanded, 
  onToggle, 
  onBlock 
}: { 
  alert: FraudAlert; 
  isExpanded: boolean; 
  onToggle: () => void; 
  onBlock: () => void;
}) {
  const severityCfg = SEVERITY_CONFIG[alert.severity];
  const statusCfg = STATUS_CONFIG[alert.status];

  return (
    <div 
      className={`rounded-lg border p-4 cursor-pointer transition-all ${
        severityCfg.bgClass
      } ${isExpanded ? 'ring-1 ring-white/20' : ''}`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {severityCfg.icon}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-medium">{alert.ruleName}</span>
              <Badge variant="outline" className={`text-xs ${severityCfg.bgClass}`}>
                {alert.severity.toUpperCase()}
              </Badge>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                {statusCfg.icon}
                {statusCfg.label}
              </span>
              <span>{alert.timestamp.toLocaleTimeString()}</span>
              {alert.subscriber && (
                <code className="bg-slate-800 px-1 rounded">
                  {alert.subscriber.maskedMSISDN}
                </code>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-bold">{alert.confidence}%</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
          {/* Indicators */}
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wider">Indicators</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {alert.indicators.map(ind => (
                <Badge key={ind} variant="outline" className="text-xs bg-slate-800/50 border-slate-600">
                  {ind.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>

          {/* Financial Impact */}
          {alert.financialImpact && (
            <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
              <span className="text-gray-400 text-sm">Est. Financial Impact:</span>
              <span className="text-red-400 font-bold font-mono">
                {alert.financialImpact.estimatedLossDZD.toLocaleString()} DZD
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {alert.status !== AlertStatus.BLOCKED && (
              <Button 
                size="sm" 
                variant="destructive"
                onClick={(e) => { e.stopPropagation(); onBlock(); }}
              >
                <Ban className="w-3 h-3 mr-1" />
                Block Subscriber
              </Button>
            )}
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => e.stopPropagation()}
            >
              <Eye className="w-3 h-3 mr-1" />
              View Details
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PieChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}
