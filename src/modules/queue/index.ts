/**
 * Queue/Jobs Module
 *
 * Provides background job processing with:
 * - Multiple queue management
 * - Job priority and retry strategies
 * - Cron-based scheduling
 * - Pre-built workers for common tasks
 * - Real-time monitoring and metrics
 *
 * @example
 * ```typescript
 * import { QueueService, CronJobManager, defaultWorkers, CronSchedules } from './modules/queue';
 *
 * // Create queue service
 * const queueService = new QueueService({
 *   redis: {
 *     host: 'localhost',
 *     port: 6379
 *   },
 *   metrics: true
 * });
 *
 * // Register workers
 * import { emailWorker, imageProcessingWorker } from './modules/queue';
 * queueService.registerWorker('emails', emailWorker);
 * queueService.registerWorker('images', imageProcessingWorker);
 *
 * // Add jobs
 * await queueService.addJob('emails', 'send-email', {
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   html: '<h1>Welcome to our service</h1>'
 * });
 *
 * // Create cron jobs
 * const cronManager = new CronJobManager(queueService);
 * await cronManager.createCronJob(
 *   'Daily Backup',
 *   CronSchedules.DAILY,
 *   'maintenance',
 *   'database-backup',
 *   { databases: ['main', 'analytics'] }
 * );
 *
 * // Add routes
 * app.use('/api/queue', authMiddleware, createQueueRoutes(queueService, cronManager));
 * ```
 *
 * ## Pre-built Workers
 *
 * - `emailWorker` - Send emails
 * - `imageProcessingWorker` - Process images (resize, crop, watermark)
 * - `notificationWorker` - Send push/SMS/email notifications
 * - `webhookWorker` - Send HTTP webhooks
 * - `dataExportWorker` - Export data to CSV/Excel/PDF
 * - `reportGenerationWorker` - Generate reports
 * - `databaseBackupWorker` - Create database backups
 * - `cacheWarmingWorker` - Warm up cache
 * - `dataCleanupWorker` - Clean old data
 * - `batchProcessingWorker` - Process items in batches
 */

// Types
export * from './types.js';

// Services
export { QueueService } from './queue.service.js';
export { CronJobManager, CronSchedules } from './cron.js';

// Workers
export {
  emailWorker,
  imageProcessingWorker,
  notificationWorker,
  webhookWorker,
  dataExportWorker,
  reportGenerationWorker,
  databaseBackupWorker,
  cacheWarmingWorker,
  dataCleanupWorker,
  batchProcessingWorker,
  defaultWorkers,
} from './workers.js';

// Routes
export { createQueueRoutes } from './queue.routes.js';
