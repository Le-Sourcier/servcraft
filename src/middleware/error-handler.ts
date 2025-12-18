import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { isAppError } from '../utils/errors.js';
import { logger } from '../core/logger.js';
import { isProduction } from '../config/index.js';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler(
    (error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
      // Log the error
      logger.error(
        {
          err: error,
          requestId: request.id,
          method: request.method,
          url: request.url,
        },
        'Request error'
      );

      // Handle AppError (our custom errors)
      if (isAppError(error)) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message,
          errors: error.errors,
          ...(isProduction() ? {} : { stack: error.stack }),
        });
      }

      // Handle Fastify validation errors
      if ('validation' in error && error.validation) {
        const errors: Record<string, string[]> = {};
        for (const err of error.validation) {
          const field = err.instancePath?.replace('/', '') || 'body';
          if (!errors[field]) {
            errors[field] = [];
          }
          errors[field].push(err.message || 'Invalid value');
        }

        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors,
        });
      }

      // Handle Fastify errors with statusCode
      if ('statusCode' in error && typeof error.statusCode === 'number') {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message,
          ...(isProduction() ? {} : { stack: error.stack }),
        });
      }

      // Handle unknown errors
      return reply.status(500).send({
        success: false,
        message: isProduction() ? 'Internal server error' : error.message,
        ...(isProduction() ? {} : { stack: error.stack }),
      });
    }
  );

  // Handle 404
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(404).send({
      success: false,
      message: `Route ${request.method} ${request.url} not found`,
    });
  });
}
