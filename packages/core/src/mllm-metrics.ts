/**
 * 多模型适配层监控指标
 * 支持 Prometheus 格式和自定义面板
 */

import type { ModelStats } from './types/multi-model';

/**
 * 指标类型
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * 指标数据点
 */
interface MetricPoint {
  labels: Record<string, string>;
  value: number;
  timestamp: number;
}

/**
 * 监控配置
 */
export interface MetricsConfig {
  /** 是否启用 */
  enabled?: boolean;
  /** 保留时间窗口 (毫秒) */
  retentionMs?: number;
  /** 采样率 */
  samplingRate?: number;
}

/**
 * Prometheus 格式指标
 */
interface PrometheusMetric {
  name: string;
  type: MetricType;
  help: string;
  values: Array<{ labels: string; value: string }>;
}

/**
 * 监控指标管理器
 */
export class ModelMetrics {
  private counters: Map<string, MetricPoint[]> = new Map();
  private gauges: Map<string, MetricPoint[]> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private summaries: Map<string, { values: number[]; quantiles: number[] }> = new Map();

  private config: Required<MetricsConfig>;
  private modelStats: Map<string, ModelStats> = new Map();
  private requestDurations: Map<string, number[]> = new Map();

  constructor(config: MetricsConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      retentionMs: config.retentionMs ?? 3600000,
      samplingRate: config.samplingRate ?? 1.0,
    };
  }

  // ============================================
  // 计数器
  // ============================================

  /**
   * 增加计数器
   */
  incrementCounter(name: string, labels?: Record<string, string>, value: number = 1): void {
    if (!this.config.enabled) return;

    const key = this.makeKey(name, labels);
    const point: MetricPoint = {
      labels: labels || {},
      value,
      timestamp: Date.now(),
    };

    const points = this.counters.get(key) || [];
    points.push(point);
    this.counters.set(key, points);

    this.cleanup(name, this.counters);
  }

  /**
   * 获取计数器值
   */
  getCounter(name: string, labels?: Record<string, string>): number {
    const key = this.makeKey(name, labels);
    const points = this.counters.get(key) || [];
    return points.reduce((sum, p) => sum + p.value, 0);
  }

  // ============================================
  // 仪表
  // ============================================

  /**
   * 设置仪表值
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.config.enabled) return;

    const key = this.makeKey(name, labels);
    const point: MetricPoint = {
      labels: labels || {},
      value,
      timestamp: Date.now(),
    };

    this.gauges.set(key, [point]);
  }

  /**
   * 增加仪表值
   */
  incrementGauge(name: string, labels?: Record<string, string>, value: number = 1): void {
    if (!this.config.enabled) return;

    const key = this.makeKey(name, labels);
    const current = this.getGauge(name, labels);
    this.setGauge(name, current + value, labels);
  }

  /**
   * 减少仪表值
   */
  decrementGauge(name: string, labels?: Record<string, string>, value: number = 1): void {
    this.incrementGauge(name, labels, -value);
  }

  /**
   * 获取仪表值
   */
  getGauge(name: string, labels?: Record<string, string>): number {
    const key = this.makeKey(name, labels);
    const points = this.gauges.get(key);
    return points?.[points.length - 1]?.value ?? 0;
  }

  // ============================================
  // 直方图
  // ============================================

  /**
   * 记录直方图值
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.config.enabled) return;
    if (Math.random() > this.config.samplingRate) return;

    const key = this.makeKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);

    // 保留最近 1000 个值
    if (values.length > 1000) {
      values.shift();
    }

    this.histograms.set(key, values);
  }

  /**
   * 获取直方图统计
   */
  getHistogramStats(name: string, labels?: Record<string, string>): HistogramStats {
    const key = this.makeKey(name, labels);
    const values = this.histograms.get(key) || [];

    if (values.length === 0) {
      return { count: 0, sum: 0, min: 0, max: 0, avg: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      sum,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / values.length,
      p50: this.percentile(sorted, 0.5),
      p90: this.percentile(sorted, 0.9),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
    };
  }

  // ============================================
  // 汇总
  // ============================================

  /**
   * 记录汇总值
   */
  recordSummary(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.config.enabled) return;

    const key = this.makeKey(name, labels);
    let summary = this.summaries.get(key);

    if (!summary) {
      summary = { values: [], quantiles: [0.5, 0.9, 0.95, 0.99] };
      this.summaries.set(key, summary);
    }

    summary.values.push(value);

    // 保留最近 1000 个值
    if (summary.values.length > 1000) {
      summary.values.shift();
    }
  }

  // ============================================
  // 模型特定指标
  // ============================================

  /**
   * 记录请求
   */
  recordRequest(model: string, success: boolean, durationMs: number): void {
    this.incrementCounter('mllm_requests_total', { model, status: success ? 'success' : 'error' });
    this.recordHistogram('mllm_request_duration_ms', durationMs, { model });

    // 记录到历史
    const durations = this.requestDurations.get(model) || [];
    durations.push(durationMs);
    if (durations.length > 100) durations.shift();
    this.requestDurations.set(model, durations);
  }

  /**
   * 记录模型统计
   */
  updateModelStats(model: string, stats: ModelStats): void {
    this.modelStats.set(model, stats);

    this.setGauge('mllm_model_queries_total', stats.totalQueries, { model });
    this.setGauge('mllm_model_successes_total', stats.successfulQueries, { model });
    this.setGauge('mllm_model_failures_total', stats.failedQueries, { model });
    this.setGauge('mllm_model_avg_latency_ms', stats.averageResponseTime, { model });
  }

  // ============================================
  // 导出
  // ============================================

  /**
   * 导出 Prometheus 格式
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    // 计数器
    for (const [key, points] of this.counters.entries()) {
      const [name, ...labelParts] = key.split('_');
      const labels = this.parseLabels(labelParts);
      const value = points.reduce((sum, p) => sum + p.value, 0);

      lines.push(`# TYPE ${name} counter`);
      lines.push(`# HELP ${name} Counter metric`);
      lines.push(`${name}${this.formatLabels(labels)} ${value}`);
    }

    // 仪表
    for (const [key, points] of this.gauges.entries()) {
      const [name, ...labelParts] = key.split('_');
      const labels = this.parseLabels(labelParts);
      const value = points[points.length - 1]?.value ?? 0;

      lines.push(`# TYPE ${name} gauge`);
      lines.push(`# HELP ${name} Gauge metric`);
      lines.push(`${name}${this.formatLabels(labels)} ${value}`);
    }

    // 直方图
    for (const [key, values] of this.histograms.entries()) {
      const [name, ...labelParts] = key.split('_');
      const labels = this.parseLabels(labelParts);

      if (values.length === 0) continue;

      const sorted = [...values].sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);

      lines.push(`# TYPE ${name} histogram`);
      lines.push(`${name}_sum${this.formatLabels(labels)} ${sum}`);
      lines.push(`${name}_count${this.formatLabels(labels)} ${values.length}`);

      // Buckets
      const buckets = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
      for (const bucket of buckets) {
        const count = sorted.filter(v => v <= bucket).length;
        lines.push(`${name}_bucket{le="${bucket}"}${this.formatLabels(labels)} ${count}`);
      }
      lines.push(`${name}_bucket{le="+Inf"}${this.formatLabels(labels)} ${values.length}`);
    }

    return lines.join('\n');
  }

  /**
   * 导出 JSON 格式
   */
  exportJSON(): any {
    return {
      timestamp: Date.now(),
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        [...this.histograms.entries()].map(([k, v]) => [k, this.getHistogramStats(k)])
      ),
      modelStats: Object.fromEntries(this.modelStats),
    };
  }

  /**
   * 获取摘要
   */
  getSummary(): MetricsSummary {
    const summary: MetricsSummary = {
      totalRequests: 0,
      totalErrors: 0,
      successRate: 0,
      avgLatency: 0,
      models: {},
    };

    // 计算总数
    summary.totalRequests = this.getCounter('mllm_requests_total', { status: 'success' }) +
      this.getCounter('mllm_requests_total', { status: 'error' });
    summary.totalErrors = this.getCounter('mllm_requests_total', { status: 'error' });
    summary.successRate = summary.totalRequests > 0
      ? (summary.totalRequests - summary.totalErrors) / summary.totalRequests
      : 0;

    // 计算平均延迟
    let totalLatency = 0;
    let latencyCount = 0;
    for (const [model, durations] of this.requestDurations.entries()) {
      const stats = this.getHistogramStats('mllm_request_duration_ms', { model });
      totalLatency += stats.sum;
      latencyCount += stats.count;

      summary.models[model] = {
        requests: this.getCounter('mllm_requests_total', { model }),
        errors: this.getCounter('mllm_requests_total', { model, status: 'error' }),
        avgLatency: stats.avg,
        p99Latency: stats.p99,
      };
    }
    summary.avgLatency = latencyCount > 0 ? totalLatency / latencyCount : 0;

    return summary;
  }

  // ============================================
  // 工具方法
  // ============================================

  private makeKey(name: string, labels?: Record<string, string>): string {
    const labelStr = labels
      ? Object.entries(labels).map(([k, v]) => `${k}=${v}`).join('_')
      : '';
    return `${name}_${labelStr}`;
  }

  private parseLabels(parts: string[]): Record<string, string> {
    const labels: Record<string, string> = {};
    for (const part of parts) {
      const [k, v] = part.split('=');
      if (k && v) labels[k] = v;
    }
    return labels;
  }

  private formatLabels(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) return '';
    const parts = Object.entries(labels).map(([k, v]) => `${k}="${v}"`);
    return `{${parts.join(',')}}`;
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  private cleanup(key: string, map: Map<string, MetricPoint[]>): void {
    const cutoff = Date.now() - this.config.retentionMs;
    const points = map.get(key);
    if (points) {
      map.set(key, points.filter(p => p.timestamp > cutoff));
    }
  }

  /**
   * 重置所有指标
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.summaries.clear();
    this.modelStats.clear();
    this.requestDurations.clear();
  }
}

/**
 * 直方图统计
 */
interface HistogramStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

/**
 * 指标摘要
 */
export interface MetricsSummary {
  totalRequests: number;
  totalErrors: number;
  successRate: number;
  avgLatency: number;
  models: Record<string, {
    requests: number;
    errors: number;
    avgLatency: number;
    p99Latency: number;
  }>;
}

// 全局实例
let globalMetrics: ModelMetrics | null = null;

export function getModelMetrics(): ModelMetrics {
  if (!globalMetrics) {
    globalMetrics = new ModelMetrics();
  }
  return globalMetrics;
}

export function createModelMetrics(config?: MetricsConfig): ModelMetrics {
  globalMetrics = new ModelMetrics(config);
  return globalMetrics;
}

export default ModelMetrics;
