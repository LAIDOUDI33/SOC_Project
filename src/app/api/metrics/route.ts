/**
 * National SOC Platform - Prometheus Metrics Endpoint
 * 
 * Exposes application metrics in Prometheus format for:
 * - Request rate and latency
 * - Error rates by endpoint
 * - Database query performance
 * - SSE connection counts
 * - Resource utilization
 * 
 * Access at: /api/metrics
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// Metrics Collection
// ============================================================

interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  help: string;
  value?: number;
  labels?: Record<string, string>;
  samples?: MetricSample[];
}

interface MetricSample {
  value: number;
  labels: Record<string, string>;
}

// In-memory metrics store (in production, use prom-client or similar)
class MetricsRegistry {
  private counters: Map<string, { value: number; labels: Record<string, string> }> = new Map();
  private gauges: Map<string, { value: number; labels: Record<string, string> }> = new Map();
  private histograms: Map<string, { buckets: Map<number, number>; sum: number; count: number; labels: Record<string, string> }> = new Map();
  
  // Counter operations
  increment(name: string, value = 1, labels: Record<string, string> = {}) {
    const key = this.getKey(name, labels);
    const current = this.counters.get(key) || { value: 0, labels };
    current.value += value;
    this.counters.set(key, current);
  }
  
  // Gauge operations
  setGauge(name: string, value: number, labels: Record<string, string> = {}) {
    const key = this.getKey(name, labels);
    this.gauges.set(key, { value, labels });
  }
  
  incrementGauge(name: string, value = 1, labels: Record<string, string> = {}) {
    const key = this.getKey(name, labels);
    const current = this.gauges.get(key) || { value: 0, labels };
    current.value += value;
    this.gauges.set(key, current);
  }
  
  decrementGauge(name: string, value = 1, labels: Record<string, string> = {}) {
    const key = this.getKey(name, labels);
    const current = this.gauges.get(key) || { value: 0, labels };
    current.value -= value;
    this.gauges.set(key, current);
  }
  
  // Histogram operations
  observeHistogram(name: string, value: number, buckets = [0.1, 0.5, 1, 2.5, 5, 10], labels: Record<string, string> = {}) {
    const key = this.getKey(name, labels);
    let hist = this.histograms.get(key);
    
    if (!hist) {
      hist = { 
        buckets: new Map(buckets.map(b => [b, 0])), 
        sum: 0, 
        count: 0,
        labels 
      };
      this.histograms.set(key, hist);
    }
    
    hist.sum += value;
    hist.count += 1;
    
    // Increment appropriate buckets
    for (const bucket of buckets) {
      if (value <= bucket) {
        hist.buckets.set(bucket, (hist.buckets.get(bucket) || 0) + 1);
      }
    }
    
    // +Inf bucket always increments
    hist.buckets.set(Infinity, (hist.buckets.get(Infinity) || 0) + 1);
  }
  
  private getKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }
  
  // Export all metrics in Prometheus format
  export(): string {
    let output = '';
    
    // Export counters
    output += '# HELP soc_http_requests_total Total HTTP requests\n';
    output += '# TYPE soc_http_requests_total counter\n';
    for (const [key, metric] of this.counters) {
      const labels = Object.entries(metric.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      output += `${key}${labels ? `{${labels}}` : ''} ${metric.value}\n`;
    }
    
    // Export gauges
    output += '\n# HELP soc_current_gauge Current gauge values\n';
    output += '# TYPE soc_current_gauge gauge\n';
    for (const [key, metric] of this.gauges) {
      const labels = Object.entries(metric.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      output += `${key}${labels ? `{${labels}}` : ''} ${metric.value}\n`;
    }
    
    // Export histograms
    output += '\n# HELP soc_request_duration_seconds Request duration in seconds\n';
    output += '# TYPE soc_request_duration_seconds histogram\n';
    for (const [key, hist] of this.histograms) {
      const baseName = key.replace(/{.*$/, '');
      const labels = Object.entries(hist.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      
      // Bucket values
      for (const [bucket, count] of hist.buckets) {
        const bucketLabel = bucket === Infinity ? '+Inf' : bucket;
        output += `${baseName}_bucket{le="${bucketLabel}"${labels ? `,${labels}` : ''}} ${count}\n`;
      }
      
      // Sum and count
      output += `${baseName}_sum${labels ? `{${labels}}` : ''} ${hist.sum}\n`;
      output += `${baseName}_count${labels ? `{${labels}}` : ''} ${hist.count}\n`;
    }
    
    return output;
  }
  
  // Get stats (for internal use)
  getStats() {
    return {
      counters: this.counters.size,
      gauges: this.gauges.size,
      histograms: this.histograms.size
    };
  }
}

// Global metrics instance
export const metrics = new MetricsRegistry();

// Track start time
const startTime = Date.now();

// ============================================================
// Middleware to collect metrics
// ============================================================

export function recordRequestMetrics(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number
) {
  // Request counter
  metrics.increment('soc_http_requests_total', 1, {
    method,
    path: sanitizePath(path),
    status: String(statusCode),
  });
  
  // Error counter
  if (statusCode >= 400) {
    metrics.increment('soc_http_errors_total', 1, {
      method,
      path: sanitizePath(path),
      status: String(statusCode),
    });
  }
  
  // Duration histogram
  metrics.observeHistogram('soc_request_duration_seconds', durationMs / 1000, undefined, {
    method,
    path: sanitizePath(path),
  });
}

function sanitizePath(path: string): string {
  // Replace dynamic segments with placeholders
  return path
    .replace(/\/[a-f0-9-]{36}/gi, '/:id')  // UUIDs
    .replace(/\/\d+/g, '/:id')              // Numeric IDs
    .replace(/\/[^/]+(?=\/|$)/g, '/:param'); // Other params
}

// ============================================================
// API Endpoint Handler
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // Update system metrics before exporting
    await updateSystemMetrics();
    
    // Get Prometheus-formatted metrics
    let metricsOutput = metrics.export();
    
    // Add process metrics
    metricsOutput += buildProcessMetrics();
    
    // Add application info metrics
    metricsOutput += buildAppInfoMetrics();
    
    return new NextResponse(metricsOutput, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Metrics-Version': '0.1.0'
      }
    });
    
  } catch (error) {
    console.error('Failed to export metrics:', error);
    
    return NextResponse.json({
      error: 'Failed to export metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// ============================================================
// System Metrics Collection
// ============================================================

async function updateSystemMetrics() {
  try {
    const os = require('os');
    const memUsage = process.memoryUsage();
    
    // Memory metrics
    metrics.setGauge('soc_process_memory_bytes', memUsage.heapUsed, { type: 'heap_used' });
    metrics.setGauge('soc_process_memory_bytes', memUsage.heapTotal, { type: 'heap_total' });
    metrics.setGauge('soc_process_memory_bytes', memUsage.rss, { type: 'rss' });
    metrics.setGauge('soc_process_memory_bytes', memUsage.external, { type: 'external' });
    
    // CPU metrics
    const cpuUsage = os.cpus();
    metrics.setGauge('soc_process_cpu_count', cpuUsage.length);
    
    // Load average
    const loadAvg = os.loadavg();
    metrics.setGauge('soc_process_load_1m', loadAvg[0]);
    metrics.setGauge('soc_process_load_5m', loadAvg[1]);
    metrics.setGauge('soc_process_load_15m', loadAvg[2]);
    
    // Uptime
    metrics.setGauge('soc_process_uptime_seconds', Math.floor(process.uptime()));
    
    // Event loop lag (approximate)
    metrics.observeHistogram('soc_event_loop_lag_seconds', 0); // Would need actual measurement
    
  } catch (error) {
    console.error('Failed to update system metrics:', error);
  }
}

function buildProcessMetrics(): string {
  let output = '';
  
  output += '\n# HELP soc_process_nodejs_version Node.js version running this process\n';
  output += '# TYPE soc_process_nodejs_version gauge\n';
  output += `soc_process_nodejs_version{version="${process.version}"} 1\n`;
  
  output += '\n# HELP soc_process_start_time_seconds Start time of the process since unix epoch\n';
  output += '# TYPE soc_process_start_time_seconds gauge\n';
  output += `soc_process_start_time_seconds ${Math.floor(startTime / 1000)}\n`;
  
  output += '\n# HELP soc_process_max_file_descriptors Maximum file descriptors\n';
  output += '# TYPE soc_process_max_file_descriptors gauge\n';
  output += `soc_process_max_file_descriptors ${require('os').cpus().length * 1024}\n`; // Approximation
  
  return output;
}

function buildAppInfoMetrics(): string {
  let output = '';
  
  output += '\n# HELP soc_app_info Application information\n';
  output += '# TYPE soc_app_info gauge\n';
  output += `soc_app_info{name="national-soc-platform",version="1.0.0",environment="${process.env.NODE_ENV || 'unknown'}"} 1\n`;
  
  output += '\n# HELP soc_build_info Build information\n';
  output += '# TYPE soc_build_info gauge\n';
  output += `soc_build_info{git_commit="${process.env.GIT_COMMIT || 'unknown'}",build_time="${process.env.BUILD_TIME || 'unknown'}"} 1\n`;
  
  return output;
}

// ============================================================
// Custom Metrics Helpers (for use in other files)
// ============================================================

export class SOCCounter {
  constructor(private name: string, private help: string) {}
  
  inc(value = 1, labels: Record<string, string> = {}) {
    metrics.increment(this.name, value, labels);
  }
}

export class SOCGauge {
  constructor(private name: string, private help: string) {}
  
  set(value: number, labels: Record<string, string> = {}) {
    metrics.setGauge(this.name, value, labels);
  }
  
  inc(value = 1, labels: Record<string, string> = {}) {
    metrics.incrementGauge(this.name, value, labels);
  }
  
  dec(value = 1, labels: Record<string, string> = {}) {
    metrics.decrementGauge(this.name, value, labels);
  }
}

export class SOCHistogram {
  constructor(
    private name: string, 
    private help: string,
    private buckets: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  ) {}
  
  observe(value: number, labels: Record<string, string> = {}) {
    metrics.observeHistogram(this.name, value, this.buckets, labels);
  }
}

// Pre-defined metrics for common use cases
export const httpRequestDuration = new SOCHistogram(
  'soc_http_request_duration_seconds',
  'HTTP request duration in seconds'
);

export const activeSSEConnections = new SOCGauge(
  'soc_sse_connections_active',
  'Number of active SSE connections'
);

export const databaseQueryDuration = new SOCHistogram(
  'soc_database_query_duration_seconds',
  'Database query duration in seconds'
);

export const alertProcessingTime = new SOCHistogram(
  'soc_alert_processing_seconds',
  'Alert processing time in seconds'
);

export const incidentCount = new SOCGauge(
  'soc_incidents_total',
  'Total number of incidents'
);

export const activeAlerts = new SOCGauge(
  'soc_alerts_active',
  'Number of active alerts'
);
