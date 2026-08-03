/**
 * Djezzy SOC Platform - Cache Warming Cron Jobs
 * 
 * Pre-populate cache with frequently accessed data:
 * - Dashboard metrics and KPIs
 * - Reference data (lookup tables, threat intel)
 * - User permissions and session data
 * - Compliance framework definitions
 * - Common query results
 */

import { initCacheRedis } from './api-response-caching';
import { prewarmCache } from './query-result-cache';

// ============================================================
// TYPES
// ============================================================

interface CacheWarmingJob {
  id: string;
  name: string;
  description: string;
  schedule: string;           // Cron expression
  enabled: boolean;
  priority: 'high' | 'medium' | 'low';
  estimatedKeys: number;      // Approximate number of keys to warm
  estimatedMemoryMB: number;  // Estimated memory usage in MB
  execute: () => Promise<WarmingResult>;
}

interface WarmingResult {
  success: boolean;
  durationMs: number;
  keysWarmed: number;
  errors: string[];
  timestamp: Date;
}

interface WarmingStats {
  totalJobsRun: number;
  totalKeysWarmed: number;
  totalErrors: number;
  lastRunTime: Date | null;
  avgDurationMs: number;
}

// ============================================================
// CACHE WARMING JOB DEFINITIONS
// ============================================================

const warmingJobs: Map<string, CacheWarmingJob> = new Map();

let globalStats: WarmingStats = {
  totalJobsRun: 0,
  totalKeysWarmed: 0,
  totalErrors: 0,
  lastRunTime: null,
  avgDurationMs: 0,
};

/**
 * Initialize all cache warming jobs
 */
export function initializeWarmingJobs(): void {
  // Register all jobs
  registerJob(dashboardMetricsJob);
  registerJob(alertSummaryJob);
  registerJob(incidentStatsJob);
  registerJob(threatIntelJob);
  registerJob(referenceDataJob);
  registerJob(complianceFrameworksJob);
  registerJob(userPermissionsJob);
  registerJob(geoipDataJob);
  
  console.log(`[CacheWarming] Initialized ${warmingJobs.size} warming jobs`);
}

function registerJob(job: CacheWarmingJob): void {
  warmingJobs.set(job.id, job);
}

// ============================================================
// JOB DEFINITIONS
// ============================================================

/**
 * Job 1: Dashboard Metrics Warm-up
 * Runs every minute to keep dashboard data fresh
 */
const dashboardMetricsJob: CacheWarmingJob = {
  id: 'dashboard-metrics',
  name: 'Dashboard Metrics Cache Warmer',
  description: 'Pre-warm dashboard KPI metrics for fast initial load',
  schedule: '* * * * *',        // Every minute
  enabled: true,
  priority: 'high',
  estimatedKeys: 50,
  estimatedMemoryMB: 5,
  
  async execute(): Promise<WarmingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let keysWarmed = 0;
    
    try {
      const redis = initCacheRedis();
      
      // Main dashboard metrics
      const dashboardData = {
        totalAlerts: await fetchMetric('alerts:total:24h'),
        criticalAlerts: await fetchMetric('alerts:critical:active'),
        openIncidents: await fetchMetric('incidents:open'),
        epsCurrent: await fetchMetric('events:eps:current'),
        threatLevel: await fetchMetric('threats:level:current'),
        systemHealth: await fetchMetric('system:health:overall'),
        
        // Time series data for charts
        alertsTrend24h: await fetchMetric('alerts:trend:24h'),
        eventsBySeverity: await fetchMetric('events:by_severity:24h'),
        topSourceIps: await fetchMetric('events:top_sources:24h'),
        incidentsByStatus: await fetchMetric('incidents:by_status'),
      };
      
      // Cache each metric individually
      const pipeline = redis.pipeline();
      
      Object.entries(dashboardData).forEach(([key, value]) => {
        if (value !== null) {
          pipeline.setex(
            `soc:warm:dashboard:${key}`,
            90, // 90 second TTL (refresh every minute)
            JSON.stringify({
              data: value,
              warmedAt: new Date().toISOString(),
              source: 'cache-warmer',
            })
          );
          keysWarmed++;
        }
      });
      
      await pipeline.exec();
      
    } catch (error) {
      errors.push(`Dashboard metrics error: ${error}`);
    }
    
    return buildResult(startTime, keysWarmed, errors);
  },
};

