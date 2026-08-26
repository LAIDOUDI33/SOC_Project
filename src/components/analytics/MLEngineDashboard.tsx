/**
 * National SOC Platform - ML Engine Dashboard Component
 * 
 * Comprehensive dashboard for monitoring and managing ML operations:
 * - Active models status
 * - Real-time prediction accuracy
 * - Anomaly detection heatmap
 * - Model training progress
 * - Feature importance visualization
 * - Alert recommendations from ML
 * 
 * @version 1.0.0 (Phase 6 Enhancement)
 * @component analytics/MLEngineDashboard
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Icons
import {
  Brain,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Shield,
  Target,
  BarChart3,
  LineChart,
  PieChart,
  RefreshCw,
  Settings,
  Play,
  Pause,
  Download,
  Upload,
  Cpu,
  Database,
  Globe,
  Lock,
  Eye,
  Clock,
  Layers,
  Network,
  Bug,
  Users,
  DollarSign,
  Radio,
  Wifi,
  Phone,
  FileText,
  Search,
  Filter,
  MoreVertical,
  ChevronRight,
  Info,
  AlertCircle,
  CheckCircle,
  XCircle as XIcon,
  Sparkles,
} from 'lucide-react';

// ============================================================
// TYPES & INTERFACES
// ============================================================

interface ModelStatus {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'training' | 'idle' | 'error';
  accuracy: number;
  f1Score: number;
  lastTrained: string;
  predictionsLastHour: number;
}

interface DetectionStats {
  totalDetections: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byType: Record<string, number>;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

interface TrainingJob {
  id: string;
  modelName: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  epoch: number;
  totalEpochs: number;
  loss: number;
  startedAt: string;
  estimatedRemaining: string;
}

interface FeatureImportance {
  name: string;
  importance: number;
  trend: 'up' | 'down' | 'stable';
}

interface MLAlert {
  id: string;
  type: 'model_drift' | 'performance_drop' | 'anomaly_spike' | 'recommendation';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  actionRequired: boolean;
}

interface HeatmapData {
  hour: number[];
  day: number[][];
  maxValue: number;
}

// ============================================================
// MOCK DATA (Would come from API in production)
// ============================================================

const mockModels: ModelStatus[] = [
  {
    id: 'nn-threat-001',
    name: 'Threat Detection NN',
    type: 'neural_network',
    status: 'active',
    accuracy: 94.2,
    f1Score: 91.8,
    lastTrained: '2024-01-15T08:30:00Z',
    predictionsLastHour: 15420,
  },
  {
    id: 'if-anomaly-001',
    name: 'Anomaly Detector (IF)',
    type: 'isolation_forest',
    status: 'active',
    accuracy: 89.5,
    f1Score: 87.3,
    lastTrained: '2024-01-14T22:15:00Z',
    predictionsLastHour: 45890,
  },
  {
    id: 'ensemble-main',
    name: 'Main Ensemble Model',
    type: 'ensemble',
    status: 'active',
    accuracy: 96.1,
    f1Score: 94.5,
    lastTrained: '2024-01-15T06:00:00Z',
    predictionsLastHour: 28750,
  },
  {
    id: 'fraud-detect-001',
    name: 'Fraud Detection Model',
    type: 'gradient_boosting',
    status: 'training',
    accuracy: 92.8,
    f1Score: 89.4,
    lastTrained: '2024-01-13T14:20:00Z',
    predictionsLastHour: 8930,
  },
  {
    id: 'nids-ss7-001',
    name: 'SS7 Attack Detector',
    type: 'rule_based_ml',
    status: 'active',
    accuracy: 97.3,
    f1Score: 95.1,
    lastTrained: '2024-01-15T02:00:00Z',
    predictionsLastHour: 125000,
  },
];

const mockDetectionStats: DetectionStats = {
  totalDetections: 12847,
  bySeverity: {
    critical: 23,
    high: 187,
    medium: 1234,
    low: 11403,
  },
  byType: {
    ddos_volumetric: 45,
    port_scan: 234,
    c2_beaconing: 12,
    dns_tunneling: 8,
    lateral_movement: 67,
    sim_swap_fraud: 5,
    irsf: 18,
    prs_fraud: 156,
    ss7_tracking: 34,
    bypass_fraud: 22,
  },
  trend: 'down',
  trendPercent: -12.5,
};

const mockTrainingJobs: TrainingJob[] = [
  {
    id: 'train-001',
    modelName: 'Fraud Detection Model',
    status: 'running',
    progress: 67,
    epoch: 67,
    totalEpochs: 100,
    loss: 0.0342,
    startedAt: '2024-01-15T10:30:00Z',
    estimatedRemaining: '18m 32s',
  },
  {
    id: 'train-002',
    modelName: 'New Threat Classifier',
    status: 'queued',
    progress: 0,
    epoch: 0,
    totalEpochs: 150,
    loss: 0,
    startedAt: '-',
    estimatedRemaining: '-',
  },
  {
    id: 'train-003',
    modelName: 'Phishing URL Detector',
    status: 'completed',
    progress: 100,
    epoch: 50,
    totalEpochs: 50,
    loss: 0.0218,
    startedAt: '2024-01-15T08:00:00Z',
    estimatedRemaining: '-',
  },
];

const mockFeatureImportance: FeatureImportance[] = [
  { name: 'source_ip_reputation', importance: 0.184, trend: 'stable' },
  { name: 'destination_port', importance: 0.152, trend: 'up' },
  { name: 'packet_size_ratio', importance: 0.128, trend: 'stable' },
  { name: 'connection_duration', importance: 0.098, trend: 'down' },
  { name: 'protocol_anomaly', importance: 0.087, trend: 'up' },
  { name: 'time_of_day', importance: 0.076, trend: 'stable' },
  { name: 'geo_location_risk', importance: 0.065, trend: 'down' },
  { name: 'payload_entropy', importance: 0.054, trend: 'up' },
  { name: 'dns_query_pattern', importance: 0.048, trend: 'stable' },
  { name: 'user_agent_string', importance: 0.038, trend: 'down' },
];

const mockAlerts: MLAlert[] = [
  {
    id: 'alert-001',
    type: 'model_drift',
    severity: 'warning',
    title: 'Model Drift Detected: Threat Detection NN',
    description: 'Accuracy has dropped 2.3% over the past 24 hours. Consider retraining.',
    timestamp: '2024-01-15T11:45:00Z',
    actionRequired: true,
  },
  {
    id: 'alert-002',
    type: 'anomaly_spike',
    severity: 'critical',
    title: 'Unusual Spike in SS7 Tracking Attempts',
    description: 'SS7 tracking detections increased 340% in the last hour. Possible attack campaign.',
    timestamp: '2024-01-15T11:30:00Z',
    actionRequired: true,
  },
  {
    id: 'alert-003',
    type: 'recommendation',
    severity: 'info',
    title: 'Recommendation: Enable DNS Tunneling Detection',
    description: 'Based on recent threat intelligence, enabling DNS tunneling detection is recommended.',
    timestamp: '2024-01-15T10:15:00Z',
    actionRequired: false,
  },
  {
    id: 'alert-004',
    type: 'performance_drop',
    severity: 'warning',
    title: 'Inference Latency Increase',
    description: 'Average inference time increased from 12ms to 28ms. Check resource utilization.',
    timestamp: '2024-01-15T09:00:00Z',
    actionRequired: true,
  },
];

// Generate heatmap data (24 hours x 7 days)
const generateHeatmapData = (): HeatmapData => {
  const data: number[][] = [];
  let maxVal = 0;
  
  for (let day = 0; day < 7; day++) {
    const dayData: number[] = [];
    for (let hour = 0; hour < 24; hour++) {
      // Simulate higher activity during business hours and weekdays
      const isWeekend = day >= 5;
      const isBusinessHours = hour >= 8 && hour <= 18;
      
      let baseValue = Math.random() * 50 + 10;
      if (!isWeekend && isBusinessHours) baseValue *= 2.5;
      if (hour === 12 || hour === 17) baseValue *= 1.5; // Lunch and end of day spikes
      
      const value = Math.floor(baseValue);
      dayData.push(value);
      maxVal = Math.max(maxVal, value);
    }
    data.push(dayData);
  }
  
  return {
    hour: Array.from({ length: 24 }, (_, i) => i),
    day: data,
    maxValue: maxVal,
  };
};

const heatmapData = generateHeatmapData();

// ============================================================
// SUB-COMPONENTS
// ============================================================

/** Status Badge Component */
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; label: string }> = {
    active: { variant: 'default', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Active' },
    training: { variant: 'secondary', icon: <RefreshCw className="w-3 h-3 animate-spin" />, label: 'Training' },
    idle: { variant: 'outline', icon: <Pause className="w-3 h-3" />, label: 'Idle' },
    error: { variant: 'destructive', icon: <XCircle className="w-3 h-3" />, label: 'Error' },
  };

  const { variant, icon, label } = config[status] || config.idle;

  return (
    <Badge variant={variant} className="gap-1">
      {icon}
      {label}
    </Badge>
  );
}

