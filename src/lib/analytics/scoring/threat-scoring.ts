/**
 * National SOC Platform - Threat Scoring Engine
 * 
 * Advanced threat scoring with MITRE ATT&CK framework integration:
 * - CVSS-based vulnerability scoring
 * - MITRE technique severity weighting
 * - Contextual risk factors (asset criticality, exposure)
 * - Temporal decay for aging scores
 * - Composite risk calculation
 */

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface ThreatScore {
  // Primary score (0-100)
  score: number;
  level: 'informational' | 'low' | 'medium' | 'high' | 'critical';
  
  // Score components
  components: ScoreComponents;
  
  // MITRE ATT&CK mapping
  mitreMapping: MITREMapping;
  
  // Contextual factors
  context: RiskContext;
  
  // Metadata
  calculatedAt: Date;
  validUntil: Date;
  version: string;
}

export interface ScoreComponents {
  // Base severity (0-40)
  baseSeverity: number;
  
  // Exploitability (0-25)
  exploitability: number;
  
  // Impact potential (0-20)
  impact: number;
  
  // Contextual adjustments (-10 to +15)
  contextualAdjustment: number;
}

export interface MITREMapping {
  tactics: string[];
  techniques: TechniqueReference[];
  subtechniques?: TechniqueReference[];
  software?: string[];
  groups?: string[]; // Threat actor groups
  mitigations?: string[];
}

export interface TechniqueReference {
  id: string; // e.g., T1059
  name: string;
  severity: number; // 1-10 based on detection difficulty
  frequency: number; // How commonly observed in telecom sector
}

export interface RiskContext {
  assetCriticality: AssetCriticality;
  exposureLevel: ExposureLevel;
  existingControls: ControlEffectiveness;
  threatIntelligence: ThreatIntelConfidence;
  businessImpact: BusinessImpactFactors;
}

export type AssetCriticality = 
  | 'critical'    // Core network infrastructure, HLR/HSS, billing
  | 'high'       // Signaling gateways, policy controllers
  | 'medium'     // Application servers, monitoring
  | 'low'        // Workstations, test environments;

export type ExposureLevel =
  | 'internet-facing'
  | 'dmz'
  | 'internal-restricted'
  | 'isolated';

export type ControlEffectiveness =
  | 'none'        // No controls in place
  | 'partial'     // Basic controls, easily bypassed
  | 'moderate'    // Good controls with some gaps
  | 'strong'      // Comprehensive controls
  | 'optimized'   // Defense-in-depth, mature program;

export type ThreatIntelConfidence =
  | 'unknown'     // No intel available
  | 'low'         // Unverified sources
  | 'medium'      // Industry reports
  | 'high'        // Vendor advisories, active campaigns
  | 'confirmed'   // Observed in our environment or trusted source;

export interface BusinessImpactFactors {
  regulatoryImpact: boolean; // ARTP reporting required?
  revenueImpact: boolean;    // Could affect billing/revenue?
  customerImpact: boolean;   // Customer-visible service impact?
  reputationImpact: boolean; // Brand damage potential?;
}

// ============================================================
// MITRE ATT&CK TECHNIQUE SEVERITY WEIGHTS FOR TELECOM
// ============================================================

/**
 * Pre-defined severity weights for common MITRE techniques
 * Higher weight = more severe in telecom context
 */
