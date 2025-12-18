import { z } from 'zod';
import type { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../../utils/errors.js';

export function validateBody<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ValidationError(formatZodErrors(result.error));
  }

  return result.data;
}

export function validateQuery<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ValidationError(formatZodErrors(result.error));
  }

  return result.data;
}

export function validateParams<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ValidationError(formatZodErrors(result.error));
  }

  return result.data;
}

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  return validateBody(schema, data);
}

function formatZodErrors(error: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'root';
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return errors;
}

// Common validation schemas
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const paginationSchema = z.object({
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required').optional(),
  search: z.string().min(1).optional(),
});

// Email validation
export const emailSchema = z.string().email('Invalid email address');

// Password validation with strength requirements
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// URL validation
export const urlSchema = z.string().url('Invalid URL format');

// Phone validation (basic international format)
export const phoneSchema = z.string().regex(
  /^\+?[1-9]\d{1,14}$/,
  'Invalid phone number format'
);

// Date validation
export const dateSchema = z.coerce.date();
export const futureDateSchema = z.coerce.date().refine(
  (date) => date > new Date(),
  'Date must be in the future'
);
export const pastDateSchema = z.coerce.date().refine(
  (date) => date < new Date(),
  'Date must be in the past'
);

// Type exports
export type IdParam = z.infer<typeof idParamSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
