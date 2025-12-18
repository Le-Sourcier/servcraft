import { createHmac, randomBytes } from 'crypto';

/**
 * TOTP (Time-based One-Time Password) implementation
 * RFC 6238 compliant
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;

/**
 * Generate a random secret for TOTP
 */
export function generateSecret(length = 20): string {
  const bytes = randomBytes(length);
  let secret = '';

  for (const byte of bytes) {
    secret += BASE32_ALPHABET[byte % 32];
  }

  return secret;
}

/**
 * Decode base32 string to buffer
 */
function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const bits: number[] = [];

  for (const char of cleaned) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) continue;
    bits.push(...[...value.toString(2).padStart(5, '0')].map(Number));
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  }

  return Buffer.from(bytes);
}

/**
 * Generate TOTP code for a given time
 */
export function generateTOTP(secret: string, timestamp?: number): string {
  const time = timestamp || Date.now();
  const counter = Math.floor(time / 1000 / TOTP_PERIOD);

  // Convert counter to 8-byte buffer (big-endian)
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  // Decode secret
  const secretBuffer = base32Decode(secret);

  // Generate HMAC-SHA1
  const hmac = createHmac('sha1', secretBuffer);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0xf;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  // Generate OTP
  const otp = binary % Math.pow(10, TOTP_DIGITS);
  return otp.toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Verify TOTP code with time window
 */
export function verifyTOTP(secret: string, code: string, window = 1): boolean {
  const time = Date.now();

  // Check current and adjacent time windows
  for (let i = -window; i <= window; i++) {
    const checkTime = time + i * TOTP_PERIOD * 1000;
    const expectedCode = generateTOTP(secret, checkTime);

    if (constantTimeCompare(code, expectedCode)) {
      return true;
    }
  }

  return false;
}

/**
 * Generate otpauth:// URI for authenticator apps
 */
export function generateTOTPUri(secret: string, accountName: string, issuer: string): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);

  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

/**
 * Generate QR code as data URL
 */
export async function generateQRCode(data: string): Promise<string> {
  // Simple QR code generation using a public API
  // In production, use a library like 'qrcode' package
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;

  // For local generation without external API, you can implement QR encoding
  // or use the 'qrcode' npm package
  return url;
}

/**
 * Format secret for manual entry (groups of 4)
 */
export function formatSecretForDisplay(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(' ') || secret;
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Get remaining seconds until next TOTP code
 */
export function getRemainingSeconds(): number {
  return TOTP_PERIOD - (Math.floor(Date.now() / 1000) % TOTP_PERIOD);
}
