import Fastify from 'fastify';
import type { FastifyInstance, FastifyServerOptions } from 'fastify';
import { logger, createLogger } from './logger.js';
import type { Logger } from './logger.js';

export interface ServerConfig {
  port: number;
  host: string;
  logger?: Logger;
  trustProxy?: boolean;
  bodyLimit?: number;
  requestTimeout?: number;
}

const defaultConfig: ServerConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  trustProxy: true,
  bodyLimit: 1048576, // 1MB
  requestTimeout: 30000, // 30s
};

export class Server {
  private app: FastifyInstance;
  private config: ServerConfig;
  private logger: Logger;
  private isShuttingDown = false;

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.logger = this.config.logger || logger;

    const fastifyOptions: FastifyServerOptions = {
      logger: this.logger,
      trustProxy: this.config.trustProxy,
      bodyLimit: this.config.bodyLimit,
      requestTimeout: this.config.requestTimeout,
    };

    this.app = Fastify(fastifyOptions);
    this.setupHealthCheck();
    this.setupGracefulShutdown();
  }

  get instance(): FastifyInstance {
    return this.app;
  }

  private setupHealthCheck(): void {
    this.app.get('/health', async (_request, reply) => {
      const healthcheck = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '0.1.0',
      };

      return reply.status(200).send(healthcheck);
    });

    this.app.get('/ready', async (_request, reply) => {
      if (this.isShuttingDown) {
        return reply.status(503).send({ status: 'shutting_down' });
      }
      return reply.status(200).send({ status: 'ready' });
    });
  }

  private setupGracefulShutdown(): void {
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

    signals.forEach((signal) => {
      process.on(signal, async () => {
        this.logger.info(`Received ${signal}, starting graceful shutdown...`);
        await this.shutdown();
      });
    });

    process.on('uncaughtException', async (error) => {
      this.logger.error({ err: error }, 'Uncaught exception');
      await this.shutdown(1);
    });

    process.on('unhandledRejection', async (reason) => {
      this.logger.error({ err: reason }, 'Unhandled rejection');
      await this.shutdown(1);
    });
  }

  async shutdown(exitCode = 0): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.logger.info('Graceful shutdown initiated...');

    const shutdownTimeout = setTimeout(() => {
      this.logger.error('Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, 30000);

    try {
      await this.app.close();
      this.logger.info('Server closed successfully');
      clearTimeout(shutdownTimeout);
      process.exit(exitCode);
    } catch (error) {
      this.logger.error({ err: error }, 'Error during shutdown');
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  }

  async start(): Promise<void> {
    try {
      await this.app.listen({
        port: this.config.port,
        host: this.config.host,
      });
      this.logger.info(`Server listening on ${this.config.host}:${this.config.port}`);
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to start server');
      throw error;
    }
  }
}

export function createServer(config: Partial<ServerConfig> = {}): Server {
  return new Server(config);
}
