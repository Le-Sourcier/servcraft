import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { logger } from '../../core/logger.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import type {
  Job,
  JobOptions,
  QueueConfig,
  QueueStats,
  Worker,
  JobStatus,
  JobFilter,
  BulkJobOptions,
  QueueMetrics,
  JobEvent,
} from './types.js';

// In-memory storage (replace with Bull/BullMQ in production)
const queues = new Map<string, Map<string, Job>>();
const workers = new Map<string, Map<string, Worker>>();
const activeJobs = new Map<string, Set<string>>();
const metrics = new Map<string, QueueMetrics>();

const defaultConfig: Required<QueueConfig> = {
  redis: {
    host: 'localhost',
    port: 6379,
    db: 0,
  },
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
  prefix: 'queue',
  metrics: true,
};

/**
 * Queue Service
 * Manages background jobs and task queues
 *
 * Note: This is a simplified in-memory implementation.
 * For production, use Bull or BullMQ with Redis.
 */
export class QueueService extends EventEmitter {
  private config: Required<QueueConfig>;
  private processing = new Map<string, boolean>();

  constructor(config?: QueueConfig) {
    super();
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Create a new queue
   */
  createQueue(name: string): void {
    if (!queues.has(name)) {
      queues.set(name, new Map());
      workers.set(name, new Map());
      activeJobs.set(name, new Set());

      if (this.config.metrics) {
        metrics.set(name, {
          totalProcessed: 0,
          totalFailed: 0,
          avgProcessingTime: 0,
          throughput: 0,
          peakConcurrency: 0,
          currentConcurrency: 0,
          successRate: 0,
        });
      }

      logger.info({ queueName: name }, 'Queue created');
    }
  }

  /**
   * Add a job to a queue
   */
  async addJob<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    options?: JobOptions
  ): Promise<Job<T>> {
    this.createQueue(queueName);

    const mergedOptions = { ...this.config.defaultJobOptions, ...options };
    const now = new Date();

    const job: Job<T> = {
      id: randomUUID(),
      queueName,
      name: jobName,
      data,
      options: mergedOptions,
      status: mergedOptions.delay ? 'delayed' : 'waiting',
      attemptsMade: 0,
      createdAt: now,
      delayedUntil: mergedOptions.delay ? new Date(now.getTime() + mergedOptions.delay) : undefined,
    };

    queues.get(queueName)!.set(job.id, job);

    this.emitEvent({
      event: 'added',
      jobId: job.id,
      data: job,
      timestamp: new Date(),
    });

    logger.debug({ jobId: job.id, queueName, jobName }, 'Job added to queue');

    // Start processing if not delayed
    if (!mergedOptions.delay) {
      setImmediate(() => this.processQueue(queueName));
    }

    return job;
  }

  /**
   * Add multiple jobs in bulk
   */
  async addBulkJobs(queueName: string, options: BulkJobOptions): Promise<Job[]> {
    const jobs = await Promise.all(
      options.jobs.map((jobData) =>
        this.addJob(queueName, jobData.name, jobData.data, jobData.opts)
      )
    );

    logger.info({ queueName, count: jobs.length }, 'Bulk jobs added');

    return jobs;
  }

  /**
   * Register a worker for a job type
   */
  registerWorker<T = any>(queueName: string, worker: Worker<T>): void {
    this.createQueue(queueName);

    workers.get(queueName)!.set(worker.name, worker);

    logger.info({ queueName, workerName: worker.name }, 'Worker registered');

    // Start processing
    setImmediate(() => this.processQueue(queueName));
  }

  /**
   * Process queue
   */
  private async processQueue(queueName: string): Promise<void> {
    if (this.processing.get(queueName)) {
      return; // Already processing
    }

    this.processing.set(queueName, true);

    try {
      const queue = queues.get(queueName);
      const queueWorkers = workers.get(queueName);
      const active = activeJobs.get(queueName);

      if (!queue || !queueWorkers || !active) {
        return;
      }

      // Get waiting jobs
      const waitingJobs = Array.from(queue.values())
        .filter((job) => job.status === 'waiting')
        .sort((_a, _b) => {
          // Sort by priority
          const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
          const aPriority = priorityOrder[_a.options.priority || 'normal'];
          const bPriority = priorityOrder[_b.options.priority || 'normal'];
          return aPriority - bPriority;
        });

      // Check delayed jobs
      const now = Date.now();
      for (const job of queue.values()) {
        if (job.status === 'delayed' && job.delayedUntil && job.delayedUntil.getTime() <= now) {
          job.status = 'waiting';
          job.delayedUntil = undefined;
        }
      }

      // Process jobs
      for (const job of waitingJobs) {
        const worker = queueWorkers.get(job.name);

        if (!worker) {
          continue; // No worker for this job type
        }

        // Check concurrency
        const concurrency = worker.concurrency || 1;
        const activeCount = Array.from(active).filter((jobId) => {
          const activeJob = queue.get(jobId);
          return activeJob?.name === worker.name;
        }).length;

        if (activeCount >= concurrency) {
          continue; // Max concurrency reached for this worker
        }

        // Process job
        this.processJob(queueName, job.id).catch((error) => {
          logger.error({ error, jobId: job.id }, 'Error processing job');
        });
      }
    } finally {
      this.processing.set(queueName, false);

      // Schedule next check
      const queue = queues.get(queueName);
      if (queue) {
        const hasWaiting = Array.from(queue.values()).some(
          (job) => job.status === 'waiting' || job.status === 'delayed'
        );

        if (hasWaiting) {
          setTimeout(() => this.processQueue(queueName), 1000);
        }
      }
    }
  }

