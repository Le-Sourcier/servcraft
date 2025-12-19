/**
 * Webhook Service
 * Manages webhook endpoints, events, and deliveries
 *
 * Persistence:
 * - Endpoints: Prisma/PostgreSQL (persistent)
 * - Deliveries: Prisma/PostgreSQL (persistent)
 * - Processing queue: In-memory Set (runtime state only)
 */
import { randomUUID } from 'crypto';
import { logger } from '../../core/logger.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { prisma } from '../../database/prisma.js';
import { WebhookRepository } from './webhook.repository.js';
import type {
  WebhookEndpoint,
  WebhookEvent,
  WebhookDelivery,
  WebhookConfig,
  WebhookEventType,
  WebhookStats,
  WebhookFilter,
  CreateWebhookEndpointData,
  UpdateWebhookEndpointData,
  WebhookRetryStrategy,
} from './types.js';
import { generateSignature, formatSignatureHeader } from './signature.js';
import { createDefaultRetryStrategy, calculateNextRetryTime } from './retry.js';

const defaultConfig: Required<WebhookConfig> = {
  maxRetries: 5,
  initialRetryDelay: 1000,
  maxRetryDelay: 60000,
  backoffMultiplier: 2,
  timeout: 10000,
  enableSignature: true,
  signatureHeader: 'X-Webhook-Signature',
  timestampHeader: 'X-Webhook-Timestamp',
};

export class WebhookService {
  private config: Required<WebhookConfig>;
  private repository: WebhookRepository;
  private retryStrategy: WebhookRetryStrategy;
  private processingQueue: Set<string> = new Set();
  private retryInterval: NodeJS.Timeout | null = null;

  constructor(config?: WebhookConfig) {
    this.config = { ...defaultConfig, ...config };
    this.repository = new WebhookRepository(prisma);
    this.retryStrategy = createDefaultRetryStrategy();

    // Start background retry processor
    this.startRetryProcessor();
  }

  // ==========================================
  // ENDPOINT MANAGEMENT
  // ==========================================

  async createEndpoint(data: CreateWebhookEndpointData): Promise<WebhookEndpoint> {
    // Validate URL
    try {
      new URL(data.url);
    } catch {
      throw new BadRequestError('Invalid webhook URL');
    }

    const endpoint = await this.repository.createEndpoint(data);
    logger.info({ endpointId: endpoint.id, url: endpoint.url }, 'Webhook endpoint created');

    return endpoint;
  }

  async getEndpoint(id: string): Promise<WebhookEndpoint> {
    const endpoint = await this.repository.getEndpointById(id);
    if (!endpoint) {
      throw new NotFoundError('Webhook endpoint not found');
    }
    return endpoint;
  }

  async listEndpoints(): Promise<WebhookEndpoint[]> {
    return this.repository.listEndpoints();
  }

  async updateEndpoint(id: string, data: UpdateWebhookEndpointData): Promise<WebhookEndpoint> {
    if (data.url) {
      try {
        new URL(data.url);
      } catch {
        throw new BadRequestError('Invalid webhook URL');
      }
    }

    const endpoint = await this.repository.updateEndpoint(id, data);
    if (!endpoint) {
      throw new NotFoundError('Webhook endpoint not found');
    }

    logger.info({ endpointId: id }, 'Webhook endpoint updated');
    return endpoint;
  }

  async deleteEndpoint(id: string): Promise<void> {
    const deleted = await this.repository.deleteEndpoint(id);
    if (!deleted) {
      throw new NotFoundError('Webhook endpoint not found');
    }
    logger.info({ endpointId: id }, 'Webhook endpoint deleted');
  }

  async rotateSecret(id: string): Promise<WebhookEndpoint> {
    const endpoint = await this.repository.rotateSecret(id);
    if (!endpoint) {
      throw new NotFoundError('Webhook endpoint not found');
    }

    logger.info({ endpointId: id }, 'Webhook secret rotated');
    return endpoint;
  }

  // ==========================================
  // EVENT PUBLISHING
  // ==========================================

