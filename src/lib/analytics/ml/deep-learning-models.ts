/**
 * National SOC Platform - Advanced Deep Learning Models Engine
 * 
 * Neural network-inspired ML implementations for telecom security:
 * - Pattern recognition using simplified neural architectures
 * - Ensemble detection combining multiple algorithms
 * - AutoML-style model selection based on data characteristics
 * - Model performance tracking and A/B testing framework
 * - Feature engineering pipeline for telecom security data
 * - Model serialization and export interfaces
 * 
 * @version 1.0.0 (Phase 6 Enhancement)
 * @module analytics/ml/deep-learning-models
 */

// ============================================================
// TYPES & INTERFACES
// ============================================================

/** Input feature vector for ML models */
export interface FeatureVector {
  features: number[];
  labels?: string[];
  timestamp: Date;
  source: string;
  metadata?: Record<string, any>;
}

/** Processed feature with engineering applied */
export interface EngineeredFeature {
  name: string;
  value: number;
  type: 'raw' | 'normalized' | 'encoded' | 'derived' | 'polynomial' | 'interaction';
  importance?: number;
}

/** Feature engineering configuration */
export interface FeatureEngineeringConfig {
  enableNormalization: boolean;
  enablePolynomialFeatures: boolean;
  enableInteractionTerms: boolean;
  enableTemporalFeatures: boolean;
  enableFrequencyFeatures: boolean;
  maxPolynomialDegree: number;
  normalizationMethod: 'minmax' | 'zscore' | 'robust';
  selectedFeatures?: string[];
}

/** Neural network layer configuration */
export interface LayerConfig {
  type: 'dense' | 'convolutional' | 'recurrent' | 'attention' | 'dropout' | 'batchnorm';
  units?: number;
  activation?: 'relu' | 'sigmoid' | 'tanh' | 'softmax' | 'leaky_relu' | 'elu' | 'gelu';
  kernelInitializer?: 'glorot_uniform' | 'he_normal' | 'orthogonal';
  dropoutRate?: number;
  filters?: number;
  kernelSize?: number[];
  returnSequences?: boolean;
}

/** Simplified neural network architecture */
export interface NeuralNetworkConfig {
  name: string;
  layers: LayerConfig[];
  optimizer: 'adam' | 'sgd' | 'rmsprop' | 'adagrad';
  learningRate: number;
  lossFunction: 'mse' | 'cross_entropy' | 'hinge' | 'huber';
  batchSize: number;
  epochs: number;
  validationSplit: number;
  earlyStoppingPatience: number;
  l2Regularization: number;
}

/** Training sample for supervised learning */
export interface TrainingSample {
  input: number[];
  output: number[];
  weight?: number;
}

/** Model prediction result */
export interface PredictionResult {
  id: string;
  modelName: string;
  prediction: number[];
  probabilities?: number[];
  confidence: number;
  classLabel?: string;
  isAnomalous: boolean;
  anomalyScore: number;
  processingTimeMs: number;
  timestamp: Date;
  featuresUsed: string[];
  shapValues?: Map<string, number>; // Feature importance explanation
}

/** Ensemble model configuration */
export interface EnsembleConfig {
  name: string;
  models: ModelReference[];
  aggregationMethod: 'voting' | 'weighted_average' | 'stacking' | 'boosting';
  weights?: number[];
  threshold: number;
  metaLearner?: string; // For stacking
}

/** Reference to a model in the ensemble */
export interface ModelReference {
  id: string;
  name: string;
  type: ModelType;
  weight: number;
  enabled: boolean;
}

/** Types of ML models available */
export type ModelType = 
  | 'neural_network'
  | 'random_forest'
  | 'gradient_boosting'
  | 'isolation_forest'
  | 'autoencoder'
  | 'lstm'
  | 'transformer'
  | 'statistical'
  | 'ensemble';

/** Model status and metadata */
export interface ModelMetadata {
  id: string;
  name: string;
  type: ModelType;
  version: string;
  status: 'training' | 'active' | 'inactive' | 'deprecated' | 'error';
  
  // Performance metrics
  performance: ModelPerformance;
  
  // Training info
  trainingInfo: TrainingInfo;
  
  // Configuration
  config: NeuralNetworkConfig | EnsembleConfig | StatisticalModelConfig;
  
  // Metadata
  createdAt: Date;
  lastUpdated: Date;
  lastTrainedAt?: Date;
  description: string;
  tags: string[];
}

/** Model performance metrics */
export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  aucROC: number;
  aucPR: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  confusionMatrix?: number[][];
  calibrationError: number;
  
  // Time-based metrics
  inferenceTimeAvgMs: number;
  inferenceTimeP95Ms: number;
  throughputPerSecond: number;
}

/** Training information */
export interface TrainingInfo {
  totalEpochs: number;
  bestEpoch: number;
  finalLoss: number;
  bestLoss: number;
  trainingSamples: number;
  validationSamples: number;
  convergenceEpoch: number;
  earlyStopped: boolean;
  trainingHistory: TrainingHistoryPoint[];
}

/** Single point in training history */
export interface TrainingHistoryPoint {
  epoch: number;
  trainLoss: number;
  valLoss: number;
  trainAccuracy?: number;
  valAccuracy?: number;
  learningRate: number;
  timestamp: Date;
}

/** Statistical model configuration (for non-neural models) */
export interface StatisticalModelConfig {
  algorithm: 'isolation_forest' | 'local_outlier_factor' | 'one_class_svm' | 'hbos' | 'ecod';
  contamination: number; // Expected anomaly ratio
  nEstimators: number;
  maxSamples: number;
  maxFeatures: number;
  bootstrap: boolean;
  nJobs: number;
}

/** A/B test configuration */
export interface ABTestConfig {
  id: string;
  name: string;
  controlModelId: string;
  treatmentModelId: string;
  trafficSplit: number; // 0-1, percentage to treatment
  startDate: Date;
  endDate?: Date;
  minSampleSize: number;
  significanceLevel: number;
  primaryMetric: keyof ModelPerformance;
  status: 'running' | 'completed' | 'paused' | 'setup';
}

/** A/B test results */
export interface ABTestResult {
  testId: string;
  controlMetrics: ModelPerformance;
  treatmentMetrics: ModelPerformance;
  lift: number;
  confidence: number;
  isSignificant: boolean;
  pValue: number;
  recommendedWinner: 'control' | 'treatment' | 'inconclusive';
  sampleSize: { control: number; treatment: number };
  completedAt: Date;
}

/** AutoML result with recommended model */
export interface AutoMLResult {
  recommendedModel: ModelType;
  recommendedConfig: NeuralNetworkConfig | StatisticalModelConfig;
  alternatives: Array<{
    modelType: ModelType;
    estimatedPerformance: Partial<ModelPerformance>;
    trainingTimeEstimate: number;
    reason: string;
  }>;
  dataCharacteristics: DataCharacteristics;
  reasoning: string;
}

/** Characteristics of input data for AutoML decisions */
export interface DataCharacteristics {
  sampleCount: number;
  featureCount: number;
  classDistribution: Record<string, number>;
  missingValueRatio: number;
  outlierRatio: number;
  correlationMean: number;
  skewness: number;
  kurtosis: number;
  dimensionality: 'low' | 'medium' | 'high';
  linearity: 'linear' | 'nonlinear' | 'unknown';
  complexity: 'simple' | 'moderate' | 'complex';
}

/** Serialized model for export/import */
export interface SerializedModel {
  formatVersion: string;
  modelId: string;
  modelName: string;
  modelType: ModelType;
  serializedAt: Date;
  checksum: string;
  
  // Architecture
  architecture: any;
  
  // Weights/parameters (base64 encoded or JSON)
  weights: string;
  config: NeuralNetworkConfig | EnsembleConfig | StatisticalModelConfig;
  
  // Metadata
  metadata: {
    trainingDataHash: string;
    featureNames: string[];
    normalizerParams: NormalizerState;
    performance: ModelPerformance;
    version: string;
    tags: string[];
  };
}

/** State of a normalizer for serialization */
export interface NormalizerState {
  method: string;
  params: {
    min?: number[];
    max?: number[];
    mean?: number[];
    std?: number[];
    median?: number[];
    iqr?: number[];
  };
}

// ============================================================
// DEFAULT CONFIGURATIONS FOR DJEZZY SOC
// ============================================================

