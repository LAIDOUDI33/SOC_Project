/**
 * National SOC Platform - Time Series Analysis Module
 * 
 * Advanced time-series analytics for telecom and security data:
 * - Trend analysis (linear, exponential, moving averages)
 * - Seasonality detection (daily, weekly patterns)
 * - Forecasting with Holt-Winters method
 * - Baseline calculation and management
 * - Metric aggregation and rollups
 */

// ============================================================
// TYPES
// ============================================================

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  count?: number; // For pre-aggregated data
}

export interface TimeSeriesData {
  metric: string;
  source: string; // e.g., 'ss7', 'gtp', 'sip', 'security'
  granularity: TimeGranularity;
  points: TimeSeriesPoint[];
  metadata?: Record<string, any>;
}

export type TimeGranularity = 
  | '1m' | '5m' | '15m' | '30m' | '1h' | '6h' | '12h' | '1d' | '1w';

export interface TrendAnalysisResult {
  direction: 'increasing' | 'decreasing' | 'stable';
  slope: number; // Rate of change per unit time
  rSquared: number; // Goodness of fit (0-1)
  confidence: number;
  forecast?: TimeSeriesPoint[];
  seasonality?: SeasonalityPattern;
}

export interface SeasonalityPattern {
  detected: boolean;
  period: TimeGranularity;
  strength: number; // 0-1, how strong the pattern is
  peaks: number[]; // Hours/days of peak activity
  troughs: number[]; // Hours/days of low activity
  amplitude: number;
}

export interface BaselineProfile {
  metric: string;
  source: string;
  period: TimeGranularity;
  
  // Hourly baselines (for daily seasonality)
  hourlyBaselines: { hour: number; mean: number; stdDev: number; count: number }[];
  
  // Day of week baselines
  dowBaselines: { dayOfWeek: number; mean: number; stdDev: number }[];
  
  // Overall statistics
  overallMean: number;
  overallStdDev: number;
  min: number;
  max: number;
  p50: number; // Median
  p90: number;
  p95: number;
  p99: number;
  
  // Metadata
  calculatedAt: Date;
  dataPointsUsed: number;
  validFrom: Date;
  validTo: Date;
}

export interface AggregationResult {
  metric: string;
  source: string;
  from: Date;
  to: Date;
  granularity: TimeGranularity;
  aggregated: TimeSeriesPoint[];
  statistics: {
    total: number;
    average: number;
    min: number;
    max: number;
    stdDev: number;
    percentiles: { p50: number; p90: number; p95: number; p99: number };
  };
}

// ============================================================
// TIME SERIES OPERATIONS
// ============================================================

/**
 * Aggregate time series data to a different granularity
 */
export function aggregateTimeSeries(
  data: TimeSeriesPoint[],
  targetGranularity: TimeGranularity,
  aggregationMethod: 'sum' | 'avg' | 'max' | 'min' | 'count' = 'avg'
): TimeSeriesPoint[] {
  if (data.length === 0) return [];

  const bucketSizeMs = getGranularityMs(targetGranularity);
  const buckets = new Map<number, TimeSeriesPoint[]>();

  // Assign each point to its bucket
  data.forEach(point => {
    const ts = point.timestamp instanceof Date ? point.timestamp.getTime() : new Date(point.timestamp).getTime();
    const bucketStart = Math.floor(ts / bucketSizeMs) * bucketSizeMs;
    
    if (!buckets.has(bucketStart)) {
      buckets.set(bucketStart, []);
    }
    buckets.get(bucketStart)!.push(point);
  });

  // Aggregate each bucket
  return Array.from(buckets.entries())
    .map(([bucketStart, points]) => {
      const values = points.map(p => p.value);
      let aggregatedValue: number;

      switch (aggregationMethod) {
        case 'sum':
          aggregatedValue = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'max':
          aggregatedValue = Math.max(...values);
          break;
        case 'min':
          aggregatedValue = Math.min(...values);
          break;
        case 'count':
          aggregatedValue = values.length;
          break;
        default:
          aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
      }

      return {
        timestamp: new Date(bucketStart),
        value: aggregatedValue,
        count: points.length,
      };
    })
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Calculate moving average for smoothing
 */
export function calculateMovingAverage(
  data: TimeSeriesPoint[],
  windowSize: number = 5,
  type: 'simple' | 'exponential' | 'weighted' = 'simple',
  alpha?: number // For exponential MA
): TimeSeriesPoint[] {
  if (data.length < windowSize) return [...data];

  if (type === 'exponential') {
    return calculateExponentialMovingAverage(data, alpha || 0.3);
  }

  if (type === 'weighted') {
    return calculateWeightedMovingAverage(data, windowSize);
  }

  // Simple Moving Average
  const result: TimeSeriesPoint[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < windowSize - 1) {
      result.push({ ...data[i], value: null as any }); // Not enough data yet
      continue;
    }

    const window = data.slice(i - windowSize + 1, i + 1);
    const avg = window.reduce((sum, p) => sum + p.value, 0) / windowSize;
    
    result.push({
      ...data[i],
      value: avg,
    });
  }

  return result;
}