  async publishEvent(
    type: WebhookEventType,
    payload: Record<string, unknown>,
    targetEndpoints?: string[]
  ): Promise<WebhookEvent> {
    const event: WebhookEvent = {
      id: randomUUID(),
      type,
      payload,
      occurredAt: new Date(),
      endpoints: targetEndpoints,
    };

    logger.info({ eventId: event.id, type }, 'Webhook event published');

    // Dispatch to endpoints asynchronously
    setImmediate(() => {
      this.dispatchEvent(event).catch((error) => {
        logger.error({ error, eventId: event.id }, 'Failed to dispatch event');
      });
    });

    return event;
  }

  private async dispatchEvent(event: WebhookEvent): Promise<void> {
    // Get matching endpoints from database
    let matchingEndpoints: WebhookEndpoint[];

    if (event.endpoints && event.endpoints.length > 0) {
      // Filter to specified endpoints
      const allEndpoints = await this.repository.getEndpointsByEvent(event.type);
      matchingEndpoints = allEndpoints.filter((e) => event.endpoints!.includes(e.id));
    } else {
      matchingEndpoints = await this.repository.getEndpointsByEvent(event.type);
    }

    logger.debug(
      { eventId: event.id, endpointCount: matchingEndpoints.length },
      'Dispatching event to endpoints'
    );

    // Create deliveries
    const deliveryPromises = matchingEndpoints.map((endpoint) =>
      this.createDelivery(endpoint, event)
    );

    await Promise.allSettled(deliveryPromises);
  }

  private async createDelivery(
    endpoint: WebhookEndpoint,
    event: WebhookEvent
  ): Promise<WebhookDelivery> {
    const delivery = await this.repository.createDelivery({
      endpointId: endpoint.id,
      eventType: event.type,
      payload: event.payload,
      maxAttempts: this.config.maxRetries,
    });

    // Attempt delivery immediately
    await this.attemptDelivery(delivery.id);

    return delivery;
  }

