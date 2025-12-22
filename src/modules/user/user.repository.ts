import { prisma } from '../../database/prisma.js';
import type { PaginatedResult, PaginationParams } from '../../types/index.js';
import { createPaginatedResult, getSkip } from '../../utils/pagination.js';
import type { User, CreateUserData, UpdateUserData, UserFilters } from './types.js';

// Use string literal enums for ESM/CommonJS compatibility
const UserRole = {
  USER: 'USER',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  BANNED: 'BANNED',
} as const;

type UserRole = (typeof UserRole)[keyof typeof UserRole];
type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

/**
 * User Repository - Prisma Implementation
 * Manages user data persistence using Prisma ORM
 */
export class UserRepository {
  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;
    return this.mapPrismaUserToUser(user);
  }

  /**
   * Find user by email (case-insensitive)
   */
  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) return null;
    return this.mapPrismaUserToUser(user);
  }

  /**
   * Find multiple users with pagination and filters
   */
  async findMany(params: PaginationParams, filters?: UserFilters): Promise<PaginatedResult<User>> {
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(params);

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip: getSkip(params),
        take: params.limit,
      }),
      prisma.user.count({ where }),
    ]);

    const mappedUsers = data.map((user) => this.mapPrismaUserToUser(user));

    return createPaginatedResult(mappedUsers, total, params);
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserData): Promise<User> {
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: data.password,
        name: data.name,
        role: this.mapRoleToEnum(data.role || 'user'),
        status: UserStatus.ACTIVE,
        emailVerified: false,
      },
    });

    return this.mapPrismaUserToUser(user);
  }

  /**
   * Update user data
   */
  async update(id: string, data: UpdateUserData): Promise<User | null> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(data.email && { email: data.email.toLowerCase() }),
          ...(data.name !== undefined && { name: data.name }),
          ...(data.role && { role: this.mapRoleToEnum(data.role) }),
          ...(data.status && { status: this.mapStatusToEnum(data.status) }),
          ...(data.emailVerified !== undefined && { emailVerified: data.emailVerified }),
          ...(data.metadata && { metadata: data.metadata as object }),
        },
      });

      return this.mapPrismaUserToUser(user);
    } catch {
      // User not found
      return null;
    }
  }

  /**
   * Update user password
   */
  async updatePassword(id: string, password: string): Promise<User | null> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { password },
      });

      return this.mapPrismaUserToUser(user);
    } catch {
      return null;
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<User | null> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { lastLoginAt: new Date() },
      });

      return this.mapPrismaUserToUser(user);
    } catch {
      return null;
    }
  }

  /**
   * Delete user by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Count users with optional filters
   */
  async count(filters?: UserFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return prisma.user.count({ where });
  }

  /**
   * Helper to clear all users (for testing only)
   * WARNING: This deletes all users from the database
   */
  async clear(): Promise<void> {
    await prisma.user.deleteMany();
  }

  /**
   * Build Prisma where clause from filters
   */
  private buildWhereClause(filters?: UserFilters): object {
    if (!filters) return {};

    return {
      ...(filters.status && { status: this.mapStatusToEnum(filters.status) }),
      ...(filters.role && { role: this.mapRoleToEnum(filters.role) }),
      ...(filters.emailVerified !== undefined && { emailVerified: filters.emailVerified }),
      ...(filters.search && {
        OR: [
          { email: { contains: filters.search, mode: 'insensitive' as const } },
          { name: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      }),
    };
  }

  /**
   * Build Prisma orderBy clause from pagination params
   */
  private buildOrderBy(params: PaginationParams): object {
    if (!params.sortBy) {
      return { createdAt: 'desc' as const };
    }

    return {
      [params.sortBy]: params.sortOrder || 'asc',
    };
  }

  /**
   * Map Prisma User to application User type
   */
  private mapPrismaUserToUser(prismaUser: {
    id: string;
    email: string;
    password: string;
    name: string | null;
    role: UserRole;
    status: UserStatus;
    emailVerified: boolean;
    lastLoginAt: Date | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      password: prismaUser.password,
      name: prismaUser.name ?? undefined,
      role: this.mapEnumToRole(prismaUser.role),
      status: this.mapEnumToStatus(prismaUser.status),
      emailVerified: prismaUser.emailVerified,
      lastLoginAt: prismaUser.lastLoginAt ?? undefined,
      metadata: prismaUser.metadata as Record<string, unknown> | undefined,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    };
  }

  /**
   * Map application role to Prisma enum
   */
  private mapRoleToEnum(role: string): UserRole {
    const roleMap: Record<string, UserRole> = {
      user: UserRole.USER,
      moderator: UserRole.MODERATOR,
      admin: UserRole.ADMIN,
      super_admin: UserRole.SUPER_ADMIN,
    };
    return roleMap[role] || UserRole.USER;
  }

  /**
   * Map Prisma enum to application role
   */
  private mapEnumToRole(role: UserRole): User['role'] {
    const roleMap: Record<UserRole, User['role']> = {
      [UserRole.USER]: 'user',
      [UserRole.MODERATOR]: 'moderator',
      [UserRole.ADMIN]: 'admin',
      [UserRole.SUPER_ADMIN]: 'super_admin',
    };
    return roleMap[role];
  }

  /**
   * Map application status to Prisma enum
   */
  private mapStatusToEnum(status: string): UserStatus {
    const statusMap: Record<string, UserStatus> = {
      active: UserStatus.ACTIVE,
      inactive: UserStatus.INACTIVE,
      suspended: UserStatus.SUSPENDED,
      banned: UserStatus.BANNED,
    };
    return statusMap[status] || UserStatus.ACTIVE;
  }

  /**
   * Map Prisma enum to application status
   */
  private mapEnumToStatus(status: UserStatus): User['status'] {
    const statusMap: Record<UserStatus, User['status']> = {
      [UserStatus.ACTIVE]: 'active',
      [UserStatus.INACTIVE]: 'inactive',
      [UserStatus.SUSPENDED]: 'suspended',
      [UserStatus.BANNED]: 'banned',
    };
    return statusMap[status];
  }
}

export function createUserRepository(): UserRepository {
  return new UserRepository();
}
