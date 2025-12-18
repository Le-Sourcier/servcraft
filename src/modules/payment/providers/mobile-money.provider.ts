import { logger } from '../../../core/logger.js';
import type {
  MobileMoneyConfig,
  MobileMoneyPaymentData,
  PaymentIntent,
  Payment,
} from '../types.js';

/**
 * Mobile Money Payment Provider
 * Supports MTN MoMo, Orange Money, Wave, M-Pesa
 */
export class MobileMoneyProvider {
  private config: MobileMoneyConfig;

  constructor(config: MobileMoneyConfig) {
    this.config = config;
    logger.info('Mobile Money provider initialized', { provider: config.provider });
  }

  private get baseUrl(): string {
    const urls: Record<string, Record<string, string>> = {
      mtn: {
        sandbox: 'https://sandbox.momodeveloper.mtn.com',
        production: 'https://momodeveloper.mtn.com',
      },
      orange: {
        sandbox: 'https://api.sandbox.orange.com',
        production: 'https://api.orange.com',
      },
      wave: {
        sandbox: 'https://api.sandbox.wave.com',
        production: 'https://api.wave.com',
      },
      mpesa: {
        sandbox: 'https://sandbox.safaricom.co.ke',
        production: 'https://api.safaricom.co.ke',
      },
    };

    return urls[this.config.provider]?.[this.config.environment] || '';
  }

  async initiatePayment(data: MobileMoneyPaymentData): Promise<PaymentIntent> {
    switch (this.config.provider) {
      case 'mtn':
        return this.initiateMTNPayment(data);
      case 'orange':
        return this.initiateOrangePayment(data);
      case 'wave':
        return this.initiateWavePayment(data);
      case 'mpesa':
        return this.initiateMpesaPayment(data);
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  private async initiateMTNPayment(data: MobileMoneyPaymentData): Promise<PaymentIntent> {
    // MTN MoMo Collection API
    const referenceId = crypto.randomUUID();

    const response = await fetch(`${this.baseUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await this.getAccessToken()}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': this.config.environment,
        'Ocp-Apim-Subscription-Key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: data.amount.toString(),
        currency: data.currency,
        externalId: data.reference || referenceId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: data.phoneNumber.replace('+', ''),
        },
        payerMessage: data.description || 'Payment',
        payeeNote: data.description || 'Payment',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ error }, 'MTN MoMo payment initiation failed');
      throw new Error('Failed to initiate MTN payment');
    }

    return {
      id: referenceId,
      status: 'pending',
      provider: 'mobile_money',
    };
  }

  private async initiateOrangePayment(data: MobileMoneyPaymentData): Promise<PaymentIntent> {
    // Orange Money API
    const response = await fetch(`${this.baseUrl}/orange-money-webpay/dev/v1/webpayment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await this.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchant_key: this.config.apiKey,
        currency: data.currency,
        order_id: data.reference || crypto.randomUUID(),
        amount: data.amount,
        return_url: this.config.callbackUrl,
        cancel_url: this.config.callbackUrl,
        notif_url: this.config.callbackUrl,
        lang: 'fr',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to initiate Orange Money payment');
    }

    const result = (await response.json()) as { payment_url: string; pay_token: string };

    return {
      id: result.pay_token,
      paymentUrl: result.payment_url,
      status: 'pending',
      provider: 'mobile_money',
    };
  }

  private async initiateWavePayment(data: MobileMoneyPaymentData): Promise<PaymentIntent> {
    // Wave API
    const response = await fetch(`${this.baseUrl}/v1/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: data.amount.toString(),
        currency: data.currency,
        error_url: this.config.callbackUrl,
        success_url: this.config.callbackUrl,
        client_reference: data.reference,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to initiate Wave payment');
    }

    const result = (await response.json()) as { id: string; wave_launch_url: string };

    return {
      id: result.id,
      paymentUrl: result.wave_launch_url,
      status: 'pending',
      provider: 'mobile_money',
    };
  }

  private async initiateMpesaPayment(data: MobileMoneyPaymentData): Promise<PaymentIntent> {
    // M-Pesa STK Push
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .slice(0, 14);
    const password = Buffer.from(
      `${this.config.apiKey}${this.config.apiSecret}${timestamp}`
    ).toString('base64');

    const response = await fetch(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await this.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: this.config.apiKey,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(data.amount),
        PartyA: data.phoneNumber.replace('+', ''),
        PartyB: this.config.apiKey,
        PhoneNumber: data.phoneNumber.replace('+', ''),
        CallBackURL: this.config.callbackUrl,
        AccountReference: data.reference || 'Payment',
        TransactionDesc: data.description || 'Payment',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to initiate M-Pesa payment');
    }

    const result = (await response.json()) as { CheckoutRequestID: string };

    return {
      id: result.CheckoutRequestID,
      status: 'pending',
      provider: 'mobile_money',
    };
  }

  async checkPaymentStatus(paymentId: string): Promise<Payment['status']> {
    switch (this.config.provider) {
      case 'mtn':
        return this.checkMTNStatus(paymentId);
      case 'mpesa':
        return this.checkMpesaStatus(paymentId);
      default:
        return 'pending';
    }
  }

  private async checkMTNStatus(referenceId: string): Promise<Payment['status']> {
    const response = await fetch(`${this.baseUrl}/collection/v1_0/requesttopay/${referenceId}`, {
      headers: {
        Authorization: `Bearer ${await this.getAccessToken()}`,
        'X-Target-Environment': this.config.environment,
        'Ocp-Apim-Subscription-Key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      return 'pending';
    }

    const result = (await response.json()) as { status: string };
    const statusMap: Record<string, Payment['status']> = {
      PENDING: 'pending',
      SUCCESSFUL: 'completed',
      FAILED: 'failed',
    };

    return statusMap[result.status] || 'pending';
  }

  private async checkMpesaStatus(_checkoutRequestId: string): Promise<Payment['status']> {
    // M-Pesa query implementation
    return 'pending';
  }

  private async getAccessToken(): Promise<string> {
    // Token fetching logic varies by provider
    // This is a simplified version
    if (this.config.provider === 'mtn') {
      const auth = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64');

      const response = await fetch(`${this.baseUrl}/collection/token/`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Ocp-Apim-Subscription-Key': this.config.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get MTN access token');
      }

      const data = (await response.json()) as { access_token: string };
      return data.access_token;
    }

    return this.config.apiSecret;
  }
}

export function createMobileMoneyProvider(config: MobileMoneyConfig): MobileMoneyProvider {
  return new MobileMoneyProvider(config);
}
