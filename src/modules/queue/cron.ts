import { randomUUID } from 'crypto';
import { logger } from '../../core/logger.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import type { CronJob, JobOptions } from './types.js';
import type { QueueService } from './queue.service.js';

// In-memory storage
const cronJobs = new Map<string, CronJob>();
const cronTimers = new Map<string, NodeJS.Timeout>();

/**
 * Cron Job Manager
 * Manages scheduled jobs with cron expressions
 */
export class CronJobManager {
  constructor(private queueService: QueueService) {}

  /**
   * Create a cron job
   */
  async createCronJob(
    name: string,
    cron: string,
    queueName: string,
    jobName: string,
    data?: unknown,
    _options?: JobOptions
  ): Promise<CronJob> {
    // Validate cron expression
    if (!this.isValidCron(cron)) {
      throw new BadRequestError('Invalid cron expression');
    }

    const cronJob: CronJob = {
      id: randomUUID(),
      name,
      cron,
      queueName,
      jobName,
      data,
      enabled: true,
      createdAt: new Date(),
      nextRun: this.calculateNextRun(cron),
    };

    cronJobs.set(cronJob.id, cronJob);

    // Schedule the cron job
    this.scheduleCronJob(cronJob.id);

    logger.info(
      { cronJobId: cronJob.id, name, cron, nextRun: cronJob.nextRun },
      'Cron job created'
    );

    return cronJob;
  }

  /**
   * Get a cron job
   */
  async getCronJob(id: string): Promise<CronJob> {
    const cronJob = cronJobs.get(id);
    if (!cronJob) {
      throw new NotFoundError('Cron job not found');
    }
    return cronJob;
  }

  /**
   * List all cron jobs
   */
  async listCronJobs(): Promise<CronJob[]> {
    return Array.from(cronJobs.values());
  }

  /**
   * Update a cron job
   */
  async updateCronJob(
    id: string,
    updates: {
      name?: string;
      cron?: string;
      data?: unknown;
      enabled?: boolean;
    }
  ): Promise<CronJob> {
    const cronJob = await this.getCronJob(id);

    if (updates.name) {
      cronJob.name = updates.name;
    }

    if (updates.cron) {
      if (!this.isValidCron(updates.cron)) {
        throw new BadRequestError('Invalid cron expression');
      }
      cronJob.cron = updates.cron;
      cronJob.nextRun = this.calculateNextRun(updates.cron);
    }

    if (updates.data !== undefined) {
      cronJob.data = updates.data;
    }

    if (updates.enabled !== undefined) {
      cronJob.enabled = updates.enabled;

      if (updates.enabled) {
        this.scheduleCronJob(id);
      } else {
        this.unscheduleCronJob(id);
      }
    }

    cronJobs.set(id, cronJob);

    logger.info({ cronJobId: id, updates }, 'Cron job updated');

    return cronJob;
  }

  /**
   * Delete a cron job
   */
  async deleteCronJob(id: string): Promise<void> {
    const cronJob = await this.getCronJob(id);

    this.unscheduleCronJob(id);
    cronJobs.delete(id);

    logger.info({ cronJobId: id, name: cronJob.name }, 'Cron job deleted');
  }

  /**
   * Manually trigger a cron job
   */
  async triggerCronJob(id: string): Promise<void> {
    const cronJob = await this.getCronJob(id);

    await this.executeCronJob(cronJob);

    logger.info({ cronJobId: id, name: cronJob.name }, 'Cron job triggered manually');
  }

  /**
   * Schedule a cron job
   */
  private scheduleCronJob(id: string): void {
    const cronJob = cronJobs.get(id);
    if (!cronJob || !cronJob.enabled) {
      return;
    }

    // Clear existing timer
    this.unscheduleCronJob(id);

    // Calculate next run time
    const nextRun = this.calculateNextRun(cronJob.cron);
    if (!nextRun) {
      logger.warn({ cronJobId: id }, 'Could not calculate next run time');
      return;
    }

    cronJob.nextRun = nextRun;

    // Schedule execution
    const delay = nextRun.getTime() - Date.now();

    const timer = setTimeout(async () => {
      await this.executeCronJob(cronJob);
      this.scheduleCronJob(id); // Reschedule for next run
    }, delay);

    cronTimers.set(id, timer);

    logger.debug({ cronJobId: id, name: cronJob.name, nextRun }, 'Cron job scheduled');
  }

