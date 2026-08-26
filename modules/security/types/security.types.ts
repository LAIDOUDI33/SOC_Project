/**
 * Security Module Type Definitions
 * National SOC Platform for Algeria (2026-2030)
 * 
 * Comprehensive TypeScript types for security hardening, SSL/TLS configuration,
 * access control, compliance checking, and vulnerability management.
 * 
 * @module security/types
 * @version 1.0.0
 */

// ============================================================================
// SSL/TLS Certificate Types
// ============================================================================

/**
 * Supported certificate types for SOC platform
 */
export type CertificateType = 
  | 'RSA' 
  | 'ECDSA' 
  | 'ED25519' 
  | 'WILDCARD' 
  | 'SAN' 
  | 'LETS_ENCRYPT'
  | 'INTERNAL_CA'
  | 'EXTERNAL_CA';

/**
 * Certificate status enumeration
 */
export type CertificateStatus = 
  | 'valid' 
  | 'expired' 
  | 'revoked' 
  | 'pending' 
  | 'error' 
  | 'expiring_soon'
  | 'self_signed'
  | 'untrusted';

/**
 * TLS protocol versions
 */
export type TLSVersion = 
  | 'TLSv1.0' 
  | 'TLSv1.1' 
  | 'TLSv1.2' 
  | 'TLSv1.3';

/**
 * Key sizes and algorithms for certificates
 */
export interface KeySpecification {
  algorithm: 'RSA' | 'ECDSA' | 'ED25519';
  keySize: number; // RSA: 2048, 4096 / ECDSA: 256, 384, 521
  curve?: 'P-256' | 'P-384' | 'P-521'; // For ECDSA keys
}

/**
 * Subject Alternative Name entry
 */
export interface SANEntry {
  type: 'DNS' | 'IP' | 'email' | 'URI';
  value: string;
}

/**
 * X.509 Certificate information
 */
export interface Certificate {
  id: string;
  commonName: string;
  organization: string;
  organizationalUnit?: string;
  country: string;
  state?: string;
  locality?: string;
  type: CertificateType;
  status: CertificateStatus;
  issuer: string;
  serialNumber: string;
  fingerprintSHA256: string;
  fingerprintSHA1: string;
  validFrom: Date;
  validTo: Date;
  daysUntilExpiry: number;
  keySpec: KeySpecification;
  sanEntries: SANEntry[];
  subjectDN: string;
  issuerDN: string;
  version: number;
  signatureAlgorithm: string;
  publicKeyInfo: string;
  pemCertificate: string;
  pemPrivateKey?: string;
  chainCertificates?: string[];
  createdAt: Date;
  updatedAt: Date;
  lastCheckedAt: Date;
  metadata: Record<string, unknown>;
}

/**
 * Certificate Signing Request (CSR)
 */
export interface CSRRequest {
  commonName: string;
  organization: string;
  organizationalUnit?: string;
  country: string;
  state?: string;
  locality?: string;
  keySpec: KeySpecification;
  sanEntries: SANEntry[];
}

/**
 * CSR Response with generated data
 */
export interface CSRResponse {
  csr: string;
  privateKey: string;
  fingerprint: string;
  subject: string;
  createdAt: Date;
}

/**
 * TLS Configuration settings
 */
export interface TLSConfiguration {
  enabled: boolean;
  minVersion: TLSVersion;
  maxVersion: TLSVersion;
  cipherSuites: string[];
  preferredCipherSuites: string[];
  sessionTimeout: number; // seconds
  sessionTicketsEnabled: boolean;
  sessionTicketKeyRotationHours: number;
  ocspStapling: boolean;
  ocspStaplingVerify: boolean;
  certificateTransparency: boolean;
  staplingResponderTimeout: number;
  staplingResponderTTL: number;
  dhParamSize: number; // bits, e.g., 2048 or 4096
  ecdhCurve: string;
  serverNameIndication: boolean;
  clientAuthentication: boolean;
  clientCACertificates: string[];
  hstsEnabled: boolean;
  hstsMaxAge: number; // seconds (recommended: 31536000 = 1 year)
  hstsIncludeSubdomains: boolean;
  hstsPreload: boolean;
  certificateId?: string;
  updatedAt: Date;
}

/**
 * SSL/TLS Scan result for a specific check
 */
export interface SSLScanResult {
  scanId: string;
  targetHost: string;
  targetPort: number;
  scannedAt: Date;
  overallGrade: 'A+' | 'A' | 'A-' | 'B' | 'C' | 'D' | 'E' | 'F' | 'T' | 'M';
  results: SSLCheckResult[];
  vulnerabilities: SSLVulnerability[];
  recommendations: string[];
}

/**
 * Individual SSL/TLS check result
 */
export interface SSLCheckResult {
  category: 'protocol' | 'cipher' | 'certificate' | 'configuration' | 'vulnerability';
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  details?: string;
  remediation?: string;
  references?: string[];
}

/**
 * SSL/TLS Vulnerability found during scan
 */
export interface SSLVulnerability {
  cveId?: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cvssScore?: number;
  description: string;
  affectedVersions: string[];
  fixAvailable: boolean;
  recommendedAction: string;
}

// ============================================================================
// Security Header Types
// ============================================================================

/**
 * Content Security Policy directive types
 */
