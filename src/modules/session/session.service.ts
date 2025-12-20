/**
 * Session Service
 * Redis-based session management with optional Prisma persistence
 */
import { randomUUID } from 'crypto';
import type { Redis } from 'ioredis';
import { getRedis } from '../../database/redis.js';
import { prisma } from '../../database/prisma.js';
import { logger } from '../../core/logger.js';
import type { Session, CreateSessionData, SessionConfig, SessionStats } from './types.js';
import { SessionRepository } from './session.repository.js';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_PREFIX = 'session:';

export class SessionService {
  private redis: Redis;
  private repository: SessionRepository;
  private config: Required<SessionConfig>;

  constructor(config: SessionConfig = {}) {
    this.redis = getRedis();
    this.repository = new SessionRepository(prisma);
    this.config = {
      ttlMs: config.ttlMs ?? DEFAULT_TTL_MS,
      prefix: config.prefix ?? DEFAULT_PREFIX,
      persistToDb: config.persistToDb ?? false,
      slidingExpiration: config.slidingExpiration ?? true,
    };

    logger.info({ config: this.config }, 'Session service initialized');
  }

  /**
   * Create a new session
   */
  async create(data: CreateSessionData): Promise<Session> {
    const id = randomUUID();
    const now = new Date();
    const ttlMs = data.expiresInMs ?? this.config.ttlMs;
    const expiresAt = new Date(now.getTime() + ttlMs);

    const session: Session = {
      id,
      userId: data.userId,
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
      data: data.data,
      expiresAt,
      createdAt: now,
      lastAccessedAt: now,
    };

    // Store in Redis
    const redisKey = this.buildKey(id);
    const ttlSeconds = Math.ceil(ttlMs / 1000);
    await this.redis.setex(redisKey, ttlSeconds, JSON.stringify(session));

    // Optionally persist to database
    if (this.config.persistToDb) {
      await this.repository.create({
        id,
        userId: data.userId,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        expiresAt,
      });
    }

    logger.debug({ sessionId: id, userId: data.userId }, 'Session created');
    return session;
  }

  /**
   * Get session by ID
   */
  async get(sessionId: string): Promise<Session | null> {
    const redisKey = this.buildKey(sessionId);
    const data = await this.redis.get(redisKey);

    if (!data) {
      // Try database fallback if persistence is enabled
      if (this.config.persistToDb) {
        const dbSession = await this.repository.findById(sessionId);
        if (dbSession) {
          // Restore to Redis
          const ttlMs = dbSession.expiresAt.getTime() - Date.now();
          if (ttlMs > 0) {
            await this.redis.setex(redisKey, Math.ceil(ttlMs / 1000), JSON.stringify(dbSession));
            return dbSession;
          }
        }
      }
      return null;
    }

    const session = JSON.parse(data) as Session;

    // Check if expired
    if (new Date(session.expiresAt) < new Date()) {
      await this.destroy(sessionId);
      return null;
    }

    // Sliding expiration: refresh TTL on access
    if (this.config.slidingExpiration) {
      await this.touch(sessionId);
    }

    return session;
  }

  /**
   * Validate session and return user ID
   */
  async validate(sessionId: string): Promise<string | null> {
    const session = await this.get(sessionId);
    return session?.userId ?? null;
  }

  /**
   * Update session data
   */
  async update(sessionId: string, data: Partial<Session['data']>): Promise<Session | null> {
    const session = await this.get(sessionId);
    if (!session) return null;

    session.data = { ...session.data, ...data };
    session.lastAccessedAt = new Date();

    const redisKey = this.buildKey(sessionId);
    const ttlMs = session.expiresAt.getTime() - Date.now();

    if (ttlMs > 0) {
      await this.redis.setex(redisKey, Math.ceil(ttlMs / 1000), JSON.stringify(session));
    }

    return session;
  }

