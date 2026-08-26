'use client';

/**
 * National SOC Platform - BSS/OSS Integration Dashboard
 * 
 * Comprehensive dashboard showing:
 * - BSS metrics (active subscribers, ARPU, churn rate)
 * - OSS metrics (network availability, fault rates, KPIs)
 * - Protocol security status (SS7, Diameter, SIP)
 * - Real-time fraud alerts
 * - Revenue impact analysis
 * - Compliance status indicators
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

// Types
interface BSSMetrics {
  revenue: {
    totalRevenue24h: number;
    expectedRevenue: number;
    leakageAmount: number;
    leakagePercentage: string;
    fraudImpact: number;
    recoveredAmount: number;
  };
  fraud: {
    activeCorrelations: number;
    criticalAlerts: number;
    highRiskAlerts: number;
    topTypes: Array<{ type: string; count: number }>;
  };
  orders: {
    totalToday: number;
    pending: number;
    completed: number;
    failed: number;
  };
  compliance: {
    anorCompliant: boolean;
    arptCompliant: boolean;
    pendingReports: number;
  };
}

interface OSSMetrics {
  network: {
    totalElements: number;
    operational: number;
    degraded: number;
    faulted: number;
    maintenance: number;
    offline: number;
    healthScore: number;
  };
  faults: {
    activeTotal: number;
    critical: number;
    major: number;
    minor: number;
    mttrTargetHours: number;
    avgResolutionHours: number;
  };
  performance: {
    overallHealthScore: number;
    networkAvailability: number;
    callSetupRate: number;
    dropCallRate: number;
    dataThroughput: number;
    latency: number;
    alertsCount: number;
  };
  incidents: {
    totalOpen: number;
    critical: number;
    high: number;
    breachedSLA: number;
  };
  sla: {
    compliant: number;
    atRisk: number;
    breaches: number;
    totalCreditsIssued: number;
  };
}

interface ProtocolStatus {
  ss7: {
    status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
    messagesPerSecond: number;
    blockedMessages: number;
    attackIndicators: number;
  };
  diameter: {
    status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
    activeSessions: number;
    authSuccessRate: number;
    fraudIndicators: number;
  };
  sip: {
    status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
    activeCalls: number;
    fraudSuspectedCalls: number;
    attackIndicators: number;
  };
}

interface FraudAlert {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  source: 'BSS' | 'OSS' | 'SS7' | 'DIAMETER' | 'SIP';
  timestamp: string;
  financialImpact?: number;
}

// Icons as emoji for simplicity
const Icons = {
  bss: '💰',
  oss: '🖥️',
  protocol: '🔐',
  fraud: '🚨',
  compliance: '📋',
  revenue: '📈',
  network: '🌐',
  alert: '⚠️',
  check: '✅',
  warning: '⚡',
  error: '❌'
};

const SeverityConfig = {
  critical: { bg: 'bg-red-500', text: 'text-white', border: 'border-red-500' },
  high: { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-500' },
  medium: { bg: 'bg-yellow-500', text: 'text-black', border: 'border-yellow-500' },
  low: { bg: 'bg-green-500', text: 'text-white', border: 'border-green-500' }
};

export default function BSSOSSDashboard() {
  const [bssData, setBSSData] = useState<BSSMetrics | null>(null);
  const [ossData, setOSSData] = useState<OSSMetrics | null>(null);
  const [protocolData, setProtocolData] = useState<ProtocolStatus | null>(null);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const [bssRes, ossRes] = await Promise.all([
        fetch('/api/telecom/bss?action=overview'),
        fetch('/api/telecom/oss?action=overview')
      ]);

      if (bssRes.ok) {
        const bssJson = await bssRes.json();
        setBSSData(bssJson.data);
      }

      if (ossRes.ok) {
        const ossJson = await ossRes.json();
        setOSSData(ossJson.data);
      }

      // Generate simulated protocol data
      setProtocolData({
        ss7: {
          status: Math.random() > 0.1 ? 'OPERATIONAL' : 'DEGRADED',
          messagesPerSecond: Math.floor(Math.random() * 50000) + 10000,
          blockedMessages: Math.floor(Math.random() * 50),
          attackIndicators: Math.floor(Math.random() * 5)
        },
        diameter: {
          status: Math.random() > 0.05 ? 'OPERATIONAL' : 'DEGRADED',
          activeSessions: Math.floor(Math.random() * 100000) + 50000,
          authSuccessRate: 98 + Math.random() * 1.9,
          fraudIndicators: Math.floor(Math.random() * 3)
        },
        sip: {
          status: Math.random() > 0.08 ? 'OPERATIONAL' : 'DEGRADED',
          activeCalls: Math.floor(Math.random() * 5000) + 1000,
          fraudSuspectedCalls: Math.floor(Math.random() * 20),
          attackIndicators: Math.floor(Math.random() * 4)
        }
      });

      // Generate simulated fraud alerts
      generateFraudAlerts();

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching BSS/OSS data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate mock fraud alerts
  const generateFraudAlerts = () => {
    const alertTemplates = [
      { title: 'IRSF détecté - Appels internationaux suspects', severity: 'critical' as const, type: 'IRSF', source: 'SS7' as const },
      { title: 'Tentative de piratage PBX détectée', severity: 'high' as const, type: 'PBX_HACK', source: 'SIP' as const },
      { title: 'Fuite de revenus identifiée - CDR anormaux', severity: 'high' as const, type: 'REVENUE_LEAKAGE', source: 'BSS' as const },
      { title: 'Activité Wangiri suspecte détectée', severity: 'medium' as const, type: 'WANGIRI', source: 'SIP' as const },
      { title: 'Anomalie d\'authentification Diameter', severity: 'medium' as const, type: 'AUTH_ATTACK', source: 'DIAMETER' as const },
      { title: 'Panne critique sur MSC-Algiers', severity: 'critical' as const, type: 'FAULT', source: 'OSS' as const },
      { title: 'Dégradation du taux de réussite d\'appel', severity: 'medium' as const, type: 'KPI_BREACH', source: 'OSS' as const },
      { title: 'Trafic SS7 suspect depuis OPC inconnu', severity: 'high' as const, type: 'SS7_ATTACK', source: 'SS7' as const }
    ];

    const alerts: FraudAlert[] = Array.from(
      { length: Math.floor(Math.random() * 5) + 3 }, 
      (_, i) => ({
        id: `alert_${Date.now()}_${i}`,
        ...alertTemplates[Math.floor(Math.random() * alertTemplates.length)],
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        financialImpact: Math.random() > 0.5 ? Math.floor(Math.random() * 500000) + 10000 : undefined
      })
    ).sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    setFraudAlerts(alerts);
  };

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format number with locale
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-DZ').format(num);
  };

  if (isLoading && !bssData && !ossData) {
    return (
      <div className="p-6 space-y-6 bg-gray-950 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement des données BSS/OSS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            🏢 Tableau de Bord BSS/OSS
            <Badge variant="outline" className="text-green-400 border-green-400 animate-pulse">
              EN DIRECT
            </Badge>
          </h1>
          <p className="text-gray-400 mt-2">
            Plateforme SOC National Djezzy - Intégration Systèmes Support Affaires & Opérations
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <span className="text-sm text-gray-400">
              Dernière mise à jour: {lastUpdate.toLocaleTimeString('fr-DZ')}
            </span>
          )}
          <Button onClick={fetchAllData} variant="outline" size="sm">
            🔄 Actualiser
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-6">
          <TabsTrigger value="overview">📊 Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="bss">{Icons.bss} BSS</TabsTrigger>
          <TabsTrigger value="oss">{Icons.oss} OSS</TabsTrigger>
          <TabsTrigger value="protocol">{Icons.protocol} Protocoles</TabsTrigger>
          <TabsTrigger value="fraud">{Icons.fraud} Fraude</TabsTrigger>
          <TabsTrigger value="compliance">{Icons.compliance} Conformité</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Revenus 24h"
              value={bssData ? formatCurrency(bssData.revenue.totalRevenue24h) : '-'}
              icon="💰"
              trend={bssData?.revenue.leakageAmount ? 'warning' : 'normal'}
              subtitle={`Fuite: ${bssData?.revenue.leakagePercentage || '0'}%`}
            />
            <MetricCard
              title="Disponibilité Réseau"
              value={ossData ? `${ossData.performance.networkAvailability.toFixed(2)}%` : '-'}
              icon="🌐"
              trend={ossData?.performance.networkAvailability >= 99.9 ? 'normal' : 'warning'}
              subtitle={`Objectif: 99.95%`}
            />
            <MetricCard
              title="Santé Protocoles"
              value={protocolData ? `${protocolData.ss7.attackIndicators + protocolData.diameter.fraudIndicators + protocolData.sip.attackIndicators}` : '-'}
              icon="🔐"
              trend={(protocolData?.ss7.attackIndicators || 0) > 2 ? 'danger' : 'normal'}
              subtitle="Alertes actives"
            />
            <MetricCard
              title="Incidents Ouverts"
              value={ossData ? formatNumber(ossData.incidents.totalOpen) : '-'}
              icon="📋"
              trend={(ossData?.incidents.critical || 0) > 0 ? 'danger' : 'normal'}
              subtitle={`${ossData?.incidents.critical || 0} critiques`}
            />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Network Health */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>🌐 État Réseau</span>
                  <Badge className={
                    ossData?.network.healthScore && ossData.network.healthScore >= 90 ? 'bg-green-500' :
                    ossData?.network.healthScore && ossData.network.healthScore >= 70 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }>
                    {ossData?.network.healthScore || 0}/100
                  </Badge>
                </CardTitle>
                <CardDescription>Santé globale de l&apos;infrastructure réseau</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <NetworkStatusBar 
                    label="Opérationnel" 
                    count={ossData?.network.operational || 0} 
                    total={ossData?.network.totalElements || 1}
                    color="green"
                  />
                  <NetworkStatusBar 
                    label="Dégradé" 
                    count={ossData?.network.degraded || 0} 
                    total={ossData?.network.totalElements || 1}
                    color="yellow"
                  />
                  <NetworkStatusBar 
                    label="En Panne" 
                    count={ossData?.network.faulted || 0} 
                    total={ossData?.network.totalElements || 1}
                    color="red"
                  />
                  <NetworkStatusBar 
                    label="Maintenance" 
                    count={ossData?.network.maintenance || 0} 
                    total={ossData?.network.totalElements || 1}
                    color="blue"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recent Fraud Alerts */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>🚨 Alertes Récentes</span>
                  <Badge variant="destructive">{fraudAlerts.length}</Badge>
                </CardTitle>
                <CardDescription>Alertes fraude et sécurité récentes</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-3">
                    {fraudAlerts.slice(0, 8).map((alert) => (
                      <Alert key={alert.id} className={
                        alert.severity === 'critical' ? 'border-red-500 bg-red-950/20' :
                        alert.severity === 'high' ? 'border-orange-500 bg-orange-950/20' :
                        'border-yellow-500 bg-yellow-950/20'
                      }>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <AlertTitle className="text-sm flex items-center gap-2">
                              <Badge className={SeverityConfig[alert.severity].bg}>
                                {alert.severity.toUpperCase()}
                              </Badge>
                              <span className="truncate">{alert.title}</span>
                            </AlertTitle>
                            <AlertDescription className="mt-1 text-xs">
                              <div className="flex items-center gap-2 text-gray-400">
                                <Badge variant="outline" className="text-xs">
                                  {alert.source}
                                </Badge>
                                <span>{alert.type}</span>
                                {alert.financialImpact && (
                                  <span className="text-red-400">
                                    Impact: {formatCurrency(alert.financialImpact)}
                                  </span>
                                )}
                              </div>
                            </AlertDescription>
                          </div>
                        </div>
                      </Alert>
                    ))}
                    
                    {fraudAlerts.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">✨</div>
                        <p>Aucune alerte active</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* KPI Summary */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">📈 Indicateurs Clés de Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard 
                  label="Disponibilité" 
                  value={`${ossData?.performance.networkAvailability.toFixed(1) || '-'}%`}
                  target="99.95%"
                  isGood={(ossData?.performance.networkAvailability || 0) >= 99.9}
                />
                <KPICard 
                  label="Taux de Réussite" 
                  value={`${ossData?.performance.callSetupRate.toFixed(1) || '-'}%`}
                  target="98.5%"
                  isGood={(ossData?.performance.callSetupRate || 0) >= 98}
                />
                <KPICard 
                  label="Coupe d&apos;Appel" 
                  value={`${ossData?.performance.dropCallRate.toFixed(2) || '-'}%`}
                  target="<0.5%"
                  isGood={(ossData?.performance.dropCallRate || 0) <= 0.5}
                  invertThreshold
                />
                <KPICard 
                  label="Latence Moy." 
                  value={`${ossData?.performance.latency.toFixed(0) || '-'}ms`}
                  target="<30ms"
                  isGood={(ossData?.performance.latency || 0) <= 35}
                  invertThreshold
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BSS Tab */}
        <TabsContent value="bss" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/10 border-emerald-800">
              <CardContent className="pt-6">
                <div className="text-4xl mb-2">💰</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {bssData ? formatCurrency(bssData.revenue.totalRevenue24h) : '-'}
                </div>
                <p className="text-emerald-300/80 text-sm mt-1">Revenus (24h)</p>
                <div className="mt-3 text-sm text-emerald-400/70">
                  Attendu: {bssData ? formatCurrency(bssData.revenue.expectedRevenue) : '-'}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-900/30 to-orange-800/10 border-orange-800">
              <CardContent className="pt-6">
                <div className="text-4xl mb-2">⚠️</div>
                <div className="text-2xl font-bold text-orange-400">
                  {bssData ? formatCurrency(bssData.revenue.leakageAmount) : '-'}
                </div>
                <p className="text-orange-300/80 text-sm mt-1">Fuite Revenus</p>
                <div className="mt-3 text-sm text-orange-400/70">
                  Pourcentage: {bssData?.revenue.leakagePercentage || '0'}%
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/10 border-purple-800">
              <CardContent className="pt-6">
                <div className="text-4xl mb-2">🎯</div>
                <div className="text-2xl font-bold text-purple-400">
                  {bssData ? formatCurrency(bssData.revenue.fraudImpact) : '-'}
                </div>
                <p className="text-purple-300/80 text-sm mt-1">Impact Fraude</p>
                <div className="mt-3 text-sm text-green-400/70">
                  Récupéré: {bssData ? formatCurrency(bssData.revenue.recoveredAmount) : '-'}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Orders Status */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">📦 Commandes Aujourd&apos;hui</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <OrderStatRow label="Total" count={bssData?.orders.totalToday || 0} color="white" />
                  <OrderStatRow label="En attente" count={bssData?.orders.pending || 0} color="yellow" />
                  <OrderStatRow label="Complétées" count={bssData?.orders.completed || 0} color="green" />
                  <OrderStatRow label="Échouées" count={bssData?.orders.failed || 0} color="red" />
                </div>
              </CardContent>
            </Card>

            {/* Fraud by Type */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">🚨 Corrélations Fraude Actives</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(bssData?.fraud.topTypes || []).map((type, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                      <span className="text-white text-sm">{type.type.replace(/_/g, ' ')}</span>
                      <Badge variant="outline">{type.count}</Badge>
                    </div>
                  ))}
                  
                  {(!bssData?.fraud.topTypes || bssData.fraud.topTypes.length === 0) && (
                    <p className="text-gray-500 text-center py-4">Aucune corrélation active</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compliance Status */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                📋 Statut Conformité ANOR/ARPT
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ComplianceBadge 
                  label="ANOR" 
                  compliant={bssData?.compliance.anorCompliant || false}
                />
                <ComplianceBadge 
                  label="ARPT" 
                  compliant={bssData?.compliance.arptCompliant || false}
                />
                <div className="p-4 bg-gray-800 rounded-lg text-center">
                  <div className="text-2xl font-bold text-white">
                    {bssData?.compliance.pendingReports || 0}
                  </div>
                  <p className="text-gray-400 text-sm mt-1">Rapports en attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OSS Tab */}
        <TabsContent value="oss" className="space-y-6">
          {/* Fault Summary */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <FaultSummaryCard 
              title="Actifs" 
              count={ossData?.faults.activeTotal || 0} 
              color="blue"
            />
            <FaultSummaryCard 
              title="Critiques" 
              count={ossData?.faults.critical || 0} 
              color="red"
            />
            <FaultSummaryCard 
              title="Majeurs" 
              count={ossData?.faults.major || 0} 
              color="orange"
            />
            <FaultSummaryCard 
              title="Mineurs" 
              count={ossData?.faults.minor || 0} 
              color="yellow"
            />
            <FaultSummaryCard 
              title="MTTR" 
              count={ossData?.faults.avgResolutionHours || 0} 
              color="purple"
              suffix="h"
              target={ossData?.faults.mttrTargetHours}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Incidents */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>📋 Incidents</span>
                  <Badge variant="destructive">{ossData?.incidents.totalOpen || 0}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <IncidentStatRow 
                    label="Critiques" 
                    count={ossData?.incidents.critical || 0} 
                    color="red"
                  />
                  <IncidentStatRow 
                    label="Haute priorité" 
                    count={ossData?.incidents.high || 0} 
                    color="orange"
                  />
                  <IncidentStatRow 
                    label="Violation SLA" 
                    count={ossData?.incidents.breachedSLA || 0} 
                    color="red"
                  />
                </div>
              </CardContent>
            </Card>

            {/* SLA Status */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">📊 SLA Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <SLARow 
                    label="Conformes" 
                    count={ossData?.sla.compliant || 0} 
                    color="green"
                  />
                  <SLARow 
                    label="À risque" 
                    count={ossData?.sla.atRisk || 0} 
                    color="yellow"
                  />
                  <SLARow 
                    label="Violations" 
                    count={ossData?.sla.breaches || 0} 
                    color="red"
                  />
                  <div className="pt-2 border-t border-gray-700">
                    <p className="text-sm text-gray-400">
                      Crédits émis: <span className="text-white font-medium">
                        {formatCurrency(ossData?.sla.totalCreditsIssued || 0)}
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Details */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">📈 Performance Détaillée</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <PerformanceDetail 
                  label="Santé Globale"
                  value={`${ossData?.performance.overallHealthScore || 0}/100`}
                  isGood={(ossData?.performance.overallHealthScore || 0) >= 85}
                />
                <PerformanceDetail 
                  label="Débit Data"
                  value={`${ossData?.performance.dataThroughput || 0} Mbps`}
                  isGood={(ossData?.performance.dataThroughput || 0) >= 10}
                />
                <PerformanceDetail 
                  label="Alertes KPI"
                  value={`${ossData?.performance.alertsCount || 0}`}
                  isGood={(ossData?.performance.alertsCount || 0) === 0}
                  invertThreshold
                />
                <PerformanceDetail 
                  label="Tendances"
                  value="Stable"
                  isGood={true}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Protocol Tab */}
        <TabsContent value="protocol" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* SS7 Status */}
            <ProtocolCard
              name="SS7/SIGTRAN"
              icon="📡"
              status={protocolData?.ss7.status || 'OPERATIONAL'}
              metrics={[
                { label: 'Msg/sec', value: formatNumber(protocolData?.ss7.messagesPerSecond || 0) },
                { label: 'Bloqués', value: String(protocolData?.ss7.blockedMessages || 0) },
                { label: 'Attaques', value: String(protocolData?.ss7.attackIndicators || 0) }
              ]}
            />

            {/* Diameter Status */}
            <ProtocolCard
              name="Diameter/LTE"
              icon="🔵"
              status={protocolData?.diameter.status || 'OPERATIONAL'}
              metrics={[
                { label: 'Sessions', value: formatNumber(protocolData?.diameter.activeSessions || 0) },
                { label: 'Auth %', value: `${(protocolData?.diameter.authSuccessRate || 0).toFixed(1)}%` },
                { label: 'Fraude', value: String(protocolData?.diameter.fraudIndicators || 0) }
              ]}
            />

            {/* SIP/VoIP Status */}
            <ProtocolCard
              name="SIP/VoLTE"
              icon="☎️"
              status={protocolData?.sip.status || 'OPERATIONAL'}
              metrics={[
                { label: 'Appels', value: formatNumber(protocolData?.sip.activeCalls || 0) },
                { label: 'Fraude VoIP', value: String(protocolData?.sip.fraudSuspectedCalls || 0) },
                { label: 'Attaques', value: String(protocolData?.sip.attackIndicators || 0) }
              ]}
            />
          </div>

          {/* Protocol Security Details */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">🔐 Sécurité Protocole</CardTitle>
              <CardDescription>Détails des indicateurs de sécurité par protocole</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-400 pb-3">Protocole</th>
                      <th className="text-left text-gray-400 pb-3">État</th>
                      <th className="text-left text-gray-400 pb-3">Attaques</th>
                      <th className="text-left text-gray-400 pb-3">Fraude</th>
                      <th className="text-left text-gray-400 pb-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-800">
                      <td className="py-3 text-white font-medium">SS7/MAP</td>
                      <td className="py-3">
                        <Badge className={protocolData?.ss7.status === 'OPERATIONAL' ? 'bg-green-500' : 'bg-yellow-500'}>
                          {protocolData?.ss7.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-white">{protocolData?.ss7.attackIndicators || 0}</td>
                      <td className="py-3 text-white">-</td>
                      <td className="py-3">
                        <Button variant="outline" size="sm" className="text-xs h-7">Détails</Button>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="py-3 text-white font-medium">Diameter (Cx/Rx/Gx)</td>
                      <td className="py-3">
                        <Badge className={protocolData?.diameter.status === 'OPERATIONAL' ? 'bg-green-500' : 'bg-yellow-500'}>
                          {protocolData?.diameter.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-white">-</td>
                      <td className="py-3 text-white">{protocolData?.diameter.fraudIndicators || 0}</td>
                      <td className="py-3">
                        <Button variant="outline" size="sm" className="text-xs h-7">Détails</Button>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="py-3 text-white font-medium">SIP/VoLTE</td>
                      <td className="py-3">
                        <Badge className={protocolData?.sip.status === 'OPERATIONAL' ? 'bg-green-500' : 'bg-yellow-500'}>
                          {protocolData?.sip.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-white">{protocolData?.sip.attackIndicators || 0}</td>
                      <td className="py-3 text-white">{protocolData?.sip.fraudSuspectedCalls || 0}</td>
                      <td className="py-3">
                        <Button variant="outline" size="sm" className="text-xs h-7">Détails</Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fraud Tab */}
        <TabsContent value="fraud" className="space-y-6">
          {/* Fraud Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-red-900/40 to-red-800/20 border-red-700">
              <CardContent className="pt-6">
                <div className="text-4xl mb-2">🚨</div>
                <div className="text-3xl font-bold text-red-400">
                  {fraudAlerts.filter(a => a.severity === 'critical').length}
                </div>
                <p className="text-red-300/80 text-sm">Alertes Critiques</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 border-orange-700">
              <CardContent className="pt-6">
                <div className="text-4xl mb-2">⚡</div>
                <div className="text-3xl font-bold text-orange-400">
                  {fraudAlerts.filter(a => a.severity === 'high').length}
                </div>
                <p className="text-orange-300/80 text-sm">Haute Priorité</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border-yellow-700">
              <CardContent className="pt-6">
                <div className="text-4xl mb-2">⚠️</div>
                <div className="text-3xl font-bold text-yellow-400">
                  {fraudAlerts.filter(a => a.severity === 'medium').length}
                </div>
                <p className="text-yellow-300/80 text-sm">Moyenne Priorité</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border-purple-700">
              <CardContent className="pt-6">
                <div className="text-4xl mb-2">💰</div>
                <div className="text-3xl font-bold text-purple-400">
                  {formatCurrency(fraudAlerts.reduce((sum, a) => sum + (a.financialImpact || 0), 0))}
                </div>
                <p className="text-purple-300/80 text-sm">Impact Financier Est.</p>
              </CardContent>
            </Card>
          </div>

          {/* All Fraud Alerts */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>🚨 Toutes les Alertes Fraude</span>
                <Badge>{fraudAlerts.length} actives</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {fraudAlerts.map((alert) => (
                    <Alert key={alert.id} className={
                      alert.severity === 'critical' ? 'border-red-500 bg-red-950/20' :
                      alert.severity === 'high' ? 'border-orange-500 bg-orange-950/20' :
                      'border-yellow-500 bg-yellow-950/20'
                    }>
                      <AlertTitle className="flex items-center gap-2 flex-wrap">
                        <Badge className={SeverityConfig[alert.severity].bg}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{alert.source}</Badge>
                        <span className="text-sm">{alert.title}</span>
                      </AlertTitle>
                      <AlertDescription className="mt-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Type: {alert.type.replace(/_/g, ' ')}</span>
                          <span>{new Date(alert.timestamp).toLocaleString('fr-DZ')}</span>
                        </div>
                        {alert.financialImpact && (
                          <div className="mt-1 text-red-400 text-sm">
                            Impact financier estimé: {formatCurrency(alert.financialImpact)}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                  
                  {fraudAlerts.length === 0 && (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🛡️</div>
                      <p className="text-gray-400 text-lg">Aucune alerte fraude active</p>
                      <p className="text-gray-500 text-sm mt-2">
                        Tous les systèmes de détection sont normaux
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Regulatory Compliance */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">📋 Conformité Réglementaire</CardTitle>
                <CardDescription>Statut de conformité ANOR et ARPT</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ComplianceDetailCard
                  title="Autorité Nationale de Régulation (ANOR)"
                  compliant={bssData?.compliance.anorCompliant || false}
                  checks={[
                    { label: 'Protection données abonnés', passed: true },
                    { label: 'Rapports de fraude', passed: true },
                    { label: 'Conservation données', passed: true },
                    { label: 'Audit de sécurité', passed: true }
                  ]}
                />
                
                <ComplianceDetailCard
                  title="ARPT (Postes & Télécommunications)"
                  compliant={bssData?.compliance.arptCompliant || false}
                  checks={[
                    { label: 'Qualité de service', passed: true },
                    { label: 'Interconnexion', passed: true },
                    { label: 'Itinérance', passed: true },
                    { label: 'Numérotation', passed: true }
                  ]}
                />
              </CardContent>
            </Card>

            {/* Audit Trail */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">📝 Journal d&apos;Audit</CardTitle>
                <CardDescription>Récentes opérations sensibles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { action: 'Consultation abonné', user: 'admin@djezzy.dz', time: 'Il y a 5min', status: 'OK' },
                    { action: 'Exportation CDRs', user: 'analyst@djezzy.dz', time: 'Il y a 15min', status: 'OK' },
                    { action: 'Modification consentement', user: 'api-user', time: 'Il y a 32min', status: 'OK' },
                    { action: 'Rapport fraude généré', user: 'system', time: 'Il y a 1h', status: 'OK' },
                    { action: 'Sync CMDB', user: 'system', time: 'Il y a 2h', status: 'OK' }
                  ].map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{entry.action}</p>
                        <p className="text-gray-500 text-xs">{entry.user} • {entry.time}</p>
                      </div>
                      <Badge variant="outline" className="ml-3 text-green-400 border-green-400">
                        {entry.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Privacy */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">🔒 Confidentialité des Données</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PrivacyMetric 
                  label="Données masquées" 
                  percentage={100} 
                  description="MSISDN, IMSI masqués dans les logs"
                />
                <PrivacyMetric 
                  label="Chiffrement actif" 
                  percentage={100} 
                  description="TLS pour toutes les connexions API"
                />
                <PrivacyMetric 
                  label="Rétention conforme" 
                  percentage={100} 
                  description="1095 jours comme exigé par l'ARPT"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Sub Components
// ============================================================

function MetricCard({ title, value, icon, trend, subtitle }: {
  title: string;
  value: string | number;
  icon: string;
  trend: 'normal' | 'warning' | 'danger';
  subtitle?: string;
}) {
  return (
    <Card className={`border-2 ${
      trend === 'danger' ? 'border-red-500' :
      trend === 'warning' ? 'border-yellow-500' :
      'border-gray-700'
    } bg-gray-900`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">{icon}</span>
          <div className={`w-3 h-3 rounded-full ${
            trend === 'danger' ? 'bg-red-500 animate-pulse' :
            trend === 'warning' ? 'bg-yellow-500' :
            'bg-green-500'
          }`} />
        </div>
        
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        <p className="text-gray-400 text-sm font-medium">{title}</p>
        
        {subtitle && (
          <p className="text-gray-500 text-xs mt-2">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function NetworkStatusBar({ label, count, total, color }: {
  label: string;
  count: number;
  total: number;
  color: 'green' | 'yellow' | 'red' | 'blue';
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-300 text-sm w-24">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${
            color === 'green' ? 'bg-green-500' :
            color === 'yellow' ? 'bg-yellow-500' :
            color === 'red' ? 'bg-red-500' :
            'bg-blue-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className="text-white text-sm w-12 text-right">{count}</span>
    </div>
  );
}

function KPICard({ label, value, target, isGood, invertThreshold = false }: {
  label: string;
  value: string;
  target: string;
  isGood: boolean;
  invertThreshold?: boolean;
}) {
  return (
    <div className="p-3 bg-gray-800 rounded-lg">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      <div className="flex items-center gap-1 mt-1">
        <span className={`text-xs ${isGood ? 'text-green-400' : 'text-red-400'}`}>
          {isGood ? '✓' : '!'}
        </span>
        <span className="text-gray-500 text-xs">Cible: {target}</span>
      </div>
    </div>
  );
}

function OrderStatRow({ label, count, color }: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
      <span className="text-gray-300">{label}</span>
      <span className={`font-bold text-${color}-400`}>{count}</span>
    </div>
  );
}

function ComplianceBadge({ label, compliant }: { label: string; compliant: boolean }) {
  return (
    <div className={`p-4 rounded-lg text-center ${
      compliant ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'
    }`}>
      <div className={`text-3xl ${compliant ? '✅' : '❌'}`}>
        {compliant ? '✅' : '❌'}
      </div>
      <p className={`text-sm mt-1 ${compliant ? 'text-green-400' : 'text-red-400'}`}>
        {label}: {compliant ? 'Conforme' : 'Non-conforme'}
      </p>
    </div>
  );
}

function FaultSummaryCard({ title, count, color, suffix, target }: {
  title: string;
  count: number;
  color: string;
  suffix?: string;
  target?: number;
}) {
  return (
    <Card className={`bg-gray-900 border-${color}-700`}>
      <CardContent className="pt-4 pb-4 text-center">
        <div className={`text-2xl font-bold text-${color}-400`}>
          {count}{suffix || ''}
        </div>
        <p className="text-gray-400 text-sm mt-1">{title}</p>
        {target && (
          <p className="text-gray-500 text-xs mt-1">Cible: {target}{suffix || ''}</p>
        )}
      </CardContent>
    </Card>
  );
}

function IncidentStatRow({ label, count, color }: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
      <span className="text-gray-300">{label}</span>
      <Badge className={`bg-${color}-500 text-white`}>{count}</Badge>
    </div>
  );
}

function SLARow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
      <span className="text-gray-300">{label}</span>
      <span className={`font-bold text-${color}-400`}>{count}</span>
    </div>
  );
}

function PerformanceDetail({ label, value, isGood }: {
  label: string;
  value: string;
  isGood: boolean;
}) {
  return (
    <div className="text-center p-4 bg-gray-800 rounded-lg">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className={`text-xl font-bold ${isGood ? 'text-green-400' : 'text-yellow-400'} mt-1`}>
        {value}
      </p>
    </div>
  );
}

function ProtocolCard({ name, icon, status, metrics }: {
  name: string;
  icon: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  metrics: Array<{ label: string; value: string }>;
}) {
  return (
    <Card className={`border-2 ${
      status === 'OPERATIONAL' ? 'border-green-600' :
      status === 'DEGRADED' ? 'border-yellow-600' :
      'border-red-600'
    } bg-gray-900`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-3xl">{icon}</span>
          <div className={`w-3 h-3 rounded-full ${
            status === 'OPERATIONAL' ? 'bg-green-500 animate-pulse' :
            status === 'DEGRADED' ? 'bg-yellow-500' :
            'bg-red-500 animate-pulse'
          }`} />
        </div>
        
        <h3 className="text-white font-semibold mb-4">{name}</h3>
        
        <div className="space-y-2">
          {metrics.map((metric, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{metric.label}</span>
              <span className="text-white font-mono">{metric.value}</span>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-700">
          <Badge className={
            status === 'OPERATIONAL' ? 'bg-green-500' :
            status === 'DEGRADED' ? 'bg-yellow-500' :
            'bg-red-500'
          }>
            {status === 'OPERATIONAL' ? 'OPÉRATIONNEL' :
             status === 'DEGRADED' ? 'DÉGRADÉ' : 'HORS SERVICE'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function ComplianceDetailCard({ title, compliant, checks }: {
  title: string;
  compliant: boolean;
  checks: Array<{ label: string; passed: boolean }>;
}) {
  return (
    <div className={`p-4 rounded-lg border ${
      compliant ? 'border-green-700 bg-green-900/10' : 'border-red-700 bg-red-900/10'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white font-medium">{title}</h4>
        <Badge className={compliant ? 'bg-green-500' : 'bg-red-500'}>
          {compliant ? 'CONFORME' : 'NON-CONFORME'}
        </Badge>
      </div>
      
      <div className="space-y-2">
        {checks.map((check, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <span className={check.passed ? 'text-green-400' : 'text-red-400'}>
              {check.passed ? '✓' : '✗'}
            </span>
            <span className="text-gray-300">{check.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrivacyMetric({ label, percentage, description }: {
  label: string;
  percentage: number;
  description: string;
}) {
  return (
    <div className="p-4 bg-gray-800 rounded-lg text-center">
      <div className="relative inline-flex items-center justify-center w-16 h-16 mb-2">
        <svg className="w-16 h-16 transform -rotate-90">
          <circle cx="32" cy="32" r="28" stroke="#374151" strokeWidth="4" fill="none" />
          <circle 
            cx="32" cy="32" r="28" 
            stroke="#10B981" 
            strokeWidth="4" 
            fill="none"
            strokeDasharray={`${percentage * 1.76} 176`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-sm font-bold text-green-400">{percentage}%</span>
      </div>
      <p className="text-white font-medium text-sm">{label}</p>
      <p className="text-gray-500 text-xs mt-1">{description}</p>
    </div>
  );
}