export const TELECOM_MITRE_WEIGHTS: Record<string, { severity: number; category: string }> = {
  // Initial Access
  'T1190': { severity: 8, category: 'initial-access' }, // Exploit Public-Facing Application
  'T1133': { severity: 7, category: 'initial-access' }, // External Remote Services
  
  // Execution
  'T1059': { severity: 7, category: 'execution' }, // Command and Scripting Interpreter
  'T1059.001': { severity: 7, category: 'execution' }, // PowerShell
  'T1059.004': { severity: 6, category: 'execution' }, // Unix Shell
  'T1059.007': { severity: 6, category: 'execution' }, // Python
  
  // Persistence
  'T1543': { severity: 8, category: 'persistence' }, // Create or Modify System Process
  'T1547': { severity: 9, category: 'persistence' }, // Boot or Logon Autostart Execution
  
  // Privilege Escalation
  'T1068': { severity: 9, category: 'privilege-escalation' }, // Exploitation for Privilege Escalation
  'T1548': { severity: 8, category: 'privilege-escalation' }, // Abuse Elevation Control Mechanism
  
  // Defense Evasion
  'T1562': { severity: 8, category: 'defense-evasion' }, // Impair Defenses
  'T1562.001': { severity: 8, category: 'defense-evasion' }, // Disable or Modify Tools
  'T1562.004': { severity: 7, category: 'defense-evasion' }, // Disable or Modify System Firewall
  
  // Credential Access
  'T1003': { severity: 9, category: 'credential-access' }, // OS Credential Dumping
  'T1110': { severity: 9, category: 'credential-access' }, // Brute Force
  'T1557': { severity: 8, category: 'credential-access' }, // Adversary-in-the-Middle (SS7 interception!)
  
  // Discovery
  'T1046': { severity: 5, category: 'discovery' }, // Network Service Discovery
  'T1082': { severity: 6, category: 'discovery' }, // System Information Discovery
  'T1083': { severity: 5, category: 'discovery' }, // File and Directory Discovery
  'T1049': { severity: 7, category: 'discovery' }, // Network Service Scanning (for SS7/SIP probing)
  
  // Lateral Movement
  'T1021': { severity: 8, category: 'lateral-movement' }, // Remote Services
  'T1021.004': { severity: 8, category: 'lateral-movement' }, // SSH
  'T1570': { severity: 7, category: 'lateral-movement' }, // Lateral Tool Transfer
  
  // Collection
  'T1005': { severity: 7, category: 'collection' }, // Data from Local System
  'T1113': { severity: 6, category: 'collection' }, // Screen Capture
  'T1125': { severity: 8, category: 'collection' }, // Video Capture (CCTV access?)
  'T1119': { severity: 9, category: 'collection' }, // Automated Collection (bulk data exfil)
  
  // Command and Control
  'T1071': { severity: 7, category: 'c2' }, // Application Layer Protocol
  'T1071.001': { severity: 7, category: 'c2' }, // Web Protocols
  'T1090': { severity: 8, category: 'c2' }, // Proxy
  'T1090.003': { severity: 8, category: 'c2' }, // Multi-hop Proxy (anonymization)
  'T1572': { severity: 6, category: 'c2' }, // Protocol Tunneling (via GTP/SS7?)
  
  // Exfiltration
  'T1041': { severity: 9, category: 'exfiltration' }, // Exfiltration Over C2 Channel
  'T1048': { severity: 8, category: 'exfiltration' }, // Exfiltration Over Alternative Protocol
  'T1537': { severity: 9, category: 'exfiltration' }, // Transfer Data to Cloud Account
  
  // Impact
  'T1486': { severity: 10, category: 'impact' }, // Data Encrypted for Impact (Ransomware!)
  'T1489': { severity: 9, category: 'impact' }, // Service Stop (network outage)
  'T1498': { severity: 8, category: 'impact' }, // Network Denial of Service
  'T1499': { severity: 10, category: 'impact' }, // Endpoint Denial of Service
  'T1499.001': { severity: 10, category: 'impact' }, // OS Exhaustion Flood
  'T1499.004': { severity: 9, category: 'impact' }, // Application or System Exploitation (SS7 flooding?)
};

// ============================================================
// ASSET CRITICALITY WEIGHTS
// ============================================================

const ASSET_CRITICALITY_SCORES: Record<AssetCriticality, number> = {
  'critical': 30,
  'high': 22,
  'medium': 14,
  'low': 6,
};

const EXPOSURE_MULTIPLIERS: Record<ExposureLevel, number> = {
  'internet-facing': 1.5,
  'dmz': 1.3,
  'internal-restricted': 1.0,
  'isolated': 0.7,
};

const CONTROL_EFFECTIVENESS_REDUCTION: Record<ControlEffectiveness, number> = {
  'none': 0,          // No reduction
  'partial': 0.05,     // 5% reduction
  'moderate': 0.12,    // 12% reduction
  'strong': 0.20,      // 20% reduction
  'optimized': 0.30,   // 30% reduction
};

