/**
 * National SOC Platform - BSS (Business Support Systems) Integration
 * 
 * Comprehensive integration layer for Djezzy Business Support Systems:
 * - Billing System Integration (CDR Processing, Revenue Assurance)
 * - Customer Management Interface (CRM Sync)
 * - Product Catalog Synchronization
 * - Order Management Integration
 * - Revenue Assurance Analytics
 * - Fraud-Billing Correlation Engine
 * - Subscriber Data Privacy Compliance (ANOR/ARPT Regulations)
 * 
 * @version 1.0.0
 * @module bss-integration
 */

import { db } from '@/lib/db';

// ============================================================
// Constants & Configuration
// ============================================================

export const BSS_CONFIG = {
  // Algerian numbering plan configuration
  NUMBERING_PLAN: {
    countryPrefix: '+213',
    countryCode: '213',
    mobilePrefixes: ['05', '06', '07'],
    djezzyRanges: ['055', '056', '066', '067', '077', '078', '079'],
    emergencyNumbers: ['14', '17', '1021', '112', '1055'],
    shortCodes: ['555', '777', '888', '1000', '1234']
  },
  
  // ANOR/ARPT compliance settings
  COMPLIANCE: {
    dataRetentionDays: 1095, // 3 years as per ARPT regulations
    fraudReportDeadlineHours: 72,
    subscriberDataEncryptionRequired: true,
    auditLogRetentionDays: 1825, // 5 years for audit logs
    privacyMaskFields: ['msisdn', 'imsi', 'imei', 'fullName', 'address'],
  },
  
  // Billing thresholds (in DZD)
  BILLING_THRESHOLDS: {
    highValueTransaction: 50000,
    suspiciousDailyUsage: 100000,
    internationalCallThreshold: 20000,
    roamingDailyLimit: 150000,
    prepaidBalanceWarning: 50,
  },
  
  // API rate limiting
  RATE_LIMITS: {
    queriesPerMinute: 60,
    bulkExportPerHour: 10,
    syncOperationsPerDay: 100,
  }
} as const;

// ============================================================
// Type Definitions
// ============================================================

export interface SubscriberProfile {
  msisdn: string;
  imsi?: string;
  imei?: string;
  fullName?: string;
  status: SubscriberStatusType;
  type: 'PREPAID' | 'POSTPAID' | 'HYBRID';
  segment: 'CONSUMER' | 'BUSINESS' | 'GOVERNMENT' | 'CORPORATE' | 'VIP';
  tariffPlan: string;
  activationDate: Date;
  lastActivityDate: Date;
  balance?: number; // For prepaid in DZD
  creditLimit?: number; // For postpaid in DZD
  arpu30d: number; // Average Revenue Per User (30 days) in DZD
  riskScore: number;
  isRoaming: boolean;
  isHighValue: boolean;
  consentFlags: ConsentFlags;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsentFlags {
  marketingConsent: boolean;
  dataSharingConsent: boolean;
  locationTrackingConsent: boolean;
  thirdPartyConsent: boolean;
  analyticsConsent: boolean;
}

export type SubscriberStatusType = 
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'DEACTIVATED'
  | 'BARRED'
  | 'PENDING_ACTIVATION'
  | 'TERMINATED';

export interface CDRRecord {
  id: string;
  recordType: 'VOICE' | 'SMS' | 'DATA' | 'VAS' | 'ROAMING' | 'INTERNATIONAL';
  callId?: string;
  callingParty: string;
  calledParty: string;
  startTime: Date;
  endTime?: Date;
  durationSeconds?: number;
  volumeBytes?: number;
  chargeAmount: number; // In DZD (milliunits)
  currency: 'DZD';
  ratingGroup: string;
  serviceCode: string;
  cellId?: string;
  lac?: string;
  isRoaming: boolean;
  isInternational: boolean;
  operatorCode?: string;
  imsi?: string;
  imei?: string;
  fraudIndicators?: string[];
  processedAt: Date;
  billingCycleId: string;
}

export interface BillingAccount {
  accountId: string;
  msisdn: string;
  accountType: 'PREPAID' | 'POSTPAID';
  currentBalance: number; // DZD milliunits
  availableCredit: number;
  creditLimit: number;
  billingCycleStart: Date;
  billingCycleEnd: Date;
  lastInvoiceAmount?: number;
  paymentHistory: PaymentRecord[];
  outstandingInvoices: InvoiceRecord[];
  autoPayEnabled: boolean;
  paymentMethod?: string;
  dunningLevel: number;
  lastPaymentDate?: Date;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: 'DZD';
  paymentMethod: string;
  paymentDate: Date;
  referenceNumber: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED';
}

export interface InvoiceRecord {
  invoiceId: string;
  amount: number;
  dueDate: Date;
  issueDate: Date;
  status: 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'DISPUTED';
  items: InvoiceItem[];
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  taxRate: number;
  taxAmount: number;
}

export interface RevenueAssuranceMetrics {
  period: {
    start: Date;
    end: Date;
  };
  totalRevenue: number;
  expectedRevenue: number;
  revenueLeakage: number;
  leakagePercentage: number;
  byCategory: {
    voice: { actual: number; expected: number; variance: number };
    sms: { actual: number; expected: number; variance: number };
    data: { actual: number; expected: number; variance: number };
    roaming: { actual: number; expected: number; variance: number };
    vas: { actual: number; expected: number; variance: number };
    interconnect: { actual: number; expected: number; variance: number };
  };
  topLeakageSources: LeakageSource[];
  fraudImpact: FraudFinancialImpact;
  complianceStatus: ComplianceStatus;
}

export interface LeakageSource {
  category: string;
  estimatedLoss: number;
  affectedRecords: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  remediationAction: string;
}

export interface FraudFinancialImpact {
  detectedFraudAmount: number;
  recoveredAmount: number;
  writeOffAmount: number;
  pendingInvestigation: number;
  byFraudType: Record<string, number>;
}

export interface ComplianceStatus {
  anorCompliant: boolean;
  arptCompliant: boolean;
  gdprAligned: boolean;
  pendingReports: number;
  overdueReports: number;
  nextAuditDate: Date;
  findings: ComplianceFinding[];
}

export interface ComplianceFinding {
  id: string;
  regulation: string;
  severity: 'INFO' | 'WARNING' | 'VIOLATION' | 'CRITICAL';
  description: string;
  remediationDeadline: Date;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED';
  reportedToRegulator: boolean;
}

export interface OrderRecord {
  orderId: string;
  orderType: 'NEW_SUBSCRIPTION' | 'PORT_IN' | 'PORT_OUT' | 'PLAN_CHANGE' | 'VAS_ACTIVATION' | 'SIM_REPLACEMENT' | 'TERMINATION';
  msisdn: string;
  customerName: string;
  status: 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdAt: Date;
  completedAt?: Date;
  items: OrderItem[];
  value: number;
  channel: 'RETAIL' | 'ONLINE' | 'CALL_CENTER' | 'PARTNER' | 'CORPORATE';
  assignedAgent?: string;
}

export interface OrderItem {
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  status: 'PENDING' | 'PROVISIONED' | 'ACTIVE' | 'FAILED';
}

export interface ProductCatalogEntry {
  productId: string;
  productName: string;
  productType: 'TARIFF_PLAN' | 'VAS' | 'BUNDLE' | 'DEVICE' | 'ADD_ON';
  category: string;
  price: number;
  currency: 'DZD';
  validityPeriod?: string;
  targetSegment: string;
  isActive: boolean;
  effectiveDate: Date;
  expiryDate?: Date;
  features: string[];
  restrictions?: string[];
}

export interface CRMEvent {
  eventId: string;
  eventType: 'CONTACT' | 'COMPLAINT' | 'INQUIRY' | 'FEEDBACK' | 'DISPUTE' | 'RETENTION';
  msisdn: string;
  timestamp: Date;
  channel: string;
  agentId?: string;
  summary: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED' | 'CLOSED';
  resolutionNotes?: string;
  satisfactionScore?: number;
}

export interface FraudBillingCorrelation {
  correlationId: string;
  fraudCaseId: string;
  cdrIds: string[];
  subscriberMsisdn: string;
  correlationType: 'IRSF' | 'WANGIRI' | 'PBX_HACK' | 'PREMIUM_RATE' | 'CLIPPING' | 'SUBSCRIPTION_FRAUD';
  financialImpact: number;
  confidence: number;
  evidence: CorrelationEvidence[];
  detectedAt: Date;
  status: 'DETECTED' | 'INVESTIGATING' | 'CONFIRMED' | 'FALSE_POSITIVE' | 'ESCALATED';
  recommendedActions: string[];
}

export interface CorrelationEvidence {
  type: 'CDR_PATTERN' | 'CALL_FREQUENCY' | 'DESTINATION_CLUSTER' | 'TIME_PATTERN' | 'VOLUME_ANOMALY';
  description: string;
  weight: number;
  details: Record<string, unknown>;
}

// ============================================================
// Custom Error Classes
// ============================================================

export class BSSIntegrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BSSIntegrationError';
  }
}

