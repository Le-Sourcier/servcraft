import type { Response } from 'express';
import { Router, type Request } from 'express';
import type { QueueService } from './queue.service.js';
import type { CronJobManager } from './cron.js';
import type { JobStatus, JobOptions } from './types.js';

/**
 * Helper to get required param or send error
 */
function getRequiredParam(req: Request, res: Response, paramName: string): string | null {
  const value = req.params[paramName];
  if (!value) {
    res.status(400).json({ error: 'Bad Request', message: `${paramName} parameter is required` });
    return null;
  }
  return value;
}

/**
 * Create queue management routes
 * These routes should be protected with authentication/authorization
 */
export function createQueueRoutes(queueService: QueueService, cronManager: CronJobManager): Router {
  const router = Router();

  // Queue Management

  /**
   * GET /queues
   * List all queues
   */
  router.get('/queues', async (_req: Request, res: Response) => {
    try {
      const queues = await queueService.listQueues();

      res.json({
        success: true,
        data: queues,
        count: queues.length,
      });
    } catch (error) {
      console.error('[QueueRoutes] Error listing queues:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to list queues',
      });
    }
  });

  /**
   * GET /queues/:name/stats
   * Get queue statistics
   */
  router.get('/queues/:name/stats', async (req: Request, res: Response) => {
    const name = getRequiredParam(req, res, 'name');
    if (!name) return;
    try {
      const stats = await queueService.getStats(name);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Queue not found',
        });
      }

      console.error('[QueueRoutes] Error getting queue stats:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get queue statistics',
      });
    }
  });

  /**
   * GET /queues/:name/metrics
   * Get queue metrics
   */
  router.get('/queues/:name/metrics', async (req: Request, res: Response) => {
    try {
      const name = getRequiredParam(req, res, 'name');
      if (!name) return;
      const metrics = await queueService.getMetrics(name);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Queue not found or metrics disabled',
        });
      }

      console.error('[QueueRoutes] Error getting queue metrics:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get queue metrics',
      });
    }
  });

  /**
   * POST /queues/:name/pause
   * Pause a queue
   */
  router.post('/queues/:name/pause', async (req: Request, res: Response) => {
    try {
      const name = getRequiredParam(req, res, 'name');
      if (!name) return;
      await queueService.pauseQueue(name);

      res.json({
        success: true,
        message: `Queue ${name} paused`,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Queue not found',
        });
      }

      console.error('[QueueRoutes] Error pausing queue:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to pause queue',
      });
    }
  });

  /**
   * POST /queues/:name/resume
   * Resume a paused queue
   */
  router.post('/queues/:name/resume', async (req: Request, res: Response) => {
    try {
      const name = getRequiredParam(req, res, 'name');
      if (!name) return;
      await queueService.resumeQueue(name);

      res.json({
        success: true,
        message: `Queue ${name} resumed`,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Queue not found',
        });
      }

      console.error('[QueueRoutes] Error resuming queue:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to resume queue',
      });
    }
  });

  // Job Management

  /**
   * POST /queues/:name/jobs
   * Add a job to queue
   */
  router.post('/queues/:name/jobs', async (req: Request, res: Response) => {
    try {
      const name = getRequiredParam(req, res, 'name');
      if (!name) return;
      const { jobName, data, options } = req.body;

      if (!jobName || !data) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'jobName and data are required',
        });
      }

      const job = await queueService.addJob(name, jobName, data, options as JobOptions);

      res.status(201).json({
        success: true,
        data: job,
      });
    } catch (error) {
      console.error('[QueueRoutes] Error adding job:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to add job',
      });
    }
  });

  /**
   * POST /queues/:name/jobs/bulk
   * Add multiple jobs to queue
   */
  router.post('/queues/:name/jobs/bulk', async (req: Request, res: Response) => {
    try {
      const name = getRequiredParam(req, res, 'name');
      if (!name) return;
      const { jobs } = req.body;

      if (!jobs || !Array.isArray(jobs)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'jobs array is required',
        });
      }

      const addedJobs = await queueService.addBulkJobs(name, { jobs });

      res.status(201).json({
        success: true,
        data: addedJobs,
        count: addedJobs.length,
      });
    } catch (error) {
      console.error('[QueueRoutes] Error adding bulk jobs:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to add bulk jobs',
      });
    }
  });

  /**
   * GET /queues/:name/jobs
   * List jobs in queue with filters
   */
  router.get('/queues/:name/jobs', async (req: Request, res: Response) => {
    try {
      const name = getRequiredParam(req, res, 'name');
      if (!name) return;
      const { status, jobName, limit, offset, startDate, endDate } = req.query;

      const jobs = await queueService.listJobs(name, {
        status: status as JobStatus | JobStatus[],
        name: jobName as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json({
        success: true,
        data: jobs,
        count: jobs.length,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Queue not found',
        });
      }

      console.error('[QueueRoutes] Error listing jobs:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to list jobs',
      });
    }
  });

  /**
   * GET /queues/:name/jobs/:id
   * Get a specific job
   */
  router.get('/queues/:name/jobs/:id', async (req: Request, res: Response) => {
    const name = getRequiredParam(req, res, 'name');
    const id = getRequiredParam(req, res, 'id');
    if (!name || !id) return;
    try {
      const job = await queueService.getJob(name, id);

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Job or queue not found',
        });
      }

      console.error('[QueueRoutes] Error getting job:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get job',
      });
    }
  });

  /**
   * DELETE /queues/:name/jobs/:id
   * Remove a job
   */
  router.delete('/queues/:name/jobs/:id', async (req: Request, res: Response) => {
    const name = getRequiredParam(req, res, 'name');
    const id = getRequiredParam(req, res, 'id');
    if (!name || !id) return;
    try {
      await queueService.removeJob(name, id);

      res.json({
        success: true,
        message: 'Job removed',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Job or queue not found',
        });
      }

      if (error instanceof Error && error.message.includes('Cannot remove')) {
        res.status(400).json({
          error: 'Bad Request',
          message: error.message,
        });
      }

      console.error('[QueueRoutes] Error removing job:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to remove job',
      });
    }
  });

  /**
   * POST /queues/:name/jobs/:id/retry
   * Retry a failed job
   */
  router.post('/queues/:name/jobs/:id/retry', async (req: Request, res: Response) => {
    const name = getRequiredParam(req, res, 'name');
    const id = getRequiredParam(req, res, 'id');
    if (!name || !id) return;
    try {
      await queueService.retryJob(name, id);

      res.json({
        success: true,
        message: 'Job retry initiated',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Job or queue not found',
        });
      }

      if (error instanceof Error && error.message.includes('Can only retry')) {
        res.status(400).json({
          error: 'Bad Request',
          message: error.message,
        });
      }

      console.error('[QueueRoutes] Error retrying job:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retry job',
      });
    }
  });

  /**
   * POST /queues/:name/clean
   * Clean completed/failed jobs
   */
  router.post('/queues/:name/clean', async (req: Request, res: Response) => {
    try {
      const name = getRequiredParam(req, res, 'name');
      if (!name) return;
      const { status = 'completed', olderThanMs = 86400000 } = req.body;

      const cleaned = await queueService.cleanJobs(name, status as JobStatus, olderThanMs);

      res.json({
        success: true,
        message: `Cleaned ${cleaned} jobs`,
        cleaned,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Queue not found',
        });
      }

      console.error('[QueueRoutes] Error cleaning jobs:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to clean jobs',
      });
    }
  });

  // Cron Jobs

  /**
   * POST /cron
   * Create a cron job
   */
  router.post('/cron', async (req: Request, res: Response) => {
    try {
      const { name, cron, queueName, jobName, data, options } = req.body;

      if (!name || !cron || !queueName || !jobName) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'name, cron, queueName, and jobName are required',
        });
      }

      const cronJob = await cronManager.createCronJob(
        name,
        cron,
        queueName,
        jobName,
        data,
        options
      );

      res.status(201).json({
        success: true,
        data: cronJob,
      });
    } catch (error) {
      console.error('[QueueRoutes] Error creating cron job:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to create cron job',
      });
    }
  });

  /**
   * GET /cron
   * List all cron jobs
   */
  router.get('/cron', async (_req: Request, res: Response) => {
    try {
      const cronJobs = await cronManager.listCronJobs();

      res.json({
        success: true,
        data: cronJobs,
        count: cronJobs.length,
      });
    } catch (error) {
      console.error('[QueueRoutes] Error listing cron jobs:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to list cron jobs',
      });
    }
  });

  /**
   * GET /cron/:id
   * Get a specific cron job
   */
  router.get('/cron/:id', async (req: Request, res: Response) => {
    const id = getRequiredParam(req, res, 'id');
    if (!id) return;
    try {
      const cronJob = await cronManager.getCronJob(id);

      res.json({
        success: true,
        data: cronJob,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Cron job not found',
        });
      }

      console.error('[QueueRoutes] Error getting cron job:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get cron job',
      });
    }
  });

  /**
   * PATCH /cron/:id
   * Update a cron job
   */
  router.patch('/cron/:id', async (req: Request, res: Response) => {
    const id = getRequiredParam(req, res, 'id');
    if (!id) return;
    try {
      const updates = req.body;
      const cronJob = await cronManager.updateCronJob(id, updates);

      res.json({
        success: true,
        data: cronJob,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Cron job not found',
        });
      }

      console.error('[QueueRoutes] Error updating cron job:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to update cron job',
      });
    }
  });

  /**
   * DELETE /cron/:id
   * Delete a cron job
   */
  router.delete('/cron/:id', async (req: Request, res: Response) => {
    const id = getRequiredParam(req, res, 'id');
    if (!id) return;
    try {
      await cronManager.deleteCronJob(id);

      res.json({
        success: true,
        message: 'Cron job deleted',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Cron job not found',
        });
      }

      console.error('[QueueRoutes] Error deleting cron job:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete cron job',
      });
    }
  });

  /**
   * POST /cron/:id/trigger
   * Manually trigger a cron job
   */
  router.post('/cron/:id/trigger', async (req: Request, res: Response) => {
    const id = getRequiredParam(req, res, 'id');
    if (!id) return;
    try {
      await cronManager.triggerCronJob(id);

      res.json({
        success: true,
        message: 'Cron job triggered',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Cron job not found',
        });
      }

      console.error('[QueueRoutes] Error triggering cron job:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to trigger cron job',
      });
    }
  });

  return router;
}
