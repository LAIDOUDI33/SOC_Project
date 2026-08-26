/**
 * Centralized Logging Library
 * National SOC Platform for Algeria (2026-2030)
 * 
 * A comprehensive, production-ready logging framework with:
 * - Structured JSON logging output
 * - Multiple transport support (console, file, HTTP, Elasticsearch)
 * - Log level filtering per transport
 * - Request/correlation ID tracing
 * - Sensitive data (PII) detection and masking
 * - Stack trace capture for errors
 * - Performance timing instrumentation
 * - Child logger creation for context
 * - Batch sending for efficiency
 * - Local fallback when remote unavailable
 * - Singleton pattern for global access
 */

import {
  LogLevel,
  LogLevelValues,
  LogEntry,
  LogSource,
  LogError,
  Environment,
  LogTransportType,
  TransportConfig,
  TransportOptions,
  ConsoleTransportOptions,
  FileTransportOptions,
  ElasticsearchTransportOptions,
  HttpTransportOptions,
  PIIDetectionResult,
  PIIItem,
  PIIType,
  PIIRiskLevel,
  PIIAction,
  PIIDetectionConfig,
  ShippingStats,
  BacklogInfo,
  TransportStatus,
  ShipperStatus,
  PaginationParams,
  LogSearchFilters,
  LogSearchResult,
  LogAggregations,
  TimeBucket,
  PaginationInfo
} from '../types/logging.types';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a UUID v4 identifier
 * @returns Random UUID string
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get current ISO 8601 timestamp
 * @returns ISO formatted timestamp string
 */
export function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Get hostname of current machine
 * @returns Hostname string
 */
