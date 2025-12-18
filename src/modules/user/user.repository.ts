import { randomUUID } from 'crypto';
import type { PaginatedResult, PaginationParams } from '../../types/index.js';
import { createPaginatedResult, getSkip } from '../../utils/pagination.js';
import type { User, CreateUserData, UpdateUserData, UserFilters } from './types.js';

// In-memory storage for development (will be replaced by Prisma)
const users = new Map<string, User>();

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  async findMany(
    params: PaginationParams,
    filters?: UserFilters
  ): Promise<PaginatedResult<User>> {
    let filteredUsers = Array.from(users.values());

    // Apply filters
    if (filters) {
      if (filters.status) {
        filteredUsers = filteredUsers.filter((u) => u.status === filters.status);
      }
      if (filters.role) {
        filteredUsers = filteredUsers.filter((u) => u.role === filters.role);
      }
      if (filters.emailVerified !== undefined) {
        filteredUsers = filteredUsers.filter((u) => u.emailVerified === filters.emailVerified);
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        filteredUsers = filteredUsers.filter(
          (u) =>
            u.email.toLowerCase().includes(search) ||
            u.name?.toLowerCase().includes(search)
        );
      }
    }

    // Sort
    if (params.sortBy) {
      const sortKey = params.sortBy as keyof User;
      filteredUsers.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal === undefined || bVal === undefined) return 0;
        if (aVal < bVal) return params.sortOrder === 'desc' ? 1 : -1;
        if (aVal > bVal) return params.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }

    const total = filteredUsers.length;
    const skip = getSkip(params);
    const data = filteredUsers.slice(skip, skip + params.limit);

    return createPaginatedResult(data, total, params);
  }

  async create(data: CreateUserData): Promise<User> {
    const now = new Date();
    const user: User = {
      id: randomUUID(),
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role || 'user',
      status: 'active',
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    };

    users.set(user.id, user);
    return user;
  }

  async update(id: string, data: UpdateUserData): Promise<User | null> {
    const user = users.get(id);
    if (!user) return null;

    const updatedUser: User = {
      ...user,
      ...data,
      updatedAt: new Date(),
    };

    users.set(id, updatedUser);
    return updatedUser;
  }

  async updatePassword(id: string, password: string): Promise<User | null> {
    const user = users.get(id);
    if (!user) return null;

    const updatedUser: User = {
      ...user,
      password,
      updatedAt: new Date(),
    };

    users.set(id, updatedUser);
    return updatedUser;
  }

  async updateLastLogin(id: string): Promise<User | null> {
    const user = users.get(id);
    if (!user) return null;

    const updatedUser: User = {
      ...user,
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    };

    users.set(id, updatedUser);
    return updatedUser;
  }

  async delete(id: string): Promise<boolean> {
    return users.delete(id);
  }

  async count(filters?: UserFilters): Promise<number> {
    let count = 0;
    for (const user of users.values()) {
      if (filters) {
        if (filters.status && user.status !== filters.status) continue;
        if (filters.role && user.role !== filters.role) continue;
        if (filters.emailVerified !== undefined && user.emailVerified !== filters.emailVerified)
          continue;
      }
      count++;
    }
    return count;
  }

  // Helper to clear all users (for testing)
  async clear(): Promise<void> {
    users.clear();
  }
}

export function createUserRepository(): UserRepository {
  return new UserRepository();
}