/**
 * Job 2: Active Alerts Summary
 */
const alertSummaryJob: CacheWarmingJob = {
  id: 'alert-summary',
  name: 'Active Alerts Summary',
  description: 'Pre-cache active alert summaries for quick listing',
  schedule: '*/2 * * * *',       // Every 2 minutes
  enabled: true,
  priority: 'high',
  estimatedKeys: 100,
  estimatedMemoryMB: 10,
  
  async execute(): Promise<WarmingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let keysWarmed = 0;
    
    try {
      const redis = initCacheRedis();
      
      // Fetch recent alerts by severity
      const severities = ['critical', 'high', 'medium', 'low'];
      
      for (const severity of severities) {
        const alerts = await fetchAlertsBySeverity(severity, 20);
        
        if (alerts.length > 0) {
          await redis.setex(
            `soc:warm:alerts:active:${severity}`,
            120, // 2 minutes
            JSON.stringify({ data: alerts, count: alerts.length })
          );
          keysWarmed++;
        }
      }
      
      // Alert counts by status
      const statusCounts = await fetchAlertCountsByStatus();
      await redis.setex(
        `soc:warm:alerts:status_counts`,
        120,
        JSON.stringify(statusCounts)
      );
      keysWarmed++;
      
    } catch (error) {
      errors.push(`Alert summary error: ${error}`);
    }
    
    return buildResult(startTime, keysWarmed, errors);
  },
};

/**
 * Job 3: Incident Statistics
 */
const incidentStatsJob: CacheWarmingJob = {
  id: 'incident-stats',
  name: 'Incident Statistics',
  description: 'Warm incident-related caches for faster access',
  schedule: '*/5 * * * *',       // Every 5 minutes
  enabled: true,
  priority: 'medium',
  estimatedKeys: 30,
  estimatedMemoryMB: 3,
  
  async execute(): Promise<WarmingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let keysWarmed = 0;
    
    try {
      const redis = initCacheRedis();
      
      // Open incidents summary
      const openIncidents = await fetchOpenIncidents(10);
      await redis.setex(
        `soc:warm:incidents:open_summary`,
        300,
        JSON.stringify(openIncidents)
      );
      keysWarmed++;
      
      // Incident statistics
      const stats = await fetchIncidentStats();
      await redis.setex(
        `soc:warm:incidents:stats`,
        300,
        JSON.stringify(stats)
      );
      keysWarmed++;
      
      // MTTR and other KPIs
      const kpis = await fetchIncidentKPIs();
      await redis.setex(
        `soc:warm:incidents:kpis`,
        600, // 10 minutes for KPIs
        JSON.stringify(kpis)
      );
      keysWarmed++;
      
    } catch (error) {
      errors.push(`Incident stats error: ${error}`);
    }
    
    return buildResult(startTime, keysWarmed, errors);
  },
};

/**
 * Job 4: Threat Intelligence Feeds
 */
const threatIntelJob: CacheWarmingJob = {
  id: 'threat-intel',
  name: 'Threat Intelligence Cache',
  description: 'Pre-load threat intelligence data from external feeds',
  schedule: '*/15 * * * *',     // Every 15 minutes
  enabled: true,
  priority: 'medium',
  estimatedKeys: 200,
  estimatedMemoryMB: 25,
  
  async execute(): Promise<WarmingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let keysWarmed = 0;
    
    try {
      const redis = initCacheRedis();
      
      // Active threats list
      const activeThreats = await fetchActiveThreats(50);
      await redis.setex(
        `soc:warm:threats:active`,
        900, // 15 minutes
        JSON.stringify(activeThreats)
      );
      keysWarmed++;
      
      // IOCs (Indicators of Compromise)
      const iocs = await fetchRecentIOCs(100);
      await redis.setex(
        `soc:warm:threats:iocs_recent`,
        900,
        JSON.stringify(iocs)
      );
      keysWarmed++;
      
      // Threat actor profiles
      const actors = await fetchThreatActors();
      await redis.setex(
        `soc:warm:threats:actors`,
        3600, // 1 hour - changes less frequently
        JSON.stringify(actors)
      );
      keysWarmed++;
      
    } catch (error) {
      errors.push(`Threat intel error: ${error}`);
    }
    
    return buildResult(startTime, keysWarmed, errors);
  },
};

