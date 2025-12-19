import type { Request, Response, NextFunction } from 'express';
import type { VersioningService } from './versioning.service.js';
import type { VersionMiddlewareOptions } from './types.js';

/**
 * Request with version info
 */
export interface VersionedRequest extends Request {
  apiVersion?: string;
  versionInfo?: {
    version: string;
    source: string;
    isValid: boolean;
    warning?: string;
  };
}

/**
 * Create versioning middleware
 */
export function createVersioningMiddleware(
  versioningService: VersioningService,
  options: VersionMiddlewareOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const versionedReq = req as VersionedRequest;

    // Detect version
    const detection = versioningService.detectVersion({
      url: req.url,
      headers: req.headers as Record<string, string | string[] | undefined>,
      query: req.query as Record<string, string | string[] | undefined>,
    });

    versionedReq.apiVersion = detection.version;
    versionedReq.versionInfo = detection;

    // Set response headers
    res.setHeader('X-API-Version', detection.version);

    if (detection.warning) {
      res.setHeader('X-API-Deprecation-Warning', detection.warning);
    }

    // Validation
    if (!detection.isValid) {
      res.status(400).json({
        error: 'Invalid API version',
        version: detection.version,
        availableVersions: versioningService.getActiveVersions().map((v) => v.version),
      });
      return;
    }

    // Check version requirements
    if (options.requiredVersion && detection.version !== options.requiredVersion) {
      res.status(400).json({
        error: `This endpoint requires API version ${options.requiredVersion}`,
        currentVersion: detection.version,
      });
      return;
    }

    if (options.minVersion) {
      if (versioningService.compareVersions(detection.version, options.minVersion) < 0) {
        res.status(400).json({
          error: `This endpoint requires at least API version ${options.minVersion}`,
          currentVersion: detection.version,
        });
        return;
      }
    }

    if (options.maxVersion) {
      if (versioningService.compareVersions(detection.version, options.maxVersion) > 0) {
        res.status(400).json({
          error: `This endpoint supports up to API version ${options.maxVersion}`,
          currentVersion: detection.version,
        });
        return;
      }
    }

    // Check if deprecated versions are allowed
    const versionInfo = versioningService.getVersion(detection.version);
    if (versionInfo?.status === 'deprecated' && options.allowDeprecated === false) {
      res.status(410).json({
        error: `API version ${detection.version} is deprecated and no longer supported`,
        sunsetAt: versionInfo.sunsetAt,
        migrateToVersion: versioningService.getActiveVersions()[0]?.version,
      });
      return;
    }

    next();
  };
}

/**
 * Version-specific route handler
 */
export function versionedRoute(
  versions: Record<string, (req: Request, res: Response) => void | Promise<void>>
): (req: Request, res: Response) => void | Promise<void> {
  return (req: Request, res: Response): void | Promise<void> => {
    const versionedReq = req as VersionedRequest;
    const version = versionedReq.apiVersion || 'v1';

    const handler = versions[version];

    if (!handler) {
      res.status(404).json({
        error: `Endpoint not available in version ${version}`,
      });
      return;
    }

    return handler(req, res);
  };
}
