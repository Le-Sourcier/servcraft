/**
 * Database Configuration
 * Centralized database configuration management
 */

import type { DatabaseConfig } from '../database/interfaces/index.js';

/**
 * Load database configuration from environment variables
 */
export function loadDatabaseConfig(): DatabaseConfig {
  const orm = (process.env.DATABASE_ORM || 'prisma') as DatabaseConfig['orm'];
  const database = (process.env.DATABASE_TYPE || 'postgresql') as DatabaseConfig['database'];

  // Primary configuration: DATABASE_URL
  if (process.env.DATABASE_URL) {
    return {
      orm,
      database,
      url: process.env.DATABASE_URL,
      logging: process.env.DATABASE_LOGGING === 'true',
      ssl: process.env.DATABASE_SSL === 'true',
    };
  }

  // Fallback: individual environment variables
  const config: DatabaseConfig = {
    orm,
    database,
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT) : undefined,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    databaseName: process.env.DATABASE_NAME,
    logging: process.env.DATABASE_LOGGING === 'true',
    ssl: process.env.DATABASE_SSL === 'true',
  };

  // MongoDB specific URL fallback
  if (database === 'mongodb' && process.env.MONGODB_URI) {
    config.url = process.env.MONGODB_URI;
  }

  // Set default ports if not specified
  if (!config.port && !config.url) {
    switch (database) {
      case 'postgresql':
        config.port = 5432;
        break;
      case 'mysql':
      case 'mariadb':
        config.port = 3306;
        break;
      case 'mongodb':
        config.port = 27017;
        break;
    }
  }

  return config;
}

/**
 * Validate database configuration
 * @throws Error if configuration is invalid
 */
export function validateDatabaseConfig(config: DatabaseConfig): void {
  // Check required fields
  if (!config.orm) {
    throw new Error('DATABASE_ORM is required');
  }

  if (!config.database) {
    throw new Error('DATABASE_TYPE is required');
  }

  // Validate ORM compatibility with database
  const compatibility: Record<DatabaseConfig['orm'], DatabaseConfig['database'][]> = {
    prisma: ['postgresql', 'mysql', 'sqlite', 'mongodb'],
    mongoose: ['mongodb'],
    sequelize: ['postgresql', 'mysql', 'sqlite', 'mariadb'],
    typeorm: ['postgresql', 'mysql', 'sqlite', 'mongodb', 'mariadb'],
  };

  if (!compatibility[config.orm]?.includes(config.database)) {
    throw new Error(
      `ORM '${config.orm}' does not support database '${config.database}'. ` +
        `Supported: ${compatibility[config.orm]?.join(', ') || 'none'}`
    );
  }

  // Check connection details
  if (!config.url) {
    if (config.database !== 'sqlite') {
      if (!config.host) {
        throw new Error('DATABASE_HOST or DATABASE_URL is required');
      }
      if (!config.databaseName) {
        throw new Error('DATABASE_NAME or DATABASE_URL is required');
      }
    } else {
      // SQLite needs at least a database name/path
      if (!config.databaseName) {
        config.databaseName = './dev.db';
      }
    }
  }

  // Validate Mongoose specific
  if (config.orm === 'mongoose' && config.database !== 'mongodb') {
    throw new Error('Mongoose can only be used with MongoDB');
  }

  // Validate MongoDB specific
  if (
    config.database === 'mongodb' &&
    config.orm !== 'mongoose' &&
    config.orm !== 'prisma' &&
    config.orm !== 'typeorm'
  ) {
    throw new Error(`MongoDB requires Mongoose, Prisma, or TypeORM (got ${config.orm})`);
  }
}

/**
 * Get recommended ORM for a database
 */
export function getRecommendedOrm(database: DatabaseConfig['database']): DatabaseConfig['orm'] {
  switch (database) {
    case 'mongodb':
      return 'mongoose';
    case 'postgresql':
    case 'mysql':
    case 'sqlite':
      return 'prisma';
    case 'mariadb':
      return 'sequelize';
    default:
      return 'prisma';
  }
}

/**
 * Get supported databases for an ORM
 */
export function getSupportedDatabases(orm: DatabaseConfig['orm']): DatabaseConfig['database'][] {
  const support: Record<DatabaseConfig['orm'], DatabaseConfig['database'][]> = {
    prisma: ['postgresql', 'mysql', 'sqlite', 'mongodb'],
    mongoose: ['mongodb'],
    sequelize: ['postgresql', 'mysql', 'sqlite', 'mariadb'],
    typeorm: ['postgresql', 'mysql', 'sqlite', 'mongodb', 'mariadb'],
  };

  return support[orm] || [];
}

/**
 * Example .env template generator
 */
export function generateEnvTemplate(config: DatabaseConfig): string {
  const lines: string[] = [
    '# Database Configuration',
    `DATABASE_ORM=${config.orm}`,
    `DATABASE_TYPE=${config.database}`,
    '',
  ];

  if (config.url) {
    lines.push(`DATABASE_URL=${config.url}`);
  } else {
    lines.push(
      `DATABASE_HOST=${config.host || 'localhost'}`,
      `DATABASE_PORT=${config.port || ''}`,
      `DATABASE_USER=${config.username || ''}`,
      `DATABASE_PASSWORD=${config.password || ''}`,
      `DATABASE_NAME=${config.databaseName || 'mydb'}`
    );
  }

  lines.push('', '# Optional', 'DATABASE_LOGGING=false', 'DATABASE_SSL=false');

  return lines.join('\n');
}