export class BillingSystemError extends BSSIntegrationError {
  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message, code, 502, details);
    this.name = 'BillingSystemError';
  }
}

export class CRMIntegrationError extends BSSIntegrationError {
  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message, code, 502, details);
    this.name = 'CRMIntegrationError';
  }
}

export class ComplianceViolationError extends BSSIntegrationError {
  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message, code, 403, details);
    this.name = 'ComplianceViolationError';
  }
}

export class RateLimitExceededError extends BSSIntegrationError {
  constructor(operation: string) {
    super(
      `Rate limit exceeded for operation: ${operation}`,
      'RATE_LIMIT_EXCEEDED',
      429,
      { operation }
    );
    this.name = 'RateLimitExceededError';
  }
}

// ============================================================
// Cache Layer
// ============================================================

class BSSCache {
  private cache = new Map<string, { data: unknown; expiresAt: number }>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: unknown, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs || this.defaultTTL);
    this.cache.set(key, { data, expiresAt });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const bssCache = new BSSCache();

// ============================================================
// Audit Logger
// ============================================================

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'DENIED';
}

class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private readonly maxLogs = 10000;

  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const logEntry: AuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.logs.push(logEntry);

    // Keep only recent logs in memory
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs / 2);
    }

    // In production, persist to database or SIEM
    console.log(`[BSS-AUDIT] ${entry.action} on ${entry.resource}: ${entry.outcome}`);
  }

  async getLogs(filters?: {
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    outcome?: string;
  }): Promise<AuditLogEntry[]> {
    let filtered = [...this.logs];

    if (filters?.action) {
      filtered = filtered.filter(l => l.action === filters.action);
    }
    if (filters?.resource) {
      filtered = filtered.filter(l => l.resource === filters.resource);
    }
    if (filters?.startDate) {
      filtered = filtered.filter(l => l.timestamp >= filters.startDate!);
    }
    if (filters?.endDate) {
      filtered = filtered.filter(l => l.timestamp <= filters.endDate!);
    }
    if (filters?.outcome) {
      filtered = filtered.filter(l => l.outcome === filters.outcome);
    }

    return filtered.reverse(); // Most recent first
  }
}

export const auditLogger = new AuditLogger();

// ============================================================
// Rate Limiter
// ============================================================

class RateLimiter {
  private counters = new Map<string, { count: number; resetAt: number }>();

