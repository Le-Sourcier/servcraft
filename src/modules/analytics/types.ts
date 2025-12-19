export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';
export type MetricAggregation = 'sum' | 'avg' | 'min' | 'max' | 'count';

export interface Metric {
  /** Metric name */
  name: string;
  /** Metric type */
  type: MetricType;
  /** Metric value */
  value: number;
  /** Labels/tags */
  labels?: Record<string, string>;
  /** Timestamp */
  timestamp: Date;
  /** Unit */
  unit?: string;
  /** Help text */
  help?: string;
}

export interface Counter {
  /** Counter name */
  name: string;
  /** Current value */
  value: number;
  /** Labels */
  labels: Record<string, string>;
  /** Help text */
  help?: string;
}

export interface Gauge {
  /** Gauge name */
  name: string;
  /** Current value */
  value: number;
  /** Labels */
  labels: Record<string, string>;
  /** Help text */
  help?: string;
}

export interface Histogram {
  /** Histogram name */
  name: string;
  /** Buckets */
  buckets: Map<number, number>;
  /** Sum of all values */
  sum: number;
  /** Count of all values */
  count: number;
  /** Labels */
  labels: Record<string, string>;
  /** Help text */
  help?: string;
}

export interface Summary {
  /** Summary name */
  name: string;
  /** Quantiles (0.5, 0.9, 0.99, etc.) */
  quantiles: Map<number, number>;
  /** Sum of all values */
  sum: number;
  /** Count of all values */
  count: number;
  /** Labels */
  labels: Record<string, string>;
  /** Help text */
  help?: string;
}

export interface AnalyticsEvent {
  /** Event name */
  name: string;
  /** User ID */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Event properties */
  properties?: Record<string, unknown>;
  /** Timestamp */
  timestamp: Date;
  /** Context */
  context?: {
    ip?: string;
    userAgent?: string;
    referrer?: string;
    page?: string;
  };
}

export interface AnalyticsConfig {
  /** Enable metrics collection */
  enabled?: boolean;
  /** Metrics prefix */
  prefix?: string;
  /** Default labels */
  defaultLabels?: Record<string, string>;
  /** Prometheus endpoint */
  prometheusEnabled?: boolean;
  /** Flush interval (ms) */
  flushInterval?: number;
}

export interface MetricQuery {
  /** Metric name */
  name: string;
  /** Start time */
  startTime?: Date;
  /** End time */
  endTime?: Date;
  /** Labels filter */
  labels?: Record<string, string>;
  /** Aggregation */
  aggregation?: MetricAggregation;
  /** Group by labels */
  groupBy?: string[];
}

export interface MetricResult {
  /** Metric name */
  name: string;
  /** Data points */
  data: Array<{
    timestamp: Date;
    value: number;
    labels?: Record<string, string>;
  }>;
  /** Aggregated value */
  aggregated?: number;
}

export interface Dashboard {
  /** Dashboard ID */
  id: string;
  /** Dashboard name */
  name: string;
  /** Widgets */
  widgets: Widget[];
  /** Created at */
  createdAt: Date;
  /** Updated at */
  updatedAt: Date;
}

export interface Widget {
  /** Widget ID */
  id: string;
  /** Widget type */
  type: 'chart' | 'counter' | 'gauge' | 'table';
  /** Widget title */
  title: string;
  /** Metric query */
  query: MetricQuery;
  /** Chart type (for chart widgets) */
  chartType?: 'line' | 'bar' | 'pie' | 'area';
  /** Position */
  position: { x: number; y: number; w: number; h: number };
}

export interface Alert {
  /** Alert ID */
  id: string;
  /** Alert name */
  name: string;
  /** Metric to monitor */
  metric: string;
  /** Condition */
  condition: {
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
  };
  /** Alert status */
  status: 'active' | 'inactive' | 'triggered';
  /** Notification channels */
  channels: string[];
  /** Created at */
  createdAt: Date;
}
