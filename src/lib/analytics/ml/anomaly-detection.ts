/**
 * National SOC Platform - ML Anomaly Detection Engine
 * 
 * Advanced statistical and pattern-based anomaly detection for:
 * - Network traffic analysis (SS7, GTP, SIP, Diameter)
 * - Security event correlation
 * - User behavior analytics
 * - Fraud detection patterns
 * - Performance metric anomalies
 */

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface DataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface AnomalyResult {
  isAnomalous: boolean;
  score: number; // 0-100, higher = more anomalous
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  details: string;
  baseline?: number;
  expectedRange?: { min: number; max: number };
  detectedAt: Date;
}

export type AnomalyType = 
  | 'statistical_spike'
  | 'statistical_drop'
  | 'trend_deviation'
  | 'seasonal_anomaly'
  | 'pattern_break'
  | 'volume_anomaly'
  | 'behavioral_anomaly'
  | 'correlation_anomaly';

export interface DetectionConfig {
  // Sensitivity settings
  sensitivity: 'low' | 'medium' | 'high' | 'aggressive';
  
  // Statistical thresholds
  zScoreThreshold: number;
  iqrMultiplier: number;
  madThreshold: number;
  
  // Time window settings
  lookbackWindowMinutes: number;
  seasonalityPeriodMinutes: number;
  minDataPoints: number;
  
  // Feature flags
  enableTrendAnalysis: boolean;
  enableSeasonalDetection: boolean;
  enablePatternRecognition: boolean;
  enableBaselineDeviation: boolean;
  
  // Domain-specific settings
  telecomConfig: TelecomDetectionConfig;
  securityConfig: SecurityDetectionConfig;
}

export interface TelecomDetectionConfig {
  // SS7 specific
  ss7MessageRateThreshold: number; // messages/second
  ss7ErrorRateThreshold: number; // percentage
  
  // GTP specific
  gtpSessionSpikeFactor: number;
  gtpRoamingAnomalyThreshold: number;
  
  // SIP specific
  sipCallDropRateThreshold: number;
  sipRegistrationAnomalyThreshold: number;
  
  // Diameter specific
  diameterErrorResponseThreshold: number;
  diameterCreditControlAnomaly: number;
  
  // General telecom
  trafficDeviationPercent: number;
  latencyPercentileThreshold: number; // P95/P99
}

export interface SecurityDetectionConfig {
  // Authentication anomalies
  loginFailureThreshold: number; // failures per minute
  bruteForceWindowMinutes: number;
  impossibleTravelThresholdKm: number; // km per hour
  
  // Access anomalies
  privilegeEscalationWeight: number;
  dataExfiltrationThresholdMB: number;
  lateralMovementWeight: number;
  
  // Behavioral
  afterHoursAccessWeight: number;
  unusualLocationWeight: number;
  newDeviceAccessWeight: number;
}

// ============================================================
// DEFAULT CONFIGURATION FOR DJEZZY
// ============================================================

export const DJEZZY_ANALYTICS_DEFAULTS: DetectionConfig = {
  sensitivity: 'medium',
  zScoreThreshold: 2.5,
  iqrMultiplier: 2.0,
  madThreshold: 3.0,
  lookbackWindowMinutes: 60,
  seasonalityPeriodMinutes: 1440, // 24 hours
  minDataPoints: 30,
  enableTrendAnalysis: true,
  enableSeasonalDetection: true,
  enablePatternRecognition: true,
  enableBaselineDeviation: true,
  telecomConfig: {
    ss7MessageRateThreshold: 10000, // 10k msgs/sec threshold
    ss7ErrorRateThreshold: 5, // 5% error rate
    gtpSessionSpikeFactor: 3, // 3x normal = anomaly
    gtpRoamingAnomalyThreshold: 50, // 50 new roamers/min
    sipCallDropRateThreshold: 10, // 10% drop rate
    sipRegistrationAnomalyThreshold: 100, // 100 regs/min spike
    diameterErrorResponseThreshold: 10, // 10% error responses
    diameterCreditControlAnomaly: 5, // 5x normal CCR
    trafficDeviationPercent: 30, // 30% from baseline
    latencyPercentileThreshold: 95, // P95 threshold
  },
  securityConfig: {
    loginFailureThreshold: 10, // 10 failures/min
    bruteForceWindowMinutes: 5,
    impossibleTravelThresholdKm: 800, // 800km/h max
    privilegeEscalationWeight: 0.9,
    dataExfiltrationThresholdMB: 500, // 500MB threshold
    lateralMovementWeight: 0.8,
    afterHoursAccessWeight: 0.6,
    unusualLocationWeight: 0.7,
    newDeviceAccessWeight: 0.5,
  },
};

// ============================================================
// STATISTICAL DETECTION METHODS
// ============================================================

