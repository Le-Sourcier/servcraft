import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../src/database/prisma.js';
import { PaymentRepository } from '../../src/modules/payment/payment.repository.js';
import { UserRepository } from '../../src/modules/user/user.repository.js';

describe('PaymentRepository - Prisma Integration', () => {
  let paymentRepo: PaymentRepository;
  let userRepo: UserRepository;
  let testUserId: string;

  beforeAll(async () => {
    paymentRepo = new PaymentRepository();
    userRepo = new UserRepository();

    // Create a test user
    const user = await userRepo.create({
      email: 'payment-test@example.com',
      password: 'hashedpassword123',
      name: 'Payment Test User',
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await userRepo.clear();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await paymentRepo.clearPayments();
    await paymentRepo.clearSubscriptions();
    await paymentRepo.clearPlans();
    await paymentRepo.clearWebhooks();
  });

  // ==========================================
  // PAYMENT TESTS
  // ==========================================

  describe('Payment Operations', () => {
    it('should create a new payment', async () => {
      const payment = await paymentRepo.createPayment({
        userId: testUserId,
        provider: 'stripe',
        method: 'card',
        amount: 99.99,
        currency: 'USD',
        description: 'Test payment',
        metadata: { orderId: '12345' },
      });

      expect(payment).toBeDefined();
      expect(payment.id).toBeDefined();
      expect(payment.userId).toBe(testUserId);
      expect(payment.provider).toBe('stripe');
      expect(payment.method).toBe('card');
      expect(payment.status).toBe('pending');
      expect(payment.amount).toBe(99.99);
      expect(payment.currency).toBe('USD');
      expect(payment.createdAt).toBeInstanceOf(Date);
    });

    it('should find payment by ID', async () => {
      const created = await paymentRepo.createPayment({
        userId: testUserId,
        provider: 'paypal',
        method: 'paypal',
        amount: 49.99,
        currency: 'EUR',
      });

      const found = await paymentRepo.findPaymentById(created.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.amount).toBe(49.99);
    });

    it('should return null for non-existent payment ID', async () => {
      const found = await paymentRepo.findPaymentById('non-existent-id');
      expect(found).toBeNull();
    });

    it('should find payment by provider payment ID', async () => {
      const providerPaymentId = 'pi_test_12345';
      const created = await paymentRepo.createPayment({
        userId: testUserId,
        provider: 'stripe',
        method: 'card',
        amount: 99.99,
        currency: 'USD',
        providerPaymentId,
      });

      const found = await paymentRepo.findPaymentByProviderPaymentId(providerPaymentId);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.providerPaymentId).toBe(providerPaymentId);
    });

    it('should find user payments with pagination', async () => {
      // Create multiple payments
      await Promise.all([
        paymentRepo.createPayment({
          userId: testUserId,
          provider: 'stripe',
          method: 'card',
          amount: 10,
          currency: 'USD',
        }),
        paymentRepo.createPayment({
          userId: testUserId,
          provider: 'paypal',
          method: 'paypal',
          amount: 20,
          currency: 'USD',
        }),
        paymentRepo.createPayment({
          userId: testUserId,
          provider: 'stripe',
          method: 'card',
          amount: 30,
          currency: 'USD',
        }),
      ]);

      const result = await paymentRepo.findUserPayments(testUserId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(3);
      expect(result.meta.total).toBe(3);
      expect(result.meta.page).toBe(1);
    });

    it('should update payment status to completed', async () => {
      const payment = await paymentRepo.createPayment({
        userId: testUserId,
        provider: 'stripe',
        method: 'card',
        amount: 99.99,
        currency: 'USD',
      });

      const paidAt = new Date();
      const updated = await paymentRepo.updatePaymentStatus(payment.id, 'completed', {
        paidAt,
      });

      expect(updated).toBeDefined();
      expect(updated?.status).toBe('completed');
      expect(updated?.paidAt).toBeInstanceOf(Date);
    });

    it('should update payment status to failed', async () => {
      const payment = await paymentRepo.createPayment({
        userId: testUserId,
        provider: 'stripe',
        method: 'card',
        amount: 99.99,
        currency: 'USD',
      });

      const updated = await paymentRepo.updatePaymentStatus(payment.id, 'failed', {
        failureReason: 'Insufficient funds',
      });

      expect(updated).toBeDefined();
      expect(updated?.status).toBe('failed');
      expect(updated?.failureReason).toBe('Insufficient funds');
    });

    it('should update payment status to refunded', async () => {
      const payment = await paymentRepo.createPayment({
        userId: testUserId,
        provider: 'stripe',
        method: 'card',
        amount: 99.99,
        currency: 'USD',
      });

      await paymentRepo.updatePaymentStatus(payment.id, 'completed', { paidAt: new Date() });

      const updated = await paymentRepo.updatePaymentStatus(payment.id, 'refunded', {
        refundedAmount: 99.99,
      });

      expect(updated).toBeDefined();
      expect(updated?.status).toBe('refunded');
      expect(updated?.refundedAmount).toBe(99.99);
    });

    it('should delete payment', async () => {
      const payment = await paymentRepo.createPayment({
        userId: testUserId,
        provider: 'stripe',
        method: 'card',
        amount: 99.99,
        currency: 'USD',
      });

      const deleted = await paymentRepo.deletePayment(payment.id);
      expect(deleted).toBe(true);

      const found = await paymentRepo.findPaymentById(payment.id);
      expect(found).toBeNull();
    });

    it('should count payments with filters', async () => {
      await Promise.all([
        paymentRepo.createPayment({
          userId: testUserId,
          provider: 'stripe',
          method: 'card',
          amount: 10,
          currency: 'USD',
        }),
        paymentRepo.createPayment({
          userId: testUserId,
          provider: 'paypal',
          method: 'paypal',
          amount: 20,
          currency: 'USD',
        }),
      ]);

      const allCount = await paymentRepo.countPayments();
      expect(allCount).toBe(2);

      const stripeCount = await paymentRepo.countPayments({ provider: 'stripe' });
      expect(stripeCount).toBe(1);
    });

    it('should filter payments by status', async () => {
      const payment1 = await paymentRepo.createPayment({
        userId: testUserId,
        provider: 'stripe',
        method: 'card',
        amount: 10,
        currency: 'USD',
      });

      await paymentRepo.createPayment({
        userId: testUserId,
        provider: 'stripe',
        method: 'card',
        amount: 20,
        currency: 'USD',
      });

      await paymentRepo.updatePaymentStatus(payment1.id, 'completed', { paidAt: new Date() });

      const result = await paymentRepo.findPayments(
        { page: 1, limit: 10 },
        { status: 'completed' }
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.status).toBe('completed');
    });
  });

  // ==========================================
  // SUBSCRIPTION TESTS
  // ==========================================

  describe('Subscription Operations', () => {
    let testPlanId: string;

    beforeEach(async () => {
      const plan = await paymentRepo.createPlan({
        name: 'Test Plan',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        intervalCount: 1,
      });
      testPlanId = plan.id;
    });

    it('should create a new subscription', async () => {
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      const subscription = await paymentRepo.createSubscription({
        userId: testUserId,
        planId: testPlanId,
        provider: 'stripe',
        currentPeriodStart,
        currentPeriodEnd,
      });

      expect(subscription).toBeDefined();
      expect(subscription.id).toBeDefined();
      expect(subscription.userId).toBe(testUserId);
      expect(subscription.planId).toBe(testPlanId);
      expect(subscription.status).toBe('active');
      expect(subscription.cancelAtPeriodEnd).toBe(false);
    });

    it('should find subscription by ID', async () => {
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      const created = await paymentRepo.createSubscription({
        userId: testUserId,
        planId: testPlanId,
        provider: 'stripe',
        currentPeriodStart,
        currentPeriodEnd,
      });

      const found = await paymentRepo.findSubscriptionById(created.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should find user subscriptions', async () => {
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      await Promise.all([
        paymentRepo.createSubscription({
          userId: testUserId,
          planId: testPlanId,
          provider: 'stripe',
          currentPeriodStart,
          currentPeriodEnd,
        }),
        paymentRepo.createSubscription({
          userId: testUserId,
          planId: testPlanId,
          provider: 'stripe',
          currentPeriodStart,
          currentPeriodEnd,
        }),
      ]);

      const subscriptions = await paymentRepo.findUserSubscriptions(testUserId);
      expect(subscriptions).toHaveLength(2);
    });

    it('should update subscription status', async () => {
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      const subscription = await paymentRepo.createSubscription({
        userId: testUserId,
        planId: testPlanId,
        provider: 'stripe',
        currentPeriodStart,
        currentPeriodEnd,
      });

      const updated = await paymentRepo.updateSubscriptionStatus(subscription.id, 'past_due');
      expect(updated).toBeDefined();
      expect(updated?.status).toBe('past_due');
    });

    it('should cancel subscription', async () => {
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      const subscription = await paymentRepo.createSubscription({
        userId: testUserId,
        planId: testPlanId,
        provider: 'stripe',
        currentPeriodStart,
        currentPeriodEnd,
      });

      const cancelled = await paymentRepo.cancelSubscription(subscription.id);
      expect(cancelled).toBeDefined();
      expect(cancelled?.cancelAtPeriodEnd).toBe(true);
    });

    it('should delete subscription', async () => {
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      const subscription = await paymentRepo.createSubscription({
        userId: testUserId,
        planId: testPlanId,
        provider: 'stripe',
        currentPeriodStart,
        currentPeriodEnd,
      });

      const deleted = await paymentRepo.deleteSubscription(subscription.id);
      expect(deleted).toBe(true);

      const found = await paymentRepo.findSubscriptionById(subscription.id);
      expect(found).toBeNull();
    });
  });

  // ==========================================
  // PLAN TESTS
  // ==========================================

  describe('Plan Operations', () => {
    it('should create a new plan', async () => {
      const plan = await paymentRepo.createPlan({
        name: 'Premium Plan',
        description: 'Premium features',
        amount: 29.99,
        currency: 'USD',
        interval: 'month',
        intervalCount: 1,
        trialDays: 7,
        features: ['Feature 1', 'Feature 2'],
        metadata: { priority: 'high' },
        active: true,
      });

      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
      expect(plan.name).toBe('Premium Plan');
      expect(plan.amount).toBe(29.99);
      expect(plan.interval).toBe('month');
      expect(plan.trialDays).toBe(7);
      expect(plan.active).toBe(true);
    });

    it('should find plan by ID', async () => {
      const created = await paymentRepo.createPlan({
        name: 'Basic Plan',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        intervalCount: 1,
      });

      const found = await paymentRepo.findPlanById(created.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Basic Plan');
    });

    it('should find all active plans', async () => {
      await Promise.all([
        paymentRepo.createPlan({
          name: 'Plan 1',
          amount: 9.99,
          currency: 'USD',
          interval: 'month',
          intervalCount: 1,
          active: true,
        }),
        paymentRepo.createPlan({
          name: 'Plan 2',
          amount: 19.99,
          currency: 'USD',
          interval: 'month',
          intervalCount: 1,
          active: true,
        }),
        paymentRepo.createPlan({
          name: 'Plan 3',
          amount: 29.99,
          currency: 'USD',
          interval: 'month',
          intervalCount: 1,
          active: false,
        }),
      ]);

      const activePlans = await paymentRepo.findActivePlans();
      expect(activePlans).toHaveLength(2);
      expect(activePlans.every((p) => p.active)).toBe(true);
    });

    it('should update plan', async () => {
      const plan = await paymentRepo.createPlan({
        name: 'Original Plan',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        intervalCount: 1,
      });

      const updated = await paymentRepo.updatePlan(plan.id, {
        name: 'Updated Plan',
        amount: 14.99,
        active: false,
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Plan');
      expect(updated?.amount).toBe(14.99);
      expect(updated?.active).toBe(false);
    });

    it('should delete plan', async () => {
      const plan = await paymentRepo.createPlan({
        name: 'To Delete',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        intervalCount: 1,
      });

      const deleted = await paymentRepo.deletePlan(plan.id);
      expect(deleted).toBe(true);

      const found = await paymentRepo.findPlanById(plan.id);
      expect(found).toBeNull();
    });
  });

  // ==========================================
  // WEBHOOK TESTS
  // ==========================================

  describe('Webhook Operations', () => {
    it('should store webhook event', async () => {
      const webhook = await paymentRepo.storeWebhookEvent({
        provider: 'stripe',
        type: 'payment_intent.succeeded',
        data: {
          id: 'pi_test_123',
          amount: 9999,
          currency: 'usd',
        },
      });

      expect(webhook).toBeDefined();
      expect(webhook.id).toBeDefined();
    });

    it('should mark webhook as processed', async () => {
      const webhook = await paymentRepo.storeWebhookEvent({
        provider: 'stripe',
        type: 'payment_intent.succeeded',
        data: { id: 'pi_test_123' },
      });

      await paymentRepo.markWebhookProcessed(webhook.id);

      // Verify it's marked as processed
      const processed = await prisma.paymentWebhook.findUnique({
        where: { id: webhook.id },
      });

      expect(processed?.processed).toBe(true);
    });

    it('should mark webhook as processed with error', async () => {
      const webhook = await paymentRepo.storeWebhookEvent({
        provider: 'stripe',
        type: 'payment_intent.failed',
        data: { id: 'pi_test_456' },
      });

      await paymentRepo.markWebhookProcessed(webhook.id, 'Payment not found');

      const processed = await prisma.paymentWebhook.findUnique({
        where: { id: webhook.id },
      });

      expect(processed?.processed).toBe(true);
      expect(processed?.error).toBe('Payment not found');
    });
  });

  // ==========================================
  // ENUM MAPPING TESTS
  // ==========================================

  describe('Enum Mapping', () => {
    it('should correctly map all payment providers', async () => {
      const providers: Array<'stripe' | 'paypal' | 'mobile_money' | 'manual'> = [
        'stripe',
        'paypal',
        'mobile_money',
        'manual',
      ];

      for (const provider of providers) {
        const payment = await paymentRepo.createPayment({
          userId: testUserId,
          provider,
          method: 'card',
          amount: 10,
          currency: 'USD',
        });

        expect(payment.provider).toBe(provider);

        const found = await paymentRepo.findPaymentById(payment.id);
        expect(found?.provider).toBe(provider);
      }
    });

    it('should correctly map all payment statuses', async () => {
      const payment = await paymentRepo.createPayment({
        userId: testUserId,
        provider: 'stripe',
        method: 'card',
        amount: 10,
        currency: 'USD',
      });

      const statuses: Array<
        'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled'
      > = ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'];

      for (const status of statuses) {
        const updated = await paymentRepo.updatePaymentStatus(payment.id, status);
        expect(updated?.status).toBe(status);
      }
    });

    it('should correctly map all plan intervals', async () => {
      const intervals: Array<'day' | 'week' | 'month' | 'year'> = ['day', 'week', 'month', 'year'];

      for (const interval of intervals) {
        const plan = await paymentRepo.createPlan({
          name: `${interval} plan`,
          amount: 9.99,
          currency: 'USD',
          interval,
          intervalCount: 1,
        });

        expect(plan.interval).toBe(interval);

        const found = await paymentRepo.findPlanById(plan.id);
        expect(found?.interval).toBe(interval);
      }
    });
  });
});
