import type { Response } from 'express';
import { Router, type Request } from 'express';
import type { RateLimitService } from './rate-limit.service.js';

/**
 * Create admin routes for rate limit management
 * These routes should be protected with authentication/authorization middleware
 */
export function createRateLimitRoutes(service: RateLimitService): Router {
  const router = Router();

  /**
   * GET /rate-limit/info/:key
   * Get rate limit info for a specific key
   */
  router.get('/info/:key', async (req: Request, res: Response): Promise<void> => {
    try {
      const key = req.params.key;
      if (!key) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Key is required',
        });
        return;
      }
      const info = await service.getInfo(key);

      if (!info) {
        res.status(404).json({
          error: 'Not Found',
          message: 'No rate limit data found for this key',
        });
        return;
      }

      res.json({
        success: true,
        data: info,
      });
    } catch (error) {
      console.error('[RateLimitRoutes] Error getting info:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get rate limit info',
      });
    }
  });

  /**
   * POST /rate-limit/reset/:key
   * Reset rate limit for a specific key
   */
  router.post('/reset/:key', async (req: Request, res: Response): Promise<void> => {
    try {
      const key = req.params.key;
      if (!key) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Key is required',
        });
        return;
      }
      await service.reset(key);

      res.json({
        success: true,
        message: `Rate limit reset for key: ${key}`,
      });
    } catch (error) {
      console.error('[RateLimitRoutes] Error resetting:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to reset rate limit',
      });
    }
  });

  /**
   * GET /rate-limit/config
   * Get current rate limit configuration
   */
  router.get('/config', async (req: Request, res: Response) => {
    try {
      const config = service.getConfig();

      res.json({
        success: true,
        data: {
          max: config.max,
          windowMs: config.windowMs,
          algorithm: config.algorithm,
          whitelistCount: config.whitelist?.length || 0,
          blacklistCount: config.blacklist?.length || 0,
          customLimitsCount: Object.keys(config.customLimits || {}).length,
        },
      });
    } catch (error) {
      console.error('[RateLimitRoutes] Error getting config:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get configuration',
      });
    }
  });

  /**
   * POST /rate-limit/whitelist
   * Add IP to whitelist
   */
  router.post('/whitelist', async (req: Request, res: Response): Promise<void> => {
    try {
      const { ip } = req.body as { ip?: string };

      if (!ip) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'IP address is required',
        });
        return;
      }

      service.addToWhitelist(ip);

      res.json({
        success: true,
        message: `IP ${ip} added to whitelist`,
      });
    } catch (error) {
      console.error('[RateLimitRoutes] Error adding to whitelist:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to add IP to whitelist',
      });
    }
  });

  /**
   * DELETE /rate-limit/whitelist/:ip
   * Remove IP from whitelist
   */
  router.delete('/whitelist/:ip', async (req: Request, res: Response): Promise<void> => {
    try {
      const ip = req.params.ip;
      if (!ip) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'IP is required',
        });
        return;
      }
      service.removeFromWhitelist(ip);

      res.json({
        success: true,
        message: `IP ${ip} removed from whitelist`,
      });
    } catch (error) {
      console.error('[RateLimitRoutes] Error removing from whitelist:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to remove IP from whitelist',
      });
    }
  });

  /**
   * POST /rate-limit/blacklist
   * Add IP to blacklist
   */
  router.post('/blacklist', async (req: Request, res: Response): Promise<void> => {
    try {
      const { ip } = req.body as { ip?: string };

      if (!ip) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'IP address is required',
        });
        return;
      }

      service.addToBlacklist(ip);

      res.json({
        success: true,
        message: `IP ${ip} added to blacklist`,
      });
    } catch (error) {
      console.error('[RateLimitRoutes] Error adding to blacklist:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to add IP to blacklist',
      });
    }
  });

  /**
   * DELETE /rate-limit/blacklist/:ip
   * Remove IP from blacklist
   */
  router.delete('/blacklist/:ip', async (req: Request, res: Response): Promise<void> => {
    try {
      const ip = req.params.ip;
      if (!ip) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'IP is required',
        });
        return;
      }
      service.removeFromBlacklist(ip);

      res.json({
        success: true,
        message: `IP ${ip} removed from blacklist`,
      });
    } catch (error) {
      console.error('[RateLimitRoutes] Error removing from blacklist:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to remove IP from blacklist',
      });
    }
  });

  /**
   * POST /rate-limit/clear
   * Clear all rate limit data
   */
  router.post('/clear', async (req: Request, res: Response) => {
    try {
      await service.clear();

      res.json({
        success: true,
        message: 'All rate limit data cleared',
      });
    } catch (error) {
      console.error('[RateLimitRoutes] Error clearing data:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to clear rate limit data',
      });
    }
  });

  /**
   * POST /rate-limit/cleanup
   * Cleanup expired entries
   */
  router.post('/cleanup', async (req: Request, res: Response) => {
    try {
      await service.cleanup();

      res.json({
        success: true,
        message: 'Expired entries cleaned up',
      });
    } catch (error) {
      console.error('[RateLimitRoutes] Error cleaning up:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to cleanup expired entries',
      });
    }
  });

  return router;
}
