/**
 * Database Connection Factory
 * Creates appropriate adapter based on configuration
 */

import { logger } from '../core/logger.js';
import type { IDatabaseAdapter, DatabaseConfig } from './interfaces/index.js';

// Lazy imports to avoid loading unused ORMs
let PrismaAdapter: any;
let MongooseAdapter: any;

/**
 * Database Factory
 * Singleton factory for creating and managing database adapters
 */
export class DatabaseFactory {
  private static adapter: IDatabaseAdapter | null = null;
  private static config: DatabaseConfig | null = null;

  /**
   * Create database adapter based on configuration
   * @param config - Database configuration
   * @returns Database adapter instance
   */
  static async createAdapter(config: DatabaseConfig): Promise<IDatabaseAdapter> {
    this.config = config;

    logger.info({ orm: config.orm, database: config.database }, 'Creating database adapter');

    switch (config.orm) {
      case 'prisma':
        return this.createPrismaAdapter(config);

      case 'mongoose':
        return this.createMongooseAdapter(config);

      case 'sequelize':
        throw new Error('Sequelize support coming soon! Use Prisma or Mongoose for now.');

      case 'typeorm':
        throw new Error('TypeORM support coming soon! Use Prisma or Mongoose for now.');

      default:
        throw new Error(`Unsupported ORM: ${config.orm}`);
    }
  }

  /**
   * Create Prisma adapter
   */
  private static async createPrismaAdapter(config: DatabaseConfig): Promise<IDatabaseAdapter> {
    // Validate Prisma supports this database
    if (!['postgresql', 'mysql', 'sqlite', 'mongodb'].includes(config.database)) {
      throw new Error(
        `Prisma does not support ${config.database}. Use PostgreSQL, MySQL, SQLite, or MongoDB.`
      );
    }

    // Lazy load Prisma adapter
    if (!PrismaAdapter) {
      const module = await import('./adapters/prisma.adapter.js');
      PrismaAdapter = module.PrismaAdapter;
    }

    return new PrismaAdapter(config);
  }

  /**
   * Create Mongoose adapter
   */
  private static async createMongooseAdapter(config: DatabaseConfig): Promise<IDatabaseAdapter> {
    // Validate Mongoose only supports MongoDB
    if (config.database !== 'mongodb') {
      throw new Error('Mongoose only supports MongoDB database.');
    }

    // Lazy load Mongoose adapter
    if (!MongooseAdapter) {
      const module = await import('./adapters/mongoose.adapter.js');
      MongooseAdapter = module.MongooseAdapter;
    }

    return new MongooseAdapter(config);
  }

  /**
   * Get current adapter instance (singleton)
   * @throws Error if no adapter initialized
   */
  static getAdapter(): IDatabaseAdapter {
    if (!this.adapter) {
      throw new Error('Database adapter not initialized. Call DatabaseFactory.initialize() first.');
    }
    return this.adapter;
  }

  /**
   * Initialize database connection
   * @param config - Database configuration
   */
  static async initialize(config: DatabaseConfig): Promise<IDatabaseAdapter> {
    if (this.adapter) {
      logger.warn('Database adapter already initialized. Disconnecting previous connection.');
      await this.disconnect();
    }

    this.adapter = await this.createAdapter(config);
    await this.adapter.connect();

    logger.info({ orm: config.orm, database: config.database }, 'Database initialized');

    return this.adapter;
  }

  /**
   * Disconnect from database
   */
  static async disconnect(): Promise<void> {
    if (this.adapter) {
      await this.adapter.disconnect();
      this.adapter = null;
      logger.info('Database disconnected');
    }
  }

  /**
   * Check database health
   */
  static async healthCheck(): Promise<boolean> {
    if (!this.adapter) {
      return false;
    }
    return this.adapter.healthCheck();
  }

  /**
   * Get current configuration
   */
  static getConfig(): DatabaseConfig | null {
    return this.config;
  }
}

/**
 * Helper function to get database connection URL from config
 */
export function getDatabaseUrl(config: DatabaseConfig): string {
  if (config.url) {
    return config.url;
  }

  // Build URL from components
  const { database, host, port, username, password, databaseName } = config;

  switch (database) {
    case 'postgresql':
      return `postgresql://${username}:${password}@${host}:${port || 5432}/${databaseName}`;

    case 'mysql':
    case 'mariadb':
      return `mysql://${username}:${password}@${host}:${port || 3306}/${databaseName}`;

    case 'sqlite':
      return `file:${databaseName || './dev.db'}`;

    case 'mongodb':
      return `mongodb://${host}:${port || 27017}/${databaseName}`;

    default:
      throw new Error(`Cannot build URL for database: ${database}`);
  }
}

/**
 * Validate ORM and database compatibility
 */
export function validateCompatibility(
  orm: DatabaseConfig['orm'],
  database: DatabaseConfig['database']
): boolean {
  const compatibility: Record<DatabaseConfig['orm'], DatabaseConfig['database'][]> = {
    prisma: ['postgresql', 'mysql', 'sqlite', 'mongodb'],
    mongoose: ['mongodb'],
    sequelize: ['postgresql', 'mysql', 'sqlite', 'mariadb'],
    typeorm: ['postgresql', 'mysql', 'sqlite', 'mongodb', 'mariadb'],
  };

  return compatibility[orm]?.includes(database) || false;
}
