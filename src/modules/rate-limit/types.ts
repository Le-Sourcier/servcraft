export type RateLimitAlgorithm = 'fixed-window' | 'sliding-window' | 'token-bucket';

export interface RateLimitConfig {
  /** Default requests per window */
  max: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Algorithm to use */
  algorithm?: RateLimitAlgorithm;
  /** Skip rate limiting for these IPs */
  whitelist?: string[];
  /** Always block these IPs */
  blacklist?: string[];
  /** Custom key generator */
  keyGenerator?: (request: RateLimitRequest) => string;
  /** Skip rate limiting based on request */
  skip?: (request: RateLimitRequest) => boolean | Promise<boolean>;
  /** Handler when rate limit is exceeded */
  onLimitReached?: (request: RateLimitRequest, info: RateLimitInfo) => void | Promise<void>;
  /** Store for rate limit data */
  store?: RateLimitStore;
  /** Include headers in response */
  headers?: boolean;
  /** Custom message when rate limited */
  message?: string | ((info: RateLimitInfo) => string);
  /** Status code when rate limited (default: 429) */
  statusCode?: number;
  /** Custom limits per route/IP */
  customLimits?: Record<string, { max: number; windowMs: number }>;
}

export interface RateLimitRule {
  /** Rule identifier */
  id: string;
  /** Route pattern (glob or regex) */
  pattern: string;
  /** HTTP methods (empty = all) */
  methods?: string[];
  /** Max requests */
  max: number;
  /** Time window in ms */
  windowMs: number;
  /** Apply to specific roles only */
  roles?: string[];
  /** Override key generator for this rule */
  keyGenerator?: (request: RateLimitRequest) => string;
  /** Priority (higher = checked first) */
  priority?: number;
  /** Is rule enabled */
  enabled?: boolean;
}

export interface RateLimitRequest {
  ip: string;
  method: string;
  url: string;
  path: string;
  userId?: string;
  userRole?: string;
  headers: Record<string, string | string[] | undefined>;
}

export interface RateLimitInfo {
  /** Total requests allowed */
  limit: number;
  /** Remaining requests in current window */
  remaining: number;
  /** Time when the rate limit resets (Unix timestamp) */
  resetAt?: number;
  /** Time when the rate limit resets (Unix timestamp) - alias */
  resetTime?: number;
  /** Milliseconds until reset */
  retryAfter?: number;
  /** Whether limit is exceeded */
  exceeded?: boolean;
  /** Current request count */
  current?: number;
  /** Request count */
  count?: number;
  /** First request time */
  firstRequest?: number;
  /** Last request time */
  lastRequest?: number;
}

export interface RateLimitEntry {
  /** Request count */
  count: number;
  /** Window start time */
  startTime: number;
  /** For sliding window: request timestamps */
  timestamps?: number[];
  /** For token bucket: available tokens */
  tokens?: number;
  /** Last refill time for token bucket */
  lastRefill?: number;
  /** Reset time */
  resetAt?: number;
  /** Last request time */
  lastRequest?: number;
  /** First request time */
  firstRequest?: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Total requests allowed */
  limit: number;
  /** Remaining requests in current window */
  remaining: number;
  /** Time when the rate limit resets (Unix timestamp) */
  resetAt: number;
  /** Seconds until reset (optional, only when rate limited) */
  retryAfter?: number;
}

export interface RateLimitStore {
  /** Get rate limit entry */
  get(key: string): Promise<RateLimitEntry | null>;
  /** Set rate limit entry */
  set(key: string, entry: RateLimitEntry, ttlMs?: number): Promise<void>;
  /** Increment counter and return new value */
  increment(key: string, windowMs: number): Promise<RateLimitEntry>;
  /** Reset a key */
  reset(key: string): Promise<void>;
  /** Clear all entries */
  clear(): Promise<void>;
  /** Cleanup expired entries (optional) */
  cleanup?(): Promise<void>;
}

export interface BlacklistEntry {
  ip: string;
  reason?: string;
  expiresAt?: Date;
  createdAt: Date;
  createdBy?: string;
}

export interface WhitelistEntry {
  ip: string;
  reason?: string;
  createdAt: Date;
  createdBy?: string;
}

export interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  topIps: Array<{ ip: string; count: number }>;
  topEndpoints: Array<{ endpoint: string; count: number }>;
}
