import type { Job as BullJob } from 'bullmq';
import { Queue, Worker as BullWorker, QueueEvents } from 'bullmq';
import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
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

const defaultConfig: Required<QueueConfig> = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
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
  prefix: 'servcraft:queue',
  metrics: true,
};

/**
 * Queue Service
 * Manages background jobs and task queues using BullMQ with Redis persistence
 *
 * Features:
 * - Persistent job storage in Redis
 * - Automatic retries with exponential backoff
 * - Job prioritization (critical, high, normal, low)
 * - Delayed/scheduled jobs
 * - Repeatable/cron jobs
 * - Concurrency control per worker
 * - Real-time events and metrics
 * - Multi-instance safe (horizontal scaling)
 */
export class QueueService extends EventEmitter {
  private config: Required<QueueConfig>;
  private connection: Redis;
  private queues = new Map<string, Queue>();
  private workers = new Map<string, BullWorker>();
  private queueEvents = new Map<string, QueueEvents>();
  private workerProcessors = new Map<string, Map<string, Worker>>();
  private metrics = new Map<string, QueueMetrics>();
  private isClosing = false;

  constructor(config?: QueueConfig) {
    super();
    this.config = {
      ...defaultConfig,
      ...config,
      redis: { ...defaultConfig.redis, ...config?.redis },
      defaultJobOptions: { ...defaultConfig.defaultJobOptions, ...config?.defaultJobOptions },
    };

    // Create Redis connection
    this.connection = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db,
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
    });

    this.connection.on('error', (err: Error) => {
      logger.error({ err }, 'Queue Redis connection error');
    });

    this.connection.on('connect', () => {
      logger.info('Queue Redis connected');
    });
  }

  /**
   * Create a new queue
   */
  createQueue(name: string): Queue {
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    const queue = new Queue(name, {
      connection: this.connection.duplicate(),
      prefix: this.config.prefix,
      defaultJobOptions: this.mapJobOptionsToBullMQ(this.config.defaultJobOptions),
    });

    this.queues.set(name, queue);
    this.workerProcessors.set(name, new Map());

    // Initialize metrics
    if (this.config.metrics) {
      this.metrics.set(name, {
        totalProcessed: 0,
        totalFailed: 0,
        avgProcessingTime: 0,
        throughput: 0,
        peakConcurrency: 0,
        currentConcurrency: 0,
        successRate: 100,
      });
    }

    // Setup queue events
    this.setupQueueEvents(name);

    logger.info({ queueName: name }, 'Queue created with BullMQ');

    return queue;
  }

  /**
   * Setup queue events listener
   */
  private setupQueueEvents(name: string): void {
    const queueEvents = new QueueEvents(name, {
      connection: this.connection.duplicate(),
      prefix: this.config.prefix,
    });

    this.queueEvents.set(name, queueEvents);

    queueEvents.on('completed', ({ jobId, returnvalue }) => {
      this.emitEvent({
        event: 'completed',
        jobId,
        data: returnvalue,
        timestamp: new Date(),
      });
    });

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      this.emitEvent({
        event: 'failed',
        jobId,
        data: failedReason,
        timestamp: new Date(),
      });
    });

    queueEvents.on('progress', ({ jobId, data }) => {
      this.emitEvent({
        event: 'progress',
        jobId,
        data,
        timestamp: new Date(),
      });
    });

    queueEvents.on('stalled', ({ jobId }) => {
      this.emitEvent({
        event: 'stalled',
        jobId,
        timestamp: new Date(),
      });
    });

    queueEvents.on('active', ({ jobId }) => {
      this.emitEvent({
        event: 'active',
        jobId,
        timestamp: new Date(),
      });
    });
  }

  /**
   * Map our JobOptions to BullMQ options
   */
  private mapJobOptionsToBullMQ(options: JobOptions): Record<string, unknown> {
    const bullOptions: Record<string, unknown> = {};

    if (options.priority) {
      // BullMQ uses numeric priority (lower = higher priority)
      const priorityMap = { critical: 1, high: 2, normal: 3, low: 4 };
      bullOptions.priority = priorityMap[options.priority];
    }

    if (options.delay !== undefined) {
      bullOptions.delay = options.delay;
    }

    if (options.attempts !== undefined) {
      bullOptions.attempts = options.attempts;
    }

    if (options.backoff) {
      bullOptions.backoff = {
        type: options.backoff.type,
        delay: options.backoff.delay,
      };
    }

    if (options.removeOnComplete !== undefined) {
      bullOptions.removeOnComplete = options.removeOnComplete;
    }

    if (options.removeOnFail !== undefined) {
      bullOptions.removeOnFail = options.removeOnFail;
    }

    if (options.repeat) {
      bullOptions.repeat = {
        pattern: options.repeat.cron,
        every: options.repeat.every,
        limit: options.repeat.limit,
        immediately: options.repeat.immediately,
      };
    }

    return bullOptions;
  }

  /**
   * Map BullMQ job to our Job interface
   */
  private mapBullJobToJob<T>(bullJob: BullJob<T>, queueName: string): Job<T> {
    const state = bullJob.returnvalue !== undefined ? 'completed' : 'waiting';

    return {
      id: bullJob.id || '',
      queueName,
      name: bullJob.name,
      data: bullJob.data,
      options: {
        priority: this.mapPriorityFromBullMQ(bullJob.opts.priority),
        delay: bullJob.opts.delay,
        attempts: bullJob.opts.attempts,
        backoff: bullJob.opts.backoff as JobOptions['backoff'],
        removeOnComplete: bullJob.opts.removeOnComplete as boolean | number | undefined,
        removeOnFail: bullJob.opts.removeOnFail as boolean | number | undefined,
      },
      status: state as JobStatus,
      progress: typeof bullJob.progress === 'number' ? bullJob.progress : undefined,
      attemptsMade: bullJob.attemptsMade,
      result: bullJob.returnvalue,
      error: bullJob.failedReason,
      stacktrace: bullJob.stacktrace,
      createdAt: new Date(bullJob.timestamp),
      processedAt: bullJob.processedOn ? new Date(bullJob.processedOn) : undefined,
      completedAt: bullJob.finishedOn ? new Date(bullJob.finishedOn) : undefined,
      failedAt: bullJob.failedReason ? new Date(bullJob.finishedOn || Date.now()) : undefined,
      delayedUntil: bullJob.delay ? new Date(bullJob.timestamp + bullJob.delay) : undefined,
    };
  }

  /**
   * Map BullMQ numeric priority to our priority type
   */
  private mapPriorityFromBullMQ(priority?: number): JobOptions['priority'] {
    if (!priority) return 'normal';
    if (priority <= 1) return 'critical';
    if (priority <= 2) return 'high';
    if (priority <= 3) return 'normal';
    return 'low';
  }

  /**
   * Add a job to a queue
   */
  async addJob<T = unknown>(
    queueName: string,
    jobName: string,
    data: T,
    options?: JobOptions
  ): Promise<Job<T>> {
    const queue = this.createQueue(queueName);

    const mergedOptions = { ...this.config.defaultJobOptions, ...options };
    const bullOptions = this.mapJobOptionsToBullMQ(mergedOptions);

    const bullJob = await queue.add(jobName, data, bullOptions);

    const job = this.mapBullJobToJob<T>(bullJob, queueName);

    this.emitEvent({
      event: 'added',
      jobId: job.id,
      data: job,
      timestamp: new Date(),
    });

    logger.debug({ jobId: job.id, queueName, jobName }, 'Job added to queue');

    return job;
  }

  /**
   * Add multiple jobs in bulk
   */
  async addBulkJobs(queueName: string, bulkOptions: BulkJobOptions): Promise<Job[]> {
    const queue = this.createQueue(queueName);

    const bullJobs = bulkOptions.jobs.map((jobData) => ({
      name: jobData.name,
      data: jobData.data,
      opts: jobData.opts ? this.mapJobOptionsToBullMQ(jobData.opts) : undefined,
    }));

    const addedJobs = await queue.addBulk(bullJobs);

    const jobs = addedJobs.map((bullJob) => this.mapBullJobToJob(bullJob, queueName));

    logger.info({ queueName, count: jobs.length }, 'Bulk jobs added');

    return jobs;
  }

  /**
   * Register a worker for a job type
   */
  registerWorker<T = unknown>(queueName: string, worker: Worker<T>): void {
    this.createQueue(queueName);

    // Store the worker processor
    this.workerProcessors.get(queueName)!.set(worker.name, worker as Worker);

    // Create or update BullMQ worker
    this.ensureBullWorker(queueName);

    logger.info({ queueName, workerName: worker.name }, 'Worker registered');
  }

  /**
   * Ensure BullMQ worker exists for queue
   */
  private ensureBullWorker(queueName: string): void {
    // If worker already exists, close it and recreate
    if (this.workers.has(queueName)) {
      return; // Worker already running
    }

    const processors = this.workerProcessors.get(queueName);
    if (!processors || processors.size === 0) {
      return;
    }

    // Get max concurrency from all workers
    const maxConcurrency = Math.max(
      ...Array.from(processors.values()).map((w) => w.concurrency || 1)
    );

    const bullWorker = new BullWorker(
      queueName,
      async (bullJob: BullJob) => {
        const worker = processors.get(bullJob.name);
        if (!worker) {
          throw new Error(`No worker registered for job type: ${bullJob.name}`);
        }

        const job = this.mapBullJobToJob(bullJob, queueName);
        const startTime = Date.now();

        try {
          const result = await worker.process(job);

          // Update metrics on success
          this.updateMetrics(queueName, true, Date.now() - startTime);

          return result;
        } catch (error) {
          // Update metrics on failure
          this.updateMetrics(queueName, false, Date.now() - startTime);
          throw error;
        }
      },
      {
        connection: this.connection.duplicate(),
        prefix: this.config.prefix,
        concurrency: maxConcurrency,
      }
    );

    bullWorker.on('completed', (job) => {
      logger.info({ jobId: job.id, queueName, jobName: job.name }, 'Job completed');
    });

    bullWorker.on('failed', (job, err) => {
      logger.error(
        { jobId: job?.id, queueName, jobName: job?.name, error: err.message },
        'Job failed'
      );
    });

    bullWorker.on('error', (err) => {
      logger.error({ queueName, error: err.message }, 'Worker error');
    });

    this.workers.set(queueName, bullWorker);
  }

  /**
   * Update metrics
   */
  private updateMetrics(queueName: string, success: boolean, duration: number): void {
    if (!this.config.metrics) return;

    const metric = this.metrics.get(queueName);
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
    metric.successRate = total > 0 ? (metric.totalProcessed / total) * 100 : 100;
  }

  /**
   * Get job by ID
   */
  async getJob(queueName: string, jobId: string): Promise<Job> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    const bullJob = await queue.getJob(jobId);
    if (!bullJob) {
      throw new NotFoundError('Job not found');
    }

    // Get actual state from BullMQ
    const state = await bullJob.getState();
    const job = this.mapBullJobToJob(bullJob, queueName);
    job.status = state as JobStatus;

    return job;
  }

  /**
   * List jobs with filters
   */
  async listJobs(queueName: string, filter?: JobFilter): Promise<Job[]> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    const statuses = filter?.status
      ? Array.isArray(filter.status)
        ? filter.status
        : [filter.status]
      : ['waiting', 'active', 'completed', 'failed', 'delayed'];

    const offset = filter?.offset || 0;
    const limit = filter?.limit || 100;

    // Get jobs from each status
    const allJobs: Job[] = [];

    for (const status of statuses) {
      let bullJobs: BullJob[] = [];

      switch (status) {
        case 'waiting':
          bullJobs = await queue.getWaiting(offset, offset + limit);
          break;
        case 'active':
          bullJobs = await queue.getActive(offset, offset + limit);
          break;
        case 'completed':
          bullJobs = await queue.getCompleted(offset, offset + limit);
          break;
        case 'failed':
          bullJobs = await queue.getFailed(offset, offset + limit);
          break;
        case 'delayed':
          bullJobs = await queue.getDelayed(offset, offset + limit);
          break;
      }

      for (const bullJob of bullJobs) {
        const job = this.mapBullJobToJob(bullJob, queueName);
        job.status = status as JobStatus;

        // Apply name filter
        if (filter?.name && job.name !== filter.name) {
          continue;
        }

        // Apply date filters
        if (filter?.startDate && job.createdAt < filter.startDate) {
          continue;
        }
        if (filter?.endDate && job.createdAt > filter.endDate) {
          continue;
        }

        allJobs.push(job);
      }
    }

    // Sort by creation date (newest first)
    allJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    return allJobs.slice(0, limit);
  }

  /**
   * Get queue statistics
   */
  async getStats(queueName: string): Promise<QueueStats> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    const counts = await queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused'
    );

    return {
      name: queueName,
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: counts.paused || 0,
    };
  }

  /**
   * Get queue metrics
   */
  async getMetrics(queueName: string): Promise<QueueMetrics> {
    const metric = this.metrics.get(queueName);
    if (!metric) {
      throw new NotFoundError('Queue not found or metrics disabled');
    }

    // Update current concurrency from worker
    const worker = this.workers.get(queueName);
    if (worker) {
      const queue = this.queues.get(queueName);
      if (queue) {
        const activeCount = await queue.getActiveCount();
        metric.currentConcurrency = activeCount;
        metric.peakConcurrency = Math.max(metric.peakConcurrency, activeCount);
      }
    }

    return { ...metric };
  }

  /**
   * Remove a job
   */
  async removeJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    const bullJob = await queue.getJob(jobId);
    if (!bullJob) {
      throw new NotFoundError('Job not found');
    }

    const state = await bullJob.getState();
    if (state === 'active') {
      throw new BadRequestError('Cannot remove active job');
    }

    await bullJob.remove();

    this.emitEvent({
      event: 'removed',
      jobId,
      timestamp: new Date(),
    });

    logger.info({ jobId, queueName }, 'Job removed');
  }

  /**
   * Retry a failed job
   */
  async retryJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    const bullJob = await queue.getJob(jobId);
    if (!bullJob) {
      throw new NotFoundError('Job not found');
    }

    const state = await bullJob.getState();
    if (state !== 'failed') {
      throw new BadRequestError('Can only retry failed jobs');
    }

    await bullJob.retry();

    logger.info({ jobId, queueName }, 'Job retry initiated');
  }

  /**
   * Clean completed/failed jobs
   */
  async cleanJobs(
    queueName: string,
    status: JobStatus | JobStatus[],
    olderThanMs: number = 24 * 60 * 60 * 1000
  ): Promise<number> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    const statuses = Array.isArray(status) ? status : [status];
    let cleaned = 0;

    for (const s of statuses) {
      if (s === 'completed' || s === 'failed') {
        const removed = await queue.clean(olderThanMs, 1000, s);
        cleaned += removed.length;
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
    return Array.from(this.queues.keys());
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    await queue.pause();

    logger.info({ queueName }, 'Queue paused');
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    await queue.resume();

    logger.info({ queueName }, 'Queue resumed');
  }

  /**
   * Drain a queue (remove all jobs)
   */
  async drainQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    await queue.drain();

    logger.info({ queueName }, 'Queue drained');
  }

  /**
   * Obliterate a queue (remove queue and all data)
   */
  async obliterateQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    // Close worker first
    const worker = this.workers.get(queueName);
    if (worker) {
      await worker.close();
      this.workers.delete(queueName);
    }

    // Close queue events
    const queueEvents = this.queueEvents.get(queueName);
    if (queueEvents) {
      await queueEvents.close();
      this.queueEvents.delete(queueName);
    }

    // Obliterate queue
    await queue.obliterate();
    this.queues.delete(queueName);
    this.workerProcessors.delete(queueName);
    this.metrics.delete(queueName);

    logger.info({ queueName }, 'Queue obliterated');
  }

  /**
   * Get job progress
   */
  async getJobProgress(
    queueName: string,
    jobId: string
  ): Promise<number | object | string | boolean> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    const bullJob = await queue.getJob(jobId);
    if (!bullJob) {
      throw new NotFoundError('Job not found');
    }

    return bullJob.progress;
  }

  /**
   * Update job progress
   */
  async updateJobProgress(
    queueName: string,
    jobId: string,
    progress: number | object
  ): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    const bullJob = await queue.getJob(jobId);
    if (!bullJob) {
      throw new NotFoundError('Job not found');
    }

    await bullJob.updateProgress(progress);
  }

  /**
   * Graceful shutdown
   */
  async close(): Promise<void> {
    if (this.isClosing) {
      return;
    }

    this.isClosing = true;
    logger.info('Closing queue service...');

    // Close all workers (wait for active jobs)
    const workerPromises = Array.from(this.workers.values()).map((worker) => worker.close());
    await Promise.all(workerPromises);

    // Close all queue events
    const eventPromises = Array.from(this.queueEvents.values()).map((events) => events.close());
    await Promise.all(eventPromises);

    // Close all queues
    const queuePromises = Array.from(this.queues.values()).map((queue) => queue.close());
    await Promise.all(queuePromises);

    // Close Redis connection
    await this.connection.quit();

    this.workers.clear();
    this.queueEvents.clear();
    this.queues.clear();
    this.workerProcessors.clear();
    this.metrics.clear();

    logger.info('Queue service closed');
  }

  /**
   * Check if service is connected
   */
  isConnected(): boolean {
    return this.connection.status === 'ready';
  }

  /**
   * Get Redis connection info
   */
  getConnectionInfo(): { host: string; port: number; status: string } {
    return {
      host: this.config.redis.host || 'localhost',
      port: this.config.redis.port || 6379,
      status: this.connection.status,
    };
  }
}
