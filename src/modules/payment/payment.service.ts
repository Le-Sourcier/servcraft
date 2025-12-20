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
import type { PaymentRepository } from './payment.repository.js';
import { createPaymentRepository } from './payment.repository.js';

export interface PaymentServiceConfig {
  stripe?: StripeConfig;
  paypal?: PayPalConfig;
  mobileMoney?: MobileMoneyConfig;
}

export class PaymentService {
  private stripeProvider?: StripeProvider;
  private paypalProvider?: PayPalProvider;
  private mobileMoneyProvider?: MobileMoneyProvider;
  private repository: PaymentRepository;

  constructor(config: PaymentServiceConfig = {}) {
    this.repository = createPaymentRepository();

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
    let providerPaymentId: string | undefined;
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
        providerPaymentId = intent.id;
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
        providerPaymentId = intent.id;
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
        providerPaymentId = intent.id;
        break;
      }

      default:
        intent = {
          id: '', // Will be set after payment creation
          status: 'pending',
          provider: 'manual',
        };
    }

    // Create payment in database
    const payment = await this.repository.createPayment({
      userId: data.userId,
      provider: data.provider,
      method: data.method || 'card',
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      metadata: data.metadata,
      providerPaymentId,
    });

    logger.info({ paymentId: payment.id, provider: data.provider }, 'Payment created');

    return {
      ...intent,
      id: payment.id,
    };
  }

  async confirmPayment(paymentId: string): Promise<Payment> {
    const payment = await this.repository.findPaymentById(paymentId);
    if (!payment) {
      throw new NotFoundError('Payment');
    }

    if (payment.provider === 'stripe' && this.stripeProvider && payment.providerPaymentId) {
      await this.stripeProvider.confirmPayment(payment.providerPaymentId);
    }

    const updatedPayment = await this.repository.updatePaymentStatus(paymentId, 'completed', {
      paidAt: new Date(),
    });

    if (!updatedPayment) {
      throw new NotFoundError('Payment');
    }

    logger.info({ paymentId }, 'Payment confirmed');
    return updatedPayment;
  }

  async refundPayment(paymentId: string, amount?: number): Promise<Payment> {
    const payment = await this.repository.findPaymentById(paymentId);
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

    const updatedPayment = await this.repository.updatePaymentStatus(paymentId, 'refunded', {
      refundedAmount: refundAmount,
    });

    if (!updatedPayment) {
      throw new NotFoundError('Payment');
    }

    logger.info({ paymentId, refundAmount }, 'Payment refunded');
    return updatedPayment;
  }

  async getPayment(paymentId: string): Promise<Payment | null> {
    return this.repository.findPaymentById(paymentId);
  }

  async getUserPayments(userId: string): Promise<Payment[]> {
    const result = await this.repository.findUserPayments(userId, { page: 1, limit: 100 });
    return result.data;
  }

  // Subscription methods
  async createSubscription(
    userId: string,
    planId: string,
    provider: PaymentProvider = 'stripe'
  ): Promise<Subscription> {
    const plan = await this.repository.findPlanById(planId);
    if (!plan) {
      throw new NotFoundError('Plan');
    }

    const currentPeriodStart = new Date();
    const currentPeriodEnd = this.calculatePeriodEnd(plan);

    const subscription = await this.repository.createSubscription({
      userId,
      planId,
      provider,
      currentPeriodStart,
      currentPeriodEnd,
    });

    logger.info({ subscriptionId: subscription.id, planId }, 'Subscription created');
    return subscription;
  }

  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.repository.cancelSubscription(subscriptionId);
    if (!subscription) {
      throw new NotFoundError('Subscription');
    }

    logger.info({ subscriptionId }, 'Subscription cancelled');
    return subscription;
  }

  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    return this.repository.findSubscriptionById(subscriptionId);
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return this.repository.findUserSubscriptions(userId);
  }

  // Plan methods
  async createPlan(planData: Omit<Plan, 'id'>): Promise<Plan> {
    const plan = await this.repository.createPlan({
      name: planData.name,
      description: planData.description,
      amount: planData.amount,
      currency: planData.currency,
      interval: planData.interval,
      intervalCount: planData.intervalCount,
      trialDays: planData.trialDays,
      features: planData.features,
      metadata: planData.metadata,
      active: planData.active,
    });

    logger.info({ planId: plan.id }, 'Plan created');
    return plan;
  }

  async getPlans(): Promise<Plan[]> {
    return this.repository.findActivePlans();
  }

  async getPlan(planId: string): Promise<Plan | null> {
    return this.repository.findPlanById(planId);
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
    const providerPaymentId = data.object.id as string;

    // Store webhook event
    await this.repository.storeWebhookEvent({
      provider: 'stripe',
      type,
      data: data.object,
    });

    // Find payment by provider payment ID
    const payment = await this.repository.findPaymentByProviderPaymentId(providerPaymentId);
    if (!payment) {
      logger.warn({ providerPaymentId, type }, 'Payment not found for webhook event');
      return;
    }

    switch (type) {
      case 'payment_intent.succeeded':
        await this.repository.updatePaymentStatus(payment.id, 'completed', {
          paidAt: new Date(),
        });
        logger.info({ paymentId: payment.id }, 'Payment completed via webhook');
        break;

      case 'payment_intent.payment_failed': {
        const failureReason = (data.object.last_payment_error as { message?: string })?.message;
        await this.repository.updatePaymentStatus(payment.id, 'failed', {
          failureReason,
        });
        logger.info({ paymentId: payment.id, failureReason }, 'Payment failed via webhook');
        break;
      }
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
