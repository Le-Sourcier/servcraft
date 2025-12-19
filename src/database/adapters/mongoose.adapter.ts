/**
 * Mongoose Database Adapter
 * Implements IDatabaseAdapter for Mongoose ORM (MongoDB)
 */

import mongoose from 'mongoose';
import { logger } from '../../core/logger.js';
import type { IDatabaseAdapter, DatabaseConfig } from '../interfaces/index.js';
import { getDatabaseUrl } from '../connection.js';

export class MongooseAdapter implements IDatabaseAdapter {
  private connection: typeof mongoose | null = null;
  private config: DatabaseConfig;
  private connected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;

    if (config.database !== 'mongodb') {
      throw new Error('MongooseAdapter only supports MongoDB');
    }
  }

  /**
   * Connect to MongoDB using Mongoose
   */
  async connect(): Promise<void> {
    if (this.connected && this.connection) {
      logger.warn('Mongoose already connected');
      return;
    }

    try {
      const url = this.config.url || getDatabaseUrl(this.config);

      this.connection = await mongoose.connect(url, {
        // Modern Mongoose options
        maxPoolSize: this.config.pool?.max || 10,
        minPoolSize: this.config.pool?.min || 2,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,
      });

      this.connected = true;

      logger.info({ host: this.connection.connection.host }, 'Mongoose connected to MongoDB');
    } catch (error) {
      logger.error({ err: error }, 'Failed to connect Mongoose');
      throw new Error(
        `Mongoose connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (!this.connection) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.connection = null;
      this.connected = false;

      logger.info('Mongoose disconnected from MongoDB');
    } catch (error) {
      logger.error({ err: error }, 'Error disconnecting Mongoose');
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.connection || !this.connected) {
      return false;
    }

    try {
      // Check connection state
      return mongoose.connection.readyState === 1; // 1 = connected
    } catch {
      return false;
    }
  }

  /**
   * Get ORM type
   */
  getType(): 'mongoose' {
    return 'mongoose';
  }

  /**
   * Get database type
   */
  getDatabaseType(): 'mongodb' {
    return 'mongodb';
  }

  /**
   * Get raw Mongoose instance
   * Use with caution - breaks abstraction
   */
  getRawClient(): typeof mongoose {
    if (!this.connection) {
      throw new Error('Mongoose not initialized. Call connect() first.');
    }
    return this.connection;
  }

  /**
   * Get Mongoose instance (typed helper)
   */
  getMongoose(): typeof mongoose {
    return this.getRawClient();
  }

  /**
   * Get native MongoDB connection
   */
  getConnection(): mongoose.Connection {
    if (!this.connection) {
      throw new Error('Mongoose not initialized. Call connect() first.');
    }
    return this.connection.connection;
  }
}
