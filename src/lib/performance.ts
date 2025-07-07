// Performance monitoring utility
interface PerformanceMetadata {
  success?: boolean;
  cacheHit?: boolean;
  apiName?: string;
  cacheName?: string;
  hit?: boolean;
  pageName?: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: PerformanceMetadata;
}

interface PerformanceStats {
  count: number;
  average: number;
  min: number;
  max: number;
  lastValue: number;
}

interface PerformanceStatsMap {
  [key: string]: PerformanceStats;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics

  // Track API response time
  trackApiResponse(
    apiName: string,
    responseTime: number,
    success: boolean,
    cacheHit?: boolean
  ) {
    this.addMetric({
      name: `api.${apiName}.response_time`,
      value: responseTime,
      timestamp: Date.now(),
      metadata: {
        success,
        cacheHit,
        apiName,
      },
    });
  }

  // Track cache hit rate
  trackCacheHit(cacheName: string, hit: boolean) {
    this.addMetric({
      name: `cache.${cacheName}.hit`,
      value: hit ? 1 : 0,
      timestamp: Date.now(),
      metadata: {
        cacheName,
        hit,
      },
    });
  }

  // Track page load time
  trackPageLoad(pageName: string, loadTime: number) {
    this.addMetric({
      name: `page.${pageName}.load_time`,
      value: loadTime,
      timestamp: Date.now(),
      metadata: {
        pageName,
      },
    });
  }

  // Get performance statistics
  getStats(timeWindow: number = 60000): PerformanceStatsMap {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(
      (m) => now - m.timestamp < timeWindow
    );

    const stats: PerformanceStatsMap = {};

    // Group metrics by name
    const groupedMetrics = recentMetrics.reduce(
      (acc, metric) => {
        if (!acc[metric.name]) {
          acc[metric.name] = [];
        }
        acc[metric.name].push(metric);
        return acc;
      },
      {} as Record<string, PerformanceMetric[]>
    );

    // Calculate statistics for each metric group
    Object.entries(groupedMetrics).forEach(([name, metrics]) => {
      const values = metrics.map((m) => m.value);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      stats[name] = {
        count: values.length,
        average: Math.round(avg * 100) / 100,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        lastValue: values[values.length - 1],
      };
    });

    return stats;
  }

  // Get cache hit rate for a specific cache
  getCacheHitRate(cacheName: string, timeWindow: number = 60000): number {
    const now = Date.now();
    const recentHits = this.metrics.filter(
      (m) =>
        m.name === `cache.${cacheName}.hit` && now - m.timestamp < timeWindow
    );

    if (recentHits.length === 0) return 0;

    const hits = recentHits.filter((m) => m.value === 1).length;
    return Math.round((hits / recentHits.length) * 100);
  }

  // Get average API response time
  getAverageApiResponseTime(
    apiName: string,
    timeWindow: number = 60000
  ): number {
    const now = Date.now();
    const recentResponses = this.metrics.filter(
      (m) =>
        m.name === `api.${apiName}.response_time` &&
        now - m.timestamp < timeWindow
    );

    if (recentResponses.length === 0) return 0;

    const avg =
      recentResponses.reduce((a, b) => a + b.value, 0) / recentResponses.length;
    return Math.round(avg * 100) / 100;
  }

  // Clear old metrics
  private addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);

    // Keep only the last maxMetrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  // Export metrics for debugging
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  // Clear all metrics
  clear() {
    this.metrics = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Helper functions for easy tracking
export function trackApiCall(
  apiName: string,
  startTime: number,
  success: boolean,
  cacheHit?: boolean
) {
  const responseTime = Date.now() - startTime;
  performanceMonitor.trackApiResponse(apiName, responseTime, success, cacheHit);
}

export function trackCacheAccess(cacheName: string, hit: boolean) {
  performanceMonitor.trackCacheHit(cacheName, hit);
}

export function trackPageLoad(pageName: string, startTime: number) {
  const loadTime = Date.now() - startTime;
  performanceMonitor.trackPageLoad(pageName, loadTime);
}

// React hook for tracking component performance
export function usePerformanceTracking(componentName: string) {
  const startTime = Date.now();

  return {
    trackRender: () => {
      const renderTime = Date.now() - startTime;
      performanceMonitor.trackPageLoad(componentName, renderTime);
    },
  };
}
