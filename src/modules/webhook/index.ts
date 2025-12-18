/**
 * Webhook Module
 *
 * Provides outgoing webhook functionality with:
 * - HMAC signature verification
 * - Automatic retry with exponential backoff
 * - Delivery tracking and monitoring
 * - Multiple retry strategies
 * - Event publishing and subscription
 *
 * @example
 * ```typescript
 * import { WebhookService, createWebhookRoutes } from './modules/webhook';
 *
 * // Create service
 * const webhookService = new WebhookService({
 *   maxRetries: 5,
 *   timeout: 10000,
 *   enableSignature: true
 * });
 *
 * // Create endpoint
 * const endpoint = await webhookService.createEndpoint({
 *   url: 'https://example.com/webhook',
 *   events: ['user.created', 'order.completed'],
 *   description: 'Production webhook'
 * });
 *
 * // Publish event
 * await webhookService.publishEvent('user.created', {
 *   userId: '123',
 *   email: 'user@example.com',
 *   name: 'John Doe'
 * });
 *
 * // Add routes to your app
 * app.use('/api/webhooks', authMiddleware, createWebhookRoutes(webhookService));
 * ```
 *
 * ## Signature Verification
 *
 * Webhooks are signed with HMAC-SHA256. Recipients should verify:
 *
 * ```typescript
 * import { verifyWebhookSignature } from './modules/webhook';
 *
 * app.post('/webhook', (req, res) => {
 *   const signature = req.headers['x-webhook-signature'];
 *   const secret = 'your-webhook-secret';
 *
 *   if (!verifyWebhookSignature(req.body, signature, secret)) {
 *     return res.status(401).json({ error: 'Invalid signature' });
 *   }
 *
 *   // Process webhook
 *   res.json({ received: true });
 * });
 * ```
 */

// Types
export * from './types.js';

// Service
export { WebhookService } from './webhook.service.js';

// Routes
export { createWebhookRoutes } from './webhook.routes.js';

// Signature utilities
export {
  generateSignature,
  verifySignature,
  verifyWebhookSignature,
  parseSignatureHeader,
  formatSignatureHeader,
  generateWebhookSecret,
} from './signature.js';

// Retry strategies
export {
  ExponentialBackoffStrategy,
  LinearBackoffStrategy,
  FixedDelayStrategy,
  CustomDelayStrategy,
  createDefaultRetryStrategy,
  calculateNextRetryTime,
  shouldRetryDelivery,
  getExponentialBackoff,
  parseRetryAfter,
} from './retry.js';
