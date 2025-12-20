import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongooseAdapter } from '../../src/database/adapters/mongoose.adapter.js';
import { MongooseUserRepository } from '../../src/database/repositories/mongoose/user.repository.js';
import { MongoosePaymentRepository } from '../../src/database/repositories/mongoose/payment.repository.js';

// Skip if MongoDB is not available (requires local MongoDB instance)
const skipMongo = !process.env.MONGODB_URI && process.env.SKIP_MONGO_TESTS !== 'false';

describe.skipIf(skipMongo)('Mongoose Repositories Integration', () => {
  let adapter: MongooseAdapter;
  let userRepo: MongooseUserRepository;
  let paymentRepo: MongoosePaymentRepository;

  beforeAll(async () => {
    // Connect to MongoDB (use test database)
    adapter = new MongooseAdapter({
      orm: 'mongoose',
      database: 'mongodb',
      url: process.env.MONGODB_URI || 'mongodb://localhost:27017/servcraft_test',
      logging: false,
    });

    await adapter.connect();

    userRepo = new MongooseUserRepository();
    paymentRepo = new MongoosePaymentRepository();
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  beforeEach(async () => {
    // Clean database before each test
    await mongoose.connection.dropDatabase();
  });

  // ==========================================
  // USER REPOSITORY TESTS
  // ==========================================

  describe('User Repository', () => {
    it('should create a user', async () => {
      const user = await userRepo.create({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'user',
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.role).toBe('user');
      expect(user.status).toBe('active');
      expect(user.emailVerified).toBe(false);
    });

    it('should hash password on create', async () => {
      const user = await userRepo.create({
        email: 'hash@example.com',
        password: 'plaintext',
        name: 'Hash Test',
      });

      // Password should be hashed (not equal to plain)
      expect(user.password).not.toBe('plaintext');
      expect(user.password).toContain('$2');
    });

    it('should find user by ID', async () => {
      const created = await userRepo.create({
        email: 'find@example.com',
        password: 'password',
        name: 'Find Me',
      });

      const found = await userRepo.findById(created.id);
      expect(found).not.toBeNull();
      expect(found?.email).toBe('find@example.com');
    });

    it('should find user by email', async () => {
      await userRepo.create({
        email: 'email@example.com',
        password: 'password',
        name: 'Email User',
      });

      const user = await userRepo.findByEmail('email@example.com');
      expect(user).not.toBeNull();
      expect(user?.name).toBe('Email User');
    });

    it('should update user', async () => {
      const user = await userRepo.create({
        email: 'update@example.com',
        password: 'password',
        name: 'Original Name',
      });

      const updated = await userRepo.update(user.id, {
        name: 'Updated Name',
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Updated Name');
    });

    it('should delete user', async () => {
      const user = await userRepo.create({
        email: 'delete@example.com',
        password: 'password',
        name: 'Delete Me',
      });

      const deleted = await userRepo.delete(user.id);
      expect(deleted).toBe(true);

      const found = await userRepo.findById(user.id);
      expect(found).toBeNull();
    });

    it('should paginate users', async () => {
      // Create 15 users
      for (let i = 0; i < 15; i++) {
        await userRepo.create({
          email: `user${i}@example.com`,
          password: 'password',
          name: `User ${i}`,
        });
      }

      // Get first page
      const page1 = await userRepo.findMany({}, { page: 1, limit: 10 });
      expect(page1.data.length).toBe(10);
      expect(page1.pagination.total).toBe(15);
      expect(page1.pagination.totalPages).toBe(2);
      expect(page1.pagination.hasNext).toBe(true);
      expect(page1.pagination.hasPrev).toBe(false);

      // Get second page
      const page2 = await userRepo.findMany({}, { page: 2, limit: 10 });
      expect(page2.data.length).toBe(5);
      expect(page2.pagination.hasNext).toBe(false);
      expect(page2.pagination.hasPrev).toBe(true);
    });

    it('should verify password', async () => {
      const user = await userRepo.create({
        email: 'verify@example.com',
        password: 'correct-password',
        name: 'Verify User',
      });

      const validPassword = await userRepo.verifyPassword(user.id, 'correct-password');
      expect(validPassword).toBe(true);

      const invalidPassword = await userRepo.verifyPassword(user.id, 'wrong-password');
      expect(invalidPassword).toBe(false);
    });

    it('should update password', async () => {
      const user = await userRepo.create({
        email: 'updatepw@example.com',
        password: 'old-password',
        name: 'Update PW',
      });

      const updated = await userRepo.updatePassword(user.id, 'new-password');
      expect(updated).toBe(true);

      // Verify old password doesn't work
      const oldValid = await userRepo.verifyPassword(user.id, 'old-password');
      expect(oldValid).toBe(false);

      // Verify new password works
      const newValid = await userRepo.verifyPassword(user.id, 'new-password');
      expect(newValid).toBe(true);
    });

    it('should verify email', async () => {
      const user = await userRepo.create({
        email: 'verifyemail@example.com',
        password: 'password',
        name: 'Verify Email',
      });

      const verified = await userRepo.verifyEmail(user.id);
      expect(verified).toBe(true);

      const updated = await userRepo.findById(user.id);
      expect(updated?.emailVerified).toBe(true);
      expect(updated?.emailVerifiedAt).toBeDefined();
    });
  });

  // ==========================================
  // PAYMENT REPOSITORY TESTS
  // ==========================================

  describe('Payment Repository', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await userRepo.create({
        email: 'payment@example.com',
        password: 'password',
        name: 'Payment User',
      });
      userId = user.id;
    });

    it('should create payment', async () => {
      const payment = await paymentRepo.create({
        userId,
        provider: 'stripe',
        method: 'card',
        amount: 99.99,
        currency: 'USD',
        status: 'pending',
      });

      expect(payment.id).toBeDefined();
      expect(payment.userId).toBe(userId);
      expect(payment.amount).toBe(99.99);
      expect(payment.status).toBe('pending');
    });

    it('should find payment by ID', async () => {
      const created = await paymentRepo.create({
        userId,
        provider: 'paypal',
        method: 'paypal',
        amount: 49.99,
        currency: 'EUR',
      });

      const found = await paymentRepo.findById(created.id);
      expect(found).not.toBeNull();
      expect(found?.amount).toBe(49.99);
    });

    it('should update payment status', async () => {
      const payment = await paymentRepo.create({
        userId,
        provider: 'stripe',
        method: 'card',
        amount: 199.99,
        currency: 'USD',
      });

      const updated = await paymentRepo.updateStatus(payment.id, 'completed');
      expect(updated).not.toBeNull();
      expect(updated?.status).toBe('completed');
      expect(updated?.completedAt).toBeDefined();
    });

    it('should find payments by user', async () => {
      // Create multiple payments
      await paymentRepo.create({
        userId,
        provider: 'stripe',
        method: 'card',
        amount: 10,
        currency: 'USD',
      });
      await paymentRepo.create({
        userId,
        provider: 'paypal',
        method: 'paypal',
        amount: 20,
        currency: 'USD',
      });

      const result = await paymentRepo.findByUserId(userId);
      expect(result.data.length).toBe(2);
    });

    // Subscription tests
    it('should create subscription', async () => {
      const plan = await paymentRepo.createPlan({
        name: 'Pro Plan',
        amount: 29.99,
        currency: 'USD',
        interval: 'month',
        intervalCount: 1,
      });

      const subscription = await paymentRepo.createSubscription({
        userId,
        planId: plan.id,
        provider: 'stripe',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
      });

      expect(subscription.id).toBeDefined();
      expect(subscription.planId).toBe(plan.id);
      expect(subscription.status).toBe('active');
    });

    it('should cancel subscription', async () => {
      const plan = await paymentRepo.createPlan({
        name: 'Basic Plan',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
      });

      const subscription = await paymentRepo.createSubscription({
        userId,
        planId: plan.id,
        provider: 'stripe',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const cancelled = await paymentRepo.cancelSubscription(subscription.id);
      expect(cancelled).not.toBeNull();
      expect(cancelled?.status).toBe('cancelled');
      expect(cancelled?.cancelledAt).toBeDefined();
    });

    // Plan tests
    it('should create plan', async () => {
      const plan = await paymentRepo.createPlan({
        name: 'Enterprise Plan',
        amount: 99.99,
        currency: 'USD',
        interval: 'month',
        intervalCount: 1,
        trialPeriodDays: 14,
      });

      expect(plan.id).toBeDefined();
      expect(plan.name).toBe('Enterprise Plan');
      expect(plan.amount).toBe(99.99);
      expect(plan.trialPeriodDays).toBe(14);
    });

    it('should find active plans', async () => {
      await paymentRepo.createPlan({
        name: 'Active Plan',
        amount: 19.99,
        currency: 'USD',
        interval: 'month',
        active: true,
      });

      await paymentRepo.createPlan({
        name: 'Inactive Plan',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        active: false,
      });

      const activePlans = await paymentRepo.findActivePlans();
      expect(activePlans.length).toBe(1);
      expect(activePlans[0].name).toBe('Active Plan');
    });

    // Webhook tests
    it('should store webhook event', async () => {
      const webhook = await paymentRepo.storeWebhookEvent({
        provider: 'stripe',
        type: 'payment.succeeded',
        data: { paymentId: 'pi_123', amount: 100 },
      });

      expect(webhook.id).toBeDefined();
    });

    it('should mark webhook as processed', async () => {
      const webhook = await paymentRepo.storeWebhookEvent({
        provider: 'paypal',
        type: 'payment.completed',
        data: { orderId: 'order_123' },
      });

      const marked = await paymentRepo.markWebhookProcessed(webhook.id);
      expect(marked).toBe(true);
    });
  });

  // ==========================================
  // ADAPTER TESTS
  // ==========================================

  describe('Mongoose Adapter', () => {
    it('should connect to MongoDB', async () => {
      const health = await adapter.healthCheck();
      expect(health).toBe(true);
    });

    it('should return mongoose type', () => {
      expect(adapter.getType()).toBe('mongoose');
      expect(adapter.getDatabaseType()).toBe('mongodb');
    });

    it('should get raw mongoose instance', () => {
      const mongoose = adapter.getRawClient();
      expect(mongoose).toBeDefined();
    });
  });
});