/** Default neural network configuration for threat detection */
export const DEFAULT_THREAT_NN_CONFIG: NeuralNetworkConfig = {
  name: 'djezzy-threat-detector-v1',
  layers: [
    { type: 'dense', units: 128, activation: 'relu', kernelInitializer: 'he_normal' },
    { type: 'batchnorm' },
    { type: 'dropout', dropoutRate: 0.3 },
    { type: 'dense', units: 64, activation: 'relu', kernelInitializer: 'he_normal' },
    { type: 'batchnorm' },
    { type: 'dropout', dropoutRate: 0.3 },
    { type: 'dense', units: 32, activation: 'relu' },
    { type: 'dense', units: 1, activation: 'sigmoid' },
  ],
  optimizer: 'adam',
  learningRate: 0.001,
  lossFunction: 'cross_entropy',
  batchSize: 64,
  epochs: 100,
  validationSplit: 0.2,
  earlyStoppingPatience: 10,
  l2Regularization: 0.001,
};

/** Default ensemble configuration */
export const DEFAULT_ENSEMBLE_CONFIG: EnsembleConfig = {
  name: 'djezzy-ensemble-v1',
  models: [
    { id: 'nn-001', name: 'Neural Network', type: 'neural_network', weight: 0.35, enabled: true },
    { id: 'rf-001', name: 'Random Forest', type: 'random_forest', weight: 0.25, enabled: true },
    { id: 'if-001', name: 'Isolation Forest', type: 'isolation_forest', weight: 0.20, enabled: true },
    { id: 'gb-001', name: 'Gradient Boosting', type: 'gradient_boosting', weight: 0.20, enabled: true },
  ],
  aggregationMethod: 'weighted_average',
  weights: [0.35, 0.25, 0.20, 0.20],
  threshold: 0.5,
};

/** Default feature engineering configuration */
export const DEFAULT_FEATURE_CONFIG: FeatureEngineeringConfig = {
  enableNormalization: true,
  enablePolynomialFeatures: false,
  enableInteractionTerms: true,
  enableTemporalFeatures: true,
  enableFrequencyFeatures: false,
  maxPolynomialDegree: 2,
  normalizationMethod: 'robust',
};

/** Default statistical model config */
export const DEFAULT_STATISTICAL_CONFIG: StatisticalModelConfig = {
  algorithm: 'isolation_forest',
  contamination: 0.1,
  nEstimators: 100,
  maxSamples: 256,
  maxFeatures: 1.0,
  bootstrap: false,
  nJobs: 4,
};

// ============================================================
// FEATURE ENGINEERING PIPELINE
// ============================================================

/**
 * Feature Engineering Pipeline for Telecom Security Data
 * Transforms raw network/security events into ML-ready features
 */
export class FeatureEngineeringPipeline {
  private config: FeatureEngineeringConfig;
  private fitted: boolean = false;
  private normalizerParams: NormalizerState;
  private featureNames: string[] = [];
  private polynomialDegree: number = 2;

  constructor(config: FeatureEngineeringConfig = DEFAULT_FEATURE_CONFIG) {
    this.config = config;
    this.normalizerParams = {
      method: config.normalizationMethod,
      params: {},
    };
  }

  /**
   * Fit the pipeline on training data (learn parameters)
   */
  fit(data: FeatureVector[]): this {
    if (data.length === 0) {
      throw new Error('Cannot fit pipeline on empty data');
    }

    // Extract all feature values
    const allFeatures = data.map(d => d.features);
    const numFeatures = allFeatures[0].length;

    // Store feature names if available
    if (data[0]?.labels) {
      this.featureNames = data[0].labels;
    } else {
      this.featureNames = Array.from({ length: numFeatures }, (_, i) => `feature_${i}`);
    }

    // Calculate normalization parameters
    if (this.config.enableNormalization) {
      this.calculateNormalizerParams(allFeatures);
    }

    this.fitted = true;
    return this;
  }

  /**
   * Transform data using fitted parameters
   */
  transform(data: FeatureVector[]): EngineeredFeature[][] {
    if (!this.fitted) {
      throw new Error('Pipeline not fitted. Call fit() first.');
    }

    return data.map(sample => {
      let features = [...sample.features];

      // Apply normalization
      if (this.config.enableNormalization) {
        features = this.normalize(features);
      }

      // Generate engineered features
      const engineered: EngineeredFeature[] = [];

      // Add normalized base features
      features.forEach((value, idx) => {
        engineered.push({
          name: this.featureNames[idx] || `feature_${idx}`,
          value,
          type: this.config.enableNormalization ? 'normalized' : 'raw',
        });
      });

      // Add temporal features
      if (this.config.enableTemporalFeatures) {
        const temporalFeatures = this.generateTemporalFeatures(sample.timestamp);
        engineered.push(...temporalFeatures);
      }

      // Add polynomial features
      if (this.config.enablePolynomialFeatures && features.length > 0) {
        const polyFeatures = this.generatePolynomialFeatures(features.slice(0, 5)); // Limit to first 5
        engineered.push(...polyFeatures);
      }

      // Add interaction terms
      if (this.config.enableInteractionTerms && features.length >= 2) {
        const interactionFeatures = this.generateInteractionFeatures(features.slice(0, 4));
        engineered.push(...interactionFeatures);
      }

      return engineered;
    });
  }

  /**
   * Fit and transform in one step
   */
  fitTransform(data: FeatureVector[]): EngineeredFeature[][] {
    this.fit(data);
    return this.transform(data);
  }

  /**
   * Get feature names after transformation
   */
  getFeatureNames(): string[] {
    const names = [...this.featureNames];
    
    if (this.config.enableTemporalFeatures) {
      names.push('hour_sin', 'hour_cos', 'day_of_week', 'is_weekend', 'is_business_hours');
    }
    
    if (this.config.enablePolynomialFeatures) {
      for (let i = 0; i < Math.min(5, this.featureNames.length); i++) {
        names.push(`${this.featureNames[i]}_squared`);
      }
    }
    
    return names;
  }

  /**
   * Calculate normalization parameters from data
   */
  private calculateNormalizerParams(data: number[][]): void {
    const numFeatures = data[0].length;
    
    switch (this.config.normalizationMethod) {
      case 'minmax':
        const mins = Array(numFeatures).fill(Infinity);
        const maxs = Array(numFeatures).fill(-Infinity);
        
        data.forEach(row => {
          row.forEach((val, idx) => {
            mins[idx] = Math.min(mins[idx], val);
            maxs[idx] = Math.max(maxs[idx], val);
          });
        });
        
        this.normalizerParams.params.min = mins;
        this.normalizerParams.params.max = maxs;
        break;

      case 'zscore':
        const sums = Array(numFeatures).fill(0);
        const sumSquares = Array(numFeatures).fill(0);
        
        data.forEach(row => {
          row.forEach((val, idx) => {
            sums[idx] += val;
            sumSquares[idx] += val * val;
          });
        });
        
        const means = sums.map(s => s / data.length);
        const stds = sumSquares.map((ss, idx) => {
          const variance = ss / data.length - means[idx] * means[idx];
          return Math.sqrt(Math.max(0, variance));
        });
        
        this.normalizerParams.params.mean = means;
        this.normalizerParams.params.std = stds.map(s => s === 0 ? 1 : s); // Avoid division by zero
        break;

      case 'robust':
        const sortedByFeature = Array.from({ length: numFeatures }, () => [] as number[]);
        data.forEach(row => {
          row.forEach((val, idx) => sortedByFeature[idx].push(val));
        });
        
        const medians = sortedByFeature.map(col => {
          const sorted = [...col].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
        });
        
        const iqrs = sortedByFeature.map(col => {
          const sorted = [...col].sort((a, b) => a - b);
          const q1Idx = Math.floor(sorted.length * 0.25);
          const q3Idx = Math.floor(sorted.length * 0.75);
          return sorted[q3Idx] - sorted[q1Idx];
        });
        
        this.normalizerParams.params.median = medians;
        this.normalizerParams.params.iqr = iqrs.map(iqr => iqr === 0 ? 1 : iqr);
        break;
    }
  }