function calculateExponentialMovingAverage(
  data: TimeSeriesPoint[],
  alpha: number = 0.3
): TimeSeriesPoint[] {
  const result: TimeSeriesPoint[] = [];
  let ema = data[0].value;

  data.forEach((point, index) => {
    if (index === 0) {
      ema = point.value;
    } else {
      ema = alpha * point.value + (1 - alpha) * ema;
    }
    
    result.push({
      ...point,
      value: ema,
    });
  });

  return result;
}

function calculateWeightedMovingAverage(
  data: TimeSeriesPoint[],
  windowSize: number
): TimeSeriesPoint[] {
  const result: TimeSeriesPoint[] = [];
  const weights = Array.from({ length: windowSize }, (_, i) => i + 1);
  const weightSum = weights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < data.length; i++) {
    if (i < windowSize - 1) {
      result.push({ ...data[i], value: null as any });
      continue;
    }

    const window = data.slice(i - windowSize + 1, i + 1).map(p => p.value);
    const weightedAvg = window.reduce((sum, val, idx) => sum + val * weights[idx], 0) / weightSum;

    result.push({ ...data[i], value: weightedAvg });
  }

  return result;
}

/**
 * Analyze trend in time series data
 */
export function analyzeTrend(data: TimeSeriesPoint[]): TrendAnalysisResult {
  if (data.length < 3) {
    return {
      direction: 'stable',
      slope: 0,
      rSquared: 0,
      confidence: 0,
    };
  }

  const n = data.length;
  const timestamps = data.map(d => d.timestamp instanceof Date ? d.timestamp.getTime() : new Date(d.timestamp).getTime());
  const values = data.map(d => d.value);

  // Linear regression: y = mx + b
  const xMean = timestamps.reduce((a, b) => a + b, 0) / n;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let ssXY = 0;
  let ssXX = 0;
  let ssYY = 0;

  for (let i = 0; i < n; i++) {
    const dx = timestamps[i] - xMean;
    const dy = values[i] - yMean;
    ssXY += dx * dy;
    ssXX += dx * dx;
    ssYY += dy * dy;
  }

  const slope = ssXX !== 0 ? ssXY / ssXX : 0;
  const intercept = yMean - slope * xMean;
  
  // R-squared (coefficient of determination)
  const ssTotal = ssYY;
  const ssResidual = values.reduce((sum, y, i) => {
    const predicted = slope * timestamps[i] + intercept;
    return sum + Math.pow(y - predicted, 2);
  }, 0);
  
  const rSquared = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;

  // Determine direction
  const direction = slope > 0.001 ? 'increasing' : slope < -0.001 ? 'decreasing' : 'stable';
  
  // Confidence based on r-squared and data volume
  const confidence = rSquared * Math.min(1, n / 100);

  // Generate simple linear forecast (next 10 points)
  const lastTimestamp = timestamps[n - 1];
  const avgInterval = n > 1 ? (timestamps[1] - timestamps[0]) / (n - 1) : 3600000;
  
  const forecast: TimeSeriesPoint[] = [];
  for (let i = 1; i <= 10; i++) {
    const futureTime = new Date(lastTimestamp + i * avgInterval);
    const predictedValue = slope * futureTime.getTime() + intercept;
    
    forecast.push({
      timestamp: futureTime,
      value: Math.max(0, predictedValue), // No negative values
    });
  }

  return {
    direction,
    slope: slope * 1000, // Convert per-ms to per-second approximation
    rSquared,
    confidence,
    forecast,
  };
}

/**
 * Detect seasonality patterns in time series
 */