const THREAT_INTEL_BONUS: Record<ThreatIntelConfidence, number> = {
  'unknown': 0,
  'low': 2,
  'medium': 5,
  'high': 8,
  'confirmed': 12,
};

// ============================================================
// MAIN SCORING FUNCTION
// ============================================================

/**
 * Calculate comprehensive threat score
 */
export function calculateThreatScore(params: {
  // Base information
  alertType: string;
  severity?: 'info' | 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  
  // MITRE mapping
  mitreTechniques?: string[];
  mitreTactics?: string[];
  
  // Context
  assetType?: AssetCriticality;
  exposure?: ExposureLevel;
  controls?: ControlEffectiveness;
  threatIntel?: ThreatIntelConfidence;
  
  // Business impact
  requiresARTPReporting?: boolean;
  affectsRevenue?: boolean;
  affectsCustomers?: boolean;
  affectsReputation?: boolean;
  
  // Additional factors
  isZeroDay?: boolean;
  hasActiveExploit?: boolean;
  targetIsExecutive?: boolean;
  involvesPII?: boolean;
  involvesBilling?: boolean;
}): ThreatScore {
  const now = new Date();
  
  // 1. Calculate base severity (0-40)
  const baseSeverity = calculateBaseSeverity(
    params.severity || 'medium',
    params.alertType,
    params.isZeroDay || false,
    params.hasActiveExploit || false
  );
  
  // 2. Calculate exploitability (0-25)
  const exploitability = calculateExploitability(
    params.mitreTechniques || [],
    params.exposure || 'internal-restricted',
    params.controls || 'moderate'
  );
  
  // 3. Calculate impact (0-20)
  const impact = calculateImpact({
    assetType: params.assetType || 'medium',
    affectsRevenue: params.affectsRevenue || false,
    affectsCustomers: params.affectsCustomers || false,
    affectsReputation: params.affectsReputation || false,
    involvesPII: params.involvesPII || false,
    involvesBilling: params.involvesBilling || false,
    targetIsExecutive: params.targetIsExecutive || false,
  });
  
  // 4. Calculate contextual adjustment (-10 to +15)
  const contextualAdjustment = calculateContextualAdjustment({
    threatIntel: params.threatIntel || 'unknown',
    requiresARTPReporting: params.requiresARTPReporting || false,
    assetType: params.assetType || 'medium',
    controls: params.controls || 'moderate',
  });
  
  // Combine components
  const rawScore = Math.max(0, Math.min(100,
    baseSeverity +
    exploitability +
    impact +
    contextualAdjustment
  ));
  
  // Determine score level
  const level = getScoreLevel(rawScore);
  
  // Build MITRE mapping
  const mitreMapping = buildMITREMapping(params.mitreTechniques || [], params.mitreTactics || []);
  
  // Build context object
  const context: RiskContext = {
    assetCriticality: params.assetType || 'medium',
    exposureLevel: params.exposure || 'internal-restricted',
    existingControls: params.controls || 'moderate',
    threatIntelligence: params.threatIntel || 'unknown',
    businessImpact: {
      regulatoryImpact: params.requiresARTPReporting || false,
      revenueImpact: params.affectsRevenue || false,
      customerImpact: params.affectsCustomers || false,
      reputationImpact: params.affectsReputation || false,
    },
  };
  
  return {
    score: Math.round(rawScore * 10) / 10,
    level,
    components: {
      baseSeverity,
      exploitability,
      impact,
      contextualAdjustment,
    },
    mitreMapping,
    context,
    calculatedAt: now,
    validUntil: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Valid for 24 hours
    version: '2.0.0',
  };
}

// ============================================================
// COMPONENT CALCULATIONS
// ============================================================

