import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  isAppError,
} from '../../../src/utils/errors.js';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with default values', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it('should create error with custom status code', () => {
      const error = new AppError('Custom error', 418);
      expect(error.statusCode).toBe(418);
    });

    it('should include errors object', () => {
      const errors = { field: ['error message'] };
      const error = new AppError('Validation error', 400, true, errors);
      expect(error.errors).toEqual(errors);
    });
  });

  describe('NotFoundError', () => {
    it('should have 404 status code', () => {
      const error = new NotFoundError('User');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
    });

    it('should use default message', () => {
      const error = new NotFoundError();
      expect(error.message).toBe('Resource not found');
    });
  });

  describe('UnauthorizedError', () => {
    it('should have 401 status code', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
    });
  });

  describe('ForbiddenError', () => {
    it('should have 403 status code', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
    });
  });

  describe('BadRequestError', () => {
    it('should have 400 status code', () => {
      const error = new BadRequestError();
      expect(error.statusCode).toBe(400);
    });

    it('should include validation errors', () => {
      const errors = { email: ['Invalid email'] };
      const error = new BadRequestError('Invalid input', errors);
      expect(error.errors).toEqual(errors);
    });
  });

  describe('ConflictError', () => {
    it('should have 409 status code', () => {
      const error = new ConflictError();
      expect(error.statusCode).toBe(409);
    });
  });

  describe('ValidationError', () => {
    it('should have 422 status code', () => {
      const errors = { name: ['Required'] };
      const error = new ValidationError(errors);
      expect(error.statusCode).toBe(422);
      expect(error.errors).toEqual(errors);
    });
  });

  describe('TooManyRequestsError', () => {
    it('should have 429 status code', () => {
      const error = new TooManyRequestsError();
      expect(error.statusCode).toBe(429);
    });
  });

  describe('isAppError', () => {
    it('should return true for AppError instances', () => {
      expect(isAppError(new AppError('test'))).toBe(true);
      expect(isAppError(new NotFoundError())).toBe(true);
      expect(isAppError(new ValidationError({}))).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isAppError(new Error('test'))).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError('error')).toBe(false);
    });
  });
});