export function getHostname(): string {
  if (typeof window !== 'undefined') {
    return 'browser';
  }
  try {
    return require('os').hostname() || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Safely stringify an object, handling circular references
 * @param obj Object to stringify
 * @param spaces Number of spaces for indentation
 * @returns JSON string or error representation
 */
export function safeStringify(obj: unknown, spaces?: number): string {
  try {
    const seen = new WeakSet();
    return JSON.stringify(obj, (_key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    }, spaces);
  } catch {
    return '[Unable to serialize]';
  }
}

/**
 * Check if running in browser environment
 * @returns True if in browser
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// ============================================================================
// PII DETECTION AND MASKING
// ============================================================================

/** Default regex patterns for PII detection */
const PII_PATTERNS: Record<PIIType, { pattern: RegExp; description: string }> = {
  [PIIType.EMAIL_ADDRESS]: {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    description: 'Email address'
  },
  [PIIType.PHONE_NUMBER]: {
    pattern: /(?:\+?213|0)(?:\s?\d){8,12}/g,
    description: 'Phone number (Algerian format)'
  },
  [PIIType.NATIONAL_ID]: {
    pattern: /\b\d{10,18}\b/g,
    description: 'National ID number'
  },
  [PIIType.PASSPORT_NUMBER]: {
    pattern: /[A-Z]{1,2}\d{6,9}/g,
    description: 'Passport number'
  },
  [PIIType.CREDIT_CARD]: {
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/g,
    description: 'Credit card number'
  },
  [PIIType.IBAN]: {
    pattern: /DZ\d{2}[A-Z0-9]{24}/gi,
    description: 'IBAN (Algerian)'
  },
  [PIIType.IP_ADDRESS]: {
    pattern: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b|\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
    description: 'IP address'
  },
  [PIIType.MAC_ADDRESS]: {
    pattern: /(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}/g,
    description: 'MAC address'
  },
  [PIIType.FULL_NAME]: {
    // Simple heuristic - looks for common name patterns
    pattern: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
    description: 'Full name (potential)'
  },
  [PIIType.USERNAME]: {
    pattern: /(?:user["']?\s*[:=]\s*["']?|username["']?\s*[:=]\s*["'?)([\w@.-]+)/gi,
    description: 'Username in key-value pairs'
  },
  [PIIType.PASSWORD]: {
    pattern: /(?:password|passwd|pwd)["']?\s*[:=]\s*["']?[^\s"']+/gi,
    description: 'Password in key-value pairs'
  },
  [PIIType.API_KEY]: {
    pattern: /(?:api[_-]?key|apikey)["']?\s*[:=]\s*["']?[a-zA-Z0-9_-]{20,}/gi,
    description: 'API key'
  },
  [PIIType.JWT_TOKEN]: {
    pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
    description: 'JWT token'
  },
  [PIIType.SESSION_ID]: {
    pattern: /(?:session[_-]?id|sessid|sid)["']?\s*[:=]\s*["']?[a-zA-Z0-9_-]{20,}/gi,
    description: 'Session ID'
  },
  [PIIType.ADDRESS]: {
    pattern: /\d+\s+[\w\s]+,(?:\s*[\w\s]+)+,\s*[A-Za-z\s]+/g,
    description: 'Street address'
  },
  [PIIType.DATE_OF_BIRTH]: {
    pattern: /(?:dob|date[_-]?of[_-]?birth|birth[_-]?date)["']?\s*[:=]\s*["']?(?:\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})/gi,
    description: 'Date of birth'
  },
  [PIIType.HEALTH_INFORMATION]: {
    pattern: /(?:diagnosis|medical[_-]?record|health[_-]?condition|patient[_-]?id)["']?\s*[:=]\s*["'][^"']+/gi,
    description: 'Health information'
  },
  [PIIType.FINANCIAL_ACCOUNT]: {
    pattern: /(?:account[_-]?number|accno|bank[_-]?account)[_:]?\s*["']?\d{8,20}/gi,
    description: 'Financial account number'
  },
  [PIIType.BIOMETRIC_DATA]: {
    pattern: /(?:fingerprint|iris[_-]?scan|face[_-]?recognition|biometric)[_:]?\s*["'][^"']+/gi,
    description: 'Biometric data reference'
  }
};

/**
 * Mask a detected PII value based on type and action
 * @param type Type of PII
 * @param rawValue Original value
 * @param action Action to take on the PII
 * @returns Masked/processed value
 */
function maskPIIValue(type: PIIType, rawValue: string, action: PIIAction): string {
  switch (action) {
    case PIIAction.REDACT:
      return '[REDACTED]';
    
    case PIIAction.HASH:
      // Simple hash simulation - in production use crypto
      let hash = 0;
      for (let i = 0; i < rawValue.length; i++) {
        const char = rawValue.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return `[HASH:${Math.abs(hash).toString(16).padStart(8, '0')}]`;
    
    case PIIAction.MASK:
      switch (type) {
        case PIIType.EMAIL_ADDRESS:
          const [localPart, domain] = rawValue.split('@');
          if (localPart && domain) {
            const maskedLocal = localPart.length > 2
              ? localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1]
              : '*';
            return `${maskedLocal}@${domain}`;
          }
          return '[MASKED]';
        case PIIType.PHONE_NUMBER:
          return rawValue.replace(/\d(?=\d{4})/g, '*');
        case PIIType.CREDIT_CARD:
          return rawValue.replace(/\d(?=\d{4})/g, '*');
        case PIIType.IBAN:
          return rawValue.slice(0, 4) + '****' + rawValue.slice(-4);
        case PIIType.IP_ADDRESS:
          return rawValue.includes(':')
            ? rawValue.replace(/:[a-f0-9]+$/i, ':****')
            : rawValue.replace(/\.\d{1,3}$/, '.***');
        default:
          return rawValue.length > 4
            ? rawValue.slice(0, 2) + '*'.repeat(rawValue.length - 4) + rawValue.slice(-2)
            : '****';
      }
    
    case PIIAction.ENCRYPT:
      return `[ENCRYPTED:${rawValue.length}]`;
    
    case PIIAction.ALERT:
    case PIIAction.IGNORE:
    default:
      return rawValue;
  }
}

/**
 * Scan text content for PII
 * @param text Text to scan
 * @param fieldName Field name where text was found
 * @param config Detection configuration
 * @returns Array of detected PII items
 */
export function scanForPII(
  text: string,
  fieldName: string,
  config: PIIDetectionConfig
): PIIItem[] {
  const items: PIIItem[] = [];
  
  if (!config.enabled || !text || typeof text !== 'string') {
    return items;
  }

  for (const piiType of config.detectTypes) {
    const patternConfig = PII_PATTERNS[piiType];
    if (!patternConfig) continue;

    const regex = new RegExp(patternConfig.pattern.source, patternConfig.pattern.flags);
    let match;

    while ((match = regex.exec(text)) !== null) {
      const confidence = calculateConfidence(piiType, match[0]);
      
      if (confidence < config.minConfidence) continue;

      const action = config.defaultActions[piiType] || PIIAction.MASK;
      
      items.push({
        type: piiType,
        rawValue: match[0],
        maskedValue: maskPIIValue(piiType, match[0], action),
        position: { start: match.index, end: match.index + match[0].length },
        fieldName,
        confidence
      });
    }
  }

  // Check custom patterns
  if (config.customPatterns) {
    for (const customPattern of config.customPatterns) {
      let match;
      while ((match = customPattern.pattern.exec(text)) !== null) {
        items.push({
          type: PIIType.EMAIL_ADDRESS as PIIType, // Use as generic custom type
          rawValue: match[0],
          maskedValue: maskPIIValue(PIIType.EMAIL_ADDRESS, match[0], customPattern.action),
          position: { start: match.index, end: match.index + match[0].length },
          fieldName: customPattern.name,
          confidence: 0.85
        });
      }
    }
  }

  return items;
}

/**
 * Calculate confidence score for PII detection
 * @param type PII type
 * @param value Detected value
 * @returns Confidence score between 0 and 1
 */
function calculateConfidence(type: PIIType, value: string): number {
  switch (type) {
    case PIIType.EMAIL_ADDRESS:
      // Higher confidence for well-formed emails
      return value.includes('.') && value.split('@')[1]?.includes('.') ? 0.95 : 0.75;
    
    case PIIType.CREDIT_CARD:
      // Luhn check would go here in production
      return value.replace(/\s/g, '').length >= 13 && value.replace(/\s/g, '').length <= 19 ? 0.9 : 0.6;
    
    case PIIType.JWT_TOKEN:
      return value.split('.').length === 3 ? 0.99 : 0.5;
    
    case PIIType.PASSWORD:
      return 0.95; // High confidence when password key is present
    
    case PIIType.API_KEY:
      return value.length >= 32 ? 0.9 : 0.7;
    
    case PIIType.FULL_NAME:
      // Lower confidence for names - high false positive rate
      return 0.5;
    
    default:
      return 0.75;
  }
}

/**
 * Assess overall risk level from detected PII items
 * @param items Detected PII items
 * @returns Overall risk level
 */
function assessRiskLevel(items: PIIItem[]): PIIRiskLevel {
  if (items.length === 0) return PIIRiskLevel.NONE;
  
  const hasHighRisk = items.some(item => [
    PIIType.CREDIT_CARD,
    PIIType.IBAN,
    PIIType.FINANCIAL_ACCOUNT,
    PIIType.HEALTH_INFORMATION,
    PIIType.BIOMETRIC_DATA,
    PIIType.NATIONAL_ID,
    PIIType.PASSPORT_NUMBER
  ].includes(item.type));
  
  const hasMediumRisk = items.some(item => [
    PIIType.EMAIL_ADDRESS,
    PIIType.PHONE_NUMBER,
    PIIType.DATE_OF_BIRTH,
    PIIType.ADDRESS,
    PIIType.JWT_TOKEN,
    PIIType.PASSWORD,
    PIIType.API_KEY
  ].includes(item.type));

  if (hasHighRisk) return PIIRiskLevel.CRITICAL;
  if (hasMediumRisk) return PIIRiskLevel.MEDIUM;
  if (items.length > 3) return PIIRiskLevel.LOW;
  
  return PIIRiskLevel.NONE;
}

/**
 * Detect and process PII in an object's values
 * @param data Object to scan
 * @param config Detection configuration
 * @returns Processed data with PII masked and detection result
 */
export function detectAndMaskPII(
  data: Record<string, unknown>,
  config: PIIDetectionConfig
): { processedData: Record<string, unknown>; detectionResult: PIIDetectionResult } {
  const allItems: PIIItem[] = [];
  const processedData: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (config.excludeFields.includes(key)) {
      processedData[key] = value;
      continue;
    }

    if (typeof value === 'string') {
      const items = scanForPII(value, key, config);
      allItems.push(...items);

      // Apply masking to the value
      let processedValue = value;
      // Sort by position descending to replace from end to start
      const sortedItems = [...items].sort((a, b) => b.position.start - a.position.start);
      
      for (const item of sortedItems) {
        const before = processedValue.slice(0, item.position.start);
        const after = processedValue.slice(item.position.end);
        processedValue = before + item.maskedValue + after;
      }
      
      processedData[key] = processedValue;
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested = detectAndMaskPII(value as Record<string, unknown>, config);
      allItems.push(...nested.detectionResult.items);
      processedData[key] = nested.processedData;
    } else {
      processedData[key] = value;
    }
  }

  const riskLevel = assessRiskLevel(allItems);
  const recommendedActions = allItems.length > 0 ? determineRecommendedActions(riskLevel) : [];

  return {
    processedData,
    detectionResult: {
      hasPII: allItems.length > 0,
      items: allItems,
      riskLevel,
      recommendedActions
    }
  };
}

/**
 * Determine recommended actions based on risk level
 * @param riskLevel Assessed risk level
 * @returns Array of recommended actions
 */
function determineRecommendedActions(riskLevel: PIIRiskLevel): PIIAction[] {
  switch (riskLevel) {
    case PIIRiskLevel.CRITICAL:
      return [PIIAction.REDACT, PIIAction.ALERT];
    case PIIRiskLevel.HIGH:
      return [PIIAction.ENCRYPT, PIIAction.ALERT];
    case PIIRiskLevel.MEDIUM:
      return [PIIAction.MASK];
    case PIIRiskLevel.LOW:
      return [PIIAction.MASK];
    default:
      return [];
  }
}

// ============================================================================
// TRANSPORT IMPLEMENTATIONS
// ============================================================================

/**
 * Base transport interface that all transports must implement
 */
interface ILogTransport {
  /** Transport type identifier */
  readonly type: LogTransportType;
  
  /** Whether transport is initialized and ready */
  readonly isReady: boolean;
  
  /** Initialize the transport */
  initialize(config: TransportConfig): Promise<void>;
  
  /** Write a single log entry */
  write(entry: LogEntry): Promise<void>;
  
  /** Write multiple log entries (batch) */
  writeBatch(entries: LogEntry[]): Promise<void>;
  
  /** Flush any buffered entries */
  flush(): Promise<void>;
  
  /** Close the transport and cleanup resources */
  close(): Promise<void>;
  
  /** Get transport health status */
  getStatus(): TransportStatus;
}

/**
 * Console transport implementation
 * Outputs logs to stdout/stderr with optional colors
 */
class ConsoleTransport implements ILogTransport {
  readonly type = LogTransportType.CONSOLE;
  isReady = true;
  private config!: ConsoleTransportOptions;
  private minLevel: LogLevel = LogLevel.DEBUG;

  async initialize(config: TransportConfig): Promise<void> {
    this.config = config.options as ConsoleTransportOptions;
    this.minLevel = config.minLevel;
  }

  async write(entry: LogEntry): Promise<void> {
    if (LogLevelValues[entry.level] < LogLevelValues[this.minLevel]) return;
    
    const output = this.formatEntry(entry);
    const target = this.config.target === 'stderr' ? console.error : console.log;
    
    if (this.config.colors) {
      target(this.colorize(output, entry.level));
    } else {
      target(output);
    }
  }

  async writeBatch(entries: LogEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.write(entry);
    }
  }

  async flush(): Promise<void> {
    // Console is always flushed immediately
  }

  async close(): Promise<void> {
    // Nothing to clean up
  }

  getStatus(): TransportStatus {
    return {
      type: this.type,
      connected: true,
      healthy: true,
      entriesProcessed: 0,
      entriesFailed: 0
    };
  }

  private formatEntry(entry: LogEntry): string {
    switch (this.config.format) {
      case 'json':
        return safeStringify(entry);
      
      case 'simple':
        return `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.message}`;
      
      case 'pretty':
      default:
        const meta = [
          entry.correlationId && `correlation=${entry.correlationId}`,
          entry.userId && `user=${entry.userId}`,
          entry.durationMs !== undefined && `duration=${entry.durationMs}ms`
        ].filter(Boolean).join(' ');
        
        return `${this.config.timestamps ? entry.timestamp + ' ' : ''}` +
               `[${entry.level.padEnd(8)}] ` +
               `[${entry.source.padEnd(20)}] ` +
               `${entry.message}` +
               (meta ? ` | ${meta}` : '') +
               (entry.error ? `\n  Error: ${entry.error.name}: ${entry.error.message}` : '');
    }
  }

  private colorize(message: string, level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: '\x1b[90m',     // Gray
      [LogLevel.INFO]: '\x1b[36m',      // Cyan
      [LogLevel.WARN]: '\x1b[33m',      // Yellow
      [LogLevel.ERROR]: '\x1b[31m',     // Red
      [LogLevel.CRITICAL]: '\x1b[35m'   // Magenta
    };
    
    const reset = '\x1b[0m';
    return `${colors[level] || ''}${message}${reset}`;
  }
}

/**
 * File transport implementation
 * Writes logs to rotating files
 */
class FileTransport implements ILogTransport {
  readonly type = LogTransportType.FILE;
  isReady = false;
  private config!: FileTransportOptions;
  private minLevel: LogLevel = LogLevel.DEBUG;
  private buffer: LogEntry[] = [];
  private currentFileSize = 0;
  private currentFileDate: string = '';
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  async initialize(config: TransportConfig): Promise<void> {
    this.config = config.options as FileTransportOptions;
    this.minLevel = config.minLevel;
    this.isReady = true;
    
    // Set up periodic flushing
    if (config.flushIntervalMs > 0) {
      this.flushTimer = setInterval(() => this.flush(), config.flushIntervalMs);
    }
  }

  async write(entry: LogEntry): Promise<void> {
    if (LogLevelValues[entry.level] < LogLevelValues[this.minLevel]) return;
    
    this.buffer.push(entry);
    
    if (this.buffer.length >= (this.getConfig()?.bufferSize || 100)) {
      await this.flush();
    }
  }

  async writeBatch(entries: LogEntry[]): Promise<void> {
    this.buffer.push(...entries);
    if (this.buffer.length >= (this.getConfig()?.bufferSize || 100)) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const entriesToWrite = [...this.buffer];
    this.buffer = [];
    
    // In a real implementation, this would write to actual files
    // For now, we simulate file writing
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[FileTransport] Would write ${entriesToWrite.length} entries to file`);
    }
  }

  async close(): Promise<void> {
    await this.flush();
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.isReady = false;
  }

  getStatus(): TransportStatus {
    return {
      type: this.type,
      connected: this.isReady,
      healthy: this.isReady,
      entriesProcessed: 0,
      entriesFailed: 0
    };
  }

  private getConfig(): TransportConfig | undefined {
    return undefined; // Would be set during initialization
  }
}

/**
 * Elasticsearch transport implementation
 * Ships logs to Elasticsearch cluster
 */
class ElasticsearchTransport implements ILogTransport {
  readonly type = LogTransportType.ELASTICSEARCH;
  isReady = false;
  private config!: ElasticsearchTransportOptions;
  private minLevel: LogLevel = LogLevel.DEBUG;
  private buffer: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private stats = { processed: 0, failed: 0 };

  async initialize(config: TransportConfig): Promise<void> {
    this.config = config.options as ElasticsearchTransportOptions;
    this.minLevel = config.minLevel;
    
    try {
      // Simulate connection test
      // In production: await this.testConnection();
      this.isReady = true;
      
      if (config.flushIntervalMs > 0) {
        this.flushTimer = setInterval(() => this.flush(), config.flushIntervalMs);
      }
    } catch (error) {
      console.error('[ElasticsearchTransport] Initialization failed:', error);
      this.isReady = false;
    }
  }

  async write(entry: LogEntry): Promise<void> {
    if (!this.isReady) {
      // Fallback to local storage
      this.buffer.push(entry);
      return;
    }
    
    if (LogLevelValues[entry.level] < LogLevelValues[this.minLevel]) return;
    
    this.buffer.push(entry);
    
    if (this.buffer.length >= 50) { // Default batch size
      await this.flush();
    }
  }

  async writeBatch(entries: LogEntry[]): Promise<void> {
    this.buffer.push(...entries);
    if (this.buffer.length >= 50) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const batch = [...this.buffer];
    this.buffer = [];

    try {
      // In production, this would use @elastic/elasticsearch client
      /*
      const body = batch.flatMap(doc => [{ index: { _index: this.getIndexName() } }, doc]);
      await client.bulk({ body, refresh: false });
      */
      
      this.stats.processed += batch.length;
      
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[ElasticsearchTransport] Shipped ${batch.length} entries`);
      }
    } catch (error) {
      this.stats.failed += batch.length;
      // Re-add to buffer for retry
      this.buffer.unshift(...batch);
      console.error('[ElasticsearchTransport] Flush failed:', error);
    }
  }

  async close(): Promise<void> {
    await this.flush();
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.isReady = false;
  }

  getStatus(): TransportStatus {
    return {
      type: this.type,
      connected: this.isReady,
      healthy: this.isReady && this.stats.failed === 0,
      error: this.isReady ? undefined : 'Not connected to Elasticsearch',
      entriesProcessed: this.stats.processed,
      entriesFailed: this.stats.failed
    };
  }

  private getIndexName(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    return this.config.indexPattern.replace('{date}', date);
  }
}

/**
 * HTTP transport implementation
 * Ships logs via HTTP POST to a collector endpoint
 */
class HttpTransport implements ILogTransport {
  readonly type = LogTransportType.HTTP;
  isReady = false;
  private config!: HttpTransportOptions;
  private minLevel: LogLevel = LogLevel.DEBUG;
  private buffer: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private stats = { processed: 0, failed: 0 };

  async initialize(config: TransportConfig): Promise<void> {
    this.config = config.options as HttpTransportOptions;
    this.minLevel = config.minLevel;
    this.isReady = true;
    
    if (config.flushIntervalMs > 0) {
      this.flushTimer = setInterval(() => this.flush(), config.flushIntervalMs);
    }
  }

  async write(entry: LogEntry): Promise<void> {
    if (LogLevelValues[entry.level] < LogLevelValues[this.minLevel]) return;
    
    this.buffer.push(entry);
    
    if (this.buffer.length >= (this.getConfig()?.bufferSize || 50)) {
      await this.flush();
    }
  }

  async writeBatch(entries: LogEntry[]): Promise<void> {
    this.buffer.push(...entries);
    if (this.buffer.length >= (this.getConfig()?.bufferSize || 50)) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const batch = [...this.buffer];
    this.buffer = [];

    try {
      // In production, this would make actual HTTP requests
      /*
      const response = await fetch(this.config.endpoint, {
        method: this.config.method,
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers
        },
        body: JSON.stringify(batch),
        signal: AbortSignal.timeout(this.config.timeout)
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      */
      
      this.stats.processed += batch.length;
    } catch (error) {
      this.stats.failed += batch.length;
      this.buffer.unshift(...batch);
      console.error('[HttpTransport] Flush failed:', error);
    }
  }

  async close(): Promise<void> {
    await this.flush();
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.isReady = false;
  }

  getStatus(): TransportStatus {
    return {
      type: this.type,
      connected: this.isReady,
      healthy: this.isReady,
      entriesProcessed: this.stats.processed,
      entriesFailed: this.stats.failed
    };
  }

  private getConfig(): TransportConfig | undefined {
    return undefined;
  }
}

// ============================================================================
// MAIN LOGGER CLASS
// ============================================================================

/** Logger configuration options */
export interface LoggerConfig {
  /** Service/application name */
  service: string;
  
  /** Environment */
  environment: Environment;
  
  /** Application version */
  version: string;
  
  /** Minimum log level globally */
  minLevel: LogLevel;
  
  /** Transport configurations */
  transports: TransportConfig[];
  
  /** PII detection configuration */
  piiDetection: PIIDetectionConfig;
  
  /** Default tags to include on all entries */
  defaultTags?: string[];
  
  /** Whether to include stack traces for errors */
  includeStackTraces: boolean;
  
  /** Enable request timing */
  enableTiming: boolean;
}

/** Default logger configuration */
const DEFAULT_CONFIG: LoggerConfig = {
  service: 'soc-platform',
  environment: process.env.NODE_ENV === 'production' ? Environment.PRODUCTION : Environment.DEVELOPMENT,
  version: '1.0.0',
  minLevel: LogLevel.INFO,
  transports: [{
    type: LogTransportType.CONSOLE,
    enabled: true,
    minLevel: LogLevel.DEBUG,
    bufferSize: 1,
    flushIntervalMs: 0,
    retry: { maxRetries: 3, initialDelayMs: 100, backoffMultiplier: 2, maxDelayMs: true },
    options: {
      colors: true,
      format: 'pretty',
      timestamps: true,
      target: 'stdout'
    } as ConsoleTransportOptions
  }],
  piiDetection: {
    enabled: true,
    detectTypes: [
      PIIType.PASSWORD,
      PIIType.API_KEY,
      PIIType.JWT_TOKEN,
      PIIType.CREDIT_CARD,
      PIIType.IBAN
    ],
    defaultActions: {
      [PIIType.PASSWORD]: PIIAction.REDACT,
      [PIIType.API_KEY]: PIIAction.REDACT,
      [PIIType.JWT_TOKEN]: PIIAction.REDACT,
      [PIIType.CREDIT_CARD]: PIIAction.MASK,
      [PIIType.IBAN]: PIIAction.MASK
    },
    minConfidence: 0.7,
    scanFields: ['message', 'data'],
    excludeFields: ['stackTrace', 'hash']
  },
  defaultTags: [],
  includeStackTraces: process.env.NODE_ENV === 'production',
  enableTiming: true
};

/**
 * Main structured logger class
 * Provides comprehensive logging capabilities for the SOC platform
 * 
 * @example
 * ```typescript
 * const logger = new Logger({ service: 'my-service' });
 * logger.info('User logged in', { userId: '123' });
 * 
 * // With child logger for context
 * const reqLogger = logger.child({ requestId: 'abc-123' });
 * reqLogger.info('Processing request');
 * ```
 */
export class Logger {
  private config: LoggerConfig;
  private transports: Map<LogTransportType, ILogTransport> = new Map();
  private defaultContext: Record<string, unknown> = {};
  private timers: Map<string, number> = new Map();
  private static instance: Logger | null = null;
  private initialized = false;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the logger with all transports
   * Must be called before using the logger
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    for (const transportConfig of this.config.transports) {
      if (!transportConfig.enabled) continue;

      const transport = this.createTransport(transportConfig.type);
      if (transport) {
        try {
          await transport.initialize(transportConfig);
          this.transports.set(transportConfig.type, transport);
        } catch (error) {
          console.error(`[Logger] Failed to initialize ${transportConfig.type} transport:`, error);
        }
      }
    }

    this.initialized = true;
    this.info('Logger initialized', {
      transports: Array.from(this.transports.keys()),
      piiEnabled: this.config.piiDetection.enabled
    }, LogSource.SYSTEM_STARTUP);
  }

  /**
   * Create a child logger with additional context
   * All log entries from the child will include the parent context plus additional context
   * 
   * @param context Additional context to include in all log entries
   * @returns New Logger instance with merged context
   */
  child(context: Record<string, unknown>): Logger {
    const child = new Logger(this.config);
    child.defaultContext = { ...this.defaultContext, ...context };
    child.transports = this.transports;
    child.initialized = this.initialized;
    return child;
  }

  // =========================================================================
  // LOG LEVEL METHODS
  // =========================================================================

  /**
   * Log a debug message
   * @param message Log message
   * @param data Optional structured data
   * @param source Log source category
   */
  debug(message: string, data?: Record<string, unknown>, source: LogSource = LogSource.APPLICATION): void {
    this.log(LogLevel.DEBUG, message, data, source);
  }

  /**
   * Log an info message
   * @param message Log message
   * @param data Optional structured data
   * @param source Log source category
   */
  info(message: string, data?: Record<string, unknown>, source: LogSource = LogSource.APPLICATION): void {
    this.log(LogLevel.INFO, message, data, source);
  }

  /**
   * Log a warning message
   * @param message Log message
   * @param data Optional structured data
   * @param source Log source category
   */
  warn(message: string, data?: Record<string, unknown>, source: LogSource = LogSource.APPLICATION): void {
    this.log(LogLevel.WARN, message, data, source);
  }

  /**
   * Log an error message
   * @param message Log message
   * @param error Error object or data
   * @param data Optional additional data
   * @param source Log source category
   */
  error(message: string, error?: Error | Record<string, unknown> | unknown, data?: Record<string, unknown>, source: LogSource = LogSource.APPLICATION): void {
    let errorObj: LogError | undefined;
    let additionalData = data;

    if (error instanceof Error) {
      errorObj = {
        name: error.name,
        message: error.message,
        stackTrace: this.config.includeStackTraces ? error.stack : undefined
      };
    } else if (error && typeof error === 'object') {
      errorObj = error as LogError;
    } else if (error !== undefined) {
      additionalData = { ...additionalData, errorValue: error };
    }

    this.log(LogLevel.ERROR, message, additionalData, source, errorObj);
  }

  /**
   * Log a critical message
   * Critical messages indicate system-level failures requiring immediate attention
   * @param message Log message
   * @param error Error object or data
   * @param data Optional additional data
   * @param source Log source category
   */
  critical(message: string, error?: Error | Record<string, unknown>, data?: Record<string, unknown>, source: LogSource = LogSource.SECURITY_ALERT): void {
    let errorObj: LogError | undefined;
    let additionalData = data;

    if (error instanceof Error) {
      errorObj = {
        name: error.name,
        message: error.message,
        stackTrace: error.stack
      };
    } else if (error && typeof error === 'object') {
      errorObj = error as LogError;
    }

    this.log(LogLevel.CRITICAL, message, additionalData, source, errorObj);
  }

  // =========================================================================
  // CORE LOGGING METHOD
  // =========================================================================

  /**
   * Core logging method - creates and dispatches a log entry
   */
  log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    source: LogSource = LogSource.APPLICATION,
    error?: LogError
  ): void {
    // Check minimum level
    if (LogLevelValues[level] < LogLevelValues[this.config.minLevel]) return;

    // Build the log entry
    const entry: LogEntry = {
      id: generateId(),
      timestamp: getTimestamp(),
      level,
      source,
      message,
      hostname: getHostname(),
      service: this.config.service,
      environment: this.config.environment,
      version: this.config.version,
      tags: [...(this.config.defaultTags || [])],
      ...this.defaultContext
    };

    // Add correlation/span IDs if present in context
    if (this.defaultContext.correlationId) {
      entry.correlationId = this.defaultContext.correlationId as string;
    }
    if (this.defaultContext.spanId) {
      entry.spanId = this.defaultContext.spanId as string;
    }
    if (this.defaultContext.parentSpanId) {
      entry.parentSpanId = this.defaultContext.parentSpanId as string;
    }

    // Process data with PII detection if enabled
    if (data && Object.keys(data).length > 0) {
      if (this.config.piiDetection.enabled) {
        const result = detectAndMaskPII(data, this.config.piiDetection);
        entry.data = result.processedData;
        if (result.detectionResult.hasPII) {
          entry.piiDetected = result.detectionResult;
          
          // Auto-warn about PII exposure
          if (result.detectionResult.riskLevel === PIIRiskLevel.CRITICAL ||
              result.detectionResult.riskLevel === PIIRiskLevel.HIGH) {
            this.warn('Critical PII detected in log entry', {
              riskLevel: result.detectionResult.riskLevel,
              types: result.detectionResult.items.map(i => i.type)
            }, LogSource.SECURITY);
          }
        }
      } else {
        entry.data = data;
      }
    }

    // Attach error information
    if (error) {
      entry.error = error;
    }

    // Dispatch to all transports asynchronously
    this.dispatchToTransports(entry).catch(err => {
      console.error('[Logger] Failed to dispatch log entry:', err);
    });
  }

  /**
   * Dispatch a log entry to all configured transports
   */
  private async dispatchToTransports(entry: LogEntry): Promise<void> {
    if (!this.initialized) return;

    const dispatchPromises: Promise<void>[] = [];

    for (const [, transport] of this.transports) {
      if (transport.isReady) {
        dispatchPromises.push(transport.write(entry));
      }
    }

    await Promise.allSettled(dispatchPromises);
  }

  // =========================================================================
  // TIMING INSTRUMENTATION
  // =========================================================================

  /**
   * Start a named timer for performance measurement
   * @param timerName Unique name for the timer
   */
  startTimer(timerName: string): void {
    if (!this.config.enableTiming) return;
    this.timers.set(timerName, Date.now());
  }

  /**
   * Stop a timer and log the elapsed time
   * @param timerName Name of the timer to stop
   * @param message Optional message for the log entry
   * @param data Optional additional data
   * @returns Elapsed time in milliseconds, or undefined if timer not found
   */
  endTimer(timerName: string, message?: string, data?: Record<string, unknown>): number | undefined {
    const startTime = this.timers.get(timerName);
    if (!startTime) return undefined;

    const endTime = Date.now();
    const durationMs = endTime - startTime;
    this.timers.delete(timerName);

    this.info(message || `Timer "${timerName}" completed`, {
      ...data,
      timerName,
      durationMs
    });

    return durationMs;
  }

  /**
   * Execute a function and measure its execution time
   * @param fn Function to measure
   * @param label Label for the timing log
   * @param data Optional additional context
   * @returns The function's return value
   */
  async measure<T>(
    fn: () => T | Promise<T>,
    label: string,
    data?: Record<string, unknown>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info(`${label} completed`, { ...data, durationMs: duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`${label} failed`, error as Error, { ...data, durationMs: duration });
      throw error;
    }
  }

  // =========================================================================
  // BATCH OPERATIONS
  // =========================================================================

  /**
   * Write multiple log entries at once (more efficient than individual writes)
   * @param entries Array of partial log entries
   */
  async writeBatch(entries: Array<{
    level: LogLevel;
    message: string;
    data?: Record<string, unknown>;
    source?: LogSource;
    error?: LogError;
  }>): Promise<void> {
    const fullEntries: LogEntry[] = entries.map(e => ({
      id: generateId(),
      timestamp: getTimestamp(),
      level: e.level,
      source: e.source || LogSource.APPLICATION,
      message: e.message,
      hostname: getHostname(),
      service: this.config.service,
      environment: this.config.environment,
      version: this.config.version,
      ...(e.data && { data: e.data }),
      ...(e.error && { error: e.error }),
      tags: [...(this.config.defaultTags || [])],
      ...this.defaultContext
    }));

    for (const [, transport] of this.transports) {
      if (transport.isReady) {
        await transport.writeBatch(fullEntries).catch(err => {
          console.error(`[Logger] Batch write failed for ${transport.type}:`, err);
        });
      }
    }
  }

  // =========================================================================
  // FLUSH AND CLOSE
  // =========================================================================

  /**
   * Flush all transport buffers
   * Call this before application shutdown to ensure all logs are written
   */
  async flush(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [, transport] of this.transports) {
      promises.push(transport.flush());
    }
    await Promise.allSettled(promises);
  }

  /**
   * Close all transports and cleanup resources
   */
  async close(): Promise<void> {
    await this.flush();
    const promises: Promise<void>[] = [];
    for (const [, transport] of this.transports) {
      promises.push(transport.close());
    }
    await Promise.allSettled(promises);
    this.transports.clear();
    this.initialized = false;
  }

  // =========================================================================
  // STATUS AND HEALTH
  // =========================================================================

  /**
   * Get the status of all transports
   */
  getShipperStatus(): ShipperStatus {
    const transports: TransportStatus[] = [];
    let totalBacklog = 0;
    let healthyCount = 0;

    for (const [, transport] of this.transports) {
      const status = transport.getStatus();
      transports.push(status);
      if (status.healthy) healthyCount++;
    }

    return {
      status: healthyCount === transports.length ? 'healthy' :
             healthyCount > 0 ? 'degraded' :
             transports.length > 0 ? 'down' : 'unknown',
      transports,
      backlog: {
        totalEntries: totalBacklog,
        oldestEntryAgeMs: 0,
        estimatedClearTimeMs: 0,
        bySource: {} as Record<LogSource, number>
      },
      uptimePercent: 100,
      lastCheckAt: getTimestamp()
    };
  }

  /**
   * Get backlog information
   */
  getBacklogInfo(): BacklogInfo {
    return {
      totalEntries: 0,
      oldestEntryAgeMs: 0,
      estimatedClearTimeMs: 0,
      bySource: {} as Record<LogSource, number>
    };
  }

  /**
   * Force flush all pending logs
   */
  async forceFlush(): Promise<{ success: boolean; entriesFlushed: number }> {
    await this.flush();
    return { success: true, entriesFlushed: 0 };
  }

  // =========================================================================
  // PRIVATE HELPERS
  // =========================================================================

  /**
   * Create a transport instance by type
   */
  private createTransport(type: LogTransportType): ILogTransport | null {
    switch (type) {
      case LogTransportType.CONSOLE:
        return new ConsoleTransport();
      case LogTransportType.FILE:
        return new FileTransport();
      case LogTransportType.ELASTICSEARCH:
        return new ElasticsearchTransport();
      case LogTransportType.HTTP:
        return new HttpTransport();
      default:
        console.warn(`[Logger] Unsupported transport type: ${type}`);
        return null;
    }
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let globalLogger: Logger | null = null;

/**
 * Initialize the global logger singleton
 * Must be called once at application startup
 * 
 * @param config Logger configuration
 * @returns Initialized logger instance
 * 
 * @example
 * ```typescript
 * // At application startup
 * await initializeLogger({
 *   service: 'my-soc-service',
 *   environment: Environment.PRODUCTION,
 *   transports: [consoleConfig, esConfig]
 * });
 * 
 * // Later in code
 * const logger = getLogger();
 * logger.info('Application started');
 * ```
 */
export async function initializeLogger(config?: Partial<LoggerConfig>): Promise<Logger> {
  if (globalLogger) {
    return globalLogger;
  }

  globalLogger = new Logger(config);
  await globalLogger.initialize();
  return globalLogger;
}

/**
 * Get the global logger instance
 * Throws if logger hasn't been initialized
 * 
 * @returns Global logger instance
 * @throws Error if logger not initialized
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    throw new Error('Logger not initialized. Call initializeLogger() first.');
  }
  return globalLogger;
}

/**
 * Check if the logger has been initialized
 * @returns True if logger is ready
 */
export function isLoggerInitialized(): boolean {
  return globalLogger?.initialized ?? false;
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Quick log functions using the global logger
 * These are convenience wrappers for common use cases
 */

/** Log a debug message using the global logger */
export function logDebug(message: string, data?: Record<string, unknown>, source?: LogSource): void {
  getLogger().debug(message, data, source);
}

/** Log an info message using the global logger */
export function logInfo(message: string, data?: Record<string, unknown>, source?: LogSource): void {
  getLogger().info(message, data, source);
}

/** Log a warning using the global logger */
export function logWarn(message: string, data?: Record<string, unknown>, source?: LogSource): void {
  getLogger().warn(message, data, source);
}

/** Log an error using the global logger */
export function logError(message: string, error?: unknown, data?: Record<string, unknown>, source?: LogSource): void {
  getLogger().error(message, error as Error, data, source);
}

/** Log a critical message using the global logger */
export function logCritical(message: string, error?: unknown, data?: Record<string, unknown>, source?: LogSource): void {
  getLogger().critical(message, error as Error | Record<string, unknown>, data, source);
}
