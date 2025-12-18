export type PaymentProvider = 'stripe' | 'paypal' | 'mobile_money' | 'manual';
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled';
export type PaymentMethod =
  | 'card'
  | 'bank_transfer'
  | 'mobile_money'
  | 'paypal'
  | 'crypto'
  | 'cash';

export interface Payment {
  id: string;
  userId: string;
  provider: PaymentProvider;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, unknown>;
  providerPaymentId?: string;
  providerCustomerId?: string;
  refundedAmount?: number;
  failureReason?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentData {
  userId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  method?: PaymentMethod;
  description?: string;
  metadata?: Record<string, unknown>;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentIntent {
  id: string;
  clientSecret?: string;
  paymentUrl?: string;
  status: PaymentStatus;
  provider: PaymentProvider;
}

// Stripe specific
export interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret?: string;
}

export interface StripePaymentData {
  amount: number;
  currency: string;
  customerId?: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, string>;
}

// PayPal specific
export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  sandbox: boolean;
}

export interface PayPalOrderData {
  amount: number;
  currency: string;
  description?: string;
  returnUrl: string;
  cancelUrl: string;
}

// Mobile Money (MTN, Orange, Wave, etc.)
export interface MobileMoneyConfig {
  provider: 'mtn' | 'orange' | 'wave' | 'mpesa';
  apiKey: string;
  apiSecret: string;
  environment: 'sandbox' | 'production';
  callbackUrl: string;
}

export interface MobileMoneyPaymentData {
  amount: number;
  currency: string;
  phoneNumber: string;
  description?: string;
  reference?: string;
}

// Subscription
export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  provider: PaymentProvider;
  providerSubscriptionId?: string;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'paused';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  trialDays?: number;
  features?: string[];
  metadata?: Record<string, unknown>;
  active: boolean;
}

// Webhook events
export interface PaymentWebhookEvent {
  id: string;
  type: string;
  provider: PaymentProvider;
  data: Record<string, unknown>;
  createdAt: Date;
}