  check(key: string, limit: number, windowMs: number = 60000): boolean {
    const now = Date.now();
    const counter = this.counters.get(key);

    if (!counter || now > counter.resetAt) {
      this.counters.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (counter.count >= limit) {
      return false;
    }

    counter.count++;
    return true;
  }

  getRemaining(key: string, limit: number): number {
    const counter = this.counters.get(key);
    if (!counter) return limit;
    return Math.max(0, limit - counter.count);
  }
}

export const rateLimiter = new RateLimiter();

// ============================================================
// MSISDN Validation & Formatting
// ============================================================

export function formatMSISDN(msisdn: string): string {
  // Remove all non-digit characters
  const digits = msisdn.replace(/\D/g, '');

  // Handle different formats
  if (digits.startsWith('00213')) {
    return `+${digits.slice(2)}`;
  } else if (digits.startsWith('213')) {
    return `+${digits}`;
  } else if (digits.startsWith('0')) {
    return `+213${digits.slice(1)}`;
  }

  return `+${digits}`;
}

export function validateMSISDN(msisdn: string): { valid: boolean; normalized?: string; error?: string } {
  const formatted = formatMSISDN(msisdn);
  const digits = formatted.replace(/\D/g, '');

  // Must be +213 followed by 9 digits (total 12 digits with +)
  if (digits.length !== 12) {
    return { valid: false, error: 'Invalid MSISDN length. Expected 9 digits after country code.' };
  }

  if (!digits.startsWith('213')) {
    return { valid: false, error: 'MSISDN must use Algerian country code (+213)' };
  }

  const nationalNumber = digits.slice(3);
  const prefix = nationalNumber.slice(0, 2);

  if (!BSS_CONFIG.NUMBERING_PLAN.mobilePrefixes.includes(prefix)) {
    return { valid: false, error: `Invalid mobile prefix: ${prefix}. Valid prefixes: ${BSS_CONFIG.NUMBERING_PLAN.mobilePrefixes.join(', ')}` };
  }

  return { valid: true, normalized: formatted };
}

export function maskMSISDN(msisdn: string, showLast: number = 4): string {
  const formatted = formatMSISDN(msisdn);
  const visible = formatted.slice(-showLast);
  return `${formatted.slice(0, -showLast).replace(/\d/g, '*')}${visible}`;
}

// ============================================================
// Main BSS Integration Class
// ============================================================

export class BSSIntegration {
  private static instance: BSSIntegration;

  private constructor() {}

  static getInstance(): BSSIntegration {
    if (!BSSIntegration.instance) {
      BSSIntegration.instance = new BSSIntegration();
    }
    return BSSIntegration.instance;
  }

  // ============================================================
  // Subscriber Management
  // ============================================================

  async getSubscriber(msisdn: string, options?: { includeBilling?: boolean; includeConsent?: boolean }): Promise<SubscriberProfile> {
    const normalized = validateMSISDN(msisdn);
    if (!normalized.valid) {
      throw new BSSIntegrationError(normalized.error!, 'INVALID_MSISDN', 400);
    }

    // Check cache first
    const cacheKey = `subscriber:${normalized.normalized}`;
    const cached = bssCache.get<SubscriberProfile>(cacheKey);
    if (cached) {
      return cached;
    }

    // Check rate limit
    if (!rateLimiter.check(`subscriber_lookup`, BSS_CONFIG.RATE_LIMITS.queriesPerMinute)) {
      throw new RateLimitExceededError('subscriber_lookup');
    }

    try {
      // Query from database (simulated integration)
      const subscriber = await db.subscriber.findUnique({
        where: { msisdn: normalized.normalized },
        include: options?.includeBilling ? {
          gtpSessions: { take: 5, orderBy: { startedAt: 'desc' } },
          sipSessions: { take: 5, orderBy: { connectTimestamp: 'desc' } }
        } : undefined
      });

      if (!subscriber) {
        throw new BSSIntegrationError('Subscriber not found', 'SUBSCRIBER_NOT_FOUND', 404);
      }

      const profile: SubscriberProfile = {
        msisdn: subscriber.msisdn,
        imsi: subscriber.imsi,
        imei: subscriber.imei || undefined,
        status: subscriber.subscriberStatus as SubscriberStatusType,
        type: subscriber.imsiType === 'PREPAID' ? 'PREPAID' : 
              subscriber.imsiType === 'POSTPAID' ? 'POSTPAID' : 'HYBRID',
        segment: this.determineSegment(subscriber),
        tariffPlan: subscriber.tariffPlan || 'DEFAULT',
        activationDate: subscriber.createdAt,
        lastActivityDate: subscriber.lastActivityAt || subscriber.updatedAt,
        arpu30d: this.calculateARPU(subscriber),
        riskScore: subscriber.riskScore,
        isRoaming: subscriber.roamingStatus !== 'HOME',
        isHighValue: subscriber.riskScore < 20 && subscriber.subscriberStatus === 'ACTIVE',
        consentFlags: {
          marketingConsent: true,
          dataSharingConsent: false,
          locationTrackingConsent: false,
          thirdPartyConsent: false,
          analyticsConsent: true
        },
        createdAt: subscriber.createdAt,
        updatedAt: subscriber.updatedAt
      };

      // Cache the result
      bssCache.set(cacheKey, profile, 3 * 60 * 1000); // 3 min cache

      auditLogger.log({
        action: 'GET_SUBSCRIBER',
        resource: 'Subscriber',
        resourceId: normalized.normalized,
        details: { msisdn: maskMSISDN(normalized.normalized) },
        outcome: 'SUCCESS'
      });

      return profile;
    } catch (error) {
      if (error instanceof BSSIntegrationError) throw error;
      
      auditLogger.log({
        action: 'GET_SUBSCRIBER',
        resource: 'Subscriber',
        resourceId: normalized.normalized,
        details: { error: error instanceof Error ? error.message : 'Unknown' },
        outcome: 'FAILURE'
      });
      
      throw new BillingSystemError(
        'Failed to retrieve subscriber information',
        'BILLING_SYSTEM_ERROR',
        { originalError: error instanceof Error ? error.message : 'Unknown' }
      );
    }
  }

