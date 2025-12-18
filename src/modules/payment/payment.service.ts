import { randomUUID } from 'crypto';
import { logger } from '../../core/logger.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import type {
  Payment,
  PaymentIntent,
  CreatePaymentData,
  PaymentProvider,
  StripeConfig,
  PayPalConfig,
  MobileMoneyConfig,
  Subscription,
  Plan,
} from './types.js';
import { StripeProvider } from './providers/stripe.provider.js';
import { PayPalProvider } from './providers/paypal.provider.js';
import { MobileMoneyProvider } from './providers/mobile-money.provider.js';

// In-memory storage (replace with database in production)
const payments = new Map<string, Payment>();
const subscriptions = new Map<string, Subscription>();
const plans = new Map<string, Plan>();

export interface PaymentServiceConfig {
  stripe?: StripeConfig;
  paypal?: PayPalConfig;
  mobileMoney?: MobileMoneyConfig;
}

export class PaymentService {
  private stripeProvider?: StripeProvider;
  private paypalProvider?: PayPalProvider;
  private mobileMoneyProvider?: MobileMoneyProvider;

  constructor(config: PaymentServiceConfig = {}) {
    if (config.stripe) {
      this.stripeProvider = new StripeProvider(config.stripe);
    }
    if (config.paypal) {
      this.paypalProvider = new PayPalProvider(config.paypal);
    }
    if (config.mobileMoney) {
      this.mobileMoneyProvider = new MobileMoneyProvider(config.mobileMoney);
    }
  }

  // Payment methods
  async createPayment(data: CreatePaymentData): Promise<PaymentIntent> {
    const payment: Payment = {
      id: randomUUID(),
      userId: data.userId,
      provider: data.provider,
      method: data.method || 'card',
      status: 'pending',
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      metadata: data.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let intent: PaymentIntent;

    switch (data.provider) {
      case 'stripe':
        if (!this.stripeProvider) {
          throw new BadRequestError('Stripe not configured');
        }
        intent = await this.stripeProvider.createPaymentIntent({
          amount: data.amount,
          currency: data.currency,
          description: data.description,
          metadata: data.metadata as Record<string, string>,
        });
        payment.providerPaymentId = intent.id;
        break;

      case 'paypal':
        if (!this.paypalProvider) {
          throw new BadRequestError('PayPal not configured');
        }
        intent = await this.paypalProvider.createOrder({
          amount: data.amount,
          currency: data.currency,
          description: data.description,
          returnUrl: data.returnUrl || '',
          cancelUrl: data.cancelUrl || '',
        });
        payment.providerPaymentId = intent.id;
        break;

      case 'mobile_money': {
        if (!this.mobileMoneyProvider) {
          throw new BadRequestError('Mobile Money not configured');
        }
        const phoneNumber = data.metadata?.phoneNumber as string;
        if (!phoneNumber) {
          throw new BadRequestError('Phone number required for Mobile Money');
        }
        intent = await this.mobileMoneyProvider.initiatePayment({
          amount: data.amount,
          currency: data.currency,
          phoneNumber,
          description: data.description,
        });
        payment.providerPaymentId = intent.id;
        break;
      }

      default:
        intent = {
          id: payment.id,
          status: 'pending',
          provider: 'manual',
        };
    }

    payments.set(payment.id, payment);
    logger.info({ paymentId: payment.id, provider: data.provider }, 'Payment created');

    return {
      ...intent,
      id: payment.id,
    };
  }

  async confirmPayment(paymentId: string): Promise<Payment> {
    const payment = payments.get(paymentId);
    if (!payment) {
      throw new NotFoundError('Payment');
    }

    if (payment.provider === 'stripe' && this.stripeProvider && payment.providerPaymentId) {
      await this.stripeProvider.confirmPayment(payment.providerPaymentId);
    }

    payment.status = 'completed';
    payment.paidAt = new Date();
    payment.updatedAt = new Date();
    payments.set(paymentId, payment);

    logger.info({ paymentId }, 'Payment confirmed');
    return payment;
  }

  async refundPayment(paymentId: string, amount?: number): Promise<Payment> {
    const payment = payments.get(paymentId);
    if (!payment) {
      throw new NotFoundError('Payment');
    }

    if (payment.status !== 'completed') {
      throw new BadRequestError('Payment cannot be refunded');
    }

    const refundAmount = amount || payment.amount;

    if (payment.provider === 'stripe' && this.stripeProvider && payment.providerPaymentId) {
      await this.stripeProvider.refundPayment(payment.providerPaymentId, refundAmount);
    } else if (payment.provider === 'paypal' && this.paypalProvider && payment.providerPaymentId) {
      await this.paypalProvider.refundPayment(
        payment.providerPaymentId,
        refundAmount,
        payment.currency
      );
    }

    payment.status = 'refunded';
    payment.refundedAmount = refundAmount;
    payment.updatedAt = new Date();
    payments.set(paymentId, payment);

    logger.info({ paymentId, refundAmount }, 'Payment refunded');
    return payment;
  }

  async getPayment(paymentId: string): Promise<Payment | null> {
    return payments.get(paymentId) || null;
  }

  async getUserPayments(userId: string): Promise<Payment[]> {
    const userPayments: Payment[] = [];
    for (const payment of payments.values()) {
      if (payment.userId === userId) {
        userPayments.push(payment);
      }
    }
    return userPayments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Subscription methods
  async createSubscription(
    userId: string,
    planId: string,
    provider: PaymentProvider = 'stripe'
  ): Promise<Subscription> {
    const plan = plans.get(planId);
    if (!plan) {
      throw new NotFoundError('Plan');
    }

    const subscription: Subscription = {
      id: randomUUID(),
      userId,
      planId,
      provider,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: this.calculatePeriodEnd(plan),
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    subscriptions.set(subscription.id, subscription);
    logger.info({ subscriptionId: subscription.id, planId }, 'Subscription created');

    return subscription;
  }

  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new NotFoundError('Subscription');
    }

    subscription.cancelAtPeriodEnd = true;
    subscription.updatedAt = new Date();
    subscriptions.set(subscriptionId, subscription);

    logger.info({ subscriptionId }, 'Subscription cancelled');
    return subscription;
  }

  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    return subscriptions.get(subscriptionId) || null;
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    const userSubs: Subscription[] = [];
    for (const sub of subscriptions.values()) {
      if (sub.userId === userId) {
        userSubs.push(sub);
      }
    }
    return userSubs;
  }

