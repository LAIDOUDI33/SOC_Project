/**
 * Djezzy SOC Platform - Component/Code Splitting Utilities
 * 
 * Lazy loading utilities for optimal initial bundle size:
 * - Dynamic imports with loading states
 * - Route-based code splitting
 * - Component-level lazy loading
 * - Prefetching strategies
 */

import { lazy, Suspense, type ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface LazyComponentOptions {
  /** Show loading component during load */
  showLoading?: boolean;
  /** Custom loading component */
  LoadingComponent?: ComponentType;
  /** Error boundary fallback */
  ErrorFallback?: ComponentType<{ error: Error; retry: () => void }>;
  /** Preload on hover of parent */
  preloadOnHover?: boolean;
  /** Preload when visible in viewport */
  preloadOnVisible?: boolean;
  /** Delay showing loader to avoid flash for fast loads */
  delayMs?: number;
}

interface RouteConfig {
  path: string;
  component: () => Promise<any>;
  preload?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

// ============================================================
// LOADING COMPONENTS
// ============================================================

/**
 * Default loading spinner component
 */
function DefaultLoadingSpinner({ size = 'default' }: { size?: 'small' | 'default' | 'large' }) {
  const sizeClasses = {
    small: 'w-4 h-4',
    default: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return (
    <div className="flex items-center justify-center p-4" role="status" aria-label="Loading">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Skeleton loading component for content placeholders
 */
export function SkeletonLoader({ 
  type = 'text', 
  count = 3,
  className = '' 
}: { 
  type?: 'text' | 'heading' | 'avatar' | 'image' | 'card' | 'table';
  count?: number;
  className?: string;
}) {
  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`animate-pulse bg-muted rounded ${getSkeletonClass(type)} ${className}`}
      aria-hidden="true"
    />
  ));

  return <div className="space-y-2">{skeletons}</div>;
}

function getSkeletonClass(type: string): string {
  switch (type) {
    case 'heading': return 'h-6 w-48';
    case 'text': return 'h-4 w-full';
    case 'avatar': return 'h-10 w-10 rounded-full';
    case 'image': return 'h-40 w-full';
    case 'card': return 'h-32 w-full rounded-lg';
    case 'table':
      return 'h-12 w-full';
    default: return 'h-4 w-full';
  }
}

/**
 * Page-level loading component
 */
export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <DefaultLoadingSpinner size="large" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}

// ============================================================
// LAZY COMPONENT FACTORY
// ============================================================

/**
 * Create a lazily loaded component with built-in error handling
 * 
 * @example
 * ```tsx
 * // Basic usage
 * const HeavyChart = createLazyComponent(() => import('./HeavyChart'));
 * 
 * // With options
 * const DashboardWidget = createLazyComponent(
 *   () => import('./DashboardWidget'),
 *   { preloadOnHover: true }
 * );
 * ```
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T } | T>,
  options: LazyComponentOptions = {}
) {
  const {
    showLoading = true,
    LoadingComponent = DefaultLoadingSpinner,
    delayMs = 200,
  } = options;

  const LazyComponent = lazy(importFn);

  function LazyWrapper(props: Record<string, unknown>) {
    return (
      <Suspense
        fallback={
          showLoading ? (
            <DelayRender delay={delayMs}>
              <LoadingComponent />
            </DelayRender>
          ) : null
        }
      >
        <LazyComponent {...props} />
      </Suspense>
    );
  }

  // Add preloading capability
  LazyWrapper.preload = () => {
    importFn();
  };

  // Add display name for debugging
  LazyWrapper.displayName = `LazyComponent(${importFn.toString().slice(0, 50)}...)`;

  return LazyWrapper as ComponentType<any> & { preload: () => void };
}

/**
 * Delay rendering to avoid flash for fast loads
 */
function DelayRender({ 
  delay, 
  children 
}: { 
  delay: number; 
  children: React.ReactNode 
}) {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) return null;
  return <>{children}</>;
}

// Need React import for hooks
import React from 'react';

// ============================================================
// PRE-DEFINED LAZY COMPONENTS FOR SOC PLATFORM
// ============================================================

/**
 * Heavy dashboard components that should be lazy-loaded
 */
