/**
 * MFA Service
 * Multi-Factor Authentication with TOTP, SMS, Email, and Backup Codes
 *
 * Persistence:
 * - User MFA settings: Prisma/PostgreSQL (persistent)
 * - MFA challenges: Redis with TTL (5-minute expiration)
 * - Failed attempts/lockouts: Redis with TTL (15-minute expiration)
 */
import { randomBytes, randomUUID } from 'crypto';
import { logger } from '../../core/logger.js';
import { BadRequestError } from '../../utils/errors.js';
import { prisma } from '../../database/prisma.js';
import { getRedis } from '../../database/redis.js';
import { MFARepository } from './mfa.repository.js';
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

// Redis key prefixes
const MFA_CHALLENGE_PREFIX = 'mfa:challenge:';
const MFA_ATTEMPTS_PREFIX = 'mfa:attempts:';

// Expiration times
const CHALLENGE_EXPIRATION_SECONDS = 5 * 60; // 5 minutes
const LOCKOUT_EXPIRATION_SECONDS = 15 * 60; // 15 minutes

const MAX_ATTEMPTS = 5;

const defaultConfig: MFAConfig = {
  issuer: 'Servcraft',
  totpWindow: 1,
  backupCodesCount: 10,
};

interface FailedAttempts {
  count: number;
  lockedUntil?: string;
}

export class MFAService {
  private config: MFAConfig;
  private repository: MFARepository;

  constructor(config: Partial<MFAConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.repository = new MFARepository(prisma);
  }

  // TOTP Setup
  async setupTOTP(userId: string, email: string): Promise<TOTPSetup> {
    const secret = generateSecret();
    const uri = generateTOTPUri(secret, email, this.config.issuer);
    const qrCode = await generateQRCode(uri);

    // Get or create user MFA
    let userMFA = await this.repository.getByUserId(userId);
    if (!userMFA) {
      userMFA = this.createUserMFA(userId);
    }

    userMFA.totpSecret = secret;
    userMFA.totpVerified = false;

    await this.repository.upsert(userMFA);

    logger.info({ userId }, 'TOTP setup initiated');

    return {
      secret,
      qrCode,
      manualEntry: formatSecretForDisplay(secret),
      uri,
    };
  }

  async verifyTOTPSetup(userId: string, code: string): Promise<boolean> {
    const userMFA = await this.repository.getByUserId(userId);
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

      await this.repository.upsert(userMFA);
      logger.info({ userId }, 'TOTP setup verified');
    }

