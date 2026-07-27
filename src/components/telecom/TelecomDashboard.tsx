'use client';

/**
 * National SOC Platform - Telecom Monitoring Dashboard
 * 
 * Real-time visualization of:
 * - SS7/GTP/SIP/Diameter message flows
 * - Fraud detection alerts
 * - Network element status
 * - Subscriber risk scores
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Types
interface ProbeStatus {
  id: string;
  name: string;
  type: string;
  status: string;
  messagesProcessed: number;
}

interface TelecomMetrics {
  ss7: {
    messagesPerSecond: number;
    blockedMessages: number;
    subscriberRiskScores: { high: number; medium: number; low: number };
  };
  gtp: {
    activeSessions: number;
    dataVolumeGB: number;
    roamingSessions: number;
    anomalyCount: number;
  };
  sip: {
    activeCalls: number;
    fraudSuspectedCalls: number;
    averageCallDuration: number;
  };
  diameter: {
    activeSessions: number;
    authenticationFailures: number;
    locationUpdates: number;
  };
}

interface FraudAlert {
  id: string;
  title: string;
  severity: string;
  firstSeen: string;
  type: string;
}

// Icons (using emoji for simplicity)
const ProtocolIcons = {
  ss7: '📡',
  gtp: '📱',
  sip: '☎️',
  diameter: '🔵',
};

const SeverityColors = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-green-500 text-white',
  info: 'bg-blue-500 text-white',
};

export default function TelecomDashboard() {
  const [probes, setProbes] = useState<ProbeStatus[]>([]);
  const [metrics, setMetrics] = useState<TelecomMetrics | null>(null);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/telecom/probes?action=dashboard');
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const data = await response.json();
      
      setProbes(data.dashboard?.probes?.probes || []);
      setMetrics(data.dashboard?.metrics?.current || null);
      setFraudAlerts(data.dashboard?.recentFraudAlerts || []);
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('Error fetching telecom data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  // Connect to probe
  const handleConnectProbe = async (probeType: string) => {
    try {
      const response = await fetch('/api/telecom/probes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          type: probeType,
          host: `probe-${probeType}.djezzy.dz`,
          port: probeType === 'ss7' ? 2905 : probeType === 'gtp' ? 2123 : probeType === 'sip' ? 5060 : 3868,
          protocol: 'tcp'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        fetchData(); // Refresh data
      }
      alert(result.message || result.error);
    } catch (error) {
      alert('Failed to connect to probe');
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            🛰️ Telecom Monitoring Center
            <Badge variant="outline" className="text-green-400 border-green-400">
              LIVE
            </Badge>
          </h1>
          <p className="text-gray-400 mt-2">
            Djezzy Network Security Operations - Real-time Probe Monitoring
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <span className="text-sm text-gray-400">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={fetchData} variant="outline" size="sm">
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">📊 Overview</TabsTrigger>
          <TabsTrigger value="probes">🔌 Probes</TabsTrigger>
          <TabsTrigger value="fraud">🚨 Fraud</TabsTrigger>
          <TabsTrigger value="subscribers">👥 Subscribers</TabsTrigger>
          <TabsTrigger value="network">🏗️ Network</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="SS7 Messages/sec"
              value={metrics?.ss7.messagesPerSecond || 0}
              icon="📡"
              trend={metrics?.ss7.blockedMessages > 0 ? 'warning' : 'normal'}
              subtitle={`${metrics?.ss7.blockedMessages || 0} blocked`}
            />
            <MetricCard
              title="Active GTP Sessions"
              value={metrics?.gtp.activeSessions || 0}
              icon="📱"
              trend={metrics?.gtp.anomalyCount > 10 ? 'warning' : 'normal'}
              subtitle={`${metrics?.gtp.roamingSessions || 0} roaming`}
            />
            <MetricCard
              title="Active SIP Calls"
              value={metrics?.sip.activeCalls || 0}
              icon="☎️"
              trend={metrics?.sip.fraudSuspectedCalls > 5 ? 'danger' : 'normal'}
              subtitle={`${metrics?.sip.averageCallDuration || 0}s avg`}
            />
            <MetricCard
              title="Diameter Sessions"
              value={metrics?.diameter.activeSessions || 0}
              icon="🔵"
              trend={metrics?.diameter.authenticationFailures > 20 ? 'danger' : 'normal'}
              subtitle={`${metrics?.diameter.locationUpdates || 0} updates/h`}
            />
          </div>

          {/* Risk Score Distribution */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Subscriber Risk Distribution</CardTitle>
              <CardDescription>Current risk score distribution across active subscribers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <RiskBar label="High Risk (>70)" count={metrics?.ss7.subscriberRiskScores.high || 0} color="red" max={100} />
                <RiskBar label="Medium Risk (40-70)" count={metrics?.ss7.subscriberRiskScores.medium || 0} color="yellow" max={200} />
                <RiskBar label="Low Risk (<40)" count={metrics?.ss7.subscriberRiskScores.low || 0} color="green" max={10000} />
              </div>
            </CardContent>
          </Card>

          {/* Recent Fraud Alerts */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                Recent Fraud Alerts
                <Badge variant="destructive">{fraudAlerts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fraudAlerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className={SeverityColors[alert.severity as keyof typeof SeverityColors] || 'bg-gray-500'}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <span className="text-white text-sm">{alert.title}</span>
                    </div>
                    <span className="text-gray-400 text-xs">
                      {new Date(alert.firstSeen).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                
                {fraudAlerts.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No recent fraud alerts 🎉</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Probes Tab */}
        <TabsContent value="probes" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {['ss7', 'gtp', 'sip', 'diameter'].map((type) => {
              const probe = probes.find(p => p.type === type);
              return (
                <Card key={type} className={`border-2 ${probe?.status === 'connected' ? 'border-green-500' : 'border-gray-700'} bg-gray-900`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-4xl">{ProtocolIcons[type as keyof typeof ProtocolIcons]}</span>
                      <Badge variant={probe?.status === 'connected' ? 'default' : 'secondary'}>
                        {probe?.status || 'disconnected'}
                      </Badge>
                    </div>
                    
                    <h3 className="text-white font-semibold mb-2 capitalize">
                      {type.toUpperCase()} Probe
                    </h3>
                    
                    <p className="text-gray-400 text-sm mb-4">
                      {probe?.messagesProcessed?.toLocaleString() || 0} messages processed
                    </p>
                    
                    <Button
                      onClick={() => handleConnectProbe(type)}
                      disabled={probe?.status === 'connected'}
                      className="w-full"
                      variant={probe?.status === 'connected' ? 'outline' : 'default'}
                    >
                      {probe?.status === 'connected' ? '✓ Connected' : 'Connect'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Probe Details Table */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Probe Connection Details</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-400 pb-3">Probe ID</th>
                    <th className="text-left text-gray-400 pb-3">Name</th>
                    <th className="text-left text-gray-400 pb-3">Type</th>
                    <th className="text-left text-gray-400 pb-3">Status</th>
                    <th className="text-right text-gray-400 pb-3">Messages</th>
                  </tr>
                </thead>
                <tbody>
                  {probes.map((probe) => (
                    <tr key={probe.id} className="border-b border-gray-800">
                      <td className="py-3 text-white font-mono text-xs">{probe.id}</td>
                      <td className="py-3 text-white">{probe.name}</td>
                      <td className="py-3">
                        <Badge variant="outline">{probe.type.toUpperCase()}</Badge>
                      </td>
                      <td className="py-3">
                        <Badge className={
                          probe.status === 'connected' ? 'bg-green-500/20 text-green-400' :
                          'bg-red-500/20 text-red-400'
                        }>
                          {probe.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right text-white font-mono">
                        {probe.messagesProcessed.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  
                  {probes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No probes connected. Click "Connect" above to start monitoring.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fraud Tab */}
        <TabsContent value="fraud" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-red-900/30 to-red-800/10 border-red-800">
              <CardContent className="pt-6">
                <div className="text-4xl mb-2">🚨</div>
                <div className="text-3xl font-bold text-red-400">
                  {fraudAlerts.length}
                </div>
                <p className="text-red-300/80 text-sm">Active Fraud Alerts</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/10 border-yellow-800">
              <CardContent className="pt-6">
                <div className="text-4xl mb-2">⚠️</div>
                <div className="text-3xl font-bold text-yellow-400">
                  {fraudAlerts.filter(a => a.severity === 'high').length}
                </div>
                <p className="text-yellow-300/80 text-sm">High Severity Cases</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/10 border-blue-800">
              <CardContent className="pt-6">
                <div className="text-4xl mb-2">📋</div>
                <div className="text-3xl font-bold text-blue-400">
                  {fraudAlerts.filter(a => a.severity === 'critical').length}
                </div>
                <p className="text-blue-300/80 text-sm">ARTP Reportable</p>
              </CardContent>
            </Card>
          </div>

          {/* Fraud Alerts List */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Recent Fraud Detection Events</CardTitle>
              <CardDescription>Automated fraud detection alerts from telecom probes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fraudAlerts.map((alert) => (
                  <Alert key={alert.id} className={
                    alert.severity === 'critical' ? 'border-red-500 bg-red-950/20' :
                    alert.severity === 'high' ? 'border-orange-500 bg-orange-950/20' :
                    'border-yellow-500 bg-yellow-950/20'
                  }>
                    <AlertTitle className="flex items-center gap-2">
                      <Badge className={
                        alert.severity === 'critical' ? 'bg-red-500' :
                        alert.severity === 'high' ? 'bg-orange-500' :
                        'bg-yellow-500'
                      }>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      {alert.title}
                    </AlertTitle>
                    <AlertDescription className="mt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Type: {alert.type.replace(/_/g, ' ')}</span>
                        <span>{new Date(alert.firstSeen).toLocaleString()}</span>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
                
                {fraudAlerts.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🛡️</div>
                    <p className="text-gray-400 text-lg">No fraud detected</p>
                    <p className="text-gray-500 text-sm mt-2">
                      All telecom traffic appears normal
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscribers Tab */}
        <TabsContent value="subscribers" className="space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">High-Risk Subscribers</CardTitle>
              <CardDescription>Subscribers with elevated risk scores requiring investigation</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-center py-12">
                Loading subscriber data... (Connect probes to see real data)
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Network Elements Tab */}
        <TabsContent value="network" className="space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Network Infrastructure</CardTitle>
              <CardDescription>Djezzy network elements and their current status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'HLR-Algiers', type: 'HLR', status: 'OPERATIONAL', location: 'Algiers' },
                  { name: 'MSC-Oran', type: 'MSC', status: 'OPERATIONAL', location: 'Oran' },
                  { name: 'SGSN-Central', type: 'SGSN', status: 'DEGRADED', location: 'Algiers' },
                  { name: 'GGSN-Primary', type: 'GGSN', status: 'OPERATIONAL', location: 'Algiers' },
                  { name: 'IMS-Core', type: 'IMS', status: 'MAINTENANCE', location: 'Constantine' },
                  { name: 'STP-East', type: 'STP', status: 'OPERATIONAL', location: 'Batna' },
                ].map((element, idx) => (
                  <Card key={idx} className={`border ${
                    element.status === 'OPERATIONAL' ? 'border-green-600' :
                    element.status === 'DEGRADED' ? 'border-yellow-600' :
                    'border-red-600'
                  } bg-gray-800`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          {element.type}
                        </Badge>
                        <div className={`w-3 h-3 rounded-full ${
                          element.status === 'OPERATIONAL' ? 'bg-green-500 animate-pulse' :
                          element.status === 'DEGRADED' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`} />
                      </div>
                      <h4 className="text-white font-semibold">{element.name}</h4>
                      <p className="text-gray-400 text-sm">{element.location}</p>
                      
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <span className={`text-xs font-medium ${
                          element.status === 'OPERATIONAL' ? 'text-green-400' :
                          element.status === 'DEGRADED' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {element.status}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, icon, trend, subtitle }: {
  title: string;
  value: number | string;
  icon: string;
  trend: 'normal' | 'warning' | 'danger';
  subtitle?: string;
}) {
  return (
    <Card className={`bg-gray-900 border-2 ${
      trend === 'danger' ? 'border-red-500' :
      trend === 'warning' ? 'border-yellow-500' :
      'border-gray-700'
    }`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-3xl">{icon}</span>
          <div className={`w-3 h-3 rounded-full ${
            trend === 'danger' ? 'bg-red-500 animate-pulse' :
            trend === 'warning' ? 'bg-yellow-500' :
            'bg-green-500'
          }`} />
        </div>
        
        <div className="text-3xl font-bold text-white mb-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        
        <p className="text-gray-400 text-sm font-medium">{title}</p>
        
        {subtitle && (
          <p className="text-gray-500 text-xs mt-2">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Risk Bar Component
function RiskBar({ label, count, color, max }: {
  label: string;
  count: number;
  color: string;
  max: number;
}) {
  const percentage = Math.min((count / max) * 100, 100);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className={`font-medium text-${color}-400`}>{count}</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div
          className={`bg-${color}-500 h-2 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
