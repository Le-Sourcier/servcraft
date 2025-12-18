import { env, isDevelopment, isProduction, isTest, isStaging } from './env.js';
import type { Env } from './env.js';

export interface AppConfig {
  env: Env;
  server: {
    port: number;
    host: string;
  };
  jwt: {
    secret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  security: {
    corsOrigin: string | string[];
    rateLimit: {
      max: number;
      windowMs: number;
    };
  };
  email: {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    from?: string;
  };
  database: {
    url?: string;
  };
  redis: {
    url?: string;
  };
}

function parseCorsOrigin(origin: string): string | string[] {
  if (origin === '*') return '*';
  if (origin.includes(',')) {
    return origin.split(',').map((o) => o.trim());
  }
  return origin;
}

export function createConfig(): AppConfig {
  return {
    env,
    server: {
      port: env.PORT,
      host: env.HOST,
    },
    jwt: {
      secret: env.JWT_SECRET || 'change-me-in-production-please-32chars',
      accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },
    security: {
      corsOrigin: parseCorsOrigin(env.CORS_ORIGIN),
      rateLimit: {
        max: env.RATE_LIMIT_MAX,
        windowMs: env.RATE_LIMIT_WINDOW_MS,
      },
    },
    email: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      from: env.SMTP_FROM,
    },
    database: {
      url: env.DATABASE_URL,
    },
    redis: {
      url: env.REDIS_URL,
    },
  };
}

export const config = createConfig();

export { env, isDevelopment, isProduction, isTest, isStaging };
export type { Env };
