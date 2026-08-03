/**
 * Djezzy SOC Platform - Real-time Performance Monitor
 * 
 * Comprehensive performance monitoring and metrics collection:
 * - Web Vitals tracking (LCP, FID, CLS, INP, TTFB)
 * - Custom performance markers
 * - Resource timing analysis
 * - Performance budget validation
 * - Metrics reporting to analytics backend
 */

// ============================================================
// TYPES
// ============================================================

interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null;       // Largest Contentful Paint (ms)
  fid: number | null;       // First Input Delay (ms)
  cls: number | null;       // Cumulative Layout Shift
  inp: number | null;       // Interaction to Next Paint (ms)
  ttfb: number | null;      // Time to First Byte (ms)
  
  // Navigation timing
  domContentLoaded: number | null;
  loadComplete: number | null;
  firstPaint: number | null;
  firstContentfulPaint: number | null;
  
  // Resource metrics
  resourceCount: number;
  totalTransferSize: number;
  scriptExecutionTime: number;
  
  // Custom markers
  dashboardReady: number | null;
  apiResponseAvg: number | null;
  
  // Metadata
  timestamp: number;
  userAgent: string;
  connectionType: string;
}

interface PerformanceThresholds {
  lcp: { good: number; needsImprovement: number; poor: number };
  fid: { good: number; needsImprovement: number; poor: number };
  cls: { good: number; needsImprovement: number; poor: number };
  inp: { good: number; needsImprovement: number; poor: number };
  ttfb: { good: number; needsImprovement: number; poor: number };
}

interface PerformanceReport {
  score: 'good' | 'needs-improvement' | 'poor';
  metrics: PerformanceMetrics;
  violations: Array<{ metric: string; value: number; threshold: number }>;
  recommendations: string[];
}

interface CustomMarker {
  name: string;
  startTime: number;
  duration?: number;
  detail?: string;
}

// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  lcp: { good: 2500, needsImprovement: 4000, poor: Infinity },
  fid: { good: 100, needsImprovement: 300, poor: Infinity },
  cls: { good: 0.1, needsImprovement: 0.25, poor: Infinity },
  inp: { good: 200, needsImprovement: 500, poor: Infinity },
  ttfb: { good: 800, needsImprovement: 1800, poor: Infinity },
};

const REPORT_ENDPOINT = '/api/metrics/performance';

// ============================================================
// PERFORMANCE MONITOR CLASS
// ============================================================

class PerformanceMonitor {
  private metrics: PerformanceMetrics = this.initializeMetrics();
  private thresholds: PerformanceThresholds;
  private customMarkers: Map<string, CustomMarker> = new Map();
  private observers: Array<PerformanceObserver | IntersectionObserver> = [];
  private isInitialized = false;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Initialize all performance observers
   */
  init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    this.isInitialized = true;
    console.log('[Performance] Initializing monitor...');

    // Core Web Vitals
    this.observeLCP();
    this.observeFID();
    this.observeCLS();
    this.observeINP();

    // Navigation timing
    this.captureNavigationTiming();

    // Resource timing
    this.analyzeResources();

    // Report on page unload
    window.addEventListener('beforeunload', () => this.reportMetrics());
    
