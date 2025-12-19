import { prisma } from '../../database/prisma.js';
import type { PaginatedResult, PaginationParams } from '../../types/index.js';
import { createPaginatedResult, getSkip } from '../../utils/pagination.js';
import type { Payment, Subscription, Plan } from './types.js';
import {
  PaymentProvider,
  PaymentStatus,
  PaymentMethod,
  SubscriptionStatus,
  PlanInterval,
} from '@prisma/client';

/**
 * Payment Repository - Prisma Implementation
 * Manages payment, subscription, and plan persistence
 */
export class PaymentRepository {
  // ==========================================
  // PAYMENT METHODS
  // ==========================================

  /**
   * Create a new payment
   */
  async createPayment(data: {
    userId: string;
    provider: Payment['provider'];
    method: Payment['method'];
    amount: number;
    currency: string;
    description?: string;
    metadata?: Record<string, unknown>;
    providerPaymentId?: string;
    providerCustomerId?: string;
  }): Promise<Payment> {
    const payment = await prisma.payment.create({
      data: {
        userId: data.userId,
        provider: this.mapProviderToEnum(data.provider),
        method: this.mapMethodToEnum(data.method),
        status: PaymentStatus.PENDING,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        metadata: data.metadata as object | undefined,
        providerPaymentId: data.providerPaymentId,
        providerCustomerId: data.providerCustomerId,
      },
    });

    return this.mapPrismaPaymentToPayment(payment);
  }