function calculateBaseSeverity(
  severity: string,
  alertType: string,
  isZeroDay: boolean,
  hasActiveExploit: number
): number {
  const baseScores: Record<string, number> = {
    'info': 5,
    'low': 12,
    'medium': 22,
    'high': 32,
    'critical': 38,
  };
  
  let score = baseScores[severity] || 15;
  
  // Adjustments for special conditions
  if (isZeroDay) score += 8;
  if (hasActiveExploit) score += 5;
  
  // Alert type modifiers
  const highRiskTypes = [
    'ransomware', 'data_breach', 'privilege_escalation',
    'ss7_attack', 'fraud', 'apt', 'zero_day',
    'account_compromise', 'malware_c2', 'data_exfiltration'
  ];
  
  if (highRiskTypes.some(t => alertType.toLowerCase().includes(t))) {
    score = Math.min(40, score + 5);
  }
  
  return Math.min(40, score);
}

function calculateExploitability(
  techniques: string[],
  exposure: ExposureLevel,
  controls: ControlEffectiveness
): number {
  let score = 10; // Base exploitability
  
  // Add for each MITRE technique (weighted by severity)
  techniques.forEach(techId => {
    const techInfo = TELECOM_MITRE_WEIGHTS[techId];
    if (techInfo) {
      score += techInfo.severity * 0.5;
    } else {
      score += 3; // Unknown technique, moderate risk
    }
  });
  
  // Apply exposure multiplier
  score *= EXPOSURE_MULTIPLIERS[exposure];
  
  // Reduce based on control effectiveness
  const reduction = CONTROL_EFFECTIVENESS_REDUCTION[controls];
  score *= (1 - reduction);
  
  return Math.min(25, Math.round(score));
}

function calculateImpact(params: {
  assetType: AssetCriticality;
  affectsRevenue: boolean;
  affectsCustomers: boolean;
  affectsReputation: boolean;
  involvesPII: boolean;
  involvesBilling: boolean;
  targetIsExecutive: boolean;
}): number {
  let score = ASSET_CRITICALITY_SCORES[params.assetType];
  
  // Business impact additions
  if (params.affectsRevenue) score += 4;
  if (params.affectsCustomers) score += 3;
  if (params.affectsReputation) score += 2;
  if (params.involvesPII) score += 3;
  if (params.involvesBilling) score += 4; // Billing fraud is serious!
  if (params.targetIsExecutive) score += 3;
  
  return Math.min(20, score);
}

function calculateContextualAdjustment(params: {
  threatIntel: ThreatIntelConfidence;
  requiresARTPReporting: boolean;
  assetType: AssetCriticality;
  controls: ControlEffectiveness;
}): number {
  let adjustment = 0;
  
  // Threat intelligence bonus
  adjustment += THREAT_INTEL_BONUS[params.threatIntel];
  
  // ARTP reporting requirement adds urgency
  if (params.requiresARTPReporting) adjustment += 3;
  
  // Critical assets with weak controls get penalty
  if (params.assetType === 'critical' && (params.controls === 'none' || params.controls === 'partial')) {
    adjustment += 5;
  }
  
  // Cap the adjustment range
  return Math.max(-10, Math.min(15, adjustment));
}

function buildMITREMapping(techniques: string[], tactics: string[]): MITREMapping {
  const mappedTechniques: TechniqueReference[] = techniques.map(techId => {
    const info = TELECOM_MITRE_WEIGHTS[techId];
    return {
      id: techId,
      name: info?.name || `Unknown Technique (${techId})`,
      severity: info?.severity || 5,
      frequency: info ? 7 : 3, // Default frequency
    };
  });

  // Determine likely tactics from techniques
  const detectedTactics = tactics.length > 0 ? tactics : [...new Set(
    mappedTechniques
      .map(t => TELECOM_MITRE_WEIGHTS[t.id]?.category)
      .filter(Boolean)
  )];

  return {
    tactics: detectedTactics,
    techniques: mappedTechniques,
    mitigations: generateMitigationSuggestions(mappedTechniques),
  };
}

