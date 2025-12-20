# Webhook Module

Outbound webhook system with retry logic, signatures, and delivery tracking.

## Features

- **Endpoint Management** - Create, update, delete webhook endpoints
- **Event Publishing** - Publish events to subscribed endpoints
- **Automatic Retries** - Exponential backoff with configurable limits
- **Signature Verification** - HMAC signatures for payload integrity
- **Delivery Tracking** - Full delivery history with status tracking
- **Secret Rotation** - Rotate endpoint secrets without downtime

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Webhook Service                          │
├──────────────────────────────────────────────────────────────┤
│  Endpoint Mgmt  │  Event Publishing  │  Retry Processor      │
└────────┬────────┴─────────┬──────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌──────────────────────────────────────────────────────────────┐
│                    Prisma Repository                         │
├──────────────────────────────────────────────────────────────┤
│    Endpoints    │    Deliveries    │    Statistics           │
└─────────────────┴──────────────────┴─────────────────────────┘
```

## Usage

### Basic Setup

```typescript
import { createWebhookService } from 'servcraft/modules/webhook';

const webhookService = createWebhookService({
  maxRetries: 5,
  initialRetryDelay: 1000,
  maxRetryDelay: 60000,
  backoffMultiplier: 2,
  timeout: 10000,
  enableSignature: true,
  signatureHeader: 'X-Webhook-Signature',
  timestampHeader: 'X-Webhook-Timestamp',
});
```

### Endpoint Management

```typescript
// Create endpoint
const endpoint = await webhookService.createEndpoint({
  url: 'https://example.com/webhooks',
  events: ['user.created', 'user.updated', 'order.completed'],
  headers: { 'X-Custom-Header': 'value' },
  description: 'Main webhook endpoint',
});
// endpoint.secret is auto-generated

// List endpoints
const endpoints = await webhookService.listEndpoints();

// Update endpoint
await webhookService.updateEndpoint(endpoint.id, {
  events: ['user.created', 'user.updated'],
  enabled: true,
});

// Rotate secret
const rotated = await webhookService.rotateSecret(endpoint.id);
// rotated.secret is new secret

// Delete endpoint
await webhookService.deleteEndpoint(endpoint.id);
```

### Publishing Events

```typescript
// Publish to all matching endpoints
const event = await webhookService.publishEvent('user.created', {
  userId: 'user-123',
  email: 'user@example.com',
  createdAt: new Date().toISOString(),
});

// Publish to specific endpoints only
await webhookService.publishEvent('order.completed', payload, ['endpoint-id-1', 'endpoint-id-2']);
```

### Delivery Management

```typescript
// Get delivery status
const delivery = await webhookService.getDelivery(deliveryId);
// {
//   id, endpointId, eventType, payload,
//   status: 'pending' | 'success' | 'retrying' | 'failed',
//   attempts, deliveredAt, error
// }

// List deliveries with filters
const deliveries = await webhookService.listDeliveries({
  endpointId: 'endpoint-123',
  status: 'failed',
  eventType: 'user.created',
});

// Manual retry
await webhookService.retryDelivery(deliveryId);

// Get statistics
const stats = await webhookService.getStats(endpointId);
// {
//   totalEvents, successfulDeliveries, failedDeliveries,
//   pendingDeliveries, successRate
// }
```

### Cleanup

```typescript
// Clean up old deliveries (older than 30 days)
const deleted = await webhookService.cleanup(30);

// Stop retry processor (on shutdown)
webhookService.stop();
```

## Configuration

```typescript
interface WebhookConfig {
  maxRetries?: number;        // Max retry attempts (default: 5)
  initialRetryDelay?: number; // First retry delay ms (default: 1000)
  maxRetryDelay?: number;     // Max retry delay ms (default: 60000)
  backoffMultiplier?: number; // Backoff multiplier (default: 2)
  timeout?: number;           // Request timeout ms (default: 10000)
  enableSignature?: boolean;  // Enable HMAC signatures (default: true)
  signatureHeader?: string;   // Signature header name
  timestampHeader?: string;   // Timestamp header name
}
```

## Webhook Payload Format

Delivered webhooks have this structure:

```json
{
  "id": "delivery-uuid",
  "type": "user.created",
  "created": "2024-01-15T10:30:00.000Z",
  "data": {
    "userId": "user-123",
    "email": "user@example.com"
  }
}
```

## Signature Verification

Webhooks are signed using HMAC-SHA256. Recipients should verify:

```typescript
// Headers sent with webhook
// X-Webhook-Signature: t=1705312200,v1=abc123...
// X-Webhook-Timestamp: 1705312200

// Verification (recipient side)
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Parse signature header: t=timestamp,v1=signature
  const parts = signature.split(',');
  const receivedSig = parts.find(p => p.startsWith('v1='))?.slice(3);

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(receivedSig || '')
  );
}
```

## Retry Strategy

Retries use exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 second |
| 3 | 2 seconds |
| 4 | 4 seconds |
| 5 | 8 seconds |
| 6+ | Failed |

## Event Types

Define your event types:

```typescript
type WebhookEventType =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'order.created'
  | 'order.completed'
  | 'order.cancelled'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'subscription.created'
  | 'subscription.cancelled';
```

## Database Schema

```sql
-- Endpoints
CREATE TABLE webhook_endpoints (
  id UUID PRIMARY KEY,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL,
  headers JSONB,
  enabled BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Deliveries
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY,
  endpoint_id UUID REFERENCES webhook_endpoints,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  delivered_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  response_status INTEGER,
  response_body TEXT,
  error TEXT,
  created_at TIMESTAMP
);
```

## Best Practices

1. **Idempotency** - Include delivery ID for idempotent processing
2. **Timeout Handling** - Set reasonable timeouts (10s recommended)
3. **Signature Verification** - Always verify signatures on receipt
4. **Event Filtering** - Subscribe only to needed events
5. **Retry Handling** - Implement idempotent handlers for retries
6. **Secret Rotation** - Rotate secrets periodically