  /**
   * Process a single job
   */
  private async processJob(queueName: string, jobId: string): Promise<void> {
    const queue = queues.get(queueName);
    const queueWorkers = workers.get(queueName);
    const active = activeJobs.get(queueName);

    if (!queue || !queueWorkers || !active) {
      return;
    }

    const job = queue.get(jobId);
    if (!job || job.status !== 'waiting') {
      return;
    }

    const worker = queueWorkers.get(job.name);
    if (!worker) {
      return;
    }

    // Mark as active
    job.status = 'active';
    job.processedAt = new Date();
    active.add(jobId);

    this.emitEvent({
      event: 'active',
      jobId: job.id,
      timestamp: new Date(),
    });

    const startTime = Date.now();

    try {
      // Execute worker with timeout
      const timeout = job.options.timeout || 60000;
      const result = await Promise.race([
        worker.process(job),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Job timeout')), timeout)),
      ]);

      // Job completed
      const duration = Date.now() - startTime;
      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();
      active.delete(jobId);

      this.emitEvent({
        event: 'completed',
        jobId: job.id,
        data: result,
        timestamp: new Date(),
      });

      logger.info({ jobId: job.id, queueName, jobName: job.name, duration }, 'Job completed');

      // Update metrics
      this.updateMetrics(queueName, true, duration);

      // Remove if configured
      if (job.options.removeOnComplete) {
        queue.delete(jobId);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      job.attemptsMade++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if should retry
      const maxAttempts = job.options.attempts || 1;
      if (job.attemptsMade < maxAttempts) {
        // Calculate backoff delay
        const backoff = job.options.backoff;
        let delay = 1000;

        if (backoff) {
          if (backoff.type === 'exponential') {
            delay = backoff.delay * Math.pow(2, job.attemptsMade - 1);
          } else {
            delay = backoff.delay;
          }
        }

        // Schedule retry
        job.status = 'delayed';
        job.delayedUntil = new Date(Date.now() + delay);
        job.error = errorMessage;
        active.delete(jobId);

        logger.warn(
          {
            jobId: job.id,
            queueName,
            attempt: job.attemptsMade,
            maxAttempts,
            delay,
            error: errorMessage,
          },
          'Job failed, will retry'
        );

        setTimeout(() => {
          job.status = 'waiting';
          job.delayedUntil = undefined;
          this.processQueue(queueName);
        }, delay);
      } else {
        // Job failed permanently
        job.status = 'failed';
        job.error = errorMessage;
        job.stacktrace = error instanceof Error ? error.stack?.split('\n') : undefined;
        job.failedAt = new Date();
        active.delete(jobId);

        this.emitEvent({
          event: 'failed',
          jobId: job.id,
          data: error,
          timestamp: new Date(),
        });

        logger.error(
          {
            jobId: job.id,
            queueName,
            jobName: job.name,
            attempts: job.attemptsMade,
            error: errorMessage,
          },
          'Job failed permanently'
        );

        // Update metrics
        this.updateMetrics(queueName, false, duration);

        // Remove if configured
        if (job.options.removeOnFail) {
          queue.delete(jobId);
        }
      }
    }

    // Continue processing
    setImmediate(() => this.processQueue(queueName));
  }

  /**
   * Update metrics
   */
  private updateMetrics(queueName: string, success: boolean, duration: number): void {
    if (!this.config.metrics) return;

    const metric = metrics.get(queueName);
    if (!metric) return;

    if (success) {
      metric.totalProcessed++;
    } else {
      metric.totalFailed++;
    }

    // Update average processing time
    const total = metric.totalProcessed + metric.totalFailed;
    metric.avgProcessingTime = (metric.avgProcessingTime * (total - 1) + duration) / total;

    // Update success rate
    metric.successRate = (metric.totalProcessed / total) * 100;

    // Update concurrency
    const active = activeJobs.get(queueName);
    if (active) {
      metric.currentConcurrency = active.size;
      metric.peakConcurrency = Math.max(metric.peakConcurrency, active.size);
    }
  }

  /**
   * Get job by ID
   */
  async getJob(queueName: string, jobId: string): Promise<Job> {
    const queue = queues.get(queueName);
    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    const job = queue.get(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    return job;
  }

  /**
   * List jobs with filters
   */
  async listJobs(queueName: string, filter?: JobFilter): Promise<Job[]> {
    const queue = queues.get(queueName);
    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    let jobs = Array.from(queue.values());

    // Apply filters
    if (filter?.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      jobs = jobs.filter((job) => statuses.includes(job.status));
    }

    if (filter?.name) {
      jobs = jobs.filter((job) => job.name === filter.name);
    }

    if (filter?.startDate) {
      jobs = jobs.filter((job) => job.createdAt >= filter.startDate!);
    }

    if (filter?.endDate) {
      jobs = jobs.filter((job) => job.createdAt <= filter.endDate!);
    }

    // Sort by creation date (newest first)
    jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Pagination
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 100;

    return jobs.slice(offset, offset + limit);
  }

  /**
   * Get queue statistics
   */
  async getStats(queueName: string): Promise<QueueStats> {
    const queue = queues.get(queueName);
    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    const jobs = Array.from(queue.values());

    return {
      name: queueName,
      waiting: jobs.filter((j) => j.status === 'waiting').length,
      active: jobs.filter((j) => j.status === 'active').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
      delayed: jobs.filter((j) => j.status === 'delayed').length,
      paused: jobs.filter((j) => j.status === 'paused').length,
    };
  }

  /**
   * Get queue metrics
   */
  async getMetrics(queueName: string): Promise<QueueMetrics> {
    const metric = metrics.get(queueName);
    if (!metric) {
      throw new NotFoundError('Queue not found or metrics disabled');
    }

    return { ...metric };
  }

  /**
   * Remove a job
   */
  async removeJob(queueName: string, jobId: string): Promise<void> {
    const queue = queues.get(queueName);
    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    const job = queue.get(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (job.status === 'active') {
      throw new BadRequestError('Cannot remove active job');
    }

    queue.delete(jobId);

    this.emitEvent({
      event: 'removed',
      jobId: job.id,
      timestamp: new Date(),
    });

    logger.info({ jobId, queueName }, 'Job removed');
  }

  /**
   * Retry a failed job
   */
  async retryJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);

    if (job.status !== 'failed') {
      throw new BadRequestError('Can only retry failed jobs');
    }

    job.status = 'waiting';
    job.attemptsMade = 0;
    job.error = undefined;
    job.stacktrace = undefined;
    job.failedAt = undefined;

    logger.info({ jobId, queueName }, 'Job retry initiated');

    setImmediate(() => this.processQueue(queueName));
  }

  /**
   * Clean completed/failed jobs
   */
  async cleanJobs(
    queueName: string,
    status: JobStatus | JobStatus[],
    olderThanMs: number = 24 * 60 * 60 * 1000
  ): Promise<number> {
    const queue = queues.get(queueName);
    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    const statuses = Array.isArray(status) ? status : [status];
    const cutoffDate = new Date(Date.now() - olderThanMs);
    let cleaned = 0;

    for (const [jobId, job] of queue.entries()) {
      if (statuses.includes(job.status)) {
        const completedAt = job.completedAt || job.failedAt;
        if (completedAt && completedAt < cutoffDate) {
          queue.delete(jobId);
          cleaned++;
        }
      }
    }

    logger.info({ queueName, cleaned, status: statuses }, 'Jobs cleaned');

    return cleaned;
  }

  /**
   * Emit job event
   */
  private emitEvent(event: JobEvent): void {
    this.emit(event.event, event);
    this.emit('job:event', event);
  }

  /**
   * List all queues
   */
  async listQueues(): Promise<string[]> {
    return Array.from(queues.keys());
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = queues.get(queueName);
    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    for (const job of queue.values()) {
      if (job.status === 'waiting') {
        job.status = 'paused';
      }
    }

    logger.info({ queueName }, 'Queue paused');
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = queues.get(queueName);
    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    for (const job of queue.values()) {
      if (job.status === 'paused') {
        job.status = 'waiting';
      }
    }

    logger.info({ queueName }, 'Queue resumed');

    setImmediate(() => this.processQueue(queueName));
  }
}
