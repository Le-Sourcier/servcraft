export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode = 500,
    isOperational = true,
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', errors?: Record<string, string[]>) {
    super(message, 400, true, errors);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(errors: Record<string, string[]>) {
    super('Validation failed', 422, true, errors);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
