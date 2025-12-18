export type WebhookEventType =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'order.created'
  | 'order.completed'
  | 'order.cancelled'
  | string; // Allow custom event types

export type WebhookStatus = 'pending' | 'delivered' | 'failed' | 'disabled';

export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying';

export interface WebhookEndpoint {
  /** Unique identifier */
  id: string;
  /** Endpoint URL */
  url: string;
  /** Secret for HMAC signature */
  secret: string;
  /** Events to listen for */
  events: WebhookEventType[];
  /** Whether the endpoint is active */
  enabled: boolean;
  /** Optional description */
  description?: string;
  /** Custom headers to send */
  headers?: Record<string, string>;
  /** Metadata */
  metadata?: Record<string, unknown>;
  /** Creation date */
  createdAt: Date;
  /** Last update date */
  updatedAt: Date;
}

export interface WebhookEvent {
  /** Unique identifier */
  id: string;
  /** Event type */
  type: WebhookEventType;
  /** Event payload */
  payload: Record<string, unknown>;
  /** When the event occurred */
  occurredAt: Date;
  /** Endpoints that should receive this event */
  endpoints?: string[];
}

export interface WebhookDelivery {
  /** Unique identifier */
  id: string;
  /** Webhook endpoint ID */
  endpointId: string;
  /** Event ID */
  eventId: string;
  /** Event type */
  eventType: WebhookEventType;
  /** Delivery status */
  status: WebhookDeliveryStatus;
  /** Number of attempts */
  attempts: number;
  /** Maximum attempts */
  maxAttempts: number;
  /** Next retry time */
  nextRetryAt?: Date;
  /** HTTP response status */
  responseStatus?: number;
  /** Response body */
  responseBody?: string;
  /** Error message if failed */
  error?: string;
  /** Request payload */
  payload: Record<string, unknown>;
  /** Creation date */
  createdAt: Date;
  /** Last attempt date */
  lastAttemptAt?: Date;
  /** Delivery completion date */
  deliveredAt?: Date;
}

export interface WebhookConfig {
  /** Default maximum retry attempts */
  maxRetries?: number;
  /** Initial retry delay in ms */
  initialRetryDelay?: number;
  /** Maximum retry delay in ms */
  maxRetryDelay?: number;
  /** Backoff multiplier */
  backoffMultiplier?: number;
  /** Request timeout in ms */
  timeout?: number;
  /** Enable signature verification */
  enableSignature?: boolean;
  /** Signature header name */
  signatureHeader?: string;
  /** Timestamp header name */
  timestampHeader?: string;
}

export interface WebhookSignature {
  /** Signature value */
  signature: string;
  /** Timestamp */
  timestamp: number;
  /** Version */
  version: string;
}

export interface WebhookDeliveryAttempt {
  /** Attempt number */
  attempt: number;
  /** HTTP status code */
  statusCode?: number;
  /** Response body */
  responseBody?: string;
  /** Error message */
  error?: string;
  /** Attempt timestamp */
  timestamp: Date;
  /** Duration in ms */
  duration?: number;
}

export interface WebhookStats {
  /** Total events sent */
  totalEvents: number;
  /** Successful deliveries */
  successfulDeliveries: number;
  /** Failed deliveries */
  failedDeliveries: number;
  /** Pending deliveries */
  pendingDeliveries: number;
  /** Average delivery time in ms */
  averageDeliveryTime: number;
  /** Success rate (0-100) */
  successRate: number;
}

export interface WebhookFilter {
  /** Filter by endpoint ID */
  endpointId?: string;
  /** Filter by event type */
  eventType?: WebhookEventType;
  /** Filter by status */
  status?: WebhookDeliveryStatus;
  /** Filter by date range */
  startDate?: Date;
  endDate?: Date;
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

export interface CreateWebhookEndpointData {
  url: string;
  events: WebhookEventType[];
  description?: string;
  headers?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface UpdateWebhookEndpointData {
  url?: string;
  events?: WebhookEventType[];
  enabled?: boolean;
  description?: string;
  headers?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface WebhookRetryStrategy {
  /** Calculate next retry delay */
  getNextRetryDelay(attempt: number): number;
  /** Check if should retry */
  shouldRetry(attempt: number, error?: Error): boolean;
}
