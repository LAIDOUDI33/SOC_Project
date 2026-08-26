/**
 * National SOC Platform - ML-Powered Threat Intelligence Engine
 * 
 * Advanced threat intelligence processing using machine learning:
 * - IOC (Indicators of Compromise) scoring with ML
 * - Threat actor behavior pattern analysis
 * - Attack campaign clustering using similarity algorithms
 * - Zero-day prediction heuristics
 * - Threat feed correlation and deduplication
 * - MITRE ATT&CK technique mapping with confidence scores
 * 
 * @version 1.0.0 (Phase 6 Enhancement)
 * @module analytics/ml/threat-intelligence-ml
 */

// ============================================================
// TYPES & INTERFACES
// ============================================================

/** Indicator of Compromise (IOC) */
export interface IOC {
  id: string;
  type: IOCTypes;
  value: string;
  
  // Context
  source: string;
  sourceConfidence: number; // 0-1 from source
  firstSeen: Date;
  lastSeen?: Date;
  
  // ML-enhanced fields
  mlScore: number; // 0-100, ML computed score
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  isVerified: boolean;
  falsePositiveRate: number;
  
  // Contextual data
  tags: string[];
  relatedThreatActors: string[];
  campaigns: string[];
  mitreTechniques: string[];
  
  // Correlation data
  correlationCount: number;
  sightings: number[];
  
  // Metadata
  ttl?: number; // Time to live in hours
  metadata?: Record<string, any>;
}

/** Types of IOCs */
export type IOCTypes = 
  | 'ip'
  | 'domain'
  | 'url'
  | 'hash_md5'
  | 'hash_sha1'
  | 'hash_sha256'
  | 'email'
  | 'mutex'
  | 'registry_key'
  | 'filename'
  | 'ss7_address'
  | 'imsi'
  | 'imei'
  | 'msisdn'
  | 'sip_uri'
  | 'diameter_host';

/** Threat Actor Profile */
export interface ThreatActor {
  id: string;
  name: string;
  aliases: string[];
  
  // Classification
  sophistication: 'novice' | 'intermediate' | 'advanced' | 'expert';
  motivation: 'financial' | 'espionage' | 'sabotage' | 'hacktivism' | 'warfare' | 'unknown';
  origin: string; // Country/region
  sectorFocus: string[]; // Target sectors
  
  // Behavioral patterns (ML learned)
  behavioralProfile: BehavioralPattern;
  
  // Capabilities
  knownTools: string[];
  infrastructure: InfrastructureIndicator[];
  
  // Activity timeline
  activityTimeline: ActivityEvent[];
  
  // MITRE ATT&CK coverage
  mitreCoverage: MITRETechniqueMapping[];
  
  // Risk assessment
  riskScore: number; // 0-100
  threatLevel: 'active' | 'dormant' | 'disrupted' | 'unknown';
  
  // Metadata
  lastUpdated: Date;
  confidence: number; // Overall confidence in profile accuracy
}

/** Behavioral pattern for threat actor */
export interface BehavioralPattern {
  // Temporal patterns
  activeHours: number[]; // 0-23 probability distribution
  activeDays: number[]; // 0-6 probability distribution
  
  // Operational patterns
  avgDwellTimeDays: number;
  preferredProtocols: string[];
  attackComplexity: number; // 0-1
  
  // Targeting preferences
  targetGeography: Record<string, number>; // Country -> weight
  targetIndustry: Record<string, number>; // Industry -> weight
  targetSize: 'small' | 'medium' | 'large' | 'any';
  
  // Evasion techniques
  usesEncryption: boolean;
  usesLivingOffLand: boolean;
  antiForensicsLevel: number; // 0-1
}

/** Infrastructure indicator */
export interface InfrastructureIndicator {
  type: 'c2' | 'phishing' | 'exfil' | 'download' | 'redirect';
  value: string;
  isActive: boolean;
  firstSeen: Date;
  lastSeen?: Date;
}

/** Activity event in timeline */
export interface ActivityEvent {
  timestamp: Date;
  type: 'attack' | 'campaign_start' | 'tool_deployment' | 'infrastructure_change' | 'attribution_update';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  iocs: string[]; // IOC IDs
  targets: string[];
}

/** Attack Campaign */
export interface AttackCampaign {
  id: string;
  name: string;
  
  // Classification
  status: 'active' | 'concluded' | 'dormant' | 'emerging';
  type: CampaignType;
  threatActorId: string;
  
  // Timeline
  startDate: Date;
  endDate?: Date;
  
  // Targets
  targetSectors: string[];
  targetGeography: string[];
  
  // IOCs and indicators
  iocs: string[];
  attackPatterns: AttackPattern[];
  
  // Clustering info
  clusterId: string;
  similarityScore: number; // How similar to other campaigns
  parentCampaign?: string; // If this is a sub-campaign
  
  // Impact assessment
  estimatedVictims: number;
  estimatedDamageUSD: number;
  
  // ML predictions
  predictedDuration?: number; // Days
  nextPredictedAction?: PredictedAction;
  
  // MITRE mapping
  killChainPhase: KillChainPhase[];
  mitreTechniques: string[];
}

/** Types of campaigns */
export type CampaignType = 
  | 'apt'
  | 'ransomware'
  | 'banking_trojan'
  | 'credential_theft'
  | 'supply_chain'
  | 'telecom_fraud'
  | 'espionage'
  | 'ddos'
  | 'data_breach'
  | 'ss7_attack'
  | 'sim_swap'
  | 'interception';

/** Attack pattern within campaign */
export interface AttackPattern {
  sequence: number;
  technique: string;
  tactic: string;
  mitreId: string;
  confidence: number;
  timestamp?: Date;
  indicators: string[];
}

/** Predicted next action */
export interface PredictedAction {
  action: string;
  technique: string;
  probability: number;
  timeframe: string; // e.g., "24-48h"
  confidence: number;
  basedOn: string; // What this prediction is based on
}

/** MITRE ATT&CK Technique Mapping */
export interface MITRETechniqueMapping {
  techniqueId: string;
  techniqueName: string;
  tactic: string;
  confidence: number; // 0-1 how confident we are this actor uses this
  frequency: number; // How often observed
  firstObserved: Date;
  lastObserved: Date;
  sources: string[];
}

/** Kill Chain Phase */
export type KillChainPhase = 
  | 'reconnaissance'
  | 'weaponization'
  | 'delivery'
  | 'exploitation'
  | 'installation'
  | 'command_and_control'
  | 'actions_on_objectives';

/** Zero-day vulnerability prediction */
export interface ZeroDayPrediction {
  id: string;
  
  // Prediction details
  predictedVulnerabilityType: string;
  affectedProducts: string[];
  affectedPlatforms: string[];
  
  // Confidence and timing
  confidence: number; // 0-100
  timeHorizon: string; // e.g., "30 days", "90 days"
  probabilityOfExploitation: number;
  
  // Supporting evidence
  indicators: string[];
  relatedThreatActors: string[];
  similarHistoricalVulns: string[];
  
  // Recommendations
  recommendedMitigations: string[];
  monitoringRecommendations: string[];
  
  // Metadata
  createdAt: Date;
  expiresAt: Date;
  modelVersion: string;
}

/** Threat feed entry for correlation */
export interface ThreatFeedEntry {
  feedName: string;
  feedType: 'open_source' | 'commercial' | 'government' | 'internal' | 'community';
  iocs: Partial<IOC>[];
  lastUpdate: Date;
  reliability: number; // 0-1
  coverage: string[]; // What types of threats it covers
  latencyMinutes: number; // How fresh is the data
}

/** Correlated threat intelligence */
export interface CorrelatedIntelligence {
  primaryIOC: IOC;
  correlatedIOCs: Array<{
    ioc: IOC;
    correlationStrength: number; // 0-1
    correlationType: CorrelationType;
    sharedAttributes: string[];
  }>;
  campaignAssociation?: AttackCampaign;
  threatActorAssociation?: ThreatActor;
  combinedRiskScore: number;
  confidence: number;
  lastUpdated: Date;
}

/** Types of correlations between IOCs */
export type CorrelationType = 
  | 'infrastructure_shared'
  | 'temporal_proximity'
  | 'behavioral_similarity'
  | 'registration_pattern'
  | 'whois_relation'
  | 'ssl_certificate'
  | 'passive_dns'
  | 'malware_family'
  | 'campaign_association';

/** Scoring configuration */
export interface IOCScoringConfig {
  // Weight factors
  ageWeight: number; // Newer IOCs may be more relevant
  sourceReliabilityWeight: number;
  sightingCountWeight: number;
  contextWeight: number;
  
  // Thresholds
  criticalThreshold: number;
  highThreshold: number;
  mediumThreshold: number;
  
  // Decay settings
  scoreDecayHalfLifeHours: number;
  
  // False positive adjustment
  fpHistoryWeight: number;
}