  async searchSubscribers(criteria: {
    msisdn?: string;
    imsi?: string;
    name?: string;
    status?: SubscriberStatusType;
    riskMin?: number;
    riskMax?: number;
    isRoaming?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ subscribers: SubscriberProfile[]; total: number }> {
    const limit = Math.min(criteria.limit || 50, 200);
    const offset = criteria.offset || 0;

    const where: Record<string, unknown> = {};

    if (criteria.msisdn) {
      const validated = validateMSISDN(criteria.msisdn);
      if (validated.valid) {
        where.msisdn = { contains: validated.normalized!.replace('+', '') };
      }
    }

    if (criteria.imsi) {
      where.imsi = criteria.imsi;
    }

    if (criteria.status) {
      where.subscriberStatus = criteria.status;
    }

    if (criteria.riskMin !== undefined || criteria.riskMax !== undefined) {
      where.riskScore = {};
      if (criteria.riskMin !== undefined) (where.riskScore as Record<string, unknown>).gte = criteria.riskMin;
      if (criteria.riskMax !== undefined) (where.riskScore as Record<string, unknown>).lte = criteria.riskMax;
    }

    try {
      const [subscribers, total] = await Promise.all([
        db.subscriber.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          take: limit,
          skip: offset
        }),
        db.subscriber.count({ where })
      ]);

      const profiles = await Promise.all(
        subscribers.map(s => this.getSubscriber(s.msisdn))
      );

      return { subscribers: profiles, total };
    } catch (error) {
      throw new BillingSystemError(
        'Failed to search subscribers',
        'SEARCH_ERROR',
        { originalError: error instanceof Error ? error.message : 'Unknown' }
      );
    }
  }

  async updateSubscriberConsent(msisdn: string, updates: Partial<ConsentFlags>, userId: string): Promise<ConsentFlags> {
    const normalized = validateMSISDN(msisdn);
    if (!normalized.valid) {
      throw new BSSIntegrationError(normalized.error!, 'INVALID_MSISDN', 400);
    }

    // Log consent changes for ANOR/ARPT compliance
    auditLogger.log({
      action: 'UPDATE_CONSENT',
      resource: 'SubscriberConsent',
      resourceId: normalized.normalized,
      details: { 
        updatedFields: Object.keys(updates),
        performedBy: userId
      },
      outcome: 'SUCCESS'
    });

    // Return updated consent flags (would be persisted in real system)
    return {
      marketingConsent: updates.marketingConsent ?? true,
      dataSharingConsent: updates.dataSharingConsent ?? false,
      locationTrackingConsent: updates.locationTrackingConsent ?? false,
      thirdPartyConsent: updates.thirdPartyConsent ?? false,
      analyticsConsent: updates.analyticsConsent ?? true
    };
  }

  // ============================================================
  // CDR Processing & Billing
  // ============================================================