/**
 * Calculate Z-score based anomaly detection
 * Identifies statistical outliers using standard deviations
 */
export function detectZScoreAnomalies(
  data: DataPoint[],
  config: DetectionConfig = DJEZZY_ANALYTICS_DEFAULTS
): AnomalyResult[] {
  if (data.length < config.minDataPoints) {
    return [];
  }

  const results: AnomalyResult[] = [];
  const values = data.map(d => d.value);
  const { mean, stdDev } = calculateStatistics(values);

  data.forEach((point, index) => {
    const zScore = stdDev > 0 ? (point.value - mean) / stdDev : 0;
    
    if (Math.abs(zScore) > config.zScoreThreshold) {
      results.push({
        isAnomalous: true,
        score: Math.min(100, Math.abs(zScore) * 20),
        type: point.value > mean ? 'statistical_spike' : 'statistical_drop',
        severity: getSeverityFromZScore(Math.abs(zScore)),
        confidence: Math.min(1, Math.abs(zScore) / config.zScoreThreshold),
        details: `Z-score of ${zScore.toFixed(2)} exceeds threshold (${config.zScoreThreshold})`,
        baseline: mean,
        expectedRange: {
          min: mean - config.zScoreThreshold * stdDev,
          max: mean + config.zScoreThreshold * stdDev,
        },
        detectedAt: point.timestamp || new Date(),
      });
    }
  });

  return results;
}

/**
 * IQR-based anomaly detection (robust to outliers)
 * Uses Interquartile Range to identify outliers
 */
export function detectIQRAnomalies(
  data: DataPoint[],
  config: DetectionConfig = DJEZZY_ANALYTICS_DEFAULTS
): AnomalyResult[] {
  if (data.length < config.minDataPoints) {
    return [];
  }

  const results: AnomalyResult[] = [];
  const sortedValues = [...data.map(d => d.value)].sort((a, b) => a - b);
  
  const q1Index = Math.floor(sortedValues.length * 0.25);
  const q3Index = Math.floor(sortedValues.length * 0.75);
  const q1 = sortedValues[q1Index];
  const q3 = sortedValues[q3Index];
  const iqr = q3 - q1;
  
  const lowerBound = q1 - config.iqrMultiplier * iqr;
  const upperBound = q3 + config.iqrMultiplier * iqr;

  data.forEach((point) => {
    if (point.value < lowerBound || point.value > upperBound) {
      const deviation = point.value < lowerBound 
        ? (lowerBound - point.value) / iqr
        : (point.value - upperBound) / iqr;

      results.push({
        isAnomalous: true,
        score: Math.min(100, deviation * 25),
        type: point.value < lowerBound ? 'statistical_drop' : 'statistical_spike',
        severity: getSeverityFromDeviation(deviation),
        confidence: Math.min(1, deviation / config.iqrMultiplier),
        details: `Value ${point.value} outside IQR bounds [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]`,
        baseline: (q1 + q3) / 2,
        expectedRange: { min: lowerBound, max: upperBound },
        detectedAt: point.timestamp || new Date(),
      });
    }
  });

  return results;
}

/**
 * Moving Average with Exponential Weighting (EWMA) anomaly detection
 * Good for detecting trend deviations and gradual changes
 */
export function detectEWMAnomalies(
  data: DataPoint[],
  alpha: number = 0.3, // Smoothing factor (0-1), higher = more responsive
  stdDevMultiplier: number = 2.5
): AnomalyResult[] {
  if (data.length < 20) {
    return [];
  }

  const results: AnomalyResult[] = [];
  const ewma: number[] = [];
  const variance: number[] = [];
  
  // Initialize EWMA with first value
  ewma[0] = data[0].value;
  variance[0] = 0;

  // Calculate EWMA and variance
  for (let i = 1; i < data.length; i++) {
    const prevEWMA = ewma[i - 1];
    ewma[i] = alpha * data[i].value + (1 - alpha) * prevEWMA;
    
    // Update variance estimate
    const diff = data[i].value - prevEWMA;
    variance[i] = (1 - alpha) * (variance[i - 1] + alpha * diff * diff);
  }

  // Detect anomalies (skip warmup period)
  const warmupPeriod = Math.floor(data.length * 0.2);
  
  for (let i = warmupPeriod; i < data.length; i++) {
    const stdDev = Math.sqrt(variance[i]);
    const deviation = stdDev > 0 
      ? (data[i].value - ewma[i]) / stdDev 
      : 0;

    if (Math.abs(deviation) > stdDevMultiplier) {
      results.push({
        isAnomalous: true,
        score: Math.min(100, Math.abs(deviation) * 20),
        type: 'trend_deviation',
        severity: getSeverityFromDeviation(Math.abs(deviation)),
        confidence: Math.min(1, Math.abs(deviation) / stdDevMultiplier),
        details: `Value deviates from EWMA trend by ${deviation.toFixed(2)}σ`,
        baseline: ewma[i],
        expectedRange: {
          min: ewma[i] - stdDevMultiplier * stdDev,
          max: ewma[i] + stdDevMultiplier * stdDev,
        },
        detectedAt: data[i].timestamp || new Date(),
      });
    }
  }

  return results;
}

