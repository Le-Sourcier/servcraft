import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../src/database/prisma.js';
import { UserRepository } from '../../src/modules/user/user.repository.js';
import type { CreateUserData, UpdateUserData } from '../../src/modules/user/types.js';

describe('UserRepository - Prisma Integration', () => {
  let repository: UserRepository;

  beforeAll(async () => {
    repository = new UserRepository();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await repository.clear();
  });

  describe('Create Operations', () => {
    it('should create a new user', async () => {
      const userData: CreateUserData = {
        email: 'test@example.com',
        password: 'hashedpassword123',
        name: 'Test User',
        role: 'user',
      };

      const user = await repository.create(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.role).toBe('user');
      expect(user.status).toBe('active');
      expect(user.emailVerified).toBe(false);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should create user with lowercase email', async () => {
      const userData: CreateUserData = {
        email: 'TEST@EXAMPLE.COM',
        password: 'hashedpassword123',
      };

      const user = await repository.create(userData);
      expect(user.email).toBe('test@example.com');
    });

    it('should create user with default role', async () => {
      const userData: CreateUserData = {
        email: 'nonadmin@example.com',
        password: 'hashedpassword123',
      };

      const user = await repository.create(userData);
      expect(user.role).toBe('user');
    });

    it('should create admin user', async () => {
      const userData: CreateUserData = {
        email: 'admin@example.com',
        password: 'hashedpassword123',
        role: 'admin',
      };

      const user = await repository.create(userData);
      expect(user.role).toBe('admin');
    });

    it('should fail to create user with duplicate email', async () => {
      const userData: CreateUserData = {
        email: 'duplicate@example.com',
        password: 'hashedpassword123',
      };

      await repository.create(userData);
      await expect(repository.create(userData)).rejects.toThrow();
    });
  });

  describe('Read Operations', () => {
    it('should find user by ID', async () => {
      const created = await repository.create({
        email: 'findme@example.com',
        password: 'hashedpassword123',
        name: 'Find Me',
      });

      const found = await repository.findById(created.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe('findme@example.com');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById('non-existent-id');
      expect(found).toBeNull();
    });

    it('should find user by email (case-insensitive)', async () => {
      await repository.create({
        email: 'findme@example.com',
        password: 'hashedpassword123',
      });

      const found = await repository.findByEmail('FINDME@EXAMPLE.COM');
      expect(found).toBeDefined();
      expect(found?.email).toBe('findme@example.com');
    });

    it('should return null for non-existent email', async () => {
      const found = await repository.findByEmail('nonexistent@example.com');
      expect(found).toBeNull();
    });
  });

  describe('Update Operations', () => {
    it('should update user name', async () => {
      const user = await repository.create({
        email: 'update@example.com',
        password: 'hashedpassword123',
        name: 'Old Name',
      });

      const updateData: UpdateUserData = {
        name: 'New Name',
      };

      const updated = await repository.update(user.id, updateData);
      expect(updated).toBeDefined();
      expect(updated?.name).toBe('New Name');
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());
    });

    it('should update user role', async () => {
      const user = await repository.create({
        email: 'promote@example.com',
        password: 'hashedpassword123',
      });

      const updated = await repository.update(user.id, { role: 'admin' });
      expect(updated?.role).toBe('admin');
    });

    it('should update user status', async () => {
      const user = await repository.create({
        email: 'suspend@example.com',
        password: 'hashedpassword123',
      });

      const updated = await repository.update(user.id, { status: 'suspended' });
      expect(updated?.status).toBe('suspended');
    });

    it('should update email verified status', async () => {
      const user = await repository.create({
        email: 'verify@example.com',
        password: 'hashedpassword123',
      });

      const updated = await repository.update(user.id, { emailVerified: true });
      expect(updated?.emailVerified).toBe(true);
    });

    it('should update user metadata', async () => {
      const user = await repository.create({
        email: 'meta@example.com',
        password: 'hashedpassword123',
      });

      const metadata = { preferences: { theme: 'dark', language: 'en' } };
      const updated = await repository.update(user.id, { metadata });

      expect(updated?.metadata).toEqual(metadata);
    });

    it('should return null when updating non-existent user', async () => {
      const updated = await repository.update('non-existent-id', { name: 'Test' });
      expect(updated).toBeNull();
    });

    it('should update password', async () => {
      const user = await repository.create({
        email: 'changepass@example.com',
        password: 'oldpassword',
      });

      const updated = await repository.updatePassword(user.id, 'newpassword');
      expect(updated).toBeDefined();
      expect(updated?.password).toBe('newpassword');
    });

    it('should update last login timestamp', async () => {
      const user = await repository.create({
        email: 'login@example.com',
        password: 'hashedpassword123',
      });

      expect(user.lastLoginAt).toBeUndefined();

      const updated = await repository.updateLastLogin(user.id);
      expect(updated?.lastLoginAt).toBeInstanceOf(Date);
    });
  });

  describe('Delete Operations', () => {
    it('should delete user', async () => {
      const user = await repository.create({
        email: 'delete@example.com',
        password: 'hashedpassword123',
      });

      const deleted = await repository.delete(user.id);
      expect(deleted).toBe(true);

      const found = await repository.findById(user.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent user', async () => {
      const deleted = await repository.delete('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('Pagination and Filtering', () => {
    beforeEach(async () => {
      // Create test users
      await Promise.all([
        repository.create({
          email: 'user1@example.com',
          password: 'pass',
          name: 'Alice Admin',
          role: 'admin',
        }),
        repository.create({
          email: 'user2@example.com',
          password: 'pass',
          name: 'Bob User',
          role: 'user',
        }),
        repository.create({
          email: 'user3@example.com',
          password: 'pass',
          name: 'Charlie Moderator',
          role: 'moderator',
        }),
        repository.create({
          email: 'suspended@example.com',
          password: 'pass',
          name: 'David Suspended',
          role: 'user',
        }),
      ]);

      // Suspend one user
      const suspended = await repository.findByEmail('suspended@example.com');
      if (suspended) {
        await repository.update(suspended.id, { status: 'suspended' });
      }
    });

    it('should find all users with pagination', async () => {
      const result = await repository.findMany({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(4);
      expect(result.meta.total).toBe(4);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should paginate results', async () => {
      const page1 = await repository.findMany({ page: 1, limit: 2 });
      expect(page1.data).toHaveLength(2);
      expect(page1.meta.hasMore).toBe(true);

      const page2 = await repository.findMany({ page: 2, limit: 2 });
      expect(page2.data).toHaveLength(2);
      expect(page2.meta.hasMore).toBe(false);
    });

    it('should filter by role', async () => {
      const result = await repository.findMany({ page: 1, limit: 10 }, { role: 'admin' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.role).toBe('admin');
    });

    it('should filter by status', async () => {
      const result = await repository.findMany({ page: 1, limit: 10 }, { status: 'suspended' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.status).toBe('suspended');
    });

    it('should filter by email verified', async () => {
      const user = await repository.findByEmail('user1@example.com');
      if (user) {
        await repository.update(user.id, { emailVerified: true });
      }

      const result = await repository.findMany({ page: 1, limit: 10 }, { emailVerified: true });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.emailVerified).toBe(true);
    });

    it('should search by email or name', async () => {
      const result = await repository.findMany({ page: 1, limit: 10 }, { search: 'alice' });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0]?.name).toContain('Alice');
    });

    it('should sort users', async () => {
      const result = await repository.findMany({
        page: 1,
        limit: 10,
        sortBy: 'email',
        sortOrder: 'asc',
      });

      expect(result.data[0]?.email).toBeLessThan(result.data[1]?.email || '');
    });

    it('should combine multiple filters', async () => {
      const result = await repository.findMany(
        { page: 1, limit: 10 },
        { role: 'user', status: 'active' }
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.role).toBe('user');
      expect(result.data[0]?.status).toBe('active');
    });
  });

  describe('Count Operations', () => {
    beforeEach(async () => {
      await Promise.all([
        repository.create({ email: 'count1@example.com', password: 'pass', role: 'admin' }),
        repository.create({ email: 'count2@example.com', password: 'pass', role: 'user' }),
        repository.create({ email: 'count3@example.com', password: 'pass', role: 'user' }),
      ]);
    });

    it('should count all users', async () => {
      const count = await repository.count();
      expect(count).toBe(3);
    });

    it('should count users by role', async () => {
      const count = await repository.count({ role: 'user' });
      expect(count).toBe(2);
    });

    it('should count users by status', async () => {
      const user = await repository.findByEmail('count1@example.com');
      if (user) {
        await repository.update(user.id, { status: 'suspended' });
      }

      const activeCount = await repository.count({ status: 'active' });
      const suspendedCount = await repository.count({ status: 'suspended' });

      expect(activeCount).toBe(2);
      expect(suspendedCount).toBe(1);
    });
  });

  describe('Clear Operation', () => {
    it('should clear all users', async () => {
      await Promise.all([
        repository.create({ email: 'clear1@example.com', password: 'pass' }),
        repository.create({ email: 'clear2@example.com', password: 'pass' }),
      ]);

      let count = await repository.count();
      expect(count).toBe(2);

      await repository.clear();

      count = await repository.count();
      expect(count).toBe(0);
    });
  });

  describe('Enum Mapping', () => {
    it('should correctly map all user roles', async () => {
      const roles: Array<'user' | 'admin' | 'moderator' | 'super_admin'> = [
        'user',
        'admin',
        'moderator',
        'super_admin',
      ];

      for (const role of roles) {
        const user = await repository.create({
          email: `${role}@example.com`,
          password: 'pass',
          role,
        });

        expect(user.role).toBe(role);

        const found = await repository.findById(user.id);
        expect(found?.role).toBe(role);
      }
    });

    it('should correctly map all user statuses', async () => {
      const user = await repository.create({
        email: 'status@example.com',
        password: 'pass',
      });

      const statuses: Array<'active' | 'inactive' | 'suspended' | 'banned'> = [
        'active',
        'inactive',
        'suspended',
        'banned',
      ];

      for (const status of statuses) {
        const updated = await repository.update(user.id, { status });
        expect(updated?.status).toBe(status);

        const found = await repository.findById(user.id);
        expect(found?.status).toBe(status);
      }
    });
  });
});
