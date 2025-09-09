import crypto from 'crypto';
import { logSecurityEvent, AuditEventSeverity } from './auditLogger.js';

// MFA Types
export type MFAType = 'totp' | 'sms' | 'email' | 'backup';
export type MFAStatus = 'disabled' | 'enabled' | 'required' | 'verified';

// MFA Configuration
export interface MFAConfig {
  enabled: boolean;
  requiredForRoles: string[];
  totp: {
    enabled: boolean;
    issuer: string;
    algorithm: string;
    digits: number;
    period: number;
    window: number;
  };
  sms: {
    enabled: boolean;
    provider: string;
    codeLength: number;
    expiryMinutes: number;
    maxAttempts: number;
  };
  email: {
    enabled: boolean;
    codeLength: number;
    expiryMinutes: number;
    maxAttempts: number;
  };
  backup: {
    enabled: boolean;
    codeCount: number;
    codeLength: number;
    maxUses: number;
  };
  security: {
    maxFailedAttempts: number;
    lockoutDurationMinutes: number;
    requireMfaForSensitiveActions: boolean;
    allowRememberDevice: boolean;
    rememberDeviceDays: number;
  };
}

// Default MFA Configuration
export const DEFAULT_MFA_CONFIG: MFAConfig = {
  enabled: true,
  requiredForRoles: ['admin', 'sysadmin', 'hr', 'accountant'],
  totp: {
    enabled: true,
    issuer: 'CPR Training System',
    algorithm: 'sha1',
    digits: 6,
    period: 30,
    window: 1
  },
  sms: {
    enabled: false, // Requires SMS provider setup
    provider: 'twilio',
    codeLength: 6,
    expiryMinutes: 5,
    maxAttempts: 3
  },
  email: {
    enabled: true,
    codeLength: 6,
    expiryMinutes: 10,
    maxAttempts: 3
  },
  backup: {
    enabled: true,
    codeCount: 10,
    codeLength: 8,
    maxUses: 1
  },
  security: {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15,
    requireMfaForSensitiveActions: true,
    allowRememberDevice: true,
    rememberDeviceDays: 30
  }
};

// MFA User Data
export interface MFAUserData {
  userId: string;
  status: MFAStatus;
  totpSecret?: string;
  totpBackupCodes?: string[];
  smsVerified: boolean;
  emailVerified: boolean;
  lastMfaTime?: Date;
  failedAttempts: number;
  lockedUntil?: Date;
  trustedDevices: string[];
  createdAt: Date;
  updatedAt: Date;
}

// MFA Verification Result
export interface MFAVerificationResult {
  success: boolean;
  type: MFAType;
  message: string;
  remainingAttempts?: number;
  lockedUntil?: Date;
}

// Generate TOTP Secret
export function generateTOTPSecret(): string {
  return crypto.randomBytes(20).toString('base32');
}

// Generate Backup Codes
export function generateBackupCodes(count: number = 10, length: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(length).toString('hex').toUpperCase().substring(0, length);
    codes.push(code);
  }
  return codes;
}

// Generate SMS/Email Code
export function generateMFACode(length: number = 6): string {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

// Generate Device Fingerprint
export function generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
  const data = `${userAgent}-${ipAddress}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Validate TOTP Code
export function validateTOTPCode(secret: string, code: string, window: number = 1): boolean {
  try {
    const currentTime = Math.floor(Date.now() / 1000 / 30);
    
    for (let i = -window; i <= window; i++) {
      const time = currentTime + i;
      const expectedCode = generateTOTPCode(secret, time);
      if (expectedCode === code) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('TOTP validation error:', error);
    return false;
  }
}

// Generate TOTP Code for specific time
function generateTOTPCode(secret: string, time: number): string {
  const key = Buffer.from(secret, 'base32');
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeUInt32BE(0, 0);
  timeBuffer.writeUInt32BE(time, 4);
  
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(timeBuffer);
  const hash = hmac.digest();
  
  const offset = hash[hash.length - 1] & 0xf;
  const code = ((hash[offset] & 0x7f) << 24) |
               ((hash[offset + 1] & 0xff) << 16) |
               ((hash[offset + 2] & 0xff) << 8) |
               (hash[offset + 3] & 0xff);
  
  return (code % 1000000).toString().padStart(6, '0');
}

// Get MFA QR Code URL
export function getMFAQRCodeURL(userEmail: string, secret: string, issuer: string = 'CPR Training System'): string {
  const encodedEmail = encodeURIComponent(userEmail);
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedSecret = encodeURIComponent(secret);
  
  return `otpauth://totp/${encodedEmail}?secret=${encodedSecret}&issuer=${encodedIssuer}`;
}

// Check if MFA is required for user role
export function isMFARequiredForRole(role: string, config: MFAConfig = DEFAULT_MFA_CONFIG): boolean {
  return config.enabled && config.requiredForRoles.includes(role);
}

// Check if user is locked out
export function isUserLockedOut(lockedUntil?: Date): boolean {
  if (!lockedUntil) return false;
  return new Date() < lockedUntil;
}

// Calculate lockout time
export function calculateLockoutTime(failedAttempts: number, config: MFAConfig = DEFAULT_MFA_CONFIG): Date {
  const lockoutMinutes = config.security.lockoutDurationMinutes;
  const lockoutTime = new Date();
  lockoutTime.setMinutes(lockoutTime.getMinutes() + lockoutMinutes);
  return lockoutTime;
}

// Validate MFA Code Format
export function validateMFACodeFormat(code: string, type: MFAType, config: MFAConfig = DEFAULT_MFA_CONFIG): boolean {
  switch (type) {
    case 'totp':
      return /^\d{6}$/.test(code);
    case 'sms':
    case 'email':
      return new RegExp(`^\\d{${config.sms.codeLength}}$`).test(code);
    case 'backup':
      return new RegExp(`^[A-Z0-9]{${config.backup.codeLength}}$`).test(code);
    default:
      return false;
  }
}

// Log MFA Security Event
export function logMFASecurityEvent(
  event: string,
  severity: AuditEventSeverity,
  userId: string,
  details: any,
  req?: any
): void {
  logSecurityEvent(
    `MFA_${event}`,
    severity,
    req || {} as any,
    {
      userId,
      ...details
    }
  );
}

// MFA Rate Limiting
export class MFARateLimiter {
  private attempts: Map<string, { count: number; lastAttempt: Date; lockedUntil?: Date }> = new Map();
  
  isRateLimited(identifier: string, maxAttempts: number = 5, windowMinutes: number = 15): boolean {
    const now = new Date();
    const record = this.attempts.get(identifier);
    
    if (!record) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return false;
    }
    
    // Check if locked out
    if (record.lockedUntil && now < record.lockedUntil) {
      return true;
    }
    
    // Reset if window has passed
    const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);
    if (record.lastAttempt < windowStart) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return false;
    }
    
    // Check if max attempts reached
    if (record.count >= maxAttempts) {
      record.lockedUntil = new Date(now.getTime() + 15 * 60 * 1000); // 15 minute lockout
      return true;
    }
    
    record.count++;
    record.lastAttempt = now;
    return false;
  }
  
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
  
  getRemainingAttempts(identifier: string, maxAttempts: number = 5): number {
    const record = this.attempts.get(identifier);
    if (!record) return maxAttempts;
    return Math.max(0, maxAttempts - record.count);
  }
}

// Export default configuration
export default DEFAULT_MFA_CONFIG;