  private async attemptDelivery(deliveryId: string): Promise<void> {
    // Prevent concurrent processing
    if (this.processingQueue.has(deliveryId)) {
      return;
    }

    this.processingQueue.add(deliveryId);

    try {
      const delivery = await this.repository.getDeliveryById(deliveryId);
      if (!delivery) {
        throw new Error(`Delivery ${deliveryId} not found`);
      }

      const endpoint = await this.repository.getEndpointById(delivery.endpointId);
      if (!endpoint) {
        throw new Error(`Endpoint ${delivery.endpointId} not found`);
      }

      // Increment attempts
      await this.repository.incrementAttempts(deliveryId);
      const currentAttempts = delivery.attempts + 1;

      await this.repository.updateDelivery(deliveryId, {
        status: currentAttempts > 1 ? 'retrying' : 'pending',
      });

      const startTime = Date.now();

      try {
        // Prepare request
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'Servcraft-Webhooks/1.0',
          ...endpoint.headers,
        };

        // Add signature
        if (this.config.enableSignature) {
          const signature = generateSignature(delivery.payload, endpoint.secret);
          headers[this.config.signatureHeader] = formatSignatureHeader(signature);
          headers[this.config.timestampHeader] = signature.timestamp.toString();
        }

        // Send request
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            id: delivery.id,
            type: delivery.eventType,
            created: delivery.createdAt.toISOString(),
            data: delivery.payload,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const duration = Date.now() - startTime;
        const responseBody = await response.text().catch(() => '');

        // Check success
        if (response.ok) {
          await this.repository.updateDelivery(deliveryId, {
            status: 'success',
            deliveredAt: new Date(),
            responseStatus: response.status,
            responseBody: responseBody.substring(0, 1000),
          });

          logger.info(
            { deliveryId, endpointId: endpoint.id, duration },
            'Webhook delivered successfully'
          );
        } else {
          throw new Error(`HTTP ${response.status}: ${responseBody}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Check if should retry
        if (this.retryStrategy.shouldRetry(currentAttempts, error as Error)) {
          const nextRetryAt = calculateNextRetryTime(currentAttempts, this.retryStrategy);

          if (nextRetryAt) {
            await this.repository.updateDelivery(deliveryId, {
              status: 'retrying',
              nextRetryAt,
              error: errorMessage,
            });

            logger.warn(
              {
                deliveryId,
                endpointId: endpoint.id,
                attempt: currentAttempts,
                nextRetry: nextRetryAt,
                error: errorMessage,
              },
              'Webhook delivery failed, will retry'
            );
          } else {
            await this.repository.updateDelivery(deliveryId, {
              status: 'failed',
              error: errorMessage,
            });

            logger.error(
              {
                deliveryId,
                endpointId: endpoint.id,
                attempts: currentAttempts,
                error: errorMessage,
              },
              'Webhook delivery failed after all retries'
            );
          }
        } else {
          await this.repository.updateDelivery(deliveryId, {
            status: 'failed',
            error: errorMessage,
          });

          logger.error(
            {
              deliveryId,
              endpointId: endpoint.id,
              attempts: currentAttempts,
              error: errorMessage,
            },
            'Webhook delivery failed, not retrying'
          );
        }
      }
    } finally {
      this.processingQueue.delete(deliveryId);
    }
  }

  // ==========================================
  // RETRY PROCESSING
  // ==========================================

  private startRetryProcessor(): void {
    // Process retries every 5 seconds
    this.retryInterval = setInterval(() => {
      this.processRetries().catch((error) => {
        logger.error({ error }, 'Error processing retries');
      });
    }, 5000);
  }

  private async processRetries(): Promise<void> {
    const retriableDeliveries = await this.repository.getRetriableDeliveries();

    if (retriableDeliveries.length > 0) {
      logger.debug({ count: retriableDeliveries.length }, 'Processing retry batch');
    }

    await Promise.allSettled(
      retriableDeliveries
        .filter((d) => !this.processingQueue.has(d.id))
        .map((d) => this.attemptDelivery(d.id))
    );
  }

  // ==========================================
  // QUERY & STATS
  // ==========================================

  async getDelivery(id: string): Promise<WebhookDelivery> {
    const delivery = await this.repository.getDeliveryById(id);
    if (!delivery) {
      throw new NotFoundError('Webhook delivery not found');
    }
    return delivery;
  }

  async listDeliveries(filter?: WebhookFilter): Promise<WebhookDelivery[]> {
    return this.repository.listDeliveries(filter);
  }

  async getDeliveryAttempts(
    _deliveryId: string
  ): Promise<Array<{ attempt: number; timestamp: Date; statusCode?: number; error?: string }>> {
    // Delivery attempts are now tracked via the attempts counter and status updates
    // Historical attempt data would require a separate model to persist
    // For now, return empty array - attempt history can be derived from logs
    return [];
  }

  async retryDelivery(deliveryId: string): Promise<void> {
    const delivery = await this.repository.getDeliveryById(deliveryId);
    if (!delivery) {
      throw new NotFoundError('Webhook delivery not found');
    }

    if (delivery.status === 'success') {
      throw new BadRequestError('Cannot retry successful delivery');
    }

    // Reset for retry
    await this.repository.updateDelivery(deliveryId, {
      status: 'pending',
      nextRetryAt: new Date(),
    });

    logger.info({ deliveryId }, 'Manual retry triggered');

    await this.attemptDelivery(deliveryId);
  }

  async getStats(endpointId?: string): Promise<WebhookStats> {
    const stats = await this.repository.getStats(endpointId);

    const successRate =
      stats.totalDeliveries > 0 ? (stats.successCount / stats.totalDeliveries) * 100 : 0;

    return {
      totalEvents: stats.totalDeliveries,
      successfulDeliveries: stats.successCount,
      failedDeliveries: stats.failedCount,
      pendingDeliveries: stats.pendingCount,
      averageDeliveryTime: 0, // Would need to track this separately
      successRate,
    };
  }

  // ==========================================
  // CLEANUP
  // ==========================================

  async cleanup(olderThanDays = 30): Promise<number> {
    return this.repository.cleanupOldDeliveries(olderThanDays);
  }

  /**
   * Stop the retry processor
   */
  stop(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
  }
}

let webhookService: WebhookService | null = null;

export function getWebhookService(): WebhookService {
  if (!webhookService) {
    webhookService = new WebhookService();
  }
  return webhookService;
}

export function createWebhookService(config?: WebhookConfig): WebhookService {
  webhookService = new WebhookService(config);
  return webhookService;
}
