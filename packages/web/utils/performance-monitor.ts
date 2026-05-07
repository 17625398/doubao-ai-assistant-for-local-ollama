/**
 * 性能监控工具
 * 基于官方应用的性能优化模式
 */

interface PerformanceMetrics {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private enabled: boolean = false;

  constructor() {
    this.enabled = process.env.NODE_ENV === 'development';
  }

  start(name: string) {
    if (!this.enabled) return;
    
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
    });
  }

  end(name: string) {
    if (!this.enabled) return;
    
    const metric = this.metrics.get(name);
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      console.log(`[Performance] ${name}: ${metric.duration.toFixed(2)}ms`);
    }
  }

  getMetrics() {
    return Array.from(this.metrics.values());
  }

  clear() {
    this.metrics.clear();
  }

  report() {
    if (!this.enabled) return;
    
    const metrics = this.getMetrics();
    console.group('[Performance Report]');
    metrics.forEach(m => {
      if (m.duration) {
        console.log(`${m.name}: ${m.duration.toFixed(2)}ms`);
      }
    });
    console.groupEnd();
  }
}

export const performanceMonitor = new PerformanceMonitor();