  // Plan methods
  async createPlan(planData: Omit<Plan, 'id'>): Promise<Plan> {
    const plan: Plan = {
      id: randomUUID(),
      ...planData,
    };
    plans.set(plan.id, plan);
    return plan;
  }

  async getPlans(): Promise<Plan[]> {
    return Array.from(plans.values()).filter((p) => p.active);
  }

  async getPlan(planId: string): Promise<Plan | null> {
    return plans.get(planId) || null;
  }

  // Webhook handling
  async handleWebhook(
    provider: PaymentProvider,
    payload: string,
    signature: string
  ): Promise<void> {
    logger.info({ provider }, 'Processing payment webhook');

    switch (provider) {
      case 'stripe':
        if (this.stripeProvider) {
          const event = this.stripeProvider.verifyWebhookSignature(payload, signature);
          if (event) {
            await this.processStripeEvent(event);
          }
        }
        break;
      case 'paypal':
        // Handle PayPal webhook
        break;
      case 'mobile_money':
        // Handle Mobile Money callback
        break;
    }
  }

  private async processStripeEvent(event: Record<string, unknown>): Promise<void> {
    const type = event.type as string;
    const data = event.data as { object: Record<string, unknown> };

    switch (type) {
      case 'payment_intent.succeeded':
        // Find and update payment
        for (const payment of payments.values()) {
          if (payment.providerPaymentId === data.object.id) {
            payment.status = 'completed';
            payment.paidAt = new Date();
            payment.updatedAt = new Date();
            payments.set(payment.id, payment);
            break;
          }
        }
        break;
      case 'payment_intent.payment_failed':
        for (const payment of payments.values()) {
          if (payment.providerPaymentId === data.object.id) {
            payment.status = 'failed';
            payment.failureReason = (
              data.object.last_payment_error as { message?: string }
            )?.message;
            payment.updatedAt = new Date();
            payments.set(payment.id, payment);
            break;
          }
        }
        break;
    }
  }

  private calculatePeriodEnd(plan: Plan): Date {
    const now = new Date();
    switch (plan.interval) {
      case 'day':
        return new Date(now.setDate(now.getDate() + plan.intervalCount));
      case 'week':
        return new Date(now.setDate(now.getDate() + 7 * plan.intervalCount));
      case 'month':
        return new Date(now.setMonth(now.getMonth() + plan.intervalCount));
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() + plan.intervalCount));
      default:
        return new Date(now.setMonth(now.getMonth() + 1));
    }
  }
}

let paymentService: PaymentService | null = null;

export function getPaymentService(): PaymentService {
  if (!paymentService) {
    paymentService = new PaymentService();
  }
  return paymentService;
}

export function createPaymentService(config: PaymentServiceConfig): PaymentService {
  paymentService = new PaymentService(config);
  return paymentService;
}
