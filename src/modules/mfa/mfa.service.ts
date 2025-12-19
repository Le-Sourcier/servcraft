import { randomBytes, randomUUID } from 'crypto';
import { logger } from '../../core/logger.js';
import { BadRequestError } from '../../utils/errors.js';
import {
  generateSecret,
  verifyTOTP,
  generateTOTPUri,
  generateQRCode,
  formatSecretForDisplay,
} from './totp.js';
import type {
  MFAConfig,
  MFAMethod,
  UserMFA,
  TOTPSetup,
  MFAChallenge,
  MFAVerifyResult,
  BackupCodesResult,
} from './types.js';

// In-memory storage (use database in production)
const userMFAStore = new Map<string, UserMFA>();
const challengeStore = new Map<string, MFAChallenge>();

const CHALLENGE_EXPIRATION = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Track failed attempts
const failedAttempts = new Map<string, { count: number; lockedUntil?: Date }>();

const defaultConfig: MFAConfig = {
  issuer: 'Servcraft',
  totpWindow: 1,
  backupCodesCount: 10,
};

export class MFAService {
  private config: MFAConfig;

  constructor(config: Partial<MFAConfig> = {}) {
    this.config = { ...defaultConfig, ...config };

    // Cleanup expired challenges periodically
    setInterval(() => this.cleanupExpiredChallenges(), 60000);
  }

  // TOTP Setup
  async setupTOTP(userId: string, email: string): Promise<TOTPSetup> {
    const secret = generateSecret();
    const uri = generateTOTPUri(secret, email, this.config.issuer);
    const qrCode = await generateQRCode(uri);

    // Store pending TOTP setup
    let userMFA = userMFAStore.get(userId);
    if (!userMFA) {
      userMFA = this.createUserMFA(userId);
    }

    userMFA.totpSecret = secret;
    userMFA.totpVerified = false;
    userMFA.updatedAt = new Date();
    userMFAStore.set(userId, userMFA);

    logger.info({ userId }, 'TOTP setup initiated');

    return {
      secret,
      qrCode,
      manualEntry: formatSecretForDisplay(secret),
      uri,
    };
  }

  async verifyTOTPSetup(userId: string, code: string): Promise<boolean> {
    const userMFA = userMFAStore.get(userId);
    if (!userMFA || !userMFA.totpSecret) {
      throw new BadRequestError('TOTP not set up');
    }

    if (userMFA.totpVerified) {
      throw new BadRequestError('TOTP already verified');
    }

    const isValid = verifyTOTP(userMFA.totpSecret, code, this.config.totpWindow);

    if (isValid) {
      userMFA.totpVerified = true;
      if (!userMFA.methods.includes('totp')) {
        userMFA.methods.push('totp');
      }
      userMFA.enabled = true;
      userMFA.updatedAt = new Date();
      userMFAStore.set(userId, userMFA);

      logger.info({ userId }, 'TOTP setup verified');
    }

    return isValid;
  }

  async disableTOTP(userId: string, code: string): Promise<void> {
    const userMFA = userMFAStore.get(userId);
    if (!userMFA || !userMFA.totpVerified) {
      throw new BadRequestError('TOTP not enabled');
    }

    // Verify code before disabling
    const isValid = verifyTOTP(userMFA.totpSecret!, code, this.config.totpWindow);
    if (!isValid) {
      throw new BadRequestError('Invalid TOTP code');
    }

    userMFA.totpSecret = undefined;
    userMFA.totpVerified = false;
    userMFA.methods = userMFA.methods.filter((m) => m !== 'totp');
    userMFA.enabled = userMFA.methods.length > 0;
    userMFA.updatedAt = new Date();
    userMFAStore.set(userId, userMFA);

    logger.info({ userId }, 'TOTP disabled');
  }

  // SMS MFA
  async setupSMS(userId: string, phoneNumber: string): Promise<void> {
    let userMFA = userMFAStore.get(userId);
    if (!userMFA) {
      userMFA = this.createUserMFA(userId);
    }

    userMFA.phoneNumber = phoneNumber;
    userMFA.phoneVerified = false;
    userMFA.updatedAt = new Date();
    userMFAStore.set(userId, userMFA);

    // Send verification code
    await this.sendSMSChallenge(userId, phoneNumber);

    logger.info({ userId }, 'SMS MFA setup initiated');
  }

  async verifySMSSetup(userId: string, code: string): Promise<boolean> {
    const result = await this.verifyChallenge(userId, code, 'sms');

    if (result.success) {
      const userMFA = userMFAStore.get(userId)!;
      userMFA.phoneVerified = true;
      if (!userMFA.methods.includes('sms')) {
        userMFA.methods.push('sms');
      }
      userMFA.enabled = true;
      userMFA.updatedAt = new Date();
      userMFAStore.set(userId, userMFA);

      logger.info({ userId }, 'SMS MFA setup verified');
    }

    return result.success;
  }

