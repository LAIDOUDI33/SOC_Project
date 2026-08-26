/**
 * National SOC Platform - Deployment Module Type Definitions
 * Module 9: Production Deployment Scripts
 * 
 * This module provides comprehensive type definitions for:
 * - Deployment configurations
 * - Service definitions
 * - Health checks
 * - Rollback configurations
 * - Backup types
 * - Infrastructure specifications
 * - Pipeline stages
 * - Release versioning
 */

// ============================================================================
// CORE DEPLOYMENT TYPES
// ============================================================================

/**
 * Environment types supported by the platform
 */
export type Environment = 'development' | 'staging' | 'production' | 'dr';

/**
 * Deployment status enumeration
 */
export enum DeploymentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
  CANCELLED = 'cancelled'
}

/**
 * Health status for services and components
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

/**
 * Main deployment configuration interface
 */
export interface DeploymentConfig {
  /** Unique identifier for this deployment */
  id: string;
  /** Environment target */
  environment: Environment;
  /** Version being deployed */
  version: SemanticVersion;
  /** Current status */
  status: DeploymentStatus;
  /** Timestamp when deployment started */
  startedAt: Date;
  /** Timestamp when deployment completed (if finished) */
  completedAt?: Date;
  /** User who initiated the deployment */
  deployedBy: string;
  /** Git commit SHA */
  commitSha: string;
  /** Git branch name */
  branch: string;
  /** Rollback information if applicable */
  rollback?: RollbackConfig;
  /** Services included in this deployment */
  services: ServiceDeployment[];
  /** Configuration overrides for this deployment */
  configOverrides?: Record<string, unknown>;
}

// ============================================================================
// SERVICE DEFINITIONS
// ============================================================================

/**
 * All service names in the SOC platform
 */
export type SocServiceName =
  | 'postgres'
  | 'redis'
  | 'nginx'
  | 'wazuh-manager'
  | 'wazuh-agent'
  | 'suricata'
  | 'misp'
  | 'thehive'
  | 'cortex'
  | 'elasticsearch'
  | 'logstash'
  | 'kibana'
  | 'grafana'
  | 'prometheus'
  | 'alertmanager'
  | 'minio'
  | 'rabbitmq'
  | 'mailhog'
  | 'keycloak'
  | 'api-gateway'
  | 'frontend';

/**
 * Service category classification
 */
export type ServiceCategory =
  | 'infrastructure'
  | 'database'
  | 'cache'
  | 'security'
  | 'siem'
  | 'ids-ips'
  | 'threat-intel'
  | 'soar'
  | 'observability'
  | 'monitoring'
  | 'visualization'
  | 'storage'
  | 'messaging'
  | 'identity'
  | 'proxy'
  | 'application';

/**
 * Individual service deployment configuration
 */
export interface ServiceDeployment {
  /** Service name */
  service: SocServiceName;
  /** Category classification */
  category: ServiceCategory;
  /** Docker image reference */
  image: string;
  /** Image tag/version */
  tag: string;
  /** Current health status */
  health: HealthStatus;
  /** Resource allocation */
  resources: ResourceLimits;
  /** Replicas for scalable services */
  replicas: number;
  /** Port mappings */
  ports: PortMapping[];
  /** Volume mounts */
  volumes: VolumeMount[];
  /** Environment variables (keys only, values from secrets) */
  environment: string[];
  /** Dependencies on other services */
  dependsOn: SocServiceName[];
  /** Health check configuration */
  healthCheck: HealthCheckConfig;
  /** Startup order priority (lower = starts first) */
  startupOrder: number;
  /** Whether this service is critical to platform operation */
  critical: boolean;
}

/**
 * Port mapping configuration
 */
export interface PortMapping {
  /** Container port */
  containerPort: number;
  /** Host port (optional, auto-assigned if not specified) */
  hostPort?: number;
  /** Protocol */
  protocol: 'tcp' | 'udp';
  /** Public exposure flag */
  exposePublic: boolean;
}

/**
 * Volume mount configuration
 */
export interface VolumeMount {
  /** Source (named volume or host path) */
  source: string;
  /** Destination path in container */
  destination: string;
  /** Mount mode */
  mode: 'rw' | 'ro';
  /** Volume type */
  type: 'volume' | 'bind' | 'tmpfs';
}

/**
 * Resource limits for containers
 */
export interface ResourceLimits {
  /** CPU limit in cores */
  cpuLimit: number;
  /** CPU reservation in cores */
  cpuReservation: number;
  /** Memory limit in MB */
  memoryLimitMB: number;
  /** Memory reservation in MB */
  memoryReservationMB: number;
}

// ============================================================================
// HEALTH CHECK TYPES
// ============================================================================

/**
 * Health check configuration for services
 */
export interface HealthCheckConfig {
  /** Enable/disable health checks */
  enabled: boolean;
  /** Check type */
  type: 'http' | 'tcp' | 'exec' | 'grpc';
  /** HTTP endpoint for HTTP checks */
  endpoint?: string;
  /** Expected status code for HTTP checks */
  expectedStatus?: number;
  /** TCP port for TCP checks */
  port?: number;
  /** Command for exec checks */
  command?: string[];
  /** Initial delay before first check (seconds) */
  startPeriod: number;
  /** Interval between checks (seconds) */
  interval: number;
  /** Timeout for each check (seconds) */
  timeout: number;
  /** Number of consecutive failures before unhealthy */
  retries: number;
  /** Number of consecutive successes before healthy */
  successThreshold: number;
}

/**
 * Comprehensive health check result
 */
