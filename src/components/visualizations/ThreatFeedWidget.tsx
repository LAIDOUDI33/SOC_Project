'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  ShieldAlert,
  Shield,
  AlertTriangle,
  Bug,
  Lock,
  Wifi,
  Phone,
  CreditCard,
  Globe,
  Server,
  UserX,
  Eye,
  TrendingUp,
  Clock,
  Zap,
  ArrowRight,
  Activity,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { LiveAlertsTicker, type AlertItem, type AlertSeverity } from './LiveAlertsTicker';

/**
 * Attack vector types for distribution chart
 */
export type AttackVector = 
  | 'phishing'
  | 'malware'
  | 'ddos'
  | 'ss7_attack'
  | 'fraud'
  | 'intrusion'
  | 'credential_theft'
  | 'other';

/** Attack vector configuration */
export const ATTACK_VECTOR_CONFIG: Record<AttackVector, {
  label: string;
  icon: React.ElementType;
  color: string;
}> = {
  phishing: { label: 'Phishing', icon: Globe, color: '#ef4444' },
  malware: { label: 'Malware', icon: Bug, color: '#f97316' },
  ddos: { label: 'DDoS', icon: Wifi, color: '#eab308' },
  ss7_attack: { label: 'SS7 Attack', icon: Phone, color: '#8b5cf6' },
  fraud: { label: 'Fraud', icon: CreditCard, color: '#06b6d4' },
  intrusion: { label: 'Intrusion', icon: Server, color: '#22c55e' },
  credential_theft: { label: 'Credential Theft', icon: UserX, color: '#ec4899' },
  other: { label: 'Other', icon: ShieldAlert, color: '#64748b' },
};

/** Threat level score (0-100) */
export interface ThreatLevelScore {
  /** Current overall threat score */
  current: number;
  /** Previous score for trend calculation */
  previous: number;
  /** Score trend direction */
  trend: 'up' | 'down' | 'stable';
  /** Threat level category */
  level: 'low' | 'elevated' | 'high' | 'critical';
}

/** Active threat item in top list */
export interface ActiveThreat {
  id: string;
  title: string;
  severity: AlertSeverity;
  attackVector: AttackVector;
  affectedSystems: number;
  firstSeen: string;
  status: 'active' | 'investigating' | 'contained';
}

/** Sample threat data for demonstration */
export const SAMPLE_THREAT_DATA = {
  alerts: [
    { id: 'a1', title: 'SS7 signaling anomaly detected on STP-Algiers', severity: 'critical' as AlertSeverity, timestamp: new Date(Date.now() - 2 * 60000).toISOString(), source: 'SS7 Monitor' },
    { id: 'a2', title: 'Brute force attack on MME-Primary from botnet IP range', severity: 'high' as AlertSeverity, timestamp: new Date(Date.now() - 5 * 60000).toISOString(), source: 'EDR Collector' },
    { id: 'a3', title: 'SIM box fraud activity detected in Oran region', severity: 'high' as AlertSeverity, timestamp: new Date(Date.now() - 8 * 60000).toISOString(), source: 'Fraud Detection' },
    { id: 'a4', title: 'Suspicious DNS tunneling from internal host', severity: 'medium' as AlertSeverity, timestamp: new Date(Date.now() - 12 * 60000).toISOString(), source: 'DNS Monitor' },
    { id: 'a5', title: 'Multiple failed VPN authentication attempts', severity: 'medium' as AlertSeverity, timestamp: new Date(Date.now() - 15 * 60000).toISOString(), source: 'VPN Gateway' },
    { id: 'a6', title: 'Unusual data exfiltration pattern to external IP', severity: 'high' as AlertSeverity, timestamp: new Date(Date.now() - 18 * 60000).toISOString(), source: 'DLP System' },
    { id: 'a7', title: 'Certificate expiration warning for FW-Perimeter', severity: 'low' as AlertSeverity, timestamp: new Date(Date.now() - 22 * 60000).toISOString(), source: 'Cert Manager' },
    { id: 'a8', title: 'Rate limiting triggered on public API endpoints', severity: 'info' as AlertSeverity, timestamp: new Date(Date.now() - 25 * 60000).toISOString(), source: 'API Gateway' },
  ],
  threatLevel: {
    current: 72,
    previous: 65,
    trend: 'up',
    level: 'high',
  } as ThreatLevelScore,
  activeThreats: [
    { id: 't1', title: 'SS7 Interception Campaign', severity: 'critical', attackVector: 'ss7_attack', affectedSystems: 4, firstSeen: new Date(Date.now() - 45 * 60000).toISOString(), status: 'active' },
    { id: 't2', title: 'Credential Stuffing Botnet', severity: 'high', attackVector: 'credential_theft', affectedSystems: 2, firstSeen: new Date(Date.now() - 120 * 60000).toISOString(), status: 'investigating' },
    { id: 't3', title: 'SIM Box Fraud Ring', severity: 'high', attackVector: 'fraud', affectedSystems: 6, firstSeen: new Date(Date.now() - 180 * 60000).toISOString(), status: 'active' },
    { id: 't4', title: 'DDoS Amplification Attempt', severity: 'medium', attackVector: 'ddos', affectedSystems: 1, firstSeen: new Date(Date.now() - 30 * 60000).toISOString(), status: 'contained' },
    { id: 't5', title: 'Phishing Targeting Executives', severity: 'medium', attackVector: 'phishing', affectedSystems: 15, firstSeen: new Date(Date.now() - 300 * 60000).toISOString(), status: 'investigating' },
  ],
  attackVectorDistribution: [
    { name: 'SS7 Attack', value: 28, color: '#8b5cf6' },
    { name: 'Fraud', value: 24, color: '#06b6d4' },
    { name: 'Malware', value: 18, color: '#f97316' },
    { name: 'Intrusion', value: 14, color: '#22c55e' },
    { name: 'Phishing', value: 10, color: '#ef4444' },
    { name: 'Other', value: 6, color: '#64748b' },
  ],
};

