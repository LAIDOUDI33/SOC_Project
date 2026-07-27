/**
 * National SOC Platform - Analytics Module
 * 
 * ML-based anomaly detection, time-series analysis,
 * threat scoring, and event correlation engine.
 */

// ML Anomaly Detection
export {
  detectAnomalies,
  detectZScoreAnomalies,
  detectIQRAnomalies,
  detectEWMAnomalies,
  detectMADAnomalies,
  detectSeasonalAnomalies,
  detectPatternBreaks,
  DJEZZY_ANALYTICS_DEFAULTS,
} from './ml/anomaly-detection';

export type {
  DataPoint,
  AnomalyResult,
  AnomalyType,
  DetectionConfig,
  TelecomDetectionConfig,
  SecurityDetectionConfig,
} from './ml/anomaly-detection';

// Time Series Analysis
export {
  aggregateTimeSeries,
  calculateMovingAverage,
  analyzeTrend,
  detectSeasonality,
  buildBaseline,
  holtWintersForecast,
} from './time-series/analysis';

export type {
  TimeSeriesPoint,
  TimeSeriesData,
  TimeGranularity,
  TrendAnalysisResult,
  SeasonalityPattern,
  BaselineProfile,
  AggregationResult,
} from './time-series/analysis';

// Threat Scoring
export {
  calculateThreatScore,
  prioritizeAlerts,
  TELECOM_MITRE_WEIGHTS,
} from './scoring/threat-scoring';

export type {
  ThreatScore,
  ScoreComponents,
  MITREMapping,
  TechniqueReference,
  RiskContext,
  AssetCriticality,
  ExposureLevel,
  ControlEffectiveness,
  ThreatIntelConfidence,
  BusinessImpactFactors,
  PrioritizedAlert,
} from './scoring/threat-scoring';

// Correlation Engine
export { CorrelationEngine } from './correlation/engine';
export { DJEZZY_CORRELATION_RULES } from './correlation/engine';

export type {
  CorrelationEvent,
  EventSource,
  CorrelationRule,
  CorrelationCondition,
  ConditionOperator,
  AggregationType,
  CorrelationSeverity,
  RuleCategory,
  CorrelationAction,
  CorrelationResult,
  CorrelationState,
} from './correlation/engine';