  // Email MFA
  async setupEmail(userId: string, email: string): Promise<void> {
    let userMFA = userMFAStore.get(userId);
    if (!userMFA) {
      userMFA = this.createUserMFA(userId);
    }

    userMFA.email = email;
    userMFA.emailVerified = false;
    userMFA.updatedAt = new Date();
    userMFAStore.set(userId, userMFA);

    // Send verification code
    await this.sendEmailChallenge(userId, email);

    logger.info({ userId }, 'Email MFA setup initiated');
  }

  async verifyEmailSetup(userId: string, code: string): Promise<boolean> {
    const result = await this.verifyChallenge(userId, code, 'email');

    if (result.success) {
      const userMFA = userMFAStore.get(userId)!;
      userMFA.emailVerified = true;
      if (!userMFA.methods.includes('email')) {
        userMFA.methods.push('email');
      }
      userMFA.enabled = true;
      userMFA.updatedAt = new Date();
      userMFAStore.set(userId, userMFA);

      logger.info({ userId }, 'Email MFA setup verified');
    }

    return result.success;
  }

  // Backup Codes
  async generateBackupCodes(userId: string): Promise<BackupCodesResult> {
    let userMFA = userMFAStore.get(userId);
    if (!userMFA) {
      userMFA = this.createUserMFA(userId);
    }

    const codes: string[] = [];
    for (let i = 0; i < (this.config.backupCodesCount || 10); i++) {
      // Generate 8-character codes
      const code = randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }

    userMFA.backupCodes = codes;
    userMFA.backupCodesUsed = [];
    if (!userMFA.methods.includes('backup_codes')) {
      userMFA.methods.push('backup_codes');
    }
    userMFA.updatedAt = new Date();
    userMFAStore.set(userId, userMFA);

    logger.info({ userId, count: codes.length }, 'Backup codes generated');

    return {
      codes,
      generatedAt: new Date(),
    };
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const userMFA = userMFAStore.get(userId);
    if (!userMFA || !userMFA.backupCodes) {
      return false;
    }

    const normalizedCode = code.toUpperCase().replace(/[^A-F0-9]/g, '');
    const formattedCode = `${normalizedCode.slice(0, 4)}-${normalizedCode.slice(4)}`;

    const index = userMFA.backupCodes.indexOf(formattedCode);
    if (index === -1) {
      return false;
    }

    // Check if already used
    if (userMFA.backupCodesUsed?.includes(formattedCode)) {
      return false;
    }

    // Mark as used
    userMFA.backupCodesUsed = userMFA.backupCodesUsed || [];
    userMFA.backupCodesUsed.push(formattedCode);
    userMFA.lastUsed = new Date();
    userMFA.updatedAt = new Date();
    userMFAStore.set(userId, userMFA);

    logger.info({ userId }, 'Backup code used');

    return true;
  }

  getRemainingBackupCodes(userId: string): number {
    const userMFA = userMFAStore.get(userId);
    if (!userMFA || !userMFA.backupCodes) {
      return 0;
    }

    return userMFA.backupCodes.length - (userMFA.backupCodesUsed?.length || 0);
  }

  // Challenge Management
  async createChallenge(userId: string, method: MFAMethod): Promise<MFAChallenge> {
    // Check for lockout
    const attempts = failedAttempts.get(userId);
    if (attempts?.lockedUntil && attempts.lockedUntil > new Date()) {
      throw new BadRequestError(
        `Account locked. Try again after ${attempts.lockedUntil.toISOString()}`
      );
    }

    const userMFA = userMFAStore.get(userId);
    if (!userMFA || !userMFA.enabled) {
      throw new BadRequestError('MFA not enabled');
    }

    if (!userMFA.methods.includes(method)) {
      throw new BadRequestError(`MFA method '${method}' not enabled`);
    }

    const challenge: MFAChallenge = {
      id: randomUUID(),
      userId,
      method,
      expiresAt: new Date(Date.now() + CHALLENGE_EXPIRATION),
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      verified: false,
      createdAt: new Date(),
    };

    // Generate and send code for SMS/email
    if (method === 'sms') {
      challenge.code = this.generateNumericCode();
      await this.sendSMSChallenge(userId, userMFA.phoneNumber!, challenge.code);
    } else if (method === 'email') {
      challenge.code = this.generateNumericCode();
      await this.sendEmailChallenge(userId, userMFA.email!, challenge.code);
    }

    challengeStore.set(challenge.id, challenge);

    logger.info({ userId, method, challengeId: challenge.id }, 'MFA challenge created');

    return {
      ...challenge,
      code: undefined, // Don't return the code
    };
  }

