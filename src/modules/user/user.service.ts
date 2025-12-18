import type { PaginatedResult, PaginationParams } from '../../types/index.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';
import { UserRepository, createUserRepository } from './user.repository.js';
import type { User, CreateUserData, UpdateUserData, UserFilters, UserRole } from './types.js';
import { DEFAULT_ROLE_PERMISSIONS } from './types.js';
import { logger } from '../../core/logger.js';

export class UserService {
  constructor(private repository: UserRepository) {}

  async findById(id: string): Promise<User | null> {
    return this.repository.findById(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findByEmail(email);
  }

  async findMany(
    params: PaginationParams,
    filters?: UserFilters
  ): Promise<PaginatedResult<Omit<User, 'password'>>> {
    const result = await this.repository.findMany(params, filters);

    // Remove passwords from results
    return {
      ...result,
      data: result.data.map(({ password, ...user }) => user) as Omit<User, 'password'>[],
    };
  }

  async create(data: CreateUserData): Promise<User> {
    // Check for existing user
    const existing = await this.repository.findByEmail(data.email);
    if (existing) {
      throw new ConflictError('User with this email already exists');
    }

    const user = await this.repository.create(data);
    logger.info({ userId: user.id, email: user.email }, 'User created');
    return user;
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Check email uniqueness if changing email
    if (data.email && data.email !== user.email) {
      const existing = await this.repository.findByEmail(data.email);
      if (existing) {
        throw new ConflictError('Email already in use');
      }
    }

    const updatedUser = await this.repository.update(id, data);
    if (!updatedUser) {
      throw new NotFoundError('User');
    }

    logger.info({ userId: id }, 'User updated');
    return updatedUser;
  }

  async updatePassword(id: string, hashedPassword: string): Promise<User> {
    const user = await this.repository.updatePassword(id, hashedPassword);
    if (!user) {
      throw new NotFoundError('User');
    }
    logger.info({ userId: id }, 'User password updated');
    return user;
  }

  async updateLastLogin(id: string): Promise<User> {
    const user = await this.repository.updateLastLogin(id);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  async delete(id: string): Promise<void> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundError('User');
    }

    await this.repository.delete(id);
    logger.info({ userId: id }, 'User deleted');
  }

  async suspend(id: string): Promise<User> {
    return this.update(id, { status: 'suspended' });
  }

  async ban(id: string): Promise<User> {
    return this.update(id, { status: 'banned' });
  }

  async activate(id: string): Promise<User> {
    return this.update(id, { status: 'active' });
  }

  async verifyEmail(id: string): Promise<User> {
    return this.update(id, { emailVerified: true });
  }

  async changeRole(id: string, role: UserRole): Promise<User> {
    return this.update(id, { role });
  }

  // RBAC helpers
  hasPermission(role: UserRole, permission: string): boolean {
    const permissions = DEFAULT_ROLE_PERMISSIONS[role] || [];

    // Super admin has all permissions
    if (permissions.includes('*:manage')) {
      return true;
    }

    // Check exact match
    if (permissions.includes(permission)) {
      return true;
    }

    // Check wildcard match (e.g., "content:manage" matches "content:read")
    const [resource, action] = permission.split(':');
    const managePermission = `${resource}:manage`;
    if (permissions.includes(managePermission)) {
      return true;
    }

    return false;
  }

  getPermissions(role: UserRole): string[] {
    return DEFAULT_ROLE_PERMISSIONS[role] || [];
  }
}

export function createUserService(repository?: UserRepository): UserService {
  return new UserService(repository || createUserRepository());
}
