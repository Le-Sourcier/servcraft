import { beforeAll, afterAll, afterEach } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

beforeAll(async () => {
  // Setup code that runs before all tests
});

afterAll(async () => {
  // Cleanup code that runs after all tests
});

afterEach(async () => {
  // Cleanup code that runs after each test
});