export interface HealthCheckResult {
  /** Service name */
  service: SocServiceName;
  /** Overall health status */
  status: HealthStatus;
  /** Timestamp of check */
  timestamp: Date;
  /** Response time in milliseconds */
  responseTimeMs: number;
  /** Individual check results */
  checks: IndividualCheckResult[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Individual health check result
 */
export interface IndividualCheckResult {
  /** Check name */
  name: string;
  /** Check status */
  status: HealthStatus;
  /** Response time in milliseconds */
  responseTimeMs: number;
  /** Error message if failed */
  error?: string;
  /** Additional details */
  details?: string;
}

/**
 * System-wide health report
 */
export interface SystemHealthReport {
  /** Report generation timestamp */
  generatedAt: Date;
  /** Overall system status */
  overallStatus: HealthStatus;
  /** Total services checked */
  totalServices: number;
  /** Healthy services count */
  healthyServices: number;
  /** Degraded services count */
  degradedServices: number;
  /** Unhealthy services count */
  unhealthyServices: number;
  /** Per-service results */
  services: HealthCheckResult[];
  /** System resource usage */
  resources: SystemResourceUsage;
  /** Alerts and warnings */
  alerts: HealthAlert[];
}

/**
 * System resource usage metrics
 */
export interface SystemResourceUsage {
  /** CPU usage percentage */
  cpuPercent: number;
  /** Memory usage percentage */
  memoryPercent: number;
  /** Memory used in MB */
  memoryUsedMB: number;
  /** Memory total in MB */
  memoryTotalMB: number;
  /** Disk usage percentage */
  diskPercent: number;
  /** Disk used in GB */
  diskUsedGB: number;
  /** Disk total in GB */
  diskTotalGB: number;
  /** Network I/O stats */
  network: NetworkStats;
}

/**
 * Network statistics
 */
export interface NetworkStats {
  /** Bytes received */
  bytesReceived: number;
  /** Bytes sent */
  bytesSent: number;
  /** Packets received */
  packetsReceived: number;
  /** Packets sent */
  packetsSent: number;
  /** Active connections */
  activeConnections: number;
}

/**
 * Health alert definition
 */
export interface HealthAlert {
  /** Alert ID */
  id: string;
  /** Severity level */
  severity: 'critical' | 'warning' | 'info';
  /** Alert message */
  message: string;
  /** Related service */
  service?: SocServiceName;
  /** Timestamp */
  timestamp: Date;
  /** Suggested remediation */
  remediation?: string;
}

// ============================================================================
// ROLLBACK CONFIGURATION TYPES
// ============================================================================

/**
 * Rollback configuration interface
 */
export interface RollbackConfig {
  /** Enable automatic rollback on failure */
  autoRollback: boolean;
  /** Threshold for triggering rollback (percentage of failed services) */
  failureThreshold: number;
  /** Maximum number of automatic rollbacks allowed */
  maxAutoRollbacks: number;
  /** Current rollback count */
  currentRollbackCount: number;
  /** Rollback strategy */
  strategy: RollbackStrategy;
  /** Previous stable version to rollback to */
  previousVersion?: SemanticVersion;
  /** Rollback history */
  history: RollbackEntry[];
  /** Pre-rollback hooks */
  preRollbackHooks: HookDefinition[];
  /** Post-rollback hooks */
  postRollbackHooks: HookDefinition[];
}

/**
 * Rollback strategies
 */
export type RollbackStrategy =
  | 'full'           // Complete rollback to previous version
  | 'partial'        // Rollback only failed services
  | 'blue-green'     // Switch traffic to previous environment
  | 'canary-revert'; // Revert canary deployment

/**
 * Rollback history entry
 */
export interface RollbackEntry {
  /** Entry ID */
  id: string;
  /** Timestamp of rollback */
  timestamp: Date;
  /** Version rolled back from */
  fromVersion: SemanticVersion;
  /** Version rolled back to */
  toVersion: SemanticVersion;
  /** Reason for rollback */
  reason: RollbackReason;
  /** Who initiated the rollback */
  initiatedBy: string;
  /** Whether rollback was successful */
  success: boolean;
  /** Duration of rollback in seconds */
  durationSeconds: number;
  /** Notes about the rollback */
  notes?: string;
}

/**
 * Reasons for rollback
 */
export type RollbackReason =
  | 'deployment_failure'
  | 'health_check_failure'
  | 'performance_degradation'
  | 'error_rate_spike'
  | 'manual_intervention'
  | 'security_incident'
  | 'data_corruption';

// ============================================================================
// BACKUP TYPES
// ============================================================================

/**
 * Backup configuration
 */
export interface BackupConfig {
  /** Global backup settings */
  settings: BackupSettings;
  /** Database backup configs */
  databases: DatabaseBackupConfig[];
  /** File backup configs */
  files: FileBackupConfig[];
  /** Retention policies */
  retention: RetentionPolicy;
  /** Storage destinations */
  destinations: BackupDestination[];
  /** Scheduling */
  schedule: BackupSchedule;
  /** Encryption settings */
  encryption: EncryptionConfig;
  /** Notification settings */
  notifications: BackupNotificationConfig;
}

/**
 * General backup settings
 */
export interface BackupSettings {
  /** Enable backups globally */
  enabled: boolean;
  /** Concurrent backup jobs limit */
  maxConcurrentJobs: number;
  /** Bandwidth throttle in KB/s (0 = unlimited) */
  bandwidthThrottleKBs: number;
  /** Compression algorithm */
  compression: 'gzip' | 'lz4' | 'zstd' | 'none';
  /** Compression level (1-9) */
  compressionLevel: number;
  /** Verify backups after creation */
  verifyBackups: boolean;
  /** Default backup location */
  defaultLocation: string;
}

/**
 * Database-specific backup configuration
 */
export interface DatabaseBackupConfig {
  /** Database identifier */
  databaseId: string;
  /** Database type */
  type: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'elasticsearch';
  /** Host address */
  host: string;
  /** Port number */
  port: number;
  /** Database name */
  name: string;
  /** Enable backup for this database */
  enabled: boolean;
  /** Custom dump options */
  dumpOptions?: string[];
  /** Pre-backup script */
  preBackupScript?: string;
  /** Post-backup script */
  postBackupScript?: string;
  /** Tables/collections to exclude */
  excludeTables?: string[];
}

/**
 * File backup configuration
 */
export interface FileBackupConfig {
  /** Backup set identifier */
  setId: string;
  /** Human-readable name */
  name: string;
  /** Source paths to backup */
  sources: string[];
  /** Exclude patterns */
  excludePatterns: string[];
  /** Enable this backup set */
  enabled: boolean;
  /** Follow symlinks */
  followSymlinks: boolean;
  /** Preserve permissions */
  preservePermissions: boolean;
}

/**
 * Backup retention policy
 */
export interface RetentionPolicy {
  /** Hourly backups to keep */
  hourlyCount: number;
  /** Daily backups to keep */
  dailyCount: number;
  /** Weekly backups to keep */
  weeklyCount: number;
  /** Monthly backups to keep */
  monthlyCount: number;
  /** Yearly backups to keep */
  yearlyCount: number;
  /** Minimum age before pruning (hours) */
  minimumAgeHours: number;
  /** Maximum storage size (GB), 0 = unlimited */
  maxStorageSizeGB: number;
}

/**
 * Backup destination configuration
 */
export interface BackupDestination {
  /** Destination ID */
  id: string;
  /** Destination type */
  type: 'local' | 's3' | 'gcs' | 'azure' | 'sftp' | 'nfs';
  /** Connection details */
  connection: DestinationConnection;
  /** Path prefix for backups */
  pathPrefix: string;
  /** Enable this destination */
  enabled: boolean;
  /** Priority (lower = primary) */
  priority: number;
}

/**
 * Destination connection details
 */
export interface DestinationConnection {
  /** Endpoint URL (for cloud providers) */
  endpoint?: string;
  /** Access key / username */
  accessKey?: string;
  /** Secret key / password (reference to secret manager) */
  secretKeyRef?: string;
  /** Bucket / container name */
  bucket?: string;
  /** Region (for AWS/GCP) */
  region?: string;
  /** Host (for SFTP/NFS) */
  host?: string;
  /** Additional options */
  options?: Record<string, string>;
}

/**
 * Backup schedule configuration
 */
export interface BackupSchedule {
  /** Full backup cron expression */
  fullBackupCron: string;
  /** Incremental backup cron expression */
  incrementalBackupCron?: string;
  /** Timezone for schedules */
  timezone: string;
  /** Backup window start time (HH:mm) */
  windowStart: string;
  /** Backup window end time (HH:mm) */
  windowEnd: string;
}

/**
 * Encryption configuration for backups
 */
export interface EncryptionConfig {
  /** Enable encryption */
  enabled: boolean;
  /** Encryption algorithm */
  algorithm: 'aes256-gcm' | 'aes256-cbc' | 'chacha20-poly1305';
  /** Key reference (from secrets manager) */
  keyRef: string;
  /** Key rotation interval in days */
  rotationDays: number;
}

/**
 * Backup notification configuration
 */
export interface BackupNotificationConfig {
  /** Notify on success */
  notifyOnSuccess: boolean;
  /** Notify on failure */
  notifyOnFailure: boolean;
  /** Notification channels */
  channels: NotificationChannel[];
  /** Include backup summary */
  includeSummary: boolean;
}

/**
 * Notification channel
 */
export interface NotificationChannel {
  /** Channel type */
  type: 'email' | 'slack' | 'webhook' | 'pagerduty';
  /** Channel configuration */
  config: Record<string, string>;
  /** Enable this channel */
  enabled: boolean;
}

/**
 * Backup job result
 */
export interface BackupJobResult {
  /** Job ID */
  jobId: string;
  /** Backup type */
  type: 'full' | 'incremental';
  /** Start time */
  startTime: Date;
  /** End time */
  endTime: Date;
  /** Status */
  status: 'success' | 'failed' | 'partial' | 'cancelled';
  /** Items backed up */
  itemsBackedUp: number;
  /** Total size in bytes */
  totalSizeBytes: number;
  /** Compressed size in bytes */
  compressedSizeBytes: number;
  /** Duration in seconds */
  durationSeconds: number;
  /** Destination used */
  destination: string;
  /** Errors encountered */
  errors: BackupError[];
  /** Verification status */
  verificationStatus: 'verified' | 'failed' | 'skipped';
}

/**
 * Backup error entry
 */
export interface BackupError {
  /** Error item path */
  item: string;
  /** Error message */
  message: string;
  /** Is fatal (stopped backup) */
  fatal: boolean;
}

// ============================================================================
// INFRASTRUCTURE SPECIFICATION TYPES
// ============================================================================

/**
 * Infrastructure specification for deployment targets
 */
export interface InfrastructureSpec {
  /** Specification ID */
  id: string;
  /** Name of the infrastructure */
  name: string;
  /** Description */
  description: string;
  /** Environment */
  environment: Environment;
  /** Provider */
  provider: CloudProvider;
  /** Region/zone */
  region: string;
  /** Availability zones */
  availabilityZones: string[];
  /** Network configuration */
  network: NetworkSpec;
  /** Compute resources */
  compute: ComputeSpec;
  /** Storage configuration */
  storage: StorageSpec;
  /** Security configuration */
  security: SecuritySpec;
  /** Tags/labels */
  tags: Record<string, string>;
}

/**
 * Supported cloud providers
 */
export type CloudProvider =
  | 'aws'
  | 'azure'
  | 'gcp'
  | 'on-premise'
  | 'hybrid'
  | 'openstack';

/**
 * Network specification
 */
export interface NetworkSpec {
  /** VPC/CIDR block */
  vpcCidr: string;
  /** Subnet configurations */
  subnets: SubnetSpec[];
  /** DNS configuration */
  dns: DnsSpec;
  /** VPN/tunnel configuration */
  vpn?: VpnSpec;
  /** Firewall rules */
  firewallRules: FirewallRule[];
  /** Load balancer configuration */
  loadBalancers: LoadBalancerSpec[];
  /** NAT gateway config */
  natGateway: NatGatewaySpec;
}

/**
 * Subnet specification
 */
export interface SubnetSpec {
  /** Subnet name */
  name: string;
  /** CIDR block */
  cidr: string;
  /** Availability zone */
  availabilityZone: string;
  /** Public or private */
  public: boolean;
  /** Purpose */
  purpose: 'general' | 'database' | 'application' | 'management' | 'dmz';
}

/**
 * DNS specification
 */
export interface DnsSpec {
  /** Base domain name */
  baseDomain: string;
  /** DNS provider */
  provider: 'route53' | 'cloudflare' | 'google' | 'internal';
  /** Record TTL */
  ttl: number;
  /** Records to create */
  records: DnsRecord[];
}

/**
 * DNS record
 */
export interface DnsRecord {
  /** Record name (subdomain) */
  name: string;
  /** Record type */
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'SRV';
  /** Record value */
  value: string;
  /** Priority (for MX/SRV) */
  priority?: number;
}

/**
 * VPN specification
 */
export interface VpnSpec {
  /** Enabled */
  enabled: boolean;
  /** VPN type */
  type: 'ipsec' | 'wireguard' | 'openvpn';
  /** Peer configurations */
  peers: VpnPeer[];
  /** CIDR ranges for VPN */
  cidrRanges: string[];
}

/**
 * VPN peer configuration
 */
export interface VpnPeer {
  /** Peer name */
  name: string;
  /** Public IP or endpoint */
  endpoint: string;
  /** Peer CIDR */
  cidr: string;
  /** Pre-shared key reference */
  pskRef: string;
}

/**
 * Firewall rule
 */
export interface FirewallRule {
  /** Rule name */
  name: string;
  /** Direction */
  direction: 'ingress' | 'egress';
  /** Allow or deny */
  action: 'allow' | 'deny';
  /** Protocol */
  protocol: 'tcp' | 'udp' | 'icmp' | 'all';
  /** Source CIDR/IP */
  source: string;
  /** Destination CIDR/IP */
  destination: string;
  /** Port range */
  fromPort: number;
  toPort: number;
  /** Priority (lower = higher priority) */
  priority: number;
}

/**
 * Load balancer specification
 */
export interface LoadBalancerSpec {
  /** LB name */
  name: string;
  /** Type */
  type: 'application' | 'network' | 'gateway';
  /** Internal or external */
  internal: boolean;
  /** Listener configurations */
  listeners: ListenerSpec[];
  /** Health check config */
  healthCheck: HealthCheckConfig;
  /** SSL certificate ARN/reference */
  certificateArn?: string;
}

/**
 * Listener specification
 */
export interface ListenerSpec {
  /** Port */
  port: number;
  /** Protocol */
  protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'TLS';
  /** Target group */
  targetGroup: string;
  /** SSL policy */
  sslPolicy?: string;
  /** Default actions */
  actions: RuleAction[];
}

/**
 * Rule action for load balancer
 */
export interface RuleAction {
  /** Action type */
  type: 'forward' | 'redirect' | 'fixed-response';
  /** Target for forward action */
  target?: string;
  /** Redirect configuration */
  redirect?: RedirectConfig;
}

/**
 * Redirect configuration
 */
export interface RedirectConfig {
  /** Redirect protocol */
  protocol: string;
  /** Redirect port */
  port: number;
  /** Redirect status code */
  statusCode: number;
}

/**
 * NAT Gateway specification
 */
export interface NatGatewaySpec {
  /** Enable NAT gateway */
  enabled: boolean;
  /** Number of NAT gateways */
  count: number;
  /** Allocation type */
  allocationType: 'eip' | 'dynamic';
}

/**
 * Compute specification
 */
export interface ComputeSpec {
  /** Node groups/pool configurations */
  nodeGroups: NodeGroupSpec[];
  /** Auto-scaling configuration */
  autoScaling: AutoScalingSpec;
  /** Instance metadata options */
  instanceMetadata: InstanceMetadataOptions;
}

/**
 * Node group specification
 */
export interface NodeGroupSpec {
  /** Group name */
  name: string;
  /** Instance type */
  instanceType: string;
  /** Minimum nodes */
  minSize: number;
  /** Desired nodes */
  desiredSize: number;
  /** Maximum nodes */
  maxSize: number;
  /** Capacity type */
  capacityType: 'on-demand' | 'spot';
  /** Labels for node selection */
  labels: Record<string, string>;
  /** Taints for node selection */
  taints: TaintSpec[];
  /** Boot disk size in GB */
  bootDiskSizeGb: number;
  /** GPU configuration */
  gpu?: GpuSpec;
}

/**
 * Taint specification
 */
export interface TaintSpec {
  /** Key */
  key: string;
  /** Value */
  value: string;
  /** Effect */
  effect: 'NoSchedule' | 'NoExecute' | 'PreferNoSchedule';
}

/**
 * GPU specification
 */
export interface GpuSpec {
  /** GPU type */
  type: string;
  /** Number of GPUs */
  count: number;
}

/**
 * Auto-scaling specification
 */
export interface AutoScalingSpec {
  /** Enable auto-scaling */
  enabled: boolean;
  /** Scale up CPU threshold percent */
  scaleUpCpuThreshold: number;
  /** Scale down CPU threshold percent */
  scaleDownCpuThreshold: number;
  /** Scale up memory threshold percent */
  scaleUpMemoryThreshold: number;
  /** Scale down memory threshold percent */
  scaleDownMemoryThreshold: number;
  /** Cooldown period in seconds */
  cooldownSeconds: number;
  /** Scale up stabilization window */
  scaleUpStabilizationSeconds: number;
  /** Scale down stabilization window */
  scaleDownStabilizationSeconds: number;
}

/**
 * Instance metadata options
 */
export interface InstanceMetadataOptions {
  /** Require IMDSv2 */
  requireImdsV2: boolean;
  /** Hop limit */
  hopLimit: number;
  /** Allowed tags */
  allowedTags: string[];
}

/**
 * Storage specification
 */
export interface StorageSpec {
  /** Storage class configurations */
  storageClasses: StorageClassSpec[];
  /** Persistent volume claims */
  persistentVolumes: PersistentVolumeSpec[];
  /** Object storage configuration */
  objectStorage: ObjectStorageSpec;
}

/**
 * Storage class specification
 */
export interface StorageClassSpec {
  /** Class name */
  name: string;
  /** Provisioner */
  provisioner: string;
  /** Default class */
  default: boolean;
  /** Parameters */
  parameters: Record<string, string>;
  /** Reclaim policy */
  reclaimPolicy: 'Retain' | 'Delete';
  /** Binding mode */
  bindingMode: 'Immediate' | 'WaitForFirstConsumer';
  /** Allow volume expansion */
  allowVolumeExpansion: boolean;
}

/**
 * Persistent volume specification
 */
export interface PersistentVolumeSpec {
  /** Volume name */
  name: string;
  /** Storage class */
  storageClass: string;
  /** Size in GB */
  sizeGb: number;
  /** Access mode */
  accessMode: 'ReadWriteOnce' | 'ReadWriteMany' | 'ReadOnlyMany';
  /** Purpose label */
  purpose: string;
}

/**
 * Object storage specification
 */
export interface ObjectStorageSpec {
  /** Bucket name */
  bucket: string;
  /** Size limit in GB (0 = unlimited) */
  sizeLimitGb: number;
  /** Versioning enabled */
  versioning: boolean;
  /** Lifecycle rules */
  lifecycleRules: LifecycleRule[];
  /** CORS configuration */
  cors: CorsRule[];
}

/**
 * Lifecycle rule for object storage
 */
export interface LifecycleRule {
  /** Rule ID */
  id: string;
  /** Status */
  status: 'Enabled' | 'Disabled';
  /** Transition to IA storage after days */
  transitionToIaDays?: number;
  /** Transition to Glacier after days */
  transitionToGlacierDays?: number;
  /** Expiration after days */
  expirationDays?: number;
  /** Prefix filter */
  prefix?: string;
}

/**
 * CORS rule
 */
export interface CorsRule {
  /** Allowed origins */
  allowedOrigins: string[];
  /** Allowed methods */
  allowedMethods: string[];
  /** Allowed headers */
  allowedHeaders: string[];
  /** Expose headers */
  exposeHeaders: string[];
  /** Max age in seconds */
  maxAgeSeconds: number;
}

/**
 * Security specification
 */
export interface SecuritySpec {
  /** Encryption at rest */
  encryptionAtRest: EncryptionAtRestSpec;
  **Encryption in transit */
  encryptionInTransit: EncryptionInTransitSpec;
  /** Identity and access management */
  iam: IamSpec;
  /** Security groups */
  securityGroups: SecurityGroupSpec[];
  /** Compliance requirements */
  compliance: ComplianceSpec;
  /** Audit logging */
  auditLogging: AuditLoggingSpec;
}

/**
 * Encryption at rest specification
 */
export interface EncryptionAtRestSpec {
  /** Enable encryption */
  enabled: boolean;
  /** KMS key ARN/reference */
  kmsKeyRef: string;
  /** Algorithm */
  algorithm: 'aes256' | 'rsa-2048';
}

/**
 * Encryption in transit specification
 */
export interface EncryptionInTransitSpec {
  /** Minimum TLS version */
  minTlsVersion: '1.2' | '1.3';
  /** Cipher suites */
  cipherSuites: string[];
  /** Perfect forward secrecy required */
  pfsRequired: boolean;
  /** Certificate management */
  certificateManagement: CertificateManagementSpec;
}

/**
 * Certificate management specification
 */
export interface CertificateManagementSpec {
  /** Provider */
  provider: 'acme' | 'aws-acm' | 'gcp-certificate-manager' | 'custom';
  /** Auto-renewal enabled */
  autoRenewal: boolean;
  /** Renewal days before expiry */
  renewDaysBeforeExpiry: number;
  /** Email for ACME */
  acmeEmail?: string;
  /** ACME server URL */
  acmeServerUrl?: string;
}

/**
 * IAM specification
 */
export interface IamSpec {
  /** Role configurations */
  roles: IamRoleSpec[];
  /** Policy configurations */
  policies: IamPolicySpec[];
  /** Service account configurations */
  serviceAccounts: ServiceAccountSpec[];
}

/**
 * IAM role specification
 */
export interface IamRoleSpec {
  /** Role name */
  name: string;
  /** Description */
  description: string;
  /** Trusted entities */
  trustedEntities: string[];
  /** Attached policies */
  attachedPolicies: string[];
  /** Permissions boundary */
  permissionsBoundary?: string;
}

/**
 * IAM policy specification
 */
export interface IamPolicySpec {
  /** Policy name */
  name: string;
  /** Policy document (JSON) */
  document: Record<string, unknown>;
}

/**
 * Service account specification
 */
export interface ServiceAccountSpec {
  /** Account name */
  name: string;
  /** Namespace */
  namespace: string;
  /** Roles to bind */
  roles: string[];
  /** Annotations */
  annotations?: Record<string, string>;
}

/**
 * Security group specification
 */
export interface SecurityGroupSpec {
  /** Group name */
  name: string;
  /** Description */
  description: string;
  /** Ingress rules */
  ingressRules: FirewallRule[];
  /** Egress rules */
  egressRules: FirewallRule[];
}

/**
 * Compliance specification
 */
export interface ComplianceSpec {
  /** Frameworks to comply with */
  frameworks: ComplianceFramework[];
  /** Custom compliance rules */
  customRules: ComplianceRule[];
}

/**
 * Compliance framework
 */
export type ComplianceFramework =
  | 'iso-27001'
  | 'nist-csf'
  | 'pci-dss'
  | 'gdpr'
  | 'hipaa'
  | 'soc2'
  | 'ansi'
  | 'custom-algeria';

/**
 * Compliance rule
 */
export interface ComplianceRule {
  /** Rule ID */
  id: string;
  /** Rule name */
  name: string;
  /** Description */
  description: string;
  /** Severity */
  severity: 'high' | 'medium' | 'low';
  /** Automated check */
  automated: boolean;
  /** Check command/script */
  checkCommand?: string;
}

/**
 * Audit logging specification
 */
export interface AuditLoggingSpec {
  /** Enable audit logging */
  enabled: boolean;
  /** Log destination */
  destination: 'cloudtrail' | 'stackdriver' | 'local' | 'external-syslog';
  /** Events to log */
  events: AuditEventCategory[];
  /** Retention days */
  retentionDays: number;
  /** Log forwarding */
  logForwarding: LogForwardingSpec;
}

/**
 * Audit event categories
 */
export type AuditEventCategory =
  | 'authentication'
  | 'authorization'
  | 'data-access'
  | 'configuration-change'
  | 'admin-actions'
  | 'data-modification'
  | 'network-activity';

/**
 * Log forwarding specification
 */
export interface LogForwardingSpec {
  /** Enable forwarding */
  enabled: boolean;
  /** Forwarding destination */
  destination: string;
  /** Filter expression */
  filter?: string;
  /** Include raw events */
  includeRawEvents: boolean;
}

// ============================================================================
// PIPELINE STAGES
// ============================================================================

/**
 * CI/CD Pipeline configuration
 */
export interface PipelineConfig {
  /** Pipeline ID */
  id: string;
  /** Pipeline name */
  name: string;
  /** Pipeline stages */
  stages: PipelineStage[];
  /** Global environment variables */
  globalEnvVars: EnvVar[];
  /** Triggers */
  triggers: PipelineTrigger[];
  /** Approval gates */
  approvalGates: ApprovalGate[];
  /** Notifications */
  notifications: PipelineNotification[];
  /** Artifacts configuration */
  artifacts: ArtifactConfig;
  /** Cache configuration */
  cache: CacheConfig;
}

/**
 * Pipeline stage
 */
export interface PipelineStage {
  /** Stage ID */
  id: string;
  /** Stage name */
  name: string;
  /** Stage type */
  type: PipelineStageType;
  /** Order in pipeline */
  order: number;
  /** Enable/disable stage */
  enabled: boolean;
  /** Run condition (expression) */
  condition?: string;
  /** Jobs in this stage */
  jobs: PipelineJob[];
  /** Timeout in minutes */
  timeoutMinutes: number;
  /** Allow failure */
  allowFailure: boolean;
  /** Retry configuration */
  retry: RetryConfig;
}

/**
 * Pipeline stage types
 */
export type PipelineStageType =
  | 'build'
  | 'test'
  | 'security-scan'
  | 'lint'
  | 'package'
  | 'deploy-staging'
  | 'integration-test'
  | 'deploy-production'
  | 'post-deploy'
  | 'cleanup';

/**
 * Pipeline job
 */
export interface PipelineJob {
  /** Job ID */
  id: string;
  /** Job name */
  name: string;
  /** Runner/executor */
  runner: RunnerConfig;
  /** Steps */
  steps: PipelineStep[];
  /** Environment variables */
  envVars: EnvVar[];
  /** Dependencies on other jobs */
  dependencies: string[];
  /** Resource limits */
  resources: ResourceLimits;
  /** Artifacts to produce/consume */
  artifacts: JobArtifact[];
  /** Parallelism */
  parallelism: number;
}

/**
 * Runner configuration
 */
export interface RunnerConfig {
  /** Runner type */
  type: 'docker' | 'shell' | 'kubernetes' | 'machine';
  /** Image (for Docker runners) */
  image?: string;
  /** Tags for runner selection */
  tags: string[];
  /** Resource labels */
  labels?: Record<string, string>;
}

/**
 * Pipeline step
 */
export interface PipelineStep {
  /** Step ID */
  id: string;
  /** Step name */
  name: string;
  /** Step type */
  type: 'run' | 'script' | 'checkout' | 'cache' | 'upload-artifact' | 'download-artifact' | 'service-container';
  /** Command/script to run */
  command?: string;
  /** Working directory */
  workingDirectory?: string;
  /** Condition for running */
  condition?: string;
  /** Timeout in minutes */
  timeoutMinutes?: number;
  /** Continue on error */
  continueOnError: boolean;
  /** Environment variables */
  envVars?: EnvVar[];
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Max attempts */
  maxAttempts: number;
  /** Retry conditions */
  retryOn: ('failure' | 'timeout' | 'abort')[];
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Initial wait seconds */
  initialWaitSeconds: number;
  /** Max wait seconds */
  maxWaitSeconds: number;
}

/**
 * Environment variable
 */
export interface EnvVar {
  /** Variable name */
  name: string;
  /** Variable value (or reference) */
  value: string;
  /** Is secret */
  secret: boolean;
  /** Mask in logs */
  mask: boolean;
}

/**
 * Trigger configuration
 */
export interface PipelineTrigger {
  /** Trigger type */
  type: 'push' | 'pull_request' | 'schedule' | 'manual' | 'webhook';
  /** Branch filters */
  branches?: string[];
  /** Paths to include */
  pathsInclude?: string[];
  /** Paths to exclude */
  pathsExclude?: string[];
  /** Schedule (cron) */
  schedule?: string;
  /** Webhook filters */
  webhookFilters?: WebhookFilter[];
}

/**
 * Webhook filter
 */
export interface WebhookFilter {
  /** JSON path to filter */
  jsonPath: string;
  /** Match expression */
  match: string;
  /** Regex match */
  regex: boolean;
}

/**
 * Approval gate
 */
export interface ApprovalGate {
  /** Gate ID */
  id: string;
  /** Gate name */
  name: string;
  /** Stage after which approval is required */
  afterStage: string;
  /** Required approvers */
  approvers: Approver[];
  /** Minimum approvals needed */
  minimumApprovals: number;
  /** Timeout in hours */
  timeoutHours: number;
  /** Skip conditions */
  skipConditions?: string[];
}

/**
 * Approver definition
 */
export interface Approver {
  /** Approver name/ID */
  name: string;
  /** Approver role */
  role: string;
  /** Team */
  team?: string;
  /** Required (vs optional) */
  required: boolean;
}

/**
 * Pipeline notification
 */
export interface PipelineNotification {
  /** Event type */
  event: 'success' | 'failure' | 'started' | 'approved' | 'rejected';
  /** Channels to notify */
  channels: NotificationChannel[];
  /** Message template */
  template?: string;
}

/**
 * Artifact configuration
 */
export interface ArtifactConfig {
  /** Artifact storage location */
  storagePath: string;
  /** Retention days */
  retentionDays: number;
  /** Compression */
  compress: boolean;
  /** Artifact patterns */
  patterns: string[];
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Enable caching */
  enabled: boolean;
  /** Cache paths */
  paths: string[];
  /** Cache key */
  key: string;
  /** Restore keys */
  restoreKeys: string[];
  /** Max cache size */
  maxSizeGb: number;
}

/**
 * Job artifact
 */
export interface JobArtifact {
  /** Artifact name */
  name: string;
  /** Path pattern */
  path: string;
  /** Expiry days */
  expireInDays: number;
  /** Produce or consume */
  direction: 'produce' | 'consume';
}

// ============================================================================
// RELEASE VERSIONING
// ============================================================================

/**
 * Semantic version representation
 */
export interface SemanticVersion {
  /** Major version */
  major: number;
  /** Minor version */
  minor: number;
  /** Patch version */
  patch: number;
  /** Pre-release label */
  prerelease?: string;
  /** Build metadata */
  build?: string;
}

/**
 * Release configuration
 */
export interface ReleaseConfig {
  /** Version scheme */
  versionScheme: 'semver' | 'calver' | 'custom';
  /** Current version */
  currentVersion: SemanticVersion;
  /** Next version (planned) */
  nextVersion?: SemanticVersion;
  /** Version bump strategy */
  bumpStrategy: BumpStrategy;
  /** Release branches */
  releaseBranches: ReleaseBranch[];
  /** Changelog configuration */
  changelog: ChangelogConfig;
  /** Tag configuration */
  tagging: TagConfig;
}

/**
 * Version bump strategies
 */
export type BumpStrategy =
  | 'major'
  | 'minor'
  | 'patch'
  | 'auto'
  | 'manual';

/**
 * Release branch
 */
export interface ReleaseBranch {
  /** Branch name */
  name: string;
  /** Pattern (regex) */
  pattern: string;
  /** Protected */
  protected: boolean;
  /** Required status checks */
  requiredChecks: string[];
}

/**
 * Changelog configuration
 */
export interface ChangelogConfig {
  /** Generate changelog */
  generate: boolean;
  /** Categories */
  categories: ChangelogCategory[];
  /** Template */
  template: 'keepachangelog' | 'custom';
  /** Output format */
  outputFormat: 'markdown' | 'json' | 'html';
  /** Header template */
  headerTemplate?: string;
  /** Entry template */
  entryTemplate?: string;
}

/**
 * Changelog category
 */
export interface ChangelogCategory {
  /** Category label */
  label: string;
  /** Commit message prefixes */
  prefixes: string[];
  /** Sort order */
  order: number;
}

/**
 * Tag configuration
 */
export interface TagConfig {
  /** Create git tags */
  createTags: true;
  /** Tag prefix */
  prefix: string;
  /** Tag suffix */
  suffix?: string;
  /** Annotate tags */
  annotated: boolean;
  /** GPG sign tags */
  gpgSign: boolean;
  /** Push tags automatically */
  pushAutomatically: boolean;
}

/**
 * Release record
 */
export interface ReleaseRecord {
  /** Release ID */
  id: string;
  /** Version */
  version: SemanticVersion;
  /** Status */
  status: 'draft' | 'released' | 'superseded' | 'yanked';
  /** Release date */
  releasedAt: Date;
  /** Release notes */
  notes: string;
  /** Artifacts */
  artifacts: ReleaseArtifact[];
  /** Commit SHA */
  commitSha: string;
  /** Author */
  author: string;
  /** Signatures */
  signatures?: ReleaseSignature[];
}

/**
 * Release artifact
 */
export interface ReleaseArtifact {
  /** Artifact name */
  name: string;
  /** Download URL */
  url: string;
  /** Size in bytes */
  size: number;
  /** Checksums */
  checksums: Checksum[];
  /** Platform */
  platform?: string;
  /** Architecture */
  architecture?: string;
}

/**
 * Checksum
 */
export interface Checksum {
  /** Algorithm */
  algorithm: 'sha256' | 'sha512' | 'md5';
  /** Hash value */
  hash: string;
}

/**
 * Release signature
 */
export interface ReleaseSignature {
  /** Signer identity */
  signer: string;
  /** Signature data */
  signature: string;
  /** Algorithm */
  algorithm: string;
  /** Timestamp */
  timestamp: Date;
}

// ============================================================================
// HOOK DEFINITIONS
// ============================================================================

/**
 * Hook definition for lifecycle events
 */
export interface HookDefinition {
  /** Hook ID */
  id: string;
  /** Hook name */
  name: string;
  /** Hook type */
  type: 'pre-deploy' | 'post-deploy' | 'pre-rollback' | 'post-rollback' | 'pre-backup' | 'post-backup';
  /** Execution order */
  order: number;
  /** Enable hook */
  enabled: boolean;
  /** Script/command to execute */
  command: string;
  /** Working directory */
  workingDirectory?: string;
  /** Timeout in seconds */
  timeoutSeconds: number;
  /** Continue on failure */
  continueOnError: boolean;
  /** Environment variables */
  envVars?: EnvVar[];
  /** Conditions for execution */
  conditions?: string[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Deployment options
 */
export interface DeployOptions {
  /** Dry run (no actual changes) */
  dryRun: boolean;
  /** Force deployment (skip confirmations) */
  force: boolean;
  /** Skip health checks */
  skipHealthChecks: boolean;
  /** Skip backups */
  skipBackups: boolean;
  /** Verbose output */
  verbose: boolean;
  /** Log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** Custom tags */
  tags?: string[];
  /** Limit to specific services */
  services?: SocServiceName[];
  /** Rolling update settings */
  rollingUpdate?: RollingUpdateConfig;
}

/**
 * Rolling update configuration
 */
export interface RollingUpdateConfig {
  /** Enable rolling updates */
  enabled: boolean;
  /** Maximum unavailable pods */
  maxUnavailable: string;
  /** Maximum surge pods */
  maxSurge: string;
  /** Delay between pod updates (seconds) */
  podUpdateDelaySeconds: number;
  /** Wait for ready state */
  waitForReady: boolean;
  /** Ready timeout per pod (seconds) */
  readyTimeoutSeconds: number;
}

/**
 * Deployment result
 */
export interface DeploymentResult {
  /** Success or failure */
  success: boolean;
  /** Deployment ID */
  deploymentId: string;
  /** Start time */
  startedAt: Date;
  /** End time */
  endedAt: Date;
  /** Duration in seconds */
  durationSeconds: number;
  /** Services deployed */
  servicesDeployed: number;
  /** Services failed */
  servicesFailed: number;
  /** Rollback performed */
  rollbackPerformed: boolean;
  /** Logs */
  logs: LogEntry[];
  /** Errors */
  errors: DeploymentError[];
}

/**
 * Log entry
 */
export interface LogEntry {
  /** Timestamp */
  timestamp: Date;
  /** Level */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Message */
  message: string;
  /** Component */
  component: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Deployment error
 */
export interface DeploymentError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Service affected */
  service?: SocServiceName;
  /** Fatal (stops deployment) */
  fatal: boolean;
  /** Stack trace */
  stackTrace?: string;
  /** Recovery suggestion */
  recoverySuggestion?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  /** Page number (1-based) */
  page: number;
  /** Page size */
  pageSize: number;
  /** Sort field */
  sortBy: string;
  /** Sort direction */
  sortDirection: 'asc' | 'desc';
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  /** Success flag */
  success: boolean;
  /** Data payload */
  data?: T;
  /** Error message */
  error?: string;
  /** Error code */
  errorCode?: string;
  /** Pagination info */
  pagination?: PaginationInfo;
  /** Request ID for tracing */
  requestId: string;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Pagination info
 */
export interface PaginationInfo {
  /** Current page */
  page: number;
  /** Page size */
  pageSize: number;
  /** Total items */
  totalItems: number;
  /** Total pages */
  totalPages: number;
  /** Has next page */
  hasNextPage: boolean;
  /** Has previous page */
  hasPreviousPage: boolean;
}
