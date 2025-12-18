import { z } from 'zod';

export const userStatusEnum = z.enum(['active', 'inactive', 'suspended', 'banned']);
export const userRoleEnum = z.enum(['user', 'admin', 'moderator', 'super_admin']);

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  role: userRoleEnum.optional().default('user'),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  role: userRoleEnum.optional(),
  status: userStatusEnum.optional(),
  emailVerified: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const userQuerySchema = z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  status: userStatusEnum.optional(),
  role: userRoleEnum.optional(),
  search: z.string().optional(),
  emailVerified: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
