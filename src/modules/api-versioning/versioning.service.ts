import { logger } from '../../core/logger.js';
import type {
  VersioningConfig,
  ApiVersion,
  VersionDetectionResult,
  VersionStrategy,
  VersionMigration,
} from './types.js';

/**
 * API Versioning Service
 * Multiple API versions support
 */
export class VersioningService {
  private config: VersioningConfig;
  private migrations = new Map<string, VersionMigration>();

  constructor(config: VersioningConfig) {
    this.config = {
      headerName: 'X-API-Version',
      queryParam: 'version',
      strict: true,
      deprecationWarnings: true,
      ...config,
    };

    logger.info(
      {
        strategy: this.config.strategy,
        defaultVersion: this.config.defaultVersion,
        versions: this.config.versions.map((v) => v.version),
      },
      'API versioning service initialized'
    );
  }

  /**
   * Detect version from request
   */
  detectVersion(req: {
    url?: string;
    headers?: Record<string, string | string[] | undefined>;
    query?: Record<string, string | string[] | undefined>;
  }): VersionDetectionResult {
    let version: string | null = null;
    let source: VersionStrategy = this.config.strategy;

    // Try to detect based on strategy
    switch (this.config.strategy) {
      case 'url':
        version = this.detectFromUrl(req.url || '');
        source = 'url';
        break;

      case 'header':
        version = this.detectFromHeader(req.headers || {});
        source = 'header';
        break;

      case 'query':
        version = this.detectFromQuery(req.query || {});
        source = 'query';
        break;

      case 'accept-header':
        version = this.detectFromAcceptHeader(req.headers || {});
        source = 'accept-header';
        break;
    }

    // Fallback to default version
    if (!version) {
      version = this.config.defaultVersion;
      source = this.config.strategy;
    }

    // Validate version
    const isValid = this.isVersionValid(version);
    const versionInfo = this.getVersion(version);

    let warning: string | undefined;
    if (versionInfo?.status === 'deprecated' && this.config.deprecationWarnings) {
      warning = `API version ${version} is deprecated`;
      if (versionInfo.sunsetAt) {
        warning += ` and will be removed on ${versionInfo.sunsetAt.toISOString().split('T')[0]}`;
      }
    }

    return {
      version,
      source,
      isValid,
      warning,
    };
  }

  /**
   * Get version info
   */
  getVersion(version: string): ApiVersion | undefined {
    return this.config.versions.find((v) => v.version === version);
  }

  /**
   * Get all versions
   */
  getAllVersions(): ApiVersion[] {
    return this.config.versions;
  }

  /**
   * Get active versions
   */
  getActiveVersions(): ApiVersion[] {
    return this.config.versions.filter((v) => v.status === 'active');
  }

  /**
   * Check if version is valid
   */
  isVersionValid(version: string): boolean {
    return this.config.versions.some((v) => v.version === version);
  }

  /**
   * Add version migration
   */
  addMigration(migration: VersionMigration): void {
    const key = `${migration.from}-${migration.to}`;
    this.migrations.set(key, migration);
    logger.info({ from: migration.from, to: migration.to }, 'Migration added');
  }

  /**
   * Get migration
   */
  getMigration(from: string, to: string): VersionMigration | undefined {
    return this.migrations.get(`${from}-${to}`);
  }

  /**
   * Compare versions
   */
  compareVersions(v1: string, v2: string): number {
    const num1 = parseInt(v1.replace(/\D/g, ''), 10);
    const num2 = parseInt(v2.replace(/\D/g, ''), 10);
    return num1 - num2;
  }

  /**
   * Detect version from URL path
   */
  private detectFromUrl(url: string): string | null {
    const match = url.match(/\/(v\d+)\//);
    return match?.[1] ?? null;
  }

  /**
   * Detect version from header
   */
  private detectFromHeader(headers: Record<string, string | string[] | undefined>): string | null {
    const headerValue = headers[this.config.headerName?.toLowerCase() || 'x-api-version'];
    return Array.isArray(headerValue) ? (headerValue[0] ?? null) : (headerValue ?? null);
  }

  /**
   * Detect version from query parameter
   */
  private detectFromQuery(query: Record<string, string | string[] | undefined>): string | null {
    const queryValue = query[this.config.queryParam || 'version'];
    return Array.isArray(queryValue) ? (queryValue[0] ?? null) : (queryValue ?? null);
  }

  /**
   * Detect version from Accept header
   */
  private detectFromAcceptHeader(
    headers: Record<string, string | string[] | undefined>
  ): string | null {
    const accept = headers['accept'];
    const acceptStr = Array.isArray(accept) ? accept[0] : accept;

    if (!acceptStr) return null;

    // Look for version in Accept header like: application/vnd.myapp.v2+json
    const match = acceptStr.match(/\.v(\d+)\+/);
    return match ? `v${match[1]}` : null;
  }
}