    return isValid;
  }

  async disableTOTP(userId: string, code: string): Promise<void> {
    const userMFA = await this.repository.getByUserId(userId);
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

    await this.repository.upsert(userMFA);
    logger.info({ userId }, 'TOTP disabled');
  }

  // SMS MFA
  async setupSMS(userId: string, phoneNumber: string): Promise<void> {
    let userMFA = await this.repository.getByUserId(userId);
    if (!userMFA) {
      userMFA = this.createUserMFA(userId);
    }

    userMFA.phoneNumber = phoneNumber;
    userMFA.phoneVerified = false;

    await this.repository.upsert(userMFA);

    // Send verification code
    await this.sendSMSChallenge(userId, phoneNumber);

    logger.info({ userId }, 'SMS MFA setup initiated');
  }

  async verifySMSSetup(userId: string, code: string): Promise<boolean> {
    const result = await this.verifyChallenge(userId, code, 'sms');

    if (result.success) {
      const userMFA = (await this.repository.getByUserId(userId))!;
      userMFA.phoneVerified = true;
      if (!userMFA.methods.includes('sms')) {
        userMFA.methods.push('sms');
      }
      userMFA.enabled = true;

      await this.repository.upsert(userMFA);
      logger.info({ userId }, 'SMS MFA setup verified');
    }

    return result.success;
  }

  // Email MFA
  async setupEmail(userId: string, email: string): Promise<void> {
    let userMFA = await this.repository.getByUserId(userId);
    if (!userMFA) {
      userMFA = this.createUserMFA(userId);
    }

    userMFA.email = email;
    userMFA.emailVerified = false;

    await this.repository.upsert(userMFA);

    // Send verification code
    await this.sendEmailChallenge(userId, email);

    logger.info({ userId }, 'Email MFA setup initiated');
  }

  async verifyEmailSetup(userId: string, code: string): Promise<boolean> {
    const result = await this.verifyChallenge(userId, code, 'email');

    if (result.success) {
      const userMFA = (await this.repository.getByUserId(userId))!;
      userMFA.emailVerified = true;
      if (!userMFA.methods.includes('email')) {
        userMFA.methods.push('email');
      }
      userMFA.enabled = true;

      await this.repository.upsert(userMFA);
      logger.info({ userId }, 'Email MFA setup verified');
    }

    return result.success;
  }

  // Backup Codes
  async generateBackupCodes(userId: string): Promise<BackupCodesResult> {
    let userMFA = await this.repository.getByUserId(userId);
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

    await this.repository.upsert(userMFA);

    logger.info({ userId, count: codes.length }, 'Backup codes generated');

    return {
      codes,
      generatedAt: new Date(),
    };
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const userMFA = await this.repository.getByUserId(userId);
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

    await this.repository.upsert(userMFA);

    logger.info({ userId }, 'Backup code used');

    return true;
  }

  async getRemainingBackupCodes(userId: string): Promise<number> {
    const userMFA = await this.repository.getByUserId(userId);
    if (!userMFA || !userMFA.backupCodes) {
      return 0;
    }

    return userMFA.backupCodes.length - (userMFA.backupCodesUsed?.length || 0);
  }

  // Challenge Management
  async createChallenge(userId: string, method: MFAMethod): Promise<MFAChallenge> {
    // Check for lockout
    const attempts = await this.getFailedAttempts(userId);
    if (attempts?.lockedUntil) {
      const lockedUntilDate = new Date(attempts.lockedUntil);
      if (lockedUntilDate > new Date()) {
        throw new BadRequestError(
          `Account locked. Try again after ${lockedUntilDate.toISOString()}`
        );
      }
    }

    const userMFA = await this.repository.getByUserId(userId);
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
      expiresAt: new Date(Date.now() + CHALLENGE_EXPIRATION_SECONDS * 1000),
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

    // Store challenge in Redis
    const redis = getRedis();
    await redis.setex(
      `${MFA_CHALLENGE_PREFIX}${challenge.id}`,
      CHALLENGE_EXPIRATION_SECONDS,
      JSON.stringify(challenge)
    );

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
    const attempts = await this.getFailedAttempts(userId);
    if (attempts?.lockedUntil) {
      const lockedUntilDate = new Date(attempts.lockedUntil);
      if (lockedUntilDate > new Date()) {
        return {
          success: false,
          method: method || 'totp',
          lockedUntil: lockedUntilDate,
        };
      }
    }

    const userMFA = await this.repository.getByUserId(userId);
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
          success = await this.verifyChallengeCode(userId, challengeId, method, code);
        }
        break;
    }

    if (success) {
      // Reset failed attempts
      await this.clearFailedAttempts(userId);
      userMFA.lastUsed = new Date();
      await this.repository.upsert(userMFA);

      logger.info({ userId, method }, 'MFA verification successful');
    } else {
      // Track failed attempt
      const currentAttempts = await this.incrementFailedAttempts(userId);

      logger.info({ userId, method, attempts: currentAttempts.count }, 'MFA verification failed');
    }

    const finalAttempts = await this.getFailedAttempts(userId);
    return {
      success,
      method: method || 'totp',
      remainingAttempts: success ? undefined : MAX_ATTEMPTS - (finalAttempts?.count || 0),
      lockedUntil: finalAttempts?.lockedUntil ? new Date(finalAttempts.lockedUntil) : undefined,
    };
  }

  // User MFA Status
  async getUserMFA(userId: string): Promise<UserMFA | null> {
    return this.repository.getByUserId(userId);
  }

  async isMFAEnabled(userId: string): Promise<boolean> {
    return this.repository.isEnabled(userId);
  }

  async getEnabledMethods(userId: string): Promise<MFAMethod[]> {
    return this.repository.getEnabledMethods(userId);
  }

  async disableAllMFA(userId: string): Promise<void> {
    await this.repository.delete(userId);
    await this.clearFailedAttempts(userId);
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

  // Redis helpers for challenges
  private async verifyChallengeCode(
    userId: string,
    challengeId: string,
    method: MFAMethod,
    code: string
  ): Promise<boolean> {
    const redis = getRedis();
    const challengeJson = await redis.get(`${MFA_CHALLENGE_PREFIX}${challengeId}`);

    if (!challengeJson) {
      return false;
    }

    const challenge = JSON.parse(challengeJson) as MFAChallenge;

    if (
      challenge.userId !== userId ||
      challenge.method !== method ||
      new Date(challenge.expiresAt) < new Date() ||
      challenge.verified
    ) {
      return false;
    }

    if (challenge.code === code) {
      challenge.verified = true;
      await redis.setex(
        `${MFA_CHALLENGE_PREFIX}${challengeId}`,
        60, // Keep for 1 minute after verification
        JSON.stringify(challenge)
      );
      return true;
    }

    challenge.attempts++;
    await redis.setex(
      `${MFA_CHALLENGE_PREFIX}${challengeId}`,
      CHALLENGE_EXPIRATION_SECONDS,
      JSON.stringify(challenge)
    );
    return false;
  }

  // Redis helpers for failed attempts
  private async getFailedAttempts(userId: string): Promise<FailedAttempts | null> {
    const redis = getRedis();
    const attemptsJson = await redis.get(`${MFA_ATTEMPTS_PREFIX}${userId}`);

    if (!attemptsJson) {
      return null;
    }

    return JSON.parse(attemptsJson) as FailedAttempts;
  }

  private async incrementFailedAttempts(userId: string): Promise<FailedAttempts> {
    const redis = getRedis();
    const current = (await this.getFailedAttempts(userId)) || { count: 0 };

    current.count++;

    if (current.count >= MAX_ATTEMPTS) {
      current.lockedUntil = new Date(Date.now() + LOCKOUT_EXPIRATION_SECONDS * 1000).toISOString();
      logger.warn({ userId }, 'MFA account locked due to too many failed attempts');
    }

    await redis.setex(
      `${MFA_ATTEMPTS_PREFIX}${userId}`,
      LOCKOUT_EXPIRATION_SECONDS,
      JSON.stringify(current)
    );

    return current;
  }

  private async clearFailedAttempts(userId: string): Promise<void> {
    const redis = getRedis();
    await redis.del(`${MFA_ATTEMPTS_PREFIX}${userId}`);
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
