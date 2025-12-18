import type { BaseEntity } from '../../types/index.js';

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'banned';

export type UserRole = 'user' | 'admin' | 'moderator' | 'super_admin';

export interface User extends BaseEntity {
  email: string;
  password: string;
  name?: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  lastLoginAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateUserData {
  email: string;
  password: string;
  name?: string;
  role?: UserRole;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  role?: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UserFilters {
  status?: UserStatus;
  role?: UserRole;
  search?: string;
  emailVerified?: boolean;
}

// RBAC Types
export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
}

export interface Role {
  id: string;
  name: UserRole;
  description?: string;
  permissions: Permission[];
}

// Default permissions mapping
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  user: ['profile:read', 'profile:update'],
  moderator: [
    'profile:read',
    'profile:update',
    'users:read',
    'content:read',
    'content:update',
    'content:delete',
  ],
  admin: [
    'profile:read',
    'profile:update',
    'users:read',
    'users:update',
    'users:delete',
    'content:manage',
    'settings:read',
  ],
  super_admin: ['*:manage'], // All permissions
};
