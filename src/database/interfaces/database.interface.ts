/**
 * Common Database Adapter Interface
 * All ORMs must implement this interface to ensure consistency
 */
export interface IDatabaseAdapter {
  /**
   * Connect to the database
   * @throws Error if connection fails
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the database
   * Gracefully closes all connections
   */
  disconnect(): Promise<void>;

  /**
   * Check if database connection is healthy
   * @returns true if connected and responsive
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get the ORM type
   */
  getType(): 'prisma' | 'mongoose' | 'sequelize' | 'typeorm';

  /**
   * Get the database type
   */
  getDatabaseType(): 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'mariadb';

  /**
   * Get raw client instance (use with caution)
   * Type depends on ORM implementation
   */
  getRawClient(): unknown;
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  /** ORM type */
  orm: 'prisma' | 'mongoose' | 'sequelize' | 'typeorm';

  /** Database type */
  database: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'mariadb';

  /** Connection URL (preferred method) */
  url?: string;

  /** Host (alternative to url) */
  host?: string;

  /** Port (alternative to url) */
  port?: number;

  /** Username (alternative to url) */
  username?: string;

  /** Password (alternative to url) */
  password?: string;

  /** Database name (alternative to url) */
  databaseName?: string;

  /** SSL/TLS options */
  ssl?: boolean | Record<string, unknown>;

  /** Connection pool options */
  pool?: {
    min?: number;
    max?: number;
    idle?: number;
    acquire?: number;
  };

  /** Logging */
  logging?: boolean | ((query: string) => void);

  /** Timezone */
  timezone?: string;
}
