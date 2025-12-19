/**
 * Mongoose Payment Repository
 * Implements payment operations using Mongoose
 */

import {
  PaymentModel,
  SubscriptionModel,
  PlanModel,
  WebhookModel,
  type IPaymentDocument,
  type ISubscriptionDocument,
  type IPlanDocument,
} from '../../models/mongoose/payment.schema.js';
import type { IRepository, PaginationOptions, PaginatedResult } from '../../interfaces/index.js';

// Payment types matching application format
export interface Payment {
  id: string;
  userId: string;
  provider: 'stripe' | 'paypal' | 'mobile_money' | 'manual';
  method: 'card' | 'bank_transfer' | 'mobile_money' | 'paypal' | 'other';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  amount: number;
  currency: string;
  description?: string | null;
  providerPaymentId?: string | null;
  providerCustomerId?: string | null;
  metadata?: Record<string, unknown> | null;
  failureReason?: string | null;
  refundedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  provider: 'stripe' | 'paypal' | 'mobile_money' | 'manual';
  status: 'active' | 'cancelled' | 'expired' | 'suspended' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelledAt?: Date | null;
  providerSubscriptionId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Plan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  trialPeriodDays?: number | null;
  active: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose Payment Repository
 */
export class MongoosePaymentRepository implements IRepository<Payment> {
  // ==========================================
  // PAYMENT METHODS
  // ==========================================

  private toPayment(doc: IPaymentDocument): Payment {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      provider: doc.provider,
      method: doc.method,
      status: doc.status,
      amount: doc.amount,
      currency: doc.currency,
      description: doc.description || null,
      providerPaymentId: doc.providerPaymentId || null,
      providerCustomerId: doc.providerCustomerId || null,
      metadata: doc.metadata || null,
      failureReason: doc.failureReason || null,
      refundedAt: doc.refundedAt || null,
      completedAt: doc.completedAt || null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async findById(id: string): Promise<Payment | null> {
    try {
      const payment = await PaymentModel.findById(id);
      return payment ? this.toPayment(payment) : null;
    } catch {
      return null;
    }
  }

  async findOne(filter: Record<string, unknown>): Promise<Payment | null> {
    try {
      const payment = await PaymentModel.findOne(filter);
      return payment ? this.toPayment(payment) : null;
    } catch {
      return null;
    }
  }

  async findMany(
    filter: Record<string, unknown> = {},
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<Payment>> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder };

    const [payments, total] = await Promise.all([
      PaymentModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      PaymentModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: payments.map((p) => this.toPayment(p)),
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

  async create(data: Partial<Payment>): Promise<Payment> {
    const payment = await PaymentModel.create(data);
    return this.toPayment(payment);
  }

  async update(id: string, data: Partial<Payment>): Promise<Payment | null> {
    try {
      const payment = await PaymentModel.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      );
      return payment ? this.toPayment(payment) : null;
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await PaymentModel.findByIdAndDelete(id);
      return result !== null;
    } catch {
      return false;
    }
  }

  async count(filter: Record<string, unknown> = {}): Promise<number> {
    return PaymentModel.countDocuments(filter);
  }

  async exists(id: string): Promise<boolean> {
    const count = await PaymentModel.countDocuments({ _id: id });
    return count > 0;
  }

  /**
   * Find payment by provider payment ID
   */
  async findByProviderPaymentId(providerPaymentId: string): Promise<Payment | null> {
    return this.findOne({ providerPaymentId });
  }

  /**
   * Find payments by user ID
   */
  async findByUserId(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<Payment>> {
    return this.findMany({ userId }, options);
  }

  /**
   * Update payment status
   */
  async updateStatus(
    id: string,
    status: Payment['status'],
    data?: Partial<Payment>
  ): Promise<Payment | null> {
    const updateData: Partial<Payment> = { status, ...data };

    if (status === 'completed' && !data?.completedAt) {
      updateData.completedAt = new Date();
    }
    if (status === 'refunded' && !data?.refundedAt) {
      updateData.refundedAt = new Date();
    }

    return this.update(id, updateData);
  }

  // ==========================================
  // SUBSCRIPTION METHODS
  // ==========================================

  private toSubscription(doc: ISubscriptionDocument): Subscription {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      planId: doc.planId,
      provider: doc.provider,
      status: doc.status,
      currentPeriodStart: doc.currentPeriodStart,
      currentPeriodEnd: doc.currentPeriodEnd,
      cancelledAt: doc.cancelledAt || null,
      providerSubscriptionId: doc.providerSubscriptionId || null,
      metadata: doc.metadata || null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async createSubscription(data: Partial<Subscription>): Promise<Subscription> {
    const subscription = await SubscriptionModel.create(data);
    return this.toSubscription(subscription);
  }

  async findSubscriptionById(id: string): Promise<Subscription | null> {
    try {
      const subscription = await SubscriptionModel.findById(id);
      return subscription ? this.toSubscription(subscription) : null;
    } catch {
      return null;
    }
  }

  async findSubscriptionsByUserId(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<Subscription>> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const [subscriptions, total] = await Promise.all([
      SubscriptionModel.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      SubscriptionModel.countDocuments({ userId }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: subscriptions.map((s) => this.toSubscription(s)),
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

  async updateSubscription(id: string, data: Partial<Subscription>): Promise<Subscription | null> {
    try {
      const subscription = await SubscriptionModel.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      );
      return subscription ? this.toSubscription(subscription) : null;
    } catch {
      return null;
    }
  }

  async cancelSubscription(id: string): Promise<Subscription | null> {
    return this.updateSubscription(id, {
      status: 'cancelled',
      cancelledAt: new Date(),
    });
  }

  // ==========================================
  // PLAN METHODS
  // ==========================================

  private toPlan(doc: IPlanDocument): Plan {
    return {
      id: doc._id.toString(),
      name: doc.name,
      amount: doc.amount,
      currency: doc.currency,
      interval: doc.interval,
      intervalCount: doc.intervalCount,
      trialPeriodDays: doc.trialPeriodDays || null,
      active: doc.active,
      metadata: doc.metadata || null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async createPlan(data: Partial<Plan>): Promise<Plan> {
    const plan = await PlanModel.create(data);
    return this.toPlan(plan);
  }

  async findPlanById(id: string): Promise<Plan | null> {
    try {
      const plan = await PlanModel.findById(id);
      return plan ? this.toPlan(plan) : null;
    } catch {
      return null;
    }
  }

  async findActivePlans(): Promise<Plan[]> {
    const plans = await PlanModel.find({ active: true }).sort({ createdAt: -1 });
    return plans.map((p) => this.toPlan(p));
  }

  async updatePlan(id: string, data: Partial<Plan>): Promise<Plan | null> {
    try {
      const plan = await PlanModel.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      );
      return plan ? this.toPlan(plan) : null;
    } catch {
      return null;
    }
  }

  // ==========================================
  // WEBHOOK METHODS
  // ==========================================

  async storeWebhookEvent(data: {
    provider: 'stripe' | 'paypal' | 'mobile_money' | 'manual';
    type: string;
    data: Record<string, unknown>;
  }): Promise<{ id: string }> {
    const webhook = await WebhookModel.create(data);
    return { id: webhook._id.toString() };
  }

  async markWebhookProcessed(id: string, error?: string): Promise<boolean> {
    try {
      const result = await WebhookModel.findByIdAndUpdate(id, {
        $set: {
          processed: true,
          processedAt: new Date(),
          ...(error && { error }),
        },
      });
      return result !== null;
    } catch {
      return false;
    }
  }
}
