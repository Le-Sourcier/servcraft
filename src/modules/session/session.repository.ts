/**
 * Session Repository
 * Prisma-based persistence for sessions (optional backup storage)
 */
import type { PrismaClient, Session as PrismaSession } from '@prisma/client';
import type { Session, CreateSessionData } from './types.js';

export class SessionRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new session in database
   */
  async create(data: CreateSessionData & { id: string; expiresAt: Date }): Promise<Session> {
    const session = await this.prisma.session.create({
      data: {
        id: data.id,
        userId: data.userId,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        expiresAt: data.expiresAt,
      },
    });

    return this.mapFromPrisma(session);
  }

  /**
   * Find session by ID
   */
  async findById(id: string): Promise<Session | null> {
    const session = await this.prisma.session.findUnique({
      where: { id },
    });

    if (!session) return null;

    // Check if expired
    if (session.expiresAt < new Date()) {
      await this.delete(id);
      return null;
    }

    return this.mapFromPrisma(session);
  }

  /**
   * Find all sessions for a user
   */
  async findByUserId(userId: string): Promise<Session[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((s) => this.mapFromPrisma(s));
  }

  /**
   * Update session expiration
   */
  async updateExpiration(id: string, expiresAt: Date): Promise<Session | null> {
    try {
      const session = await this.prisma.session.update({
        where: { id },
        data: { expiresAt },
      });

      return this.mapFromPrisma(session);
    } catch {
      return null;
    }
  }

  /**
   * Delete session by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.session.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: { userId },
    });

    return result.count;
  }

  /**
   * Delete expired sessions
   */
  async deleteExpired(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  }

  /**
   * Count active sessions
   */
  async countActive(): Promise<number> {
    return this.prisma.session.count({
      where: {
        expiresAt: { gt: new Date() },
      },
    });
  }

  /**
   * Count sessions per user
   */
  async countByUser(userId: string): Promise<number> {
    return this.prisma.session.count({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /**
   * Clear all sessions (for testing)
   */
  async clear(): Promise<void> {
    await this.prisma.session.deleteMany();
  }

  /**
   * Map Prisma model to domain type
   */
  private mapFromPrisma(session: PrismaSession): Session {
    return {
      id: session.id,
      userId: session.userId,
      userAgent: session.userAgent ?? undefined,
      ipAddress: session.ipAddress ?? undefined,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  }
}
