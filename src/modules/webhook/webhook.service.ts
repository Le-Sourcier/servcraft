import { randomUUID } from 'crypto';
import { logger } from '../../core/logger.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import type {
  WebhookEndpoint,
  WebhookEvent,
  WebhookDelivery,
  WebhookConfig,
  WebhookEventType,
  WebhookDeliveryAttempt,
  WebhookStats,
  WebhookFilter,
  CreateWebhookEndpointData,
  UpdateWebhookEndpointData,
  WebhookRetryStrategy,
} from './types.js';
import { generateSignature, formatSignatureHeader, generateWebhookSecret } from './signature.js';
import { createDefaultRetryStrategy, calculateNextRetryTime } from './retry.js';

// In-memory storage
const endpoints = new Map<string, WebhookEndpoint>();
const events = new Map<string, WebhookEvent>();
const deliveries = new Map<string, WebhookDelivery>();
const deliveryAttempts = new Map<string, WebhookDeliveryAttempt[]>();

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

/**
 * Webhook Service
 * Manages webhook endpoints, events, and deliveries
 */
export class WebhookService {
  private config: Required<WebhookConfig>;
  private retryStrategy: WebhookRetryStrategy;
  private processingQueue: Set<string> = new Set();

  constructor(config?: WebhookConfig) {
    this.config = { ...defaultConfig, ...config };
    this.retryStrategy = createDefaultRetryStrategy();

    // Start background retry processor
    this.startRetryProcessor();
  }

  // Endpoint Management