/** Severity Badge */
function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
    critical: { variant: 'destructive', color: 'text-red-500' },
    high: { variant: 'secondary', color: 'text-orange-500' },
    medium: { variant: 'outline', color: 'text-yellow-500' },
    low: { variant: 'outline', color: 'text-blue-500' },
    info: { variant: 'outline', color: 'text-gray-500' },
    warning: { variant: 'secondary', color: 'text-yellow-500' },
  };

  const { variant, color } = config[severity] || config.info;

  return (
    <Badge variant={variant} className={color}>
      {severity.toUpperCase()}
    </Badge>
  );
}

/** Trend Indicator */
function TrendIndicator({ trend, percent }: { trend: 'up' | 'down' | 'stable'; percent: number }) {
  if (trend === 'up') {
    return (
      <span className="flex items-center gap-1 text-red-500">
        <TrendingUp className="w-4 h-4" />
        <span>+{Math.abs(percent).toFixed(1)}%</span>
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="flex items-center gap-1 text-green-500">
        <TrendingDown className="w-4 h-4" />
        <span>{percent.toFixed(1)}%</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-gray-500">
      <Minus className="w-4 h-4" />
      <span>0%</span>
    </span>
  );
}

/** Progress Circle for metrics */
function MetricCircle({ value, label, size = 'md' }: { value: number; label: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'w-16 h-16', md: 'w-20 h-20', lg: 'w-24 h-24' };
  const textSizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };
  
  const getColor = (v: number) => {
    if (v >= 90) return 'text-green-500';
    if (v >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${sizeClasses[size]} relative`}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-gray-200 dark:text-gray-700"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${value}, 100`}
            className={getColor(value)}
            strokeLinecap="round"
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center ${textSizes[size]} font-semibold ${getColor(value)}`}>
          {value.toFixed(1)}
        </div>
      </div>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
}

/** Heatmap Cell */
function HeatmapCell({ value, maxValue }: { value: number; maxValue: number }) {
  const intensity = value / maxValue;
  
  const getColorClass = () => {
    if (intensity > 0.8) return 'bg-red-500';
    if (intensity > 0.6) return 'bg-orange-400';
    if (intensity > 0.4) return 'bg-yellow-400';
    if (intensity > 0.2) return 'bg-green-300';
    return 'bg-gray-200 dark:bg-gray-700';
  };

  return (
    <div
      className={`${getColorClass()} w-6 h-6 rounded-sm cursor-pointer hover:ring-2 hover:ring-primary transition-all`}
      title={`${value} detections`}
    />
  );
}

/** Loading Skeleton */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px]" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px]" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD COMPONENT
// ============================================================

interface MLEngineDashboardProps {
  className?: string;
  refreshInterval?: number; // ms
}

export function MLEngineDashboard({ className, refreshInterval = 30000 }: MLEngineDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [models, setModels] = useState<ModelStatus[]>(mockModels);
  const [stats, setStats] = useState<DetectionStats>(mockDetectionStats);
  const [trainingJobs, setTrainingJobs] = useState<TrainingJob[]>(mockTrainingJobs);
  const [alerts, setAlerts] = useState<MLAlert[]>(mockAlerts);
  const [features, setFeatures] = useState<FeatureImportance[]>(mockFeatureImportance);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');

  // Simulate data refresh
  const refreshData = useCallback(async () => {
    try {
      // In production, this would fetch from API:
      // const response = await fetch('/api/analytics/ml?action=status');
      // const data = await response.json();
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update timestamps to show refresh
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to refresh ML data:', error);
    }
  }, []);

  useEffect(() => {
    // Initial load
    const init = async () => {
      await new Promise(resolve => setTimeout(resolve, 800)); // Initial loading simulation
      setIsLoading(false);
    };
    init();

    // Set up auto-refresh
    if (refreshInterval > 0) {
      const interval = setInterval(refreshData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refreshData]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary" />
            ML Engine Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Real-time machine learning operations monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Last updated: {lastRefresh.toLocaleTimeString()}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="detections">Detections</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Active Models"
              value={models.filter(m => m.status === 'active').length.toString()}
              subtitle={ `${models.length} total models`}
              icon={<Brain className="w-5 h-5" />}
              trend={{ direction: 'stable', value: 0 }}
            />
            <KPICard
              title="Predictions/hr"
              value={models.reduce((sum, m) => sum + m.predictionsLastHour, 0).toLocaleString()}
              subtitle="Across all models"
              icon={<Activity className="w-5 h-5" />}
              trend={{ direction: 'up', value: 8.3 }}
            />
            <KPICard
              title="Avg Accuracy"
              value={`${(models.reduce((sum, m) => sum + m.accuracy, 0) / models.length).toFixed(1)}%`}
              subtitle="Weighted average"
              icon={<Target className="w-5 h-5" />}
              trend={{ direction: 'up', value: 1.2 }}
            />
            <KPICard
              title="Active Alerts"
              value={alerts.filter(a => a.actionRequired).length.toString()}
              subtitle={`${alerts.length} total alerts`}
              icon={<AlertTriangle className="w-5 h-5" />}
              trend={{ direction: 'down', value: -15 }}
              alert={alerts.some(a => a.severity === 'critical')}
            />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Models Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Model Status
                </CardTitle>
                <CardDescription>Currently deployed ML models</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[320px]">
                  <div className="space-y-3">
                    {models.map(model => (
                      <div
                        key={model.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-md bg-background">
                            {getModelIcon(model.type)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{model.name}</p>
                            <p className="text-xs text-muted-foreground">{model.type.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-3">
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-mono">{model.accuracy.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">F1: {model.f1Score.toFixed(1)}</p>
                          </div>
                          <StatusBadge status={model.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  ML Alerts & Recommendations
                </CardTitle>
                <CardDescription>Actionable insights from ML engine</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[320px]">
                  <div className="space-y-3">
                    {alerts.map(alert => (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-lg border ${
                          alert.severity === 'critical' ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20' :
                          alert.severity === 'warning' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20' :
                          'border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getAlertIcon(alert.type)}
                              <span className="font-medium text-sm truncate">{alert.title}</span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {alert.description}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 ml-2">
                            <SeverityBadge severity={alert.severity} />
                            {alert.actionRequired && (
                              <Badge variant="outline" className="text-xs">
                                Action Required
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          {new Date(alert.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Training Jobs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Play className="w-5 h-5" />
                Training Jobs
              </CardTitle>
              <CardDescription>Active and queued model training</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trainingJobs.map(job => (
                  <div key={job.id} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <StatusBadge 
                          status={job.status === 'completed' ? 'active' : job.status === 'failed' ? 'error' : job.status} 
                        />
                        <div>
                          <p className="font-medium">{job.modelName}</p>
                          <p className="text-xs text-muted-foreground">
                            Started: {job.startedAt !== '-' ? new Date(job.startedAt).toLocaleString() : 'Waiting...'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-mono">
                          Epoch {job.epoch}/{job.totalEpochs}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Loss: {job.loss > 0 ? job.loss.toFixed(4) : '-'}
                        </p>
                      </div>
                    </div>
                    {job.status === 'running' && (
                      <div className="space-y-1">
                        <Progress value={job.progress} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{job.progress}% complete</span>
                          <span>~{job.estimatedRemaining} remaining</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Model Registry</CardTitle>
              <CardDescription>All registered machine learning models</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>F1 Score</TableHead>
                    <TableHead>Predictions/hr</TableHead>
                    <TableHead>Last Trained</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map(model => (
                    <TableRow key={model.id}>
                      <TableCell className="font-medium">{model.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{model.type.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell><StatusBadge status={model.status} /></TableCell>
                      <TableCell>
                        <span className={model.accuracy >= 90 ? 'text-green-600' : model.accuracy >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                          {model.accuracy.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>{model.f1Score.toFixed(1)}%</TableCell>
                      <TableCell>{model.predictionsLastHour.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(model.lastTrained).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Model Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {models.slice(0, 4).map(model => (
              <Card key={model.id}>
                <CardContent className="pt-6">
                  <MetricCircle
                    value={model.accuracy}
                    label={model.name.split(' ')[0]}
                    size="sm"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Detections Tab */}
        <TabsContent value="detections" className="space-y-6">
          {/* Detection Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-red-500">{stats.bySeverity.critical}</p>
                <p className="text-sm text-muted-foreground">Critical</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-orange-500">{stats.bySeverity.high}</p>
                <p className="text-sm text-muted-foreground">High</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-yellow-500">{stats.bySeverity.medium}</p>
                <p className="text-sm text-muted-foreground">Medium</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-blue-500">{stats.bySeverity.low}</p>
                <p className="text-sm text-muted-foreground">Low</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Detection Types Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detection Types</CardTitle>
                <CardDescription>Breakdown by threat category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.byType)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 8)
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getDetectionIcon(type)}
                          <span className="text-sm capitalize">{type.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={(count / stats.totalDetections) * 100} 
                            className="w-20 h-2" 
                          />
                          <span className="text-sm font-mono w-10 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Activity Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detection Heatmap</CardTitle>
                <CardDescription>Detection activity by time (last 7 days)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full">
                    <div className="flex">
                      <div className="flex flex-col justify-around pr-2 text-xs text-muted-foreground">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                          <span key={day} className="h-6 leading-6">{day}</span>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <div className="flex gap-1 mb-1">
                          {Array.from({ length: 24 }, (_, i) => (
                            <span key={i} className="w-6 text-center text-xs text-muted-foreground">
                              {i % 6 === 0 ? i : ''}
                            </span>
                          ))}
                        </div>
                        {heatmapData.day.map((dayData, dayIdx) => (
                          <div key={dayIdx} className="flex gap-1">
                            {dayData.map((value, hourIdx) => (
                              <HeatmapCell
                                key={`${dayIdx}-${hourIdx}`}
                                value={value}
                                maxValue={heatmapData.maxValue}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
                  <span>Less</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-700" />
                    <div className="w-3 h-3 rounded-sm bg-green-300" />
                    <div className="w-3 h-3 rounded-sm bg-yellow-400" />
                    <div className="w-3 h-3 rounded-sm bg-orange-400" />
                    <div className="w-3 h-3 rounded-sm bg-red-500" />
                  </div>
                  <span>More</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trend Indicator */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Overall Detection Trend (24h)</span>
                <TrendIndicator trend={stats.trend} percent={stats.trendPercent} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feature Importance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Feature Importance
                </CardTitle>
                <CardDescription>Top features influencing model decisions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {features.map((feature, idx) => (
                    <div key={feature.name} className="flex items-center gap-3">
                      <span className="w-6 text-sm text-muted-foreground">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm truncate">{feature.name.replace(/_/g, ' ')}</span>
                          <span className="text-sm font-mono ml-2">
                            {(feature.importance * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={feature.importance * 100} className="h-2" />
                      </div>
                      {feature.trend !== 'stable' && (
                        feature.trend === 'up' 
                          ? <TrendingUp className="w-4 h-4 text-green-500 flex-shrink-0" />
                          : <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Model Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Model Comparison
                </CardTitle>
                <CardDescription>Performance metrics across models</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {models.map(model => (
                    <div key={model.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{model.name}</span>
                        <StatusBadge status={model.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Accuracy</span>
                            <span>{model.accuracy}%</span>
                          </div>
                          <Progress value={model.accuracy} className="h-1.5" />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">F1 Score</span>
                            <span>{model.f1Score}%</span>
                          </div>
                          <Progress value={model.f1Score} className="h-1.5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Telecom-Specific Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Telecom Fraud Detection Metrics
              </CardTitle>
              <CardDescription>Fraud-specific ML model performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[
                  { label: 'SIM Swap', value: 94.2, icon: <Shield className="w-4 h-4" /> },
                  { label: 'IRSF', value: 97.8, icon: <Globe className="w-4 h-4" /> },
                  { label: 'PRS Fraud', value: 91.5, icon: <DollarSign className="w-4 h-4" /> },
                  { label: 'Bypass', value: 88.3, icon: <Wifi className="w-4 h-4" /> },
                  { label: 'Wangiri', value: 93.1, icon: <Radio className="w-4 h-4" /> },
                  { label: 'Subscription', value: 89.7, icon: <Users className="w-4 h-4" /> },
                ].map(metric => (
                  <div key={metric.label} className="text-center p-3 rounded-lg border">
                    <div className="flex justify-center mb-2 text-muted-foreground">
                      {metric.icon}
                    </div>
                    <p className="text-lg font-bold">{metric.value}%</p>
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// HELPER COMPONENTS
// ============================================================

/** KPI Card Component */
function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  alert = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend: { direction: 'up' | 'down' | 'stable'; value: number };
  alert?: boolean;
}) {
  return (
    <Card className={alert ? 'border-red-200 dark:border-red-900' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <div className="flex items-center gap-2 mt-1">
              <TrendIndicator trend={trend.direction} percent={trend.value} />
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            </div>
          </div>
          <div className={`p-2.5 rounded-lg ${alert ? 'bg-red-100 dark:bg-red-900/30' : 'bg-primary/10'}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Get icon for model type */
function getModelIcon(type: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    neural_network: <Brain className="w-4 h-4 text-blue-500" />,
    isolation_forest: <TreeIcon className="w-4 h-4 text-green-500" />,
    ensemble: <Layers className="w-4 h-4 text-purple-500" />,
    gradient_boosting: <Zap className="w-4 h-4 text-yellow-500" />,
    rule_based_ml: <FileText className="w-4 h-4 text-gray-500" />,
  };
  return icons[type] || <Cpu className="w-4 h-4" />;
}

/** Tree icon (not in lucide) */
function TreeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22v-7" />
      <path d="M12 15c-3 0-6-2-6-5 0-2 1-3 2-4 1-1 2-2 4-2s3 1 4 2c1 1 2 2 2 4c0 3-3 5-6 5z" />
    </svg>
  );
}