export interface CSPDirective {
  'default-src'?: string;
  'script-src'?: string;
  'style-src'?: string;
  'img-src'?: string;
  'font-src'?: string;
  'connect-src'?: string;
  'media-src'?: string;
  'object-src'?: string;
  'frame-src'?: string;
  'child-src'?: string;
  'worker-src'?: string;
  'manifest-src'?: string;
  'prefetch-src'?: string;
  'navigate-to'?: string;
  'form-action'?: string;
  'frame-ancestors'?: string;
  'base-uri'?: string;
  'sandbox'?: string;
  'report-uri'?: string;
  'report-to'?: string;
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
}

/**
 * Complete Content Security Policy configuration
 */
export interface CSPConfiguration {
  enabled: boolean;
  reportOnly: boolean;
  directives: CSPDirective;
  reportUri?: string;
  reportEndpoint?: string;
}

/**
 * HTTP Strict Transport Security configuration
 */
export interface HSTSConfiguration {
  enabled: boolean;
  maxAge: number; // seconds
  includeSubDomains: boolean;
  preload: boolean;
  preloadSubmitted: boolean;
}

/**
 * Permissions Policy (formerly Feature-Policy) directives
 */
export interface PermissionsPolicyDirective {
  accelerometer?: string[];
  ambient-light-sensor?: string[];
  autoplay?: string[];
  battery?: string[];
  camera?: string[];
  clipboard-read?: string[];
  clipboard-write?: string[];
  display-capture?: string[];
  document-domain?: string[];
  encrypted-media?: string[];
  execution-while-not-rendered?: string[];
  execution-while-out-of-viewport?: string[];
  fullscreen?: string[];
  geolocation?: string[];
  gyroscope?: string[];
  hid?: string[];
  identity-credentials-get?: string[];
  magnetometer?: string[];
  microphone?: string[];
  midi?: string[];
  navigation-override?: string[];
  payment?: string[];
  picture-in-picture?: string[];
  publickey-credentials-get?: string[];
  screen-wake-lock?: string[];
  serial?: string[];
  speaker-selection?: string[];
  usb?: string[];
  web-share?: string[];
  xr-spatial-tracking?: string[];
  'screen-enumeration'?: string[];
  'cross-origin-isolated'?: string[];
}

/**
 * Complete security headers configuration
 */
export interface SecurityHeadersConfiguration {
  contentSecurityPolicy: CSPConfiguration;
  strictTransportSecurity: HSTSConfiguration;
  xFrameOptions: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM' | string;
  xFrameOptionsAllowFrom?: string;
  xContentTypeOptions: 'nosniff' | string;
  xXSSProtection: '0' | '1' | '1; mode=block' | string;
  referrerPolicy: ReferrerPolicyType;
  permissionsPolicy: PermissionsPolicyDirective;
  crossOriginOpenerPolicy: CrossOriginOpenerPolicyType;
  crossOriginEmbedderPolicy: CrossOriginEmbedderPolicyType;
  crossOriginResourcePolicy: CrossOriginResourcePolicyType;
  cacheControl: string;
  pragma: string;
  expires: string;
  customHeaders: CustomHeader[];
}

/**
 * Referrer policy options
 */
export type ReferrerPolicyType =
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url'
  | '';

/**
 * Cross-Origin Opener Policy options
 */
export type CrossOriginOpenerPolicyType =
  | 'unsafe-none'
  | 'same-origin-allow-popups'
  | 'same-origin'
  | '';

/**
 * Cross-Origin Embedder Policy options
 */
export type CrossOriginEmbedderPolicyType =
  | 'unsafe-none'
  | 'require-corp'
  | '';

/**
 * Cross-Origin Resource Policy options
 */
export type CrossOriginResourcePolicyType =
  | 'same-site'
  | 'same-origin'
  | 'cross-origin'
  | '';

/**
 * Custom header definition
 */
export interface CustomHeader {
  name: string;
  value: string;
  always?: boolean;
  description?: string;
}

// ============================================================================
// CORS Policy Types
// ============================================================================

/**
 * CORS origin matching pattern
 */
export type CORSOriginPattern = string | RegExp;

/**
 * CORS allowed methods
 */
export type CORSMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * CORS policy configuration
 */
export interface CORSPolicy {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  origins: CORSOriginPattern[];
  allowMethods: CORSMethod[];
  allowHeaders: string[];
  exposeHeaders: string[];
  credentials: boolean;
  maxAge: number; // seconds
  preflightContinue: boolean;
  optionsSuccessStatus: number;
  preflightCache: PreflightCacheConfig;
  dynamicOrigin?: boolean;
  originValidator?: string; // Function reference or expression
}

/**
 * Preflight cache configuration
 */
export interface PreflightCacheConfig {
  enabled: boolean;
  maxAge: number;
  varyByOrigin: boolean;
  cacheSize: number;
}

/**
 * CORS request context
 */
export interface CORSRequestContext {
  origin: string;
  method: string;
  headers: string[];
  isPreflight: boolean;
  timestamp: Date;
  path: string;
}

/**
 * CORS response decision
 */