// ============================================================
// DEFAULT CONFIGURATIONS FOR DJEZZY SOC
// ============================================================

/** Default IOC scoring configuration */
export const DEFAULT_IOC_SCORING_CONFIG: IOCScoringConfig = {
  ageWeight: 0.15,
  sourceReliabilityWeight: 0.25,
  sightingCountWeight: 0.20,
  contextWeight: 0.40,
  criticalThreshold: 85,
  highThreshold: 70,
  mediumThreshold: 50,
  scoreDecayHalfLifeHours: 720, // 30 days
  fpHistoryWeight: 0.10,
};

/** Known threat actor base profiles */
export const KNOWN_THREAT_ACTOR_PROFILES: Partial<ThreatActor>[] = [
  {
    name: 'APT-ALG-001',
    sophistication: 'advanced',
    motivation: 'espionage',
    origin: 'Unknown',
    sectorFocus: ['telecommunications', 'government', 'energy'],
    riskScore: 85,
    threatLevel: 'active',
  },
  {
    name: 'TelecomFraudGroup-EU',
    sophistication: 'intermediate',
    motivation: 'financial',
    origin: 'Eastern Europe',
    sectorFocus: ['telecommunications', 'banking'],
    riskScore: 72,
    threatLevel: 'active',
  },
  {
    name: 'SIMSwapSyndicate',
    sophistication: 'advanced',
    motivation: 'financial',
    origin: 'West Africa',
    sectorFocus: ['telecommunications', 'financial_services'],
    riskScore: 78,
    threatLevel: 'active',
  },
  {
    name: 'SS7ExploitationTeam',
    sophistication: 'expert',
    motivation: 'espionage',
    origin: 'State-Sponsored',
    sectorFocus: ['telecommunications', 'government', 'military'],
    riskScore: 92,
    threatLevel: 'active',
  },
];

// ============================================================
// IOC SCORING ENGINE
// ============================================================

/**
 * ML-powered IOC Scoring Engine
 * Scores Indicators of Compromise using multiple factors
 */
export class IOCScoringEngine {
  private config: IOCScoringConfig;
  private historicalScores: Map<string, { score: number; timestamp: Date }[]> = new Map();
  private falsePositiveHistory: Map<string, boolean[]> = new Map();

  constructor(config: IOCScoringConfig = DEFAULT_IOC_SCORING_CONFIG) {
    this.config = config;
  }