/** Get icon for alert type */
function getAlertIcon(type: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    model_drift: <LineChart className="w-4 h-4 text-blue-500" />,
    performance_drop: <TrendingDown className="w-4 h-4 text-orange-500" />,
    anomaly_spike: <Activity className="w-4 h-4 text-red-500" />,
    recommendation: <Sparkles className="w-4 h-4 text-green-500" />,
  };
  return icons[type] || <Info className="w-4 h-4" />;
}

/** Get icon for detection type */
function getDetectionIcon(type: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    ddos_volumetric: <Network className="w-4 h-4 text-red-500" />,
    port_scan: <Search className="w-4 h-4 text-orange-500" />,
    c2_beaconing: <Radio className="w-4 h-4 text-purple-500" />,
    dns_tunneling: <Globe className="w-4 h-4 text-blue-500" />,
    lateral_movement: <Users className="w-4 h-4 text-yellow-500" />,
    sim_swap_fraud: <Shield className="w-4 h-4 text-pink-500" />,
    irsf: <Phone className="w-4 h-4 text-green-500" />,
    prs_fraud: <DollarSign className="w-4 h-4 text-cyan-500" />,
    ss7_tracking: <Lock className="w-4 h-4 text-indigo-500" />,
    bypass_fraud: <Wifi className="w-4 h-4 text-teal-500" />,
  };
  return icons[type] || <Bug className="w-4 h-4" />;
}

// ============================================================
// EXPORTS
// ============================================================

export default MLEngineDashboard;

export type {
  ModelStatus,
  DetectionStats,
  TrainingJob,
  FeatureImportance,
  MLAlert,
  HeatmapData,
};