export interface CORSDecision {
  allowed: boolean;
  statusCode: number;
  headers: Record<string, string>;
  reason?: string;
  matchedPattern?: string;
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

/**
 * Rate limiting algorithm types
 */
export type RateLimitAlgorithm = 'token-bucket' | 'sliding-window' | 'fixed-window' | 'leaky-bucket';

/**
 * Rate limit rule definition
 */
export interface RateLimitRule {
  id: string;
  name: string;
  enabled: boolean;
  algorithm: RateLimitAlgorithm;
  windowMs: number; // Time window in milliseconds
  maxRequests: number;
  burstLimit?: number; // For token bucket
  refillRate?: number; // Tokens per second for token bucket
  keyGenerator: string; // Expression to generate rate limit key
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  whitelist?: string[]; // IP patterns to skip
  blacklist?: string[]; // IP patterns to block
  responseHeaders: RateLimitResponseHeaders;
  errorMessage: string;
  statusCode: number;
  metadata: Record<string, unknown>;
}

/**
 * Rate limit response headers configuration
 */
export interface RateLimitResponseHeaders {
  enabled: boolean;
  remainingHeader: string;
  resetHeader: string;
  totalHeader: string;
  retryAfterHeader: string;
}

/**
 * Rate limit state for a client
 */
export interface RateLimitState {
  key: string;
  remaining: number;
  total: number;
  resetTime: Date;
  retryAfter?: number;
  limited: boolean;
}

/**
 * Rate limit violation event
 */
export interface RateLimitViolation {
  ruleId: string;
  key: string;
  ip: string;
  path: string;
  method: string;
  timestamp: Date;
  currentCount: number;
  limit: number;
  actionTaken: 'reject' | 'throttle' | 'log_only';
}

// ============================================================================
// Authentication & Authorization Types
// ============================================================================

/**
 * Authentication method types
 */
export type AuthMethod = 
  | 'password' 
  | 'mfa_totp' 
  | 'mfa_fido2' 
  | 'saml' 
  | 'oidc' 
  | 'ldap' 
  | 'certificate' 
  | 'api_key' 
  | 'jwt_bearer';

/**
 * User role definitions
 */
export type UserRole = 
  | 'super_admin' 
  | 'security_admin' 
  | 'analyst' 
  | 'analyst_readonly' 
  | 'operator' 
  | 'auditor' 
  | 'api_service'
  | 'external_integrator';

/**
 * Permission scope
 */
export type PermissionScope = 
  | 'read' 
  | 'write' 
  | 'delete' 
  | 'admin' 
  | 'execute' 
  | 'approve';

/**
 * Resource that can be accessed
 */
export type ResourceType = 
  | 'dashboard' 
  | 'alerts' 
  | 'incidents' 
  | 'cases' 
  | 'threats' 
  | 'ioc' 
  | 'users' 
  | 'config' 
  | 'audit' 
  | 'reports' 
  | 'api' 
  | 'integrations'
  | 'security_settings';

/**
 * Single permission definition
 */
export interface Permission {
  resource: ResourceType;
  scope: PermissionScope;
  conditions?: PermissionCondition[];
}

/**
 * Conditional permission logic
 */
export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'not_in' | 'gt' | 'lt' | 'contains' | 'regex';
  value: unknown;
}

/**
 * JWT Token payload structure
 */
export interface JWTPayload {
  sub: string; // Subject (user ID)
  iat: number; // Issued at
  exp: number; // Expiration
  nbf?: number; // Not before
  jti?: string; // JWT ID
  iss?: string; // Issuer
  aud?: string; // Audience
  role: UserRole;
  permissions: Permission[];
  sessionId: string;
  mfaVerified: boolean;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * JWT Token pair for refresh flow
 */
export interface JWTTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

/**
 * API Key information
 */
export interface APIKey {
  id: string;
  name: string;
  keyPrefix: string; // First 8 chars for identification
  keyHash: string;
  hashedKey: string;
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
  usageLimit?: number;
  scopes: ResourceType[];
  ipWhitelist?: string[];
  active: boolean;
  revoked: boolean;
  revokedAt?: Date;
  revokedReason?: string;
  metadata: Record<string, unknown>;
}

/**
 * Session information
 */
export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  ipAddress: string;
  userAgent: string;
  deviceInfo?: DeviceInfo;
  mfaCompleted: boolean;
  mfaMethod?: AuthMethod;
  valid: boolean;
  invalidationReason?: string;
}

/**
 * Device information from user agent
 */
export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  os: string;
  browser: string;
  version: string;
  trusted: boolean;
}

/**
 * MFA configuration
 */
export interface MFAConfiguration {
  enabled: boolean;
  methods: MFAMethod[];
  backupCodesGenerated: boolean;
  backupCodesRemaining: number;
  rememberDeviceDays: number;
  enforceForRoles: UserRole[];
  gracePeriodEnds?: Date;
}

/**
 * Individual MFA method configuration
 */
export interface MFAMethod {
  type: 'totp' | 'fido2' | 'sms' | 'email' | 'backup_code';
  enabled: boolean;
  registered: boolean;
  registeredAt?: Date;
  lastUsedAt?: Date;
  primary: boolean;
  config?: Record<string, unknown>;
}

// ============================================================================
// Security Audit Log Types
// ============================================================================

/**
 * Audit log event categories
 */
export type AuditCategory = 
  | 'authentication' 
  | 'authorization' 
  | 'data_access' 
  | 'data_modification' 
  | 'configuration_change' 
  | 'security_event' 
  | 'system_operation' 
  | 'api_access' 
  | 'admin_action'
  | 'compliance';