  /**
   * Score an IOC using ML-enhanced algorithm
   */
  scoreIOC(ioc: Partial<IOC>): IOC {
    const now = new Date();
    
    // Base score from source confidence
    let score = (ioc.sourceConfidence ?? 0.5) * 50;

    // Factor 1: Age scoring (newer may be more relevant, but established IOCs have more trust)
    if (ioc.firstSeen) {
      const ageHours = (now.getTime() - ioc.firstSeen.getTime()) / (1000 * 60 * 60);
      const ageDecay = Math.pow(0.5, ageHours / this.config.scoreDecayHalfLifeHours);
      
      // Balance between recency and establishment
      const recencyBonus = ageHours < 168 ? 15 : 0; // Bonus for IOCs < 1 week old
      const establishmentBonus = ageHours > 720 && (ioc.sightings?.length ?? 0) > 10 ? 10 : 0;
      
      score += recencyBonus + establishmentBonus - (1 - ageDecay) * 10 * this.config.ageWeight;
    }

    // Factor 2: Source reliability
    const sourceReliability = this.getSourceReliability(ioc.source ?? '');
    score += sourceReliability * 30 * this.config.sourceReliabilityWeight;

    // Factor 3: Sighting count and pattern
    if (ioc.sightings && ioc.sightings.length > 0) {
      const recentSightings = ioc.sightings.filter(s => {
        const sightingDate = typeof s === 'number' ? s : s;
        return (now.getTime() - sightingDate) < 7 * 24 * 60 * 60 * 1000; // Last 7 days
      }).length;
      
      const sightingScore = Math.min(20, recentSightings * 2 + ioc.sightings.length * 0.5);
      score += sightingScore * this.config.sightingCountWeight;
    }

    // Factor 4: Context enrichment
    score += this.scoreContext(ioc) * this.config.contextWeight;

    // Factor 5: Correlation boost
    if (ioc.correlationCount && ioc.correlationCount > 0) {
      score += Math.min(15, ioc.correlationCount * 3);
    }

    // Factor 6: Type-specific adjustments
    score += this.getTypeSpecificAdjustment(ioc.type ?? 'ip');

    // Factor 7: False positive history adjustment
    const fpAdjustment = this.getFalsePositiveAdjustment(ioc.id ?? '');
    score -= fpAdjustment * this.config.fpHistoryWeight * 30;

    // Normalize to 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine risk level
    const riskLevel = this.getRiskLevel(score);

    // Store historical score
    this.recordHistoricalScore(ioc.id ?? '', score);

    return {
      id: ioc.id ?? `ioc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: ioc.type ?? 'ip',
      value: ioc.value ?? '',
      source: ioc.source ?? 'unknown',
      sourceConfidence: ioc.sourceConfidence ?? 0.5,
      firstSeen: ioc.firstSeen ?? now,
      lastSeen: ioc.lastSeen,
      mlScore: Math.round(score),
      riskLevel,
      isVerified: ioc.isVerified ?? false,
      falsePositiveRate: this.calculateFalsePositiveRate(ioc.id ?? ''),
      tags: ioc.tags ?? [],
      relatedThreatActors: ioc.relatedThreatActors ?? [],
      campaigns: ioc.campaigns ?? [],
      mitreTechniques: ioc.mitreTechniques ?? [],
      correlationCount: ioc.correlationCount ?? 0,
      sightings: ioc.sightings ?? [],
      metadata: ioc.metadata,
    };
  }

  /**
   * Score multiple IOCs in batch
   */
  scoreBatch(iocs: Partial<IOC>[]): IOC[] {
    return iocs.map(ioc => this.scoreIOC(ioc));
  }

  /**
   * Get source reliability score
   */
  private getSourceReliability(source: string): number {
    const sourceScores: Record<string, number> = {
      'virustotal': 0.95,
      'alienvault': 0.90,
      'mandiant': 0.95,
      'crowdstrike': 0.93,
      'paloalto': 0.90,
      'cisa': 0.98,
      'internal': 0.85,
      'djezzy-soc': 0.90,
      'community': 0.60,
      'unknown': 0.50,
    };

    const normalizedSource = source.toLowerCase().trim();
    
    // Check for partial matches
    for (const [key, score] of Object.entries(sourceScores)) {
      if (normalizedSource.includes(key)) {
        return score;
      }
    }
    
    return 0.5; // Default for unknown sources
  }

  /**
   * Score contextual information
   */
  private scoreContext(ioc: Partial<IOC>): number {
    let contextScore = 0;

    // Tags provide context
    if (ioc.tags && ioc.tags.length > 0) {
      const highValueTags = ['malware', 'apt', 'c2', 'phishing', 'ransomware', 'zero-day'];
      const matchedTags = ioc.tags.filter(t => 
        highValueTags.some(hvt => t.toLowerCase().includes(hvt))
      );
      contextScore += matchedTags.length * 8;
    }

    // Related threat actors increase concern
    if (ioc.relatedThreatActors && ioc.relatedThreatActors.length > 0) {
      contextScore += ioc.relatedThreatActors.length * 5;
    }

    // MITRE techniques mapping adds credibility
    if (ioc.mitreTechniques && ioc.mitreTechniques.length > 0) {
      contextScore += Math.min(15, ioc.mitreTechniques.length * 3);
    }

    // Campaign association
    if (ioc.campaigns && ioc.campaigns.length > 0) {
      contextScore += ioc.campaigns.length * 6;
    }

    return Math.min(30, contextScore);
  }

  /**
   * Get type-specific score adjustments
   */
  private getTypeSpecificAdjustment(type: IOCTypes): number {
    const adjustments: Record<IOCTypes, number> = {
      ip: 0,
      domain: 2,
      url: 3,
      hash_md5: 5,
      hash_sha1: 6,
      hash_sha256: 8,
      email: 4,
      mutex: 3,
      registry_key: 4,
      filename: 2,
      ss7_address: 15, // Telecom specific - high value
      imsi: 12, // Subscriber identity - sensitive
      imei: 10, // Device identity
      msisdn: 11, // Phone number
      sip_uri: 8, // VoIP identifier
      diameter_host: 10, // Core network element
    };

    return adjustments[type] ?? 0;
  }

  /**
   * Get risk level from numeric score
   */
  private getRiskLevel(score: number): IOC['riskLevel'] {
    if (score >= this.config.criticalThreshold) return 'critical';
    if (score >= this.config.highThreshold) return 'high';
    if (score >= this.config.mediumThreshold) return 'medium';
    return 'low';
  }

  /**
   * Record historical score for trend analysis
   */
  private recordHistoricalScore(iocId: string, score: number): void {
    const history = this.historicalScores.get(iocId) || [];
    history.push({ score, timestamp: new Date() });
    
    // Keep last 100 entries
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.historicalScores.set(iocId, history);
  }

  /**
   * Get false positive rate for an IOC
   */
  calculateFalsePositiveRate(iocId: string): number {
    const fpHistory = this.falsePositiveHistory.get(iocId) || [];
    if (fpHistory.length === 0) return 0;
    
    const fpCount = fpHistory.filter(fp => fp).length;
    return fpCount / fpHistory.length;
  }

  /**
   * Get false positive adjustment factor
   */
  private getFalsePositiveAdjustment(iocId: string): number {
    const fpRate = this.calculateFalsePositiveRate(iocId);
    return fpRate; // Returns 0-1, will be multiplied by weight
  }

  /**
   * Report a false positive for an IOC
   */
  reportFalsePositive(iocId: string, isFalsePositive: boolean): void {
    const history = this.falsePositiveHistory.get(iocId) || [];
    history.push(isFalsePositive);
    
    // Keep last 50 entries
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    this.falsePositiveHistory.set(iocId, history);
  }

  /**
   * Get score trend for an IOC
   */
  getScoreTrend(iocId: string): 'rising' | 'falling' | 'stable' | 'unknown' {
    const history = this.historicalScores.get(iocId);
    if (!history || history.length < 5) return 'unknown';
    
    const recent = history.slice(-5);
    const older = history.slice(-10, -5);
    
    if (older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, h) => sum + h.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + h.score, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.1) return 'rising';
    if (change < -0.1) return 'falling';
    return 'stable';
  }
}

// ============================================================
// THREAT ACTOR BEHAVIOR ANALYSIS
// ============================================================

/**
 * Threat Actor Behavior Pattern Analyzer
 * Analyzes and learns from threat actor behaviors
 */
export class ThreatActorAnalyzer {
  private actors: Map<string, ThreatActor> = new Map();
  private behaviorModels: Map<string, BehaviorModel> = new Map();

  /**
   * Register or update a threat actor profile
   */
  registerActor(actor: ThreatActor): void {
    this.actors.set(actor.id, actor);
    this.updateBehaviorModel(actor.id);
  }

  /**
   * Analyze behavior patterns for a threat actor
   */
  analyzeBehavior(actorId: string): BehavioralAnalysisResult | null {
    const actor = this.actors.get(actorId);
    if (!actor) return null;

    const model = this.behaviorModels.get(actorId);
    if (!model) return null;

    // Calculate various behavioral metrics
    const temporalConsistency = this.calculateTemporalConsistency(actor);
    const operationalMaturity = this.calculateOperationalMaturity(actor);
    const targetingPrecision = this.calculateTargetingPrecision(actor);
    const evolutionScore = this.calculateEvolutionScore(actor);
    const predictabilityIndex = this.calculatePredictabilityIndex(model);

    // Generate predictions
    const predictions = this.generateBehavioralPredictions(actor, model);

    return {
      actorId,
      temporalConsistency,
      operationalMaturity,
      targetingPrecision,
      evolutionScore,
      predictabilityIndex,
      overallBehavioralScore: (
        temporalConsistency * 0.2 +
        operationalMaturity * 0.25 +
        targetingPrecision * 0.2 +
        evolutionScore * 0.15 +
        (1 - predictabilityIndex) * 0.2 // Less predictable = more dangerous
      ),
      predictions,
      analyzedAt: new Date(),
    };
  }

  /**
   * Find similar actors based on behavior
   */
  findSimilarActors(actorId: string, threshold: number = 0.7): SimilarActorResult[] {
    const actor = this.actors.get(actorId);
    if (!actor) return [];

    const results: SimilarActorResult[] = [];
    const targetModel = this.behaviorModels.get(actorId);

    if (!targetModel) return results;

    for (const [otherId, otherActor] of this.actors) {
      if (otherId === actorId) continue;

      const otherModel = this.behaviorModels.get(otherId);
      if (!otherModel) continue;

      const similarity = this.calculateBehaviorSimilarity(targetModel, otherModel);

      if (similarity >= threshold) {
        results.push({
          actorId: otherId,
          actorName: otherActor.name,
          similarity,
          sharedBehaviors: this.findSharedBehaviors(targetModel, otherModel),
          differences: this.findBehaviorDifferences(targetModel, otherModel),
        });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Update internal behavior model for an actor
   */
  private updateBehaviorModel(actorId: string): void {
    const actor = this.actors.get(actorId);
    if (!actor) return;

    const existingModel = this.behaviorModels.get(actorId);
    
    const model: BehaviorModel = {
      actorId,
      temporalPatterns: actor.behavioralProfile.activeHours.map((prob, hour) => ({
        hour,
        probability: prob,
        variance: existingModel?.temporalPatterns[hour]?.variance ?? 0.1,
      })),
      protocolDistribution: this.extractProtocolDistribution(actor),
      toolUsageFrequency: this.extractToolUsage(actor),
      targetPatterns: actor.behavioralProfile.targetIndustry,
      dwellTimeStats: {
        mean: actor.behavioralProfile.avgDwellTimeDays,
        stdDev: actor.behavioralProfile.avgDwellTimeDays * 0.3, // Estimate
        min: actor.behavioralProfile.avgDwellTimeDays * 0.5,
        max: actor.behavioralProfile.avgDwellTimeDays * 2,
      },
      attackComplexityTrend: existingModel?.attackComplexityTrend ?? [actor.behavioralProfile.attackComplexity],
      lastUpdated: new Date(),
    };

    this.behaviorModels.set(actorId, model);
  }

  /**
   * Calculate temporal consistency of operations
   */
  private calculateTemporalConsistency(actor: ThreatActor): number {
    const hours = actor.behavioralProfile.activeHours;
    
    // Calculate entropy (lower = more consistent)
    const totalProb = hours.reduce((a, b) => a + b, 0) || 1;
    let entropy = 0;
    
    for (const prob of hours) {
      const p = prob / totalProb;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    
    maxEntropy = Math.log2(24); // Max entropy for 24 hours
    
    // Convert to consistency score (higher = more consistent)
    return 1 - (entropy / maxEntropy);
  }

  /**
   * Calculate operational maturity level
   */
  private calculateOperationalMaturity(actor: ThreatActor): number {
    let maturity = 0;

    // Sophistication level
    switch (actor.sophistication) {
      case 'expert': maturity += 35; break;
      case 'advanced': maturity += 28; break;
      case 'intermediate': maturity += 18; break;
      case 'novice': maturity += 8; break;
    }

    // Tool diversity
    maturity += Math.min(20, actor.knownTools.length * 2);

    // Anti-forensics capability
    maturity += actor.behavioralProfile.antiForensicsLevel * 15;

    // Living-off-land techniques
    if (actor.behavioralProfile.usesLivingOffLand) maturity += 10;

    // Encryption usage
    if (actor.behavioralProfile.usesEncryption) maturity += 10;

    // Infrastructure management
    maturity += Math.min(10, actor.infrastructure.length * 2);

    return Math.min(100, maturity);
  }

  /**
   * Calculate targeting precision
   */
  private calculateTargetingPrecision(actor: ThreatActor): number {
    const industries = Object.values(actor.behavioralProfile.targetIndustry);
    
    if (industries.length === 0) return 0;

    // High concentration on few targets = precise targeting
    const sorted = [...industries].sort((a, b) => b - a);
    const top3Sum = sorted.slice(0, 3).reduce((a, b) => a + b, 0);
    const totalSum = sorted.reduce((a, b) => a + b, 0) || 1;

    return (top3Sum / totalSum) * 100;
  }

  /**
   * Calculate evolution/adaptation score
   */
  private calculateEvolutionScore(actor: ThreatActor): number {
    const timeline = actor.activityTimeline;
    if (timeline.length < 3) return 30; // Not enough data

    // Count different types of activities
    const activityTypes = new Set(timeline.map(e => e.type));
    const typeVariety = activityTypes.size / 5; // Normalize by possible types

    // Check for tool changes over time
    let toolChanges = 0;
    const toolsSeen = new Set<string>();
    
    for (const event of timeline) {
      for (const tool of actor.knownTools) {
        if (!toolsSeen.has(tool)) {
          toolsSeen.add(tool);
          if (event.type === 'tool_deployment') toolChanges++;
        }
      }
    }

    // Recency of activity
    const latestActivity = timeline[timeline.length - 1];
    const daysSinceActivity = (Date.now() - latestActivity.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 30 - daysSinceActivity);

    return Math.min(100, typeVariety * 40 + toolChanges * 10 + recencyScore);
  }

  /**
   * Calculate how predictable an actor's behavior is
   */
  private calculatePredictabilityIndex(model: BehaviorModel): number {
    // Lower values = less predictable = more dangerous
    const temporalVariance = model.temporalPatterns.reduce(
      (sum, p) => sum + p.variance, 0
    ) / model.temporalPatterns.length;

    const complexityTrend = model.attackComplexityTrend;
    const complexityVariance = this.calculateVariance(complexityTrend);

    return (temporalVariance + complexityVariance) / 2;
  }

  /**
   * Generate predictions about future behavior
   */
  private generateBehavioralPredictions(
    actor: ThreatActor,
    model: BehaviorModel
  ): BehavioralPrediction[] {
    const predictions: BehavioralPrediction[] = [];

    // Predict active window
    const peakHour = model.temporalPatterns.reduce(
      (max, p) => p.probability > max.probability ? p : max,
      model.temporalPatterns[0]
    );
    predictions.push({
      type: 'active_window',
      description: `Most likely active during hour ${peakHour.hour}:00 UTC`,
      confidence: peakHour.probability,
      timeframe: 'next 7 days',
    });

    // Predict likely next target sector
    const topTarget = Object.entries(model.targetPatterns)
      .sort(([, a], [, b]) => b - a)[0];
    if (topTarget) {
      predictions.push({
        type: 'target_sector',
        description: `Likely to target ${topTarget[0]} sector`,
        confidence: topTarget[1],
        timeframe: 'next 30 days',
      });
    }

    // Predict technique evolution
    if (model.attackComplexityTrend.length >= 3) {
      const recentTrend = model.attackComplexityTrend.slice(-3);
      const isIncreasing = recentTrend[recentTrend.length - 1] > recentTrend[0];
      
      if (isIncreasing) {
        predictions.push({
          type: 'technique_evolution',
          description: 'Expected to adopt more sophisticated techniques',
          confidence: 0.7,
          timeframe: 'next 60 days',
        });
      }
    }

    return predictions;
  }

  /**
   * Extract protocol distribution from actor profile
   */
  private extractProtocolDistribution(actor: ThreatActor): Record<string, number> {
    const dist: Record<string, number> = {};
    const protocols = actor.behavioralProfile.preferredProtocols;
    
    for (const proto of protocols) {
      dist[proto] = (dist[proto] || 0) + 1;
    }
    
    // Normalize
    const total = protocols.length || 1;
    for (const key of Object.keys(dist)) {
      dist[key] /= total;
    }
    
    return dist;
  }

  /**
   * Extract tool usage frequency
   */
  private extractToolUsage(actor: ThreatActor): Record<string, number> {
    const usage: Record<string, number> = {};
    
    // Assume equal usage for now - would be refined with actual data
    for (const tool of actor.knownTools) {
      usage[tool] = 1;
    }
    
    return usage;
  }

  /**
   * Calculate behavior similarity between two models
   */
  private calculateBehaviorSimilarity(a: BehaviorModel, b: BehaviorModel): number {
    // Temporal pattern similarity (cosine)
    const tempSim = this.cosineSimilarity(
      a.temporalPatterns.map(p => p.probability),
      b.temporalPatterns.map(p => p.probability)
    );

    // Protocol distribution similarity
    const allProtocols = new Set([...Object.keys(a.protocolDistribution), ...Object.keys(b.protocolDistribution)]);
    let protoSim = 0;
    for (const proto of allProtocols) {
      protoSim += Math.min(a.protocolDistribution[proto] || 0, b.protocolDistribution[proto] || 0);
    }

    // Target overlap
    const allTargets = new Set([...Object.keys(a.targetPatterns), ...Object.keys(b.targetPatterns)]);
    let targetOverlap = 0;
    for (const target of allTargets) {
      targetOverlap += Math.min(a.targetPatterns[target] || 0, b.targetPatterns[target] || 0);
    }

    // Weighted combination
    return tempSim * 0.4 + protoSim * 0.3 + targetOverlap * 0.3;
  }

  /**
   * Find shared behaviors between two models
   */
  private findSharedBehaviors(a: BehaviorModel, b: BehaviorModel): string[] {
    const shared: string[] = [];
    
    // Shared protocols
    for (const proto of Object.keys(a.protocolDistribution)) {
      if (b.protocolDistribution[proto]) {
        shared.push(`Uses ${proto}`);
      }
    }
    
    // Shared target sectors
    for (const target of Object.keys(a.targetPatterns)) {
      if (b.targetPatterns[target]) {
        shared.push(`Targets ${target}`);
      }
    }
    
    return shared;
  }

  /**
   * Find behavior differences between two models
   */
  private findBehaviorDifferences(a: BehaviorModel, b: BehaviorModel): string[] {
    const diffs: string[] = [];
    
    // Different protocols
    for (const proto of Object.keys(a.protocolDistribution)) {
      if (!b.protocolDistribution[proto]) {
        diffs.push(`${proto} unique to A`);
      }
    }
    for (const proto of Object.keys(b.protocolDistribution)) {
      if (!a.protocolDistribution[proto]) {
        diffs.push(`${proto} unique to B`);
      }
    }
    
    return diffs;
  }

  /** Helper: cosine similarity */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /** Helper: variance calculation */
  private calculateVariance(arr: number[]): number {
    if (arr.length === 0) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((sum, val) => sum + (val - mean) ** 2, 0) / arr.length;
  }

  /** Get registered actor */
  getActor(id: string): ThreatActor | undefined {
    return this.actors.get(id);
  }

  /** List all actors */
  listActors(): ThreatActor[] {
    return Array.from(this.actors.values());
  }
}

// Internal types
let maxEntropy: number;

interface BehaviorModel {
  actorId: string;
  temporalPatterns: Array<{ hour: number; probability: number; variance: number }>;
  protocolDistribution: Record<string, number>;
  toolUsageFrequency: Record<string, number>;
  targetPatterns: Record<string, number>;
  dwellTimeStats: { mean: number; stdDev: number; min: number; max: number };
  attackComplexityTrend: number[];
  lastUpdated: Date;
}

interface BehavioralAnalysisResult {
  actorId: string;
  temporalConsistency: number;
  operationalMaturity: number;
  targetingPrecision: number;
  evolutionScore: number;
  predictabilityIndex: number;
  overallBehavioralScore: number;
  predictions: BehavioralPrediction[];
  analyzedAt: Date;
}

interface BehavioralPrediction {
  type: string;
  description: string;
  confidence: number;
  timeframe: string;
}

interface SimilarActorResult {
  actorId: string;
  actorName: string;
  similarity: number;
  sharedBehaviors: string[];
  differences: string[];
}

// ============================================================
// ATTACK CAMPAIGN CLUSTERING
// ============================================================

/**
 * Campaign Clustering Engine
 * Groups related attacks into campaigns using similarity algorithms
 */
export class CampaignClusteringEngine {
  private campaigns: Map<string, AttackCampaign> = new Map();
  private clusters: Map<string, string[]> = new Map(); // clusterId -> campaignIds

  /**
   * Add a campaign to the clustering engine
   */
  addCampaign(campaign: AttackCampaign): void {
    this.campaigns.set(campaign.id, campaign);
    this.assignToCluster(campaign);
  }

  /**
   * Find or create cluster for a campaign
   */
  private assignToCluster(campaign: AttackCampaign): void {
    let bestCluster: string | null = null;
    let bestSimilarity = 0.7; // Minimum threshold

    // Check against existing clusters
    for (const [clusterId, campaignIds] of this.clusters) {
      const representativeCampaign = this.campaigns.get(campaignIds[0]);
      if (!representativeCampaign) continue;

      const similarity = this.calculateCampaignSimilarity(campaign, representativeCampaign);
      
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestCluster = clusterId;
      }
    }

    if (bestCluster) {
      // Add to existing cluster
      this.clusters.get(bestCluster)?.push(campaign.id);
      campaign.clusterId = bestCluster;
      campaign.similarityScore = bestSimilarity;
    } else {
      // Create new cluster
      const newClusterId = `cluster-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      this.clusters.set(newClusterId, [campaign.id]);
      campaign.clusterId = newClusterId;
      campaign.similarityScore = 1.0;
    }
  }