/**
 * Median Absolute Deviation (MAD) based detection
 * More robust than standard deviation for non-normal distributions
 */
export function detectMADAnomalies(
  data: DataPoint[],
  config: DetectionConfig = DJEZZY_ANALYTICS_DEFAULTS
): AnomalyResult[] {
  if (data.length < config.minDataPoints) {
    return [];
  }

  const results: AnomalyResult[] = [];
  const values = data.map(d => d.value);
  const median = calculateMedian(values);
  
  // Calculate MAD
  const absoluteDeviations = values.map(v => Math.abs(v - median));
  const mad = calculateMedian(absoluteDeviations);
  
  // Modified Z-score using MAD (more robust)
  const modifiedZScores = values.map(v => 
    mad > 0 ? (0.6745 * (v - median)) / mad : 0
  );

  data.forEach((point, index) => {
    const mZScore = modifiedZScores[index];
    
    if (Math.abs(mZScore) > config.madThreshold) {
      results.push({
        isAnomalous: true,
        score: Math.min(100, Math.abs(mZScore) * 18),
        type: point.value > median ? 'volume_anomaly' : 'volume_anomaly',
        severity: getSeverityFromDeviation(Math.abs(mZScore)),
        confidence: Math.min(1, Math.abs(mZScore) / config.madThreshold),
        details: `Modified Z-score of ${mZScore.toFixed(2)} exceeds threshold`,
        baseline: median,
        expectedRange: {
          median: median,
          mad: mad,
          lowerBound: median - config.madThreshold * mad / 0.6745,
          upperBound: median + config.madThreshold * mad / 0.6745,
        } as any,
        detectedAt: point.timestamp || new Date(),
      });
    }
  });

  return results;
}

// ============================================================
// SEASONAL ANOMALY DETECTION
// ============================================================

/**
 * Detect seasonal anomalies by comparing to historical baselines
 * Accounts for daily/weekly patterns in telecom traffic
 */
export function detectSeasonalAnomalies(
  currentData: DataPoint[],
  historicalBaselines: Map<string, { mean: number; stdDev: number; count: number }>,
  config: DetectionConfig = DJEZZY_ANALYTICS_DEFAULTS
): AnomalyResult[] {
  if (!config.enableSeasonalDetection) {
    return [];
  }

  const results: AnomalyResult[] = [];

  currentData.forEach(point => {
    // Create time slot key (hour of day, day of week)
    const timestamp = point.timestamp instanceof Date ? point.timestamp : new Date(point.timestamp);
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    const timeSlotKey = `${dayOfWeek}-${hour}`;

    const baseline = historicalBaselines.get(timeSlotKey);

    if (baseline && baseline.count >= 5) { // Need sufficient history
      const zScore = baseline.stdDev > 0 
        ? (point.value - baseline.mean) / baseline.stdDev 
        : 0;

      if (Math.abs(zScore) > config.zScoreThreshold) {
        results.push({
          isAnomalous: true,
          score: Math.min(100, Math.abs(zScore) * 18),
          type: 'seasonal_anomaly',
          severity: getSeverityFromZScore(Math.abs(zScore)),
          confidence: Math.min(1, Math.abs(zScore) / config.zScoreThreshold),
          details: `Seasonal anomaly at hour ${hour}, day ${dayOfWeek}. Expected ~${baseline.mean.toFixed(0)}, got ${point.value}`,
          baseline: baseline.mean,
          expectedRange: {
            min: baseline.mean - config.zScoreThreshold * baseline.stdDev,
            max: baseline.mean + config.zScoreThreshold * baseline.stdDev,
          },
          detectedAt: timestamp,
        });
      }
    }
  });

  return results;
}

// ============================================================
// PATTERN RECOGNITION
// ============================================================

/**
 * Detect pattern breaks (sudden changes in behavior patterns)
 * Uses sequential pattern matching
 */
