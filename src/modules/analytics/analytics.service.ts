import { logger } from '../../core/logger.js';
import type {
  AnalyticsConfig,
  Metric,
  Counter,
  Gauge,
  Histogram,
  AnalyticsEvent,
  MetricQuery,
  MetricResult,
} from './types.js';

/**
 * Analytics Service
 * Metrics collection and monitoring
 */
export class AnalyticsService {
  private config: AnalyticsConfig;
  private counters = new Map<string, Counter>();
  private gauges = new Map<string, Gauge>();
  private histograms = new Map<string, Histogram>();
  private events: AnalyticsEvent[] = [];
  private metrics: Metric[] = [];

  constructor(config: AnalyticsConfig = {}) {
    this.config = {
      enabled: true,
      prefix: 'app',
      defaultLabels: {},
      prometheusEnabled: true,
      flushInterval: 60000,
      ...config,
    };

    if (this.config.flushInterval && this.config.flushInterval > 0) {
      setInterval(() => this.flush(), this.config.flushInterval);
    }

    logger.info('Analytics service initialized');
  }

  /**
   * Increment counter
   */
  incrementCounter(name: string, value = 1, labels: Record<string, string> = {}): void {
    if (!this.config.enabled) return;

    const fullName = this.getMetricName(name);
    const key = this.getMetricKey(fullName, labels);

    let counter = this.counters.get(key);
    if (!counter) {
      counter = {
        name: fullName,
        value: 0,
        labels: { ...this.config.defaultLabels, ...labels },
      };
      this.counters.set(key, counter);
    }

    counter.value += value;

    this.recordMetric({
      name: fullName,
      type: 'counter',
      value: counter.value,
      labels: counter.labels,
      timestamp: new Date(),
    });
  }

  /**
   * Set gauge value
   */
  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    if (!this.config.enabled) return;

    const fullName = this.getMetricName(name);
    const key = this.getMetricKey(fullName, labels);

    const gauge: Gauge = {
      name: fullName,
      value,
      labels: { ...this.config.defaultLabels, ...labels },
    };

    this.gauges.set(key, gauge);

