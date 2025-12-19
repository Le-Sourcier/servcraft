import { createHmac, timingSafeEqual } from 'crypto';
import type { WebhookSignature } from './types.js';

/**
 * Generate HMAC signature for webhook payload
 */
export function generateSignature(
  payload: string | Record<string, unknown>,
  secret: string,
  timestamp?: number
): WebhookSignature {
  const ts = timestamp || Date.now();
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

  // Format: timestamp.payload
  const signedPayload = `${ts}.${payloadString}`;

  // Generate HMAC SHA256 signature
  const signature = createHmac('sha256', secret).update(signedPayload).digest('hex');

  return {
    signature,
    timestamp: ts,
    version: 'v1',
  };
}

/**
 * Verify webhook signature
 */
export function verifySignature(
  payload: string | Record<string, unknown>,
  signature: string,
  secret: string,
  timestamp: number,
  options: {
    toleranceSeconds?: number;
  } = {}
): boolean {
  const { toleranceSeconds = 300 } = options; // 5 minutes default tolerance

  // Check timestamp tolerance
  const now = Date.now();
  const timeDiff = Math.abs(now - timestamp);

  if (timeDiff > toleranceSeconds * 1000) {
    return false;
  }

  // Generate expected signature
  const expected = generateSignature(payload, secret, timestamp);

  // Timing-safe comparison
  try {
    const receivedBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected.signature, 'hex');

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(receivedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Parse signature header
 * Format: "t=<timestamp>,v1=<signature>"
 */
export function parseSignatureHeader(header: string): {
  timestamp: number;
  signature: string;
} | null {
  try {
    const parts = header.split(',');
    const result: { timestamp?: number; signature?: string } = {};

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't' && value) {
        result.timestamp = parseInt(value, 10);
      } else if (key === 'v1' && value) {
        result.signature = value;
      }
    }

    if (result.timestamp && result.signature) {
      return {
        timestamp: result.timestamp,
        signature: result.signature,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Format signature for header
 * Format: "t=<timestamp>,v1=<signature>"
 */
export function formatSignatureHeader(sig: WebhookSignature): string {
  return `t=${sig.timestamp},v1=${sig.signature}`;
}

/**
 * Generate webhook secret
 */
export function generateWebhookSecret(): string {
  return createHmac('sha256', Date.now().toString()).update(Math.random().toString()).digest('hex');
}

/**
 * Verify webhook signature from headers
 */
export function verifyWebhookSignature(
  payload: string | Record<string, unknown>,
  signatureHeader: string,
  secret: string,
  options: {
    toleranceSeconds?: number;
  } = {}
): boolean {
  const parsed = parseSignatureHeader(signatureHeader);

  if (!parsed) {
    return false;
  }

  return verifySignature(payload, parsed.signature, secret, parsed.timestamp, options);
}
