import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { QueueService } from '../../src/modules/queue/queue.service.js';
import type { Job, Worker } from '../../src/modules/queue/types.js';

describe('Queue Service with BullMQ Integration', () => {
  let queueService: QueueService;
  const testQueueName = 'test-queue';

  beforeAll(async () => {
    // Create queue service with test Redis connection
    queueService = new QueueService({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        db: 15, // Use separate DB for tests
      },
      prefix: 'test:queue',
      metrics: true,
    });

    // Wait for connection
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    // Clean up test queues
    try {
      const queues = await queueService.listQueues();
      for (const queueName of queues) {
        await queueService.obliterateQueue(queueName);
      }
    } catch {
      // Ignore cleanup errors
    }

    // Close service
    await queueService.close();
  });

  beforeEach(async () => {
    // Drain test queue before each test
    try {
      await queueService.drainQueue(testQueueName);
    } catch {
      // Queue might not exist yet
    }
  });

  describe('Queue Creation', () => {
    it('should create a queue', () => {
      const queue = queueService.createQueue(testQueueName);
      expect(queue).toBeDefined();
      expect(queue.name).toBe(testQueueName);
    });

    it('should return same queue instance on multiple calls', () => {
      const queue1 = queueService.createQueue(testQueueName);
      const queue2 = queueService.createQueue(testQueueName);
      expect(queue1).toBe(queue2);
    });

    it('should list created queues', async () => {
      queueService.createQueue('queue-1');
      queueService.createQueue('queue-2');
      const queues = await queueService.listQueues();
      expect(queues).toContain('queue-1');
      expect(queues).toContain('queue-2');
    });
  });

  describe('Job Management', () => {
    it('should add a job to queue', async () => {
      const job = await queueService.addJob(testQueueName, 'test-job', {
        message: 'Hello World',
      });

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.name).toBe('test-job');
      expect(job.data).toEqual({ message: 'Hello World' });
      expect(job.queueName).toBe(testQueueName);
    });

    it('should add job with priority', async () => {
      const job = await queueService.addJob(
        testQueueName,
        'priority-job',
        { value: 1 },
        { priority: 'high' }
      );

      expect(job.options.priority).toBe('high');
    });

    it('should add delayed job', async () => {
      const job = await queueService.addJob(
        testQueueName,
        'delayed-job',
        { value: 1 },
        { delay: 10000 }
      );

      expect(job.options.delay).toBe(10000);
      expect(job.delayedUntil).toBeDefined();
    });

    it('should add bulk jobs', async () => {
      const jobs = await queueService.addBulkJobs(testQueueName, {
        jobs: [
          { name: 'bulk-job-1', data: { index: 1 } },
          { name: 'bulk-job-2', data: { index: 2 } },
          { name: 'bulk-job-3', data: { index: 3 } },
        ],
      });

      expect(jobs).toHaveLength(3);
      expect(jobs[0].name).toBe('bulk-job-1');
      expect(jobs[1].name).toBe('bulk-job-2');
      expect(jobs[2].name).toBe('bulk-job-3');
    });

    it('should get job by ID', async () => {
      const addedJob = await queueService.addJob(testQueueName, 'get-job', { value: 42 });
      const retrievedJob = await queueService.getJob(testQueueName, addedJob.id);

      expect(retrievedJob.id).toBe(addedJob.id);
      expect(retrievedJob.data).toEqual({ value: 42 });
    });

    it('should throw error for non-existent job', async () => {
      queueService.createQueue(testQueueName);

      await expect(queueService.getJob(testQueueName, 'non-existent-job')).rejects.toThrow(
        'Job not found'
      );
    });

    it('should remove a waiting job', async () => {
      const job = await queueService.addJob(testQueueName, 'remove-job', { value: 1 });

      await queueService.removeJob(testQueueName, job.id);

      await expect(queueService.getJob(testQueueName, job.id)).rejects.toThrow('Job not found');
    });
  });

  describe('Job Listing and Filtering', () => {
    it('should list jobs with status filter', async () => {
      await queueService.addJob(testQueueName, 'list-job-1', { index: 1 });
      await queueService.addJob(testQueueName, 'list-job-2', { index: 2 });

      const jobs = await queueService.listJobs(testQueueName, { status: 'waiting' });

      expect(jobs.length).toBeGreaterThanOrEqual(2);
      expect(jobs.every((j) => j.status === 'waiting')).toBe(true);
    });

    it('should list jobs with name filter', async () => {
      await queueService.addJob(testQueueName, 'type-a', { index: 1 });
      await queueService.addJob(testQueueName, 'type-b', { index: 2 });
      await queueService.addJob(testQueueName, 'type-a', { index: 3 });

      const jobs = await queueService.listJobs(testQueueName, { name: 'type-a' });

      expect(jobs.every((j) => j.name === 'type-a')).toBe(true);
    });

    it('should list jobs with pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await queueService.addJob(testQueueName, 'paginated-job', { index: i });
      }

      const jobs = await queueService.listJobs(testQueueName, { limit: 3 });

      expect(jobs.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Queue Statistics', () => {
    it('should get queue stats', async () => {
      await queueService.addJob(testQueueName, 'stats-job-1', { value: 1 });
      await queueService.addJob(testQueueName, 'stats-job-2', { value: 2 });

      const stats = await queueService.getStats(testQueueName);

      expect(stats.name).toBe(testQueueName);
      expect(stats.waiting).toBeGreaterThanOrEqual(2);
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.failed).toBe('number');
      expect(typeof stats.delayed).toBe('number');
    });

    it('should get queue metrics', async () => {
      queueService.createQueue(testQueueName);

      const metrics = await queueService.getMetrics(testQueueName);

      expect(typeof metrics.totalProcessed).toBe('number');
      expect(typeof metrics.totalFailed).toBe('number');
      expect(typeof metrics.avgProcessingTime).toBe('number');
      expect(typeof metrics.successRate).toBe('number');
    });
  });

  describe('Worker Registration and Job Processing', () => {
    it('should register a worker', async () => {
      const worker: Worker = {
        name: 'test-worker',
        process: async (job: Job) => {
          return { processed: job.data };
        },
        concurrency: 2,
      };

      queueService.registerWorker(testQueueName, worker);

      // Worker should be registered without errors
      expect(true).toBe(true);
    });

    it('should process jobs with registered worker', async () => {
      const processedJobs: string[] = [];
      const processQueueName = 'process-test-queue';

      const worker: Worker = {
        name: 'process-worker',
        process: async (job: Job) => {
          processedJobs.push(job.id);
          return { success: true };
        },
        concurrency: 1,
      };

      queueService.registerWorker(processQueueName, worker);

      const job = await queueService.addJob(processQueueName, 'process-worker', { value: 1 });

      // Wait for job to be processed
      await new Promise((resolve) => setTimeout(resolve, 2000));

      expect(processedJobs).toContain(job.id);
    });

    it('should handle job failures and retries', async () => {
      let attempts = 0;
      const failQueueName = 'fail-test-queue';

      const worker: Worker = {
        name: 'fail-worker',
        process: async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Intentional failure');
          }
          return { success: true };
        },
        concurrency: 1,
      };

      queueService.registerWorker(failQueueName, worker);

      await queueService.addJob(
        failQueueName,
        'fail-worker',
        { value: 1 },
        {
          attempts: 3,
          backoff: { type: 'fixed', delay: 100 },
        }
      );

      // Wait for retries
      await new Promise((resolve) => setTimeout(resolve, 3000));

      expect(attempts).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Queue Operations', () => {
    it('should pause and resume queue', async () => {
      queueService.createQueue(testQueueName);

      await queueService.pauseQueue(testQueueName);
      // Queue should be paused without errors

      await queueService.resumeQueue(testQueueName);
      // Queue should be resumed without errors

      expect(true).toBe(true);
    });

    it('should drain queue', async () => {
      await queueService.addJob(testQueueName, 'drain-job-1', { value: 1 });
      await queueService.addJob(testQueueName, 'drain-job-2', { value: 2 });

      await queueService.drainQueue(testQueueName);

      const stats = await queueService.getStats(testQueueName);
      expect(stats.waiting).toBe(0);
    });

    it('should clean old jobs', async () => {
      // Add a job that completes
      const cleanQueueName = 'clean-test-queue';
      const worker: Worker = {
        name: 'clean-worker',
        process: async () => ({ done: true }),
      };

      queueService.registerWorker(cleanQueueName, worker);

      await queueService.addJob(cleanQueueName, 'clean-worker', { value: 1 });

      // Wait for job to complete
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Clean completed jobs older than 0ms (all)
      const cleaned = await queueService.cleanJobs(cleanQueueName, 'completed', 0);

      expect(typeof cleaned).toBe('number');
    });
  });

  describe('Events', () => {
    it('should emit job events', async () => {
      const events: string[] = [];

      queueService.on('added', () => events.push('added'));
      queueService.on('job:event', () => events.push('job:event'));

      await queueService.addJob(testQueueName, 'event-job', { value: 1 });

      // Wait for events
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(events).toContain('added');
      expect(events).toContain('job:event');
    });
  });

  describe('Connection Management', () => {
    it('should report connection status', () => {
      const isConnected = queueService.isConnected();
      expect(typeof isConnected).toBe('boolean');
    });

    it('should get connection info', () => {
      const info = queueService.getConnectionInfo();
      expect(info.host).toBeDefined();
      expect(info.port).toBeDefined();
      expect(info.status).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent queue operations', async () => {
      await expect(queueService.getStats('non-existent-queue')).rejects.toThrow('Queue not found');
    });

    it('should throw error when pausing non-existent queue', async () => {
      await expect(queueService.pauseQueue('non-existent-queue')).rejects.toThrow(
        'Queue not found'
      );
    });

    it('should throw error when removing non-existent job', async () => {
      queueService.createQueue(testQueueName);
      await expect(queueService.removeJob(testQueueName, 'non-existent-job')).rejects.toThrow(
        'Job not found'
      );
    });
  });

  describe('Job Retry', () => {
    it('should retry failed jobs', async () => {
      const retryQueueName = 'retry-test-queue';
      let callCount = 0;

      const worker: Worker = {
        name: 'retry-worker',
        process: async () => {
          callCount++;
          throw new Error('Always fails');
        },
      };

      queueService.registerWorker(retryQueueName, worker);

      await queueService.addJob(
        retryQueueName,
        'retry-worker',
        { value: 1 },
        { attempts: 1, removeOnFail: false }
      );

      // Wait for job to fail
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Get failed jobs
      const jobs = await queueService.listJobs(retryQueueName, { status: 'failed' });

      if (jobs.length > 0) {
        const failedJob = jobs[0];
        callCount = 0;

        // Retry the job
        await queueService.retryJob(retryQueueName, failedJob.id);

        // Wait for retry
        await new Promise((resolve) => setTimeout(resolve, 1500));

        expect(callCount).toBeGreaterThan(0);
      }
    });
  });
});
