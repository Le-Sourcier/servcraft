# MFA Module

Multi-Factor Authentication with support for TOTP, SMS, Email, and Backup Codes.

## Features

- **TOTP** - Time-based One-Time Password (Google Authenticator compatible)
- **SMS** - SMS-based verification codes
- **Email** - Email-based verification codes
- **Backup Codes** - Single-use recovery codes
- **Account Lockout** - Protection against brute-force attacks
- **Redis Challenges** - Temporary challenge storage with TTL

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MFA Service                            │
├─────────────────────────────────────────────────────────────┤
│  TOTP Setup    │  SMS/Email    │  Backup Codes  │  Verify   │
└────────┬───────┴───────┬───────┴───────┬────────┴─────┬─────┘
         │               │               │              │
         ▼               ▼               ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌───────────┐  ┌───────────┐
│   Prisma    │  │    Redis    │  │   Prisma  │  │   Redis   │
│  (Settings) │  │ (Challenge) │  │  (Codes)  │  │ (Attempts)│
└─────────────┘  └─────────────┘  └───────────┘  └───────────┘
```

## Storage

| Data | Storage | TTL |
|------|---------|-----|
| User MFA Settings | PostgreSQL (Prisma) | Permanent |
| TOTP Secrets | PostgreSQL (Prisma) | Permanent |
| Backup Codes | PostgreSQL (Prisma) | Permanent |
| Active Challenges | Redis | 5 minutes |
| Failed Attempts | Redis | 15 minutes |

## Usage

### Basic Setup

```typescript
import { getMFAService, createMFAService } from 'servcraft/modules/mfa';

// Use default configuration
const mfa = getMFAService();

// Or create with custom config
const mfa = createMFAService({
  issuer: 'MyApp',
  totpWindow: 1,
  backupCodesCount: 10,
});
```

### TOTP Setup

```typescript
// 1. Initiate TOTP setup
const setup = await mfa.setupTOTP(userId, userEmail);
// Returns: { secret, qrCode, manualEntry, uri }

// 2. Display QR code to user (setup.qrCode is a data URL)
// User scans with Google Authenticator

// 3. Verify initial setup with a code from the app
const verified = await mfa.verifyTOTPSetup(userId, '123456');

// 4. Later, verify during login
const result = await mfa.verifyChallenge(userId, '123456', 'totp');
if (result.success) {
  // Allow login
}
```

### SMS MFA

```typescript
// 1. Setup SMS (sends verification code)
await mfa.setupSMS(userId, '+1234567890');

// 2. Verify phone number
const verified = await mfa.verifySMSSetup(userId, '123456');

// 3. During login, create challenge
const challenge = await mfa.createChallenge(userId, 'sms');
// SMS is sent automatically

// 4. Verify the code user received
const result = await mfa.verifyChallenge(userId, code, 'sms', challenge.id);
```

### Email MFA

```typescript
// 1. Setup Email MFA
await mfa.setupEmail(userId, 'user@example.com');

// 2. Verify email
const verified = await mfa.verifyEmailSetup(userId, '123456');

// 3. During login
const challenge = await mfa.createChallenge(userId, 'email');
const result = await mfa.verifyChallenge(userId, code, 'email', challenge.id);
```

### Backup Codes

```typescript
// Generate backup codes (display once to user)
const { codes, generatedAt } = await mfa.generateBackupCodes(userId);
// codes: ['ABCD-1234', 'EFGH-5678', ...]

// Check remaining codes
const remaining = await mfa.getRemainingBackupCodes(userId);

// Verify backup code during login
const result = await mfa.verifyChallenge(userId, 'ABCD-1234', 'backup_codes');
// Code is marked as used after successful verification
```

### User MFA Status

```typescript
// Check if MFA is enabled
const enabled = await mfa.isMFAEnabled(userId);

// Get enabled methods
const methods = await mfa.getEnabledMethods(userId);
// ['totp', 'backup_codes']

// Get full MFA status
const userMFA = await mfa.getUserMFA(userId);
```

### Disable MFA

```typescript
// Disable TOTP (requires valid code)
await mfa.disableTOTP(userId, '123456');

// Disable all MFA methods
await mfa.disableAllMFA(userId);
```

## Configuration

```typescript
interface MFAConfig {
  issuer: string;       // App name shown in authenticator (default: 'Servcraft')
  totpWindow: number;   // Time window tolerance (default: 1)
  backupCodesCount: number; // Number of backup codes (default: 10)
}
```

## Security Features

### Account Lockout

After 5 failed verification attempts, the account is locked for 15 minutes:

```typescript
const result = await mfa.verifyChallenge(userId, wrongCode);
// result: {
//   success: false,
//   remainingAttempts: 2,
//   lockedUntil: undefined
// }

// After 5 failures:
// result: {
//   success: false,
//   remainingAttempts: 0,
//   lockedUntil: Date (now + 15 minutes)
// }
```

### Challenge Expiration

Challenges expire after 5 minutes:

```typescript
const challenge = await mfa.createChallenge(userId, 'sms');
// challenge.expiresAt = now + 5 minutes

// After expiration, verification fails
const result = await mfa.verifyChallenge(userId, code, 'sms', challenge.id);
// result.success = false
```

## API Response Types

```typescript
interface TOTPSetup {
  secret: string;      // Raw TOTP secret
  qrCode: string;      // QR code as data URL
  manualEntry: string; // Formatted secret for manual entry
  uri: string;         // otpauth:// URI
}

interface MFAChallenge {
  id: string;
  userId: string;
  method: MFAMethod;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  verified: boolean;
}

interface MFAVerifyResult {
  success: boolean;
  method: MFAMethod;
  remainingAttempts?: number;
  lockedUntil?: Date;
}

type MFAMethod = 'totp' | 'sms' | 'email' | 'backup_codes';
```

## Redis Key Structure

| Key Pattern | Purpose | TTL |
|-------------|---------|-----|
| `mfa:challenge:{id}` | Active verification challenge | 5 min |
| `mfa:attempts:{userId}` | Failed attempt counter | 15 min |

## Integration with Auth Flow

```typescript
// Login flow with MFA
async function login(email: string, password: string, mfaCode?: string) {
  // 1. Verify credentials
  const user = await authService.verifyCredentials(email, password);

  // 2. Check if MFA is required
  if (await mfa.isMFAEnabled(user.id)) {
    if (!mfaCode) {
      const methods = await mfa.getEnabledMethods(user.id);
      return { requiresMFA: true, methods };
    }

    // 3. Verify MFA code
    const result = await mfa.verifyChallenge(user.id, mfaCode);
    if (!result.success) {
      throw new UnauthorizedError('Invalid MFA code', {
        remainingAttempts: result.remainingAttempts,
        lockedUntil: result.lockedUntil,
      });
    }
  }

  // 4. Issue tokens
  return authService.generateTokens(user);
}
```

## Best Practices

1. **Always offer backup codes** - Users can lose access to their phone
2. **Display codes only once** - Show backup codes only when generated
3. **Log MFA events** - Track setup, verification, and failures for audit
4. **Rate limit challenges** - Prevent challenge spam with rate limiting
5. **Secure TOTP secrets** - Encrypt at rest in database
