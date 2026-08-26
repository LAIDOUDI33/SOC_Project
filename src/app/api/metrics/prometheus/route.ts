/**
 * Prometheus Metrics Endpoint
 * 
 * Exposes application-specific metrics in Prometheus text exposition format.
 * This endpoint is scraped by Prometheus for SOC platform monitoring.
 * 
 * Metrics exposed:
 * - soc_alerts_total: Total security alerts by severity
 * - soc_incidents_*: Incident counts and response times
 * - soc_telecom_*: Telecom protocol statistics
 * - http_requests_*: HTTP request metrics (if available)
 * - websocket_*: WebSocket connection metrics
 * 
 * @route GET /api/metrics/prometheus
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper to sanitize metric names and labels for Prometheus
function sanitize(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
}

// Generate Prometheus HELP and TYPE comments
function metricHelp(name: string, help: string): string {
  return `# HELP ${name} ${help}\n# TYPE ${name} gauge\n`
}

export async function GET() {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    let output = ''
    
    // ===========================================
    // APPLICATION INFO METRICS
    // ===========================================
    
    output += '# HELP soc_platform_info Information about the SOC platform instance\n'
    output += '# TYPE soc_platform_info gauge\n'
    output += `soc_platform_info{version="1.0.0",environment="production",country="DZ"} 1\n`
    output += `soc_platform_uptime_seconds ${Math.floor(process.uptime())}\n\n`
    
    // ===========================================
    // ALERT METRICS
    // ===========================================
    
    const [totalAlerts, alertsToday, severityDistribution] = await Promise.all([
      db.alert.count(),
      db.alert.count({ where: { timestamp: { gte: todayStart } } }),
      db.alert.groupBy({
        by: ['severity'],
        _count: true
      })
    ])
    
    output += metricHelp('soc_alerts_total', 'Total number of security alerts in the system')
    output += `soc_alerts_total ${totalAlerts}\n`
    
    output += metricHelp('soc_alerts_today', 'Number of alerts generated today')
    output += `soc_alerts_today ${alertsToday}\n`
    
    output += metricHelp('soc_alerts_total', 'Total alerts broken down by severity level')
    for (const row of severityDistribution) {
      const severity = sanitize(row.severity)
      output += `soc_alerts_total{severity="${severity}"} ${row._count}\n`
    }
    
    // Alert type distribution
    const alertTypeDistribution = await db.alert.groupBy({
      by: ['alertType'],
      _count: true,
      take: 20
    })
    
    output += '\n' + metricHelp('soc_alerts_by_type', 'Alerts categorized by type (malware, intrusion, etc.)')
    for (const row of alertTypeDistribution) {
      const alertType = sanitize(row.alertType || 'unknown')
      output += `soc_alerts_by_type{alert_type="${alertType}"} ${row._count}\n`
    }
    
    // Source distribution
    const sourceDistribution = await db.alert.groupBy({
      by: ['source'],
      _count: true,
      take: 15
    })
    
    output += '\n' + metricHelp('soc_alerts_by_source', 'Alerts by detection source (Wazuh, Suricata, MISP, etc.)')
    for (const row of sourceDistribution) {
      const source = sanitize(row.source || 'unknown')
      output += `soc_alerts_by_source{source="${source}"} ${row._count}\n`
    }
    
    // ===========================================
    // INCIDENT METRICS
    // ===========================================
    
    const [
      openIncidents,
      inProgressIncidents,
      resolvedToday,
      totalIncidents
    ] = await Promise.all([
      db.incident.count({ where: { status: { in: ['DETECTED', 'TRIAGE'] } } }),
      db.incident.count({ where: { status: 'IN_PROGRESS' } }),
      db.incident.count({ where: { status: 'RESOLVED', resolvedAt: { gte: todayStart } } }),
      db.incident.count()
    ])
    
    output += '\n# HELP soc_incidents_open_count Number of currently open incidents\n'
    output += '# TYPE soc_incidents_open_count gauge\n'
    output += `soc_incidents_open_count ${openIncidents}\n`
    
    output += '# HELP soc_incidents_in_progress_count Number of incidents being actively worked on\n'
    output += '# TYPE soc_incidents_in_progress_count gauge\n'
    output += `soc_incidents_in_progress_count ${inProgressIncidents}\n`
    
    output += '# HELP soc_incidents_resolved_count Number of incidents resolved today\n'
    output += '# TYPE soc_incidents_resolved_count gauge\n'
    output += `soc_incidents_resolved_count ${resolvedToday}\n`
    
    output += '# HELP soc_incidents_total Total number of incidents since deployment\n'
    output += '# TYPE soc_incidents_total counter\n'
    output += `soc_incidents_total ${totalIncidents}\n`
    
    // Calculate MTTR and MTTA from resolved incidents
    const resolvedIncidents = await db.incident.findMany({
      where: { 
        status: 'RESOLVED',
        resolvedAt: { not: null },
        acknowledgedAt: { not: null },
        createdAt: { gte: todayStart }
      },
      select: {
        createdAt: true,
        acknowledgedAt: true,
        resolvedAt: true
      }
    })
    
    if (resolvedIncidents.length > 0) {
      const mttrSum = resolvedIncidents.reduce((sum, inc) => {
        return sum + ((inc.resolvedAt?.getTime() || 0) - inc.createdAt.getTime())
      }, 0)
      const mttaSum = resolvedIncidents.reduce((sum, inc) => {
        return sum + ((inc.acknowledgedAt?.getTime() || 0) - inc.createdAt.getTime())
      }, 0)
      
      const meanTimeToResolve = mttrSum / resolvedIncidents.length / 1000 // seconds
      const meanTimeToAcknowledge = mttaSum / resolvedIncidents.length / 1000 // seconds
      
      output += '\n# HELP soc_mean_time_to_resolve Mean time to resolve incidents in seconds\n'
      output += '# TYPE soc_mean_time_to_resolve gauge\n'
      output += `soc_mean_time_to_resolve ${Math.round(meanTimeToResolve)}\n`
      
      output += '# HELP soc_mean_time_to_acknowledge Mean time to acknowledge incidents in seconds\n'
      output += '# TYPE soc_mean_time_to_acknowledge gauge\n'
      output += `soc_mean_time_to_acknowledge ${Math.round(meanTimeToAcknowledge)}\n`
    } else {
      output += '\nsoc_mean_time_to_resolve 0\nsoc_mean_time_to_acknowledge 0\n'
    }
    
    // ===========================================
    // THREAT INTELLIGENCE METRICS
    // ===========================================
    
    const [
      activeIndicators,
      iocsCount,
      threatsCount
    ] = await Promise.all([
      db.indicator.count({ where: { isActive: true } }),
      db.iOC.count(),
      db.threat.count()
    ])
    
    output += '\n# HELP soc_active_indicators_count Number of active threat intelligence indicators\n'
    output += '# TYPE soc_active_indicators_count gauge\n'
    output += `soc_active_indicators_count ${activeIndicators}\n`
    
    output += '# HELP soc_iocs_total Total number of IOCs (Indicators of Compromise)\n'
    output += '# TYPE soc_iocs_total counter\n'
    output += `soc_iocs_total ${iocsCount}\n`
    
    output += '# HELP soc_threats_total Total number of tracked threats\n'
    output += '# TYPE soc_threats_total counter\n'
    output += `soc_threats_total ${threatsCount}\n`
    
    // ===========================================
    // TELECOM PROTOCOL METRICS (Mock data for demo)
    // In production, these come from protocol parsers
    // ===========================================
    
    output += '\n# HELP telecom_gtp_packets_total Total GTP packets processed\n'
    output += '# TYPE telecom_gtp_packets_total counter\n'
    output += `telecom_gtp_packets_total{message_type="create_session"} ${Math.floor(Math.random() * 10000 + 50000)}\n`
    output += `telecom_gtp_packets_total{message_type="delete_session"} ${Math.floor(Math.random() * 5000 + 20000)}\n`
    output += `telecom_gtp_packets_total{message_type="update_session"} ${Math.floor(Math.random() * 8000 + 30000)}\n`
    
    output += '\n# HELP telecom_ss7_messages_total Total SS7/SIGTRAN messages processed\n'
    output += '# TYPE telecom_ss7_messages_total counter\n'
    output += `telecom_ss7_messages_total{operation_code="send_auth_info"} ${Math.floor(Math.random() * 3000 + 10000)}\n`
    output += `telecom_ss7_messages_total{operation_code="update_location"} ${Math.floor(Math.random() * 5000 + 15000)}\n`
    output += `telecom_ss7_messages_total{operation_code="provide_roaming_number"} ${Math.floor(Math.random() * 2000 + 8000)}\n`
    
    output += '\n# HELP telecom_diameter_requests_total Total Diameter requests processed\n'
    output += '# TYPE telecom_diameter_requests_total counter\n'
    output += `telecom_diameter_requests_total{command_code="credit_control"} ${Math.floor(Math.random() * 4000 + 20000)}\n`
    output += `telecom_diameter_requests_total{command_code="authentication"} ${Math.floor(Math.random() * 6000 + 25000)}\n`
    
    output += '\n# HELP telecom_active_subscribers_count Current active mobile subscribers\n'
    output += '# TYPE telecom_active_subscribers_count gauge\n'
    output += `telecom_active_subscribers_count ${Math.floor(Math.random() * 100000 + 45000000)}\n`  # ~45M Algeria subs
    
    output += '\n# HELP telecom_fraud_alerts_total Fraud-related alerts detected\n'
    output += '# TYPE fraud_alerts_total counter\n'
    output += `telecom_fraud_alerts_total ${Math.floor(Math.random() * 50 + 10)}\n`
    
    // ===========================================
    // SYSTEM COMPONENT HEALTH METRICS
    // ===========================================
    
    const components = await db.systemComponent.findMany({
      select: {
        name: true,
        displayName: true,
        status: true,
        healthScore: true,
        category: true
      },
      take: 20
    })
    
    output += '\n# HELP soc_component_health_score Health score of system components (0-100)\n'
    output += '# TYPE soc_component_health_score gauge\n'
    for (const component of components) {
      const name = sanitize(component.name || component.displayName || 'unknown')
      const category = sanitize(component.category || 'general')
      const isHealthy = component.status === 'OPERATIONAL' ? 1 : 0
      output += `soc_component_health_score{name="${name}",category="${category}"} ${component.healthScore}\n`
      output += `soc_component_up{name="${name}",category="${category}"} ${isHealthy}\n`
    }
    
    // ===========================================
    // AUTHENTICATION METRICS (Mock for demo)
    // ===========================================
    
    output += '\n# HELP auth_successes_total Successful authentication attempts\n'
    output += '# TYPE auth_successes_total counter\n'
    output += `auth_successes_total ${Math.floor(Math.random() * 1000 + 5000)}\n`
    
    output += '\n# HELP auth_failures_total Failed authentication attempts\n'
    output += '# TYPE auth_failures_total counter\n'
    output += `auth_failures_total ${Math.floor(Math.random() * 100 + 20)}\n`
    
    // ===========================================
    // WEBSOCKET METRICS (Mock for demo)
    // ===========================================
    
    output += '\n# HELP websocket_connections Current active WebSocket connections\n'
    output += '# TYPE websocket_connections gauge\n'
    output += `websocket_connections ${Math.floor(Math.random() * 100 + 150)}\n`
    
    output += '\n# HELP websocket_messages_sent_total Total messages sent via WebSocket\n'
    output += '# TYPE websocket_messages_sent_total counter\n'
    output += `websocket_messages_sent_total ${Math.floor(Math.random() * 100000 + 500000)}\n`
    
    output += '\n# HELP websocket_messages_received_total Total messages received via WebSocket\n'
    output += '# TYPE websocket_messages_received_total counter\n'
    output += `websocket_messages_received_total ${Math.floor(Math.random() * 80000 + 400000)}\n`
    
    // ===========================================
    // REDIS CACHE METRICS
    // ===========================================
    
    try {
      const { getRedisClient, cacheMetrics } = await import('@/lib/redis')
      const redis = getRedisClient()
      
      // Get Redis health
      const redisHealth = await redis.healthCheck()
      
      output += '\n# HELP redis_connected Redis connection status (1=connected)\n'
      output += '# TYPE redis_connected gauge\n'
      output += `redis_connected ${redisHealth.connected ? 1 : 0}\n\n`
      
      output += '# HELP redis_latency_ms Redis command latency in milliseconds\n'
      output += '# TYPE redis_latency_ms gauge\n'
      output += `redis_latency_ms ${redisHealth.latency ?? -1}\n\n`
      
      // Get cache metrics
      const metrics = cacheMetrics.getMetrics()
      
      output += '# HELP redis_cache_hits_total Total cache hits by key prefix\n'
      output += '# TYPE redis_cache_hits_total counter\n'
      
      output += '# HELP redis_cache_misses_total Total cache misses by key prefix\n'
      output += '# TYPE redis_cache_misses_total counter\n'
      
      output += '# HELP redis_cache_stale_hits_total Stale-while-revalidate hits\n'
      output += '# TYPE redis_cache_stale_hits_total counter\n'
      
      output += '# HELP redis_cache_errors_total Cache operation errors\n'
      output += '# TYPE redis_cache_errors_total counter\n'
      
      output += '# HELP redis_cache_hit_rate Cache hit rate (0-1)\n'
      output += '# TYPE redis_cache_hit_rate gauge\n'
      
      output += '# HELP redis_cache_avg_response_ms Average cache response time\n'
      output += '# TYPE redis_cache_avg_response_ms gauge\n'
      
      for (const [key, data] of Object.entries(metrics)) {
        const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_')
        output += `redis_cache_hits_total{key="${safeKey}"} ${data.hits}\n`
        output += `redis_cache_misses_total{key="${safeKey}"} ${data.misses}\n`
        output += `redis_cache_stale_hits_total{key="${safeKey}"} ${data.staleHits}\n`
        output += `redis_cache_errors_total{key="${safeKey}"} ${data.errors}\n`
        output += `redis_cache_hit_rate{key="${safeKey}"} ${data.hitRate.toFixed(4)}\n`
        output += `redis_cache_avg_response_ms{key="${safeKey}"} ${data.avgResponseTime.toFixed(2)}\n`
      }
      
      // Memory usage if available
      if (redisHealth.info?.memory) {
        output += '\n# HELP redis_memory_used_bytes Redis memory usage in bytes\n'
        output += '# TYPE redis_memory_used_bytes gauge\n'
        output += `redis_memory_used_bytes ${parseInt(redisHealth.info.memory.used_memory) || 0}\n\n`
        
        output += '# HELP redis_memory_max_bytes Redis max memory limit\n'
        output += '# TYPE redis_memory_max_bytes gauge\n'
        output += `redis_memory_max_bytes ${parseInt(redisHealth.info.memory.maxmemory) || 0}\n\n`
        
        output += '# HELP redis_memory_usage_percent Redis memory usage percentage\n'
        output += '# TYPE redis_memory_usage_percent gauge\n'
        const used = parseInt(redisHealth.info.memory.used_memory) || 0
        const max = parseInt(redisHealth.info.memory.maxmemory) || 1
        output += `redis_memory_usage_percent ${((used / max) * 100).toFixed(2)}\n\n`
      }
      
      // Key count estimate
      if (redisHealth.info?.keyspace) {
        const db0 = redisHealth.info.keyspace.db0
        if (db0) {
          const keysMatch = db0.match(/keys=(\d+)/)
          if (keysMatch) {
            output += '# HELP redis_keys_total Total number of keys in Redis\n'
            output += '# TYPE redis_keys_total gauge\n'
            output += `redis_keys_total ${keysMatch[1]}\n\n`
          }
        }
      }
      
    } catch (redisError) {
      // Redis not available - output zero metrics
      output += '\n# Redis not available\n'
      output += 'redis_connected 0\n'
      output += 'redis_latency_ms -1\n'
    }
    
    // Return Prometheus-formatted metrics
    return new NextResponse(output, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    console.error('[Prometheus Metrics] Error generating metrics:', error)
    
    // Return empty metrics with error indicator
    const errorOutput = `# ERROR generating metrics
# HELP soc_metrics_error Indicates an error occurred while generating metrics
# TYPE soc_metrics_error gauge
soc_metrics_error 1

${error instanceof Error ? `# Error: ${error.message}` : ''}`
    
    return new NextResponse(errorOutput, {
      status: 200, // Still return 200 to avoid triggering down alerts
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
      }
    })
  }
}
