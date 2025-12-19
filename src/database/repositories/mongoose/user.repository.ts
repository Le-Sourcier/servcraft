/**
 * Mongoose User Repository
 * Implements IRepository for User entity using Mongoose
 */

import { UserModel, type IUserDocument } from '../../models/mongoose/user.schema.js';
import type { IRepository, PaginationOptions, PaginatedResult } from '../../interfaces/index.js';

// User type matching application format (lowercase enums)
export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'user' | 'moderator' | 'admin' | 'super_admin';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  emailVerified: boolean;
  emailVerifiedAt?: Date | null;
  lastLoginAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose User Repository
 */
export class MongooseUserRepository implements IRepository<User> {
  /**
   * Convert Mongoose document to User
   */
  private toUser(doc: IUserDocument): User {
    return {
      id: doc._id.toString(),
      email: doc.email,
      password: doc.password,
      name: doc.name,
      role: doc.role,
      status: doc.status,
      emailVerified: doc.emailVerified,
      emailVerifiedAt: doc.emailVerifiedAt || null,
      lastLoginAt: doc.lastLoginAt || null,
      metadata: doc.metadata || null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      const user = await UserModel.findById(id).select('+password');
      return user ? this.toUser(user) : null;
    } catch {
      return null;
    }
  }

  /**
   * Find one user by filter
   */
  async findOne(filter: Record<string, unknown>): Promise<User | null> {
    try {
      const user = await UserModel.findOne(filter).select('+password');
      return user ? this.toUser(user) : null;
    } catch {
      return null;
    }
  }

  /**
   * Find many users with pagination
   */
  async findMany(
    filter: Record<string, unknown> = {},
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<User>> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    // Build sort
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder };

    // Execute queries
    const [users, total] = await Promise.all([
      UserModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      UserModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users.map((user) => this.toUser(user)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Create new user
   */
  async create(data: Partial<User>): Promise<User> {
    const user = await UserModel.create({
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role || 'user',
      status: data.status || 'active',
      emailVerified: data.emailVerified || false,
      emailVerifiedAt: data.emailVerifiedAt,
      lastLoginAt: data.lastLoginAt,
      metadata: data.metadata,
    });

    // Fetch with password included
    const created = await UserModel.findById(user._id).select('+password');
    if (!created) {
      throw new Error('Failed to create user');
    }

    return this.toUser(created);
  }

  /**
   * Update user by ID
   */
  async update(id: string, data: Partial<User>): Promise<User | null> {
    try {
      // Don't allow updating password directly (use separate method)
      const updateData = { ...data };
      delete updateData.password;

      const user = await UserModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select('+password');

      return user ? this.toUser(user) : null;
    } catch {
      return null;
    }
  }

  /**
   * Delete user by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await UserModel.findByIdAndDelete(id);
      return result !== null;
    } catch {
      return false;
    }
  }

  /**
   * Count users
   */
  async count(filter: Record<string, unknown> = {}): Promise<number> {
    return UserModel.countDocuments(filter);
  }

  /**
   * Check if user exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await UserModel.countDocuments({ _id: id });
    return count > 0;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email: email.toLowerCase() });
  }

  /**
   * Update password
   */
  async updatePassword(id: string, newPassword: string): Promise<boolean> {
    try {
      const user = await UserModel.findById(id);
      if (!user) {
        return false;
      }

      user.password = newPassword;
      await user.save(); // Will trigger pre-save hook to hash password

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify user password
   */
  async verifyPassword(id: string, password: string): Promise<boolean> {
    try {
      const user = await UserModel.findById(id).select('+password');
      if (!user) {
        return false;
      }

      return user.comparePassword(password);
    } catch {
      return false;
    }
  }

  /**
   * Update last login
   */
  async updateLastLogin(id: string): Promise<boolean> {
    try {
      const result = await UserModel.findByIdAndUpdate(id, {
        $set: { lastLoginAt: new Date() },
      });
      return result !== null;
    } catch {
      return false;
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(id: string): Promise<boolean> {
    try {
      const result = await UserModel.findByIdAndUpdate(id, {
        $set: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
      return result !== null;
    } catch {
      return false;
    }
  }
}