export interface ThreatFeedWidgetProps {
  /** Custom alerts data (uses sample data if not provided) */
  alerts?: AlertItem[];
  /** Custom threat level score */
  threatLevel?: ThreatLevelScore;
  /** Custom active threats list */
  activeThreats?: ActiveThreat[];
  /** Attack vector distribution data */
  attackVectorDistribution?: Array<{ name: string; value: number; color: string }>;
  /** Callback when alert is clicked */
  onAlertClick?: (alert: AlertItem) => void;
  /** Callback when threat is clicked */
  onThreatClick?: (threat: ActiveThreat) => void;
  /** Additional CSS classes */
  className?: boolean;
  /** Show live alerts ticker (default: true) */
  showLiveFeed?: boolean;
  /** Compact mode for smaller display (default: false) */
  compact?: boolean;
}

/**
 * ThreatFeedWidget - Combined threat intelligence widget
 * 
 * Features:
 * - Live scrolling threat feed
 * - Current threat level indicator with trend
 * - Top 5 active threats list with severity
 * - Attack vector distribution donut chart
 * - Last updated timestamp with live indicator
 * - Fully responsive layout
 * 
 * @example
 * ```tsx
 * <ThreatFeedWidget
 *   onAlertClick={(alert) => navigate(`/alerts/${alert.id}`)}
 *   onThreatClick={(threat) => showThreatDetails(threat)}
 * />
 * ```
 */
