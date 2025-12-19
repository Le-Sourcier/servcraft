import { Router } from 'express';
import type { Request, Response } from 'express';
import type { VersioningService } from './versioning.service.js';

/**
 * Create versioning routes
 */
export function createVersioningRoutes(versioningService: VersioningService): Router {
  const router = Router();

  /**
   * Get all API versions
   * GET /versions
   */
  router.get('/versions', (_req: Request, res: Response) => {
    const versions = versioningService.getAllVersions();
    res.json({
      versions,
      default: versioningService.getAllVersions().find((v) => v.isDefault)?.version,
    });
  });

  /**
   * Get active versions
   * GET /versions/active
   */
  router.get('/versions/active', (_req: Request, res: Response) => {
    const versions = versioningService.getActiveVersions();
    res.json({ versions, count: versions.length });
  });

  /**
   * Get specific version info
   * GET /versions/:version
   */
  router.get('/versions/:version', (req: Request, res: Response) => {
    const versionParam = req.params.version;
    if (!versionParam) {
      res.status(400).json({ error: 'Version parameter required' });
      return;
    }

    const version = versioningService.getVersion(versionParam);

    if (!version) {
      res.status(404).json({ error: 'Version not found' });
      return;
    }

    res.json(version);
  });

  return router;
}