  /**
   * Calculate similarity between two campaigns
   */
  private calculateCampaignSimilarity(a: AttackCampaign, b: AttackCampaign): number {
    let similarity = 0;
    let factors = 0;

    // Factor 1: Same threat actor (+30)
    if (a.threatActorId === b.threatActorId) {
      similarity += 0.30;
    }
    factors++;

    // Factor 2: Overlapping IOCs (+25)
    const iocOverlap = a.iocs.filter(ioc => b.iocs.includes(ioc)).length;
    const iocJaccard = iocOverlap / (new Set([...a.iocs, ...b.iocs]).size || 1);
    similarity += iocJaccard * 0.25;
    factors++;

    // Factor 3: Same campaign type (+15)
    if (a.type === b.type) {
      similarity += 0.15;
    }
    factors++;

    // Factor 4: Target sector overlap (+15)
    const sectorOverlap = a.targetSectors.filter(s => b.targetSectors.includes(s)).length;
    const sectorJaccard = sectorOverlap / (new Set([...a.targetSectors, ...b.targetSectors]).size || 1);
    similarity += sectorJaccard * 0.15;
    factors++;

    // Factor 5: Geographic overlap (+10)
    const geoOverlap = a.targetGeography.filter(g => b.targetGeography.includes(g)).length;
    const geoJaccard = geoOverlap / (new Set([...a.targetGeography, ...b.targetGeography]).size || 1);
    similarity += geoJaccard * 0.10;
    factors++;

    // Factor 6: MITRE technique overlap (+5)
    const mitreOverlap = a.mitreTechniques.filter(m => b.mitreTechniques.includes(m)).length;
    const mitreJaccard = mitreOverlap / (new Set([...a.mitreTechniques, ...b.mitreTechniques]).size || 1);
    similarity += mitreJaccard * 0.05;
    factors++;

    return similarity;
  }

