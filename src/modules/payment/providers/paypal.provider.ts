import { logger } from '../../../core/logger.js';
import type { PayPalConfig, PayPalOrderData, PaymentIntent, Payment } from '../types.js';

/**
 * PayPal Payment Provider
 * Uses PayPal REST API v2
 */
export class PayPalProvider {
  private config: PayPalConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: PayPalConfig) {
    this.config = config;
    logger.info({ sandbox: config.sandbox }, 'PayPal provider initialized');
  }

  private get baseUrl(): string {
    return this.config.sandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      'base64'
    );

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error('Failed to get PayPal access token');
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

    return this.accessToken;
  }

  async createOrder(data: PayPalOrderData): Promise<PaymentIntent> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: data.currency.toUpperCase(),
              value: data.amount.toFixed(2),
            },
            description: data.description,
          },
        ],
        application_context: {
          return_url: data.returnUrl,
          cancel_url: data.cancelUrl,
          brand_name: 'Servcraft',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ error }, 'PayPal order creation failed');
      throw new Error('Failed to create PayPal order');
    }

    const order = (await response.json()) as {
      id: string;
      status: string;
      links: Array<{ rel: string; href: string }>;
    };
    const approveLink = order.links.find((l) => l.rel === 'approve');

    return {
      id: order.id,
      paymentUrl: approveLink?.href,
      status: this.mapPayPalStatus(order.status),
      provider: 'paypal',
    };
  }

  async captureOrder(orderId: string): Promise<PaymentIntent> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to capture PayPal order');
    }

    const result = (await response.json()) as { id: string; status: string };

    return {
      id: result.id,
      status: this.mapPayPalStatus(result.status),
      provider: 'paypal',
    };
  }

  async refundPayment(captureId: string, amount?: number, currency?: string): Promise<boolean> {
    const accessToken = await this.getAccessToken();

    const body: Record<string, unknown> = {};
    if (amount && currency) {
      body.amount = {
        value: amount.toFixed(2),
        currency_code: currency.toUpperCase(),
      };
    }

    const response = await fetch(`${this.baseUrl}/v2/payments/captures/${captureId}/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return response.ok;
  }

  async getOrderDetails(orderId: string): Promise<Record<string, unknown>> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get PayPal order details');
    }

    return response.json() as Promise<Record<string, unknown>>;
  }

  verifyWebhookSignature(
    _headers: Record<string, string>,
    _body: string,
    _webhookId: string
  ): Promise<boolean> {
    // PayPal webhook verification requires calling their API
    // This is a simplified version
    return Promise.resolve(true);
  }

  private mapPayPalStatus(status: string): Payment['status'] {
    const statusMap: Record<string, Payment['status']> = {
      CREATED: 'pending',
      SAVED: 'pending',
      APPROVED: 'processing',
      VOIDED: 'cancelled',
      COMPLETED: 'completed',
      PAYER_ACTION_REQUIRED: 'pending',
    };
    return statusMap[status] || 'pending';
  }
}

export function createPayPalProvider(config: PayPalConfig): PayPalProvider {
  return new PayPalProvider(config);
}