  /**
   * Find payment by ID
   */
  async findPaymentById(id: string): Promise<Payment | null> {
    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) return null;
    return this.mapPrismaPaymentToPayment(payment);
  }

  /**
   * Find payment by provider payment ID
   */
  async findPaymentByProviderPaymentId(providerPaymentId: string): Promise<Payment | null> {
    const payment = await prisma.payment.findUnique({
      where: { providerPaymentId },
    });

    if (!payment) return null;
    return this.mapPrismaPaymentToPayment(payment);
  }

  /**
   * Find user payments with pagination
   */
  async findUserPayments(
    userId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<Payment>> {
    const where = { userId };
    const orderBy = { createdAt: 'desc' as const };

    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy,
        skip: getSkip(params),
        take: params.limit,
      }),
      prisma.payment.count({ where }),
    ]);

    const mappedPayments = data.map((payment) => this.mapPrismaPaymentToPayment(payment));

    return createPaginatedResult(mappedPayments, total, params);
  }

  /**
   * Find payments with filters and pagination
   */
  async findPayments(
    params: PaginationParams,
    filters?: {
      userId?: string;
      provider?: Payment['provider'];
      status?: Payment['status'];
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<PaginatedResult<Payment>> {
    const where: Record<string, unknown> = {};

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.provider) where.provider = this.mapProviderToEnum(filters.provider);
    if (filters?.status) where.status = this.mapStatusToEnum(filters.status);
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {
        ...(filters.startDate && { gte: filters.startDate }),
        ...(filters.endDate && { lte: filters.endDate }),
      };
    }

    const orderBy = { createdAt: 'desc' as const };

    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy,
        skip: getSkip(params),
        take: params.limit,
      }),
      prisma.payment.count({ where }),
    ]);

    const mappedPayments = data.map((payment) => this.mapPrismaPaymentToPayment(payment));

    return createPaginatedResult(mappedPayments, total, params);
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    id: string,
    status: Payment['status'],
    data?: {
      paidAt?: Date;
      failureReason?: string;
      refundedAmount?: number;
    }
  ): Promise<Payment | null> {
    try {
      const payment = await prisma.payment.update({
        where: { id },
        data: {
          status: this.mapStatusToEnum(status),
          ...(data?.paidAt && { paidAt: data.paidAt }),
          ...(data?.failureReason && { failureReason: data.failureReason }),
          ...(data?.refundedAmount !== undefined && { refundedAmount: data.refundedAmount }),
        },
      });

      return this.mapPrismaPaymentToPayment(payment);
    } catch {
      return null;
    }
  }

  /**
   * Delete payment by ID
   */
  async deletePayment(id: string): Promise<boolean> {
    try {
      await prisma.payment.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Count payments with filters
   */
  async countPayments(filters?: {
    userId?: string;
    provider?: Payment['provider'];
    status?: Payment['status'];
  }): Promise<number> {
    const where: Record<string, unknown> = {};

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.provider) where.provider = this.mapProviderToEnum(filters.provider);
    if (filters?.status) where.status = this.mapStatusToEnum(filters.status);

    return prisma.payment.count({ where });
  }

  // ==========================================
  // SUBSCRIPTION METHODS
  // ==========================================

  /**
   * Create a new subscription
   */
  async createSubscription(data: {
    userId: string;
    planId: string;
    provider: Subscription['provider'];
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    providerSubscriptionId?: string;
  }): Promise<Subscription> {
    const subscription = await prisma.subscription.create({
      data: {
        userId: data.userId,
        planId: data.planId,
        provider: this.mapProviderToEnum(data.provider),
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        providerSubscriptionId: data.providerSubscriptionId,
        cancelAtPeriodEnd: false,
      },
      include: {
        plan: true,
      },
    });

    return this.mapPrismaSubscriptionToSubscription(subscription);
  }

  /**
   * Find subscription by ID
   */
  async findSubscriptionById(id: string): Promise<Subscription | null> {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        plan: true,
      },
    });

    if (!subscription) return null;
    return this.mapPrismaSubscriptionToSubscription(subscription);
  }

  /**
   * Find user subscriptions
   */
  async findUserSubscriptions(userId: string): Promise<Subscription[]> {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map((sub) => this.mapPrismaSubscriptionToSubscription(sub));
  }

  /**
   * Update subscription status
   */
  async updateSubscriptionStatus(
    id: string,
    status: Subscription['status']
  ): Promise<Subscription | null> {
    try {
      const subscription = await prisma.subscription.update({
        where: { id },
        data: {
          status: this.mapSubscriptionStatusToEnum(status),
        },
        include: {
          plan: true,
        },
      });

      return this.mapPrismaSubscriptionToSubscription(subscription);
    } catch {
      return null;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(id: string): Promise<Subscription | null> {
    try {
      const subscription = await prisma.subscription.update({
        where: { id },
        data: {
          cancelAtPeriodEnd: true,
        },
        include: {
          plan: true,
        },
      });

      return this.mapPrismaSubscriptionToSubscription(subscription);
    } catch {
      return null;
    }
  }

  /**
   * Delete subscription by ID
   */
  async deleteSubscription(id: string): Promise<boolean> {
    try {
      await prisma.subscription.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================
  // PLAN METHODS
  // ==========================================

  /**
   * Create a new plan
   */
  async createPlan(data: {
    name: string;
    description?: string;
    amount: number;
    currency: string;
    interval: Plan['interval'];
    intervalCount: number;
    trialDays?: number;
    features?: string[];
    metadata?: Record<string, unknown>;
    active?: boolean;
  }): Promise<Plan> {
    const plan = await prisma.plan.create({
      data: {
        name: data.name,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        interval: this.mapIntervalToEnum(data.interval),
        intervalCount: data.intervalCount,
        trialDays: data.trialDays,
        features: data.features as object | undefined,
        metadata: data.metadata as object | undefined,
        active: data.active ?? true,
      },
    });

    return this.mapPrismaPlanToPlan(plan);
  }

  /**
   * Find plan by ID
   */
  async findPlanById(id: string): Promise<Plan | null> {
    const plan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) return null;
    return this.mapPrismaPlanToPlan(plan);
  }

  /**
   * Find all active plans
   */
  async findActivePlans(): Promise<Plan[]> {
    const plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: { amount: 'asc' },
    });

    return plans.map((plan) => this.mapPrismaPlanToPlan(plan));
  }

  /**
   * Update plan
   */
  async updatePlan(
    id: string,
    data: {
      name?: string;
      description?: string;
      amount?: number;
      currency?: string;
      active?: boolean;
      features?: string[];
      metadata?: Record<string, unknown>;
    }
  ): Promise<Plan | null> {
    try {
      const plan = await prisma.plan.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.amount !== undefined && { amount: data.amount }),
          ...(data.currency && { currency: data.currency }),
          ...(data.active !== undefined && { active: data.active }),
          ...(data.features && { features: data.features as object }),
          ...(data.metadata && { metadata: data.metadata as object }),
        },
      });

      return this.mapPrismaPlanToPlan(plan);
    } catch {
      return null;
    }
  }

  /**
   * Delete plan by ID
   */
  async deletePlan(id: string): Promise<boolean> {
    try {
      await prisma.plan.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================
  // WEBHOOK METHODS
  // ==========================================

  /**
   * Store webhook event
   */
  async storeWebhookEvent(data: {
    provider: Payment['provider'];
    type: string;
    data: Record<string, unknown>;
  }): Promise<{ id: string }> {
    const webhook = await prisma.paymentWebhook.create({
      data: {
        provider: this.mapProviderToEnum(data.provider),
        type: data.type,
        data: data.data as object,
        processed: false,
      },
    });

    return { id: webhook.id };
  }

  /**
   * Mark webhook as processed
   */
  async markWebhookProcessed(id: string, error?: string): Promise<void> {
    await prisma.paymentWebhook.update({
      where: { id },
      data: {
        processed: true,
        ...(error && { error }),
      },
    });
  }

  // ==========================================
  // TESTING UTILITIES
  // ==========================================

  /**
   * Clear all payments (for testing only)
   */
  async clearPayments(): Promise<void> {
    await prisma.payment.deleteMany();
  }

  /**
   * Clear all subscriptions (for testing only)
   */
  async clearSubscriptions(): Promise<void> {
    await prisma.subscription.deleteMany();
  }

  /**
   * Clear all plans (for testing only)
   */
  async clearPlans(): Promise<void> {
    await prisma.plan.deleteMany();
  }

  /**
   * Clear all webhooks (for testing only)
   */
  async clearWebhooks(): Promise<void> {
    await prisma.paymentWebhook.deleteMany();
  }

  // ==========================================
  // PRIVATE MAPPING METHODS
  // ==========================================

  private mapPrismaPaymentToPayment(prismaPayment: {
    id: string;
    userId: string;
    provider: PaymentProvider;
    method: PaymentMethod;
    status: PaymentStatus;
    amount: number;
    currency: string;
    description: string | null;
    metadata: unknown;
    providerPaymentId: string | null;
    providerCustomerId: string | null;
    refundedAmount: number | null;
    failureReason: string | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Payment {
    return {
      id: prismaPayment.id,
      userId: prismaPayment.userId,
      provider: this.mapEnumToProvider(prismaPayment.provider),
      method: this.mapEnumToMethod(prismaPayment.method),
      status: this.mapEnumToStatus(prismaPayment.status),
      amount: prismaPayment.amount,
      currency: prismaPayment.currency,
      description: prismaPayment.description ?? undefined,
      metadata: prismaPayment.metadata as Record<string, unknown> | undefined,
      providerPaymentId: prismaPayment.providerPaymentId ?? undefined,
      providerCustomerId: prismaPayment.providerCustomerId ?? undefined,
      refundedAmount: prismaPayment.refundedAmount ?? undefined,
      failureReason: prismaPayment.failureReason ?? undefined,
      paidAt: prismaPayment.paidAt ?? undefined,
      createdAt: prismaPayment.createdAt,
      updatedAt: prismaPayment.updatedAt,
    };
  }

  private mapPrismaSubscriptionToSubscription(prismaSubscription: {
    id: string;
    userId: string;
    planId: string;
    provider: PaymentProvider;
    providerSubscriptionId: string | null;
    status: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    createdAt: Date;
    updatedAt: Date;
    plan?: {
      id: string;
      name: string;
      amount: number;
      currency: string;
      interval: PlanInterval;
      intervalCount: number;
    };
  }): Subscription {
    return {
      id: prismaSubscription.id,
      userId: prismaSubscription.userId,
      planId: prismaSubscription.planId,
      provider: this.mapEnumToProvider(prismaSubscription.provider),
      providerSubscriptionId: prismaSubscription.providerSubscriptionId ?? undefined,
      status: this.mapEnumToSubscriptionStatus(prismaSubscription.status),
      currentPeriodStart: prismaSubscription.currentPeriodStart,
      currentPeriodEnd: prismaSubscription.currentPeriodEnd,
      cancelAtPeriodEnd: prismaSubscription.cancelAtPeriodEnd,
      createdAt: prismaSubscription.createdAt,
      updatedAt: prismaSubscription.updatedAt,
    };
  }

  private mapPrismaPlanToPlan(prismaPlan: {
    id: string;
    name: string;
    description: string | null;
    amount: number;
    currency: string;
    interval: PlanInterval;
    intervalCount: number;
    trialDays: number | null;
    features: unknown;
    metadata: unknown;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Plan {
    return {
      id: prismaPlan.id,
      name: prismaPlan.name,
      description: prismaPlan.description ?? undefined,
      amount: prismaPlan.amount,
      currency: prismaPlan.currency,
      interval: this.mapEnumToInterval(prismaPlan.interval),
      intervalCount: prismaPlan.intervalCount,
      trialDays: prismaPlan.trialDays ?? undefined,
      features: prismaPlan.features as string[] | undefined,
      metadata: prismaPlan.metadata as Record<string, unknown> | undefined,
      active: prismaPlan.active,
    };
  }

  // Provider mapping
  private mapProviderToEnum(provider: string): PaymentProvider {
    const providerMap: Record<string, PaymentProvider> = {
      stripe: PaymentProvider.STRIPE,
      paypal: PaymentProvider.PAYPAL,
      mobile_money: PaymentProvider.MOBILE_MONEY,
      manual: PaymentProvider.MANUAL,
    };
    return providerMap[provider] || PaymentProvider.MANUAL;
  }

  private mapEnumToProvider(provider: PaymentProvider): Payment['provider'] {
    const providerMap: Record<PaymentProvider, Payment['provider']> = {
      [PaymentProvider.STRIPE]: 'stripe',
      [PaymentProvider.PAYPAL]: 'paypal',
      [PaymentProvider.MOBILE_MONEY]: 'mobile_money',
      [PaymentProvider.MANUAL]: 'manual',
    };
    return providerMap[provider];
  }

  // Status mapping
  private mapStatusToEnum(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      pending: PaymentStatus.PENDING,
      processing: PaymentStatus.PROCESSING,
      completed: PaymentStatus.COMPLETED,
      failed: PaymentStatus.FAILED,
      refunded: PaymentStatus.REFUNDED,
      cancelled: PaymentStatus.CANCELLED,
    };
    return statusMap[status] || PaymentStatus.PENDING;
  }

  private mapEnumToStatus(status: PaymentStatus): Payment['status'] {
    const statusMap: Record<PaymentStatus, Payment['status']> = {
      [PaymentStatus.PENDING]: 'pending',
      [PaymentStatus.PROCESSING]: 'processing',
      [PaymentStatus.COMPLETED]: 'completed',
      [PaymentStatus.FAILED]: 'failed',
      [PaymentStatus.REFUNDED]: 'refunded',
      [PaymentStatus.CANCELLED]: 'cancelled',
    };
    return statusMap[status];
  }

  // Method mapping
  private mapMethodToEnum(method: string): PaymentMethod {
    const methodMap: Record<string, PaymentMethod> = {
      card: PaymentMethod.CARD,
      bank_transfer: PaymentMethod.BANK_TRANSFER,
      mobile_money: PaymentMethod.MOBILE_MONEY,
      paypal: PaymentMethod.PAYPAL,
      crypto: PaymentMethod.CRYPTO,
      cash: PaymentMethod.CASH,
    };
    return methodMap[method] || PaymentMethod.CARD;
  }

  private mapEnumToMethod(method: PaymentMethod): Payment['method'] {
    const methodMap: Record<PaymentMethod, Payment['method']> = {
      [PaymentMethod.CARD]: 'card',
      [PaymentMethod.BANK_TRANSFER]: 'bank_transfer',
      [PaymentMethod.MOBILE_MONEY]: 'mobile_money',
      [PaymentMethod.PAYPAL]: 'paypal',
      [PaymentMethod.CRYPTO]: 'crypto',
      [PaymentMethod.CASH]: 'cash',
    };
    return methodMap[method];
  }

  // Subscription status mapping
  private mapSubscriptionStatusToEnum(status: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      cancelled: SubscriptionStatus.CANCELLED,
      past_due: SubscriptionStatus.PAST_DUE,
      trialing: SubscriptionStatus.TRIALING,
      paused: SubscriptionStatus.PAUSED,
    };
    return statusMap[status] || SubscriptionStatus.ACTIVE;
  }

  private mapEnumToSubscriptionStatus(status: SubscriptionStatus): Subscription['status'] {
    const statusMap: Record<SubscriptionStatus, Subscription['status']> = {
      [SubscriptionStatus.ACTIVE]: 'active',
      [SubscriptionStatus.CANCELLED]: 'cancelled',
      [SubscriptionStatus.PAST_DUE]: 'past_due',
      [SubscriptionStatus.TRIALING]: 'trialing',
      [SubscriptionStatus.PAUSED]: 'paused',
    };
    return statusMap[status];
  }

  // Interval mapping
  private mapIntervalToEnum(interval: string): PlanInterval {
    const intervalMap: Record<string, PlanInterval> = {
      day: PlanInterval.DAY,
      week: PlanInterval.WEEK,
      month: PlanInterval.MONTH,
      year: PlanInterval.YEAR,
    };
    return intervalMap[interval] || PlanInterval.MONTH;
  }

  private mapEnumToInterval(interval: PlanInterval): Plan['interval'] {
    const intervalMap: Record<PlanInterval, Plan['interval']> = {
      [PlanInterval.DAY]: 'day',
      [PlanInterval.WEEK]: 'week',
      [PlanInterval.MONTH]: 'month',
      [PlanInterval.YEAR]: 'year',
    };
    return intervalMap[interval];
  }
}

export function createPaymentRepository(): PaymentRepository {
  return new PaymentRepository();
}
