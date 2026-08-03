'use client';

/**
 * Djezzy SOC Platform - Load Test Results Visualization
 * 
 * Component for displaying load test results from k6/Locust/JMeter:
 * - Response time distributions
 * - Throughput over time
 * - Error rate tracking
 * - User simulation visualization
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Activity,
  Download,
  RefreshCw
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface LoadTestResult {
  id: string;
  name: string;
  type: 'dashboard' | 'api-stress' | 'ingestion' | 'concurrent' | 'soak';
  status: 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number; // seconds
  
  // Metrics
  totalRequests: number;
  requestsPerSecond: number;
  
  // Response times (ms)
  responseTimeMin: number;
  responseTimeAvg: number;
  responseTimeP50: number;
  responseTimeP90: number;
  responseTimeP95: number;
  responseTimeP99: number;
  responseTimeMax: number;
  
  // Errors
  errorCount: number;
  errorRate: number; // percentage
  
  // Concurrency
  virtualUsers: number;
  peakVirtualUsers: number;
  
  // Throughput for ingestion tests
  epsCurrent?: number;
  epsTarget?: number;
}

interface TestRunHistory {
  runs: LoadTestResult[];
  baseline: Record<string, number>;
}

// ============================================================
// DEMO DATA
// ============================================================

const DEMO_RESULTS: LoadTestResult[] = [
  {
    id: 'run-001',
    name: 'Dashboard Load Test',
    type: 'dashboard',
    status: 'completed',
    startTime: new Date(Date.now() - 3600000),
    endTime: new Date(),
    duration: 1800,
    totalRequests: 1250000,
    requestsPerSecond: 694,
    responseTimeMin: 12,
    responseTimeAvg: 145,
    responseTimeP50: 120,
    responseTimeP90: 280,
    responseTimeP95: 420,
    responseTimeP99: 890,
    responseTimeMax: 2450,
    errorCount: 450,
    errorRate: 0.036,
    virtualUsers: 10000,
    peakVirtualUsers: 10000,
  },
  {
    id: 'run-002',
    name: 'API Stress Test',
    type: 'api-stress',
    status: 'completed',
    startTime: new Date(Date.now() - 7200000),
    endTime: new Date(Date.now() - 5400000),
    duration: 1800,
    totalRequests: 8900000,
    requestsPerSecond: 4944,
    responseTimeMin: 3,
    responseTimeAvg: 45,
    responseTimeP50: 32,
    responseTimeP90: 85,
    responseTimeP95: 142,
    responseTimeP99: 380,
    responseTimeMax: 1200,
    errorCount: 1200,
    errorRate: 0.013,
    virtualUsers: 2000,
    peakVirtualUsers: 2000,
  },
  {
    id: 'run-003',
    name: 'Ingestion Throughput',
    type: 'ingestion',
    status: 'completed',
    startTime: new Date(Date.now() - 10800000),
    endTime: new Date(Date.now() - 9000000),
    duration: 1800,
    totalRequests: 945000000,
    requestsPerSecond: 525000,
    responseTimeMin: 1,
    responseTimeAvg: 18,
    responseTimeP50: 15,
    responseTimeP90: 28,
    responseTimeP95: 42,
    responseTimeP99: 85,
    responseTimeMax: 250,
    errorCount: 50000,
    errorRate: 0.005,
    virtualUsers: 1000,
    peakVirtualUsers: 1000,
    epsCurrent: 525000,
    epsTarget: 500000,
  },
];

const BASELINE_TARGETS = {
  p95_response_time_ms: 200,
  error_rate_percent: 0.1,
  throughput_rps: 10000,
  concurrent_users: 10000,
  eps_target: 500000,
};

// ============================================================
// COMPONENT
// ============================================================

export function LoadTestResults() {
  const [selectedRun, setSelectedRun] = useState<LoadTestResult>(DEMO_RESULTS[0]);
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7" />
            Load Test Results
          </h2>
          <p className="text-muted-foreground mt-1">
            Performance test execution history and analysis
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Test Run Selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Test Runs:</span>
            {DEMO_RESULTS.map((run) => (
              <button
                key={run.id}
                onClick={() => setSelectedRun(run)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all whitespace-nowrap ${
                  selectedRun.id === run.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <span className="flex items-center gap-2">
                  {getStatusIcon(run.status)}
                  {run.name}
                  <Badge variant={run.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                    {run.type}
                  </Badge>
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="response-times">Response Times</TabsTrigger>
          <TabsTrigger value="throughput">Throughput</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title="Total Requests"
              value={selectedRun.totalRequests.toLocaleString()}
              icon={<Activity className="w-5 h-5" />}
              subtitle={`${selectedRun.requestsPerSecond.toLocaleString()} req/s`}
            />
            <SummaryCard
              title="P95 Latency"
              value={`${selectedRun.responseTimeP95}ms`}
              icon={<Clock className="w-5 h-5" />}
              subtitle={`Target: <${BASELINE_TARGETS.p95_response_time_ms}ms`}
              status={selectedRun.responseTimeP95 <= BASELINE_TARGETS.p95_response_time_ms ? 'good' : 'warning'}
            />
            <SummaryCard
              title="Error Rate"
              value={`${selectedRun.errorRate.toFixed(3)}%`}
              icon={<AlertTriangle className="w-5 h-5" />}
              subtitle={`${selectedRun.errorCount.toLocaleString()} errors`}
              status={selectedRun.errorRate <= BASELINE_TARGETS.error_rate_percent ? 'good' : 'critical'}
            />
            <SummaryCard
              title="Peak VUs"
              value={selectedRun.peakVirtualUsers.toLocaleString()}
              icon={<Users className="w-5 h-5" />}
              subtitle="Virtual users"
            />
          </div>

          {/* EPS Display for Ingestion Tests */}
          {selectedRun.type === 'ingestion' && (
            <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Events Per Second Achieved</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">
                        {(selectedRun.epsCurrent! / 1000).toFixed(0)}K
                      </span>
                      <span className="text-lg text-muted-foreground">EPS</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Target</p>
                    <p className="text-2xl font-semibold">
                      {(selectedRun.epsTarget! / 1000).toFixed(0)}K
                    </p>
                    <Badge 
                      variant={selectedRun.epsCurrent! >= selectedRun.epsTarget! * 0.8 ? 'default' : 'destructive'}
                      className="mt-2"
                    >
                      {((selectedRun.epsCurrent! / selectedRun.epsTarget!) * 100).toFixed(0)}% of target
                    </Badge>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mt-4">
                  <Progress 
                    value={(selectedRun.epsCurrent! / selectedRun.epsTarget!) * 100} 
                    className="h-3"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Baseline Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Baseline Comparison</CardTitle>
              <CardDescription>How this run compares to target thresholds</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <BaselineRow
                  label="P95 Response Time"
                  value={selectedRun.responseTimeP95}
                  unit="ms"
                  target={BASELINE_TARGETS.p95_response_time_ms}
                  lowerIsBetter
                />
                <BaselineRow
                  label="Error Rate"
                  value={selectedRun.errorRate}
                  unit="%"
                  target={BASELINE_TARGETS.error_rate_percent}
                  lowerIsBetter
                />
                <BaselineRow
                  label="Throughput"
                  value={selectedRun.requestsPerSecond}
                  unit="req/s"
                  target={BASELINE_TARGETS.throughput_rps}
                  lowerIsBetter={false}
                />
                {selectedRun.type === 'ingestion' && (
                  <BaselineRow
                    label="EPS Throughput"
                    value={selectedRun.epsCurrent! / 1000}
                    unit="K EPS"
                    target={BASELINE_TARGETS.eps_target / 1000}
                    lowerIsBetter={false}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Response Times Tab */}
        <TabsContent value="response-times" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Response Time Distribution</CardTitle>
              <CardDescription>Percentile breakdown of request latencies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                {[
                  { label: 'Min', value: selectedRun.responseTimeMin },
                  { label: 'Avg', value: selectedRun.responseTimeAvg },
                  { label: 'P50', value: selectedRun.responseTimeP50 },
                  { label: 'P90', value: selectedRun.responseTimeP90 },
                  { label: 'P95', value: selectedRun.responseTimeP95 },
                  { label: 'P99', value: selectedRun.responseTimeP99 },
                  { label: 'Max', value: selectedRun.responseTimeMax },
                ].map((item) => (
                  <div key={item.label} className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground uppercase">{item.label}</div>
                    <div className={`text-xl font-bold mt-1 ${
                      item.value <= 200 ? 'text-green-500' :
                      item.value <= 500 ? 'text-yellow-500' :
                      item.value <= 1000 ? 'text-orange-500' : 'text-red-500'
                    }`}>
                      {item.value}ms
                    </div>
                  </div>
                ))}
              </div>

              {/* Visual Distribution */}
              <div className="mt-8">
                <h4 className="font-medium mb-4">Distribution Visualization</h4>
                <div className="relative h-40 flex items-end gap-1">
                  {generateDistributionBars(selectedRun).map((bar, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t transition-all ${
                        bar.value > 800 ? 'bg-red-500' :
                        bar.value > 400 ? 'bg-orange-500' :
                        bar.value > 200 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ height: `${bar.percentage}%` }}
                      title={`${bar.label}: ${bar.value}ms`}
                    />
                  ))}
                  
                  {/* Threshold lines */}
                  <div className="absolute left-0 right-0 border-t-2 border-dashed border-yellow-500" style={{ bottom: '50%' }} />
                  <div className="absolute left-0 right-0 border-t-2 border-dashed border-red-500" style={{ bottom: '20%' }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>P50</span>
                  <span>P90</span>
                  <span>P95</span>
                  <span>P99</span>
                  <span>Max</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Throughput Tab */}
        <TabsContent value="throughput" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Request Throughput
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-5xl font-bold text-primary mb-2">
                    {selectedRun.requestsPerSecond.toLocaleString()}
                  </div>
                  <p className="text-muted-foreground">requests per second</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Requests</p>
                    <p className="text-xl font-semibold">{selectedRun.totalRequests.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="text-xl font-semibold">{formatDuration(selectedRun.duration || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Virtual Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-5xl font-bold text-primary mb-2">
                    {selectedRun.peakVirtualUsers.toLocaleString()}
                  </div>
                  <p className="text-muted-foreground">peak concurrent users</p>
                </div>
                <div className="mt-6 pt-6 border-t space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average Active</span>
                    <span className="font-mono">{Math.round(selectedRun.peakVirtualUsers * 0.7).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Req/User/Sec</span>
                    <span className="font-mono">{(selectedRun.requestsPerSecond / selectedRun.virtualUsers).toFixed(1)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Error Analysis</CardTitle>
              <CardDescription>Breakdown of failed requests during test</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-muted/50 rounded-lg">
                  <div className={`text-4xl font-bold mb-2 ${
                    selectedRun.errorRate <= 0.1 ? 'text-green-500' :
                    selectedRun.errorRate <= 1 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {selectedRun.errorRate.toFixed(3)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Error Rate</p>
                  <Badge 
                    variant={selectedRun.errorRate <= 0.1 ? 'default' : 'destructive'}
                    className="mt-2"
                  >
                    {selectedRun.errorRate <= 0.1 ? 'Within Target' : 'Exceeds Target'}
                  </Badge>
                </div>
                
                <div className="text-center p-6 bg-muted/50 rounded-lg">
                  <div className="text-4xl font-bold mb-2">{selectedRun.errorCount.toLocaleString()}</div>
                  <p className="text-sm text-muted-foreground">Total Errors</p>
                </div>
                
                <div className="text-center p-6 bg-muted/50 rounded-lg">
                  <div className="text-4xl font-bold mb-2 text-green-500">
                    {((100 - selectedRun.errorRate)).toFixed(2)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </div>
              </div>

              {/* Error Categories (Demo) */}
              <div className="mt-8 pt-6 border-t">
                <h4 className="font-medium mb-4">Error Breakdown (Sample)</h4>
                <div className="space-y-2">
                  {[
                    { category: 'Timeouts', count: Math.round(selectedRun.errorCount * 0.4), color: 'bg-orange-500' },
                    { category: 'HTTP 5xx', count: Math.round(selectedRun.errorCount * 0.35), color: 'bg-red-500' },
                    { category: 'Connection Errors', count: Math.round(selectedRun.errorCount * 0.15), color: 'bg-yellow-500' },
                    { category: 'Other', count: Math.round(selectedRun.errorCount * 0.1), color: 'bg-gray-500' },
                  ].map((err) => (
                    <div key={err.category} className="flex items-center gap-3">
                      <span className="w-24 text-sm">{err.category}</span>
                      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${err.color}`}
                          style={{ width: `${(err.count / selectedRun.errorCount) * 100}%` }}
                        />
                      </div>
                      <span className="w-16 text-right text-sm font-mono">{err.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
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

function SummaryCard({ 
  title, 
  value, 
  icon, 
  subtitle,
  status 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode;
  subtitle?: string;
  status?: 'good' | 'warning' | 'critical';
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground">{icon}</span>
          {status && (
            <CheckCircle2 className={`w-4 h-4 ${status === 'good' ? 'text-green-500' : 'hidden'}`} />
          )}
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function BaselineRow({
  label,
  value,
  unit,
  target,
  lowerIsBetter
}: {
  label: string;
  value: number;
  unit: string;
  target: number;
  lowerIsBetter: boolean;
}) {
  const passed = lowerIsBetter ? value <= target : value >= target;
  
  return (
    <div className="flex items-center gap-4">
      <span className="w-40 text-sm">{label}</span>
      <div className="flex-1 flex items-center gap-3">
        <span className={`font-mono w-20 text-right ${passed ? 'text-green-500' : 'text-red-500'}`}>
          {value}{unit}
        </span>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${passed ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min((value / target) * 100, 150)}%` }}
          />
        </div>
        <span className="w-24 text-right text-xs text-muted-foreground">
          Target: &lt;{target}{unit}
        </span>
        {passed ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
      </div>
    </div>
  );
}

function getStatusIcon(status: string): React.ReactNode {
  switch (status) {
    case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'running': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
    default: return null;
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function generateDistributionBars(run: LoadTestResult): Array<{ label: string; value: number; percentage: number }> {
  const values = [
    { label: 'Min', value: run.responseTimeMin },
    { label: '', value: (run.responseTimeAvg + run.responseTimeP50) / 2 },
    { label: 'P50', value: run.responseTimeP50 },
    { label: '', value: (run.responseTimeP50 + run.responseTimeP90) / 2 },
    { label: 'P90', value: run.responseTimeP90 },
    { label: 'P95', value: run.responseTimeP95 },
    { label: '', value: (run.responseTimeP95 + run.responseTimeP99) / 2 },
    { label: 'P99', value: run.responseTimeP99 },
    { label: '', value: (run.responseTimeP99 + run.responseTimeMax) / 2 },
    { label: 'Max', value: run.responseTimeMax },
  ];
  
  const maxVal = Math.max(...values.map(v => v.value));
  
  return values.map(v => ({
    ...v,
    percentage: (v.value / maxVal) * 100,
  }));
}

export default LoadTestResults;