  /**
   * Get campaigns in a cluster
   */
  getClusterCampaigns(clusterId: string): AttackCampaign[] {
    const campaignIds = this.clusters.get(clusterId) || [];
    return campaignIds.map(id => this.campaigns.get(id)).filter(Boolean) as AttackCampaign[];
  }

  /**
   * Get all clusters
   */
  getClusters(): Array<{
    clusterId: string;
    campaignCount: number;
    campaigns: AttackCampaign[];
    dominantType: CampaignType;
    threatActors: string[];
  }> {
    const result = [];
    
    for (const [clusterId, campaignIds] of this.clusters) {
      const campaigns = campaignIds.map(id => this.campaigns.get(id)).filter(Boolean) as AttackCampaign[];
      const typeCounts: Record<string, number> = {};
      const actors = new Set<string>();
      
      for (const campaign of campaigns) {
        typeCounts[campaign.type] = (typeCounts[campaign.type] || 0) + 1;
        actors.add(campaign.threatActorId);
      }
      
      const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as CampaignType || 'apt';
      
      result.push({
        clusterId,
        campaignCount: campaigns.length,
        campaigns,
        dominantType,
        threatActors: Array.from(actors),
      });
    }
    
    return result.sort((a, b) => b.campaignCount - a.campaignCount);
  }

  /**
   * Predict next action for a campaign
   */
  predictNextAction(campaignId: string): PredictedAction | null {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return null;

    // Look at attack patterns sequence
    const patterns = campaign.attackPatterns.sort((a, b) => a.sequence - b.sequence);
    if (patterns.length === 0) return null;

    const lastPattern = patterns[patterns.length - 1];
    
    // Use MITRE ATT&CK knowledge to predict next step
    const nextSteps = this.getNextLikelyStep(lastPattern.tactic, lastPattern.technique);
    
    if (nextSteps.length === 0) return null;

    // Find most likely next step
    const bestNext = nextSteps[0];

    return {
      action: bestNext.action,
      technique: bestNext.technique,
      probability: bestNext.probability,
      timeframe: '24-72h',
      confidence: 0.65 + (campaign.similarityScore * 0.2),
      basedOn: `Last observed: ${lastPattern.technique} (${lastPattern.tactic})`,
    };
  }

  /**
   * Get likely next steps based on current tactic/technique
   */
  private getNextLikelyStep(currentTactic: string, currentTechnique: string): Array<{
    action: string;
    technique: string;
    probability: number;
  }> {
    // Simplified MITRE ATT&CK chain predictions
    const chainMap: Record<string, Array<{ action: string; technique: string; probability: number }>> = {
      'reconnaissance': [
        { action: 'Scan for vulnerabilities', technique: 'T1595', probability: 0.4 },
        { action: 'Gather victim host information', technique: 'T1592', probability: 0.3 },
        { action: 'Search for open ports', technique: 'T1046', probability: 0.3 },
      ],
      'resource-development': [
        { action: 'Establish infrastructure', technique: 'T1583', probability: 0.5 },
        { action: 'Obtain capabilities', technique: 'T1588', probability: 0.3 },
        { action: 'Create accounts', technique: 'T1586', probability: 0.2 },
      ],
      'initial-access': [
        { action: 'Phishing', technique: 'T1566', probability: 0.35 },
        { action: 'Exploit public-facing application', technique: 'T1190', probability: 0.3 },
        { action: 'Supply chain compromise', technique: 'T1195', probability: 0.2 },
        { action: 'Valid accounts', technique: 'T1078', probability: 0.15 },
      ],
      'execution': [
        { action: 'Command and scripting interpreter', technique: 'T1059', probability: 0.4 },
        { action: 'User execution', technique: 'T1204', probability: 0.3 },
        { action: 'Scheduled task', technique: 'T1053', probability: 0.2 },
      ],
      'persistence': [
        { action: 'Create account', technique: 'T1136', probability: 0.3 },
        { action: 'Modify registry', technique: 'T1112', probability: 0.25 },
        { action: 'Scheduled task/job', technique: 'T1053', probability: 0.25 },
        { action: 'Create or modify system process', technique: 'T1543', probability: 0.2 },
      ],
      'privilege-escalation': [
        { action: 'Process injection', technique: 'T1055', probability: 0.3 },
        { action: 'Abuse elevation mechanism', technique: 'T1548', probability: 0.25 },
        { action: 'Exploit elevation vulnerability', technique: 'T1068', probability: 0.25 },
      ],
      'defense-evasion': [
        { action: 'Obfuscated files', technique: 'T1027', probability: 0.3 },
        { action: 'Disable security tools', technique: 'T1562', probability: 0.25 },
        { action: 'Rootkit', technique: 'T1014', probability: 0.2 },
      ],
      'credential-access': [
        { action: 'Credential dumping', technique: 'T1003', probability: 0.35 },
        { action: 'Brute force', technique: 'T1110', probability: 0.3 },
        { action: 'Input capture', technique: 'T1056', probability: 0.2 },
      ],
      'discovery': [
        { action: 'Network service discovery', technique: 'T1046', probability: 0.3 },
        { action: 'File discovery', technique: 'T1083', probability: 0.25 },
        { action: 'System information discovery', technique: 'T1082', probability: 0.25 },
      ],
      'lateral-movement': [
        { action: 'Remote services', technique: 'T1021', probability: 0.35 },
        { action: 'Remote file copy', technique: 'T1105', probability: 0.25 },
        { action: 'Lateral tool transfer', technique: 'T1570', probability: 0.2 },
      ],
      'collection': [
        { action: 'Screen capture', technique: 'T1113', probability: 0.25 },
        { action: 'Data from local system', technique: 'T1005', probability: 0.3 },
        { action: 'Email collection', technique: 'T1114', probability: 0.2 },
      ],
      'command-and-control': [
        { action: 'Application layer protocol', technique: 'T1071', probability: 0.3 },
        { action: 'Data encoding', technique: 'T1132', probability: 0.25 },
        { action: 'Ingress tool transfer', technique: 'T1105', probability: 0.2 },
      ],
      'exfiltration': [
        { action: 'Exfiltration over C2 channel', technique: 'T1041', probability: 0.3 },
        { action: 'Exfiltration over alternative protocol', technique: 'T1048', probability: 0.25 },
        { action: 'Transfer data to cloud account', technique: 'T1537', probability: 0.2 },
      ],
      'impact': [
        { action: 'Data encryption', technique: 'T1486', probability: 0.3 },
        { action: 'Service stop', technique: 'T1489', probability: 0.25 },
        { action: 'Inhibit system recovery', technique: 'T1490', probability: 0.2 },
      ],
    };

    return chainMap[currentTactic] || [];
  }

  /** Get campaign by ID */
  getCampaign(id: string): AttackCampaign | undefined {
    return this.campaigns.get(id);
  }

  /** List all campaigns */
  listCampaigns(): AttackCampaign[] {
    return Array.from(this.campaigns.values());
  }
}

// ============================================================
// ZERO-DAY PREDICTION ENGINE
// ============================================================

/**
 * Zero-Day Vulnerability Prediction Engine
 * Uses heuristics and patterns to predict potential zero-day exploits
 */
export class ZeroDayPredictionEngine {
  private predictions: Map<string, ZeroDayPrediction> = new Map();
  private vulnerabilityDatabase: VulnerabilityEntry[] = [];
  private threatIntelligenceSignals: IntelligenceSignal[] = [];

  /**
   * Add vulnerability to database for learning
   */
  addVulnerability(vuln: VulnerabilityEntry): void {
    this.vulnerabilityDatabase.push(vuln);
  }

  /**
   * Add intelligence signal (e.g., dark web mentions, exploit dev activity)
   */
  addSignal(signal: IntelligenceSignal): void {
    this.threatIntelligenceSignals.push(signal);
  }