export const LazyComponents = {
  // Analytics & Charts
  ThreatTrendChart: createLazyComponent(
    () => import('@/components/analytics/charts/ThreatTrendChart'),
    { preloadOnHover: true }
  ),
  
  EventsTimeline: createLazyComponent(
    () => import('@/components/analytics/charts/EventsTimeline')
  ),
  
  GeoHeatmap: createLazyComponent(
    () => import('@/components/analytics/maps/GeoHeatmap'),
    { delayMs: 500 }
  ),
  
  NetworkTopology: createLazyComponent(
    () => import('@/components/analytics/network/NetworkTopology'),
    { delayMs: 300 }
  ),

  // Incident Management
  IncidentPlaybookRunner: createLazyComponent(
    () => import('@/components/incident-response/PlaybookRunner'),
    { delayMs: 200 }
  ),
  
  EvidenceBoard: createLazyComponent(
    () => import('@/components/incident-response/EvidenceBoard')
  ),

  // Threat Intelligence
  IoCTable: createLazyComponent(
    () => import('@/components/threat-intel/IoCTable')
  ),
  
  ThreatActorProfile: createLazyComponent(
    () => import('@/components/threat-intel/ThreatActorProfile')
  ),

  // Compliance
  ComplianceMatrix: createLazyComponent(
    () => import('@/components/compliance/ComplianceMatrix'),
    { delayMs: 300 }
  ),
  
  AuditLogViewer: createLazyComponent(
    () => import('@/components/compliance/AuditLogViewer')
  ),

  // Settings (rarely accessed)
  UserManagement: createLazyComponent(
    () => import('@/components/settings/UserManagement'),
    { delayMs: 100 }
  ),
  
  SystemConfiguration: createLazyComponent(
    () => import('@/components/settings/SystemConfiguration'),
    { delayMs: 100 }
  ),
};

// ============================================================
// ROUTE-BASED CODE SPLITTING
// ============================================================

/**
 * Define routes with lazy-loaded components
 * This enables automatic code splitting by route
 */
export const lazyRoutes: RouteConfig[] = [
  {
    path: '/dashboard',
    component: () => import('@/app/dashboard/page').then(m => ({ default: m.default })),
    preload: true,
    priority: 'high',
  },
  {
    path: '/alerts',
    component: () => import('@/app/alerts/page').then(m => ({ default: m.default })),
    preload: false,
    priority: 'high',
  },
  {
    path: '/incidents',
    component: () => import('@/app/incidents/page').then(m => ({ default: m.default })),
    preload: false,
    priority: 'high',
  },
  {
    path: '/threats',
    component: () => import('@/app/threats/page').then(m => ({ default: m.default })),
    preload: false,
    priority: 'medium',
  },
  {
    path: '/analytics',
    component: () => import('@/app/analytics/page').then(m => ({ default: m.default })),
    preload: false,
    priority: 'medium',
  },
  {
    path: '/compliance',
    component: () => import('@/app/compliance/page').then(m => ({ default: m.default })),
    preload: false,
    priority: 'low',
  },
  {
    path: '/settings',
    component: () => import('@/app/settings/page').then(m => ({ default: m.default })),
    preload: false,
    priority: 'low',
  },
  {
    path: '/reports',
    component: () => import('@/app/reports/page').then(m => ({ default: m.default })),
    preload: false,
    priority: 'low',
  },
];

/**
 * Prefetch routes based on user behavior prediction
 */
export class RoutePrefetcher {
  private prefetchedRoutes = new Set<string>();
  private observer: IntersectionObserver | null = null;

  /**
   * Initialize prefetching based on link visibility
   */
  initPrefetchOnVisibility(): void {
    if (typeof window === 'undefined') return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const href = (entry.target as HTMLAnchorElement).getAttribute('href');
            if (href) this.prefetchRoute(href);
          }
        });
      },
      { rootMargin: '50px' }
    );

    document.querySelectorAll('a[href]').forEach((link) => {
      this.observer?.observe(link);
    });
  }

  /**
   * Prefetch a specific route
   */
  prefetchRoute(path: string): void {
    if (this.prefetchedRoutes.has(path)) return;

    const route = lazyRoutes.find(r => r.path === path);
    if (route) {
      route.component(); // Trigger dynamic import
      this.prefetchedRoutes.add(path);
    }
  }

  /**
   * Prefetch all high-priority routes
   */
  prefetchHighPriority(): void {
    lazyRoutes
      .filter(r => r.priority === 'high' && r.preload)
      .forEach(r => this.prefetchRoute(r.path));
  }

  /**
   * Cleanup observer
   */
  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}

// Global prefetcher instance
export const routePrefetcher = new RoutePrefetcher();

// ============================================================
// UTILITY HOOKS
// ============================================================

/**
 * Hook for lazy loading with error handling
 */
export function useLazyLoad<T>(
  importFn: () => Promise<T>,
  options: { enabled?: boolean } = {}
): { data: T | null; loading: boolean; error: Error | null; reload: () => void } {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const load = React.useCallback(async () => {
    if (options.enabled === false) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await importFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load module'));
    } finally {
      setLoading(false);
    }
  }, [importFn, options.enabled]);

  React.useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

/**
 * Hook for intersection-based lazy loading
 */
export function useInViewLoad(
  importFn: () => Promise<any>,
  options: { threshold?: number; rootMargin?: string } = {}
): { ref: React.RefObject<HTMLDivElement>; loaded: boolean } {
  const ref = React.useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element || loaded) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loaded) {
          setLoaded(true);
          importFn();
          observer.disconnect();
        }
      },
      { threshold: options.threshold ?? 0.1, rootMargin: options.rootMargin ?? '50px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [importFn, loaded, options.threshold, options.rootMargin]);

  return { ref, loaded };
}

// Export utilities
export { SkeletonLoader, PageLoader, DefaultLoadingSpinner };