  async queryCDRs(filters: {
    msisdn?: string;
    recordType?: CDRRecord['recordType'][];
    startDate?: Date;
    endDate?: Date;
    isRoaming?: boolean;
    isInternational?: boolean;
    minAmount?: number;
    maxAmount?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ cdrs: CDRRecord[]; total: number; summary: CDRSummary }> {
    const limit = Math.min(filters.limit || 50, 500);
    const offset = filters.offset || 0;

    // Build query conditions
    const where: Record<string, unknown> = {};

    if (filters.msisdn) {
      const validated = validateMSISDN(filters.msisdn);
      if (validated.valid) {
        where.OR = [
          { callingParty: { contains: validated.normalized! } },
          { calledParty: { contains: validated.normalized! } }
        ];
      }
    }

    if (filters.startDate || filters.endDate) {
      where.startTime = {};
      if (filters.startDate) (where.startTime as Record<string, unknown>).gte = filters.startDate;
      if (filters.endDate) (where.startTime as Record<string, unknown>).lte = filters.endDate;
    }

    if (filters.isRoaming !== undefined) {
      where.isRoaming = filters.isRoaming;
    }

    if (filters.isInternational !== undefined) {
      where.isInternational = filters.isInternational;
    }

    try {
      // Simulated CDR query - would integrate with actual billing system
      const mockCdrs = this.generateMockCDRs(limit, filters);
      const summary = this.calculateCDRSummary(mockCdrs);

      auditLogger.log({
        action: 'QUERY_CDRS',
        resource: 'CDR',
        details: { 
          filterCount: Object.keys(filters).length,
          resultCount: mockCdrs.length
        },
        outcome: 'SUCCESS'
      });

      return {
        cdrs: mockCdrs,
        total: mockCdrs.length + offset + Math.floor(Math.random() * 100),
        summary
      };
    } catch (error) {
      throw new BillingSystemError(
        'Failed to query CDRs',
        'CDR_QUERY_ERROR',
        { originalError: error instanceof Error ? error.message : 'Unknown' }
      );
    }
  }

  async processCDR(cdr: Partial<CDRRecord>): Promise<CDRRecord> {
    // Validate required fields
    if (!cdr.callingParty && !cdr.calledParty) {
      throw new BSSIntegrationError('Calling party or called party is required', 'INVALID_CDR', 400);
    }

    // Validate MSISDNs
    if (cdr.callingParty) {
      const validation = validateMSISDN(cdr.callingParty);
      if (!validation.valid) {
        throw new BSSIntegrationError(validation.error!, 'INVALID_CALLING_PARTY', 400);
      }
    }

    // Create CDR record
    const processedCdr: CDRRecord = {
      id: `cdr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recordType: cdr.recordType || 'VOICE',
      callId: cdr.callId,
      callingParty: formatMSISDN(cdr.callingParty!),
      calledParty: formatMSISDN(cdr.calledParty!),
      startTime: cdr.startTime || new Date(),
      endTime: cdr.endTime,
      durationSeconds: cdr.durationSeconds,
      volumeBytes: cdr.volumeBytes,
      chargeAmount: cdr.chargeAmount || 0,
      currency: 'DZD',
      ratingGroup: cdr.ratingGroup || 'DEFAULT',
      serviceCode: cdr.serviceCode || 'VOICE',
      cellId: cdr.cellId,
      lac: cdr.lac,
      isRoaming: cdr.isRoaming || false,
      isInternational: cdr.isInternational || false,
      operatorCode: cdr.operatorCode,
      imsi: cdr.imsi,
      imei: cdr.imei,
      fraudIndicators: cdr.fraudIndicators,
      processedAt: new Date(),
      billingCycleId: this.getCurrentBillingCycleId()
    };

    // Run fraud-billing correlation
    await this.correlateFraudWithBilling(processedCdr);

    auditLogger.log({
      action: 'PROCESS_CDR',
      resource: 'CDR',
      resourceId: processedCdr.id,
      details: {
        recordType: processedCdr.recordType,
        chargeAmount: processedCdr.chargeAmount,
        hasFraudIndicators: (processedCdr.fraudIndicators?.length || 0) > 0
      },
      outcome: 'SUCCESS'
    });

    return processedCdr;
  }

  // ============================================================
  // Revenue Assurance
  // ============================================================

  async getRevenueAssuranceMetrics(period: '24h' | '7d' | '30d' | '90d'): Promise<RevenueAssuranceMetrics> {
    const now = new Date();
    const periodMs = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    }[period];

    const startDate = new Date(now.getTime() - periodMs);

    // Check cache
    const cacheKey = `revenue_assurance:${period}`;
    const cached = bssCache.get<RevenueAssuranceMetrics>(cacheKey);
    if (cached) {
      return cached;
    }

    // Generate metrics (simulated - would come from actual billing/revenue systems)
    const metrics: RevenueAssuranceMetrics = {
      period: { start: startDate, end: now },
      totalRevenue: Math.floor(Math.random() * 5000000000) + 3000000000, // 3-8 billion DZD
      expectedRevenue: Math.floor(Math.random() * 4800000000) + 3200000000,
      revenueLeakage: Math.floor(Math.random() * 200000000), // Up to 200 million DZD leakage
      leakagePercentage: Math.random() * 3 + 0.5, // 0.5% - 3.5%
      byCategory: {
        voice: {
          actual: Math.floor(Math.random() * 2000000000) + 1000000000,
          expected: Math.floor(Math.random() * 2100000000) + 1100000000,
          variance: Math.floor(Math.random() * 100000000) - 50000000
        },
        sms: {
          actual: Math.floor(Math.random() * 300000000) + 100000000,
          expected: Math.floor(Math.random() * 310000000) + 110000000,
          variance: Math.floor(Math.random() * 20000000) - 10000000
        },
        data: {
          actual: Math.floor(Math.random() * 1500000000) + 800000000,
          expected: Math.floor(Math.random() * 1550000000) + 850000000,
          variance: Math.floor(Math.random() * 80000000) - 40000000
        },
        roaming: {
          actual: Math.floor(Math.random() * 500000000) + 200000000,
          expected: Math.floor(Math.random() * 520000000) + 220000000,
          variance: Math.floor(Math.random() * 30000000) - 15000000
        },
        vas: {
          actual: Math.floor(Math.random() * 200000000) + 80000000,
          expected: Math.floor(Math.random() * 210000000) + 90000000,
          variance: Math.floor(Math.random() * 15000000) - 7500000
        },
        interconnect: {
          actual: Math.floor(Math.random() * 400000000) + 200000000,
          expected: Math.floor(Math.random() * 420000000) + 220000000,
          variance: Math.floor(Math.random() * 25000000) - 12500000
        }
      },
      topLeakageSources: [
        {
          category: 'Rating Errors',
          estimatedLoss: Math.floor(Math.random() * 50000000) + 10000000,
          affectedRecords: Math.floor(Math.random() * 50000) + 10000,
          severity: 'high',
          description: 'Mismatch between tariff plan and applied rates',
          remediationAction: 'Run tariff reconciliation job'
        },
        {
          category: 'Unbilled Roaming',
          estimatedLoss: Math.floor(Math.random() * 30000000) + 5000000,
          affectedRecords: Math.floor(Math.random() * 20000) + 5000,
          severity: 'medium',
          description: 'TAP files not processed correctly',
          remediationAction: 'Reprocess TAP files from last 48h'
        },
        {
          category: 'CDR Duplication',
          estimatedLoss: Math.floor(Math.random() * 15000000) + 2000000,
          affectedRecords: Math.floor(Math.random() * 100000) + 20000,
          severity: 'low',
          description: 'Duplicate CDRs from dual-recording switches',
          remediationAction: 'Run deduplication process'
        }
      ],
      fraudImpact: {
        detectedFraudAmount: Math.floor(Math.random() * 100000000) + 20000000,
        recoveredAmount: Math.floor(Math.random() * 60000000) + 10000000,
        writeOffAmount: Math.floor(Math.random() * 20000000) + 5000000,
        pendingInvestigation: Math.floor(Math.random() * 30000000) + 10000000,
        byFraudType: {
          'IRSF': Math.floor(Math.random() * 30000000) + 10000000,
          'WANGIRI': Math.floor(Math.random() * 15000000) + 3000000,
          'PBX_HACK': Math.floor(Math.random() * 20000000) + 5000000,
          'CLIPPING': Math.floor(Math.random() * 10000000) + 2000000,
          'PREMIUM_RATE': Math.floor(Math.random() * 8000000) + 1000000
        }
      },
      complianceStatus: {
        anorCompliant: true,
        arptCompliant: true,
        gdprAligned: true,
        pendingReports: Math.floor(Math.random() * 3),
        overdueReports: 0,
        nextAuditDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        findings: []
      }
    };

    // Cache for 15 minutes
    bssCache.set(cacheKey, metrics, 15 * 60 * 1000);

    return metrics;
  }

  async runRevenueAssuranceCheck(): Promise<{
    issuesFound: number;
    criticalIssues: number;
    recommendations: string[];
    nextRunTime: Date;
  }> {
    // Simulate revenue assurance check
    const issuesFound = Math.floor(Math.random() * 20) + 5;
    const criticalIssues = Math.floor(Math.random() * 3);

    const recommendations = [
      'Review and reconcile TAP files from partner networks',
      'Verify tariff plan mappings for new promotions',
      'Audit CDR completeness from MSC switches',
      'Check interconnect settlement calculations',
      'Validate promotional bundle charging'
    ].slice(0, Math.floor(Math.random() * 4) + 2);

    auditLogger.log({
      action: 'REVENUE_ASSURANCE_CHECK',
      resource: 'RevenueAssurance',
      details: { issuesFound, criticalIssues },
      outcome: 'SUCCESS'
    });

    return {
      issuesFound,
      criticalIssues,
      recommendations,
      nextRunTime: new Date(Date.now() + 6 * 60 * 60 * 1000) // Next run in 6 hours
    };
  }

  // ============================================================
  // Fraud-Billing Correlation Engine
  // ============================================================

  async correlateFraudWithBilling(cdr: CDRRecord): Promise<FraudBillingCorrelation[]> {
    const correlations: FraudBillingCorrelation[] = [];

    // IRSF Detection - High value international calls
    if (cdr.isInternational && cdr.chargeAmount > BSS_CONFIG.BILLING_THRESHOLDS.internationalCallThreshold) {
      correlations.push({
        correlationId: `corr_irsf_${Date.now()}`,
        fraudCaseId: `fraud_irsf_${Date.now()}`,
        cdrIds: [cdr.id],
        subscriberMsisdn: cdr.callingParty,
        correlationType: 'IRSF',
        financialImpact: cdr.chargeAmount,
        confidence: 75 + Math.random() * 20,
        evidence: [{
          type: 'CDR_PATTERN',
          description: 'High-value international call exceeding threshold',
          weight: 0.8,
          details: { threshold: BSS_CONFIG.BILLING_THRESHOLDS.internationalCallThreshold, actual: cdr.chargeAmount }
        }],
        detectedAt: new Date(),
        status: 'DETECTED',
        recommendedActions: [
          'Verify call legitimacy with subscriber',
          'Check for SIM swap activity',
          'Review calling patterns'
        ]
      });
    }

    // Wangiri detection - Short calls to premium destinations
    if (cdr.durationSeconds !== undefined && cdr.durationSeconds < 10 && cdr.chargeAmount > 50) {
      correlations.push({
        correlationId: `corr_wangiri_${Date.now()}`,
        fraudCaseId: `fraud_wangiri_${Date.now()}`,
        cdrIds: [cdr.id],
        subscriberMsisdn: cdr.calledParty,
        correlationType: 'WANGIRI',
        financialImpact: cdr.chargeAmount,
        confidence: 65 + Math.random() * 25,
        evidence: [{
          type: 'CALL_FREQUENCY',
          description: 'Short duration call with unusual charge pattern',
          weight: 0.6,
          details: { duration: cdr.durationSeconds, charge: cdr.chargeAmount }
        }],
        detectedAt: new Date(),
        status: 'DETECTED',
        recommendedActions: [
          'Analyze callback patterns',
          'Check destination reputation',
          'Monitor for repeat patterns'
        ]
      });
    }

    // Roaming abuse detection
    if (cdr.isRoaming && cdr.chargeAmount > BSS_CONFIG.BILLING_THRESHOLDS.roamingDailyLimit * 0.5) {
      correlations.push({
        correlationId: `corr_roaming_${Date.now()}`,
        fraudCaseId: `fraud_roaming_${Date.now()}`,
        cdrIds: [cdr.id],
        subscriberMsisdn: cdr.callingParty,
        correlationType: 'IRSF', // Often manifests as IRSF via roaming
        financialImpact: cdr.chargeAmount,
        confidence: 70 + Math.random() * 20,
        evidence: [{
          type: 'VOLUME_ANOMALY',
          description: 'High-value roaming transaction',
          weight: 0.7,
          details: { dailyLimit: BSS_CONFIG.BILLING_THRESHOLDS.roamingDailyLimit, actual: cdr.chargeAmount }
        }],
        detectedAt: new Date(),
        status: 'DETECTED',
        recommendedActions: [
          'Verify roaming legitimacy',
          'Check TADIG authorization',
          'Review roaming profile'
        ]
      });
    }

    return correlations;
  }

  async getFraudBillingCorrelations(filters?: {
    msisdn?: string;
    correlationType?: FraudBillingCorrelation['correlationType'];
    status?: FraudBillingCorrelation['status'];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<FraudBillingCorrelation[]> {
    // Simulated retrieval of correlations
    const count = filters?.limit || 20;
    
    const correlations: FraudBillingCorrelation[] = Array.from({ length: count }, (_, i) => ({
      correlationId: `corr_${Date.now()}_${i}`,
      fraudCaseId: `fraud_${Math.random().toString(36).substr(2, 8)}`,
      cdrIds: [`cdr_${Math.random().toString(36).substr(2, 12)}`],
      subscriberMsisdn: `+213${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      correlationType: (['IRSF', 'WANGIRI', 'PBX_HACK', 'PREMIUM_RATE', 'CLIPPING', 'SUBSCRIPTION_FRAUD'] as const)[
        Math.floor(Math.random() * 6)
      ],
      financialImpact: Math.floor(Math.random() * 500000) + 10000,
      confidence: 60 + Math.random() * 35,
      evidence: [],
      detectedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      status: (['DETECTED', 'INVESTIGATING', 'CONFIRMED', 'FALSE_POSITIVE'] as const)[
        Math.floor(Math.random() * 4)
      ],
      recommendedActions: []
    }));

    return correlations;
  }

