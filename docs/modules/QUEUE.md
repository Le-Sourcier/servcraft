# Queue Module Documentation

## Overview

The Queue module provides robust background job processing using **BullMQ** with **Redis** persistence. This ensures jobs are never lost, even if the server restarts, and supports horizontal scaling across multiple instances.

## Features

- **Persistent Storage**: All jobs stored in Redis, surviving server restarts
- **Automatic Retries**: Configurable retry strategies with exponential backoff
- **Job Prioritization**: Critical, high, normal, and low priority levels
- **Delayed Jobs**: Schedule jobs to run at specific times
- **Repeatable Jobs**: Cron-based recurring job scheduling
- **Concurrency Control**: Limit parallel execution per worker
- **Real-time Events**: Monitor job lifecycle with events
- **Metrics Collection**: Track throughput, success rates, and processing times
- **Multi-instance Safe**: Safe for horizontal scaling with multiple server instances
- **Graceful Shutdown**: Wait for active jobs before closing

## Installation

BullMQ and ioredis are already included in ServCraft dependencies:

```bash
npm install bullmq ioredis
```

## Configuration

### Environment Variables

```env
# Redis connection for queues
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

### Service Configuration

```typescript
import { QueueService } from '@servcraft/queue';

const queueService = new QueueService({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: 0,
  },
  prefix: 'myapp:queue', // Redis key prefix
  metrics: true, // Enable metrics collection
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
    timeout: 60000,
  },
});
```

## Basic Usage

### Creating a Queue

```typescript
// Create a queue (or get existing one)
const queue = queueService.createQueue('emails');
```

### Adding Jobs

```typescript
// Simple job
const job = await queueService.addJob('emails', 'send-welcome', {
  userId: 'user-123',
  email: 'user@example.com',
  template: 'welcome',
});

console.log(`Job ${job.id} added`);
```

### Adding Jobs with Options

```typescript
// High priority job
await queueService.addJob('emails', 'send-critical', data, {
  priority: 'critical', // critical, high, normal, low
});

// Delayed job (runs in 5 minutes)
await queueService.addJob('notifications', 'reminder', data, {
  delay: 5 * 60 * 1000,
});

// Job with custom retry settings
await queueService.addJob('webhooks', 'send-webhook', data, {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000, // 2s, 4s, 8s, 16s, 32s
  },
});

// Repeatable job (every hour)
await queueService.addJob('reports', 'generate-daily', data, {
  repeat: {
    every: 60 * 60 * 1000, // every hour
  },
});

// Cron job (every day at midnight)
await queueService.addJob('cleanup', 'remove-old-files', data, {
  repeat: {
    cron: '0 0 * * *',
  },
});
```

### Adding Bulk Jobs

```typescript
const jobs = await queueService.addBulkJobs('emails', {
  jobs: [
    { name: 'send-email', data: { userId: '1', type: 'welcome' } },
    { name: 'send-email', data: { userId: '2', type: 'welcome' } },
    { name: 'send-email', data: { userId: '3', type: 'welcome' } },
  ],
});

console.log(`Added ${jobs.length} jobs`);
```

### Registering Workers

```typescript
import type { Job, Worker } from '@servcraft/queue';

// Simple worker
const emailWorker: Worker = {
  name: 'send-welcome',
  process: async (job: Job) => {
    const { userId, email, template } = job.data;

    // Process the job
    await sendEmail(email, template);

    return { sent: true, email };
  },
  concurrency: 5, // Process 5 emails in parallel
};

queueService.registerWorker('emails', emailWorker);
```

### Worker with Progress Updates

```typescript
const imageWorker: Worker = {
  name: 'process-image',
  process: async (job: Job) => {
    const { imageUrl, operations } = job.data;

    // Update progress
    await queueService.updateJobProgress('images', job.id, 0);

    // Perform operations
    for (let i = 0; i < operations.length; i++) {
      await performOperation(operations[i]);
      await queueService.updateJobProgress(
        'images',
        job.id,
        Math.round(((i + 1) / operations.length) * 100)
      );
    }

    return { processed: true };
  },
  concurrency: 2,
};

queueService.registerWorker('images', imageWorker);
```

## Job Management

### Get Job by ID

```typescript
const job = await queueService.getJob('emails', 'job-id-123');
console.log(job.status); // waiting, active, completed, failed, delayed
```

### List Jobs

```typescript
// List waiting jobs
const waitingJobs = await queueService.listJobs('emails', {
  status: 'waiting',
});

