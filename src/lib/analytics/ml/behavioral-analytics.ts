/**
 * National SOC Platform - Behavioral Analytics Engine
 * 
 * User and Entity Behavior Analytics (UEBA) for:
 * - Insider threat detection
 * - Compromised account identification
 * - Telecom-specific behavior patterns
 * - Risk scoring based on behavioral anomalies
 * 
 * @version 2.0.0 (Phase 7 Enhancement)
 * @module analytics/ml/behavioral-analytics
 */

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface BehaviorProfile {
  entityId: string;
  entityType: 'user' | 'endpoint' | 'service_account' | 'network_segment';
  entityName: string;
  
  // Baseline behavior (learned over time)
  baseline: BehaviorBaseline;
  
  // Current session/activity
  currentSession: ActivitySession;
  
  // Risk assessment
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  
  // Metadata
  lastUpdated: Date;
  profileAgeDays: number;
}

export interface BehaviorBaseline {
  // Temporal patterns
  typicalLoginHours: number[]; // 0-23, probability distribution
  typicalWorkdays: number[]; // 0-6, Mon-Sun
  
  // Activity volumes
  avgDailyActions: number;
  avgDataAccessedMB: number;
  avgSystemsAccessed: number;
  
  // Access patterns
  typicalLocations: string[];
  typicalEndpoints: string[];
  typicalResources: string[];
  
  // Peer group comparison
  peerGroupDeviation: number; // How much this entity differs from peers
}

export interface ActivitySession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  
  actions: ActionEvent[];
  totalActions: number;
  uniqueSystemsAccessed: Set<string>;
  uniqueResourcesAccessed: Set<string>;
  
  // Anomalies detected
  anomalies: BehaviorAnomaly[];
  anomalyCount: number;
  maxAnomalySeverity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ActionEvent {
  timestamp: Date;
  actionType: ActionType;
  resource: string;
  endpoint?: string;
  location?: string;
  outcome: 'success' | 'failure' | 'denied';
  riskContribution: number; // 0-1, how much this action contributes to risk
  details?: Record<string, any>;
}

export type ActionType = 
  | 'login'
  | 'logout'
  | 'file_access'
  | 'file_download'
  | 'file_upload'
  | 'config_change'
  | 'privilege_escalation'
  | 'data_export'
  | 'api_call'
  | 'database_query'
  | 'remote_access'
  | 'email_sent'
  | 'print_action';

export interface BehaviorAnomaly {
  id: string;
  timestamp: Date;
  anomalyType: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100
  description: string;
  
  // Context
  baselineValue: number;
  observedValue: number;
  deviationFactor: number;
  
  // Related indicators
  relatedEvents: string[]; // Action IDs
  mitreTechnique?: string;
  recommendation: string;
}

export type AnomalyType = 
  | 'impossible_travel'
  | 'after_hours_access'
  | 'unusual_data_volume'
  | 'unusual_location'
  | 'privilege_abuse'
  | 'lateral_movement'
  | 'data_exfiltration'
  | 'credential_stuffing'
  | 'behavior_drift'
  | 'peer_anomaly';