  // ============================================================
  // Order Management
  // ============================================================

  async getOrders(filters?: {
    msisdn?: string;
    status?: OrderRecord['status'];
    type?: OrderRecord['orderType'];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: OrderRecord[]; total: number }> {
    const limit = Math.min(filters?.limit || 50, 200);
    const offset = filters?.offset || 0;

    // Simulated orders
    const orders: OrderRecord[] = Array.from({ length: Math.min(limit, 25) }, (_, i) => ({
      orderId: `ORD-${Date.now()}-${i.toString().padStart(4, '0')}`,
      orderType: (['NEW_SUBSCRIPTION', 'PORT_IN', 'PLAN_CHANGE', 'VAS_ACTIVATION', 'SIM_REPLACEMENT'] as const)[
        Math.floor(Math.random() * 5)
      ],
      msisdn: `+213${['55', '56', '66', '67', '77', '78', '79'][Math.floor(Math.random() * 7)]}${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
      customerName: `Customer ${i + 1}`,
      status: (['PENDING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'] as const)[
        Math.floor(Math.random() * 5)
      ],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      completedAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : undefined,
      items: [],
      value: Math.floor(Math.random() * 50000) + 500,
      channel: (['RETAIL', 'ONLINE', 'CALL_CENTER', 'PARTNER'] as const)[Math.floor(Math.random() * 4)]
    }));

    return { orders, total: orders.length + Math.floor(Math.random() * 100) };
  }

  async createOrder(order: Omit<OrderRecord, 'orderId' | 'createdAt' | 'status'>): Promise<OrderRecord> {
    const newOrder: OrderRecord = {
      ...order,
      orderId: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      status: 'PENDING',
      createdAt: new Date()
    };

    auditLogger.log({
      action: 'CREATE_ORDER',
      resource: 'Order',
      resourceId: newOrder.orderId,
      details: {
        orderType: order.orderType,
        msisdn: maskMSISDN(order.msisdn),
        value: order.value
      },
      outcome: 'SUCCESS'
    });

    return newOrder;
  }

  // ============================================================
  // Product Catalog
  // ============================================================

  async getProductCatalog(filters?: {
    type?: ProductCatalogEntry['productType'];
    activeOnly?: boolean;
    segment?: string;
  }): Promise<ProductCatalogEntry[]> {
    const cacheKey = `product_catalog:${JSON.stringify(filters)}`;
    const cached = bssCache.get<ProductCatalogEntry[]>(cacheKey);
    if (cached) return cached;

    // Simulated catalog
    const products: ProductCatalogEntry[] = [
      {
        productId: 'PKG-JAWAB-100GB',
        productName: 'Jawab 100GB',
        productType: 'BUNDLE',
        category: 'Data',
        price: 2500,
        currency: 'DZD',
        validityPeriod: '30 jours',
        targetSegment: 'CONSUMER',
        isActive: true,
        effectiveDate: new Date('2024-01-01'),
        features: ['100Go Data', 'Appels illimités vers Djezzy', '200 SMS nationaux']
      },
      {
        productId: 'PKG-HYPER-FLEX',
        productName: 'Hyper Flex',
        productType: 'TARIFF_PLAN',
        category: 'Hybrid',
        price: 1000,
        currency: 'DZD',
        validityPeriod: 'Renouvelable',
        targetSegment: 'CONSUMER',
        isActive: true,
        effectiveDate: new Date('2024-03-01'),
        features: ['Facturation à la seconde', 'Data reportable', 'Bonus fidélité']
      },
      {
        productId: 'VAS-CALLER-ID',
        productName: 'Présence du numéro',
        productType: 'VAS',
        category: 'Identification',
        price: 200,
        currency: 'DZD',
        validityPeriod: '30 jours',
        targetSegment: 'CONSUMER',
        isActive: true,
        effectiveDate: new Date('2023-06-01'),
        features: ['Affichage du numéro appelant']
      },
      {
        productId: 'PKG-BUSINESS-PRO',
        productName: 'Business Pro',
        productType: 'TARIFF_PLAN',
        category: 'Entreprise',
        price: 5000,
        currency: 'DZD',
        validityPeriod: 'Mensuel',
        targetSegment: 'BUSINESS',
        isActive: true,
        effectiveDate: new Date('2024-01-15'),
        features: ['Tarifs préférentiels', 'Support dédié', 'Facturation détaillée', 'Roaming inclus'],
        restrictions: ['Documents KBC requis', 'Minimum 3 lignes']
      },
      {
        productId: 'PKG-INTERNATIONAL-PREMIUM',
        packageName: 'International Premium',
        productType: 'BUNDLE',
        category: 'International',
        price: 3000,
        currency: 'DZD',
        validityPeriod: '30 jours',
        targetSegment: 'CONSUMER',
        isActive: true,
        effectiveDate: new Date('2024-02-01'),
        features: ['60 min vers l\'international', 'SMS internationaux', 'Réductions roaming']
      }
    ] as ProductCatalogEntry[];

    let filtered = products;
    
    if (filters?.type) {
      filtered = filtered.filter(p => p.productType === filters.type);
    }
    if (filters?.activeOnly) {
      filtered = filtered.filter(p => p.isActive);
    }
    if (filters?.segment) {
      filtered = filtered.filter(p => p.targetSegment === filters.segment);
    }

    bssCache.set(cacheKey, filtered, 10 * 60 * 1000); // 10 minute cache
    
    return filtered;
  }

  // ============================================================
  // CRM Integration
  // ============================================================

  async getCRMEvents(msisdn: string, filters?: {
    eventType?: CRMEvent['eventType'];
    status?: CRMEvent['status'];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<CRMEvent[]> {
    const validated = validateMSISDN(msisdn);
    if (!validated.valid) {
      throw new BSSIntegrationError(validated.error!, 'INVALID_MSISDN', 400);
    }

    const limit = filters?.limit || 20;

    // Simulated CRM events
    const events: CRMEvent[] = Array.from({ length: Math.min(limit, 15) }, (_, i) => ({
      eventId: `CRM-${Date.now()}-${i}`,
      eventType: (['CONTACT', 'COMPLAINT', 'INQUIRY', 'FEEDBACK', 'DISPUTE', 'RETENTION'] as const)[
        Math.floor(Math.random() * 6)
      ],
      msisdn: validated.normalized!,
      timestamp: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
      channel: (['RETAIL', 'CALL_CENTER', 'WHATSAPP', 'EMAIL', 'APP'] as const)[
        Math.floor(Math.random() * 5)
      ],
      agentId: `AGENT-${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`,
      summary: [
        'Client a demandé des informations sur le forfait',
        'Réclamation sur la facture du mois dernier',
        'Demande de changement de forfait',
        'Problème de couverture réseau signalé',
        'Question sur les options roaming'
      ][Math.floor(Math.random() * 5)],
      priority: (['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const)[Math.floor(Math.random() * 4)],
      status: (['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED', 'CLOSED'] as const)[
        Math.floor(Math.random() * 5)
      ],
      satisfactionScore: Math.random() > 0.3 ? Math.floor(Math.random() * 5) + 1 : undefined
    }));

    return events;
  }

  async createCRMEvent(event: Omit<CRMEvent, 'eventId' | 'timestamp' | 'status'>): Promise<CRMEvent> {
    const newEvent: CRMEvent = {
      ...event,
      eventId: `CRM-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      timestamp: new Date(),
      status: 'OPEN'
    };

    auditLogger.log({
      action: 'CREATE_CRM_EVENT',
      resource: 'CRMEvent',
      eventId: newEvent.eventId,
      details: {
        eventType: event.eventType,
        msisdn: maskMSISDN(event.msisdn),
        priority: event.priority
      },
      outcome: 'SUCCESS'
    });

    return newEvent;
  }

  // ============================================================
  // Compliance & Reporting (ANOR/ARPT)
  // ============================================================

  async getComplianceReport(): Promise<ComplianceStatus> {
    const now = new Date();

    return {
      anorCompliant: true,
      arptCompliant: true,
      gdprAligned: true,
      pendingReports: Math.floor(Math.random() * 3),
      overdueReports: 0,
      nextAuditDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
      findings: []
    };
  }

  async generateARTPReport(type: 'MONTHLY' | 'QUARTERLY' | 'INCIDENT' | 'FRAUD'): Promise<{
    reportId: string;
    generatedAt: Date;
    type: string;
    status: string;
    downloadUrl?: string;
  }> {
    const reportId = `ARTP-${type}-${nowToYYYYMMDD(new Date())}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    auditLogger.log({
      action: 'GENERATE_ARPT_REPORT',
      resource: 'ComplianceReport',
      resourceId: reportId,
      details: { reportType: type },
      outcome: 'SUCCESS'
    });

    return {
      reportId,
      generatedAt: new Date(),
      type,
      status: 'GENERATED',
      downloadUrl: `/api/telecom/bss/reports/${reportId}`
    };
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  private determineSegment(subscriber: { riskScore: number; msisdn: string }): SubscriberProfile['segment'] {
    // Simple segmentation logic - would be more sophisticated in production
    if (subscriber.riskScore < 10) return 'VIP';
    if (subscriber.msisdn.startsWith('+21377')) return 'BUSINESS'; // Business range
    return 'CONSUMER';
  }

  private calculateARPU(subscriber: { riskScore: number }): number {
    // Simulated ARPU calculation based on risk score inverse relationship
    const baseARPU = 1500; // Base ARPU in DZD
    const riskFactor = Math.max(0.3, 1 - (subscriber.riskScore / 100));
    return Math.floor(baseARPU * riskFactor + Math.random() * 500);
  }

  private getCurrentBillingCycleId(): string {
    const now = new Date();
    return `CYCLE-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  private generateMockCDRs(count: number, filters: Partial<typeof BSS_CONFIG.BILLING_THRESHOLDS>): CDRRecord[] {
    const types: CDRRecord['recordType'][] = ['VOICE', 'SMS', 'DATA', 'VAS', 'ROAMING', 'INTERNATIONAL'];
    
    return Array.from({ length: count }, (_, i) => ({
      id: `cdr_mock_${Date.now()}_${i}`,
      recordType: types[Math.floor(Math.random() * types.length)],
      callingParty: `+213${['55', '56', '66', '67', '77', '78', '79'][Math.floor(Math.random() * 7)]}${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
      calledParty: `+213${['55', '56', '66', '67', '77', '78', '79'][Math.floor(Math.random() * 7)]}${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
      startTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - Math.random() * 29 * 24 * 60 * 60 * 1000),
      durationSeconds: Math.floor(Math.random() * 3600),
      volumeBytes: Math.floor(Math.random() * 1000000000),
      chargeAmount: Math.floor(Math.random() * 5000) + 10,
      currency: 'DZD' as const,
      ratingGroup: 'DEFAULT',
      serviceCode: 'VOICE',
      cellId: `${Math.floor(Math.random() * 50000).toString().padStart(5, '0')}`,
      lac: `${Math.floor(Math.random() * 500).toString().padStart(3, '0')}`,
      isRoaming: Math.random() > 0.85,
      isInternational: Math.random() > 0.9,
      fraudIndicators: Math.random() > 0.95 ? ['HIGH_VALUE_INTERNATIONAL'] : undefined,
      processedAt: new Date(),
      billingCycleId: this.getCurrentBillingCycleId()
    }));
  }

  private calculateCDRSummary(cdrs: CDRRecord[]): CDRSummary {
    const totalCharge = cdrs.reduce((sum, cdr) => sum + cdr.chargeAmount, 0);
    const totalDuration = cdrs.reduce((sum, cdr) => sum + (cdr.durationSeconds || 0), 0);
    const totalVolume = cdrs.reduce((sum, cdr) => sum + (cdr.volumeBytes || 0), 0);

    return {
      totalRecords: cdrs.length,
      totalChargeAmount: totalCharge,
      averageChargePerRecord: cdrs.length > 0 ? totalCharge / cdrs.length : 0,
      totalDurationMinutes: Math.floor(totalDuration / 60),
      totalVolumeMB: Math.floor(totalVolume / (1024 * 1024)),
      byType: cdrs.reduce((acc, cdr) => {
        acc[cdr.recordType] = (acc[cdr.recordType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      roamingRecords: cdrs.filter(cdr => cdr.isRoaming).length,
      internationalRecords: cdrs.filter(cdr => cdr.isInternational).length,
      recordsWithFraudIndicators: cdrs.filter(cdr => cdr.fraudIndicators && cdr.fraudIndicators.length > 0).length
    };
  }
}

export interface CDRSummary {
  totalRecords: number;
  totalChargeAmount: number;
  averageChargePerRecord: number;
  totalDurationMinutes: number;
  totalVolumeMB: number;
  byType: Record<string, number>;
  roamingRecords: number;
  internationalRecords: number;
  recordsWithFraudIndicators: number;
}

function nowToYYYYMMDD(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

// Export singleton instance
export const bssIntegration = BSSIntegration.getInstance();
