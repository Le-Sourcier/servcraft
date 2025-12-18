export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';

export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

export interface JobOptions {
  /** Job priority */
  priority?: JobPriority;
  /** Delay in milliseconds before job starts */
  delay?: number;
  /** Number of retry attempts */
  attempts?: number;
  /** Backoff strategy for retries */
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  /** Remove job on completion */
  removeOnComplete?: boolean | number;
  /** Remove job on failure */
  removeOnFail?: boolean | number;
  /** Job timeout in milliseconds */
  timeout?: number;
  /** Repeat job on cron schedule */
  repeat?: {
    cron?: string;
    every?: number;
    limit?: number;
    immediately?: boolean;
  };
}

export interface Job<T = any> {
  /** Unique job ID */
  id: string;
  /** Queue name */
  queueName: string;
  /** Job name/type */
  name: string;
  /** Job data */
  data: T;
  /** Job options */
  options: JobOptions;
  /** Job status */
  status: JobStatus;
  /** Progress (0-100) */
  progress?: number;
  /** Number of attempts made */
  attemptsMade: number;
  /** Job result if completed */
  result?: any;
  /** Error if failed */
  error?: string;
  /** Stack trace if failed */
  stacktrace?: string[];
  /** Creation timestamp */
  createdAt: Date;
  /** Processing start timestamp */
  processedAt?: Date;
  /** Completion timestamp */
  completedAt?: Date;
  /** Failure timestamp */
  failedAt?: Date;
  /** Delay until (for delayed jobs) */
  delayedUntil?: Date;
}

export interface QueueConfig {
  /** Redis connection options */
  redis?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  };
  /** Default job options */
  defaultJobOptions?: JobOptions;
  /** Queue prefix */
  prefix?: string;
  /** Enable metrics */
  metrics?: boolean;
}

export interface QueueStats {
  /** Queue name */
  name: string;
  /** Waiting jobs count */
  waiting: number;
  /** Active jobs count */
  active: number;
  /** Completed jobs count */
  completed: number;
  /** Failed jobs count */
  failed: number;
  /** Delayed jobs count */
  delayed: number;
  /** Paused jobs count */
  paused: number;
}

export interface Worker<T = any> {
  /** Worker name/type */
  name: string;
  /** Worker function */
  process: (job: Job<T>) => Promise<any>;
  /** Concurrency (parallel jobs) */
  concurrency?: number;
}

export interface CronJob {
  /** Unique cron job ID */
  id: string;
  /** Cron job name */
  name: string;
  /** Cron expression */
  cron: string;
  /** Job data */
  data?: any;
  /** Queue to add job to */
  queueName: string;
  /** Job name/type */
  jobName: string;
  /** Whether the cron is enabled */
  enabled: boolean;
  /** Last run timestamp */
  lastRun?: Date;
  /** Next run timestamp */
  nextRun?: Date;
  /** Creation timestamp */
  createdAt: Date;
}

export interface EmailJobData {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
  }>;
  template?: {
    name: string;
    data: Record<string, any>;
  };
}

export interface ImageProcessingJobData {
  /** Source image path or URL */
  source: string;
  /** Operations to perform */
  operations: Array<{
    type: 'resize' | 'crop' | 'rotate' | 'watermark' | 'compress';
    options: Record<string, any>;
  }>;
  /** Output path */
  output: string;
  /** Output format */
  format?: 'jpg' | 'png' | 'webp' | 'avif';
  /** Quality (1-100) */
  quality?: number;
}

export interface NotificationJobData {
  userId: string;
  type: 'push' | 'sms' | 'email';
  title?: string;
  message: string;
  data?: Record<string, any>;
}

export interface WebhookJobData {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  body: Record<string, any>;
  retries?: number;
}

export interface QueueMetrics {
  /** Total jobs processed */
  totalProcessed: number;
  /** Total jobs failed */
  totalFailed: number;
  /** Average processing time (ms) */
  avgProcessingTime: number;
  /** Jobs per minute */
  throughput: number;
  /** Peak concurrency */
  peakConcurrency: number;
  /** Current concurrency */
  currentConcurrency: number;
  /** Success rate (0-100) */
  successRate: number;
}

export interface BulkJobOptions {
  jobs: Array<{
    name: string;
    data: any;
    opts?: JobOptions;
  }>;
}

export interface JobFilter {
  status?: JobStatus | JobStatus[];
  name?: string;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface JobEvent {
  event: 'added' | 'active' | 'completed' | 'failed' | 'progress' | 'stalled' | 'removed';
  jobId: string;
  data?: any;
  timestamp: Date;
}