  /**
   * Normalize features using fitted parameters
   */
  private normalize(features: number[]): number[] {
    const params = this.normalizerParams.params;
    
    switch (this.config.normalizationMethod) {
      case 'minmax':
        return features.map((val, idx) => {
          const min = params.min?.[idx] ?? 0;
          const max = params.max?.[idx] ?? 1;
          const range = max - min;
          return range === 0 ? 0 : (val - min) / range;
        });

      case 'zscore':
        return features.map((val, idx) => {
          const mean = params.mean?.[idx] ?? 0;
          const std = params.std?.[idx] ?? 1;
          return (val - mean) / std;
        });

      case 'robust':
        return features.map((val, idx) => {
          const median = params.median?.[idx] ?? 0;
          const iqr = params.iqr?.[idx] ?? 1;
          return (val - median) / iqr;
        });

      default:
        return features;
    }
  }

  /**
   * Generate temporal features from timestamp
   */
  private generateTemporalFeatures(timestamp: Date): EngineeredFeature[] {
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    
    return [
      {
        name: 'hour_sin',
        value: Math.sin((2 * Math.PI * hour) / 24),
        type: 'derived',
      },
      {
        name: 'hour_cos',
        value: Math.cos((2 * Math.PI * hour) / 24),
        type: 'derived',
      },
      {
        name: 'day_of_week',
        value: dayOfWeek / 6, // Normalize to 0-1
        type: 'derived',
      },
      {
        name: 'is_weekend',
        value: dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0,
        type: 'derived',
      },
      {
        name: 'is_business_hours',
        value: hour >= 8 && hour <= 18 ? 1 : 0,
        type: 'derived',
      },
    ];
  }

  /**
   * Generate polynomial features
   */
  private generatePolynomialFeatures(features: number[]): EngineeredFeature[] {
    const polyFeatures: EngineeredFeature[] = [];
    const degree = this.config.maxPolynomialDegree;
    
    features.forEach((val, idx) => {
      for (let d = 2; d <= degree; d++) {
        polyFeatures.push({
          name: `${this.featureNames[idx] || `feature_${idx}`}_pow${d}`,
          value: Math.pow(val, d),
          type: 'polynomial',
        });
      }
    });
    
    return polyFeatures;
  }

  /**
   * Generate interaction terms between features
   */
  private generateInteractionFeatures(features: number[]): EngineeredFeature[] {
    const interactions: EngineeredFeature[] = [];
    
    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        interactions.push({
          name: `${this.featureNames[i] || `f${i}`}_x_${this.featureNames[j] || `f${j}`}`,
          value: features[i] * features[j],
          type: 'interaction',
        });
      }
    }
    
    return interactions;
  }

  /**
   * Get current normalizer state (for serialization)
   */
  getNormalizerState(): NormalizerState {
    return { ...this.normalizerParams };
  }

  /**
   * Set normalizer state (for deserialization)
   */
  setNormalizerState(state: NormalizerState): void {
    this.normalizerParams = state;
    this.fitted = true;
  }
}

// ============================================================
// SIMPLIFIED NEURAL NETWORK IMPLEMENTATION
// ============================================================

/**
 * Simplified Neural Network for pattern recognition
 * Implements forward pass and basic backpropagation-inspired training
 */
export class SimplifiedNeuralNetwork {
  private config: NeuralNetworkConfig;
  private weights: number[][][] = [];
  private biases: number[][] = [];
  private activations: number[][] = [];
  private preActivations: number[][] = [];
  private isInitialized: boolean = false;

  constructor(config: NeuralNetworkConfig = DEFAULT_THREAT_NN_CONFIG) {
    this.config = config;
  }

  /**
   * Initialize network weights and biases
   */
  initialize(inputSize: number): void {
    this.weights = [];
    this.biases = [];
    
    let prevSize = inputSize;
    
    for (const layer of this.config.layers) {
      if (layer.type === 'dense' && layer.units) {
        // Xavier/Glorot initialization
        const scale = Math.sqrt(2 / (prevSize + layer.units));
        const layerWeights: number[][] = [];
        const layerBiases: number[] = [];
        
        for (let j = 0; j < layer.units; j++) {
          const neuronWeights: number[] = [];
          for (let i = 0; i < prevSize; i++) {
            neuronWeights.push((Math.random() * 2 - 1) * scale);
          }
          layerWeights.push(neuronWeights);
          layerBiases.push(0);
        }
        
        this.weights.push(layerWeights);
        this.biases.push(layerBiases);
        prevSize = layer.units;
      }
    }
    
    this.isInitialized = true;
  }

  /**
   * Forward pass through the network
   */
  forward(input: number[]): number[] {
    if (!this.isInitialized) {
      this.initialize(input.length);
    }

    this.activations = [input];
    this.preActivations = [];
    let currentActivation = [...input];

    let layerIdx = 0;
    for (const layer of this.config.layers) {
      if (layer.type === 'dense' && layer.units) {
        const weights = this.weights[layerIdx];
        const biases = this.biases[layerIdx];
        
        // Matrix multiplication + bias
        const preActivation: number[] = [];
        for (let j = 0; j < layer.units; j++) {
          let sum = biases[j];
          for (let i = 0; i < currentActivation.length; i++) {
            sum += currentActivation[i] * weights[j][i];
          }
          preActivation.push(sum);
        }
        
        this.preActivations.push(preActivation);
        
        // Apply activation function
        currentActivation = preActivation.map(v => 
          this.applyActivation(v, layer.activation || 'relu')
        );
        
        this.activations.push(currentActivation);
        layerIdx++;
      } else if (layer.type === 'dropout' && layer.dropoutRate) {
        // Apply dropout (inverted during inference)
        currentActivation = currentActivation.map(v => v * (1 - layer.dropoutRate!));
        this.activations[this.activations.length - 1] = currentActivation;
      } else if (layer.type === 'batchnorm') {
        // Simple batch norm approximation
        const mean = currentActivation.reduce((a, b) => a + b, 0) / currentActivation.length;
        const variance = currentActivation.reduce((a, b) => a + (b - mean) ** 2, 0) / currentActivation.length;
        const std = Math.sqrt(variance + 1e-8);
        currentActivation = currentActivation.map(v => (v - mean) / std);
        this.activations[this.activations.length - 1] = currentActivation;
      }
    }

    return currentActivation;
  }

