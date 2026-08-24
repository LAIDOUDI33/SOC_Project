/**
 * Prediction Engine - Time-Series Forecasting & Predictive Analytics
 * 
 * REAL IMPLEMENTATION: Uses statistical and ML methods for:
 * - Attack trend forecasting (Prophet-style decomposition)
 * - Incident volume prediction
 * - Resource capacity planning
 * - Anomaly threshold optimization
 * - Risk score prediction
 * 
 * Methods:
 * - Exponential Smoothing (Holt-Winters)
 * - Moving Averages (SMA, EMA)
 * - Linear Regression
 * - Seasonal Decomposition
 * - ARIMA-like forecasting (simplified)
 * 
 * @version 1.0.0
 * @module ai/internal/prediction-engine
 */

// ============================================================
// Types & Interfaces
// ============================================================

export interface PredictionConfig {
  // Forecasting settings
  defaultHorizonDays: number;
  confidenceInterval: number;    // 0-1, default 0.95
  
  // Model selection
  autoSelectModel: boolean;
  preferredModel: PredictionMethod;
  
  // Performance
  maxDataPoints: number;         // Max historical points to use
  minDataPoints: number;         // Minimum for reliable prediction
  
  // Seasonality
  detectSeasonality: boolean;
  seasonalityModes: ('daily' | 'weekly' | 'monthly' | 'yearly')[];
  
  // Caching
  enableCaching: boolean;
  cacheTTLMinutes: number;
}

export type PredictionMethod = 
  | 'exponential_smoothing'
  | 'moving_average'
  | 'linear_regression'
  | 'seasonal_decomposition'
  | 'arima'
  | 'ensemble';

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface ForecastResult {
  timestamps: Date[];
  predictedValues: number[];
  upperBound: number[];          // Upper confidence interval
  lowerBound: number[];          // Lower confidence interval
  confidenceInterval: number;
  
  modelInfo: {
    method: PredictionMethod;
    accuracy: number;            // R² or MAPE
    trainingPeriod: { start: Date; end: Date };
    parameters: Record<string, any>;
    seasonality?: {
      detected: boolean;
      period?: number;
      strength?: number;
    };
  };
  
  anomalies: Array<{
    timestamp: Date;
    actualValue: number;
    predictedValue: number;
    deviation: number;
    severity: 'low' | 'medium' | 'high';
  }>;
  
  trends: TrendAnalysis;
  recommendations: string[];
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  strength: number;              // 0-1, how strong is the trend
  rateOfChange: number;          // Units per day
  acceleration: number;          // Is trend speeding up or slowing down
  significance: number;          // Statistical significance (p-value approximation)
}

export interface CapacityPrediction {
  resourceType: 'analysts' | 'storage' | 'compute' | 'bandwidth' | 'licenses';
  currentUtilization: number;    // 0-1
  predictedUtilization: number[]; // Future values
  saturationDate?: Date;         // When will hit 100%
  recommendations: string[];
}

export interface AttackForecast {
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  predictedIncidents: ForecastResult;
  threatCategories: Array<{
    category: string;
    forecast: ForecastResult;
    trend: TrendAnalysis;
  }>;
  highRiskWindows: Array<{
    start: Date;
    end: Date;
    reason: string;
    recommendedActions: string[];
  }>;
  resourceRecommendations: CapacityPrediction[];
}

export interface PredictionStats {
  forecastsGenerated: number;
  avgAccuracy: number;
  avgProcessingTimeMs: number;
  cacheHitRate: number;
  modelsUsed: Record<PredictionMethod, number>;
}

// ============================================================
// Prediction Engine Class
// ============================================================

export class PredictionEngine {
  private config: PredictionConfig;
  private stats: PredictionStats;
  private cache: Map<string, { result: any; timestamp: Date }> = new Map();
  private initialized: boolean = false;

  constructor(config: Partial<PredictionConfig> = {}) {
    this.config = {
      defaultHorizonDays: config.defaultHorizonDays || 30,
      confidenceInterval: config.confidenceInterval || 0.95,
      autoSelectModel: config.autoSelectModel ?? true,
      preferredModel: config.preferredModel || 'ensemble',
      maxDataPoints: config.maxDataPoints || 1000,
      minDataPoints: config.minDataPoints || 30,
      detectSeasonality: config.detectSeasonality ?? true,
      seasonalityModes: config.seasonalityModes || ['daily', 'weekly', 'monthly'],
      enableCaching: config.enableCaching ?? true,
      cacheTTLMinutes: config.cacheTTLMinutes || 60
    };

    this.stats = {
      forecastsGenerated: 0,
      avgAccuracy: 0,
      avgProcessingTimeMs: 0,
      cacheHitRate: 0,
      modelsUsed: {
        exponential_smoothing: 0,
        moving_average: 0,
        linear_regression: 0,
        seasonal_decomposition: 0,
        arima: 0,
        ensemble: 0
      }
    };
  }

  /**
   * Initialize prediction engine
   */
  async initialize(): Promise<void> {
    console.log('[Prediction Engine] 🚀 Initializing prediction engine...');
    
    // Validate configuration
    if (this.config.minDataPoints < 10) {
      console.warn('[Prediction Engine] ⚠️ minDataPoints too low, setting to 10');
      this.config.minDataPoints = 10;
    }

    this.initialized = true;
    console.log('[Prediction Engine] 🎉 Prediction engine ready!');
    console.log(`[Prediction Engine] 📊 Default horizon: ${this.config.defaultHorizonDays} days`);
    console.log(`[Prediction Engine] 🔮 Preferred model: ${this.config.preferredModel}`);
  }