  /**
   * Generate zero-day predictions based on signals
   */
  generatePredictions(): ZeroDayPrediction[] {
    const predictions: ZeroDayPrediction[] = [];
    const now = new Date();

    // Group signals by product/target
    const signalGroups = this.groupSignalsByTarget();

    for (const [target, signals] of signalGroups) {
      const riskScore = this.calculateZeroDayRisk(signals, target);
      
      if (riskScore > 50) { // Only generate predictions for significant risks
        const prediction = this.createPrediction(target, signals, riskScore, now);
        predictions.push(prediction);
        this.predictions.set(prediction.id, prediction);
      }
    }

    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Group signals by target product/platform
   */
  private groupSignalsByTarget(): Map<string, IntelligenceSignal[]> {
    const groups = new Map<string, IntelligenceSignal[]>();

    for (const signal of this.threatIntelligenceSignals) {
      const key = `${signal.targetProduct}-${signal.targetPlatform}`;
      const existing = groups.get(key) || [];
      existing.push(signal);
      groups.set(key, existing);
    }

    return groups;
  }

  /**
   * Calculate zero-day exploitation risk for a target
   */
  private calculateZeroDayRisk(signals: IntelligenceSignal[], target: string): number {
    let risk = 0;

    // Signal recency weighting
    const now = Date.now();
    const recentSignals = signals.filter(s => 
      now - s.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    ).length;
    risk += recentSignals * 15;

    // Signal type weights
    for (const signal of signals) {
      switch (signal.type) {
        case 'exploit_dev_activity':
          risk += 25;
          break;
        case 'dark_web_mention':
          risk += signal.severity === 'high' ? 20 : 10;
          break;
        case 'vulnerability_discussion':
          risk += 15;
          break;
        case 'patch_reversal':
          risk += 30; // Strong indicator
          break;
        case 'bug_bounty_submission':
          risk += 10;
          break;
        case 'researcher_activity':
          risk += 12;
          break;
      }
    }

    // Historical vulnerability density for this target
    const historicalVulns = this.vulnerabilityDatabase.filter(
      v => v.product.toLowerCase().includes(target.toLowerCase())
    ).length;
    risk += Math.min(20, historicalVulns * 2);

    // Source reliability
    const avgReliability = signals.reduce((sum, s) => sum + s.sourceReliability, 0) / signals.length;
    risk *= avgReliability;

    return Math.min(100, risk);
  }

  /**
   * Create a prediction object
   */
  private createPrediction(
    target: string,
    signals: IntelligenceSignal[],
    riskScore: number,
    timestamp: Date
  ): ZeroDayPrediction {
    const [product, platform] = target.split('-');
    
    // Determine vulnerability type based on signals
    const vulnTypes = this.inferVulnerabilityType(signals);
    
    // Find related threat actors
    const relatedActors = this.findRelatedThreatActors(signals);
    
    // Find similar historical vulnerabilities
    const similarVulns = this.findSimilarHistoricalVulns(product);

    return {
      id: `zeroday-pred-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      predictedVulnerabilityType: vulnTypes[0] || 'unknown',
      affectedProducts: [product],
      affectedPlatforms: [platform],
      confidence: riskScore,
      timeHorizon: riskScore > 80 ? '14-30 days' : riskScore > 60 ? '30-60 days' : '60-90 days',
      probabilityOfExploitation: riskScore / 100,
      indicators: signals.map(s => `${s.type}: ${s.description}`),
      relatedThreatActors: relatedActors,
      similarHistoricalVulns: similarVulns,
      recommendedMitigations: this.generateMitigations(product, vulnTypes),
      monitoringRecommendations: this.generateMonitoringRecs(product),
      createdAt: timestamp,
      expiresAt: new Date(timestamp.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 days
      modelVersion: '1.0.0',
    };
  }

  /**
   * Infer likely vulnerability type from signals
   */
  private inferVulnerabilityType(signals: IntelligenceSignal[]): string[] {
    const types: string[] = [];
    
    for (const signal of signals) {
      const desc = signal.description.toLowerCase();
      
      if (desc.includes('buffer overflow') || desc.includes('memory corruption')) {
        types.push('Memory Corruption');
      } else if (desc.includes('injection') || desc.includes('sql') || desc.includes('xss')) {
        types.push('Injection');
      } else if (desc.includes('authentication') || desc.includes('bypass')) {
        types.push('Authentication Bypass');
      } else if (desc.includes('denial of service') || desc.includes('dos')) {
        types.push('Denial of Service');
      } else if (desc.includes('remote code') || desc.includes('rce') || desc.includes('execution')) {
        types.push('Remote Code Execution');
      } else if (desc.includes('privilege escalation') || desc.includes('elevation')) {
        types.push('Privilege Escalation');
      } else if (desc.includes('ss7') || desc.includes('diameter') || desc.includes('sip')) {
        types.push('Telecom Protocol Vulnerability');
      }
    }
    
    return [...new Set(types)];
  }

  /**
   * Find threat actors potentially involved
   */
  private findRelatedThreatActors(signals: IntelligenceSignal[]): string[] {
    const actors = new Set<string>();
    
    for (const signal of signals) {
      if (signal.attributedActor) {
        actors.add(signal.attributedActor);
      }
    }
    
    return Array.from(actors);
  }

  /**
   * Find similar historical vulnerabilities
   */
  private findSimilarHistoricalVulns(product: string): string[] {
    const productVulns = this.vulnerabilityDatabase
      .filter(v => v.product.toLowerCase().includes(product.toLowerCase()))
      .sort((a, b) => b.cvssScore - a.cvssScore)
      .slice(0, 5);
    
    return productVulns.map(v => v.cveId);
  }

  /**
   * Generate mitigation recommendations
   */
  private generateMitigations(product: string, vulnTypes: string[]): string[] {
    const mitigations: string[] = [];
    
    // Generic mitigations
    mitigations.push('Ensure all systems are patched to latest versions');
    mitigations.push('Implement network segmentation');
    mitigations.push('Enable enhanced logging and monitoring');
    
    // Product-specific
    if (product.toLowerCase().includes('ss7') || product.toLowerCase().includes('diameter')) {
      mitigations.push('Review SS7/Diameter firewall rules');
      mitigations.push('Implement signaling security (SigTrans/IPsec)');
    }
    
    if (product.toLowerCase().includes('sip') || product.toLowerCase().includes('voip')) {
      mitigations.push('Implement SIP authentication and encryption');
      mitigations.push('Deploy session border controllers (SBCs)');
    }
    
    // Type-specific
    if (vulnTypes.some(t => t.includes('Remote Code') || t.includes('Execution'))) {
      mitigations.push('Consider application whitelisting');
      mitigations.push('Implement runtime application self-protection (RASP)');
    }
    
    if (vulnTypes.some(t => t.includes('Memory') || t.includes('Corruption'))) {
      mitigations.push('Enable address space layout randomization (ASLR)');
      mitigations.push('Enable data execution prevention (DEP)');
    }
    
    return mitigations;
  }

  /**
   * Generate monitoring recommendations
   */
  private generateMonitoringRecs(product: string): string[] {
    return [
      `Monitor for unusual ${product} process behavior`,
      'Set up alerts for failed authentication attempts',
      'Watch for outbound connections to unknown destinations',
      'Monitor memory allocation patterns for signs of exploitation',
      'Track privilege escalation events',
    ];
  }

  /** Get prediction by ID */
  getPrediction(id: string): ZeroDayPrediction | undefined {
    return this.predictions.get(id);
  }

  /** List all active predictions */
  listActivePredictions(): ZeroDayPrediction[] {
    const now = new Date();
    return Array.from(this.predictions.values()).filter(p => p.expiresAt > now);
  }
}

/** Vulnerability database entry */
interface VulnerabilityEntry {
  cveId: string;
  product: string;
  version: string;
  cvssScore: number;
  vulnerabilityType: string;
  publishedDate: Date;
  exploitedInTheWild: boolean;
}

/** Intelligence signal for zero-day prediction */
interface IntelligenceSignal {
  id: string;
  type: 'exploit_dev_activity' | 'dark_web_mention' | 'vulnerability_discussion' | 
       'patch_reversal' | 'bug_bounty_submission' | 'researcher_activity';
  description: string;
  targetProduct: string;
  targetPlatform: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sourceReliability: number;
  attributedActor?: string;
  timestamp: Date;
}

// ============================================================
// THREAT FEED CORRELATION & DEDUPLICATION
// ============================================================

/**
 * Threat Feed Correlation Engine
 * Correlates and deduplicates IOCs across multiple threat feeds
 */
export class ThreatFeedCorrelator {
  private feeds: Map<string, ThreatFeedEntry> = new Map();
  private correlationCache: Map<string, CorrelatedIntelligence> = new Map();

  /**
   * Register a threat feed
   */
  registerFeed(feed: ThreatFeedEntry): void {
    this.feeds.set(feed.feedName, feed);
  }

  /**
   * Correlate IOCs across all feeds
   */
  correlateAll(): CorrelatedIntelligence[] {
    const allIOCs: IOC[] = [];
    
    // Collect all IOCs from all feeds
    for (const feed of this.feeds.values()) {
      for (const ioc of feed.iocs) {
        if (ioc.value) {
          allIOCs.push(this.ensureFullIOC(ioc));
        }
      }
    }
    
    // Deduplicate and correlate
    const results: CorrelatedIntelligence[] = [];
    const processed = new Set<string>();
    
    for (const ioc of allIOCs) {
      if (processed.has(ioc.value)) continue;
      processed.add(ioc.value);
      
      const correlated = this.findCorrelations(ioc, allIOCs);
      results.push(correlated);
    }
    
    return results.sort((a, b) => b.combinedRiskScore - a.combinedRiskScore);
  }

  /**
   * Ensure IOC has all required fields
   */
  private ensureFullIOC(partial: Partial<IOC>): IOC {
    return {
      id: partial.id ?? `ioc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type: partial.type ?? 'ip',
      value: partial.value ?? '',
      source: partial.source ?? 'unknown',
      sourceConfidence: partial.sourceConfidence ?? 0.5,
      firstSeen: partial.firstSeen ?? new Date(),
      lastSeen: partial.lastSeen,
      mlScore: partial.mlScore ?? 50,
      riskLevel: partial.riskLevel ?? 'medium',
      isVerified: partial.isVerified ?? false,
      falsePositiveRate: partial.falsePositiveRate ?? 0,
      tags: partial.tags ?? [],
      relatedThreatActors: partial.relatedThreatActors ?? [],
      campaigns: partial.campaigns ?? [],
      mitreTechniques: partial.mitreTechniques ?? [],
      correlationCount: partial.correlationCount ?? 0,
      sightings: partial.sightings ?? [],
    };
  }

  /**
   * Find correlations for a specific IOC
   */
  private findCorrelations(primary: IOC, allIOCs: IOC[]): CorrelatedIntelligence {
    const correlated: CorrelatedIntelligence['correlatedIOCs'] = [];
    
    for (const ioc of allIOCs) {
      if (ioc.value === primary.value) continue;
      
      const correlation = this.calculateCorrelation(primary, ioc);
      if (correlation.strength > 0.3) { // Minimum threshold
        correlated.push({
          ioc,
          ...correlation,
        });
      }
    }
    
    // Calculate combined risk score
    const combinedRisk = this.calculateCombinedRisk(primary, correlated);
    
    return {
      primaryIOC: primary,
      correlatedIOCs: correlated.sort((a, b) => b.correlationStrength - a.correlationStrength),
      combinedRiskScore: combinedRisk,
      confidence: Math.min(1, 0.5 + correlated.length * 0.1),
      lastUpdated: new Date(),
    };
  }

  /**
   * Calculate correlation strength between two IOCs
   */
  private calculateCorrelation(a: IOC, b: IOC): {
    correlationStrength: number;
    correlationType: CorrelationType;
    sharedAttributes: string[];
  } {
    const sharedAttrs: string[] = [];
    let strength = 0;
    let type: CorrelationType = 'behavioral_similarity';

    // Exact value match for same type
    if (a.type === b.type && a.value === b.value) {
      strength = 1.0;
      type = 'behavioral_similarity';
      sharedAttrs.push('identical_value');
    }
    
    // IP-related correlations
    if ((a.type === 'ip' || b.type === 'ip') && (a.type === 'domain' || b.type === 'domain')) {
      // Could check DNS resolution
      sharedAttrs.push('potential_dns_relation');
      strength = 0.4;
      type = 'passive_dns';
    }
    
    // Hash family correlation
    if (this.isHashType(a.type) && this.isHashType(b.type)) {
      sharedAttrs.push('same_hash_family');
      strength = 0.6;
      type = 'malware_family';
    }
    
    // Tag overlap
    const tagOverlap = a.tags.filter(t => b.tags.includes(t));
    if (tagOverlap.length > 0) {
      sharedAttrs.push(`shared_tags: ${tagOverlap.join(', ')}`);
      strength += tagOverlap.length * 0.1;
    }
    
    // Threat actor overlap
    const actorOverlap = a.relatedThreatActors.filter(ta => b.relatedThreatActors.includes(ta));
    if (actorOverlap.length > 0) {
      sharedAttrs.push(`shared_actors: ${actorOverlap.join(', ')}`);
      strength += actorOverlap.length * 0.15;
      type = 'campaign_association';
    }
    
    // Campaign overlap
    const campaignOverlap = a.campaigns.filter(c => b.campaigns.includes(c));
    if (campaignOverlap.length > 0) {
      sharedAttrs.push(`shared_campaigns: ${campaignOverlap.join(', ')}`);
      strength += campaignOverlap.length * 0.2;
      type = 'campaign_association';
    }
    
    // Temporal proximity (first seen within 7 days)
    if (a.firstSeen && b.firstSeen) {
      const daysDiff = Math.abs(a.firstSeen.getTime() - b.firstSeen.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff < 7) {
        sharedAttrs.push('temporal_proximity');
        strength += 0.1;
        if (type === 'behavioral_similarity') type = 'temporal_proximity';
      }
    }

    return {
      correlationStrength: Math.min(1, strength),
      correlationType: type,
      sharedAttributes: sharedAttrs,
    };
  }

  /**
   * Check if IOC type is a hash type
   */
  private isHashType(type: IOCTypes): boolean {
    return ['hash_md5', 'hash_sha1', 'hash_sha256'].includes(type);
  }

  /**
   * Calculate combined risk score from primary and correlated IOCs
   */
  private calculateCombinedRisk(primary: IOC, correlated: CorrelatedIntelligence['correlatedIOCs']): number {
    let score = primary.mlScore;
    
    // Boost from correlations
    for (const corr of correlated) {
      score += corr.ioc.mlScore * corr.correlationStrength * 0.3;
    }
    
    // Multi-source confirmation bonus
    const uniqueSources = new Set([primary.source, ...correlated.map(c => c.ioc.source)]);
    if (uniqueSources.size > 1) {
      score += (uniqueSources.size - 1) * 5;
    }
    
    return Math.min(100, Math.round(score));
  }

  /** Get registered feeds */
  getFeeds(): ThreatFeedEntry[] {
    return Array.from(this.feeds.values());
  }
}

// ============================================================
// MITRE ATT&CK MAPPING WITH CONFIDENCE
// ============================================================

/**
 * MITRE ATT&CK Technique Mapper
 * Maps observables to MITRE techniques with confidence scores
 */
export class MITREATTCKMapper {
  private techniqueDatabase: Map<string, MITRETechInfo> = new Map();

