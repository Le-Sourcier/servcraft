export type CacheProvider = 'memory' | 'redis';

export interface CacheConfig {
  provider: CacheProvider;
  ttl: number; // default TTL in seconds
  prefix?: string;
  redis?: RedisConfig;
  memory?: MemoryCacheConfig;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  tls?: boolean;
  keyPrefix?: string;
  connectTimeout?: number;
  maxRetries?: number;
}

export interface MemoryCacheConfig {
  maxSize?: number; // max number of items
  maxMemory?: number; // max memory in bytes
  checkPeriod?: number; // cleanup check interval in seconds
}

export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  tags?: string[];
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memory?: number;
}
