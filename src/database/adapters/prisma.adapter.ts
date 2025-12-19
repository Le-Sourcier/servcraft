/**
 * Prisma Database Adapter
 * Implements IDatabaseAdapter for Prisma ORM
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../core/logger.js';
import type { IDatabaseAdapter, DatabaseConfig } from '../interfaces/index.js';

export class PrismaAdapter implements IDatabaseAdapter {
  private client: PrismaClient | null = null;
  private config: DatabaseConfig;
  private connected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Connect to database using Prisma
   */
  async connect(): Promise<void> {
    if (this.connected && this.client) {
      logger.warn('Prisma client already connected');
      return;
    }

    try {
      this.client = new PrismaClient({
        datasources: {
          db: {
            url: this.config.url,
          },
        },
        log: this.config.logging ? ['query', 'info', 'warn', 'error'] : ['error'],
      });

      await this.client.$connect();
      this.connected = true;

      logger.info({ database: this.config.database }, 'Prisma connected successfully');
    } catch (error) {
      logger.error({ err: error }, 'Failed to connect Prisma');
      throw new Error(
        `Prisma connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.$disconnect();
      this.client = null;
      this.connected = false;

      logger.info('Prisma disconnected');
    } catch (error) {
      logger.error({ err: error }, 'Error disconnecting Prisma');
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client || !this.connected) {
      return false;
    }

    try {
      // Try a simple query
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get ORM type
   */
  getType(): 'prisma' {
    return 'prisma';
  }

  /**
   * Get database type
   */
  getDatabaseType(): DatabaseConfig['database'] {
    return this.config.database;
  }

  /**
   * Get raw Prisma client
   * Use with caution - breaks abstraction
   */
  getRawClient(): PrismaClient {
    if (!this.client) {
      throw new Error('Prisma client not initialized. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Get Prisma client (typed helper)
   */
  getClient(): PrismaClient {
    return this.getRawClient();
  }
}