  async verifyChallenge(
    userId: string,
    code: string,
    method?: MFAMethod,
    challengeId?: string
  ): Promise<MFAVerifyResult> {
    // Check for lockout
    const attempts = failedAttempts.get(userId);
    if (attempts?.lockedUntil && attempts.lockedUntil > new Date()) {
      return {
        success: false,
        method: method || 'totp',
        lockedUntil: attempts.lockedUntil,
      };
    }

    const userMFA = userMFAStore.get(userId);
    if (!userMFA || !userMFA.enabled) {
      throw new BadRequestError('MFA not enabled');
    }

    // Determine method if not specified
    if (!method) {
      if (userMFA.totpVerified) {
        method = 'totp';
      } else if (userMFA.methods.length > 0) {
        method = userMFA.methods[0];
      } else {
        throw new BadRequestError('No MFA method available');
      }
    }

    let success = false;

    switch (method) {
      case 'totp':
        if (userMFA.totpSecret && userMFA.totpVerified) {
          success = verifyTOTP(userMFA.totpSecret, code, this.config.totpWindow);
        }
        break;

      case 'backup_codes':
        success = await this.verifyBackupCode(userId, code);
        break;

      case 'sms':
      case 'email':
        if (challengeId) {
          const challenge = challengeStore.get(challengeId);
          if (
            challenge &&
            challenge.userId === userId &&
            challenge.method === method &&
            challenge.expiresAt > new Date() &&
            !challenge.verified
          ) {
            if (challenge.code === code) {
              challenge.verified = true;
              challengeStore.set(challengeId, challenge);
              success = true;
            } else {
              challenge.attempts++;
              challengeStore.set(challengeId, challenge);
            }
          }
        }
        break;
    }

    if (success) {
      // Reset failed attempts
      failedAttempts.delete(userId);
      userMFA.lastUsed = new Date();
      userMFA.updatedAt = new Date();
      userMFAStore.set(userId, userMFA);

      logger.info({ userId, method }, 'MFA verification successful');
    } else {
      // Track failed attempt
      const current = failedAttempts.get(userId) || { count: 0 };
      current.count++;

      if (current.count >= MAX_ATTEMPTS) {
        current.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION);
        logger.warn({ userId }, 'MFA account locked due to too many failed attempts');
      }

      failedAttempts.set(userId, current);

      logger.info({ userId, method, attempts: current.count }, 'MFA verification failed');
    }

    return {
      success,
      method: method || 'totp',
      remainingAttempts: success
        ? undefined
        : MAX_ATTEMPTS - (failedAttempts.get(userId)?.count || 0),
      lockedUntil: failedAttempts.get(userId)?.lockedUntil,
    };
  }

  // User MFA Status
  async getUserMFA(userId: string): Promise<UserMFA | null> {
    return userMFAStore.get(userId) || null;
  }

  async isMFAEnabled(userId: string): Promise<boolean> {
    const userMFA = userMFAStore.get(userId);
    return userMFA?.enabled || false;
  }

  async getEnabledMethods(userId: string): Promise<MFAMethod[]> {
    const userMFA = userMFAStore.get(userId);
    return userMFA?.methods || [];
  }

  async disableAllMFA(userId: string): Promise<void> {
    userMFAStore.delete(userId);
    logger.info({ userId }, 'All MFA disabled');
  }

  // Private methods
  private createUserMFA(userId: string): UserMFA {
    return {
      userId,
      enabled: false,
      methods: [],
      totpVerified: false,
      phoneVerified: false,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private generateNumericCode(length = 6): string {
    const digits = '0123456789';
    let code = '';
    const bytes = randomBytes(length);
    for (let i = 0; i < length; i++) {
      const byteValue = bytes[i];
      if (byteValue !== undefined) {
        code += digits[byteValue % 10];
      }
    }
    return code;
  }

  private async sendSMSChallenge(
    userId: string,
    phoneNumber: string,
    code?: string
  ): Promise<void> {
    const challengeCode = code || this.generateNumericCode();
    logger.debug({ userId, phoneNumber }, `SMS challenge code: ${challengeCode}`);
    // In production, use notification service to send SMS
  }

  private async sendEmailChallenge(userId: string, email: string, code?: string): Promise<void> {
    const challengeCode = code || this.generateNumericCode();
    logger.debug({ userId, email }, `Email challenge code: ${challengeCode}`);
    // In production, use notification service to send email
  }

  private cleanupExpiredChallenges(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [id, challenge] of challengeStore.entries()) {
      if (challenge.expiresAt < now) {
        challengeStore.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug({ cleaned }, 'Expired MFA challenges cleaned');
    }
  }
}

let mfaService: MFAService | null = null;

export function getMFAService(): MFAService {
  if (!mfaService) {
    mfaService = new MFAService();
  }
  return mfaService;
}

export function createMFAService(config: Partial<MFAConfig>): MFAService {
  mfaService = new MFAService(config);
  return mfaService;
}