  /**
   * Touch session (refresh TTL)
   */
  async touch(sessionId: string): Promise<boolean> {
    const session = await this.getWithoutTouch(sessionId);
    if (!session) return false;

    const now = new Date();
    session.lastAccessedAt = now;
    session.expiresAt = new Date(now.getTime() + this.config.ttlMs);

    const redisKey = this.buildKey(sessionId);
    const ttlSeconds = Math.ceil(this.config.ttlMs / 1000);
    await this.redis.setex(redisKey, ttlSeconds, JSON.stringify(session));

    // Update database if persistence is enabled
    if (this.config.persistToDb) {
      await this.repository.updateExpiration(sessionId, session.expiresAt);
    }

    return true;
  }

  /**
   * Destroy session
   */
  async destroy(sessionId: string): Promise<boolean> {
    const redisKey = this.buildKey(sessionId);
    const deleted = await this.redis.del(redisKey);

    // Delete from database if persistence is enabled
    if (this.config.persistToDb) {
      await this.repository.delete(sessionId);
    }

    if (deleted > 0) {
      logger.debug({ sessionId }, 'Session destroyed');
    }

    return deleted > 0;
  }

  /**
   * Destroy all sessions for a user
   */
  async destroyUserSessions(userId: string): Promise<number> {
    // Get all sessions for user from database
    const sessions = await this.repository.findByUserId(userId);
    let count = 0;

    // Delete from Redis
    for (const session of sessions) {
      const redisKey = this.buildKey(session.id);
      const deleted = await this.redis.del(redisKey);
      if (deleted > 0) count++;
    }

    // Delete from database
    if (this.config.persistToDb) {
      await this.repository.deleteByUserId(userId);
    }

    // Also scan Redis for any sessions not in database
    const pattern = `${this.config.prefix}*`;
    const keys = await this.redis.keys(pattern);
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const session = JSON.parse(data) as Session;
        if (session.userId === userId) {
          await this.redis.del(key);
          count++;
        }
      }
    }

    logger.info({ userId, count }, 'User sessions destroyed');
    return count;
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    const sessions: Session[] = [];

    // Scan Redis for user sessions
    const pattern = `${this.config.prefix}*`;
    const keys = await this.redis.keys(pattern);

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const session = JSON.parse(data) as Session;
        if (session.userId === userId && new Date(session.expiresAt) > new Date()) {
          sessions.push(session);
        }
      }
    }

    return sessions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get session stats
   */
  async getStats(): Promise<SessionStats> {
    const pattern = `${this.config.prefix}*`;
    const keys = await this.redis.keys(pattern);
    const userSessions = new Map<string, number>();
    let activeSessions = 0;

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const session = JSON.parse(data) as Session;
        if (new Date(session.expiresAt) > new Date()) {
          activeSessions++;
          const count = userSessions.get(session.userId) || 0;
          userSessions.set(session.userId, count + 1);
        }
      }
    }

    return { activeSessions, userSessions };
  }

  /**
   * Cleanup expired sessions
   */
  async cleanup(): Promise<number> {
    let count = 0;

    // Redis handles TTL automatically, but clean database
    if (this.config.persistToDb) {
      count = await this.repository.deleteExpired();
      if (count > 0) {
        logger.info({ count }, 'Cleaned up expired sessions from database');
      }
    }

    return count;
  }

  /**
   * Clear all sessions (for testing)
   */
  async clear(): Promise<void> {
    const pattern = `${this.config.prefix}*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    if (this.config.persistToDb) {
      await this.repository.clear();
    }
  }

  /**
   * Build Redis key for session
   */
  private buildKey(sessionId: string): string {
    return `${this.config.prefix}${sessionId}`;
  }

  /**
   * Get session without triggering sliding expiration
   */
  private async getWithoutTouch(sessionId: string): Promise<Session | null> {
    const redisKey = this.buildKey(sessionId);
    const data = await this.redis.get(redisKey);

    if (!data) return null;

    const session = JSON.parse(data) as Session;

    if (new Date(session.expiresAt) < new Date()) {
      return null;
    }

    return session;
  }
}

let sessionService: SessionService | null = null;

export function getSessionService(): SessionService {
  if (!sessionService) {
    sessionService = new SessionService();
  }
  return sessionService;
}

export function createSessionService(config?: SessionConfig): SessionService {
  sessionService = new SessionService(config);
  return sessionService;
}