export function ThreatFeedWidget({
  alerts = SAMPLE_THREAT_DATA.alerts,
  threatLevel = SAMPLE_THREAT_DATA.threatLevel,
  activeThreats = SAMPLE_THREAT_DATA.activeThreats,
  attackVectorDistribution = SAMPLE_THREAT_DATA.attackVectorDistribution,
  onAlertClick,
  onThreatClick,
  className,
  showLiveFeed = true,
  compact = false,
}: ThreatFeedWidgetProps) {
  // State management
  const [lastUpdated] = useState(new Date());

  // Get threat level styling
  const threatLevelConfig = useMemo(() => {
    switch (threatLevel.level) {
      case 'critical':
        return { bg: 'bg-red-950/50', border: 'border-red-500/50', text: 'text-red-400', icon: ShieldAlert };
      case 'high':
        return { bg: 'bg-orange-950/50', border: 'border-orange-500/50', text: 'text-orange-400', icon: AlertTriangle };
      case 'elevated':
        return { bg: 'bg-yellow-950/50', border: 'border-yellow-500/50', text: 'text-yellow-400', icon: Shield };
      default:
        return { bg: 'bg-green-950/50', border: 'border-green-500/50', text: 'text-green-400', icon: Shield };
    }
  }, [threatLevel.level]);

  // Format time ago
  const formatTimeAgo = useCallback((timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  }, []);

  // Get severity badge style
  const getSeverityBadge = (severity: AlertSeverity) => {
    const styles: Record<AlertSeverity, string> = {
      critical: 'bg-red-500/20 text-red-400 border-red-500/40',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
      low: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      info: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
    };
    return styles[severity];
  };

  // Get status badge style
  const getStatusBadge = (status: ActiveThreat['status']) => {
    const styles: Record<ActiveThreat['status'], string> = {
      active: 'bg-red-500/20 text-red-400 animate-pulse',
      investigating: 'bg-blue-500/20 text-blue-400',
      contained: 'bg-green-500/20 text-green-400',
    };
    return styles[status];
  };

  // Custom pie chart tooltip
  const CustomPieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) => {
    if (!active || !payload?.length) return null;
    
    return (
      <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-2 shadow-xl">
        <p className="text-sm font-medium" style={{ color: payload[0].payload.color }}>
          {payload[0].name}
        </p>
        <p className="text-xs text-slate-400">{payload[0].value}% of attacks</p>
      </div>
    );
  };

  const LevelIcon = threatLevelConfig.icon;

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header */}
      <CardHeader className={cn('pb-3', !compact && 'border-b border-slate-800')}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn('flex items-center gap-2', compact ? 'text-sm' : 'text-base')}>
            <Activity className={cn('w-5 h-5 text-red-400')} />
            Threat Intelligence Feed
          </CardTitle>
          
          {/* Last Updated Indicator */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>

        {/* Threat Level Indicator */}
        {!compact && (
          <div className={cn(
            'flex items-center justify-between p-3 rounded-lg mt-3 border',
            threatLevelConfig.bg,
            threatLevelConfig.border
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                threatLevel.level === 'critical' ? 'bg-red-900/50' :
                threatLevel.level === 'high' ? 'bg-orange-900/50' :
                threatLevel.level === 'elevated' ? 'bg-yellow-900/50' : 'bg-green-900/50'
              )}>
                <LevelIcon className={cn('w-5 h-5', threatLevelConfig.text)} />
              </div>
              
              <div>
                <p className={cn('font-semibold capitalize', threatLevelConfig.text)}>
                  {threatLevel.level} Threat Level
                </p>
                <p className="text-xs text-slate-400">
                  Overall security posture assessment
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className={cn('text-3xl font-bold tabular-nums', threatLevelConfig.text)}>
                {threatLevel.current}
              </div>
              <div className={cn(
                'flex items-center gap-1 text-xs justify-end',
                threatLevel.trend === 'up' ? 'text-red-400' :
                threatLevel.trend === 'down' ? 'text-green-400' : 'text-slate-400'
              )}>
                {threatLevel.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                {threatLevel.trend === 'down' && <Zap className="w-3 h-3 rotate-180" />}
                {threatLevel.trend === 'stable' && <Activity className="w-3 h-3" />}
                {threatLevel.current > threatLevel.previous ? '+' : ''}{threatLevel.current - threatLevel.previous} from last hour
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className={cn(compact ? 'p-3 space-y-3', 'p-4 space-y-4')}>
        {/* Live Alerts Ticker */}
        {showLiveFeed && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-slate-300">Live Alerts</span>
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {alerts.length} new
              </Badge>
            </div>
            <LiveAlertsTicker
              alerts={alerts.slice(0, 10)}
              maxVisible={compact ? 3 : 5}
              onAlertClick={onAlertClick}
              headerText=""
              showControls={!compact}
              showTimestamps={!compact}
            />
          </div>
        )}

        {/* Two Column Layout for Threats and Distribution */}
        <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2')}>
          
          {/* Top Active Threats */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium text-slate-300">Top Active Threats</span>
            </div>
            
            <div className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
              {activeThreats.slice(0, compact ? 3 : 5).map((threat) => {
                const vectorConfig = ATTACK_VECTOR_CONFIG[threat.attackVector];
                const VectorIcon = vectorConfig.icon;
                
                return (
                  <button
                    key={threat.id}
                    onClick={() => onThreatClick?.(threat)}
                    className={cn(
                      'w-full flex items-start gap-3 p-2.5 rounded-lg border transition-all',
                      'hover:bg-slate-800/80 hover:border-slate-600 text-left',
                      'border-slate-700/50'
                    )}
                  >
                    {/* Severity Icon */}
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                      threat.severity === 'critical' ? 'bg-red-900/30' :
                      threat.severity === 'high' ? 'bg-orange-900/30' : 'bg-yellow-900/30'
                    )}>
                      <VectorIcon className={cn('w-4 h-4', { color: vectorConfig.color })} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-200 line-clamp-1">
                          {threat.title}
                        </span>
                        <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 h-4 flex-shrink-0', getStatusBadge(threat.status))}>
                          {threat.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{vectorConfig.label}</span>
                        <span>•</span>
                        <span>{threat.affectedSystems} systems</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(threat.firstSeen)}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Attack Vector Distribution */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Bug className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-slate-300">Attack Vector Distribution</span>
            </div>
            
            <div className={cn('flex items-center justify-center', compact ? 'h-[140px]' : 'h-[240px]')}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attackVectorDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={compact ? 35 : 55}
                    outerRadius={compact ? 60 : 90}
                    paddingAngle={3}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1000}
                  >
                    {attackVectorDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
              {attackVectorDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] text-slate-400 truncate">{item.name}</span>
                  <span className="text-[11px] text-slate-500 ml-auto tabular-nums">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Named export for barrel file
export default ThreatFeedWidget;
