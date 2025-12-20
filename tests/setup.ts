import { beforeAll, afterAll } from 'vitest';

// Set test environment variables BEFORE any imports
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.DATABASE_URL =
  'postgresql://postgres:Lesourcier@localhost:5432/servcraft_test?schema=public';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only-32chars';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

beforeAll(async () => {
  // Global setup
});

afterAll(async () => {
  // Global cleanup
});
