/**
 * Session Types
 */

export interface Session {
  id: string;
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  data?: Record<string, unknown>;
  expiresAt: Date;
  createdAt: Date;
  lastAccessedAt?: Date;
}

export interface CreateSessionData {
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  data?: Record<string, unknown>;
  expiresInMs?: number;
}

export interface SessionConfig {
  /** Session TTL in milliseconds (default: 24 hours) */
  ttlMs?: number;
  /** Redis key prefix (default: 'session:') */
  prefix?: string;
  /** Whether to persist sessions to database (default: false) */
  persistToDb?: boolean;
  /** Sliding expiration - refresh TTL on access (default: true) */
  slidingExpiration?: boolean;
}

export interface SessionStats {
  activeSessions: number;
  userSessions: Map<string, number>;
}