// List failed jobs
const failedJobs = await queueService.listJobs('emails', {
  status: 'failed',
});

// List with filters
const filteredJobs = await queueService.listJobs('emails', {
  status: ['waiting', 'active'],
  name: 'send-welcome',
  limit: 50,
  offset: 0,
});
```

### Retry Failed Jobs

```typescript
// Retry a specific failed job
await queueService.retryJob('emails', 'failed-job-id');
```

### Remove Jobs

```typescript
// Remove a job (cannot remove active jobs)
await queueService.removeJob('emails', 'job-id');
```

### Clean Old Jobs

```typescript
// Clean completed jobs older than 24 hours
const cleaned = await queueService.cleanJobs('emails', 'completed', 24 * 60 * 60 * 1000);
console.log(`Cleaned ${cleaned} jobs`);

// Clean both completed and failed jobs
await queueService.cleanJobs('emails', ['completed', 'failed'], 7 * 24 * 60 * 60 * 1000);
```

## Queue Operations

### Pause/Resume Queue

```typescript
// Pause queue (stops processing new jobs)
await queueService.pauseQueue('emails');

// Resume queue
await queueService.resumeQueue('emails');
```

### Drain Queue

```typescript
// Remove all waiting jobs
await queueService.drainQueue('emails');
```

### Obliterate Queue

```typescript
// Completely remove queue and all its data
await queueService.obliterateQueue('emails');
```

## Statistics and Metrics

### Queue Statistics

```typescript
const stats = await queueService.getStats('emails');
console.log({
  waiting: stats.waiting,
  active: stats.active,
  completed: stats.completed,
  failed: stats.failed,
  delayed: stats.delayed,
  paused: stats.paused,
});
```

### Queue Metrics

```typescript
const metrics = await queueService.getMetrics('emails');
console.log({
  totalProcessed: metrics.totalProcessed,
  totalFailed: metrics.totalFailed,
  successRate: metrics.successRate,
  avgProcessingTime: metrics.avgProcessingTime,
  currentConcurrency: metrics.currentConcurrency,
  peakConcurrency: metrics.peakConcurrency,
});
```

## Events

### Subscribe to Job Events

```typescript
// Listen for specific events
queueService.on('added', (event) => {
  console.log(`Job ${event.jobId} added`);
});

queueService.on('active', (event) => {
  console.log(`Job ${event.jobId} started processing`);
});

queueService.on('completed', (event) => {
  console.log(`Job ${event.jobId} completed with:`, event.data);
});

queueService.on('failed', (event) => {
  console.log(`Job ${event.jobId} failed:`, event.data);
});

queueService.on('progress', (event) => {
  console.log(`Job ${event.jobId} progress:`, event.data);
});

queueService.on('stalled', (event) => {
  console.log(`Job ${event.jobId} stalled`);
});

// Listen for all events
queueService.on('job:event', (event) => {
  console.log(`Event ${event.event} for job ${event.jobId}`);
});
```

## Graceful Shutdown

```typescript
// In your server shutdown handler
process.on('SIGTERM', async () => {
  console.log('Shutting down...');

  // Wait for active jobs to complete
  await queueService.close();

  console.log('Queue service closed');
  process.exit(0);
});
```

## Common Use Cases

### Email Queue

```typescript
// Add email job
await queueService.addJob('emails', 'send-email', {
  to: 'user@example.com',
  subject: 'Welcome!',
  template: 'welcome',
  data: { name: 'John' },
});

// Email worker
queueService.registerWorker('emails', {
  name: 'send-email',
  process: async (job) => {
    const { to, subject, template, data } = job.data;
    await emailService.send(to, subject, template, data);
    return { sent: true };
  },
  concurrency: 10,
});
```

### Webhook Delivery

```typescript
// Add webhook job with retries
await queueService.addJob('webhooks', 'deliver', {
  url: 'https://api.example.com/webhook',
  payload: { event: 'user.created', data: { id: '123' } },
}, {
  attempts: 5,
  backoff: { type: 'exponential', delay: 1000 },
});