function generateMitigationSuggestions(techniques: TechniqueReference[]): string[] {
  const suggestions = new Set<string>();
  
  techniques.forEach(tech => {
    // Map technique categories to general mitigations
    if (['initial-access'].includes(TELECOM_MITRE_WEIGHTS[tech.id]?.category || '')) {
      suggestions.add('Implement network segmentation');
      suggestions.add('Deploy WAF/IDS at perimeter');
    }
    if (['execution'].includes(TELECOM_MITRE_WEIGHTS[tech.id]?.category || '')) {
      suggestions.add('Enable application allowlisting');
      suggestions.add('Monitor for suspicious process execution');
    }
    if (['credential-access'].includes(TELECOM_MITRE_WEIGHTS[tech.id]?.category || '')) {
      suggestions.add('Enforce MFA for all privileged accounts');
      suggestions.add('Implement credential guardrails');
    }
    if (['lateral-movement'].includes(TELECOM_MITRE_WEIGHTS[tech.id]?.category || '')) {
      suggestions.add('Segment network zones');
      suggestions.add('Monitor for unusual RDP/SSH activity');
    }
    if (['exfiltration'].includes(TELECOM_MITRE_WEIGHTS[tech.id]?.category || '')) {
      suggestions.add('Implement DLP solution');
      suggestions.add('Monitor data transfer volumes');
    }
    if (['impact'].includes(TELECOM_MITRE_WEIGHTS[tech.id]?.category || '')) {
      suggestions.add('Ensure backup integrity');
      suggestions.add('Test incident response procedures');
    }
  });
  
  // Always include these baseline suggestions
  suggestions.add('Review and update security policies');
  suggestions.add('Conduct security awareness training');
  
  return Array.from(suggestions).slice(0, 8); // Limit to top 8
}

function getScoreLevel(score: number): ThreatScore['level'] {
  if (score >= 85) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 45) return 'medium';
  if (score >= 20) return 'low';
  return 'informational';
}

// ============================================================
// BATCH SCORING & PRIORITIZATION
// ============================================================

export interface PrioritizedAlert {
  alertId: string;
  score: ThreatScore;
  priority: number; // 1 = highest priority
  recommendedAction: string;
  slaMinutes: number; // Target response time
}

/**
 * Score multiple alerts and prioritize them
 */
export function prioritizeAlerts(alerts: Array<{
  id: any;
  [key: string]: any;
}>): PrioritizedAlert[] {
  const scoredAlerts = alerts.map(alert => {
    const score = calculateThreatScore(alert);
    
    return {
      alertId: String(alert.id),
      score,
      priority: 0, // Will be set after sorting
      recommendedAction: getRecommendedAction(score),
      slaMinutes: getSLA(score.level),
    };
  });
  
  // Sort by score descending
  scoredAlerts.sort((a, b) => b.score.score - a.score.score);
  
  // Assign priorities
  scoredAlerts.forEach((alert, index) => {
    alert.priority = index + 1;
  });
  
  return scoredAlerts;
}

function getRecommendedAction(score: ThreatScore): string {
  switch (score.level) {
    case 'critical':
      return 'IMMEDIATE: Page on-call SOC team, initiate incident response';
    case 'high':
      return 'URGENT: Assign to senior analyst within 15 minutes';
    case 'medium':
      return 'STANDARD: Queue for analyst review within 1 hour';
    case 'low':
      return 'LOW: Review during next shift, consider auto-closing';
    case 'informational':
      return 'INFO: Log only, no action required unless pattern emerges';
    default:
      return 'UNKNOWN: Manual review required';
  }
}

function getSLA(level: ThreatScore['level']): number {
  switch (level) {
    case 'critical': return 15; // 15 minutes
    case 'high': return 60; // 1 hour
    case 'medium': return 240; // 4 hours
    case 'low': return 1440; // 24 hours
    case 'informational': return 10080; // 7 days
    default: return 1440;
  }
}

// ============================================================
// EXPORTS
// ============================================================

export {
  TELECOM_MITRE_WEIGHTS,
  ASSET_CRITICALITY_SCORES,
  EXPOSURE_MULTIPLIERS,
  CONTROL_EFFECTIVENESS_REDUCTION,
  THREAT_INTEL_BONUS,
  type ThreatScore,
  type ScoreComponents,
  type MITREMapping,
  type TechniqueReference,
  type RiskContext,
  type AssetCriticality,
  type ExposureLevel,
  type ControlEffectiveness,
  type ThreatIntelConfidence,
  type BusinessImpactFactors,
  type PrioritizedAlert,
};
