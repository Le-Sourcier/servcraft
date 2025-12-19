/**
 * Mongoose Payment Schemas
 * MongoDB schemas for Payment, Subscription, Plan, and Webhook entities
 */

import { Schema, model, type Document } from 'mongoose';

// ==========================================
// PAYMENT SCHEMA
// ==========================================

export interface IPaymentDocument extends Document {
  userId: string;
  provider: 'stripe' | 'paypal' | 'mobile_money' | 'manual';
  method: 'card' | 'bank_transfer' | 'mobile_money' | 'paypal' | 'other';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  amount: number;
  currency: string;
  description?: string;
  providerPaymentId?: string;
  providerCustomerId?: string;
  metadata?: Record<string, unknown>;
  failureReason?: string;
  refundedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPaymentDocument>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
    },
    provider: {
      type: String,
      enum: ['stripe', 'paypal', 'mobile_money', 'manual'],
      required: [true, 'Provider is required'],
      default: 'manual',
    },
    method: {
      type: String,
      enum: ['card', 'bank_transfer', 'mobile_money', 'paypal', 'other'],
      required: [true, 'Payment method is required'],
      default: 'card',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
      required: [true, 'Status is required'],
      default: 'pending',
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be positive'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'USD',
      uppercase: true,
      length: 3,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    providerPaymentId: {
      type: String,
      index: true,
      sparse: true,
    },
    providerCustomerId: {
      type: String,
      index: true,
      sparse: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    failureReason: {
      type: String,
      maxlength: [500, 'Failure reason cannot exceed 500 characters'],
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'payments',
    toJSON: {
      virtuals: true,
      transform: (_doc, ret): Record<string, unknown> => {
        const { _id, ...rest } = ret;
        return { id: _id.toString(), ...rest };
      },
    },
  }
);

// Indexes
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ provider: 1, providerPaymentId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

export const PaymentModel = model<IPaymentDocument>('Payment', paymentSchema);

// ==========================================
// SUBSCRIPTION SCHEMA
// ==========================================

export interface ISubscriptionDocument extends Document {
  userId: string;
  planId: string;
  provider: 'stripe' | 'paypal' | 'mobile_money' | 'manual';
  status: 'active' | 'cancelled' | 'expired' | 'suspended' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelledAt?: Date;
  providerSubscriptionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscriptionDocument>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
    },
    planId: {
      type: String,
      required: [true, 'Plan ID is required'],
      index: true,
    },
    provider: {
      type: String,
      enum: ['stripe', 'paypal', 'mobile_money', 'manual'],
      required: [true, 'Provider is required'],
      default: 'manual',
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'suspended', 'trialing'],
      required: [true, 'Status is required'],
      default: 'active',
      index: true,
    },
    currentPeriodStart: {
      type: Date,
      required: [true, 'Current period start is required'],
    },
    currentPeriodEnd: {
      type: Date,
      required: [true, 'Current period end is required'],
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    providerSubscriptionId: {
      type: String,
      index: true,
      sparse: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'subscriptions',
    toJSON: {
      virtuals: true,
      transform: (_doc, ret): Record<string, unknown> => {
        const { _id, ...rest } = ret;
        return { id: _id.toString(), ...rest };
      },
    },
  }
);

// Indexes
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1, status: 1 });

export const SubscriptionModel = model<ISubscriptionDocument>('Subscription', subscriptionSchema);

// ==========================================
// PLAN SCHEMA
// ==========================================

export interface IPlanDocument extends Document {
  name: string;
  amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  trialPeriodDays?: number;
  active: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const planSchema = new Schema<IPlanDocument>(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      maxlength: [100, 'Plan name cannot exceed 100 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be positive'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'USD',
      uppercase: true,
      length: 3,
    },
    interval: {
      type: String,
      enum: ['day', 'week', 'month', 'year'],
      required: [true, 'Interval is required'],
      default: 'month',
    },
    intervalCount: {
      type: Number,
      required: [true, 'Interval count is required'],
      default: 1,
      min: [1, 'Interval count must be at least 1'],
    },
    trialPeriodDays: {
      type: Number,
      min: [0, 'Trial period must be positive'],
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'plans',
    toJSON: {
      virtuals: true,
      transform: (_doc, ret): Record<string, unknown> => {
        const { _id, ...rest } = ret;
        return { id: _id.toString(), ...rest };
      },
    },
  }
);

// Indexes
planSchema.index({ active: 1, createdAt: -1 });

export const PlanModel = model<IPlanDocument>('Plan', planSchema);

// ==========================================
// WEBHOOK SCHEMA
// ==========================================

export interface IWebhookDocument extends Document {
  provider: 'stripe' | 'paypal' | 'mobile_money' | 'manual';
  type: string;
  data: Record<string, unknown>;
  processed: boolean;
  processedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const webhookSchema = new Schema<IWebhookDocument>(
  {
    provider: {
      type: String,
      enum: ['stripe', 'paypal', 'mobile_money', 'manual'],
      required: [true, 'Provider is required'],
    },
    type: {
      type: String,
      required: [true, 'Webhook type is required'],
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: [true, 'Webhook data is required'],
    },
    processed: {
      type: Boolean,
      default: false,
      index: true,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    error: {
      type: String,
      maxlength: [1000, 'Error message cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
    collection: 'payment_webhooks',
    toJSON: {
      virtuals: true,
      transform: (_doc, ret): Record<string, unknown> => {
        const { _id, ...rest } = ret;
        return { id: _id.toString(), ...rest };
      },
    },
  }
);

// Indexes
webhookSchema.index({ provider: 1, processed: 1 });
webhookSchema.index({ createdAt: -1 });

export const WebhookModel = model<IWebhookDocument>('PaymentWebhook', webhookSchema);
