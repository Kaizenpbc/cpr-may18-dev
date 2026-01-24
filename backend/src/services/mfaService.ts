import { pool } from '../config/database.js';
import { Request } from 'express';
import {
  MFAConfig,
  MFAUserData, 
  MFAVerificationResult, 
  MFAType, 
  MFAStatus,
  generateTOTPSecret,
  generateBackupCodes,
  generateMFACode,
  generateDeviceFingerprint,
  validateTOTPCode,
  validateMFACodeFormat,
  isMFARequiredForRole,
  isUserLockedOut,
  calculateLockoutTime,
  logMFASecurityEvent,
  MFARateLimiter,
  DEFAULT_MFA_CONFIG
} from '../middleware/mfaConfig.js';
import { AuditEventSeverity } from '../middleware/auditLogger.js';
import { emailService } from './emailService.js';

// MFA Service Class
export class MFAService {
  private config: MFAConfig;
  private rateLimiter: MFARateLimiter;

  constructor(config: MFAConfig) {
    this.config = config;
    this.rateLimiter = new MFARateLimiter();
  }

  // Initialize MFA for user
  async initializeMFA(userId: string, userEmail: string, userRole: string): Promise<{
    success: boolean;
    totpSecret?: string;
    backupCodes?: string[];
    qrCodeURL?: string;
    message: string;
  }> {
    try {
      // Check if MFA is required for this role
      if (!isMFARequiredForRole(userRole, this.config)) {
        return {
          success: false,
          message: 'MFA is not required for your role'
        };
      }

      // Generate TOTP secret and backup codes
      const totpSecret = generateTOTPSecret();
      const backupCodes = generateBackupCodes(
        this.config.backup.codeCount,
        this.config.backup.codeLength
      );

      // Store MFA data in database
      await this.storeMFAUserData(userId, {
        userId,
        status: 'enabled',
        totpSecret,
        totpBackupCodes: backupCodes,
        smsVerified: false,
        emailVerified: false,
        failedAttempts: 0,
        trustedDevices: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Generate QR code URL
      const qrCodeURL = `otpauth://totp/${encodeURIComponent(userEmail)}?secret=${totpSecret}&issuer=${this.config.totp.issuer}`;

      // Log security event
      logMFASecurityEvent(
        'INITIALIZED',
        AuditEventSeverity.MEDIUM,
        userId,
        { userRole, totpSecret: '***', backupCodesCount: backupCodes.length }
      );

      return {
        success: true,
        totpSecret,
        backupCodes,
        qrCodeURL,
        message: 'MFA initialized successfully'
      };
    } catch (error) {
      console.error('MFA initialization error:', error);
      return {
        success: false,
        message: 'Failed to initialize MFA'
      };
    }
  }

  // Verify MFA code
  async verifyMFACode(
    userId: string,
    code: string,
    type: MFAType,
    deviceFingerprint?: string,
    req?: Request
  ): Promise<MFAVerificationResult> {
    try {
      // Check rate limiting
      if (this.rateLimiter.isRateLimited(userId, this.config.security.maxFailedAttempts)) {
        logMFASecurityEvent(
          'RATE_LIMITED',
          AuditEventSeverity.HIGH,
          userId,
          { type, code: '***' },
          req
        );
        return {
          success: false,
          type,
          message: 'Too many failed attempts. Please try again later.'
        };
      }

      // Get user MFA data
      const mfaData = await this.getMFAUserData(userId);
      if (!mfaData) {
        return {
          success: false,
          type,
          message: 'MFA not configured for user'
        };
      }

      // Check if user is locked out
      if (isUserLockedOut(mfaData.lockedUntil)) {
        return {
          success: false,
          type,
          message: 'Account is temporarily locked due to failed attempts',
          lockedUntil: mfaData.lockedUntil
        };
      }

      // Validate code format
      if (!validateMFACodeFormat(code, type, this.config)) {
        await this.recordFailedAttempt(userId);
        return {
          success: false,
          type,
          message: 'Invalid code format',
          remainingAttempts: this.rateLimiter.getRemainingAttempts(userId)
        };
      }

      // Verify code based on type
      let isValid = false;
      let usedBackupCode = false;

      switch (type) {
        case 'totp':
          if (mfaData.totpSecret) {
            isValid = validateTOTPCode(mfaData.totpSecret, code, this.config.totp.window);
          }
          break;

        case 'backup':
          if (mfaData.totpBackupCodes?.includes(code)) {
            isValid = true;
            usedBackupCode = true;
            // Remove used backup code
            await this.removeBackupCode(userId, code);
          }
          break;

        case 'sms':
        case 'email':
          // For SMS/Email, we would verify against stored codes
          // This would require additional implementation for code storage
          isValid = await this.verifyStoredCode(userId, code, type);
          break;
      }

      if (isValid) {
        // Reset failed attempts and update last MFA time
        await this.recordSuccessfulAttempt(userId, deviceFingerprint);

        // Log successful verification
        logMFASecurityEvent(
          'VERIFICATION_SUCCESS',
          AuditEventSeverity.LOW,
          userId,
          { type, usedBackupCode },
          req
        );

        return {
          success: true,
          type,
          message: 'MFA verification successful'
        };
      } else {
        // Record failed attempt
        await this.recordFailedAttempt(userId);

        // Log failed verification
        logMFASecurityEvent(
          'VERIFICATION_FAILED',
          AuditEventSeverity.MEDIUM,
          userId,
          { type, code: '***' },
          req
        );

        return {
          success: false,
          type,
          message: 'Invalid MFA code',
          remainingAttempts: this.rateLimiter.getRemainingAttempts(userId)
        };
      }
    } catch (error) {
      console.error('MFA verification error:', error);
      return {
        success: false,
        type,
        message: 'MFA verification failed'
      };
    }
  }

  // Send MFA code via email
  async sendEmailMFACode(userId: string, userEmail: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      if (!this.config.email.enabled) {
        return {
          success: false,
          message: 'Email MFA is not enabled'
        };
      }

      const code = generateMFACode(this.config.email.codeLength);
      
      // Store code in database with expiry
      await this.storeMFACode(userId, 'email', code, this.config.email.expiryMinutes);

      // Send email
      await emailService.sendMFAVerificationCode(
        userEmail,
        code,
        this.config.email.expiryMinutes
      );

      // Log security event
      logMFASecurityEvent(
        'EMAIL_CODE_SENT',
        AuditEventSeverity.LOW,
        userId,
        { userEmail, codeLength: code.length }
      );

      return {
        success: true,
        message: 'MFA code sent to email'
      };
    } catch (error) {
      console.error('Email MFA code error:', error);
      return {
        success: false,
        message: 'Failed to send MFA code'
      };
    }
  }

  // Disable MFA for user
  async disableMFA(userId: string, req?: Request): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await pool.query(
        'UPDATE mfa_users SET status = $1, updated_at = NOW() WHERE user_id = $2',
        ['disabled', userId]
      );

      // Log security event
      logMFASecurityEvent(
        'DISABLED',
        AuditEventSeverity.MEDIUM,
        userId,
        {},
        req
      );

      return {
        success: true,
        message: 'MFA disabled successfully'
      };
    } catch (error) {
      console.error('MFA disable error:', error);
      return {
        success: false,
        message: 'Failed to disable MFA'
      };
    }
  }

  // Get MFA status for user
  async getMFAStatus(userId: string): Promise<{
    enabled: boolean;
    status: MFAStatus;
    hasBackupCodes: boolean;
    trustedDevices: number;
  }> {
    try {
      const mfaData = await this.getMFAUserData(userId);
      
      if (!mfaData) {
        return {
          enabled: false,
          status: 'disabled',
          hasBackupCodes: false,
          trustedDevices: 0
        };
      }

      return {
        enabled: mfaData.status !== 'disabled',
        status: mfaData.status,
        hasBackupCodes: (mfaData.totpBackupCodes?.length || 0) > 0,
        trustedDevices: mfaData.trustedDevices.length
      };
    } catch (error) {
      console.error('Get MFA status error:', error);
      return {
        enabled: false,
        status: 'disabled',
        hasBackupCodes: false,
        trustedDevices: 0
      };
    }
  }

  // Private helper methods
  private async storeMFAUserData(userId: string, data: MFAUserData): Promise<void> {
    await pool.query(
      `INSERT INTO mfa_users (user_id, status, totp_secret, totp_backup_codes, sms_verified, 
       email_verified, failed_attempts, trusted_devices, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (user_id) DO UPDATE SET
       status = $2, totp_secret = $3, totp_backup_codes = $4, sms_verified = $5,
       email_verified = $6, failed_attempts = $7, trusted_devices = $8, updated_at = $10`,
      [
        userId, data.status, data.totpSecret, data.totpBackupCodes,
        data.smsVerified, data.emailVerified, data.failedAttempts,
        data.trustedDevices, data.createdAt, data.updatedAt
      ]
    );
  }

  private async getMFAUserData(userId: string): Promise<MFAUserData | null> {
    const result = await pool.query(
      'SELECT * FROM mfa_users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      userId: row.user_id,
      status: row.status,
      totpSecret: row.totp_secret,
      totpBackupCodes: row.totp_backup_codes,
      smsVerified: row.sms_verified,
      emailVerified: row.email_verified,
      lastMfaTime: row.last_mfa_time,
      failedAttempts: row.failed_attempts,
      lockedUntil: row.locked_until,
      trustedDevices: row.trusted_devices || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private async recordFailedAttempt(userId: string): Promise<void> {
    const result = await pool.query(
      'SELECT failed_attempts FROM mfa_users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) return;

    const failedAttempts = result.rows[0].failed_attempts + 1;
    const lockedUntil = failedAttempts >= this.config.security.maxFailedAttempts 
      ? calculateLockoutTime(failedAttempts, this.config)
      : null;

    await pool.query(
      'UPDATE mfa_users SET failed_attempts = $1, locked_until = $2, updated_at = NOW() WHERE user_id = $3',
      [failedAttempts, lockedUntil, userId]
    );
  }

  private async recordSuccessfulAttempt(userId: string, deviceFingerprint?: string): Promise<void> {
    const updates = ['failed_attempts = 0', 'locked_until = NULL', 'last_mfa_time = NOW()'];
    const values = [userId];

    if (deviceFingerprint && this.config.security.allowRememberDevice) {
      updates.push('trusted_devices = array_append(trusted_devices, $2)');
      values.push(deviceFingerprint);
    }

    await pool.query(
      `UPDATE mfa_users SET ${updates.join(', ')}, updated_at = NOW() WHERE user_id = $1`,
      values
    );
  }

  private async removeBackupCode(userId: string, code: string): Promise<void> {
    await pool.query(
      'UPDATE mfa_users SET totp_backup_codes = array_remove(totp_backup_codes, $1), updated_at = NOW() WHERE user_id = $2',
      [code, userId]
    );
  }

  private async storeMFACode(userId: string, type: string, code: string, expiryMinutes: number): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    await pool.query(
      'INSERT INTO mfa_codes (user_id, type, code, expires_at) VALUES ($1, $2, $3, $4)',
      [userId, type, code, expiresAt]
    );
  }

  private async verifyStoredCode(userId: string, code: string, type: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM mfa_codes WHERE user_id = $1 AND type = $2 AND code = $3 AND expires_at > NOW() RETURNING id',
      [userId, type, code]
    );

    return result.rows.length > 0;
  }
}

// Export singleton instance
export const mfaService = new MFAService(DEFAULT_MFA_CONFIG);
