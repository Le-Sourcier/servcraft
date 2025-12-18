import type { WebhookRetryStrategy } from './types.js';

/**
 * Exponential backoff retry strategy
 */
export class ExponentialBackoffStrategy implements WebhookRetryStrategy {
  constructor(
    private initialDelay: number = 1000, // 1 second
    private maxDelay: number = 60000, // 1 minute
    private multiplier: number = 2,
    private maxRetries: number = 5
  ) {}

  getNextRetryDelay(attempt: number): number {
    if (attempt >= this.maxRetries) {
      return -1; // No more retries
    }

    // Calculate exponential backoff: initialDelay * (multiplier ^ attempt)
    const delay = this.initialDelay * Math.pow(this.multiplier, attempt);

    // Add jitter (±25% randomization) to prevent thundering herd
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);

    // Cap at maxDelay
    return Math.min(delay + jitter, this.maxDelay);
  }

  shouldRetry(attempt: number, error?: Error): boolean {
    // Don't retry if max attempts reached
    if (attempt >= this.maxRetries) {
      return false;
    }

    // Don't retry client errors (4xx), except specific cases
    if (error && 'statusCode' in error) {
      const statusCode = (error as { statusCode: number }).statusCode;

      // Retry on server errors (5xx) and specific client errors
      if (statusCode >= 500) {
        return true;
      }

      // Retry on specific client errors
      if (statusCode === 408 || statusCode === 429) {
        return true; // Request Timeout or Too Many Requests
      }

      // Don't retry other client errors
      if (statusCode >= 400 && statusCode < 500) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Linear backoff retry strategy
 */
export class LinearBackoffStrategy implements WebhookRetryStrategy {
  constructor(
    private delay: number = 5000, // 5 seconds
    private maxRetries: number = 3
  ) {}

  getNextRetryDelay(attempt: number): number {
    if (attempt >= this.maxRetries) {
      return -1;
    }

    // Linear increase: delay * (attempt + 1)
    return this.delay * (attempt + 1);
  }

  shouldRetry(attempt: number): boolean {
    return attempt < this.maxRetries;
  }
}

/**
 * Fixed delay retry strategy
 */
export class FixedDelayStrategy implements WebhookRetryStrategy {
  constructor(
    private delay: number = 10000, // 10 seconds
    private maxRetries: number = 3
  ) {}

  getNextRetryDelay(attempt: number): number {
    if (attempt >= this.maxRetries) {
      return -1;
    }

    return this.delay;
  }

  shouldRetry(attempt: number): boolean {
    return attempt < this.maxRetries;
  }
}

/**
 * Custom retry delays strategy
 */
export class CustomDelayStrategy implements WebhookRetryStrategy {
  constructor(private delays: number[]) {}

  getNextRetryDelay(attempt: number): number {
    if (attempt >= this.delays.length) {
      return -1;
    }

    return this.delays[attempt];
  }

  shouldRetry(attempt: number): boolean {
    return attempt < this.delays.length;
  }
}

/**
 * Retry utility functions
 */

/**
 * Calculate next retry time
 */
export function calculateNextRetryTime(
  attempt: number,
  strategy: WebhookRetryStrategy
): Date | null {
  const delay = strategy.getNextRetryDelay(attempt);

  if (delay < 0) {
    return null;
  }

  return new Date(Date.now() + delay);
}

/**
 * Check if delivery should be retried
 */
export function shouldRetryDelivery(
  attempts: number,
  strategy: WebhookRetryStrategy,
  error?: Error
): boolean {
  return strategy.shouldRetry(attempts, error);
}

/**
 * Get retry delay with exponential backoff
 */
export function getExponentialBackoff(
  attempt: number,
  initialDelay = 1000,
  maxDelay = 60000,
  multiplier = 2
): number {
  const delay = initialDelay * Math.pow(multiplier, attempt);
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.min(delay + jitter, maxDelay);
}

/**
 * Create default retry strategy
 */
export function createDefaultRetryStrategy(): WebhookRetryStrategy {
  return new ExponentialBackoffStrategy(1000, 60000, 2, 5);
}

/**
 * Parse retry-after header
 */
export function parseRetryAfter(retryAfter: string | number): number {
  if (typeof retryAfter === 'number') {
    return retryAfter * 1000; // seconds to milliseconds
  }

  // Try parsing as number (seconds)
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  // Try parsing as HTTP date
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return 0;
}