/**
 * Job 5: Reference Data (Lookup Tables)
 */
const referenceDataJob: CacheWarmingJob = {
  id: 'reference-data',
  name: 'Reference Data Cache',
  description: 'Load lookup tables and reference data into cache',
  schedule: '0 */6 * * *',      // Every 6 hours
  enabled: true,
  priority: 'low',
  estimatedKeys: 500,
  estimatedMemoryMB: 15,
  
  async execute(): Promise<WarmingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let keysWarmed = 0;
    
    try {
      const redis = initCacheRedis();
      
      // Event type taxonomy
      const eventTypes = await fetchEventTypes();
      await redis.setex(
        `soc:ref:event_types`,
        21600, // 6 hours
        JSON.stringify(eventTypes)
      );
      keysWarmed++;
      
      // Severity levels definition
      const severities = await fetchSeverityLevels();
      await redis.setex(
        `soc:ref:severities`,
        86400, // 24 hours - rarely changes
        JSON.stringify(severities)
      );
      keysWarmed++;
      
      // Source system mappings
      const sources = await fetchSourceSystems();
      await redis.setex(
        `soc:ref:sources`,
        21600,
        JSON.stringify(sources)
      );
      keysWarmed++;
      
      // Country/region mappings
      const countries = await fetchCountryMappings();
      await redis.setex(
        `soc:ref:countries`,
        604800, // 7 days
        JSON.stringify(countries)
      );
      keysWarmed++;
      
      // MITRE ATT&CK mappings
      const mitreMappings = await fetchMitreMappings();
      await redis.setex(
        `soc:ref:mitre_attack`,
        86400,
        JSON.stringify(mitreMappings)
      );
      keysWarmed++;
      
    } catch (error) {
      errors.push(`Reference data error: ${error}`);
    }
    
    return buildResult(startTime, keysWarmed, errors);
  },
};

/**
 * Job 6: Compliance Framework Definitions
 */
const complianceFrameworksJob: CacheWarmingJob = {
  id: 'compliance-frameworks',
  name: 'Compliance Frameworks Cache',
  description: 'Pre-load ARTP/ANSSI compliance frameworks',
  schedule: '0 0 * * *',          // Daily at midnight
  enabled: true,
  priority: 'low',
  estimatedKeys: 100,
  estimatedMemoryMB: 8,
  
  async execute(): Promise<WarmingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let keysWarmed = 0;
    
    try {
      const redis = initCacheRedis();
      
      // ARTP Framework
      const artpFramework = await fetchComplianceFramework('artp');
      await redis.setex(
        `soc:ref:compliance:artp`,
        86400,
        JSON.stringify(artpFramework)
      );
      keysWarmed++;
      
      // ANSSI Framework
      const anssiFramework = await fetchComplianceFramework('anssi');
      await redis.setex(
        `soc:ref:compliance:anssi`,
        86400,
        JSON.stringify(anssiFramework)
      );
      keysWarmed++;
      
      // Control mappings
      const controlMappings = await fetchControlMappings();
      await redis.setex(
        `soc:ref:compliance:control_mappings`,
        86400,
        JSON.stringify(controlMappings)
      );
      keysWarmed++;
      
    } catch (error) {
      errors.push(`Compliance frameworks error: ${error}`);
    }
    
    return buildResult(startTime, keysWarmed, errors);
  },
};

/**
 * Job 7: Active User Permissions
 */