  // ============================================================
  // Main Forecasting Methods
  // ============================================================

  /**
   * Generate forecast from time series data
   */
  async forecast(
    data: TimeSeriesPoint[],
    options?: {
      horizonDays?: number;
      method?: PredictionMethod;
      confidenceInterval?: number;
    }
  ): Promise<ForecastResult> {
    const startTime = Date.now();

    if (!data || data.length < this.config.minDataPoints) {
      throw new Error(`Insufficient data: need at least ${this.config.minDataPoints} points, got ${data?.length || 0}`);
    }

    // Sort by timestamp
    const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Limit data points
    const limitedData = sortedData.slice(-this.config.maxDataPoints);

    const horizon = options?.horizonDays || this.config.defaultHorizonDays;
    const confidence = options?.confidenceInterval || this.config.confidenceInterval;

    // Select method
    let method = options?.method || this.config.preferredMethod;
    if (this.config.autoSelectModel && !options?.method) {
      method = this.selectBestMethod(limitedData);
    }

    // Generate forecast based on method
    let forecast: Omit<ForecastResult, 'anomalies' | 'trends' | 'recommendations'>;

    switch (method) {
      case 'exponential_smoothing':
        forecast = await this.exponentialSmoothingForecast(limitedData, horizon, confidence);
        break;
      case 'moving_average':
        forecast = await this.movingAverageForecast(limitedData, horizon, confidence);
        break;
      case 'linear_regression':
        forecast = await this.linearRegressionForecast(limitedData, horizon, confidence);
        break;
      case 'seasonal_decomposition':
        forecast = await this.seasonalDecompositionForecast(limitedData, horizon, confidence);
        break;
      case 'arima':
        forecast = await this.arimaLikeForecast(limitedData, horizon, confidence);
        break;
      case 'ensemble':
        forecast = await this.ensembleForecast(limitedData, horizon, confidence);
        break;
      default:
        throw new Error(`Unknown prediction method: ${method}`);
    }

    // Detect anomalies in historical data
    const anomalies = this.detectAnomalies(limitedData, forecast);

    // Analyze trends
    const trends = this.analyzeTrends(limitedData);

    // Generate recommendations
    const recommendations = this.generateForecastRecommendations(forecast, trends);

    // Update stats
    this.stats.forecastsGenerated++;
    this.stats.modelsUsed[method]++;
    this.updateStats(Date.now() - startTime, forecast.modelInfo.accuracy);

    return {
      ...forecast,
      anomalies,
      trends,
      recommendations
    };
  }

  /**
   * Generate attack forecast with category breakdown
   */
  async generateAttackForecast(
    historicalIncidents: Array<{
      timestamp: Date;
      category: string;
      severity: string;
      count: number;
    }>
  ): Promise<AttackForecast> {
    // Aggregate by date
    const dailyTotals = this.aggregateByDay(historicalIncidents);
    
    // Overall forecast
    const overallForecast = await this.forecast(dailyTotals, { horizonDays: 30 });

    // Category-specific forecasts
    const categories = [...new Set(historicalIncidents.map(i => i.category))];
    const threatCategories = await Promise.all(
      categories.map(async (category) => {
        const categoryData = this.aggregateByDay(
          historicalIncidents.filter(i => i.category === category)
        );
        
        try {
          const forecast = await this.forecast(categoryData, { horizonDays: 30 });
          return {
            category,
            forecast,
            trend: this.analyzeTrends(categoryData)
          };
        } catch {
          return null;
        }
      })
    ).then(results => results.filter(Boolean) as NonNullable<typeof results>[number][]);

    // Determine overall risk level
    const lastPredicted = overallForecast.predictedValues[overallForecast.predictedValues.length - 1];
    const currentAvg = dailyTotals.slice(-7).reduce((sum, p) => sum + p.value, 0) / 7;
    const growthRate = (lastPredicted - currentAvg) / (currentAvg || 1);

    const overallRiskLevel = growthRate > 0.5 ? 'critical' :
                            growthRate > 0.2 ? 'high' :
                            growthRate < -0.2 ? 'low' : 'medium';

    // Identify high-risk windows
    const highRiskWindows = this.identifyHighRiskWindows(overallForecast);

    // Resource recommendations
    const resourceRecommendations = this.generateResourcePredictions(overallForecast);

    return {
      overallRiskLevel,
      predictedIncidents: overallForecast,
      threatCategories,
      highRiskWindows,
      resourceRecommendations: resourceRecommendations
    };
  }