/**
 * Audit log severity levels
 */
export type AuditSeverity = 
  | 'critical' 
  | 'high' 
  | 'medium' 
  | 'low' 
  | 'informational';

/**
 * Audit log action outcomes
 */
export type AuditOutcome = 'success' | 'failure' | 'denied' | 'error' | 'partial';

/**
 * Security audit log entry
 */
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  category: AuditCategory;
  severity: AuditSeverity;
  outcome: AuditOutcome;
  actor: ActorInfo;
  action: string;
  resource: TargetResource;
  details: AuditDetails;
  source: SourceInfo;
  correlationId: string;
  retentionUntil: Date;
  tags: string[];
  metadata: Record<string, unknown>;
}

/**
 * Actor who performed the action
 */
export interface ActorInfo {
  type: 'user' | 'service' | 'system' | 'anonymous' | 'api_key';
  id: string;
  username?: string;
  displayName?: string;
  ipAddress: string;
  userAgent?: string;
  sessionId?: string;
  impersonator?: string;
  authenticationMethod?: AuthMethod;
  mfaVerified: boolean;
}

/**
 * Target resource of the action
 */
export interface TargetResource {
  type: ResourceType | string;
  id?: string;
  name?: string;
  attributes?: Record<string, unknown>;
}

/**
 * Detailed audit information
 */
export interface AuditDetails {
  before?: Record<string, unknown>; // State before change
  after?: Record<string, unknown>; // State after change
  changes?: FieldChange[];
  reason?: string;
  additionalData?: Record<string, unknown>;
  error?: string;
  stackTrace?: string;
}

/**
 * Individual field change in audit trail
 */
export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changedBy: string;
}

/**
 * Source information for the log entry
 */
export interface SourceInfo {
  application: string;
  component: string;
  environment: string;
  hostname: string;
  region?: string;
  requestId: string;
  traceId?: string;
  spanId?: string;
}

/**
 * Audit log query parameters
 */
export interface AuditLogQuery {
  startDate?: Date;
  endDate?: Date;
  categories?: AuditCategory[];
  severities?: AuditSeverity[];
  actors?: string[];
  actions?: string[];
  resources?: string[];
  outcomes?: AuditOutcome[];
  searchQuery?: string;
  page: number;
  pageSize: number;
  sortBy: keyof AuditLogEntry;
  sortOrder: 'asc' | 'desc';
}

/**
 * Paginated audit log response
 */
