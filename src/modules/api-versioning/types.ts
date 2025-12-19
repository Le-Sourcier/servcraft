export type VersionStrategy = 'url' | 'header' | 'query' | 'accept-header';
export type DeprecationStatus = 'active' | 'deprecated' | 'sunset';

export interface ApiVersion {
  /** Version identifier (e.g., 'v1', 'v2') */
  version: string;
  /** Version status */
  status: DeprecationStatus;
  /** Release date */
  releasedAt: Date;
  /** Deprecation date */
  deprecatedAt?: Date;
  /** Sunset date (when it will be removed) */
  sunsetAt?: Date;
  /** Supported until date */
  supportedUntil?: Date;
  /** Is this the default version */
  isDefault: boolean;
  /** Changelog */
  changelog?: string;
}

export interface VersioningConfig {
  /** Versioning strategy */
  strategy: VersionStrategy;
  /** Default version */
  defaultVersion: string;
  /** Available versions */
  versions: ApiVersion[];
  /** Version header name */
  headerName?: string;
  /** Query parameter name */
  queryParam?: string;
  /** Strict mode (reject unknown versions) */
  strict?: boolean;
  /** Show deprecation warnings */
  deprecationWarnings?: boolean;
}

export interface VersionedRoute {
  /** Route path */
  path: string;
  /** HTTP method */
  method: string;
  /** Versions where this route exists */
  versions: string[];
  /** Version-specific handlers */
  handlers: Map<string, RouteHandler>;
}

export type RouteHandler = (req: unknown, res: unknown) => Promise<void> | void;

export interface VersionDetectionResult {
  /** Detected version */
  version: string;
  /** Detection source */
  source: VersionStrategy;
  /** Is valid version */
  isValid: boolean;
  /** Warning message */
  warning?: string;
}

export interface VersionMigration {
  /** From version */
  from: string;
  /** To version */
  to: string;
  /** Request transformer */
  transformRequest?: (data: unknown) => unknown;
  /** Response transformer */
  transformResponse?: (data: unknown) => unknown;
  /** Breaking changes description */
  breakingChanges?: string[];
}

export interface VersionMiddlewareOptions {
  /** Required version */
  requiredVersion?: string;
  /** Minimum version */
  minVersion?: string;
  /** Maximum version */
  maxVersion?: string;
  /** Allow deprecated versions */
  allowDeprecated?: boolean;
}