  /**
   * Predict capacity needs
   */
  async predictCapacity(
    historicalUsage: TimeSeriesPoint[],
    resourceType: CapacityPrediction['resourceType'],
    currentCapacity: number
  ): Promise<CapacityPrediction> {
    const forecast = await this.forecast(historicalUsage, { horizonDays: 90 });
    
    const currentUtilization = historicalUsage[historicalUsage.length - 1]?.value / currentCapacity || 0;
    const predictedUtilization = forecast.predictedValues.map(v => v / currentCapacity);
    
    // Find when we might hit capacity
    let saturationDate: Date | undefined;
    for (let i = 0; i < predictedUtilization.length; i++) {
      if (predictedUtilization[i] >= 1) {
        saturationDate = forecast.timestamps[i];
        break;
      }
    }

    const recommendations: string[] = [];
    
    if (saturationDate) {
      const daysUntilSaturation = Math.ceil((saturationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      recommendations.push(`⚠️ Expected to reach capacity in ${daysUntilSaturation} days (${saturationDate.toDateString()})`);
      
      switch (resourceType) {
        case 'analysts':
          recommendations.push('Consider hiring additional analysts or implementing automation');
          recommendations.push('Review alert triage efficiency');
          break;
        case 'storage':
          recommendations.push('Plan storage expansion or implement data retention policies');
          recommendations.push('Evaluate log compression/archiving solutions');
          break;
        case 'compute':
          recommendations.push('Scale compute resources or optimize query performance');
          recommendations.push('Review ML inference costs');
          break;
        case 'bandwidth':
          recommendations.push('Upgrade network infrastructure or implement traffic shaping');
          recommendations.push('Evaluate edge processing options');
          break;
        case 'licenses':
          recommendations.push('Plan license procurement or evaluate alternatives');
          recommendations.push('Review utilization of existing licenses');
          break;
      }
    } else if (predictedUtilization[predictedUtilization.length - 1] > 0.8) {
      recommendations.push('Utilization trending high (>80%), monitor closely');
    } else {
      recommendations.push('Current capacity sufficient for forecasted growth');
    }

    return {
      resourceType,
      currentUtilization,
      predictedUtilization,
      saturationDate,
      recommendations
    };
  }

  // ============================================================
  // Forecasting Algorithms
  // ============================================================

  /**
   * Exponential Smoothing (Holt-Winters style)
   */
  private async exponentialSmoothingForecast(
    data: TimeSeriesPoint[],
    horizon: number,
    confidence: number
  ): Promise<Omit<ForecastResult, 'anomalies' | 'trends' | 'recommendations'>> {
    const values = data.map(d => d.value);
    const n = values.length;

    // Optimize alpha (smoothing factor)
    const alpha = this.optimizeAlpha(values);
    
    // Calculate smoothed values and level
    let level = values[0];
    let trend = n > 1 ? (values[n - 1] - values[0]) / (n - 1) : 0;
    
    const smoothedValues: number[] = [level];
    
    for (let i = 1; i < n; i++) {
      const prevLevel = level;
      level = alpha * values[i] + (1 - alpha) * (prevLevel + trend);
      trend = 0.1 * (level - prevLevel) + (1 - 1) * trend; // Beta = 0.1
      smoothedValues.push(level + trend);
    }

    // Generate predictions
    const predictions: number[] = [];
    const lastLevel = level;
    const lastTrend = trend;
    
    for (let h = 1; h <= horizon; h++) {
      predictions.push(lastLevel + h * lastTrend);
    }

    // Calculate confidence intervals (simplified)
    const residuals = values.map((v, i) => v - smoothedValues[i]);
    const stdError = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / (n - 2));
    const zScore = this.getZScore(confidence);
    
    const upperBound = predictions.map(p => p + zScore * stdError * Math.sqrt(1 + 0.1 * horizon)); // Increasing uncertainty
    const lowerBound = predictions.map(p => p - zScore * stdError * Math.sqrt(1 + 0.1 * horizon));

    // Calculate accuracy (R²)
    const ssRes = residuals.reduce((sum, r) => sum + r * r, 0);
    const ssTot = values.reduce((sum, v) => sum + Math.pow(v - values.reduce((a, b) => a + b, 0) / n, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    // Generate future timestamps
    const lastTimestamp = data[data.length - 1].timestamp;
    const timestamps = this.generateFutureTimestamps(lastTimestamp, horizon);

    return {
      timestamps,
      predictedValues: predictions,
      upperBound,
      lowerBound,
      confidenceInterval: confidence,
      modelInfo: {
        method: 'exponential_smoothing',
        accuracy: Math.max(0, rSquared),
        trainingPeriod: { start: data[0].timestamp, end: data[data.length - 1].timestamp },
        parameters: { alpha, beta: 0.1 },
        seasonality: this.detectSeasonality(data)
      }
    };
  }

  /**
   * Moving Average Forecast
   */
  private async movingAverageForecast(
    data: TimeSeriesPoint[],
    horizon: number,
    confidence: number
  ): Promise<Omit<ForecastResult, 'anomalies' | 'trends' | 'recommendations'>> {
    const values = data.map(d => d.value);
    const windowSize = Math.min(7, Math.floor(values.length / 3)); // Adaptive window
    
    // Simple Moving Average
    const sma: number[] = [];
    for (let i = windowSize - 1; i < values.length; i++) {
      const window = values.slice(i - windowSize + 1, i + 1);
      sma.push(window.reduce((a, b) => a + b, 0) / windowSize);
    }

    // Use last SMA as baseline, add average change
    const lastSMA = sma[sma.length - 1];
    const avgChange = (values[values.length - 1] - values[windowSize]) / (values.length - windowSize);
    
    const predictions: number[] = [];
    for (let h = 1; h <= horizon; h++) {
      predictions.push(lastSMA + h * avgChange);
    }

    // Confidence intervals
    const residuals = values.slice(windowSize - 1).map((v, i) => v - sma[i]);
    const stdError = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length);
    const zScore = this.getZScore(confidence);
    
    const upperBound = predictions.map((_, i) => predictions[i] + zScore * stdError * Math.sqrt(1 + i * 0.05));
    const lowerBound = predictions.map((_, i) => predictions[i] - zScore * stdError * Math.sqrt(1 + i * 0.05));

    // Accuracy
    const ssRes = residuals.reduce((sum, r) => sum + r * r, 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const ssTot = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    const lastTimestamp = data[data.length - 1].timestamp;
    const timestamps = this.generateFutureTimestamps(lastTimestamp, horizon);

    return {
      timestamps,
      predictedValues: predictions,
      upperBound,
      lowerBound,
      confidenceInterval: confidence,
      modelInfo: {
        method: 'moving_average',
        accuracy: Math.max(0, rSquared),
        trainingPeriod: { start: data[0].timestamp, end: data[data.length - 1].timestamp },
        parameters: { windowSize }
      }
    };
  }

  /**
   * Linear Regression Forecast
   */
  private async linearRegressionForecast(
    data: TimeSeriesPoint[],
    horizon: number,
    confidence: number
  ): Promise<Omit<ForecastResult, 'anomalies' | 'trends' | 'recommendations'>> {
    const values = data.map(d => d.value);
    const n = values.length;
    
    // Convert dates to numeric (days since first point)
    const baseTime = data[0].timestamp.getTime();
    const x = data.map(d => (d.timestamp.getTime() - baseTime) / (1000 * 60 * 60 * 24));
    
    // Calculate regression coefficients
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = values.reduce((a, b) => a + b, 0) / n;
    
    let ssXY = 0, ssXX = 0;
    for (let i = 0; i < n; i++) {
      ssXY += (x[i] - meanX) * (values[i] - meanY);
      ssXX += Math.pow(x[i] - meanX, 2);
    }
    
    const slope = ssXY / ssXX;
    const intercept = meanY - slope * meanX;
    
    // Generate predictions
    const predictions: number[] = [];
    const futureX: number[] = [];
    const lastX = x[x.length - 1];
    
    for (let h = 1; h <= horizon; h++) {
      const futureDay = lastX + h;
      futureX.push(futureDay);
      predictions.push(intercept + slope * futureDay);
    }

    // Confidence intervals
    const yPred = x.map(xi => intercept + slope * xi);
    const residuals = values.map((v, i) => v - yPred[i]);
    const mse = residuals.reduce((sum, r) => sum + r * r, 0) / (n - 2);
    const stdError = Math.sqrt(mse);
    const zScore = this.getZScore(confidence);
    
    const upperBound = predictions.map((p, i) => p + zScore * stdError * Math.sqrt(1 + 1/n + Math.pow(futureX[i] - meanX, 2) / ssXX));
    const lowerBound = predictions.map((p, i) => p - zScore * stdError * Math.sqrt(1 + 1/n + Math.pow(futureX[i] - meanX, 2) / ssXX));

    // R²
    const ssRes = residuals.reduce((sum, r) => sum + r * r, 0);
    const ssTot = values.reduce((sum, v) => sum + Math.pow(v - meanY, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    const lastTimestamp = data[data.length - 1].timestamp;
    const timestamps = this.generateFutureTimestamps(lastTimestamp, horizon);

    return {
      timestamps,
      predictedValues: predictions,
      upperBound,
      lowerBound,
      confidenceInterval: confidence,
      modelInfo: {
        method: 'linear_regression',
        accuracy: Math.max(0, rSquared),
        trainingPeriod: { start: data[0].timestamp, end: data[data.length - 1].timestamp },
        parameters: { slope, intercept }
      }
    };
  }

  /**
   * Seasonal Decomposition Forecast
   */
  private async seasonalDecompositionForecast(
    data: TimeSeriesPoint[],
    horizon: number,
    confidence: number
  ): Promise<Omit<ForecastResult, 'anomalies' | 'trends' | 'recommendations'>> {
    const values = data.map(d => d.value);
    
    // Detect seasonality period (simplified FFT or autocorrelation)
    const period = this.detectSeasonalityPeriod(data);
    
    if (!period || period < 2) {
      // Fall back to exponential smoothing if no clear seasonality
      return this.exponentialSmoothingForecast(data, horizon, confidence);
    }

    // Decompose into trend, seasonal, and residual components
    const { trend, seasonal, residuals } = this.decomposeSeasonal(values, period);
    
    // Extend trend using linear extrapolation
    const trendSlope = (trend[trend.length - 1] - trend[0]) / (trend.length - 1);
    const extendedTrend: number[] = [];
    for (let h = 1; h <= horizon; h++) {
      extendedTrend.push(trend[trend.length - 1] + h * trendSlope);
    }

    // Apply seasonal pattern
    const predictions = extendedTrend.map((t, i) => {
      const seasonalIndex = (data.length + i) % period;
      return t * (seasonal[seasonalIndex] || 1);
    });

    // Confidence intervals based on residual variance
    const residualStd = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length);
    const zScore = this.getZScore(confidence);
    
    const upperBound = predictions.map(p => p + zScore * residualStd);
    const lowerBound = predictions.map(p => p - zScore * residualStd);

    // Accuracy estimate
    const reconstructed = trend.map((t, i) => t * (seasonal[i % period] || 1));
    const ssRes = values.map((v, i) => v - reconstructed[i]).reduce((sum, r) => sum + r * r, 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const ssTot = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    const lastTimestamp = data[data.length - 1].timestamp;
    const timestamps = this.generateFutureTimestamps(lastTimestamp, horizon);

    return {
      timestamps,
      predictedValues: predictions,
      upperBound,
      lowerBound,
      confidenceInterval: confidence,
      modelInfo: {
        method: 'seasonal_decomposition',
        accuracy: Math.max(0, rSquared),
        trainingPeriod: { start: data[0].timestamp, end: data[data.length - 1].timestamp },
        parameters: { period },
        seasonality: {
          detected: true,
          period,
          strength: this.calculateSeasonalStrength(seasonal)
        }
      }
    };
  }

  /**
   * Simplified ARIMA-like forecast (AutoRegressive component only)
   */
  private async arimaLikeForecast(
    data: TimeSeriesPoint[],
    horizon: number,
    confidence: number
  ): Promise<Omit<ForecastResult, 'anomalies' | 'trends' | 'recommendations'>> {
    const values = data.map(d => d.value);
    const order = Math.min(5, Math.floor(values.length / 10)); // AR order
    
    // Fit auto-regressive model using Yule-Walker equations (simplified)
    const coefficients = this.fitARModel(values, order);
    
    // Generate predictions
    const predictions: number[] = [];
    const history = [...values]; // Start with actual history
    
    for (let h = 0; h < horizon; h++) {
      let prediction = 0;
      for (let i = 0; i < order; i++) {
        prediction += coefficients[i] * history[history.length - 1 - i];
      }
      predictions.push(prediction);
      history.push(prediction); // Use prediction for next step
    }

    // Confidence intervals (widening over time)
    const fitted = values.slice(order).map((_, i) => {
      let pred = 0;
      for (let j = 0; j < order; j++) {
        pred += coefficients[j] * values[i + order - 1 - j];
      }
      return pred;
    });
    
    const residuals = values.slice(order).map((v, i) => v - fitted[i]);
    const stdError = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length);
    const zScore = this.getZScore(confidence);
    
    const upperBound = predictions.map((_, i) => predictions[i] + zScore * stdError * Math.sqrt(i + 1));
    const lowerBound = predictions.map((_, i) => predictions[i] - zScore * stdError * Math.sqrt(i + 1));

    // Accuracy
    const ssRes = residuals.reduce((sum, r) => sum + r * r, 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const ssTot = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    const lastTimestamp = data[data.length - 1].timestamp;
    const timestamps = this.generateFutureTimestamps(lastTimestamp, horizon);

    return {
      timestamps,
      predictedValues: predictions,
      upperBound,
      lowerBound,
      confidenceInterval: confidence,
      modelInfo: {
        method: 'arima',
        accuracy: Math.max(0, rSquared),
        trainingPeriod: { start: data[0].timestamp, end: data[data.length - 1].timestamp },
        parameters: { order, coefficients }
      }
    };
  }

  /**
   * Ensemble forecast (average of multiple methods)
   */
  private async ensembleForecast(
    data: TimeSeriesPoint[],
    horizon: number,
    confidence: number
  ): Promise<Omit<ForecastResult, 'anomalies' | 'trends' | 'recommendations'>> {
    // Run multiple methods
    const methods: PredictionMethod[] = [
      'exponential_smoothing',
      'linear_regression',
      'moving_average'
    ];

    const forecasts = await Promise.all(
      methods.map(method => this.forecast(data, { horizon, method, confidence }).catch(() => null))
    );

    const validForecasts = forecasts.filter(f => f !== null) as ForecastResult[];

    if (validForecasts.length === 0) {
      throw new Error('All ensemble methods failed');
    }

    // Weight by accuracy
    const totalWeight = validForecasts.reduce((sum, f) => sum + f.modelInfo.accuracy, 0);
    
    // Average predictions (weighted)
    const predictions: number[] = [];
    const upperBounds: number[] = [];
    const lowerBounds: number[] = [];

    for (let i = 0; i < horizon; i++) {
      let weightedPred = 0, weightedUpper = 0, weightedLower = 0;
      
      for (const forecast of validForecasts) {
        const weight = forecast.modelInfo.accuracy / totalWeight;
        weightedPred += forecast.predictedValues[i] * weight;
        weightedUpper += forecast.upperBound[i] * weight;
        weightedLower += forecast.lowerBound[i] * weight;
      }
      
      predictions.push(weightedPred);
      upperBounds.push(weightedUpper);
      lowerBounds.push(weightedLower);
    }

    // Average accuracy
    const avgAccuracy = validForecasts.reduce((sum, f) => sum + f.modelInfo.accuracy, 0) / validForecasts.length;

    const lastTimestamp = data[data.length - 1].timestamp;
    const timestamps = this.generateFutureTimestamps(lastTimestamp, horizon);

    return {
      timestamps,
      predictedValues: predictions,
      upperBound: upperBounds,
      lowerBound: lowerBounds,
      confidenceInterval: confidence,
      modelInfo: {
        method: 'ensemble',
        accuracy: avgAccuracy,
        trainingPeriod: { start: data[0].timestamp, end: data[data.length - 1].timestamp },
        parameters: {
          methods: validForecasts.map(f => ({
            method: f.modelInfo.method,
            weight: f.modelInfo.accuracy / totalWeight,
            accuracy: f.modelInfo.accuracy
          }))
        },
        seasonality: this.detectSeasonality(data)
      }
    };
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  private selectBestMethod(data: TimeSeriesPoint[]): PredictionMethod {
    const values = data.map(d => d.value);
    const n = values.length;

    // Heuristics for method selection
    const hasStrongTrend = this.hasLinearTrend(values);
    const hasSeasonality = this.detectSeasonalityPeriod(data) !== null;
    const volatility = this.calculateVolatility(values);

    if (hasSeasonality && n >= 90) {
      return 'seasonal_decomposition';
    } else if (hasStrongTrend && volatility < 0.3) {
      return 'linear_regression';
    } else if (volatility > 0.5) {
      return 'exponential_smoothing'; // Better for volatile data
    } else if (n >= 50) {
      return 'arima'; // Good for larger datasets
    } else {
      return 'ensemble'; // Safe default
    }
  }

  private optimizeAlpha(values: number[]): number {
    // Grid search for optimal smoothing parameter
    let bestAlpha = 0.3;
    let bestMSE = Infinity;

    for (const alpha of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) {
      let mse = 0;
      let level = values[0];

      for (let i = 1; i < values.length; i++) {
        level = alpha * values[i] + (1 - alpha) * level;
        mse += Math.pow(values[i] - level, 2);
      }

      mse /= values.length;

      if (mse < bestMSE) {
        bestMSE = mse;
        bestAlpha = alpha;
      }
    }

    return bestAlpha;
  }

  private fitARModel(values: number[], order: number): number[] {
    // Simplified Yule-Walker estimation
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const centered = values.map(v => v - mean);

    // Autocovariance function
    const autocov = (lag: number) => {
      let sum = 0;
      for (let i = 0; i < n - lag; i++) {
        sum += centered[i] * centered[i + lag];
      }
      return sum / (n - lag);
    };

    // Build Yule-Walker matrix and solve (simplified for small orders)
    const R = [];
    for (let i = 0; i < order; i++) {
      R.push(Array.from({ length: order }, (_, j) => autocov(Math.abs(i - j))));
    }
    const r = Array.from({ length: order }, (_, i) => autocov(i + 1));

    // Solve using Gaussian elimination (simplified)
    return this.solveLinearSystem(R, r);
  }

  private solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = b.length;
    const augmented = A.map((row, i) => [...row, b[i]]);

    // Forward elimination
    for (let col = 0; col < n; col++) {
      // Partial pivoting
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
          maxRow = row;
        }
      }
      [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];

      // Eliminate below
      for (let row = col + 1; row < n; row++) {
        const factor = augmented[row][col] / augmented[col][col];
        for (let j = col; j <= n; j++) {
          augmented[row][j] -= factor * augmented[col][j];
        }
      }
    }

    // Back substitution
    const solution = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      solution[i] = augmented[i][n];
      for (let j = i + 1; j < n; j++) {
        solution[i] -= augmented[i][j] * solution[j];
      }
      solution[i] /= augmented[i][i];
    }

    return solution;
  }

  private decomposeSeasonal(values: number[], period: number): {
    trend: number[];
    seasonal: number[];
    residuals: number[];
  } {
    // Simple multiplicative decomposition
    
    // Step 1: Estimate trend with moving average (centered)
    const maWindow = period % 2 === 0 ? period : period - 1;
    const trend: number[] = [];
    
    for (let i = 0; i < values.length; i++) {
      const halfWindow = Math.floor(maWindow / 2);
      if (i < halfWindow || i >= values.length - halfWindow) {
        trend.push(values[i]); // Edge handling
      } else {
        let sum = 0;
        for (let j = i - halfWindow; j <= i + halfWindow; j++) {
          sum += values[j];
        }
        trend.push(sum / maWindow);
      }
    }

    // Step 2: Detrend
    const detrended = values.map((v, i) => v / (trend[i] || 1));

    // Step 3: Estimate seasonal components
    const seasonal = new Array(period).fill(0);
    const counts = new Array(period).fill(0);

    for (let i = 0; i < detrended.length; i++) {
      seasonal[i % period] += detrended[i];
      counts[i % period]++;
    }

    // Normalize so seasonal components average to 1
    const seasonalMean = seasonal.reduce((a, b, i) => a + b, 0) / period;
    for (let i = 0; i < period; i++) {
      seasonal[i] = (seasonal[i] / (counts[i] || 1)) / seasonalMean;
    }

    // Step 4: Residuals
    const residuals = values.map((v, i) => v / ((trend[i] || 1) * (seasonal[i % period] || 1)));

    return { trend, seasonal, residuals };
  }

  private detectSeasonalityPeriod(data: TimeSeriesPoint[]): number | null {
    const values = data.map(d => d.value);
    const n = values.length;

    // Check common periods: 7 (weekly), 30 (monthly), 365 (yearly)
    const candidatePeriods = [7, 14, 30, 90, 365].filter(p => p < n / 2);

    let bestPeriod: number | null = null;
    let bestStrength = 0;

    for (const period of candidatePeriods) {
      const { seasonal } = this.decomposeSeasonal(values, period);
      const strength = this.calculateSeasonalStrength(seasonal);
      
      if (strength > bestStrength && strength > 0.2) {
        bestStrength = strength;
        bestPeriod = period;
      }
    }

    return bestPeriod;
  }

  private calculateSeasonalStrength(seasonal: number[]): number {
    const mean = seasonal.reduce((a, b) => a + b, 0) / seasonal.length;
    const variance = seasonal.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / seasonal.length;
    
    // Normalize to 0-1 range (coefficient of variation)
    return Math.min(1, Math.sqrt(variance) / (mean || 1));
  }

  private hasLinearTrend(values: number[]): boolean {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = values.reduce((a, b) => a + b, 0) / n;
    
    let ssXY = 0, ssXX = 0;
    for (let i = 0; i < n; i++) {
      ssXY += (x[i] - meanX) * (values[i] - meanY);
      ssXX += Math.pow(x[i] - meanX, 2);
    }
    
    const correlation = ssXY / Math.sqrt(ssXX * values.reduce((sum, v) => sum + Math.pow(v - meanY, 2), 0));
    
    return Math.abs(correlation) > 0.5;
  }

  private calculateVolatility(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
    return stdDev / (mean || 1); // Coefficient of variation
  }

  private detectAnomalies(data: TimeSeriesPoint[], forecast: Omit<ForecastResult, 'anomalies' | 'trends' | 'recommendations'>): ForecastResult['anomalies'] {
    const anomalies: ForecastResult['anomalies'] = [];
    const values = data.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);

    for (let i = 0; i < data.length; i++) {
      const deviation = Math.abs(values[i] - mean) / (stdDev || 1);
      
      if (deviation > 2) { // Beyond 2 standard deviations
        anomalies.push({
          timestamp: data[i].timestamp,
          actualValue: values[i],
          predictedValue: mean,
          deviation,
          severity: deviation > 3 ? 'high' : deviation > 2.5 ? 'medium' : 'low'
        });
      }
    }

    return anomalies.sort((a, b) => b.deviation - a.deviation).slice(0, 20); // Top 20 anomalies
  }

  private analyzeTrends(data: TimeSeriesPoint[]): TrendAnalysis {
    const values = data.map(d => d.value);
    const n = values.length;

    // Linear regression for trend
    const x = Array.from({ length: n }, (_, i) => i);
    const meanX = n / 2;
    const meanY = values.reduce((a, b) => a + b, 0) / n;

    let ssXY = 0, ssXX = 0;
    for (let i = 0; i < n; i++) {
      ssXY += (x[i] - meanX) * (values[i] - meanY);
      ssXX += Math.pow(x[i] - meanX, 2);
    }

    const slope = ssXY / ssXX;
    const direction = slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable';
    
    // Strength (R²)
    const yPred = x.map(xi => meanY + slope * (xi - meanX));
    const ssRes = values.map((v, i) => Math.pow(v - yPred[i], 2)).reduce((a, b) => a + b, 0);
    const ssTot = values.map(v => Math.pow(v - meanY, 2)).reduce((a, b) => a + b, 0);
    const strength = 1 - (ssRes / ssTot);

    // Acceleration (second derivative approximation)
    const acceleration = n > 10 ? 
      (values.slice(-5).reduce((a, b) => a + b, 0) / 5 - values.slice(0, 5).reduce((a, b) => a + b, 0) / 5) / (n / 5) :
      0;

    return {
      direction,
      strength: Math.max(0, Math.min(1, strength)),
      rateOfChange: slope, // Per unit time index
      acceleration,
      significance: Math.min(1, strength * (1 - 1 / Math.sqrt(n)))
    };
  }

  private generateForecastRecommendations(
    forecast: Omit<ForecastResult, 'anomalies' | 'trends' | 'recommendations'>,
    trends: TrendAnalysis
  ): string[] {
    const recommendations: string[] = [];
    const lastValue = forecast.predictedValues[forecast.predictedValues.length - 1];
    const currentValue = forecast.predictedValues[0];
    const growthRate = (lastValue - currentValue) / (currentValue || 1);

    // Trend-based recommendations
    if (trends.direction === 'increasing' && trends.strength > 0.6) {
      if (growthRate > 0.3) {
        recommendations.push('⚠️ Strong upward trend detected (+${Math.round(growthRate * 100)}% over forecast period)');
        recommendations.push('Consider proactive measures to address increasing activity');
      } else {
        recommendations.push('Moderate upward trend expected');
      }
    } else if (trends.direction === 'decreasing') {
      recommendations.push('Downward trend detected - verify if improvement or data issue');
    }

    // Anomaly-based recommendations
    if (forecast.anomalies && forecast.anomalies.length > 5) {
      recommendations.push(`${forecast.anomalies.length} significant anomalies detected in historical data`);
      recommendations.push('Investigate root causes of anomalous events');
    }

    // Seasonality-based
    if (forecast.modelInfo.seasonality?.detected) {
      recommendations.push(`Seasonal pattern detected (period: ${forecast.modelInfo.seasonality.period} units)`);
      recommendations.push('Plan resources according to seasonal variations');
    }

    // Uncertainty warning
    const uncertaintyRange = forecast.upperBound[0] - forecast.lowerBound[0];
    const uncertaintyPercent = (uncertaintyRange / (lastValue || 1)) * 100;
    
    if (uncertaintyPercent > 50) {
      recommendations.push('⚠️ High forecast uncertainty - treat predictions as rough estimates');
      recommendations.push('Consider gathering more historical data to improve accuracy');
    }

    if (recommendations.length === 0) {
      recommendations.push('Stable conditions expected based on historical patterns');
    }

    return recommendations;
  }

  private identifyHighRiskWindows(forecast: ForecastResult): AttackForecast['highRiskWindows'] {
    const windows: AttackForecast['highRiskWindows'] = [];
    const threshold = this.calculateHighRiskThreshold(forecast);

    let windowStart: Date | null = null;
    let maxValue = 0;

    for (let i = 0; i < forecast.timestamps.length; i++) {
      if (forecast.predictedValues[i] > threshold) {
        if (!windowStart) {
          windowStart = forecast.timestamps[i];
        }
        maxValue = Math.max(maxValue, forecast.predictedValues[i]);
      } else if (windowStart) {
        windows.push({
          start: windowStart,
          end: forecast.timestamps[Math.max(0, i - 1)],
          reason: `Predicted values exceed ${Math.round(threshold)} incidents/day`,
          recommendedActions: [
            'Increase analyst coverage during this period',
            'Pre-position incident response resources',
            'Enhance monitoring and alerting thresholds'
          ]
        });
        windowStart = null;
        maxValue = 0;
      }
    }

    return windows;
  }

  private calculateHighRiskThreshold(forecast: ForecastResult): number {
    const mean = forecast.predictedValues.reduce((a, b) => a + b, 0) / forecast.predictedValues.length;
    const stdDev = Math.sqrt(
      forecast.predictedValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / forecast.predictedValues.length
    );
    return mean + 1.5 * stdDev; // Above mean + 1.5σ
  }

  private generateResourcePredictions(forecast: ForecastResult): CapacityPrediction[] {
    // Simplified resource predictions based on incident forecast
    const peakIncidents = Math.max(...forecast.predictedValues);
    const currentIncidents = forecast.predictedValues[0];
    const growthFactor = peakIncidents / (currentIncidents || 1);

    return [
      {
        resourceType: 'analysts',
        currentUtilization: 0.6,
        predictedUtilization: forecast.predictedValues.map(v => 0.6 * (v / currentIncidents)),
        recommendations: growthFactor > 1.5 ? [
          'Consider temporary analyst augmentation during peak periods',
          'Implement automated triage to handle increased volume'
        ] : []
      },
      {
        resourceType: 'storage',
        currentUtilization: 0.4,
        predictedUtilization: forecast.predictedValues.map(() => 0.4 + (growthFactor - 1) * 0.1),
        recommendations: []
      }
    ];
  }

  private aggregateByDay(items: Array<{ timestamp: Date; count: number }>): TimeSeriesPoint[] {
    const dailyMap = new Map<string, { total: number; date: Date }>();

    for (const item of items) {
      const dateKey = item.timestamp.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey);
      
      if (existing) {
        existing.total += item.count;
      } else {
        dailyMap.set(dateKey, { total: item.count, date: new Date(dateKey) });
      }
    }

    return Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, data]) => ({
        timestamp: data.date,
        value: data.total
      }));
  }

  private detectSeasonality(data: TimeSeriesPoint[]): ForecastResult['modelInfo']['seasonality'] {
    const period = this.detectSeasonalityPeriod(data);
    
    if (!period) {
      return { detected: false };
    }

    const values = data.map(d => d.value);
    const { seasonal } = this.decomposeSeasonal(values, period);

    return {
      detected: true,
      period,
      strength: this.calculateSeasonalStrength(seasonal)
    };
  }

  private getZScore(confidence: number): number {
    // Approximate z-scores for common confidence levels
    const zScores: Record<number, number> = {
      0.80: 1.28,
      0.90: 1.645,
      0.95: 1.96,
      0.98: 2.33,
      0.99: 2.58
    };

    // Interpolate for other values
    const keys = Object.keys(zScores).map(Number).sort((a, b) => a - b);
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (confidence <= keys[i + 1]) {
        const t = (confidence - keys[i]) / (keys[i + 1] - keys[i]);
        return zScores[keys[i]]! + t * (zScores[keys[i + 1]]! - zScores[keys[i]]!);
      }
    }

    return 1.96; // Default to 95%
  }

  private generateFutureTimestamps(lastDate: Date, days: number): Date[] {
    const timestamps: Date[] = [];
    
    for (let i = 1; i <= days; i++) {
      const futureDate = new Date(lastDate);
      futureDate.setDate(futureDate.getDate() + i);
      timestamps.push(futureDate);
    }

    return timestamps;
  }

  private updateStats(processingTimeMs: number, accuracy: number): void {
    const n = this.stats.forecastsGenerated;
    this.stats.avgProcessingTimeMs = (
      (this.stats.avgProcessingTimeMs * (n - 1) + processingTimeMs) / n
    );
    this.stats.avgAccuracy = (
      (this.stats.avgAccuracy * (n - 1) + accuracy) / n
    );
  }

  // ============================================================
  // Public Utility Methods
  // ============================================================

  /**
   * Get current statistics
   */
  getStats(): PredictionStats {
    return { ...this.stats };
  }

  /**
   * Clear prediction cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check if engine is initialized
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Shutdown engine
   */
  shutdown(): void {
    this.cache.clear();
    this.initialized = false;
    console.log('[Prediction Engine] 🔴 Shutdown complete');
  }
}

// ============================================================
// Factory Function & Singleton
// ============================================================

/**
 * Create configured Prediction Engine instance
 */
export function createPredictionEngine(config?: Partial<PredictionConfig>): PredictionEngine {
  return new PredictionEngine(config);
}

let predictionEngineInstance: PredictionEngine | null = null;

/**
 * Get singleton Prediction Engine instance
 */
export function getPredictionEngine(config?: Partial<PredictionConfig>): PredictionEngine {
  if (!predictionEngineInstance) {
    predictionEngineInstance = createPredictionEngine(config);
  }
  return predictionEngineInstance;
}

export default PredictionEngine;
