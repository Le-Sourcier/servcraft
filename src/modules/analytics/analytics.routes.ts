import { Router } from 'express';
import type { Request, Response } from 'express';
import type { AnalyticsService } from './analytics.service.js';
import type { AnalyticsEvent, MetricQuery } from './types.js';

/**
 * Create analytics routes
 */
export function createAnalyticsRoutes(analyticsService: AnalyticsService): Router {
  const router = Router();

  /**
   * Track event
   * POST /events
   */
  router.post('/events', (req: Request, res: Response) => {
    const event = req.body as Omit<AnalyticsEvent, 'timestamp'>;
    analyticsService.trackEvent(event);
    res.json({ success: true });
  });

  /**
   * Get events
   * GET /events?limit=100
   */
  router.get('/events', (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const events = analyticsService.getEvents(limit);
    res.json({ events, count: events.length });
  });

  /**
   * Get counters
   * GET /metrics/counters
   */
  router.get('/metrics/counters', (_req: Request, res: Response) => {
    const counters = analyticsService.getCounters();
    res.json({ counters, count: counters.length });
  });

  /**
   * Get gauges
   * GET /metrics/gauges
   */
  router.get('/metrics/gauges', (_req: Request, res: Response) => {
    const gauges = analyticsService.getGauges();
    res.json({ gauges, count: gauges.length });
  });

  /**
   * Query metrics
   * POST /metrics/query
   */
  router.post('/metrics/query', async (req: Request, res: Response) => {
    const query = req.body as MetricQuery;
    const result = await analyticsService.queryMetrics(query);
    res.json(result);
  });

  /**
   * Prometheus metrics endpoint
   * GET /metrics
   */
  router.get('/metrics', (_req: Request, res: Response) => {
    const metrics = analyticsService.getPrometheusMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  });

  /**
   * Clear all metrics
   * POST /clear
   */
  router.post('/clear', (_req: Request, res: Response) => {
    analyticsService.clear();
    res.json({ success: true, message: 'All metrics cleared' });
  });

  return router;
}