    this.recordMetric({
      name: fullName,
      type: 'gauge',
      value,
      labels: gauge.labels,
      timestamp: new Date(),
    });
  }

  /**
   * Observe value for histogram
   */
  observeHistogram(
    name: string,
    value: number,
    buckets: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    labels: Record<string, string> = {}
  ): void {
    if (!this.config.enabled) return;

    const fullName = this.getMetricName(name);
    const key = this.getMetricKey(fullName, labels);

    let histogram = this.histograms.get(key);
    if (!histogram) {
      histogram = {
        name: fullName,
        buckets: new Map(),
        sum: 0,
        count: 0,
        labels: { ...this.config.defaultLabels, ...labels },
      };

      // Initialize buckets
      buckets.forEach((bucket) => histogram!.buckets.set(bucket, 0));
      this.histograms.set(key, histogram);
    }

    // Update buckets
    buckets.forEach((bucket) => {
      if (value <= bucket) {
        const current = histogram!.buckets.get(bucket) || 0;
        histogram!.buckets.set(bucket, current + 1);
      }
    });

    histogram.sum += value;
    histogram.count += 1;

    this.recordMetric({
      name: fullName,
      type: 'histogram',
      value,
      labels: histogram.labels,
      timestamp: new Date(),
    });
  }

  /**
   * Track event
   */
  trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>): void {
    if (!this.config.enabled) return;

    const fullEvent: AnalyticsEvent = {
      ...event,
      timestamp: new Date(),
    };

    this.events.push(fullEvent);

    // Auto-increment counter for event
    this.incrementCounter(`events_${event.name}`, 1, {
      event: event.name,
    });

    logger.debug({ event: event.name }, 'Event tracked');
  }

  /**
   * Query metrics
   */
  async queryMetrics(query: MetricQuery): Promise<MetricResult> {
    let filtered = this.metrics.filter((m) => m.name === query.name);

    // Filter by time range
    if (query.startTime) {
      filtered = filtered.filter((m) => m.timestamp >= query.startTime!);
    }
    if (query.endTime) {
      filtered = filtered.filter((m) => m.timestamp <= query.endTime!);
    }

    // Filter by labels
    if (query.labels) {
      filtered = filtered.filter((m) => {
        if (!m.labels) return false;
        return Object.entries(query.labels!).every(([key, value]) => m.labels![key] === value);
      });
    }

    // Group by labels
    const grouped = new Map<string, Metric[]>();
    if (query.groupBy && query.groupBy.length > 0) {
      filtered.forEach((m) => {
        const groupKey = query.groupBy!.map((label) => m.labels?.[label] || 'unknown').join(':');
        if (!grouped.has(groupKey)) {
          grouped.set(groupKey, []);
        }
        grouped.get(groupKey)!.push(m);
      });
    } else {
      grouped.set('all', filtered);
    }

    // Aggregate
    const data = Array.from(grouped.entries()).map(([_key, metrics]) => {
      const values = metrics.map((m) => m.value);
      let aggregated: number;

      switch (query.aggregation) {
        case 'sum':
          aggregated = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          aggregated = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'min':
          aggregated = Math.min(...values);
          break;
        case 'max':
          aggregated = Math.max(...values);
          break;
        case 'count':
          aggregated = values.length;
          break;
        default:
          aggregated = values[values.length - 1] || 0;
      }

      return {
        timestamp: metrics[metrics.length - 1].timestamp,
        value: aggregated,
        labels: metrics[metrics.length - 1].labels,
      };
    });

    return {
      name: query.name,
      data,
      aggregated: data.length > 0 ? data[data.length - 1].value : 0,
    };
  }

  /**
   * Get Prometheus metrics
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];

    // Counters
    this.counters.forEach((counter) => {
      const labelsStr = this.formatLabels(counter.labels);
      lines.push(`${counter.name}${labelsStr} ${counter.value}`);
    });

    // Gauges
    this.gauges.forEach((gauge) => {
      const labelsStr = this.formatLabels(gauge.labels);
      lines.push(`${gauge.name}${labelsStr} ${gauge.value}`);
    });

    // Histograms
    this.histograms.forEach((histogram) => {
      const labelsStr = this.formatLabels(histogram.labels);

      histogram.buckets.forEach((count, le) => {
        lines.push(
          `${histogram.name}_bucket${this.formatLabels({ ...histogram.labels, le: String(le) })} ${count}`
        );
      });

      lines.push(`${histogram.name}_sum${labelsStr} ${histogram.sum}`);
      lines.push(`${histogram.name}_count${labelsStr} ${histogram.count}`);
    });

    return lines.join('\n');
  }

  /**
   * Get all counters
   */
  getCounters(): Counter[] {
    return Array.from(this.counters.values());
  }

  /**
   * Get all gauges
   */
  getGauges(): Gauge[] {
    return Array.from(this.gauges.values());
  }

  /**
   * Get recent events
   */
  getEvents(limit = 100): AnalyticsEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.events = [];
    this.metrics = [];
    logger.info('Metrics cleared');
  }

  /**
   * Flush metrics
   */
  private flush(): void {
    // Keep only last 10000 metrics
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-10000);
    }

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  /**
   * Record metric
   */
  private recordMetric(metric: Metric): void {
    this.metrics.push(metric);
  }

  /**
   * Get full metric name with prefix
   */
  private getMetricName(name: string): string {
    return this.config.prefix ? `${this.config.prefix}_${name}` : name;
  }

  /**
   * Get metric key for storage
   */
  private getMetricKey(name: string, labels: Record<string, string>): string {
    const labelsStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    return `${name}{${labelsStr}}`;
  }

  /**
   * Format labels for Prometheus
   */
  private formatLabels(labels: Record<string, string>): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return '';

    const formatted = entries.map(([key, value]) => `${key}="${value}"`).join(',');

    return `{${formatted}}`;
  }
}