export function detectSeasonality(
  data: TimeSeriesPoint[],
  targetPeriods: TimeGranularity[] = ['1d', '1w']
): SeasonalityPattern | null {
  if (data.length < 48) { // Need at least 2 days of hourly data
    return null;
  }

  // Group by hour of day
  const hourlyGroups = new Map<number, number[]>();
  const dowGroups = new Map<number, number[]>();

  data.forEach(point => {
    const ts = point.timestamp instanceof Date ? point.timestamp : new Date(point.timestamp);
    const hour = ts.getHours();
    const dow = ts.getDay();

    if (!hourlyGroups.has(hour)) hourlyGroups.set(hour, []);
    if (!dowGroups.has(dow)) dowGroups.set(dow, []);

    hourlyGroups.get(hour)!.push(point.value);
    dowGroups.get(dow)!.push(point.value);
  });

  // Calculate coefficient of variation for each group
  const hourlyCVs = Array.from(hourlyGroups.entries()).map(([hour, values]) => ({
    hour,
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    stdDev: Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - (values.reduce((a, b) => a + b, 0) / values.length), 2), 0) / values.length),
    count: values.length,
  }));

  // Find peaks and troughs
  const sortedByMean = [...hourlyCVs].sort((a, b) => b.mean - a.mean);
  const peaks = sortedByMean.slice(0, 3).map(h => h.hour); // Top 3 peak hours
  const troughs = sortedByMean.slice(-3).map(h => h.hour); // Bottom 3 hours

  // Calculate pattern strength (how consistent are the hourly means?)
  const overallMean = data.reduce((sum, d) => sum + d.value, 0) / data.length;
  const varianceBetweenGroups = hourlyCVs.reduce((sum, h) => sum + Math.pow(h.mean - overallMean, 2), 0) / hourlyCVs.length;
  const strength = Math.min(1, varianceBetweenGroups / (overallMean * overallMean + 0.001));

  // Amplitude (peak - trough) relative to mean
  const amplitude = sortedByMean[0].mean - sortedByMean[sortedByMean.length - 1].mean;
  const relativeAmplitude = overallMean > 0 ? amplitude / overallMean : 0;

  return {
    detected: strength > 0.1, // At least some seasonality
    period: '1d', // Daily seasonality is most common
    strength,
    peaks,
    troughs,
    amplitude: relativeAmplitude,
  };
}

/**
 * Build baseline profile from historical data
 */
export function buildBaseline(
  data: TimeSeriesData,
  minDaysOfHistory: number = 7
): BaselineProfile {
  const points = data.points;
  
  // Group by hour
  const hourlyMap = new Map<number, number[]>();
  const dowMap = new Map<number, number[]>();
  const allValues: number[] = [];

  points.forEach(point => {
    const ts = point.timestamp instanceof Date ? point.timestamp : new Date(point.timestamp);
    const hour = ts.getHours();
    const dow = ts.getDay();
    const value = point.value;

    allValues.push(value);

    if (!hourlyMap.has(hour)) hourlyMap.set(hour, []);
    if (!dowMap.has(dow)) dowMap.set(dow, []);

    hourlyMap.get(hour)!.push(value);
    dowMap.get(dow)!.push(value);
  });

  // Calculate hourly statistics
  const hourlyBaselines = Array.from({ length: 24 }, (_, hour) => {
    const values = hourlyMap.get(hour) || [];
    const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const stdDev = values.length > 1 
      ? Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1))
      : 0;

    return { hour, mean, stdDev, count: values.length };
  });

  // Calculate day-of-week statistics
  const dowBaselines = Array.from({ length: 7 }, (_, dow) => {
    const values = dowMap.get(dow) || [];
    const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const stdDev = values.length > 1
      ? Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1))
      : 0;

    return { dayOfWeek: dow, mean, stdDev };
  });

  // Overall statistics
  const sortedValues = [...allValues].sort((a, b) => a - b);
  const overallMean = allValues.length > 0 ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 0;
  const overallStdDev = allValues.length > 1
    ? Math.sqrt(allValues.reduce((sum, v) => sum + Math.pow(v - overallMean, 2), 0) / (allValues.length - 1))
    : 0;

  return {
    metric: data.metric,
    source: data.source,
    period: data.granularity,
    hourlyBaselines,
    dowBaselines,
    overallMean,
    overallStdDev,
    min: sortedValues[0] || 0,
    max: sortedValues[sortedValues.length - 1] || 0,
    p50: getPercentile(sortedValues, 50),
    p90: getPercentile(sortedValues, 90),
    p95: getPercentile(sortedValues, 95),
    p99: getPercentile(sortedValues, 99),
    calculatedAt: new Date(),
    dataPointsUsed: points.length,
    validFrom: points[0]?.timestamp || new Date(),
    validTo: points[points.length - 1]?.timestamp || new Date(),
  };
}

// ============================================================
// HOLT-WINTERS FORECASTING
// ============================================================

interface HoltWintersParams {
  alpha: number; // Level smoothing
  beta: number;  // Trend smoothing
  gamma: number; // Seasonal smoothing
  seasonLength: number; // Period length (e.g., 24 for hourly daily)
}

interface HoltWintersForecast {
  forecast: TimeSeriesPoint[];
  level: number[];
  trend: number[];
  seasonal: number[];
  mae: number; // Mean Absolute Error
  rmse: number; // Root Mean Square Error
}

/**
 * Triple Exponential Smoothing (Holt-Winters) forecasting
 * Supports both additive and multiplicative seasonality
 */
