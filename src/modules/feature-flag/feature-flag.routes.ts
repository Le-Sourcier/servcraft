import { Router } from 'express';
import type { Request, Response } from 'express';
import type { FeatureFlagService } from './feature-flag.service.js';
import type { FeatureFlag, FlagEvaluationContext, FlagListFilters } from './types.js';

/**
 * Create feature flag routes
 */
export function createFeatureFlagRoutes(flagService: FeatureFlagService): Router {
  const router = Router();

  /**
   * Create a feature flag
   * POST /flags
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const flag = await flagService.createFlag(
        req.body as Omit<FeatureFlag, 'createdAt' | 'updatedAt'>
      );
      res.status(201).json(flag);
    } catch (error) {
      res
        .status(400)
        .json({ error: error instanceof Error ? error.message : 'Failed to create flag' });
    }
  });

  /**
   * List feature flags
   * GET /flags?status=enabled&environment=production&tags=premium&search=dark
   */
  router.get('/', async (req: Request, res: Response) => {
    const filters: FlagListFilters = {
      status: req.query.status as FlagListFilters['status'],
      environment: req.query.environment as FlagListFilters['environment'],
      tags: req.query.tags ? String(req.query.tags).split(',') : undefined,
      search: req.query.search as string,
    };

    const flags = await flagService.listFlags(filters);
    res.json({ flags, count: flags.length });
  });

  /**
   * Get a feature flag
   * GET /flags/:key
   */
  router.get('/:key', async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      if (!key) {
        res.status(400).json({ error: 'Key parameter required' });
        return;
      }
      const flag = await flagService.getFlag(key);
      res.json(flag);
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Flag not found' });
    }
  });

  /**
   * Update a feature flag
   * PATCH /flags/:key
   */
  router.patch('/:key', async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      if (!key) {
        res.status(400).json({ error: 'Key parameter required' });
        return;
      }
      const flag = await flagService.updateFlag(key, req.body);
      res.json(flag);
    } catch (error) {
      res
        .status(400)
        .json({ error: error instanceof Error ? error.message : 'Failed to update flag' });
    }
  });

  /**
   * Delete a feature flag
   * DELETE /flags/:key
   */
  router.delete('/:key', async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      if (!key) {
        res.status(400).json({ error: 'Key parameter required' });
        return;
      }
      await flagService.deleteFlag(key);
      res.json({ success: true, message: 'Flag deleted' });
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Flag not found' });
    }
  });

  /**
   * Evaluate a feature flag
   * POST /flags/:key/evaluate
   * Body: { userId, userAttributes, environment, sessionId }
   */
  router.post('/:key/evaluate', async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      if (!key) {
        res.status(400).json({ error: 'Key parameter required' });
        return;
      }
      const context: FlagEvaluationContext = req.body;
      const result = await flagService.evaluateFlag(key, context);
      res.json(result);
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Flag not found' });
    }
  });

  /**
   * Evaluate multiple flags
   * POST /flags/evaluate
   * Body: { keys: ['flag1', 'flag2'], context: { userId, ... } }
   */
  router.post('/evaluate', async (req: Request, res: Response) => {
    const { keys, context } = req.body as { keys: string[]; context: FlagEvaluationContext };

    if (!keys || !Array.isArray(keys)) {
      res.status(400).json({ error: 'keys array is required' });
      return;
    }

    const results = await flagService.evaluateFlags(keys, context || {});
    res.json(results);
  });

  /**
   * Check if flag is enabled (simplified)
   * POST /flags/:key/enabled
   * Body: { userId, userAttributes }
   */
  router.post('/:key/enabled', async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      if (!key) {
        res.status(400).json({ error: 'Key parameter required' });
        return;
      }
      const context: FlagEvaluationContext = req.body;
      const enabled = await flagService.isEnabled(key, context);
      res.json({ enabled });
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Flag not found' });
    }
  });

  /**
   * Set override for user/session
   * POST /flags/:key/override
   * Body: { targetId, targetType, enabled, expiresAt }
   */
  router.post('/:key/override', async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      if (!key) {
        res.status(400).json({ error: 'Key parameter required' });
        return;
      }
      const { targetId, targetType, enabled, expiresAt } = req.body as {
        targetId: string;
        targetType: 'user' | 'session';
        enabled: boolean;
        expiresAt?: string;
      };

      if (!targetId || !targetType) {
        res.status(400).json({ error: 'targetId and targetType are required' });
        return;
      }

      await flagService.setOverride(
        key,
        targetId,
        targetType,
        enabled,
        expiresAt ? new Date(expiresAt) : undefined
      );

      res.json({ success: true, message: 'Override set' });
    } catch (error) {
      res
        .status(400)
        .json({ error: error instanceof Error ? error.message : 'Failed to set override' });
    }
  });

  /**
   * Remove override
   * DELETE /flags/:key/override/:targetId
   */
  router.delete('/:key/override/:targetId', async (req: Request, res: Response) => {
    const key = req.params.key;
    const targetId = req.params.targetId;
    if (!key || !targetId) {
      res.status(400).json({ error: 'Key and targetId parameters required' });
      return;
    }
    await flagService.removeOverride(key, targetId);
    res.json({ success: true, message: 'Override removed' });
  });

  /**
   * Get flag statistics
   * GET /flags/:key/stats
   */
  router.get('/:key/stats', async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      if (!key) {
        res.status(400).json({ error: 'Key parameter required' });
        return;
      }
      const stats = await flagService.getStats(key);
      res.json(stats);
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Stats not found' });
    }
  });

  /**
   * Get flag events
   * GET /flags/:key/events?limit=100
   */
  router.get('/:key/events', async (req: Request, res: Response) => {
    const key = req.params.key;
    if (!key) {
      res.status(400).json({ error: 'Key parameter required' });
      return;
    }
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const events = await flagService.getEvents(key, limit);
    res.json({ events, count: events.length });
  });

  return router;
}