export interface AuditLogResponse {
  entries: AuditLogEntry[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasMore: boolean;
  filtersApplied: Partial<AuditLogQuery>;
}

// ============================================================================
// Vulnerability Scan Types
// ============================================================================

/**
 * Vulnerability severity levels
 */
export type VulnSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'unknown';

/**
 * Vulnerability status in lifecycle
 */
export type VulnStatus = 
  | 'open' 
  | 'confirmed' 
  | 'false_positive' 
  | 'accepted_risk' 
  | 'in_progress' 
  | 'fixed' 
  | 'verified' 
  | 'closed'
  | 'reopened';

/**
 * CVSS Score object
 */
export interface CVSSScore {
  baseScore: number;
  impactScore: number;
  exploitabilityScore: number;
  vector: string;
  version: '2.0' | '3.0' | '3.1';
  metrics: CVSSMetrics;
}

/**
 * CVSS v3.x metrics breakdown
 */
export interface CVSSMetrics {
  attackVector: 'Network' | 'Adjacent' | 'Local' | 'Physical';
  attackComplexity: 'Low' | 'High';
  privilegesRequired: 'None' | 'Low' | 'High';
  userInteraction: 'None' | 'Required';
  scope: 'Unchanged' | 'Changed';
  confidentialityImpact: 'None' | 'Low' | 'High';
  integrityImpact: 'None' | 'Low' | 'High';
  availabilityImpact: 'None' | 'Low' | 'High';
}

/**
 * Vulnerability finding
 */
export interface Vulnerability {
  id: string;
  scanId: string;
  title: string;
  description: string;
  severity: VulnSeverity;
  cvss?: CVSSScore;
  cveId?: string;
  cweId?: string;
  owaspCategory?: OWASPCategory;
  status: VulnStatus;
  discoveredAt: Date;
  confirmedAt?: Date;
  fixedAt?: date;
  target: VulnerabilityTarget;
  evidence?: string;
  remediation: RemediationInfo;
  references: string[];
  tags: string[];
  assignedTo?: string;
  comments: VulnerabilityComment[];
  metadata: Record<string, unknown>;
}

/** 
 * Fix date type alias
 */
type date = Date;

/**
 * Vulnerability target information
 */
export interface VulnerabilityTarget {
  host: string;
  port?: number;
  service?: string;
  protocol?: string;
  url?: string;
  component?: string;
  version?: string;
  os?: string;
}

/**
 * Remediation information for a vulnerability
 */
export interface RemediationInfo {
  difficulty: 'easy' | 'moderate' | 'complex';
  effort: 'low' | 'medium' | 'high';
  priority: 'immediate' | 'short_term' | 'long_term' | 'scheduled';
  steps: RemediationStep[];
  estimatedHours?: number;
  dependencies?: string[];
}

/**
 * Individual remediation step
 */
export interface RemediationStep {
  order: number;
  title: string;
  description: string;
  command?: string;
  verification?: string;
  references?: string[];
}

/**
 * Comment on vulnerability
 */
export interface VulnerabilityComment {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
  internal: boolean;
}

/**
 * OWASP Top 10 category mapping
 */
export type OWASPCategory = 
  | 'A01_2021_Broken_Access_Control'
  | 'A02_2021_Cryptographic_Failures'
  | 'A03_2021_Injection'
  | 'A04_2021_Insecure_Design'
  | 'A05_2021_Security_Misconfiguration'
  | 'A06_2021_Vulnerable_Outdated_Components'
  | 'A07_2021_Identification_Authentication_Failures'
  | 'A08_2021_Software_Data_Integrity_Failures'
  | 'A09_2021_Security_Logging_Monitoring_Failures'
  | 'A10_2021_Server_Side_Request_Forgery';

/**
 * Security scan configuration
 */
export interface SecurityScanConfig {
  id: string;
  name: string;
  type: ScanType;
  targets: ScanTarget[];
  schedule: ScanSchedule;
  credentials?: ScanCredential[];
  exclusions: string[];
  maxDuration: number; // minutes
  alertOnCompletion: boolean;
  alertOnFinding: boolean;
  minSeverity: VulnSeverity;
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

/**
 * Supported scan types
 */
export type ScanType = 
  | 'network' 
  | 'web_app' 
  | 'api' 
  | 'ssl_tls' 
  | 'configuration' 
  | 'malware' 
  | 'compliance'
  | 'full';

/**
 * Scan target specification
 */
export interface ScanTarget {
  host: string;
  ports?: string; // e.g., "80,443" or "1-1000"
  paths?: string[];
  protocols?: string[];
}

/**
 * Scan scheduling configuration
 */
export interface ScanSchedule {
  enabled: boolean;
  frequency: 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
  cronExpression?: string;
  timezone: string;
  runAt?: string; // Time of day for daily/weekly
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
}

/**
 * Credential for authenticated scanning
 */
export interface ScanCredential {
  type: 'basic' | 'ntlm' | 'ssh' | 'snmp' | 'database' | 'api_key';
  host: string;
  username?: string;
  password?: string;
  privateKey?: string;
  realm?: string;
  port?: number;
}

/**
 * Security scan result summary
 */
export interface SecurityScanResult {
  scanId: string;
  configId: string;
  startedAt: Date;
  completedAt: Date;
  duration: number; // seconds
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  summary: ScanSummary;
  findings: Vulnerability[];
  errors: ScanError[];
}

/**
 * Summary statistics for a scan
 */
export interface ScanSummary {
  totalTargets: number;
  scannedTargets: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  riskScore: number; // 0-100
  compliancePercentage: number;
}

/**
 * Error encountered during scan
 */
export interface ScanError {
  target: string;
  error: string;
  stage: string;
  timestamp: Date;
}

// ============================================================================
// Compliance Check Types
// ============================================================================

/**
 * Compliance framework identifiers
 */
export type ComplianceFramework = 
  | 'CIS_Controls_v8' 
  | 'CIS_Benchmark_Linux' 
  | 'CIS_Benchmark_Docker' 
  | 'CIS_Benchmark_Nginx'
  | 'NIST_SP_800_53' 
  | 'NIST_Cybersecurity_Framework'
  | 'ISO_27001' 
  | 'ISO_27002'
  | 'PCI_DSS' 
  | 'SOC2' 
  | 'HIPAA' 
  | 'GDPR'
  | 'ANSSI'
  | 'CUSTOM';

/**
 * Compliance control status
 */
export type ComplianceStatus = 'pass' | 'fail' | 'partial' | 'not_applicable' | 'not_tested' | 'error';

/**
 * Compliance check item
 */
export interface ComplianceCheck {
  id: string;
  framework: ComplianceFramework;
  controlId: string;
  controlTitle: string;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'observation';
  status: ComplianceStatus;
  evidence?: ComplianceEvidence;
  findings: string[];
  recommendations: string[];
  references: string[];
  testedAt: Date;
  testedBy: string;
  notes?: string;
  metadata: Record<string, unknown>;
}

/**
 * Evidence for compliance check
 */
export interface ComplianceEvidence {
  type: 'automated' | 'manual' | 'document' | 'interview' | 'observation';
  collectedAt: Date;
  collector: string;
  artifacts: EvidenceArtifact[];
  notes?: string;
}

/**
 * Individual evidence artifact
 */
export interface EvidenceArtifact {
  name: string;
  type: 'screenshot' | 'log' | 'config' | 'report' | 'other';
  url?: string;
  content?: string;
  hash?: string;
}

/**
 * Compliance assessment report
 */
export interface ComplianceReport {
  id: string;
  framework: ComplianceFramework;
  assessmentDate: Date;
  assessor: string;
  scope: AssessmentScope;
  overallStatus: ComplianceStatus;
  score: number; // 0-100
  checks: ComplianceCheck[];
  summary: ComplianceSummary;
  findings: ComplianceFinding[];
  remediationPlan: RemediationPlan;
  nextAssessmentDate: Date;
}

/**
 * Scope of compliance assessment
 */
export interface AssessmentScope {
  systems: string[];
  networks: string[];
  applications: string[];
  personnel: string[];
  thirdParties: string[];
  exclusions: string[];
}

/**
 * Compliance summary statistics
 */
export interface ComplianceSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  partial: number;
  notApplicable: number;
  notTested: number;
  error: number;
  passPercentage: number;
  criticalFailures: number;
  majorFailures: number;
}

/**
 * Finding from compliance assessment
 */
export interface ComplianceFinding {
  id: string;
  controlId: string;
  title: string;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'observation';
  riskRating: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'remediated' | 'accepted';
  dueDate?: Date;
  owner?: string;
  remediationSteps: string[];
}

/**
 * Plan for remediating compliance issues
 */
export interface RemediationPlan {
  items: RemediationItem[];
  estimatedEffort: number; // hours
  estimatedCost?: number;
  priorityOrder: string[];
}

/**
 * Individual remediation plan item
 */
export interface RemediationItem {
  findingId: string;
  action: string;
  responsible: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  completedAt?: Date;
  verified: boolean;
}

// ============================================================================
// Firewall Rule Types
// ============================================================================

/**
 * Firewall action types
 */
export type FirewallAction = 'allow' | 'deny' | 'reject' | 'rate_limit' | 'log' | 'redirect';

/**
 * Firewall direction
 */
export type FirewallDirection = 'inbound' | 'outbound' | 'both';

/**
 * Protocol types for firewall rules
 */
export type FirewallProtocol = 'tcp' | 'udp' | 'icmp' | 'any' | 'ipsec' | 'gre';

/**
 * Firewall rule definition
 */
export interface FirewallRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number; // Lower = higher priority
  action: FirewallAction;
  direction: FirewallDirection;
  source: FirewallEndpoint;
  destination: FirewallEndpoint;
  protocol: FirewallProtocol;
  portRange?: PortRange;
  logging: boolean;
  logPrefix?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  metadata: Record<string, unknown>;
}