  constructor() {
    this.initializeTechniqueDatabase();
  }

  /**
   * Map an observable/event to MITRE techniques
   */
  mapToTechniques(observable: ObservableEvent): MITREMappingResult[] {
    const results: MITREMappingResult[] = [];

    // Direct pattern matching
    for (const [techId, techInfo] of this.techniqueDatabase) {
      const match = this.matchObservableToTechnique(observable, techInfo);
      if (match.confidence > 0.3) {
        results.push({
          techniqueId: techId,
          techniqueName: techInfo.name,
          tactic: techInfo.tactic,
          confidence: match.confidence,
          matchReason: match.reason,
          subtechniques: match.subtechniques,
        });
      }
    }

    // Sort by confidence
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Match observable to a specific technique
   */
  private matchObservableToTechnique(
    observable: ObservableEvent,
    technique: MITRETechInfo
  ): { confidence: number; reason: string; subtechniques: string[] } {
    let confidence = 0;
    const reasons: string[] = [];
    const subtechniques: string[] = [];

    // Event type matching
    if (technique.applicableEvents.includes(observable.eventType)) {
      confidence += 0.4;
      reasons.push('event_type_match');
    }

    // Protocol matching
    if (technique.protocols && observable.protocol) {
      if (technique.protocols.includes(observable.protocol)) {
        confidence += 0.25;
        reasons.push('protocol_match');
      }
    }

    // Indicator matching
    if (technique.indicators) {
      for (const indicator of technique.indicators) {
        if (this.matchesIndicator(observable, indicator)) {
          confidence += 0.15;
          reasons.push(`indicator_${indicator.type}_match`);
          
          if (indicator.subtechnique) {
            subtechniques.push(indicator.subtechnique);
          }
        }
      }
    }

    // Source/destination pattern matching
    if (technique.patterns) {
      for (const pattern of technique.patterns) {
        if (this.matchesPattern(observable, pattern)) {
          confidence += 0.1;
          reasons.push(`pattern_${pattern.type}_match`);
        }
      }
    }

    return {
      confidence: Math.min(1, confidence),
      reason: reasons.join(', '),
      subtechniques,
    };
  }

  /**
   * Check if observable matches an indicator
   */
  private matchesIndicator(observable: ObservableEvent, indicator: TechniqueIndicator): boolean {
    switch (indicator.type) {
      case 'source_ip_external':
        return observable.sourceIp && !this.isInternalIP(observable.sourceIp);
      
      case 'destination_ip_internal':
        return observable.destIp && this.isInternalIP(observable.destIp);
      
      case 'unusual_port':
        return observable.destPort && this.isUnusualPort(observable.destPort);
      
      case 'large_data_transfer':
        return (observable.bytesIn ?? 0) > 1048576 || (observable.bytesOut ?? 0) > 1048576; // > 1MB
      
      case 'encryption_detected':
        return observable.encrypted === true;
      
      case 'non_standard_protocol':
        return observable.protocol && !['tcp', 'udp', 'http', 'https', 'dns'].includes(observable.protocol);
      
      case 'multiple_connections':
        return (observable.connectionCount ?? 0) > 10;
      
      case 'failed_auth':
        return observable.eventType === 'auth_failure';
      
      default:
        return false;
    }
  }

  /**
   * Check if observable matches a pattern
   */
  private matchesPattern(observable: ObservableEvent, pattern: TechniquePattern): boolean {
    switch (pattern.type) {
      case 'time_based':
        if (pattern.hours) {
          const hour = observable.timestamp.getHours();
          return pattern.hours.includes(hour);
        }
        return false;
      
      case 'frequency':
        // Would need historical data for proper implementation
        return false;
      
      case 'sequence':
        // Would need sequence data for proper implementation
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Check if IP is internal
   */
  private isInternalIP(ip: string): boolean {
    return ip.startsWith('10.') || 
           ip.startsWith('192.168.') || 
           ip.startsWith('172.16.') ||
           ip.startsWith('172.17.') ||
           ip.startsWith('172.18.') ||
           ip.startsWith('172.19.') ||
           ip.startsWith('172.20.') ||
           ip.startsWith('172.21.') ||
           ip.startsWith('172.22.') ||
           ip.startsWith('172.23.') ||
           ip.startsWith('172.24.') ||
           ip.startsWith('172.25.') ||
           ip.startsWith('172.26.') ||
           ip.startsWith('172.27.') ||
           ip.startsWith('172.28.') ||
           ip.startsWith('172.29.') ||
           ip.startsWith('172.30.') ||
           ip.startsWith('172.31.');
  }

  /**
   * Check if port is unusual
   */
  private isUnusualPort(port: number): boolean {
    const commonPorts = [20, 21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995, 3306, 3389, 5432, 8080];
    return !commonPorts.includes(port);
  }

  /**
   * Initialize the technique database with telecom-relevant techniques
   */
  private initializeTechniqueDatabase(): void {
    // Common techniques relevant to telecom SOC
    const techniques: Array<[string, MITRETechInfo]> = [
      ['T1046', {
        name: 'Network Service Discovery',
        tactic: 'Reconnaissance',
        applicableEvents: ['connection_attempt', 'port_scan'],
        protocols: ['tcp', 'udp', 'icmp'],
        indicators: [{ type: 'multiple_connections' }],
      }],
      ['T1078', {
        name: 'Valid Accounts',
        tactic: 'Initial Access',
        applicableEvents: ['login_success', 'auth_success'],
        indicators: [{ type: 'source_ip_external' }],
      }],
      ['T1110', {
        name: 'Brute Force',
        tactic: 'Credential Access',
        applicableEvents: ['auth_failure'],
        indicators: [{ type: 'failed_auth' }, { type: 'multiple_connections' }],
      }],
      ['T1021', {
        name: 'Remote Services',
        tactic: 'Lateral Movement',
        applicableEvents: ['connection_attempt', 'remote_access'],
        protocols: ['rdp', 'ssh', 'winrm'],
        indicators: [{ type: 'destination_ip_internal' }],
      }],
      ['T1041', {
        name: 'Exfiltration Over C2 Channel',
        tactic: 'Exfiltration',
        applicableEvents: ['data_transfer', 'dns_query'],
        indicators: [{ type: 'large_data_transfer' }, { type: 'encryption_detected' }],
      }],
      ['T1048', {
        name: 'Exfiltration Over Alternative Protocol',
        tactic: 'Exfiltration',
        applicableEvents: ['data_transfer', 'dns_query', 'icmp'],
        protocols: ['dns', 'icmp'],
        indicators: [{ type: 'large_data_transfer' }, { type: 'non_standard_protocol' }],
      }],
      ['T1059', {
        name: 'Command and Scripting Interpreter',
        tactic: 'Execution',
        applicableEvents: ['process_creation', 'command_execution'],
      }],
      ['T1486', {
        name: 'Data Encryption for Impact',
        tactic: 'Impact',
        applicableEvents: ['file_modification', 'encryption_event'],
        indicators: [{ type: 'encryption_detected' }],
      }],
      // Telecom-specific techniques
      ['TELECOM-T1', {
        name: 'SS7 Tracking Exploitation',
        tactic: 'Collection',
        applicableEvents: ['ss7_message', 'location_query'],
        protocols: ['ss7', 'map', 'cap'],
        indicators: [{ type: 'unusual_port' }],
      }],
      ['TELECOM-T2', {
        name: 'SMS Interception',
        tactic: 'Collection',
        applicableEvents: ['sms_intercept', 'forwarding_setup'],
        protocols: ['ss7', 'map', 'diameter'],
      }],
      ['TELECOM-T3', {
        name: 'IMSI Catcher Deployment',
        tactic: 'Initial Access',
        applicableEvents: ['imsi_catcher_detection', 'cell_tower_anomaly'],
        protocols: ['gsm', 'lte', '5g'],
      }],
      ['TELECOM-T4', {
        name: 'Diameter Attack',
        tactic: 'Impact',
        applicableEvents: ['diameter_error', 'roaming_anomaly'],
        protocols: ['diameter'],
      }],
      ['TELECOM-T5', {
        name: 'SIP Fraud',
        tactic: 'Impact',
        applicableEvents: ['call_setup', 'sip_register'],
        protocols: ['sip'],
        indicators: [{ type: 'multiple_connections' }],
      }],
    ];

    for (const [id, info] of techniques) {
      this.techniqueDatabase.set(id, info);
    }
  }

  /** Get technique info by ID */
  getTechnique(id: string): MITRETechInfo | undefined {
    return this.techniqueDatabase.get(id);
  }

  /** Search techniques by name or tactic */
  searchTechniques(query: string): MITRETechInfo[] {
    const lowerQuery = query.toLowerCase();
    const results: MITRETechInfo[] = [];

    for (const [, info] of this.techniqueDatabase) {
      if (
        info.name.toLowerCase().includes(lowerQuery) ||
        info.tactic.toLowerCase().includes(lowerQuery)
      ) {
        results.push(info);
      }
    }

    return results;
  }

  /** List all techniques */
  listTechniques(): Array<{ id: string; info: MITRETechInfo }> {
    return Array.from(this.techniqueDatabase.entries()).map(([id, info]) => ({ id, info }));
  }
}

/** MITRE ATT&CK Technique Info */
interface MITRETechInfo {
  name: string;
  tactic: string;
  applicableEvents: string[];
  protocols?: string[];
  indicators?: TechniqueIndicator[];
  patterns?: TechniquePattern[];
}

/** Technique indicator for matching */
interface TechniqueIndicator {
  type: string;
  subtechnique?: string;
}

/** Technique pattern for matching */
interface TechniquePattern {
  type: 'time_based' | 'frequency' | 'sequence';
  hours?: number[];
}

/** Observable event for mapping */
interface ObservableEvent {
  eventType: string;
  timestamp: Date;
  sourceIp?: string;
  destIp?: string;
  destPort?: number;
  protocol?: string;
  bytesIn?: number;
  bytesOut?: number;
  encrypted?: boolean;
  connectionCount?: number;
}

/** Result of MITRE mapping */
interface MITREMappingResult {
  techniqueId: string;
  techniqueName: string;
  tactic: string;
  confidence: number;
  matchReason: string;
  subtechniques: string[];
}

// ============================================================
// EXPORTS
// ============================================================

export {
  DEFAULT_IOC_SCORING_CONFIG,
  KNOWN_THREAT_ACTOR_PROFILES,
};

export type {
  IOC,
  IOCTypes,
  ThreatActor,
  BehavioralPattern,
  AttackCampaign,
  CampaignType,
  AttackPattern,
  PredictedAction,
  MITRETechniqueMapping,
  KillChainPhase,
  ZeroDayPrediction,
  ThreatFeedEntry,
  CorrelatedIntelligence,
  CorrelationType,
  IOCScoringConfig,
};
