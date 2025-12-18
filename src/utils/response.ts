import type { FastifyReply } from 'fastify';
import type { ApiResponse } from '../types/index.js';

export function success<T>(reply: FastifyReply, data: T, statusCode = 200): FastifyReply {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  return reply.status(statusCode).send(response);
}

export function created<T>(reply: FastifyReply, data: T): FastifyReply {
  return success(reply, data, 201);
}

export function noContent(reply: FastifyReply): FastifyReply {
  return reply.status(204).send();
}

export function error(
  reply: FastifyReply,
  message: string,
  statusCode = 400,
  errors?: Record<string, string[]>
): FastifyReply {
  const response: ApiResponse = {
    success: false,
    message,
    errors,
  };
  return reply.status(statusCode).send(response);
}

export function notFound(reply: FastifyReply, message = 'Resource not found'): FastifyReply {
  return error(reply, message, 404);
}

export function unauthorized(reply: FastifyReply, message = 'Unauthorized'): FastifyReply {
  return error(reply, message, 401);
}

export function forbidden(reply: FastifyReply, message = 'Forbidden'): FastifyReply {
  return error(reply, message, 403);
}

export function badRequest(
  reply: FastifyReply,
  message = 'Bad request',
  errors?: Record<string, string[]>
): FastifyReply {
  return error(reply, message, 400, errors);
}

export function conflict(reply: FastifyReply, message = 'Resource already exists'): FastifyReply {
  return error(reply, message, 409);
}

export function internalError(
  reply: FastifyReply,
  message = 'Internal server error'
): FastifyReply {
  return error(reply, message, 500);
}