export interface RiskFactor {
  name: string;
  weight: number; // 0-1
  value: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

// ============================================================
// BEHAVIORAL ANALYSIS ENGINE
// ============================================================

/**
 * Analyze user behavior and generate risk assessment
 */
export function analyzeBehavior(
  currentActivities: ActionEvent[],
  baseline: BehaviorBaseline,
  context: {
    currentTime: Date;
    entityInfo: { name: string; department: string; role: string };
    peerGroupAvg?: BehaviorBaseline;
  }
): BehaviorProfile {
  const session = buildSession(currentActivities);
  const anomalies = detectBehavioralAnomalies(currentActivities, baseline, context.currentTime);
  const riskFactors = calculateRiskFactors(currentActivities, anomalies, baseline, context);
  const riskScore = calculateOverallRiskScore(riskFactors, anomalies);

  return {
    entityId: context.entityInfo.name.toLowerCase().replace(/\s+/g, '.'),
    entityType: inferEntityType(context.entityInfo.role),
    entityName: context.entityInfo.name,
    baseline,
    currentSession: {
      ...session,
      anomalies,
      anomalyCount: anomalies.length,
      maxAnomalySeverity: anomalies.length > 0 
        ? anomalies.sort((a, b) => getSeverityWeight(b.severity) - getSeverityWeight(a.severity))[0].severity 
        : 'low',
    },
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    riskFactors,
    lastUpdated: new Date(),
    profileAgeDays: Math.floor(Math.random() * 90) + 30, // Simulated profile age
  };
}

/**
 * Build activity session from raw events
 */
function buildSession(events: ActionEvent[]): Omit<ActivitySession, 'anomalies' | 'anomalyCount' | 'maxAnomalySeverity'> {
  return {
    sessionId: `sess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    startTime: events.length > 0 ? events[0].timestamp : new Date(),
    endTime: events.length > 0 ? events[events.length - 1].timestamp : new Date(),
    actions: events,
    totalActions: events.length,
    uniqueSystemsAccessed: new Set(events.map(e => e.endpoint).filter(Boolean) as string[]),
    uniqueResourcesAccessed: new Set(events.map(e => e.resource)),
  };
}

/**
 * Detect behavioral anomalies compared to baseline
 */
function detectBehavioralAnomalies(
  events: ActionEvent[],
  baseline: BehaviorBaseline,
  currentTime: Date
): BehaviorAnomaly[] {
  const anomalies: BehaviorAnomaly[] = [];

  // 1. Check for impossible travel
  const travelAnomaly = detectImpossibleTravel(events, baseline);
  if (travelAnomaly) anomalies.push(travelAnomaly);

  // 2. Check for after-hours access
  const hoursAnomaly = detectAfterHoursAccess(events, baseline, currentTime);
  if (hoursAnomaly) anomalies.push(hoursAnomaly);

  // 3. Check for unusual data volume
  const volumeAnomaly = detectUnusualDataVolume(events, baseline);
  if (volumeAnomaly) anomalies.push(volumeAnomaly);

  // 4. Check for unusual location
  const locationAnomaly = detectUnusualLocation(events, baseline);
  if (locationAnomaly) anomalies.push(locationAnomaly);

  // 5. Check for privilege abuse
  const privilegeAnomaly = detectPrivilegeAbuse(events, baseline);
  if (privilegeAnomaly) anomalies.push(privilegeAnomaly);

  // 6. Check for lateral movement
  const lateralAnomaly = detectLateralMovement(events, baseline);
  if (lateralAnomaly) anomalies.push(lateralAnomaly);

  // 7. Check for data exfiltration signals
  const exfilAnomaly = detectDataExfiltration(events, baseline);
  if (exfilAnomaly) anomalies.push(exfilAnomaly);

  // 8. Check for credential stuffing
  const credAnomaly = detectCredentialStuffing(events, baseline);
  if (credAnomaly) anomalies.push(credAnomaly);

  return anomalies.sort((a, b) => b.score - a.score);
}

// ============================================================
// SPECIFIC ANOMALY DETECTORS
// ============================================================

function detectImpossibleTravel(events: ActionEvent[], _baseline: BehaviorBaseline): BehaviorAnomaly | null {
  const locationEvents = events.filter(e => e.location && e.actionType === 'login');
  
  if (locationEvents.length < 2) return null;

  for (let i = 1; i < locationEvents.length; i++) {
    const prev = locationEvents[i - 1];
    const curr = locationEvents[i];
    
    const timeDiffHours = (curr.timestamp.getTime() - prev.timestamp.getTime()) / (1000 * 60 * 60);
    const distanceKm = estimateDistance(prev.location!, curr.location!);
    const speedKmh = distanceKm / timeDiffHours;

    // Impossible travel: >900 km/h (commercial flight speed)
    if (speedKmh > 900 && timeDiffHours < 24) {
      return {
        id: `anom-${Date.now()}-travel`,
        timestamp: curr.timestamp,
        anomalyType: 'impossible_travel',
        severity: 'critical',
        score: 95,
        description: `Impossible travel detected: ${prev.location} to ${curr.location} in ${timeDiffHours.toFixed(1)} hours (${speedKmh.toFixed(0)} km/h)`,
        baselineValue: 0,
        observedValue: speedKmh,
        deviationFactor: speedKmh / 900,
        relatedEvents: [prev.timestamp.toISOString(), curr.timestamp.toISOString()],
        mitreTechnique: 'T1021.003', // Remote Services: Remote Desktop Protocol
        recommendation: 'Immediate investigation required. Possible account compromise or credential sharing.'
      };
    }
  }

  return null;
}

function detectAfterHoursAccess(events: ActionEvent[], baseline: BehaviorBaseline, currentTime: Date): BehaviorAnomaly | null {
  const hour = currentTime.getHours();
  const dayOfWeek = currentTime.getDay();
  
  // Check if this is outside normal hours
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isAfterHours = hour < 6 || hour > 22 || isWeekend;
  
  if (!isAfterHours) return null;

  // Calculate how unusual this is based on baseline
  const hourProbability = baseline.typicalLoginHours[hour] || 0;
  const dayProbability = baseline.typicalWorkdays[dayOfWeek] || 0;
  const combinedProbability = hourProbability * dayProbability;

  // If very unlikely based on baseline
  if (combinedProbability < 0.05 && events.length > 0) {
    return {
      id: `anom-${Date.now()}-afterhours`,
      timestamp: currentTime,
      anomalyType: 'after_hours_access',
      severity: combinedProbability < 0.01 ? 'high' : 'medium',
      score: Math.round((1 - combinedProbability) * 70),
      description: `After-hours access at ${hour}:00 on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]} (${events.length} actions)`,
      baselineValue: combinedProbability * 100,
      observedValue: 100,
      deviationFactor: 1 / (combinedProbability + 0.01),
      relatedEvents: events.slice(0, 3).map(e => e.timestamp.toISOString()),
      recommendation: 'Verify legitimate business reason. Monitor for additional suspicious activity.'
    };
  }

  return null;
}

function detectUnusualDataVolume(events: ActionEvent[], baseline: BehaviorBaseline): BehaviorAnomaly | null {
  const dataEvents = events.filter(e => 
    ['file_download', 'file_upload', 'data_export', 'database_query'].includes(e.actionType)
  );
  
  if (dataEvents.length === 0) return null;

  // Estimate total data volume (simplified)
  const estimatedVolumeMB = dataEvents.reduce((sum, e) => {
    switch (e.actionType) {
      case 'file_download': return sum + (e.details?.sizeMB || 5);
      case 'file_upload': return sum + (e.details?.sizeMB || 3);
      case 'data_export': return sum + (e.details?.sizeMB || 10);
      case 'database_query': return sum + (e.details?.rowCount ? e.details.rowCount / 1000 : 2);
      default: return sum;
    }
  }, 0);

  const volumeRatio = estimatedVolumeMB / (baseline.avgDataAccessedMB || 1);

  if (volumeRatio > 5) {
    return {
      id: `anom-${Date.now()}-volume`,
      timestamp: new Date(),
      anomalyType: 'unusual_data_volume',
      severity: volumeRatio > 20 ? 'critical' : volumeRatio > 10 ? 'high' : 'medium',
      score: Math.min(95, Math.round(volumeRatio * 4)),
      description: `Unusual data volume: ${estimatedVolumeMB.toFixed(1)}MB accessed (baseline: ${baseline.avgDataAccessedMB?.toFixed(1) || 'N/A'}MB, ${(volumeRatio).toFixed(1)}x normal)`,
      baselineValue: baseline.avgDataAccessedMB || 0,
      observedValue: estimatedVolumeMB,
      deviationFactor: volumeRatio,
      relatedEvents: dataEvents.map(e => e.timestamp.toISOString()),
      mitreTechnique: 'T1530', // Data from Cloud Storage Object
      recommendation: 'Review data access purpose. Check for bulk downloads or unauthorized exports.'
    };
  }

  return null;
}

function detectUnusualLocation(events: ActionEvent[], baseline: BehaviorBaseline): BehaviorAnomaly | null {
  const locations = [...new Set(events.map(e => e.location).filter(Boolean))];
  const unusualLocations = locations.filter(l => !baseline.typicalLocations.includes(l!));

  if (unusualLocations.length > 0) {
    return {
      id: `anom-${Date.now()}-location`,
      timestamp: new Date(),
      anomalyType: 'unusual_location',
      severity: 'medium',
      score: Math.min(70, unusualLocations.length * 25),
      description: `Access from unusual location(s): ${unusualLocations.join(', ')}`,
      baselineValue: baseline.typicalLocations.length,
      observedValue: locations.length,
      deviationFactor: locations.length / (baseline.typicalLocations.length || 1),
      relatedEvents: events.filter(e => unusualLocations.includes(e.location!)).map(e => e.timestamp.toISOString()),
      recommendation: 'Verify location legitimacy. Consider geo-blocking if unauthorized region.'
    };
  }

  return null;
}

function detectPrivilegeAbuse(events: ActionEvent[], _baseline: BehaviorBaseline): BehaviorAnomaly | null {
  const privEvents = events.filter(e => e.actionType === 'privilege_escalation');
  
  if (privEvents.length > 0) {
    const failedPrivEvents = privEvents.filter(e => e.outcome !== 'success');
    
    if (failedPrivEvents.length > 0) {
      return {
        id: `anom-${Date.now()}-privilege`,
        timestamp: failedPrivEvents[0].timestamp,
        anomalyType: 'privilege_abuse',
        severity: 'high',
        score: 85,
        description: `${failedPrivEvents.length} failed privilege escalation attempt(s) detected`,
        baselineValue: 0,
        observedValue: failedPrivEvents.length,
        deviationFactor: failedPrivEvents.length + 1,
        relatedEvents: failedPrivEvents.map(e => e.timestamp.toISOString()),
        mitreTechnique: 'T1548', // Abuse Elevation Control Mechanism
        recommendation: 'Immediate security review. Check for account compromise or insider threat.'
      };
    }

    if (privEvents.length > 3) {
      return {
        id: `anom-${Date.now()}-privilege-multi`,
        timestamp: new Date(),
        anomalyType: 'privilege_abuse',
        severity: 'medium',
        score: 60,
        description: `Multiple privilege escalations (${privEvents.length}) in single session`,
        baselineValue: 1,
        observedValue: privEvents.length,
        deviationFactor: privEvents.length,
        relatedEvents: privEvents.map(e => e.timestamp.toISOString()),
        recommendation: 'Review privilege escalation justifications. Verify change management approval.'
      };
    }
  }

  return null;
}

function detectLateralMovement(events: ActionEvent[], baseline: BehaviorBaseline): BehaviorAnomaly | null {
  const endpoints = [...new Set(events.map(e => e.endpoint).filter(Boolean))];
  const newEndpoints = endpoints.filter(e => !baseline.typicalEndpoints.includes(e!));

  if (newEndpoints.length > baseline.typicalSystemsAccessed * 2) {
    return {
      id: `anom-${Date.now()}-lateral`,
      timestamp: new Date(),
      anomalyType: 'lateral_movement',
      severity: newEndpoints.length > 5 ? 'high' : 'medium',
      score: Math.min(80, newEndpoints.length * 15),
      description: `Potential lateral movement: ${newEndpoints.length} new system(s) accessed`,
      baselineValue: baseline.typicalSystemsAccessed,
      observedValue: endpoints.length,
      deviationFactor: endpoints.length / (baseline.typicalSystemsAccessed || 1),
      relatedEvents: events.filter(e => newEndpoints.includes(e.endpoint!)).map(e => e.timestamp.toISOString()),
      mitreTechnique: 'T1021', // Remote Services
      recommendation: 'Investigate access pattern. Check for reconnaissance or pivot attempts.'
    };
  }

  return null;
}

function detectDataExfiltration(events: ActionEvent[], baseline: BehaviorBaseline): BehaviorAnomaly | null {
  const exfilSignals = events.filter(e => 
    e.actionType === 'data_export' || 
    (e.actionType === 'file_download' && (e.details?.sizeMB || 0) > 50) ||
    e.actionType === 'email_sent' && e.resource.includes('.zip')
  );

  if (exfilSignals.length >= 2) {
    const totalVolume = exfilSignals.reduce((sum, e) => sum + (e.details?.sizeMB || 20), 0);
    
    return {
      id: `anom-${Date.now()}-exfil`,
      timestamp: new Date(),
      anomalyType: 'data_exfiltration',
      severity: totalVolume > 500 ? 'critical' : totalVolume > 100 ? 'high' : 'medium',
      score: Math.min(95, exfilSignals.length * 30 + (totalVolume > 100 ? 20 : 0)),
      description: `Potential data exfiltration: ${exfilSignals.length} export(s), ~${totalVolume}MB total`,
      baselineValue: baseline.avgDataAccessedMB * 0.1, // 10% of normal as export baseline
      observedValue: totalVolume,
      deviationFactor: totalVolume / (baseline.avgDataAccessedMB * 0.1 + 1),
      relatedEvents: exfilSignals.map(e => e.timestamp.toISOString()),
      mitreTechnique: 'T1048', // Exfiltration Over Alternative Protocol
      recommendation: 'URGENT: Review data exports. Check DLP alerts. Interview user if needed.'
    };
  }

  return null;
}

function detectCredentialStuffing(events: ActionEvent[], _baseline: BehaviorBaseline): BehaviorAnomaly | null {
  const loginFailures = events.filter(e => e.actionType === 'login' && e.outcome === 'failure');

  if (loginFailures.length >= 5) {
    const timeSpanMinutes = (events[events.length - 1].timestamp.getTime() - events[0].timestamp.getTime()) / (1000 * 60);
    const failureRate = loginFailures.length / (timeSpanMinutes || 1);

    if (failureRate > 2) { // More than 2 failures per minute
      return {
        id: `anom-${Date.now()}-creds`,
        timestamp: loginFailures[0].timestamp,
        anomalyType: 'credential_stuffing',
        severity: failureRate > 10 ? 'critical' : 'high',
        score: Math.min(90, loginFailures.length * 12),
        description: `Possible credential stuffing: ${loginFailures.length} failures in ${timeSpanMinutes.toFixed(0)}min (${failureRate.toFixed(1)}/min)`,
        baselineValue: 0.5, // Normal: occasional typo
        observedValue: failureRate,
        deviationFactor: failureRate / 0.5,
        relatedEvents: loginFailures.map(e => e.timestamp.toISOString()),
        mitreTechnique: 'T1110', // Brute Force
        recommendation: 'Lock account if not already. Check source IPs. Enable MFA enforcement.'
      };
    }
  }

  return null;
}

// ============================================================
// RISK CALCULATION
// ============================================================

function calculateRiskFactors(
  events: ActionEvent[],
  anomalies: BehaviorAnomaly[],
  baseline: BehaviorBaseline,
  context: { currentTime: Date; entityInfo: { name: string; department: string; role: string } }
): RiskFactor[] {
  const factors: RiskFactor[] = [];

  // Anomaly-based risk
  if (anomalies.length > 0) {
    factors.push({
      name: 'Behavioral Anomalies',
      weight: 0.35,
      value: anomalies.reduce((sum, a) => sum + a.score, 0) / anomalies.length,
      severity: anomalies.some(a => a.severity === 'critical') ? 'critical' : 
              anomalies.some(a => a.severity === 'high') ? 'high' : 'medium',
      description: `${anomalies.length} anomaly(ies) detected`
    });
  }

  // Volume-based risk
  const volumeRatio = events.length / (baseline.avgDailyActions / 24 || 1); // Hourly baseline
  if (volumeRatio > 2) {
    factors.push({
      name: 'Activity Volume',
      weight: 0.2,
      value: Math.min(1, volumeRatio / 10),
      severity: volumeRatio > 5 ? 'high' : 'medium',
      description: `${events.length} actions (${volumeRatio.toFixed(1)}x normal hourly rate)`
    });
  }

  // Sensitive resource access
  const sensitiveAccesses = events.filter(e => 
    e.resource.includes('admin') || 
    e.resource.includes('config') ||
    e.resource.includes('password') ||
    e.resource.includes('secret')
  ).length;
  if (sensitiveAccesses > 0) {
    factors.push({
      name: 'Sensitive Resource Access',
      weight: 0.25,
      value: sensitiveAccesses / events.length,
      severity: sensitiveAccesses > 3 ? 'high' : 'medium',
      description: `${sensitiveAccesses} sensitive resource(s) accessed`
    });
  }

  // Failure rate
  const failures = events.filter(e => e.outcome !== 'success').length;
  const failureRate = failures / events.length;
  if (failureRate > 0.1) {
    factors.push({
      name: 'Failure Rate',
      weight: 0.1,
      value: failureRate,
      severity: failureRate > 0.3 ? 'high' : 'medium',
      description: `${((failureRate) * 100).toFixed(0)}% action failure rate`
    });
  }

  // Time-based risk (after hours, weekend)
  const hour = context.currentTime.getHours();
  const dayOfWeek = context.currentTime.getDay();
  if (hour < 7 || hour > 20 || dayOfWeek === 0 || dayOfWeek === 6) {
    factors.push({
      name: 'Temporal Anomaly',
      weight: 0.1,
      value: 0.7,
      severity: 'low',
      description: `Access during non-standard hours`
    });
  }

  return factors.sort((a, b) => b.weight - a.weight);
}

function calculateOverallRiskScore(factors: RiskFactor[], anomalies: BehaviorAnomaly[]): number {
  let weightedScore = 0;
  
  factors.forEach(factor => {
    weightedScore += factor.value * factor.weight * 100;
  });

  // Boost from critical anomalies
  const criticalBoost = anomalies.filter(a => a.severity === 'critical').length * 15;
  const highBoost = anomalies.filter(a => a.severity === 'high').length * 8;

  return Math.min(100, Math.round(weightedScore + criticalBoost + highBoost));
}

function getRiskLevel(score: number): BehaviorProfile['riskLevel'] {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function inferEntityType(role: string): BehaviorProfile['entityType'] {
  if (role.toLowerCase().includes('admin') || role.toLowerCase().includes('administrator')) {
    return 'service_account';
  }
  if (role.toLowerCase().includes('service') || role.toLowerCase().includes('system')) {
    return 'service_account';
  }
  return 'user';
}

function getSeverityWeight(severity: string): number {
  switch (severity) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

function estimateDistance(loc1: string, loc2: string): number {
  // Simplified distance estimation based on common city pairs
  // In production, use proper geocoding
  const distances: Record<string, Record<string, number>> = {
    'algiers': { 'oran': 400, 'constantine': 430, 'paris': 1620, 'london': 1660, 'newyork': 7630 },
    'oran': { 'algiers': 400, 'paris': 1480, 'madrid': 780 },
    'paris': { 'algiers': 1620, 'london': 340, 'berlin': 1050 },
  };

  const l1 = loc1.toLowerCase().split(',')[0];
  const l2 = loc2.toLowerCase().split(',')[0];

  return distances[l1]?.[l2] || 500; // Default 500km if unknown
}

// ============================================================
// DEMO DATA GENERATORS FOR CEO PRESENTATION
// ============================================================

/**
 * Generate sample behavior profiles for demo
 */
export function generateDemoBehaviorProfiles(): BehaviorProfile[] {
  const profiles: BehaviorProfile[] = [];

  // Normal user - low risk
  profiles.push(analyzeBehavior(
    generateNormalUserActivities(),
    createNormalBaseline(),
    { currentTime: new Date(), entityInfo: { name: 'Ahmed Benali', department: 'IT Operations', role: 'Analyst' } }
  ));

  // Busy but legitimate user - low-medium risk
  profiles.push(analyzeBehavior(
    generateBusyUserActivities(),
    createBusyBaseline(),
    { currentTime: new Date(), entityInfo: { name: 'Fatima Zerhouni', department: 'Security Team', role: 'Senior Analyst' } }
  ));

  // After-hours worker - medium risk (false positive candidate)
  profiles.push(analyzeBehavior(
    generateAfterHoursActivities(),
    createAfterHoursBaseline(),
    { currentTime: new Date(2026, 6, 26, 23, 30), entityInfo: { name: 'Karim Mansouri', department: 'Development', role: 'Developer' } }
  ));

  // Compromised account simulation - HIGH RISK
  profiles.push(analyzeBehavior(
    generateCompromisedAccountActivities(),
    createNormalBaseline(),
    { currentTime: new Date(), entityInfo: { name: 'Test Account (Simulated)', department: 'Finance', role: 'Accountant' } }
  ));

  // Insider threat simulation - CRITICAL RISK
  profiles.push(analyzeBehavior(
    generateInsiderThreatActivities(),
    createInsiderBaseline(),
    { currentTime: new Date(), entityInfo: { name: 'Suspicious User (Demo)', department: 'Executive Office', role: 'Executive Assistant' } }
  ));

  return profiles;
}

// Helper functions to generate demo activities
function generateNormalUserActivities(): ActionEvent[] {
  const now = new Date();
  return [
    { timestamp: new Date(now.getTime() - 3600000 * 8), actionType: 'login', resource: 'workstation-01', outcome: 'success', riskContribution: 0.01 },
    { timestamp: new Date(now.getTime() - 3600000 * 7.5), actionType: 'email_sent', resource: 'outlook', outcome: 'success', riskContribution: 0.02 },
    { timestamp: new Date(now.getTime() - 3600000 * 6), actionType: 'file_access', resource: 'shared/project-docs/', outcome: 'success', riskContribution: 0.02 },
    { timestamp: new Date(now.getTime() - 3600000 * 4), actionType: 'database_query', resource: 'prod-db-replica', outcome: 'success', riskContribution: 0.05, details: { rowCount: 150 } },
    { timestamp: new Date(now.getTime() - 3600000 * 2), actionType: 'file_download', resource: 'report-q2.xlsx', outcome: 'success', riskContribution: 0.03, details: { sizeMB: 2.5 } },
    { timestamp: new Date(now.getTime() - 60000), actionType: 'logout', resource: 'workstation-01', outcome: 'success', riskContribution: 0.01 },
  ];
}

function generateBusyUserActivities(): ActionEvent[] {
  const now = new Date();
  const activities: ActionEvent[] = [
    { timestamp: new Date(now.getTime() - 3600000 * 9), actionType: 'login', resource: 'security-console', outcome: 'success', riskContribution: 0.01 },
    { timestamp: new Date(now.getTime() - 3600000 * 8.5), actionType: 'api_call', resource: 'siem-api', outcome: 'success', riskContribution: 0.03 },
    { timestamp: new Date(now.getTime() - 3600000 * 7), actionType: 'database_query', resource: 'security-db', outcome: 'success', riskContribution: 0.05, details: { rowCount: 2500 } },
    { timestamp: new Date(now.getTime() - 3600000 * 6), actionType: 'file_access', resource: '/cases/incident-2026-089/', outcome: 'success', riskContribution: 0.04 },
    { timestamp: new Date(now.getTime() - 3600000 * 5), actionType: 'file_download', resource: 'pcap-analysis.zip', outcome: 'success', riskContribution: 0.05, details: { sizeMB: 45 } },
    { timestamp: new Date(now.getTime() - 3600000 * 4), actionType: 'api_call', resource: 'threat-intel-api', outcome: 'success', riskContribution: 0.03 },
    { timestamp: new Date(now.getTime() - 3600000 * 3), actionType: 'config_change', resource: 'siem-rule-147', outcome: 'success', riskContribution: 0.08 },
    { timestamp: new Date(now.getTime() - 3600000 * 2), actionType: 'file_upload', resource: 'updated-ioc-list.csv', outcome: 'success', riskContribution: 0.04, details: { sizeMB: 1.2 } },
    { timestamp: new Date(now.getTime() - 3600000), actionType: 'database_query', resource: 'compliance-db', outcome: 'success', riskContribution: 0.05, details: { rowCount: 800 } },
    { timestamp: new Date(now.getTime() - 300000), actionType: 'email_sent', resource: 'incident-report.pdf', outcome: 'success', riskContribution: 0.02 },
  ];
  return activities;
}

function generateAfterHoursActivities(): ActionEvent[] {
  const now = new Date(2026, 6, 26, 23, 30);
  return [
    { timestamp: new Date(now.getTime() - 7200000), actionType: 'login', resource: 'vpn-portal', outcome: 'success', riskContribution: 0.05, location: 'Home Office' },
    { timestamp: new Date(now.getTime() - 7000000), actionType: 'remote_access', resource: 'dev-server-03', outcome: 'success', riskContribution: 0.08 },
    { timestamp: new Date(now.getTime() - 6000000), actionType: 'file_access', source: '/src/backend/', outcome: 'success', riskContribution: 0.04 },
    { timestamp: new Date(now.getTime() - 3600000), actionType: 'api_call', resource: 'ci-cd-pipeline', outcome: 'success', riskContribution: 0.06 },
    { timestamp: new Date(now.getTime() - 1800000), actionType: 'file_download', resource: 'build-artifacts.tar.gz', outcome: 'success', riskContribution: 0.07, details: { sizeMB: 120 } },
    { timestamp: now, actionType: 'database_query', resource: 'dev-db', outcome: 'success', riskContribution: 0.05, details: { rowCount: 50 } },
  ];
}

function generateCompromisedAccountActivities(): ActionEvent[] {
  const now = new Date();
  return [
    { timestamp: new Date(now.getTime() - 3600000 * 3), actionType: 'login', resource: 'finance-workstation', outcome: 'success', riskContribution: 0.1, location: 'Unknown IP (Tor Exit Node)' },
    { timestamp: new Date(now.getTime() - 3600000 * 2.9), actionType: 'login', resource: 'email-system', outcome: 'failure', riskContribution: 0.3 },
    { timestamp: new Date(now.getTime() - 3600000 * 2.8), actionType: 'login', resource: 'email-system', outcome: 'failure', riskContribution: 0.3 },
    { timestamp: new Date(now.getTime() - 3600000 * 2.7), actionType: 'login', resource: 'email-system', outcome: 'success', riskContribution: 0.2 },
    { timestamp: new Date(now.getTime() - 3600000 * 2.5), actionType: 'file_access', resource: '/financial/reports/confidential/', outcome: 'success', riskContribution: 0.4 },
    { timestamp: new Date(now.getTime() - 3600000 * 2.3), actionType: 'file_download', resource: 'Q2-financials.xlsx', outcome: 'success', riskContribution: 0.5, details: { sizeMB: 85 } },
    { timestamp: new Date(now.getTime() - 3600000 * 2), actionType: 'database_query', resource: 'financial-db-prod', outcome: 'success', riskContribution: 0.4, details: { rowCount: 15000 } },
    { timestamp: new Date(now.getTime() - 3600000 * 1.8), actionType: 'data_export', resource: 'customer-data-export', outcome: 'success', riskContribution: 0.6, details: { sizeMB: 245 } },
    { timestamp: new Date(now.getTime() - 3600000 * 1.5), actionType: 'email_sent', resource: 'external@unknown.com', outcome: 'success', riskContribution: 0.5 },
    { timestamp: new Date(now.getTime() - 3600000), actionType: 'privilege_escalation', resource: 'admin-panel', outcome: 'success', riskContribution: 0.7 },
    { timestamp: now, actionType: 'file_access', resource: '/etc/shadow', outcome: 'denied', riskContribution: 0.8 },
  ];
}

function generateInsiderThreatActivities(): ActionEvent[] {
  const now = new Date();
  const activities: ActionEvent[] = [
    { timestamp: new Date(now.getTime() - 3600000 * 14), actionType: 'login', resource: 'exec-workstation', outcome: 'success', riskContribution: 0.02, location: 'HQ Building A' },
    { timestamp: new Date(now.getTime() - 3600000 * 13), actionType: 'file_access', resource: '/executive/board-materials/', outcome: 'success', riskContribution: 0.08 },
    { timestamp: new Date(now.getTime() - 3600000 * 12), actionType: 'file_download', resource: 'M&A-plans-confidential.pdf', outcome: 'success', riskContribution: 0.15, details: { sizeMB: 25 } },
    { timestamp: new Date(now.getTime() - 3600000 * 10), actionType: 'database_query', resource: 'hr-database', outcome: 'success', riskContribution: 0.2, details: { rowCount: 5000 } },
    { timestamp: new Date(now.getTime() - 3600000 * 9), actionType: 'file_download', resource: 'employee-salaries.xlsx', outcome: 'success', riskContribution: 0.25, details: { sizeMB: 15 } },
    { timestamp: new Date(now.getTime() - 3600000 * 7), actionType: 'login', resource: 'file-server-02', outcome: 'success', riskContribution: 0.1, location: 'HQ Building B' }, // Different building
    { timestamp: new Date(now.getTime() - 3600000 * 6.5), actionType: 'file_access', source: '/finance/acquisitions/', outcome: 'success', riskContribution: 0.2 },
    { timestamp: new Date(now.getTime() - 3600000 * 5), actionType: 'data_export', resource: 'confidential-merger-data', outcome: 'success', riskContribution: 0.4, details: { sizeMB: 380 } },
    { timestamp: new Date(now.getTime() - 3600000 * 4), actionType: 'usb_copy', resource: 'personal-drive', outcome: 'success', riskContribution: 0.5, details: { sizeMB: 450 } },
    { timestamp: new Date(now.getTime() - 3600000 * 2), actionType: 'email_sent', resource: 'competitor-email.com', outcome: 'success', riskContribution: 0.6 },
    { timestamp: new Date(now.getTime() - 3600000), actionType: 'file_delete', resource: 'audit-trail.log', outcome: 'success', riskContribution: 0.7 },
    { timestamp: now, actionType: 'privilege_escalation', resource: 'domain-admin', outcome: 'success', riskContribution: 0.8 },
  ];
  return activities;
}

// Baseline generators
function createNormalBaseline(): BehaviorBaseline {
  return {
    typicalLoginHours: [0, 0, 0, 0, 0, 0, 0.05, 0.3, 0.8, 0.95, 1.0, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.5, 0.2, 0.05, 0, 0, 0],
    typicalWorkdays: [0, 0.9, 0.95, 0.98, 0.95, 0.9, 0.1],
    avgDailyActions: 45,
    avgDataAccessedMB: 25,
    avgSystemsAccessed: 3,
    typicalLocations: ['Office HQ', 'VPN-Corporate'],
    typicalEndpoints: ['workstation-01', 'file-server-01'],
    typicalResources: ['/projects/', '/shared/', 'email', 'intranet'],
    peerGroupDeviation: 0.1,
  };
}

function createBusyBaseline(): BehaviorBaseline {
  return {
    typicalLoginHours: [0, 0, 0, 0, 0, 0.02, 0.1, 0.5, 0.9, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.5, 0.2, 0.1, 0.02, 0, 0, 0],
    typicalWorkdays: [0.1, 0.95, 1.0, 1.0, 0.98, 0.9, 0.3],
    avgDailyActions: 120,
    avgDataAccessedMB: 150,
    avgSystemsAccessed: 8,
    typicalLocations: ['SOC Building', 'HQ Data Center', 'VPN-Security'],
    typicalEndpoints: ['security-console', 'siem-server', 'threat-intel-platform'],
    typicalResources: ['/incidents/', '/cases/', 'siem-api', 'threat-intel-api', '/ioc/'],
    peerGroupDeviation: 0.2,
  };
}

function createAfterHoursBaseline(): BehaviorBaseline {
  return {
    typicalLoginHours: [0.05, 0.02, 0.01, 0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.28, 0.25, 0.22, 0.2, 0.25, 0.35, 0.5, 0.65, 0.7, 0.5, 0.3, 0.15, 0.08],
    typicalWorkdays: [0.3, 0.5, 0.5, 0.5, 0.5, 0.6, 0.7], // Works weekends too
    avgDailyActions: 80,
    avgDataAccessedMB: 200,
    avgSystemsAccessed: 5,
    typicalLocations: ['Home Office', 'VPN-Developer'],
    typicalEndpoints: ['dev-server-03', 'dev-server-04', 'ci-cd-runner'],
    typicalResources: ['/src/', '/build/', 'git-repo', 'ci-cd-pipeline'],
    peerGroupDeviation: 0.4,
  };
}

function createInsiderBaseline(): BehaviorBaseline {
  return {
    typicalLoginHours: [0, 0, 0, 0, 0, 0, 0.05, 0.4, 0.85, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.6, 0.3, 0.1, 0.02, 0, 0, 0, 0],
    typicalWorkdays: [0, 0.95, 0.98, 1.0, 0.98, 0.9, 0.2],
    avgDailyActions: 35,
    avgDataAccessedMB: 15,
    avgSystemsAccessed: 2,
    typicalLocations: ['Executive Floor', 'HQ Building A'],
    typicalEndpoints: ['exec-workstation', 'exec-printer'],
    typicalResources: ['/executive/', '/board/', 'email', 'calendar'],
    peerGroupDeviation: 0.05, // Very consistent pattern - makes deviations obvious
  };
}

// Export everything
export {
  analyzeBehavior,
  generateDemoBehaviorProfiles,
};