/**
 * Firewall endpoint (source or destination)
 */
export interface FirewallEndpoint {
  type: 'any' | 'ip' | 'cidr' | 'group' | 'interface' | 'fqdn';
  value: string;
  negated?: boolean;
}

/**
 * Port range specification
 */
export interface PortRange {
  start: number;
  end: number;
}

/**
 * Firewall rule group
 */
export interface FirewallRuleGroup {
  id: string;
  name: string;
  description?: string;
  rules: FirewallRule[];
  defaultAction: FirewallAction;
  applyOrder: 'priority' | 'first_match';
  enabled: boolean;
}

/**
 * Firewall logs entry
 */
export interface FirewallLogEntry {
  id: string;
  timestamp: Date;
  ruleId: string;
  ruleName: string;
  action: FirewallAction;
  sourceIP: string;
  sourcePort: number;
  destIP: string;
  destPort: number;
  protocol: FirewallProtocol;
  bytesIn?: number;
  bytesOut?: number;
  packetsIn?: number;
  packetsOut?: number;
  matched: boolean;
  reason?: string;
}

// ============================================================================
// IP Whitelist/Blacklist Types
// ============================================================================

/**
 * IP list type
 */
export type IPListType = 'whitelist' | 'blacklist' | 'graylist';

/**
 * IP list entry
 */
export interface IPListEntry {
  id: string;
  listType: IPListType;
  address: string; // IP or CIDR
  label: string;
  description?: string;
  addedBy: string;
  addedAt: Date;
  expiresAt?: Date;
  permanent: boolean;
  reason: string;
  threatLevel?: ThreatLevel;
  threatIntelSource?: string;
  tags: string[];
  metadata: Record<string, unknown>;
}

/**
 * Threat level classification
 */
export type ThreatLevel = 'benign' | 'suspicious' | 'malicious' | 'critical';

/**
 * IP reputation data
 */
export interface IPReputation {
  ip: string;
  score: number; // 0-100, higher = more malicious
  confidence: number; // 0-100
  threatLevel: ThreatLevel;
  category: ThreatCategory[];
  firstSeen: Date;
  lastSeen: Date;
  sources: ReputationSource[];
  isTorExitNode: boolean;
  isVPN: boolean;
  isProxy: boolean;
  isHosting: boolean;
  country: string;
  city?: string;
  asn: number;
  asName: string;
  isp: string;
  organization: string;
  lastUpdated: Date;
}

/**
 * Threat category for IP reputation
 */
export type ThreatCategory = 
  | 'spam' 
  | 'phishing' 
  | 'malware' 
  | 'botnet' 
  | 'scanner' 
  | 'ddos' 
  | 'hack_attempt' 
  | 'web_attack' 
  | 'fraud' 
  | 'abuse';

/**
 * Reputation data source
 */
export interface ReputationSource {
  name: string;
  score: number;
  lastReported: Date;
  reports: number;
  details?: string;
}

// ============================================================================
// Security Event Classification Types
// ============================================================================

/**
 * Security event severity
 */
export type EventSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

/**
 * Security event status
 */
export type EventStatus = 'new' | 'investigating' | 'contained' | 'eradicated' | 'resolved' | 'false_positive' | 'closed';

/**
 * MITRE ATT&CK tactic
 */
