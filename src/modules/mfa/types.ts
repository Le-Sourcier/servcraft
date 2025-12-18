export type MFAMethod = 'totp' | 'sms' | 'email' | 'backup_codes';

export interface MFAConfig {
  issuer: string;
  totpWindow?: number; // Time window for TOTP validation (default: 1)
  backupCodesCount?: number; // Number of backup codes to generate (default: 10)
  smsProvider?: 'twilio' | 'nexmo';
  emailProvider?: 'smtp' | 'sendgrid' | 'resend';
}

export interface UserMFA {
  userId: string;
  enabled: boolean;
  methods: MFAMethod[];
  totpSecret?: string;
  totpVerified: boolean;
  backupCodes?: string[];
  backupCodesUsed?: string[];
  phoneNumber?: string;
  phoneVerified: boolean;
  email?: string;
  emailVerified: boolean;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TOTPSetup {
  secret: string;
  qrCode: string; // Data URL for QR code
  manualEntry: string; // Manual entry key
  uri: string; // otpauth:// URI
}

export interface MFAChallenge {
  id: string;
  userId: string;
  method: MFAMethod;
  code?: string; // For SMS/email challenges
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  verified: boolean;
  createdAt: Date;
}

export interface MFAVerifyResult {
  success: boolean;
  method: MFAMethod;
  remainingAttempts?: number;
  lockedUntil?: Date;
}

export interface BackupCodesResult {
  codes: string[];
  generatedAt: Date;
}