export function holtWintersForecast(
  data: TimeSeriesPoint[],
  params: Partial<HoltWintersParams> = {},
  forecastHorizon: number = 24,
  seasonalityType: 'additive' | 'multiplicative' = 'additive'
): HoltWintersForecast {
  const values = data.map(d => d.value);
  const n = values.length;

  // Default parameters
  const seasonLength = params.seasonLength || 24; // Default to daily cycle
  const alpha = params.alpha || 0.3;
  const beta = params.beta || 0.1;
  const gamma = params.gamma || 0.1;

  // Need at least 2 seasons of data
  if (n < seasonLength * 2) {
    return {
      forecast: [],
      level: [],
      trend: [],
      seasonal: [],
      mae: 0,
      rmse: 0,
    };
  }

  // Initialize arrays
  const level: number[] = [];
  const trend: number[] = [];
  const seasonal: number[] = [];

  // Initial values
  level[0] = values.slice(0, seasonLength).reduce((a, b) => a + b, 0) / seasonLength;
  trend[0] = (values.slice(seasonLength, seasonLength * 2).reduce((a, b) => a + b, 0) / seasonLength - level[0]) / seasonLength;

  // Initial seasonal indices
  for (let i = 0; i < seasonLength; i++) {
    seasonal[i] = seasonalityType === 'additive'
      ? values[i] - level[0]
      : values[i] / level[0];
  }

  // Apply Holt-Winters equations
  for (let t = 1; t < n; t++) {
    const prevLevel = level[t - 1];
    const prevTrend = trend[t - 1];
    const prevSeasonal = seasonal[t % seasonLength] || 0;

    // Update level
    if (seasonalityType === 'additive') {
      level[t] = alpha * (values[t] - prevSeasonal) + (1 - alpha) * (prevLevel + prevTrend);
    } else {
      level[t] = alpha * (values[t] / prevSeasonal) + (1 - alpha) * (prevLevel + prevTrend);
    }

    // Update trend
    trend[t] = beta * (level[t] - prevLevel) + (1 - beta) * prevTrend;

    // Update seasonal
    if (seasonalityType === 'additive') {
      seasonal[t % seasonLength] = gamma * (values[t] - level[t]) + (1 - gamma) * prevSeasonal;
    } else {
      seasonal[t % seasonLength] = gamma * (values[t] / level[t]) + (1 - gamma) * prevSeasonal;
    }
  }

  // Generate forecasts
  const lastLevel = level[n - 1];
  const lastTrend = trend[n - 1];
  const lastTimestamp = data[n - 1].timestamp instanceof Date ? data[n - 1].timestamp : new Date(data[n - 1].timestamp);
  const avgInterval = n > 1 
    ? (lastTimestamp.getTime() - (data[0].timestamp instanceof Date ? data[0].timestamp.getTime() : new Date(data[0].timestamp).getTime())) / (n - 1)
    : 3600000;

  const forecast: TimeSeriesPoint[] = [];
  for (let h = 1; h <= forecastHorizon; h++) {
    const futureTime = new Date(lastTimestamp.getTime() + h * avgInterval);
    const seasonalIndex = ((n - 1 + h) % seasonLength);
    const s = seasonal[seasonalIndex] || 0;

    let forecastValue: number;
    if (seasonalityType === 'additive') {
      forecastValue = lastLevel + h * lastTrend + s;
    } else {
      forecastValue = (lastLevel + h * lastTrend) * s;
    }

    forecast.push({
      timestamp: futureTime,
      value: Math.max(0, forecastValue), // Non-negative
    });
  }

  // Calculate fit error (MAE, RMSE)
  let sumAbsError = 0;
  let sumSqError = 0;
  const fittedStart = seasonLength; // Skip initial warmup

  for (let t = fittedStart; t < n; t++) {
    const sIdx = t % seasonLength;
    const s = seasonal[sIdx] || 0;
    let fitted: number;

    if (seasonalityType === 'additive') {
      fitted = level[t - 1] + trend[t - 1] + s;
    } else {
      fitted = (level[t - 1] + trend[t - 1]) * s;
    }

    const error = values[t] - fitted;
    sumAbsError += Math.abs(error);
    sumSqError += error * error;
  }

  const fitCount = n - fittedStart;
  const mae = fitCount > 0 ? sumAbsError / fitCount : 0;
  const rmse = fitCount > 0 ? Math.sqrt(sumSqError / fitCount) : 0;

  return {
    forecast,
    level,
    trend,
    seasonal,
    mae,
    rmse,
  };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function getGranularityMs(granularity: TimeGranularity): number {
  const map: Record<TimeGranularity, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
  };
  return map[granularity] || 3600000;
}

function getPercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  const index = (percentile / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedArray[lower];
  return sortedArray[lower] * (upper - index) + sortedArray[upper] * (index - lower);
}

// Export types and main functions
export {
  type TimeSeriesPoint,
  type TimeSeriesData,
  type TimeGranularity,
  type TrendAnalysisResult,
  type SeasonalityPattern,
  type BaselineProfile,
  type AggregationResult,
};