export type MITRETactic = 
  | 'initial_access'
  | 'execution'
  | 'persistence'
  | 'privilege_escalation'
  | 'defense_evasion'
  | 'credential_access'
  | 'discovery'
  | 'lateral_movement'
  | 'collection'
  | 'command_and_control'
  | 'exfiltration'
  | 'impact';

/**
 * Security event classification
 */
export interface SecurityEvent {
  id: string;
  eventId: string; // External ID from SIEM
  timestamp: Date;
  detectedAt: Date;
  severity: EventSeverity;
  status: EventStatus;
  classification: EventClassification;
  source: EventSource;
  target: EventTarget;
  indicators: IndicatorOfCompromise[];
  mitreAttack?: MITREMapping;
  responseActions: ResponseAction[];
  assignedTo?: string;
  escalationLevel: number;
  slaDeadline?: Date;
  resolutionNotes?: string;
  tags: string[];
  relatedEvents: string[];
  attachments: Attachment[];
  timeline: EventTimelineEntry[];
  metadata: Record<string, unknown>;
}

/**
 * Event classification details
 */
export interface EventClassification {
  category: EventCategory;
  subcategory: string;
  technique: string;
  confidence: number; // 0-100
  falsePositiveScore: number; // 0-100
  classifier: string; // Rule name, ML model, etc.
  version: string;
}

/**
 * High-level event categories
 */
export type EventCategory = 
  | 'malware' 
  | 'intrusion' 
  | 'data_breach' 
  | 'denial_of_service' 
  | 'web_attack' 
  | 'phishing' 
  | 'insider_threat' 
  | 'policy_violation' 
  | 'misconfiguration' 
  | 'reconnaissance'
  | 'unknown';

/**
 * Event source information
 */
export interface EventSource {
  type: 'sensor' | 'endpoint' | 'network' | 'application' | 'user_report' | 'third_party';
  sensorId: string;
  sensorName: string;
  sensorType: string;
  ipAddress: string;
  hostname: string;
  rawLogs?: string[];
  parsedData?: Record<string, unknown>;
}

/**
 * Event target information
 */
export interface EventTarget {
  type: 'host' | 'user' | 'application' | 'data' | 'network' | 'account';
  identifier: string;
  name: string;
  location: string;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  businessOwner?: string;
}

/**
 * Indicator of Compromise
 */
export interface IndicatorOfCompromise {
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'registry_key' | 'filename' | 'mutex';
  value: string;
  confidence: number;
  source: string;
  firstSeen: Date;
  lastSeen: Date;
  context?: string;
}

/**
 * MITRE ATT&CK mapping
 */
export interface MITREMapping {
  tactic: MITRETactic;
  techniqueId: string;
  techniqueName: string;
  groupId?: string;
  groupName?: string;
  softwareId?: string;
  softwareName?: string;
  mitigationIds: string[];
}

/**
 * Response action taken on an event
 */
export interface ResponseAction {
  id: string;
  action: 'isolate' | 'block' | 'contain' | 'alert' | 'investigate' | 'escalate' | 'ignore';
  executedAt: Date;
  executedBy: string;
  automatic: boolean;
  result: 'success' | 'failed' | 'pending';
  details?: string;
}

/**
 * File attachment for event
 */
export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
  url: string;
  hashMD5?: string;
  hashSHA256?: string;
}

/**
 * Timeline entry for event investigation
 */
export interface EventTimelineEntry {
  timestamp: Date;
  action: string;
  performedBy: string;
  details: string;
  evidence?: string;
}

// ============================================================================
// Encryption Key Management Types
// ============================================================================

/**
 * Key type for encryption operations
 */
export type KeyType = 
  | 'AES_256_GCM' 
  | 'AES_128_GCM' 
  | 'RSA_OAEP_2048' 
  | 'RSA_OAEP_4096' 
  | 'ECIES_P256'
  | 'CHACHA20_POLY1305';

/**
 * Key purpose classification
 */
export type KeyPurpose = 
  | 'data_encryption' 
  | 'key_encryption' 
  | 'signing' 
  | 'verification' 
  | 'key_exchange'
  | 'master_key';

/**
 * Key status in lifecycle
 */
export type KeyStatus = 
  | 'active' 
  | 'deactivated' 
  | 'compromised' 
  | 'destroyed' 
  | 'expired' 
  | 'pre_active'
  | 'compromise_recovery';

/**
 * Encryption key record
 */
export interface EncryptionKey {
  id: string;
  keyAlias: string;
  keyType: KeyType;
  keyPurpose: KeyPurpose;
  status: KeyStatus;
  algorithm: string;
  keySize: number;
  createdAt: Date;
  activationDate: Date;
  expirationDate?: Date;
  deactivationDate?: date;
  destructionDate?: date;
  rotationInterval: number; // days
  lastRotatedAt: Date;
  nextRotationAt: Date;
  version: number;
  previousVersionId?: string;
  kmsProvider: KMSProvider;
  externalKeyId?: string;
  metadata: Record<string, unknown>;
  tags: string[];
  accessPolicy: KeyAccessPolicy;
}

/** 
 * Deactivation date type alias
 */
type deactivation_date = Date;

/**
 * Key Management Service provider
 */
export type KMSProvider = 
  | 'aws_kms' 
  | 'azure_keyvault' 
  | 'gcp_cloudkms' 
  | 'hashicorp_vault' 
  | 'local_hsm' 
  | 'software';

