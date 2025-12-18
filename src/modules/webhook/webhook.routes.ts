import type { Response } from 'express';
import { Router, type Request } from 'express';
import type { WebhookService } from './webhook.service.js';
import type { WebhookEventType } from './types.js';

/**
 * Create webhook management routes
 * These routes should be protected with authentication/authorization
 */
export function createWebhookRoutes(service: WebhookService): Router {
  const router = Router();

  // Endpoint Management

  /**
   * POST /webhooks/endpoints
   * Create a new webhook endpoint
   */
  router.post('/endpoints', async (req: Request, res: Response) => {
    try {
      const { url, events, description, headers, metadata } = req.body;

      if (!url || !events || !Array.isArray(events)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'url and events array are required',
        });
      }

      const endpoint = await service.createEndpoint({
        url,
        events,
        description,
        headers,
        metadata,
      });

      res.status(201).json({
        success: true,
        data: endpoint,
      });
    } catch (error) {
      console.error('[WebhookRoutes] Error creating endpoint:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to create webhook endpoint',
      });
    }
  });

  /**
   * GET /webhooks/endpoints
   * List all webhook endpoints
   */
  router.get('/endpoints', async (_req: Request, res: Response) => {
    try {
      const endpoints = await service.listEndpoints();

      res.json({
        success: true,
        data: endpoints,
        count: endpoints.length,
      });
    } catch (error) {
      console.error('[WebhookRoutes] Error listing endpoints:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to list webhook endpoints',
      });
    }
  });

  /**
   * GET /webhooks/endpoints/:id
   * Get a specific webhook endpoint
   */
  router.get('/endpoints/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const endpoint = await service.getEndpoint(id);

      res.json({
        success: true,
        data: endpoint,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Webhook endpoint not found',
        });
      }

      console.error('[WebhookRoutes] Error getting endpoint:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get webhook endpoint',
      });
    }
  });

  /**
   * PATCH /webhooks/endpoints/:id
   * Update a webhook endpoint
   */
  router.patch('/endpoints/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { url, events, enabled, description, headers, metadata } = req.body;

      const endpoint = await service.updateEndpoint(id, {
        url,
        events,
        enabled,
        description,
        headers,
        metadata,
      });

      res.json({
        success: true,
        data: endpoint,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Webhook endpoint not found',
        });
      }

      console.error('[WebhookRoutes] Error updating endpoint:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to update webhook endpoint',
      });
    }
  });

  /**
   * DELETE /webhooks/endpoints/:id
   * Delete a webhook endpoint
   */
  router.delete('/endpoints/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await service.deleteEndpoint(id);

      res.json({
        success: true,
        message: 'Webhook endpoint deleted',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Webhook endpoint not found',
        });
      }

      console.error('[WebhookRoutes] Error deleting endpoint:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete webhook endpoint',
      });
    }
  });

  /**
   * POST /webhooks/endpoints/:id/rotate-secret
   * Rotate webhook endpoint secret
   */
  router.post('/endpoints/:id/rotate-secret', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const endpoint = await service.rotateSecret(id);

      res.json({
        success: true,
        data: endpoint,
        message: 'Secret rotated successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Webhook endpoint not found',
        });
      }

      console.error('[WebhookRoutes] Error rotating secret:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to rotate webhook secret',
      });
    }
  });

  // Event Publishing

  /**
   * POST /webhooks/events
   * Publish a webhook event
   */
  router.post('/events', async (req: Request, res: Response) => {
    try {
      const { type, payload, endpoints } = req.body;

      if (!type || !payload) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'type and payload are required',
        });
      }

      const event = await service.publishEvent(type as WebhookEventType, payload, endpoints);

      res.status(201).json({
        success: true,
        data: event,
        message: 'Event published successfully',
      });
    } catch (error) {
      console.error('[WebhookRoutes] Error publishing event:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to publish webhook event',
      });
    }
  });

  // Delivery Management

  /**
   * GET /webhooks/deliveries
   * List webhook deliveries with optional filters
   */
  router.get('/deliveries', async (req: Request, res: Response) => {
    try {
      const { endpointId, eventType, status, startDate, endDate, limit, offset } = req.query;

      const deliveries = await service.listDeliveries({
        endpointId: endpointId as string,
        eventType: eventType as WebhookEventType,
        status: status as 'pending' | 'success' | 'failed' | 'retrying',
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      res.json({
        success: true,
        data: deliveries,
        count: deliveries.length,
      });
    } catch (error) {
      console.error('[WebhookRoutes] Error listing deliveries:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to list webhook deliveries',
      });
    }
  });

  /**
   * GET /webhooks/deliveries/:id
   * Get a specific webhook delivery
   */
  router.get('/deliveries/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const delivery = await service.getDelivery(id);

      res.json({
        success: true,
        data: delivery,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Webhook delivery not found',
        });
      }

      console.error('[WebhookRoutes] Error getting delivery:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get webhook delivery',
      });
    }
  });

  /**
   * GET /webhooks/deliveries/:id/attempts
   * Get delivery attempts for a specific delivery
   */
  router.get('/deliveries/:id/attempts', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const attempts = await service.getDeliveryAttempts(id);

      res.json({
        success: true,
        data: attempts,
        count: attempts.length,
      });
    } catch (error) {
      console.error('[WebhookRoutes] Error getting delivery attempts:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get delivery attempts',
      });
    }
  });

  /**
   * POST /webhooks/deliveries/:id/retry
   * Manually retry a failed delivery
   */
  router.post('/deliveries/:id/retry', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await service.retryDelivery(id);

      res.json({
        success: true,
        message: 'Delivery retry initiated',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Webhook delivery not found',
        });
      }

      if (error instanceof Error && error.message.includes('Cannot retry')) {
        return res.status(400).json({
          error: 'Bad Request',
          message: error.message,
        });
      }

      console.error('[WebhookRoutes] Error retrying delivery:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retry webhook delivery',
      });
    }
  });

  // Statistics

  /**
   * GET /webhooks/stats
   * Get webhook statistics
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const { endpointId } = req.query;
      const stats = await service.getStats(endpointId as string);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('[WebhookRoutes] Error getting stats:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get webhook statistics',
      });
    }
  });

  /**
   * POST /webhooks/cleanup
   * Cleanup old webhook data
   */
  router.post('/cleanup', async (req: Request, res: Response) => {
    try {
      const { olderThanDays = 30 } = req.body;
      const cleaned = await service.cleanup(olderThanDays);

      res.json({
        success: true,
        message: `Cleaned up ${cleaned} old records`,
        cleaned,
      });
    } catch (error) {
      console.error('[WebhookRoutes] Error cleaning up:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to cleanup webhook data',
      });
    }
  });

  return router;
}