const userPermissionsJob: CacheWarmingJob = {
  id: 'user-permissions',
  name: 'User Permissions Cache',
  description: 'Pre-cache permissions for recently active users',
  schedule: '*/10 * * * *',     // Every 10 minutes
  enabled: true,
  priority: 'medium',
  estimatedKeys: 500,
  estimatedMemoryMB: 5,
  
  async execute(): Promise<WarmingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let keysWarmed = 0;
    
    try {
      const redis = initCacheRedis();
      
      // Get recently active user IDs
      const activeUserIds = await fetchRecentlyActiveUsers(100);
      
      for (const userId of activeUserIds) {
        const permissions = await fetchUserPermissions(userId);
        
        if (permissions) {
          await redis.setex(
            `soc:user:${userId}:permissions`,
            600, // 10 minutes
            JSON.stringify(permissions)
          );
          keysWarmed++;
        }
      }
      
    } catch (error) {
      errors.push(`User permissions error: ${error}`);
    }
    
    return buildResult(startTime, keysWarmed, errors);
  },
};

/**
 * Job 8: GeoIP Data
 */
const geoipDataJob: CacheWarmingJob = {
  id: 'geoip-data',
  name: 'GeoIP Data Cache',
  description: 'Pre-load GeoIP lookup data for Algeria region',
  schedule: '0 3 * * *',         // Daily at 3 AM
  enabled: true,
  priority: 'low',
  estimatedKeys: 1000,
  estimatedMemoryMB: 50,
  
  async execute(): Promise<WarmingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let keysWarmed = 0;
    
    try {
      const redis = initCacheRedis();
      
      // Algeria IP ranges (primary focus)
      const algeriaRanges = await fetchGeoIPRanges('DZ');
      await redis.setex(
        `soc:geoip:DZ:ranges`,
        86400,
        JSON.stringify(algeriaRanges)
      );
      keysWarmed++;
      
      // City-level data for major Algerian cities
      const cities = ['Algiers', 'Oran', 'Constantine', 'Annaba', 'Blida'];
      for (const city of cities) {
        const cityData = await fetchGeoIPCity(city);
        await redis.setex(
          `soc:geoip:city:${city.toLowerCase()}`,
          604800, // 7 days
          JSON.stringify(cityData)
        );
        keysWarmed++;
      }
      
      // ASN data for common telecom providers
      const asns = await fetchTelecomASNs(['DJEZZY', 'MOBILIS', 'OOREDOO']);
      for (const asn of asns) {
        await redis.setex(
          `soc:geoip:asn:${asn.asn}`,
          604800,
          JSON.stringify(asn)
        );
        keysWarmed++;
      }
      
    } catch (error) {
      errors.push(`GeoIP data error: ${error}`);
    }
    
    return buildResult(startTime, keysWarmed, errors);
  },
};

// ============================================================
// DATA FETCHING STUBS (Replace with actual implementations)
// ============================================================

// These functions would be replaced with actual database/API calls

async function fetchMetric(metricName: string): Promise<unknown> {
  // Implementation would query actual metrics store
  return { value: Math.floor(Math.random() * 1000), timestamp: new Date().toISOString() };
}

async function fetchAlertsBySeverity(severity: string, limit: number): Promise<unknown[]> {
  return Array.from({ length: limit }, (_, i) => ({
    id: `alert-${i}`,
    severity,
    title: `Test Alert ${i}`,
  }));
}

async function fetchAlertCountsByStatus(): Promise<Record<string, number>> {
  return { new: 10, acknowledged: 25, in_progress: 15, closed: 150 };
}

async function fetchOpenIncidents(limit: number): Promise<unknown[]> {
  return [];
}

async function fetchIncidentStats(): Promise<unknown> {
  return {};
}

async function fetchIncidentKPIs(): Promise<unknown> {
  return { mttr_hours: 4.5, mtbf_days: 30 };
}

async function fetchActiveThreats(limit: number): Promise<unknown[]> {
  return [];
}

async function fetchRecentIOCs(limit: number): Promise<unknown[]> {
  return [];
}