/**
 * Key access policy
 */
export interface KeyAccessPolicy {
  principals: PrincipalAccess[];
  conditions: AccessCondition[];
  requireMFA: boolean;
  approvalRequired: boolean;
  approvers: string[];
  auditAllAccess: boolean;
}

/**
 * Principal access rights
 */
export interface PrincipalAccess {
  principalId: string;
  principalType: 'user' | 'role' | 'service';
  permissions: ('encrypt' | 'decrypt' | 'sign' | 'verify' | 'manage')[];
}

/**
 * Condition for key access
 */
export interface AccessCondition {
  type: 'time_range' | 'ip_whitelist' | 'environment' | 'purpose';
  value: string | string[];
}

/**
 * Encryption operation result
 */
export interface EncryptionResult {
  ciphertext: string;
  iv: string;
  tag: string;
  keyId: string;
  algorithm: string;
  encryptedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Decryption operation result
 */
export interface DecryptionResult {
  plaintext: string;
  keyId: string;
  decryptedAt: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Security Dashboard Types
// ============================================================================

/**
 * Overall security posture score
 */
export interface SecurityPosture {
  overallScore: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  lastAssessed: Date;
  categories: PostureCategory[];
  trends: SecurityTrend[];
  criticalIssues: SecurityIssue[];
  recommendations: Recommendation[];
}

/**
 * Individual posture category
 */
export interface PostureCategory {
  name: string;
  score: number;
  weight: number;
  status: 'healthy' | 'warning' | 'critical';
  items: PostureItem[];
}

/**
 * Individual posture check item
 */
export interface PostureItem {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  lastChecked: Date;
}

/**
 * Security trend data point
 */
export interface SecurityTrend {
  date: Date;
  score: number;
  incidents: number;
  vulnerabilities: number;
  compliancePercentage: number;
}

/**
 * Critical security issue
 */
export interface SecurityIssue {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  affectedSystems: string[];
  discoveredAt: Date;
  status: 'open' | 'investigating' | 'remediating' | 'resolved';
  assignee?: string;
  dueDate?: Date;
}

/**
 * Security recommendation
 */
export interface Recommendation {
  id: string;
  priority: 'immediate' | 'short_term' | 'long_term';
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'easy' | 'moderate' | 'complex';
  cisControl?: string;
  nistControl?: string;
  references: string[];
}

// ============================================================================
// Input Validation Types
// ============================================================================

/**
 * Validation rule types
 */
export type ValidationRuleType = 
  | 'required' 
  | 'type' 
  | 'pattern' 
  | 'length' 
  | 'range' 
  | 'enum' 
  | 'custom' 
  | 'sanitization';

/**
 * Input validation rule
 */
export interface ValidationRule {
  type: ValidationRuleType;
  field: string;
  params?: Record<string, unknown>;
  message: string;
  sanitize?: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  sanitizedData?: Record<string, unknown>;
  warnings: string[];
}

/**
 * Individual validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * XSS detection result
 */
export interface XSSDetectionResult {
  clean: boolean;
  detectedPatterns: XSSPattern[];
  sanitizedInput: string;
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Detected XSS pattern
 */
export interface XSSPattern {
  type: 'script_tag' | 'event_handler' | 'javascript_uri' | 'expression' | 'dom_based' | 'other';
  pattern: string;
  position: number;
  context: string;
}

/**
 * SQL injection detection result
 */
export interface SQLInjectionResult {
  safe: boolean;
  detectedPatterns: SQLInjectionPattern[];
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  suggestions: string[];
}

/**
 * Detected SQL injection pattern
 */
export interface SQLInjectionPattern {
  type: 'union_based' | 'boolean_based' | 'time_based' | 'error_based' | 'stacked_queries' | 'other';
  pattern: string;
  position: number;
  context: string;
}

// ============================================================================
// Password Security Types
// ============================================================================

/**
 * Password strength requirements
 */
export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minSpecialChars: number;
  maxConsecutiveSame: number;
  maxRepeatedChars: number;
  forbiddenPatterns: string[];
  forbiddenWords: string[];
  historyCheck: number; // Number of previous passwords to check
  ageDays: number; // Minimum password age
  maxAgeDays: number; // Maximum password age
  breachCheck: boolean; // Check against known breaches
}

/**
 * Password strength analysis result
 */
export interface PasswordStrengthResult {
  score: number; // 0-100
  strength: 'very_weak' | 'weak' | 'fair' | 'strong' | 'very strong';
  crackTimeEstimate: CrackTimeEstimate;
  feedback: PasswordFeedback[];
  meetsRequirements: boolean;
  requirementsMet: RequirementCheck[];
}

/**
 * Estimated time to crack password
 */
export interface CrackTimeEstimate {
  onlineThrottled: string; // e.g., "instant", "3 seconds"
  onlineUnthrottled: string;
  offlineSlowHash: string;
  offlineFastHash: string;
  entropy: number; // bits
}

/**
 Individual password feedback item
 */
export interface PasswordFeedback {
  type: 'warning' | 'suggestion';
  message: string;
}

/**
 * Password requirement check result
 */
export interface RequirementCheck {
  requirement: string;
  met: boolean;
  description: string;
}
