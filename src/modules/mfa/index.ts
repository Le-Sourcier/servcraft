export { MFAService, getMFAService, createMFAService } from './mfa.service.js';
export { registerMFARoutes } from './mfa.routes.js';
export {
  generateSecret,
  generateTOTP,
  verifyTOTP,
  generateTOTPUri,
  generateQRCode,
  formatSecretForDisplay,
  getRemainingSeconds,
} from './totp.js';
export type {
  MFAConfig,
  MFAMethod,
  UserMFA,
  TOTPSetup,
  MFAChallenge,
  MFAVerifyResult,
  BackupCodesResult,
} from './types.js';