async function fetchThreatActors(): Promise<unknown[]> {
  return [];
}

async function fetchEventTypes(): Promise<unknown[]> {
  return [];
}

async function fetchSeverityLevels(): Promise<unknown[]> {
  return [];
}

async function fetchSourceSystems(): Promise<unknown[]> {
  return [];
}

async function fetchCountryMappings(): Promise<unknown> {
  return {};
}

async function fetchMitreMappings(): Promise<unknown> {
  return {};
}

async function fetchComplianceFramework(framework: string): Promise<unknown> {
  return {};
}

async function fetchControlMappings(): Promise<unknown> {
  return {};
}

async function fetchRecentlyActiveUsers(limit: number): Promise<string[]> {
  return [`user-${Math.floor(Math.random() * 100)}`];
}

async function fetchUserPermissions(userId: string): Promise<unknown | null> {
  return { roles: ['analyst'], permissions: ['alerts:read'] };
}

async function fetchGeoIPRanges(countryCode: string): Promise<unknown> {
  return { ranges: [], count: 0 };
}

async function fetchGeoIPCity(city: string): Promise<unknown> {
  return { city, lat: 0, lon: 0 };
}

async function fetchTelecomASNs(providers: string[]): Promise<Array<{ asn: string; name: string }>> {
  return providers.map(p => ({ asn: `AS${Math.floor(Math.random() * 99999)}`, name: p }));
}

// ============================================================
// EXECUTION & SCHEDULING
// ============================================================

function buildResult(startTime: number, keysWarmed: number, errors: string[]): WarmingResult {
  return {
    success: errors.length === 0,
    durationMs: Date.now() - startTime,
    keysWarmed,
    errors,
    timestamp: new Date(),
  };
}

/**
 * Run a specific warming job by ID
 */
export async function runJob(jobId: string): Promise<WarmingResult> {
  const job = warmingJobs.get(jobId);
  
  if (!job) {
    throw new Error(`Unknown warming job: ${jobId}`);
  }
  
  if (!job.enabled) {
    return {
      success: false,
      durationMs: 0,
      keysWarmed: 0,
      errors: [`${'Job is disabled'}`],
      timestamp: new Date(),
    };
  }
  
  console.log(`[CacheWarming] Running job: ${job.name}`);
  
  const result = await job.execute();
  
  // Update global stats
  globalStats.totalJobsRun++;
  globalStats.totalKeysWarmed += result.keysWarmed;
  globalStats.totalErrors += result.errors.length;
  globalStats.lastRunTime = result.timestamp;
  globalStats.avgDurationMs = (
    (globalStats.avgDurationMs * (globalStats.totalJobsRun - 1) + result.durationMs) / 
    globalStats.totalJobsRun
  );
  
  return result;
}

/**
 * Run all enabled jobs (for manual trigger or startup)
 */
export async function runAllJobs(): Promise<Map<string, WarmingResult>> {
  const results = new Map<string, WarmingResult>();
  
  // Sort by priority (high first)
  const sortedJobs = Array.from(warmingJobs.values())
    .filter(j => j.enabled)
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });
  
  for (const job of sortedJobs) {
    try {
      const result = await runJob(job.id);
      results.set(job.id, result);
    } catch (error) {
      results.set(job.id, {
        success: false,
        durationMs: 0,
        keysWarmed: 0,
        errors: [(error as Error).message],
        timestamp: new Date(),
      });
    }
  }
  
  return results;
}

/**
 * Get all registered job definitions
 */
export function getRegisteredJobs(): CacheWarmingJob[] {
  return Array.from(warmingJobs.values());
}

/**
 * Get warming statistics
 */
export function getWarmingStats(): WarmingStats {
  return { ...globalStats };
}

/**
 * Enable or disable a job
 */
export function setJobEnabled(jobId: string, enabled: boolean): boolean {
  const job = warmingJobs.get(jobId);
  if (job) {
    job.enabled = enabled;
    return true;
  }
  return false;
}

// Export types
export type { CacheWarmingJob, WarmingResult, WarmingStats };
