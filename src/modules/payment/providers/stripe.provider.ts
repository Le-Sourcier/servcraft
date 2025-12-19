import { logger } from '../../../core/logger.js';
import type { StripeConfig, StripePaymentData, PaymentIntent, Payment } from '../types.js';

/**
 * Stripe Payment Provider
 * Note: Requires 'stripe' package to be installed
 * npm install stripe
 */
export class StripeProvider {
  private stripe: unknown;
  private config: StripeConfig;

  constructor(config: StripeConfig) {
    this.config = config;
    this.initStripe();
  }

  private async initStripe(): Promise<void> {
    try {
      // Dynamic import to avoid requiring stripe if not used
      const Stripe = await import('stripe');
      this.stripe = new Stripe.default(this.config.secretKey, {
        apiVersion: '2025-02-24.acacia',
      });
      logger.info('Stripe provider initialized');
    } catch {
      logger.warn('Stripe package not installed. Run: npm install stripe');
    }
  }

  async createPaymentIntent(data: StripePaymentData): Promise<PaymentIntent> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    const stripe = this.stripe as {
      paymentIntents: {
        create: (params: Record<string, unknown>) => Promise<{
          id: string;
          client_secret: string;
          status: string;
        }>;
      };
    };

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(data.amount * 100), // Convert to cents
      currency: data.currency.toLowerCase(),
      customer: data.customerId,
      payment_method: data.paymentMethodId,
      description: data.description,
      metadata: data.metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: this.mapStripeStatus(paymentIntent.status),
      provider: 'stripe',
    };
  }

  async confirmPayment(paymentIntentId: string): Promise<PaymentIntent> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    const stripe = this.stripe as {
      paymentIntents: {
        confirm: (id: string) => Promise<{
          id: string;
          client_secret: string;
          status: string;
        }>;
      };
    };

    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: this.mapStripeStatus(paymentIntent.status),
      provider: 'stripe',
    };
  }

  async refundPayment(paymentIntentId: string, amount?: number): Promise<boolean> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    const stripe = this.stripe as {
      refunds: {
        create: (params: Record<string, unknown>) => Promise<{ id: string }>;
      };
    };

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amount ? { amount: Math.round(amount * 100) } : {}),
    });

    return !!refund.id;
  }

  async createCustomer(email: string, name?: string): Promise<string> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    const stripe = this.stripe as {
      customers: {
        create: (params: Record<string, unknown>) => Promise<{ id: string }>;
      };
    };

    const customer = await stripe.customers.create({
      email,
      name,
    });

    return customer.id;
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    trialDays?: number
  ): Promise<{ subscriptionId: string; clientSecret?: string }> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    const stripe = this.stripe as {
      subscriptions: {
        create: (params: Record<string, unknown>) => Promise<{
          id: string;
          latest_invoice: { payment_intent: { client_secret: string } };
        }>;
      };
    };

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      ...(trialDays ? { trial_period_days: trialDays } : {}),
    });

    return {
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    const stripe = this.stripe as {
      subscriptions: {
        cancel: (id: string) => Promise<{ id: string }>;
      };
    };

    const result = await stripe.subscriptions.cancel(subscriptionId);
    return !!result.id;
  }

  verifyWebhookSignature(payload: string, signature: string): Record<string, unknown> | null {
    if (!this.stripe || !this.config.webhookSecret) {
      return null;
    }

    try {
      const stripe = this.stripe as {
        webhooks: {
          constructEvent: (
            payload: string,
            signature: string,
            secret: string
          ) => Record<string, unknown>;
        };
      };

      return stripe.webhooks.constructEvent(payload, signature, this.config.webhookSecret);
    } catch {
      logger.error('Stripe webhook signature verification failed');
      return null;
    }
  }

  private mapStripeStatus(status: string): Payment['status'] {
    const statusMap: Record<string, Payment['status']> = {
      requires_payment_method: 'pending',
      requires_confirmation: 'pending',
      requires_action: 'processing',
      processing: 'processing',
      requires_capture: 'processing',
      canceled: 'cancelled',
      succeeded: 'completed',
    };
    return statusMap[status] || 'pending';
  }
}

export function createStripeProvider(config: StripeConfig): StripeProvider {
  return new StripeProvider(config);
}
