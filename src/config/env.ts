import { z } from 'zod';
import dotenv from 'dotenv';
import { logger } from '../core/logger.js';

// Load .env file
dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Security
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // Redis (optional)
  REDIS_URL: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    logger.error({ errors: parsed.error.flatten().fieldErrors }, 'Invalid environment variables');
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

export const env = validateEnv();

export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

export function isTest(): boolean {
  return env.NODE_ENV === 'test';
}

export function isStaging(): boolean {
  return env.NODE_ENV === 'staging';
}
