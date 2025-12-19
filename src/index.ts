import { createServer } from './core/server.js';
import { logger } from './core/logger.js';
import { config } from './config/index.js';
import { registerSecurity, registerErrorHandler } from './middleware/index.js';
import { registerAuthModule } from './modules/auth/index.js';

async function bootstrap(): Promise<void> {
  // Create server instance
  const server = createServer({
    port: config.server.port,
    host: config.server.host,
  });

  const app = server.instance;

  // Register error handler
  registerErrorHandler(app);

  // Register security middleware
  await registerSecurity(app);

  // Register auth module
  await registerAuthModule(app);

  // Start server
  await server.start();

  logger.info(
    {
      env: config.env.NODE_ENV,
      port: config.server.port,
    },
    'Servcraft server started'
  );
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});

// Export for library usage
export * from './core/index.js';
export * from './config/index.js';
export * from './middleware/index.js';
export * from './utils/index.js';
export * from './types/index.js';
export * from './modules/auth/index.js';
export * from './modules/user/index.js';
export * from './modules/email/index.js';
export * from './modules/validation/index.js';
export * from './modules/audit/index.js';