  /**
   * Apply activation function
   */
  private applyActivation(x: number, activation: string): number {
    switch (activation) {
      case 'relu':
        return Math.max(0, x);
      case 'sigmoid':
        return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
      case 'tanh':
        return Math.tanh(x);
      case 'leaky_relu':
        return x > 0 ? x : 0.01 * x;
      case 'elu':
        return x > 0 ? x : (Math.exp(x) - 1);
      case 'gelu':
        return x * 0.5 * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * Math.pow(x, 3))));
      case 'softmax':
        // Softmax should be applied to entire array, handled separately
        return x;
      default:
        return x;
    }
  }

  /**
   * Apply softmax to output layer
   */
  softmax(output: number[]): number[] {
    const maxVal = Math.max(...output);
    const exps = output.map(x => Math.exp(x - maxVal));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sumExps);
  }

  /**
   * Train the network using simplified gradient descent
   */
  train(
    trainingData: TrainingSample[],
    validationData?: TrainingSample[]
  ): TrainingInfo {
    if (!this.isInitialized && trainingData.length > 0) {
      this.initialize(trainingData[0].input.length);
    }

    const history: TrainingHistoryPoint[] = [];
    let bestLoss = Infinity;
    let bestEpoch = 0;
    let patienceCounter = 0;
    const learningRate = this.config.learningRate;

    for (let epoch = 0; epoch < this.config.epochs; epoch++) {
      // Shuffle training data
      const shuffled = [...trainingData].sort(() => Math.random() - 0.5);
      
      let totalLoss = 0;
      let correctPredictions = 0;

      // Mini-batch training
      for (let i = 0; i < shuffled.length; i += this.config.batchSize) {
        const batch = shuffled.slice(i, i + this.config.batchSize);
        
        for (const sample of batch) {
          const output = this.forward(sample.input);
          
          // Calculate loss
          const loss = this.calculateLoss(output, sample.output);
          totalLoss += loss;
          
          // Check accuracy
          const predictedClass = output.indexOf(Math.max(...output));
          const actualClass = sample.output.indexOf(Math.max(...sample.output));
          if (predictedClass === actualClass) correctPredictions++;

          // Backpropagation (simplified)
          this.backward(sample.input, sample.output, learningRate);
        }
      }

      const avgLoss = totalLoss / shuffled.length;
      const trainAccuracy = correctPredictions / shuffled.length;

      // Validation
      let valLoss = 0;
      let valAccuracy = 0;
      if (validationData && validationData.length > 0) {
        let valTotalLoss = 0;
        let valCorrect = 0;
        for (const sample of validationData) {
          const output = this.forward(sample.input);
          valTotalLoss += this.calculateLoss(output, sample.output);
          const predictedClass = output.indexOf(Math.max(...output));
          const actualClass = sample.output.indexOf(Math.max(...sample.output));
          if (predictedClass === actualClass) valCorrect++;
        }
        valLoss = valTotalLoss / validationData.length;
        valAccuracy = valCorrect / validationData.length;
      }

      history.push({
        epoch,
        trainLoss: avgLoss,
        valLoss,
        trainAccuracy: trainAccuracy,
        valAccuracy: valAccuracy,
        learningRate,
        timestamp: new Date(),
      });

      // Early stopping check
      if (valLoss < bestLoss) {
        bestLoss = valLoss || avgLoss;
        bestEpoch = epoch;
        patienceCounter = 0;
      } else {
        patienceCounter++;
        if (patienceCounter >= this.config.earlyStoppingPatience) {
          break;
        }
      }
    }

    return {
      totalEpochs: history.length,
      bestEpoch,
      finalLoss: history[history.length - 1]?.trainLoss ?? 0,
      bestLoss,
      trainingSamples: trainingData.length,
      validationSamples: validationData?.length ?? 0,
      convergenceEpoch: bestEpoch,
      earlyStopped: patienceCounter >= this.config.earlyStoppingPatience,
      trainingHistory: history,
    };
  }

  /**
   * Calculate loss based on configured loss function
   */
  private calculateLoss(predicted: number[], target: number[]): number {
    switch (this.config.lossFunction) {
      case 'mse':
        return predicted.reduce((sum, p, i) => sum + (p - (target[i] ?? 0)) ** 2, 0) / predicted.length;
      
      case 'cross_entropy':
        const eps = 1e-7;
        return -predicted.reduce((sum, p, i) => {
          const t = target[i] ?? 0;
          return sum + (t * Math.log(p + eps) + (1 - t) * Math.log(1 - p + eps));
        }, 0) / predicted.length;
      
      case 'hinge':
        return predicted.reduce((sum, p, i) => {
          return sum + Math.max(0, 1 - (target[i] ?? 1) * p);
        }, 0) / predicted.length;
      
      case 'huber':
        const delta = 1.0;
        return predicted.reduce((sum, p, i) => {
          const diff = Math.abs(p - (target[i] ?? 0));
          return sum + (diff <= delta ? 0.5 * diff * diff : delta * (diff - 0.5 * delta));
        }, 0) / predicted.length;
      
      default:
        return predicted.reduce((sum, p, i) => sum + (p - (target[i] ?? 0)) ** 2, 0) / predicted.length;
    }
  }

  /**
   * Simplified backpropagation
   */
  private backward(
    input: number[],
    target: number[],
    learningRate: number
  ): void {
    // This is a highly simplified backpropagation implementation
    // In production, use TensorFlow.js or ONNX runtime
    
    const output = this.activations[this.activations.length - 1];
    const errors: number[][] = [];
    
    // Output layer error
    const outputError = output.map((o, i) => o - (target[i] ?? 0));
    errors.unshift(outputError);

    // Propagate error backward
    for (let l = this.weights.length - 2; l >= 0; l--) {
      const layerErrors: number[] = [];
      const weights = this.weights[l + 1];
      
      for (let i = 0; i < this.activations[l + 1].length; i++) {
        let error = 0;
        for (let j = 0; j < errors[0].length; j++) {
          error += errors[0][j] * weights[j][i];
        }
        // Multiply by derivative of activation
        const activation = this.activations[l + 1][i];
        const derivative = this.activationDerivative(activation, this.getLayerActivation(l));
        layerErrors.push(error * derivative);
      }
      errors.unshift(layerErrors);
    }

    // Update weights and biases
    let layerIdx = 0;
    for (let l = 0; l < this.weights.length; l++) {
      const activation = this.activations[l];
      const layerErrors = errors[l];
      
      for (let j = 0; j < this.weights[l].length; j++) {
        for (let i = 0; i < this.weights[l][j].length; i++) {
          // Gradient descent update with L2 regularization
          const gradient = layerErrors[j] * activation[i];
          this.weights[l][j][i] -= learningRate * (gradient + this.config.l2Regularization * this.weights[l][j][i]);
        }
        this.biases[l][j] -= learningRate * layerErrors[j];
      }
      layerIdx++;
    }
  }

  /**
   * Get activation function for a layer index
   */
  private getLayerActivation(layerIndex: number): string {
    let denseLayerCount = 0;
    for (let i = 0; i <= layerIndex; i++) {
      if (this.config.layers[i]?.type === 'dense') denseLayerCount++;
    }
    const layer = this.config.layers.find(l => l.type === 'dense');
    return layer?.activation || 'relu';
  }

  /**
   * Derivative of activation function
   */
  private activationDerivative(x: number, activation: string): number {
    switch (activation) {
      case 'relu': return x > 0 ? 1 : 0;
      case 'sigmoid': {
        const s = 1 / (1 + Math.exp(-x));
        return s * (1 - s);
      }
      case 'tanh': return 1 - x * x;
      case 'leaky_relu': return x > 0 ? 1 : 0.01;
      default: return 1;
    }
  }

  /**
   * Predict using the trained network
   */
  predict(input: number[]): PredictionResult {
    const startTime = performance.now();
    const output = this.forward(input);
    const endTime = performance.now();

    // Apply softmax if needed
    const probabilities = this.softmax(output);
    const maxProb = Math.max(...probabilities);
    const predictedClass = probabilities.indexOf(maxProb);

    return {
      id: `pred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      modelName: this.config.name,
      prediction: output,
      probabilities,
      confidence: maxProb,
      classLabel: `class_${predictedClass}`,
      isAnomalous: maxProb > this.config.threshold ?? 0.5,
      anomalyScore: maxProb * 100,
      processingTimeMs: endTime - startTime,
      timestamp: new Date(),
      featuresUsed: this.featureNames(),
      shapValues: this.calculateSHAPValues(input),
    };
  }

  /**
   * Calculate SHAP-like values for explainability
   */
  private calculateSHAPValues(input: number[]): Map<string, number> {
    const shapValues = new Map<string, number>();
    const baselineOutput = this.forward(new Array(input.length).fill(0));
    const actualOutput = this.forward(input);
    
    input.forEach((val, idx) => {
      const perturbedInput = [...input];
      perturbedInput[idx] = 0;
      const perturbedOutput = this.forward(perturbedInput);
      const contribution = (actualOutput[0] - perturbedOutput[0]) / 2;
      shapValues.set(this.featureNames()[idx] || `feature_${idx}`, contribution);
    });

    return shapValues;
  }

  /**
   * Get feature names
   */
  private featureNames(): string[] {
    // Return generic feature names if not set
    if (this.weights.length > 0) {
      return Array.from({ length: this.weights[0][0].length }, (_, i) => `feature_${i}`);
    }
    return [];
  }

  /**
   * Serialize model weights
   */
  serialize(): string {
    return JSON.stringify({
      config: this.config,
      weights: this.weights,
      biases: this.biases,
      isInitialized: this.isInitialized,
    });
  }

  /**
   * Deserialize model weights
   */
  deserialize(serialized: string): void {
    try {
      const data = JSON.parse(serialized);
      this.config = data.config;
      this.weights = data.weights;
      this.biases = data.biases;
      this.isInitialized = data.isInitialized;
    } catch (e) {
      throw new Error(`Failed to deserialize model: ${e}`);
    }
  }
}

// ============================================================
// ENSEMBLE DETECTION SYSTEM
// ============================================================

/**
 * Ensemble Detection System
 * Combines multiple models for robust anomaly detection
 */
export class EnsembleDetector {
  private config: EnsembleConfig;
  private models: Map<string, SimplifiedNeuralNetwork> = new Map();
  private statisticalModels: Map<string, IsolationForestDetector> = new Map();
  private isTrained: boolean = false;

  constructor(config: EnsembleConfig = DEFAULT_ENSEMBLE_CONFIG) {
    this.config = config;
  }

  /**
   * Add a neural network model to the ensemble
   */
  addNeuralNetwork(id: string, model: SimplifiedNeuralNetwork): void {
    this.models.set(id, model);
  }

  /**
   * Add a statistical model to the ensemble
   */
  addStatisticalModel(id: string, model: IsolationForestDetector): void {
    this.statisticalModels.set(id, model);
  }

  /**
   * Train all models in the ensemble
   */
  async trainAll(trainingData: TrainingSample[], validationData?: TrainingSample[]): Promise<void> {
    const promises: Promise<void>[] = [];

    // Train neural networks
    for (const [id, model] of this.models) {
      promises.push(Promise.resolve().then(() => {
        model.train(trainingData, validationData);
      }));
    }

    // Train statistical models
    for (const [id, model] of this.statisticalModels) {
      promises.push(Promise.resolve().then(() => {
        model.fit(trainingData.map(s => s.input));
      }));
    }

    await Promise.all(promises);
    this.isTrained = true;
  }

  /**
   * Run ensemble prediction
   */
  predict(input: number[]): PredictionResult {
    if (!this.isTrained) {
      throw new Error('Ensemble not trained. Call trainAll() first.');
    }

    const startTime = performance.now();
    const predictions: Array<{ prediction: PredictionResult; weight: number }> = [];

    // Collect predictions from neural networks
    for (const modelRef of this.config.models.filter(m => m.enabled)) {
      let prediction: PredictionResult;

      if (modelRef.type === 'neural_network' || modelRef.type === 'autoencoder' || 
          modelRef.type === 'lstm' || modelRef.type === 'transformer') {
        const model = this.models.get(modelRef.id);
        if (model) {
          prediction = model.predict(input);
          predictions.push({ prediction, weight: modelRef.weight });
        }
      } else if (modelRef.type === 'isolation_forest') {
        const model = this.statisticalModels.get(modelRef.id);
        if (model) {
          prediction = model.predict(input);
          predictions.push({ prediction, weight: modelRef.weight });
        }
      }
    }

    // Aggregate predictions
    const aggregated = this.aggregatePredictions(predictions);
    const endTime = performance.now();

    return {
      ...aggregated,
      id: `ensemble-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      modelName: this.config.name,
      processingTimeMs: endTime - startTime,
      timestamp: new Date(),
      featuresUsed: Array.from(new Set(predictions.flatMap(p => prediction.featuresUsed))),
    };
  }

  /**
   * Aggregate predictions from multiple models
   */
  private aggregatePredictions(
    predictions: Array<{ prediction: PredictionResult; weight: number }>
  ): Omit<PredictionResult, 'id' | 'modelName' | 'processingTimeMs' | 'timestamp' | 'featuresUsed'> {
    if (predictions.length === 0) {
      return {
        prediction: [],
        confidence: 0,
        isAnomalous: false,
        anomalyScore: 0,
        shapValues: new Map(),
      };
    }

    switch (this.config.aggregationMethod) {
      case 'weighted_average': {
        const totalWeight = predictions.reduce((sum, p) => sum + p.weight, 0);
        const weightedScore = predictions.reduce(
          (sum, p) => sum + p.prediction.anomalyScore * p.weight,
          0
        ) / totalWeight;
        const weightedConfidence = predictions.reduce(
          (sum, p) => sum + p.prediction.confidence * p.weight,
          0
        ) / totalWeight;

        return {
          prediction: [weightedScore / 100],
          confidence: weightedConfidence,
          isAnomalous: weightedScore > this.config.threshold * 100,
          anomalyScore: weightedScore,
          shapValues: this.mergeSHAPValues(predictions),
        };
      }

      case 'voting': {
        const anomalousVotes = predictions.filter(p => p.prediction.isAnomalous).reduce(
          (sum, p) => sum + p.weight, 0
        );
        const totalWeight = predictions.reduce((sum, p) => sum + p.weight, 0);
        const voteRatio = anomalousVotes / totalWeight;

        return {
          prediction: [voteRatio],
          confidence: voteRatio,
          isAnomalous: voteRatio > this.config.threshold,
          anomalyScore: voteRatio * 100,
          shapValues: this.mergeSHAPValues(predictions),
        };
      }

      default:
        // Default to weighted average
        const avgScore = predictions.reduce((sum, p) => sum + p.prediction.anomalyScore, 0) / predictions.length;
        return {
          prediction: [avgScore / 100],
          confidence: predictions.reduce((sum, p) => sum + p.prediction.confidence, 0) / predictions.length,
          isAnomalous: avgScore > this.config.threshold * 100,
          anomalyScore: avgScore,
          shapValues: this.mergeSHAPValues(predictions),
        };
    }
  }

  /**
   * Merge SHAP values from multiple models
   */
  private mergeSHAPValues(
    predictions: Array<{ prediction: PredictionResult; weight: number }>
  ): Map<string, number> {
    const merged = new Map<string, number>();
    const totalWeight = predictions.reduce((sum, p) => sum + p.weight, 0);

    for (const { prediction, weight } of predictions) {
      if (prediction.shapValues) {
        for (const [key, value] of prediction.shapValues) {
          const existing = merged.get(key) || 0;
          merged.set(key, existing + value * weight);
        }
      }
    }

    // Normalize by total weight
    for (const [key, value] of merged) {
      merged.set(key, value / totalWeight);
    }

    return merged;
  }

  /**
   * Get ensemble status
   */
  getStatus(): {
    isTrained: boolean;
    modelCount: number;
    activeModels: string[];
    config: EnsembleConfig;
  } {
    return {
      isTrained: this.isTrained,
      modelCount: this.models.size + this.statisticalModels.size,
      activeModels: this.config.models.filter(m => m.enabled).map(m => m.id),
      config: this.config,
    };
  }
}