  /**
   * Unschedule a cron job
   */
  private unscheduleCronJob(id: string): void {
    const timer = cronTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      cronTimers.delete(id);
    }
  }

  /**
   * Execute a cron job
   */
  private async executeCronJob(cronJob: CronJob): Promise<void> {
    try {
      cronJob.lastRun = new Date();

      logger.info({ cronJobId: cronJob.id, name: cronJob.name }, 'Executing cron job');

      // Add job to queue
      await this.queueService.addJob(cronJob.queueName, cronJob.jobName, cronJob.data || {});

      logger.info({ cronJobId: cronJob.id, name: cronJob.name }, 'Cron job executed successfully');
    } catch (error) {
      logger.error(
        { error, cronJobId: cronJob.id, name: cronJob.name },
        'Error executing cron job'
      );
    }
  }

  /**
   * Validate cron expression
   */
  private isValidCron(cron: string): boolean {
    // Basic validation for cron expression
    // Format: minute hour day month dayOfWeek
    // Support for */n, ranges, lists
    const parts = cron.split(' ');

    if (parts.length !== 5) {
      return false;
    }

    // Validate each part
    const ranges = [
      [0, 59], // minute
      [0, 23], // hour
      [1, 31], // day
      [1, 12], // month
      [0, 6], // dayOfWeek
    ];

    for (let i = 0; i < 5; i++) {
      const part = parts[i];
      const [min, max] = ranges[i];

      if (part === '*') continue;

      // Handle */n
      if (part.startsWith('*/')) {
        const step = parseInt(part.substring(2), 10);
        if (isNaN(step) || step < 1) return false;
        continue;
      }

      // Handle ranges (e.g., 1-5)
      if (part.includes('-')) {
        const [start, end] = part.split('-').map((n) => parseInt(n, 10));
        if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
          return false;
        }
        continue;
      }

      // Handle lists (e.g., 1,3,5)
      if (part.includes(',')) {
        const values = part.split(',').map((n) => parseInt(n, 10));
        if (values.some((v) => isNaN(v) || v < min || v > max)) {
          return false;
        }
        continue;
      }

      // Handle single value
      const value = parseInt(part, 10);
      if (isNaN(value) || value < min || value > max) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate next run time for cron expression
   */
  private calculateNextRun(cron: string): Date | null {
    const now = new Date();
    const parts = cron.split(' ');

    if (parts.length !== 5) {
      return null;
    }

    // Parse cron parts
    const minute = this.parseCronPart(parts[0], 0, 59);
    const hour = this.parseCronPart(parts[1], 0, 23);
    const day = this.parseCronPart(parts[2], 1, 31);
    const month = this.parseCronPart(parts[3], 1, 12);
    const dayOfWeek = this.parseCronPart(parts[4], 0, 6);

    // Find next valid time
    // This is a simplified implementation
    // For production, use a library like node-cron or cron-parser

    const next = new Date(now);
    next.setSeconds(0);
    next.setMilliseconds(0);

    // Add one minute to start from next minute
    next.setMinutes(next.getMinutes() + 1);

    // Simple implementation: check next 1000 minutes
    for (let i = 0; i < 1000; i++) {
      const m = next.getMinutes();
      const h = next.getHours();
      const d = next.getDate();
      const mo = next.getMonth() + 1;
      const dow = next.getDay();

      if (
        minute.includes(m) &&
        hour.includes(h) &&
        day.includes(d) &&
        month.includes(mo) &&
        dayOfWeek.includes(dow)
      ) {
        return next;
      }

      next.setMinutes(next.getMinutes() + 1);
    }

    return null;
  }

  /**
   * Parse a cron part into array of values
   */
  private parseCronPart(part: string, min: number, max: number): number[] {
    if (part === '*') {
      const values = [];
      for (let i = min; i <= max; i++) {
        values.push(i);
      }
      return values;
    }

    if (part.startsWith('*/')) {
      const step = parseInt(part.substring(2), 10);
      const values = [];
      for (let i = min; i <= max; i += step) {
        values.push(i);
      }
      return values;
    }

    if (part.includes('-')) {
      const [start, end] = part.split('-').map((n) => parseInt(n, 10));
      const values = [];
      for (let i = start; i <= end; i++) {
        values.push(i);
      }
      return values;
    }

    if (part.includes(',')) {
      return part.split(',').map((n) => parseInt(n, 10));
    }

    return [parseInt(part, 10)];
  }

  /**
   * Initialize cron jobs (call on startup)
   */
  async initialize(): Promise<void> {
    const jobs = Array.from(cronJobs.values());

    for (const job of jobs) {
      if (job.enabled) {
        this.scheduleCronJob(job.id);
      }
    }

    logger.info({ count: jobs.length }, 'Cron jobs initialized');
  }

  /**
   * Shutdown cron jobs (call on app shutdown)
   */
  async shutdown(): Promise<void> {
    for (const id of cronTimers.keys()) {
      this.unscheduleCronJob(id);
    }

    logger.info('Cron jobs shut down');
  }
}

/**
 * Pre-configured cron schedules
 */
export const CronSchedules = {
  /** Every minute */
  EVERY_MINUTE: '* * * * *',
  /** Every 5 minutes */
  EVERY_5_MINUTES: '*/5 * * * *',
  /** Every 15 minutes */
  EVERY_15_MINUTES: '*/15 * * * *',
  /** Every 30 minutes */
  EVERY_30_MINUTES: '*/30 * * * *',
  /** Every hour */
  EVERY_HOUR: '0 * * * *',
  /** Every 6 hours */
  EVERY_6_HOURS: '0 */6 * * *',
  /** Every 12 hours */
  EVERY_12_HOURS: '0 */12 * * *',
  /** Daily at midnight */
  DAILY: '0 0 * * *',
  /** Daily at noon */
  DAILY_NOON: '0 12 * * *',
  /** Weekly on Sunday at midnight */
  WEEKLY: '0 0 * * 0',
  /** Monthly on 1st at midnight */
  MONTHLY: '0 0 1 * *',
  /** Weekdays at 9 AM */
  WEEKDAYS_9AM: '0 9 * * 1-5',
  /** Weekends at 10 AM */
  WEEKENDS_10AM: '0 10 * * 0,6',
};
