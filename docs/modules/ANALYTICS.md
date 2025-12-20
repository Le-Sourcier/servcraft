# Analytics Module

Prometheus-style metrics collection for monitoring and observability.

## Features

- **Counters** - Monotonically increasing values
- **Gauges** - Values that can go up and down
- **Histograms** - Distribution of values with buckets
- **Events** - Track custom application events
- **Prometheus Export** - Native Prometheus format output
- **Metric Queries** - Query and aggregate metrics

## Metric Types

| Type | Description | Example |
|------|-------------|---------|
| Counter | Only increases | Request count, errors |
| Gauge | Can increase/decrease | Active connections, queue size |
| Histogram | Value distribution | Response times, payload sizes |

## Usage

### Basic Setup

```typescript
import { AnalyticsService } from 'servcraft/modules/analytics';

const analytics = new AnalyticsService({
  enabled: true,
  prefix: 'myapp',
  defaultLabels: { env: 'production' },
  flushInterval: 60000,
});
```

### Counters

```typescript
// Simple increment
analytics.incrementCounter('http_requests_total');

// Increment by value
analytics.incrementCounter('bytes_received', 1024);

// With labels
analytics.incrementCounter('http_requests_total', 1, {
  method: 'GET',
  path: '/api/users',
  status: '200',
});
```

### Gauges

```typescript
// Set gauge value
analytics.setGauge('active_connections', 42);

// With labels
analytics.setGauge('queue_size', 150, { queue: 'emails' });

// Update periodically
setInterval(() => {
  analytics.setGauge('memory_usage_bytes', process.memoryUsage().heapUsed);
}, 5000);
```

### Histograms

```typescript
// Observe value with default buckets
analytics.observeHistogram('http_request_duration_seconds', 0.125);

// Custom buckets
analytics.observeHistogram(
  'http_request_duration_seconds',
  0.125,
  [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  { method: 'GET', path: '/api/users' }
);

// Timing helper
const start = Date.now();
// ... do work ...
const duration = (Date.now() - start) / 1000;
analytics.observeHistogram('operation_duration_seconds', duration);
```

### Events

```typescript
// Track event
analytics.trackEvent({
  name: 'user_signup',
  properties: {
    source: 'google',
    plan: 'free',
  },
});

// Get recent events
const events = analytics.getEvents(100);
```

### Querying Metrics

```typescript
const result = await analytics.queryMetrics({
  name: 'myapp_http_requests_total',
  startTime: new Date('2024-01-01'),
  endTime: new Date('2024-01-31'),
  labels: { method: 'GET' },
  groupBy: ['path'],
  aggregation: 'sum',
});

// result: { name, data: [...], aggregated: 12345 }
```

### Prometheus Export

```typescript
// Get Prometheus format
const metrics = analytics.getPrometheusMetrics();

// Example output:
// myapp_http_requests_total{method="GET",status="200"} 1234
// myapp_active_connections{} 42
// myapp_http_request_duration_seconds_bucket{le="0.1"} 500
// myapp_http_request_duration_seconds_bucket{le="0.5"} 900
// myapp_http_request_duration_seconds_sum{} 125.5
// myapp_http_request_duration_seconds_count{} 1000
```

### Fastify Integration

```typescript
// Metrics endpoint
fastify.get('/metrics', async (request, reply) => {
  reply.type('text/plain').send(analytics.getPrometheusMetrics());
});

// Request duration middleware
fastify.addHook('onRequest', async (request) => {
  request.startTime = Date.now();
});

fastify.addHook('onResponse', async (request, reply) => {
  const duration = (Date.now() - request.startTime) / 1000;

  analytics.incrementCounter('http_requests_total', 1, {
    method: request.method,
    path: request.routerPath || request.url,
    status: String(reply.statusCode),
  });

  analytics.observeHistogram('http_request_duration_seconds', duration, undefined, {
    method: request.method,
    path: request.routerPath || request.url,
  });
});
```

## Configuration

```typescript
interface AnalyticsConfig {
  enabled?: boolean;          // Enable/disable metrics (default: true)
  prefix?: string;            // Metric name prefix (default: 'app')
  defaultLabels?: Record<string, string>; // Labels added to all metrics
  prometheusEnabled?: boolean; // Enable Prometheus export (default: true)
  flushInterval?: number;     // Cleanup interval in ms (default: 60000)
}
```

## Aggregation Types

| Aggregation | Description |
|-------------|-------------|
| `sum` | Sum of all values |
| `avg` | Average of values |
| `min` | Minimum value |
| `max` | Maximum value |
| `count` | Number of data points |

## Utility Methods

```typescript
// Get all counters
const counters = analytics.getCounters();

// Get all gauges
const gauges = analytics.getGauges();

// Clear all metrics
analytics.clear();
```

## Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'myapp'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

## Grafana Dashboard

Common panels:
- Request rate: `rate(myapp_http_requests_total[5m])`
- Error rate: `rate(myapp_http_requests_total{status=~"5.."}[5m])`
- P99 latency: `histogram_quantile(0.99, rate(myapp_http_request_duration_seconds_bucket[5m]))`
- Active connections: `myapp_active_connections`

## Best Practices

1. **Use Labels Wisely** - Don't create high-cardinality labels
2. **Consistent Naming** - Follow Prometheus naming conventions
3. **Default Buckets** - Use appropriate histogram buckets for your use case
4. **Memory Management** - Configure flush interval to prevent memory growth
5. **Metric Types** - Use the right metric type for your use case