    // Also report when page is hidden (SPA navigation)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.reportMetrics();
      }
    });
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      lcp: null,
      fid: null,
      cls: null,
      inp: null,
      ttfb: null,
      domContentLoaded: null,
      loadComplete: null,
      firstPaint: null,
      firstContentfulPaint: null,
      resourceCount: 0,
      totalTransferSize: 0,
      scriptExecutionTime: 0,
      dashboardReady: null,
      apiResponseAvg: null,
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      connectionType: this.getConnectionType(),
    };
  }

  // ============================================================
  // CORE WEB VITALS OBSERVERS
  // ============================================================

  private observeLCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        if (lastEntry) {
          this.metrics.lcp = lastEntry.startTime;
          console.log(`[Performance] LCP: ${Math.round(this.metrics.lcp)}ms`);
          
          this.markCustom('lcp-complete', { detail: `LCP element: ${(lastEntry as any).element?.tagName}` });
        }
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.push(observer);
    } catch (e) {
      console.warn('[Performance] LCP observation not supported');
    }
  }

  private observeFID(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entry = list.getEntries()[0];
        if (entry) {
          this.metrics.fid = (entry as any).processingStart - entry.startTime;
          console.log(`[Performance] FID: ${Math.round(this.metrics.fid || 0)}ms`);
        }
      });

      observer.observe({ type: 'first-input', buffered: true });
      this.observers.push(observer);
    } catch (e) {
      console.warn('[Performance] FID observation not supported');
    }
  }

  private observeCLS(): void {
    let clsValue = 0;
    
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += entry.value;
          }
        }
        
        this.metrics.cls = clsValue;
        if (clsValue > 0.1) {
          console.warn(`[Performance] CLS: ${clsValue.toFixed(3)} - exceeds threshold!`);
        }
      });

      observer.observe({ type: 'layout-shift', buffered: true });
      this.observers.push(observer);
    } catch (e) {
      console.warn('[Performance] CLS observation not supported');
    }
  }

  private observeINP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        // Track interactions
        for (const entry of entries) {
          const duration = (entry as any).processingStart - entry.startTime;
          if (!this.metrics.inp || duration > this.metrics.inp) {
            this.metrics.inp = duration;
          }
        }
        
        console.log(`[Performance] INP: ${Math.round(this.metrics.inp || 0)}ms`);
      });

      observer.observe({ type: 'event', buffered: true });
      this.observers.push(observer);
    } catch (e) {
      console.warn('[Performance] INP observation not supported');
    }
  }

  // ============================================================
  // NAVIGATION & RESOURCE TIMING
  // ============================================================

  private captureNavigationTiming(): void {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (nav) {
      this.metrics.ttfb = nav.responseStart - nav.requestStart;
      this.metrics.domContentLoaded = nav.domContentLoadedEventEnd;
      this.metrics.loadComplete = nav.loadEventEnd;
      
      // Paint timing
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach((entry) => {
        if (entry.name === 'first-paint') {
          this.metrics.firstPaint = entry.startTime;
        } else if (entry.name === 'first-contentful-paint') {
          this.metrics.firstContentfulPaint = entry.startTime;
        }
      });

      console.log(`[Performance] TTFB: ${Math.round(this.metrics.ttfb || 0)}ms`);
      console.log(`[Performance] DCL: ${Math.round(this.metrics.domContentLoaded || 0)}ms`);
    }
  }

  private analyzeResources(): void {
    const resources = performance.getEntriesByType('resource');
    
    this.metrics.resourceCount = resources.length;
    
    let totalSize = 0;
    let scriptTime = 0;
    
    resources.forEach((resource) => {
      const res = resource as PerformanceResourceTiming;
      totalSize += res.transferSize || 0;
      
      if (res.initiatorType === 'script') {
        scriptTime += res.responseEnd - res.startTime;
      }
    });
    
    this.metrics.totalTransferSize = totalSize;
    this.metrics.scriptExecutionTime = scriptTime;
    
    console.log(`[Performance] Resources: ${resources.length} (${(totalSize / 1024).toFixed(0)}KB)`);
  }

  // ============================================================
  // CUSTOM MARKERS
  // ============================================================

  /**
   * Start a custom performance marker
   */
  startMarker(name: string): void {
    this.customMarkers.set(name, {
      name,
      startTime: performance.now(),
    });
    
    performance.mark(`${name}-start`);
  }

  /**
   * End a custom performance marker
   */
  endMarker(name: string, detail?: string): number {
    const marker = this.customMarkers.get(name);
    
    if (!marker) {
      console.warn(`[Performance] Marker "${name}" not found`);
      return 0;
    }
    
    const endTime = performance.now();
    const duration = endTime - marker.startTime;
    
    marker.duration = duration;
    marker.detail = detail;
    
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    // Store in specific metrics if applicable
    if (name === 'dashboard-ready') {
      this.metrics.dashboardReady = duration;
    }
    
    console.log(`[Performance] ${name}: ${Math.round(duration)}ms`);
    
    return duration;
  }

  /**
   * Quick mark without start/end pair
   */
  markCustom(name: string, options?: { startTime?: number; detail?: string }): void {
    const now = options?.startTime ?? performance.now();
    
    this.customMarkers.set(name, {
      name,
      startTime: now,
      detail: options?.detail,
    });
    
    performance.mark(name);
  }

  /**
   * Measure API response time
   */
  measureAPIResponse(endpoint: string, duration: number): void {
    const key = `api:${endpoint}`;
    
    if (!this.customMarkers.has('api-responses')) {
      this.customMarkers.set('api-responses', {
        name: 'api-responses',
        startTime: 0,
        detail: JSON.stringify({ [key]: duration }),
      });
    }
    
    // Track average (simple running average)
    if (this.metrics.apiResponseAvg === null) {
      this.metrics.apiResponseAvg = duration;
    } else {
      this.metrics.apiResponseAvg = (this.metrics.apiResponseAvg + duration) / 2;
    }
  }

  // ============================================================
  // REPORTING
  // ============================================================

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const violations: Array<{ metric: string; value: number; threshold: number }> = [];
    const recommendations: string[] = [];

    // Check each metric against thresholds
    const checks = [
      { metric: 'lcp', value: this.metrics.lcp, threshold: this.thresholds.lcp.good },
      { metric: 'fid', value: this.metrics.fid, threshold: this.thresholds.fid.good },
      { metric: 'cls', value: this.metrics.cls, threshold: this.thresholds.cls.good },
      { metric: 'inp', value: this.metrics.inp, threshold: this.thresholds.inp.good },
      { metric: 'ttfb', value: this.metrics.ttfb, threshold: this.thresholds.ttfb.good },
    ];

    let goodCount = 0;
    let totalCount = 0;

    checks.forEach(({ metric, value, threshold }) => {
      if (value !== null) {
        totalCount++;
        if (value > threshold) {
          violations.push({ metric, value, threshold });
          
          switch (metric) {
            case 'lcp':
              recommendations.push('Optimize largest contentful paint by reducing render-blocking resources or using SSR');
              break;
            case 'fid':
              recommendations.push('Reduce JavaScript execution time to improve input responsiveness');
              break;
            case 'cls':
              recommendations.push('Add explicit size attributes to images and embeds to prevent layout shifts');
              break;
            case 'inp':
              recommendations.push('Optimize event handlers and reduce main thread blocking');
              break;
            case 'ttfb':
              recommendations.push('Improve server response time with caching or CDN optimization');
              break;
          }
        } else {
          goodCount++;
        }
      }
    });

    const score: PerformanceReport['score'] = 
      violations.length === 0 ? 'good' :
      goodCount >= totalCount * 0.6 ? 'needs-improvement' : 'poor';

    return {
      score,
      metrics: { ...this.metrics },
      violations,
      recommendations,
    };
  }

  /**
   * Send metrics to analytics endpoint
   */
  async reportMetrics(): Promise<void> {
    const report = this.generateReport();
    
    try {
      // Use sendBeacon for reliable delivery on page unload
      const payload = JSON.stringify({
        ...report.metrics,
        customMarkers: Object.fromEntries(
          Array.from(this.customMarkers.entries()).map(([k, v]) => [k, v])
        ),
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(REPORT_ENDPOINT, payload);
      } else {
        await fetch(REPORT_ENDPOINT, {
          method: 'POST',
          body: payload,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        });
      }

      console.log('[Performance] Metrics reported:', report.score);
    } catch (error) {
      console.error('[Performance] Failed to report metrics:', error);
    }
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  private getConnectionType(): string {
    if (typeof navigator !== 'undefined' && (navigator as any).connection) {
      const conn = (navigator as any).connection;
      return `${conn.effectiveType || 'unknown'}${conn.rtt ? ` (${conn.rtt}ms rtt)` : ''}`;
    }
    return 'unknown';
  }

  /**
   * Destroy all observers
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.isInitialized = false;
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

export const performanceMonitor = new PerformanceMonitor();

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  // Initialize after DOM ready
  if (document.readyState === 'complete') {
    performanceMonitor.init();
  } else {
    window.addEventListener('DOMContentLoaded', () => performanceMonitor.init());
  }
}

// Export types and class
export type { 
  PerformanceMetrics, 
  PerformanceThresholds, 
  PerformanceReport, 
  CustomMarker 
};
export default PerformanceMonitor;