// Webhook worker
queueService.registerWorker('webhooks', {
  name: 'deliver',
  process: async (job) => {
    const { url, payload } = job.data;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }

    return { delivered: true, status: response.status };
  },
  concurrency: 5,
});
```

### Image Processing

```typescript
// Add image processing job
await queueService.addJob('images', 'process', {
  source: '/uploads/image.jpg',
  operations: [
    { type: 'resize', width: 800 },
    { type: 'compress', quality: 80 },
  ],
  output: '/processed/image.webp',
});

// Image worker
queueService.registerWorker('images', {
  name: 'process',
  process: async (job) => {
    const { source, operations, output } = job.data;
    await imageProcessor.process(source, operations, output);
    return { processed: true, output };
  },
  concurrency: 2, // CPU-intensive, limit concurrency
});
```

### Scheduled Reports

```typescript
// Daily report at 6 AM
await queueService.addJob('reports', 'daily-summary', {
  type: 'daily',
}, {
  repeat: { cron: '0 6 * * *' },
});

// Report worker
queueService.registerWorker('reports', {
  name: 'daily-summary',
  process: async (job) => {
    const report = await generateReport(job.data.type);
    await sendReportEmail(report);
    return { generated: true };
  },
  concurrency: 1,
});
```

## Best Practices

1. **Use Meaningful Queue Names**: Group related jobs in named queues (e.g., `emails`, `webhooks`, `reports`)

2. **Set Appropriate Concurrency**: CPU-intensive tasks should have lower concurrency

3. **Configure Retries**: Always set retry attempts for jobs that may fail temporarily

4. **Use Exponential Backoff**: Prevents overwhelming external services during failures

5. **Clean Old Jobs**: Periodically clean completed/failed jobs to manage Redis memory

6. **Monitor Metrics**: Track success rates and processing times to identify issues

7. **Implement Graceful Shutdown**: Always wait for active jobs before closing

8. **Use Job Progress**: For long-running jobs, update progress to show status

## Troubleshooting

### Jobs Not Processing

1. Check Redis connection: `queueService.isConnected()`
2. Verify worker is registered for the job name
3. Check if queue is paused: `await queueService.getStats(queueName)`

### Jobs Stuck in Active State

Jobs may be stalled if workers crash. BullMQ automatically handles stalled jobs and retries them.

### High Memory Usage in Redis

Clean old completed/failed jobs regularly:
```typescript
await queueService.cleanJobs('queueName', ['completed', 'failed'], 7 * 24 * 60 * 60 * 1000);
```

### Connection Errors

Ensure Redis is running and accessible. Check connection info:
```typescript
console.log(queueService.getConnectionInfo());
```

## API Reference

### QueueService Methods

| Method | Description |
|--------|-------------|
| `createQueue(name)` | Create or get a queue |
| `addJob(queue, name, data, options?)` | Add a job |
| `addBulkJobs(queue, options)` | Add multiple jobs |
| `registerWorker(queue, worker)` | Register a worker |
| `getJob(queue, jobId)` | Get job by ID |
| `listJobs(queue, filter?)` | List jobs with filters |
| `removeJob(queue, jobId)` | Remove a job |
| `retryJob(queue, jobId)` | Retry a failed job |
| `cleanJobs(queue, status, olderThanMs)` | Clean old jobs |
| `getStats(queue)` | Get queue statistics |
| `getMetrics(queue)` | Get queue metrics |
| `pauseQueue(queue)` | Pause a queue |
| `resumeQueue(queue)` | Resume a queue |
| `drainQueue(queue)` | Remove all waiting jobs |
| `obliterateQueue(queue)` | Delete queue and all data |
| `listQueues()` | List all queues |
| `close()` | Graceful shutdown |
| `isConnected()` | Check connection status |
| `getConnectionInfo()` | Get connection details |

### Job Options

| Option | Type | Description |
|--------|------|-------------|
| `priority` | `'critical' \| 'high' \| 'normal' \| 'low'` | Job priority |
| `delay` | `number` | Delay in milliseconds |
| `attempts` | `number` | Max retry attempts |
| `backoff` | `{ type: 'fixed' \| 'exponential', delay: number }` | Retry backoff strategy |
| `removeOnComplete` | `boolean \| number` | Remove job on completion |
| `removeOnFail` | `boolean \| number` | Remove job on failure |
| `timeout` | `number` | Job timeout in milliseconds |
| `repeat` | `{ cron?: string, every?: number, limit?: number }` | Repeat configuration |