export function detectPatternBreaks(
  data: DataPoint[],
  patternLength: number = 10,
  similarityThreshold: number = 0.85
): AnomalyResult[] {
  if (data.length < patternLength * 3) {
    return [];
  }

  const results: AnomalyResult[] = [];
  
  // Extract recent pattern
  const recentPattern = data.slice(-patternLength).map(d => d.value);
  
  // Normalize recent pattern
  const recentNorm = normalizeArray(recentPattern);
  
  // Compare against historical patterns (sliding window)
  for (let i = 0; i <= data.length - patternLength * 2; i++) {
    const historicalPattern = data.slice(i, i + patternLength).map(d => d.value);
    const historicalNorm = normalizeArray(historicalPattern);
    
    // Calculate cosine similarity
    const similarity = calculateCosineSimilarity(recentNorm, historicalNorm);
    
    if (similarity < similarityThreshold) {
      // Check if this is a significant break
      const lastPoint = data[data.length - 1];
      
      results.push({
        isAnomalous: true,
        score: Math.min(100, (1 - similarity) * 100),
        type: 'pattern_break',
        severity: similarity < 0.7 ? 'high' : 'medium',
        confidence: 1 - similarity,
        details: `Pattern similarity dropped to ${(similarity * 100).toFixed(1)}%, below threshold ${(similarityThreshold * 100).toFixed(1)}%`,
        detectedAt: lastPoint.timestamp || new Date(),
      });
      
      break; // Only report once per analysis
    }
  }

  return results;
}

// ============================================================
// COMPREHENSIVE ANOMALY DETECTOR
// ============================================================

/**
 * Run all enabled detection methods and aggregate results
 */
export function detectAnomalies(
  data: DataPoint[],
  config: DetectionConfig = DJEZZY_ANALYTICS_DEFAULTS
): {
  anomalies: AnomalyResult[];
  summary: {
    totalAnomalies: number;
    byType: Record<AnomalyType, number>;
    bySeverity: Record<string, number>;
    avgScore: number;
    maxScore: number;
    detectionMethodsUsed: string[];
  };
} {
  const allAnomalies: AnomalyResult[] = [];
  const methodsUsed: string[] = [];

  // 1. Z-Score detection
  const zScoreResults = detectZScoreAnomalies(data, config);
  allAnomalies.push(...zScoreResults);
  if (zScoreResults.length > 0) methodsUsed.push('zscore');

  // 2. IQR detection
  const iqrResults = detectIQRAnomalies(data, config);
  allAnomalies.push(...iqrResults);
  if (iqrResults.length > 0) methodsUsed.push('iqr');

  // 3. EWMA trend detection
  if (config.enableTrendAnalysis) {
    const ewmaResults = detectEWMAnomalies(data);
    allAnomalies.push(...ewmaResults);
    if (ewmaResults.length > 0) methodsUsed.push('ewma');
  }

  // 4. MAD detection
  const madResults = detectMADAnomalies(data, config);
  allAnomalies.push(...madResults);
  if (madResults.length > 0) methodsUsed.push('mad');

  // 5. Pattern break detection
  if (config.enablePatternRecognition) {
    const patternResults = detectPatternBreaks(data);
    allAnomalies.push(...patternResults);
    if (patternResults.length > 0) methodsUsed.push('pattern');
  }

  // Deduplicate overlapping anomalies (same timestamp, similar type)
  const deduplicated = deduplicateAnomalies(allAnomalies);

  // Generate summary
  const byType = {} as Record<AnomalyType, number>;
  const bySeverity = {} as Record<string, number>;

  deduplicated.forEach(a => {
    byType[a.type] = (byType[a.type] || 0) + 1;
    bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
  });

  const scores = deduplicated.map(a => a.score);

  return {
    anomalies: deduplicated.sort((a, b) => b.score - a.score),
    summary: {
      totalAnomalies: deduplicated.length,
      byType,
      bySeverity,
      avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      maxScore: scores.length > 0 ? Math.max(...scores) : 0,
      detectionMethodsUsed: methodsUsed,
    },
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function calculateStatistics(values: number[]): { mean: number; stdDev: number } {
  const n = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);
  return { mean, stdDev };
}

function calculateMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function normalizeArray(arr: number[]): number[] {
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const range = max - min;
  return range === 0 ? arr.map(() => 0) : arr.map(v => (v - min) / range);
}

function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
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

function getSeverityFromZScore(zScore: number): 'low' | 'medium' | 'high' | 'critical' {
  if (zScore > 4) return 'critical';
  if (zScore > 3) return 'high';
  if (zScore > 2) return 'medium';
  return 'low';
}

function getSeverityFromDeviation(deviation: number): 'low' | 'medium' | 'high' | 'critical' {
  if (deviation > 5) return 'critical';
  if (deviation > 3) return 'high';
  if (deviation > 1.5) return 'medium';
  return 'low';
}

function deduplicateAnomalies(anomalies: AnomalyResult[]): AnomalyResult[] {
  const seen = new Set<string>();
  return anomalies.filter(a => {
    const key = `${a.detectedAt.getTime()}-${a.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => b.score - a.score); // Keep highest scoring duplicate
}

// Export types and main functions
export {
  DJEZZY_ANALYTICS_DEFAULTS,
  type DataPoint,
  type AnomalyResult,
  type AnomalyType,
  type DetectionConfig,
  type TelecomDetectionConfig,
  type SecurityDetectionConfig,
};