// ============================================================
// ISOLATION FOREST IMPLEMENTATION
// ============================================================

/**
 * Simplified Isolation Forest for anomaly detection
 * Based on Liu et al. (2008) - Isolation Forest
 */
export class IsolationForestDetector {
  private config: StatisticalModelConfig;
  private trees: IsolationTree[] = [];
  private fitted: boolean = false;

  constructor(config: StatisticalModelConfig = DEFAULT_STATISTICAL_CONFIG) {
    this.config = config;
  }

  /**
   * Fit the isolation forest on training data
   */
  fit(data: number[][]): void {
    this.trees = [];
    const subsampleSize = Math.min(this.config.maxSamples, data.length);

    for (let i = 0; i < this.config.nEstimators; i++) {
      // Bootstrap sample
      const indices = this.bootstrapSample(data.length, subsampleSize);
      const sample = indices.map(idx => data[idx]);
      
      const tree = new IsolationTree(this.config.maxFeatures);
      tree.build(sample);
      this.trees.push(tree);
    }

    this.fitted = true;
  }

  /**
   * Predict anomaly scores for input
   */
  predict(input: number[]): PredictionResult {
    if (!this.fitted) {
      throw new Error('Model not fitted. Call fit() first.');
    }

    const startTime = performance.now();
    
    // Calculate path lengths
    const pathLengths = this.trees.map(tree => tree.pathLength(input));
    const avgPathLength = pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length;
    
    // Expected path length (normalization constant)
    const c = this.expectedPathLength(this.config.maxSamples);
    
    // Anomaly score: closer to 1 = more anomalous
    const anomalyScore = Math.pow(2, -avgPathLength / c);
    
    const endTime = performance.now();

    return {
      id: `if-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      modelName: 'Isolation Forest',
      prediction: [anomalyScore],
      confidence: 1 - anomalyScore,
      isAnomalous: anomalyScore > this.config.contamination,
      anomalyScore: anomalyScore * 100,
      processingTimeMs: endTime - startTime,
      timestamp: new Date(),
      featuresUsed: input.map((_, i) => `feature_${i}`),
    };
  }

  /**
   * Score multiple samples
   */
  scoreSamples(data: number[][]): number[] {
    return data.map(sample => {
      const pathLengths = this.trees.map(tree => tree.pathLength(sample));
      const avgPathLength = pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length;
      const c = this.expectedPathLength(this.config.maxSamples);
      return Math.pow(2, -avgPathLength / c);
    });
  }

  /**
   * Generate bootstrap sample indices
   */
  private bootstrapSample(populationSize: number, sampleSize: number): number[] {
    const indices: number[] = [];
    for (let i = 0; i < sampleSize; i++) {
      indices.push(Math.floor(Math.random() * populationSize));
    }
    return indices;
  }

  /**
   * Calculate expected path length for normalization
   */
  private expectedPathLength(n: number): number {
    if (n <= 1) return 0;
    if (n === 2) return 1;
    
    const H = this.harmonicNumber(n - 1);
    return 2 * H - 2 * (n - 1) / n;
  }

  /**
   * Calculate harmonic number H(n)
   */
  private harmonicNumber(n: number): number {
    let sum = 0;
    for (let i = 1; i <= n; i++) {
      sum += 1 / i;
    }
    return sum;
  }
}

/**
 * Individual Isolation Tree
 */
class IsolationTree {
  private root: IsolationTreeNode | null = null;
  private maxFeatures: number;
  private heightLimit: number;

  constructor(maxFeatures: number = 1.0) {
    this.maxFeatures = maxFeatures;
    this.heightLimit = 0; // Will be set during build
  }

  /**
   * Build the isolation tree
   */
  build(data: number[][]): void {
    this.heightLimit = Math.ceil(Math.log2(data.length));
    this.root = this.buildRecursive(data, 0);
  }

  /**
   * Recursive tree building
   */
  private buildRecursive(data: number[][], height: number): IsolationTreeNode {
    // Termination conditions
    if (height >= this.heightLimit || data.length <= 1) {
      return { size: data.length, isLeaf: true, left: null, right: null };
    }

    // Random feature selection
    const numFeatures = Math.min(
      Math.ceil(this.maxFeatures * data[0].length),
      data[0].length
    );
    const selectedFeature = Math.floor(Math.random() * data[0].length);

    // Random split value
    const values = data.map(d => d[selectedFeature]);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const splitValue = minValue + Math.random() * (maxValue - minValue);

    // Split data
    const leftData = data.filter(d => d[selectedFeature] < splitValue);
    const rightData = data.filter(d => d[selectedFeature] >= splitValue);

    // Handle edge case where split doesn't divide data
    if (leftData.length === 0 || rightData.length === 0) {
      return { size: data.length, isLeaf: true, left: null, right: null };
    }

    return {
      feature: selectedFeature,
      splitValue,
      size: data.length,
      isLeaf: false,
      left: this.buildRecursive(leftData, height + 1),
      right: this.buildRecursive(rightData, height + 1),
    };
  }

  /**
   * Calculate path length for a sample
   */
  pathLength(sample: number[]): number {
    return this.pathLengthRecursive(sample, this.root, 0);
  }

  /**
   * Recursive path length calculation
   */
  private pathLengthRecursive(
    sample: number[],
    node: IsolationTreeNode | null,
    currentPath: number
  ): number {
    if (!node || node.isLeaf) {
      return currentPath + this.expectedSize(node?.size ?? 0);
    }

    if (sample[node.feature!] < node.splitValue!) {
      return this.pathLengthRecursive(sample, node.left, currentPath + 1);
    } else {
      return this.pathLengthRecursive(sample, node.right, currentPath + 1);
    }
  }

  /**
   * Expected size adjustment for leaf nodes
   */
  private expectedSize(size: number): number {
    if (size <= 1) return 0;
    return 2 * (Math.log(size - 1) + 0.5772156649) - 2 * (size - 1) / size;
  }
}

/** Isolation Tree Node */
interface IsolationTreeNode {
  feature?: number;
  splitValue?: number;
  size: number;
  isLeaf: boolean;
  left: IsolationTreeNode | null;
  right: IsolationTreeNode | null;
}

// ============================================================
// AUTOML ENGINE
// ============================================================

/**
 * AutoML-style model selection engine
 * Analyzes data characteristics and recommends optimal model
 */
export class AutoMLEngine {
  /**
   * Analyze data characteristics
   */
  analyzeData(data: FeatureVector[]): DataCharacteristics {
    if (data.length === 0) {
      throw new Error('Cannot analyze empty dataset');
    }

    const features = data.map(d => d.features);
    const numFeatures = features[0].length;
    const flatFeatures = features.flat();

    // Basic statistics
    const missingCount = flatFeatures.filter(f => f == null || isNaN(f)).length;
    const missingRatio = missingCount / flatFeatures.length;

    // Outlier detection using IQR
    const outlierCounts = this.detectOutliersPerFeature(features);
    const totalOutliers = outlierCounts.reduce((a, b) => a + b, 0);
    const outlierRatio = totalOutliers / flatFeatures.length;

    // Correlation analysis
    const correlations = this.calculateCorrelations(features);
    const avgCorrelation = correlations.reduce((a, b) => a + b, 0) / correlations.length;

    // Skewness and kurtosis
    const skewness = this.calculateSkewness(flatFeatures);
    const kurtosis = this.calculateKurtosis(flatFeatures);

    // Class distribution (assuming binary classification based on last feature or label)
    const classDist = this.estimateClassDistribution(data);

    return {
      sampleCount: data.length,
      featureCount: numFeatures,
      classDistribution: classDist,
      missingValueRatio: missingRatio,
      outlierRatio: outlierRatio,
      correlationMean: avgCorrelation,
      skewness,
      kurtosis,
      dimensionality: numFeatures < 10 ? 'low' : numFeatures < 50 ? 'medium' : 'high',
      linearity: avgCorrelation > 0.7 ? 'linear' : avgCorrelation < 0.3 ? 'nonlinear' : 'unknown',
      complexity: this.estimateComplexity(data),
    };
  }

  /**
   * Recommend model based on data analysis
   */
  recommendModel(data: FeatureVector[]): AutoMLResult {
    const characteristics = this.analyzeData(data);
    const alternatives: AutoMLResult['alternatives'] = [];

    // Score each model type
    const modelScores = this.scoreModels(characteristics);

    // Sort by score and get recommendations
    const sortedModels = Object.entries(modelScores).sort((a, b) => b[1] - a[1]);

    const [recommendedType, _] = sortedModels[0];
    const recommendedConfig = this.generateConfig(recommendedType as ModelType, characteristics);

    // Generate alternatives
    for (let i = 1; i < Math.min(4, sortedModels.length); i++) {
      const [type, score] = sortedModels[i];
      alternatives.push({
        modelType: type as ModelType,
        estimatedPerformance: {
          accuracy: score * 0.95,
          precision: score * 0.93,
          recall: score * 0.94,
          f1Score: score * 0.94,
        },
        trainingTimeEstimate: this.estimateTrainingTime(type as ModelType, data.length),
        reason: this.getRecommendationReason(type as ModelType, characteristics),
      });
    }

    return {
      recommendedModel: recommendedType as ModelType,
      recommendedConfig,
      alternatives,
      dataCharacteristics: characteristics,
      reasoning: this.generateReasoning(recommendedType as ModelType, characteristics),
    };
  }

  /**
   * Score each model type based on data characteristics
   */
  private scoreModels(chars: DataCharacteristics): Record<string, number> {
    const scores: Record<string, number> = {};

    // Neural Network scoring
    scores['neural_network'] = this.scoreNeuralNetwork(chars);
    
    // Random Forest scoring
    scores['random_forest'] = this.scoreRandomForest(chars);
    
    // Isolation Forest scoring
    scores['isolation_forest'] = this.scoreIsolationForest(chars);
    
    // Gradient Boosting scoring
    scores['gradient_boosting'] = this.scoreGradientBoosting(chars);
    
    // Autoencoder scoring
    scores['autoencoder'] = this.scoreAutoencoder(chars);

    return scores;
  }

  private scoreNeuralNetwork(chars: DataCharacteristics): number {
    let score = 70; // Base score
    
    // NN works well with large datasets
    if (chars.sampleCount > 10000) score += 15;
    else if (chars.sampleCount > 1000) score += 5;
    
    // NN handles nonlinearity well
    if (chars.linearity === 'nonlinear') score += 10;
    
    // High dimensional data benefits from deep learning
    if (chars.dimensionality === 'high') score += 10;
    
    // Penalize missing values
    score -= chars.missingValueRatio * 20;
    
    return Math.min(100, Math.max(0, score));
  }

  private scoreRandomForest(chars: DataCharacteristics): number {
    let score = 75;
    
    // RF handles mixed data well
    if (chars.outlierRatio > 0.1) score += 10;
    
    // RF is robust to missing values
    if (chars.missingValueRatio > 0.05) score += 5;
    
    // RF works well with medium-sized datasets
    if (chars.sampleCount > 500 && chars.sampleCount < 100000) score += 5;
    
    // RF handles high dimensionality
    if (chars.dimensionality !== 'low') score += 5;
    
    return Math.min(100, Math.max(0, score));
  }

  private scoreIsolationForest(chars: DataCharacteristics): number {
    let score = 80;
    
    // IF excels at anomaly detection
    if (chars.complexity === 'complex') score += 5;
    
    // IF doesn't need labels
    if (Object.keys(chars.classDistribution).length <= 2) score += 10;
    
    // IF is fast
    if (chars.sampleCount > 50000) score += 5;
    
    return Math.min(100, Math.max(0, score));
  }

  private scoreGradientBoosting(chars: DataCharacteristics): number {
    let score = 72;
    
    // GB often wins competitions
    if (chars.linearity === 'nonlinear') score += 10;
    
    // GB needs sufficient data
    if (chars.sampleCount > 1000) score += 10;
    
    // GB can overfit on noisy data
    if (chars.outlierRatio > 0.15) score -= 10;
    
    return Math.min(100, Math.max(0, score));
  }

  private scoreAutoencoder(chars: DataCharacteristics): number {
    let score = 65;
    
    // AE good for unsupervised anomaly detection
    if (Object.keys(chars.classDistribution).length <= 2) score += 15;
    
    // AE needs enough data
    if (chars.sampleCount > 5000) score += 10;
    
    // AE handles high dimensions well
    if (chars.dimensionality === 'high') score += 10;
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Generate configuration for recommended model
   */
  private generateConfig(modelType: ModelType, chars: DataCharacteristics): any {
    switch (modelType) {
      case 'neural_network':
        return {
          ...DEFAULT_THREAT_NN_CONFIG,
          layers: this.generateNNLayers(chars),
          epochs: chars.sampleCount > 10000 ? 50 : 100,
          batchSize: Math.min(128, Math.max(32, Math.floor(chars.sampleCount / 100))),
        };

      case 'isolation_forest':
        return {
          ...DEFAULT_STATISTICAL_CONFIG,
          nEstimators: chars.sampleCount > 10000 ? 200 : 100,
          contamination: chars.outlierRatio || 0.1,
        };

      case 'random_forest':
        return {
          algorithm: 'isolation_forest' as const,
          nEstimators: 100,
          maxSamples: 256,
          maxFeatures: 1.0,
          bootstrap: true,
          contamination: 0.1,
          nJobs: 4,
        };

      case 'gradient_boosting':
        return {
          algorithm: 'isolation_forest' as const,
          nEstimators: 150,
          maxSamples: 128,
          maxFeatures: 0.8,
          bootstrap: false,
          contamination: 0.1,
          nJobs: 4,
        };

      default:
        return DEFAULT_STATISTICAL_CONFIG;
    }
  }

  /**
   * Generate neural network layers based on data characteristics
   */
  private generateNNLayers(chars: DataCharacteristics): LayerConfig[] {
    const layers: LayerConfig[] = [];
    
    // Input processing
    layers.push({
      type: 'dense',
      units: Math.min(256, Math.max(64, chars.featureCount * 4)),
      activation: 'relu',
      kernelInitializer: 'he_normal',
    });
    layers.push({ type: 'batchnorm' });
    layers.push({ type: 'dropout', dropoutRate: 0.3 });

    // Hidden layers based on complexity
    if (chars.complexity === 'complex' || chars.dimensionality === 'high') {
      layers.push({
        type: 'dense',
        units: 128,
        activation: 'relu',
        kernelInitializer: 'he_normal',
      });
      layers.push({ type: 'batchnorm' });
      layers.push({ type: 'dropout', dropoutRate: 0.3 });
    }

    // Middle layer
    layers.push({
      type: 'dense',
      units: 64,
      activation: 'relu',
    });
    layers.push({ type: 'dropout', dropoutRate: 0.2 });

    // Output layer
    layers.push({
      type: 'dense',
      units: 1,
      activation: 'sigmoid',
    });

    return layers;
  }

  /**
   * Estimate training time in milliseconds
   */
  private estimateTrainingTime(modelType: ModelType, sampleCount: number): number {
    const baseTimes: Record<ModelType, number> = {
      neural_network: 50,
      random_forest: 10,
      gradient_boosting: 30,
      isolation_forest: 5,
      autoencoder: 80,
      lstm: 150,
      transformer: 300,
      statistical: 2,
      ensemble: 100,
    };
    
    return baseTimes[modelType] * sampleCount;
  }

  /**
   * Get recommendation reason text
   */
  private getRecommendationReason(modelType: ModelType, chars: DataCharacteristics): string {
    const reasons: Record<ModelType, string> = {
      neural_network: `Suitable for ${chars.sampleCount} samples with ${chars.linearity} patterns`,
      random_forest: `Robust choice handling ${chars.dimensionality} dimensionality`,
      gradient_boosting: `Strong for ${chars.linearity} relationships`,
      isolation_forest: `Efficient for anomaly detection at scale`,
      autoencoder: `Good for unsupervised learning with ${chars.sampleCount} samples`,
      lstm: `Optimal for sequential/temporal patterns`,
      transformer: `Best for complex attention-based patterns`,
      statistical: `Fast baseline for initial analysis`,
      ensemble: `Combines strengths of multiple approaches`,
    };
    return reasons[modelType];
  }

  /**
   * Generate detailed reasoning for recommendation
   */
  private generateReasoning(modelType: ModelType, chars: DataCharacteristics): string {
    return `Recommended ${modelType} based on analysis of ${chars.sampleCount} samples across ${chars.featureCount} features. ` +
      `Data shows ${chars.linearity} patterns with ${chars.complexity} complexity. ` +
      `Missing value ratio: ${(chars.missingValueRatio * 100).toFixed(1)}%, outlier ratio: ${(chars.outlierRatio * 100).toFixed(1)}%.`;
  }

  /**
   * Detect outliers per feature using IQR
   */
  private detectOutliersPerFeature(features: number[][]): number[] {
    const outlierCounts: number[] = [];
    const numFeatures = features[0].length;

    for (let f = 0; f < numFeatures; f++) {
      const values = features.map(row => row[f]).sort((a, b) => a - b);
      const q1 = values[Math.floor(values.length * 0.25)];
      const q3 = values[Math.floor(values.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      
      const outliers = values.filter(v => v < lowerBound || v > upperBound);
      outlierCounts.push(outliers.length);
    }

    return outlierCounts;
  }

  /**
   * Calculate pairwise correlations
   */
  private calculateCorrelations(features: number[][]): number[] {
    const correlations: number[] = [];
    const numFeatures = features[0].length;

    for (let i = 0; i < Math.min(numFeatures, 10); i++) {
      for (let j = i + 1; j < Math.min(numFeatures, 10); j++) {
        const corr = this.pearsonCorrelation(
          features.map(f => f[i]),
          features.map(f => f[j])
        );
        correlations.push(Math.abs(corr));
      }
    }

    return correlations;
  }

  /**
   * Pearson correlation coefficient
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }
    
    const denominator = Math.sqrt(denomX * denomY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calculate skewness
   */
  private calculateSkewness(values: number[]): number {
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n);
    
    if (std === 0) return 0;
    
    return values.reduce((sum, v) => sum + ((v - mean) / std) ** 3, 0) / n;
  }

  /**
   * Calculate kurtosis
   */
  private calculateKurtosis(values: number[]): number {
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n);
    
    if (std === 0) return 0;
    
    return values.reduce((sum, v) => sum + ((v - mean) / std) ** 4, 0) / n - 3;
  }

  /**
   * Estimate class distribution
   */
  private estimateClassDistribution(data: FeatureVector[]): Record<string, number> {
    // Try to infer classes from metadata or assume binary
    const dist: Record<string, number> = {};
    
    for (const item of data) {
      const label = item.metadata?.label ?? item.metadata?.class ?? 'unknown';
      dist[label] = (dist[label] || 0) + 1;
    }
    
    return dist;
  }

  /**
   * Estimate data complexity
   */
  private estimateComplexity(data: FeatureVector[]): 'simple' | 'moderate' | 'complex' {
    const features = data.map(d => d.features);
    
    // Count unique patterns (approximate)
    const uniquePatterns = new Set(features.map(f => f.join(','))).size;
    const uniquenessRatio = uniquePatterns / data.length;
    
    if (uniquenessRatio > 0.9) return 'complex';
    if (uniquenessRatio > 0.5) return 'moderate';
    return 'simple';
  }
}

// ============================================================
// MODEL PERFORMANCE TRACKER & A/B TESTING
// ============================================================

/**
 * Model Performance Tracker
 * Tracks and compares model performance over time
 */
export class ModelPerformanceTracker {
  private metricsHistory: Map<string, ModelPerformance[]> = new Map();
  private abTests: Map<string, ABTestConfig> = new Map();
  private abResults: Map<string, ABTestResult> = new Map();

  /**
   * Record model performance metrics
   */
  recordPerformance(modelId: string, metrics: ModelPerformance): void {
    const history = this.metricsHistory.get(modelId) || [];
    history.push(metrics);
    
    // Keep only last 1000 entries
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
    
    this.metricsHistory.set(modelId, history);
  }

  /**
   * Get performance history for a model
   */
  getPerformanceHistory(modelId: string): ModelPerformance[] {
    return this.metricsHistory.get(modelId) || [];
  }

  /**
   * Get latest performance metrics
   */
  getLatestPerformance(modelId: string): ModelPerformance | null {
    const history = this.metricsHistory.get(modelId);
    return history?.[history.length - 1] || null;
  }

  /**
   * Calculate performance trend
   */
  getPerformanceTrend(modelId: string): 'improving' | 'stable' | 'degrading' | 'unknown' {
    const history = this.metricsHistory.get(modelId);
    if (!history || history.length < 10) return 'unknown';
    
    const recent = history.slice(-10);
    const older = history.slice(-20, -10);
    
    if (older.length === 0) return 'unknown';
    
    const recentAvgF1 = recent.reduce((sum, m) => sum + m.f1Score, 0) / recent.length;
    const olderAvgF1 = older.reduce((sum, m) => sum + m.f1Score, 0) / older.length;
    
    const change = (recentAvgF1 - olderAvgF1) / olderAvgF1;
    
    if (change > 0.02) return 'improving';
    if (change < -0.02) return 'degrading';
    return 'stable';
  }

  /**
   * Setup an A/B test
   */
  setupABTest(config: ABTestConfig): void {
    this.abTests.set(config.id, { ...config, status: 'setup' });
  }

  /**
   * Start an A/B test
   */
  startABTest(testId: string): void {
    const test = this.abTests.get(testId);
    if (test) {
      test.status = 'running';
      test.startDate = new Date();
    }
  }

  /**
   * Complete an A/B test and calculate results
   */
  completeABTest(testId: string): ABTestResult | null {
    const test = this.abTests.get(testId);
    if (!test || test.status !== 'running') return null;

    const controlMetrics = this.getLatestPerformance(test.controlModelId);
    const treatmentMetrics = this.getLatestPerformance(test.treatmentModelId);

    if (!controlMetrics || !treatmentMetrics) return null;

    // Calculate lift on primary metric
    const controlValue = controlMetrics[test.primaryMetric] as number;
    const treatmentValue = treatmentMetrics[test.primaryMetric] as number;
    const lift = (treatmentValue - controlValue) / controlValue;

    // Simplified significance calculation (would use proper t-test in production)
    const confidence = Math.min(0.99, Math.abs(lift) * 10);
    const isSignificant = confidence > (1 - test.significanceLevel);

    const result: ABTestResult = {
      testId,
      controlMetrics,
      treatmentMetrics,
      lift,
      confidence,
      isSignificant,
      pValue: 1 - confidence,
      recommendedWinner: isSignificant 
        ? (lift > 0 ? 'treatment' : 'control')
        : 'inconclusive',
      sampleSize: {
        control: this.getPerformanceHistory(test.controlModelId).length,
        treatment: this.getPerformanceHistory(test.treatmentModelId).length,
      },
      completedAt: new Date(),
    };

    test.status = 'completed';
    this.abResults.set(testId, result);

    return result;
  }

  /**
   * Get A/B test results
   */
  getABTestResult(testId: string): ABTestResult | null {
    return this.abResults.get(testId) || null;
  }

  /**
   * Compare two models
   */
  compareModels(modelA: string, modelB: string): {
    modelAMetrics: ModelPerformance | null;
    modelBMetrics: ModelPerformance | null;
    comparison: Record<keyof ModelPerformance, { diff: number; winner: string }>;
  } {
    const metricsA = this.getLatestPerformance(modelA);
    const metricsB = this.getLatestPerformance(modelB);

    const comparison = {} as Record<keyof ModelPerformance, { diff: number; winner: string }>;

    if (metricsA && metricsB) {
      const metricKeys = Object.keys(metricsA) as (keyof ModelPerformance)[];
      
      for (const key of metricKeys) {
        const valA = metricsA[key] as number;
        const valB = metricsB[key] as number;
        
        if (typeof valA === 'number' && typeof valB === 'number') {
          // For FPR/FNR, lower is better
          const lowerIsBetter = key === 'falsePositiveRate' || key === 'falseNegativeRate' || key === 'calibrationError';
          const diff = valA - valB;
          
          comparison[key] = {
            diff,
            winner: lowerIsBetter 
              ? (diff < 0 ? modelA : modelB)
              : (diff > 0 ? modelA : modelB),
          };
        }
      }
    }

    return {
      modelAMetrics: metricsA,
      modelBMetrics: metricsB,
      comparison,
    };
  }
}

// ============================================================
// MODEL SERIALIZATION UTILITIES
// ============================================================

/**
 * Serialize a model for export
 */
export function serializeModel(
  model: SimplifiedNeuralNetwork | IsolationForestDetector,
  metadata: Partial<SerializedModel['metadata']> = {}
): SerializedModel {
  const base: Omit<SerializedModel, 'weights'> = {
    formatVersion: '1.0.0',
    modelId: `model-${Date.now()}`,
    modelName: 'Unnamed Model',
    modelType: model instanceof SimplifiedNeuralNetwork ? 'neural_network' : 'isolation_forest',
    serializedAt: new Date(),
    checksum: '',
    architecture: {},
    config: model instanceof SimplifiedNeuralNetwork 
      ? (model as any).config 
      : DEFAULT_STATISTICAL_CONFIG,
    metadata: {
      trainingDataHash: '',
      featureNames: [],
      normalizerParams: { method: 'none', params: {} },
      performance: {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        aucROC: 0,
        aucPR: 0,
        falsePositiveRate: 0,
        falseNegativeRate: 0,
        calibrationError: 0,
        inferenceTimeAvgMs: 0,
        inferenceTimeP95Ms: 0,
        throughputPerSecond: 0,
      },
      version: '1.0.0',
      tags: [],
      ...metadata,
    },
  };

  // Serialize weights
  const serialized = model instanceof SimplifiedNeuralNetwork 
    ? model.serialize() 
    : JSON.stringify({ type: 'isolation_forest' });

  // Calculate checksum (simple hash)
  const checksum = simpleHash(serialized);

  return {
    ...base,
    weights: serialized,
    checksum,
  };
}

/**
 * Deserialize a model from export
 */
export function deserializeModel(
  serialized: SerializedModel
): SimplifiedNeuralNetwork | IsolationForestDetector {
  // Verify checksum
  const expectedChecksum = simpleHash(serialized.weights);
  if (expectedChecksum !== serialized.checksum) {
    throw new Error('Model integrity check failed: checksum mismatch');
  }

  if (serialized.modelType === 'neural_network' || serialized.modelType === 'lstm' || 
      serialized.modelType === 'transformer' || serialized.modelType === 'autoencoder') {
    const nn = new SimplifiedNeuralNetwork(serialized.config as NeuralNetworkConfig);
    nn.deserialize(serialized.weights);
    return nn;
  } else {
    const detector = new IsolationForestDetector(serialized.config as StatisticalModelConfig);
    // Would need full forest deserialization here
    return detector;
  }
}

/**
 * Simple hash function for checksum
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// ============================================================
// EXPORTS
// ============================================================

export {
  DEFAULT_THREAT_NN_CONFIG,
  DEFAULT_ENSEMBLE_CONFIG,
  DEFAULT_FEATURE_CONFIG,
  DEFAULT_STATISTICAL_CONFIG,
};

export type {
  FeatureVector,
  EngineeredFeature,
  FeatureEngineeringConfig,
  LayerConfig,
  NeuralNetworkConfig,
  TrainingSample,
  ModelMetadata,
  ModelPerformance,
  TrainingInfo,
  TrainingHistoryPoint,
  StatisticalModelConfig,
  ABTestConfig,
  ABTestResult,
  AutoMLResult,
  DataCharacteristics,
  SerializedModel,
  NormalizerState,
  EnsembleConfig,
  ModelReference,
  PredictionResult,
};