  async createEndpoint(data: CreateWebhookEndpointData): Promise<WebhookEndpoint> {
    // Validate URL
    try {
      new URL(data.url);
    } catch {
      throw new BadRequestError('Invalid webhook URL');
    }

    const endpoint: WebhookEndpoint = {
      id: randomUUID(),
      url: data.url,
      secret: generateWebhookSecret(),
      events: data.events,
      enabled: true,
      description: data.description,
      headers: data.headers,
      metadata: data.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    endpoints.set(endpoint.id, endpoint);

    logger.info({ endpointId: endpoint.id, url: endpoint.url }, 'Webhook endpoint created');

    return endpoint;
  }

  async getEndpoint(id: string): Promise<WebhookEndpoint> {
    const endpoint = endpoints.get(id);
    if (!endpoint) {
      throw new NotFoundError('Webhook endpoint not found');
    }
    return endpoint;
  }

  async listEndpoints(): Promise<WebhookEndpoint[]> {
    return Array.from(endpoints.values());
  }

  async updateEndpoint(id: string, data: UpdateWebhookEndpointData): Promise<WebhookEndpoint> {
    const endpoint = await this.getEndpoint(id);

    if (data.url) {
      try {
        new URL(data.url);
      } catch {
        throw new BadRequestError('Invalid webhook URL');
      }
      endpoint.url = data.url;
    }

    if (data.events) {
      endpoint.events = data.events;
    }

    if (data.enabled !== undefined) {
      endpoint.enabled = data.enabled;
    }

    if (data.description !== undefined) {
      endpoint.description = data.description;
    }

    if (data.headers) {
      endpoint.headers = data.headers;
    }

    if (data.metadata) {
      endpoint.metadata = data.metadata;
    }

    endpoint.updatedAt = new Date();
    endpoints.set(id, endpoint);

    logger.info({ endpointId: id }, 'Webhook endpoint updated');

    return endpoint;
  }

  async deleteEndpoint(id: string): Promise<void> {
    const endpoint = await this.getEndpoint(id);
    endpoints.delete(id);

    logger.info({ endpointId: id, url: endpoint.url }, 'Webhook endpoint deleted');
  }

  async rotateSecret(id: string): Promise<WebhookEndpoint> {
    const endpoint = await this.getEndpoint(id);
    endpoint.secret = generateWebhookSecret();
    endpoint.updatedAt = new Date();
    endpoints.set(id, endpoint);

    logger.info({ endpointId: id }, 'Webhook secret rotated');

    return endpoint;
  }

  // Event Publishing

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

    events.set(event.id, event);

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
    // Get matching endpoints
    const matchingEndpoints = Array.from(endpoints.values()).filter((endpoint) => {
      if (!endpoint.enabled) return false;
      if (event.endpoints && !event.endpoints.includes(endpoint.id)) return false;
      return endpoint.events.includes(event.type) || endpoint.events.includes('*');
    });

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
    const delivery: WebhookDelivery = {
      id: randomUUID(),
      endpointId: endpoint.id,
      eventId: event.id,
      eventType: event.type,
      status: 'pending',
      attempts: 0,
      maxAttempts: this.config.maxRetries,
      payload: event.payload,
      createdAt: new Date(),
    };

    deliveries.set(delivery.id, delivery);
    deliveryAttempts.set(delivery.id, []);

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
      const delivery = deliveries.get(deliveryId);
      if (!delivery) {
        throw new Error(`Delivery ${deliveryId} not found`);
      }

      const endpoint = endpoints.get(delivery.endpointId);
      if (!endpoint) {
        throw new Error(`Endpoint ${delivery.endpointId} not found`);
      }

      delivery.attempts++;
      delivery.lastAttemptAt = new Date();
      delivery.status = delivery.attempts > 1 ? 'retrying' : 'pending';

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

        // Record attempt
        const attempt: WebhookDeliveryAttempt = {
          attempt: delivery.attempts,
          statusCode: response.status,
          responseBody: responseBody.substring(0, 1000), // Limit size
          timestamp: new Date(),
          duration,
        };

        const attempts = deliveryAttempts.get(deliveryId) || [];
        attempts.push(attempt);
        deliveryAttempts.set(deliveryId, attempts);

        // Check success
        if (response.ok) {
          delivery.status = 'success';
          delivery.deliveredAt = new Date();
          delivery.responseStatus = response.status;
          delivery.responseBody = responseBody.substring(0, 1000);

          logger.info(
            { deliveryId, endpointId: endpoint.id, duration },
            'Webhook delivered successfully'
          );
        } else {
          throw new Error(`HTTP ${response.status}: ${responseBody}`);
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Record failed attempt
        const attempt: WebhookDeliveryAttempt = {
          attempt: delivery.attempts,
          error: errorMessage,
          timestamp: new Date(),
          duration,
        };

        const attempts = deliveryAttempts.get(deliveryId) || [];
        attempts.push(attempt);
        deliveryAttempts.set(deliveryId, attempts);

        // Check if should retry
        if (this.retryStrategy.shouldRetry(delivery.attempts, error as Error)) {
          const nextRetryAt = calculateNextRetryTime(delivery.attempts, this.retryStrategy);

          if (nextRetryAt) {
            delivery.nextRetryAt = nextRetryAt;
            delivery.error = errorMessage;

            logger.warn(
              {
                deliveryId,
                endpointId: endpoint.id,
                attempt: delivery.attempts,
                nextRetry: nextRetryAt,
                error: errorMessage,
              },
              'Webhook delivery failed, will retry'
            );
          } else {
            delivery.status = 'failed';
            delivery.error = errorMessage;

            logger.error(
              {
                deliveryId,
                endpointId: endpoint.id,
                attempts: delivery.attempts,
                error: errorMessage,
              },
              'Webhook delivery failed after all retries'
            );
          }
        } else {
          delivery.status = 'failed';
          delivery.error = errorMessage;

          logger.error(
            {
              deliveryId,
              endpointId: endpoint.id,
              attempts: delivery.attempts,
              error: errorMessage,
            },
            'Webhook delivery failed, not retrying'
          );
        }
      }

      deliveries.set(deliveryId, delivery);
    } finally {
      this.processingQueue.delete(deliveryId);
    }
  }

  // Retry Processing

  private startRetryProcessor(): void {
    // Process retries every 5 seconds
    setInterval(() => {
      this.processRetries().catch((error) => {
        logger.error({ error }, 'Error processing retries');
      });
    }, 5000);
  }

  private async processRetries(): Promise<void> {
    const now = new Date();
    const retriableDeliveries = Array.from(deliveries.values()).filter(
      (delivery) =>
        (delivery.status === 'pending' || delivery.status === 'retrying') &&
        delivery.nextRetryAt &&
        delivery.nextRetryAt <= now &&
        !this.processingQueue.has(delivery.id)
    );

    if (retriableDeliveries.length > 0) {
      logger.debug({ count: retriableDeliveries.length }, 'Processing retry batch');
    }

    await Promise.allSettled(
      retriableDeliveries.map((delivery) => this.attemptDelivery(delivery.id))
    );
  }

  // Query & Stats

  async getDelivery(id: string): Promise<WebhookDelivery> {
    const delivery = deliveries.get(id);
    if (!delivery) {
      throw new NotFoundError('Webhook delivery not found');
    }
    return delivery;
  }

  async listDeliveries(filter?: WebhookFilter): Promise<WebhookDelivery[]> {
    let results = Array.from(deliveries.values());

    if (filter?.endpointId) {
      results = results.filter((d) => d.endpointId === filter.endpointId);
    }

    if (filter?.eventType) {
      results = results.filter((d) => d.eventType === filter.eventType);
    }

    if (filter?.status) {
      results = results.filter((d) => d.status === filter.status);
    }

    if (filter?.startDate) {
      results = results.filter((d) => d.createdAt >= filter.startDate!);
    }

    if (filter?.endDate) {
      results = results.filter((d) => d.createdAt <= filter.endDate!);
    }

    // Sort by creation date (newest first)
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Pagination
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 100;

    return results.slice(offset, offset + limit);
  }

  async getDeliveryAttempts(deliveryId: string): Promise<WebhookDeliveryAttempt[]> {
    return deliveryAttempts.get(deliveryId) || [];
  }

  async retryDelivery(deliveryId: string): Promise<void> {
    const delivery = await this.getDelivery(deliveryId);

    if (delivery.status === 'success') {
      throw new BadRequestError('Cannot retry successful delivery');
    }

    // Reset for retry
    delivery.status = 'pending';
    delivery.nextRetryAt = new Date();
    deliveries.set(deliveryId, delivery);

    logger.info({ deliveryId }, 'Manual retry triggered');

    await this.attemptDelivery(deliveryId);
  }

  async getStats(endpointId?: string): Promise<WebhookStats> {
    let relevantDeliveries = Array.from(deliveries.values());

    if (endpointId) {
      relevantDeliveries = relevantDeliveries.filter((d) => d.endpointId === endpointId);
    }

    const totalEvents = relevantDeliveries.length;
    const successfulDeliveries = relevantDeliveries.filter((d) => d.status === 'success').length;
    const failedDeliveries = relevantDeliveries.filter((d) => d.status === 'failed').length;
    const pendingDeliveries = relevantDeliveries.filter(
      (d) => d.status === 'pending' || d.status === 'retrying'
    ).length;

    // Calculate average delivery time
    const successfulWithTime = relevantDeliveries.filter(
      (d) => d.status === 'success' && d.deliveredAt
    );

    let averageDeliveryTime = 0;
    if (successfulWithTime.length > 0) {
      const totalTime = successfulWithTime.reduce((sum, d) => {
        return sum + (d.deliveredAt!.getTime() - d.createdAt.getTime());
      }, 0);
      averageDeliveryTime = totalTime / successfulWithTime.length;
    }

    const successRate = totalEvents > 0 ? (successfulDeliveries / totalEvents) * 100 : 0;

    return {
      totalEvents,
      successfulDeliveries,
      failedDeliveries,
      pendingDeliveries,
      averageDeliveryTime,
      successRate,
    };
  }

  // Cleanup

  async cleanup(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let cleaned = 0;

    // Clean old deliveries
    for (const [id, delivery] of deliveries.entries()) {
      if (
        delivery.createdAt < cutoffDate &&
        (delivery.status === 'success' || delivery.status === 'failed')
      ) {
        deliveries.delete(id);
        deliveryAttempts.delete(id);
        cleaned++;
      }
    }

    // Clean old events
    for (const [id, event] of events.entries()) {
      if (event.occurredAt < cutoffDate) {
        events.delete(id);
        cleaned++;
      }
    }

    logger.info({ cleaned, olderThanDays }, 'Cleaned up old webhook data');

    return cleaned;
  }
}
