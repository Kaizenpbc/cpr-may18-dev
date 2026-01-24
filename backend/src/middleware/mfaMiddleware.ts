import { Request, Response, NextFunction } from 'express';
import { mfaService } from '../services/mfaService.js';
import { generateDeviceFingerprint, isMFARequiredForRole, logMFASecurityEvent } from './mfaConfig.js';
import { AuditEventSeverity } from './auditLogger.js';

// MFA Middleware
export const requireMFA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        }
      });
    }

    // Check if MFA is required for this user's role
    if (!isMFARequiredForRole(user.role)) {
      return next();
    }

    // Check if MFA is verified in this session
    if (req.mfaVerified) {
      return next();
    }

    // Check if device is trusted
    const deviceFingerprint = generateDeviceFingerprint(
      req.get('User-Agent') || '',
      req.ip || req.connection.remoteAddress || ''
    );

    const mfaStatus = await mfaService.getMFAStatus(String(user.id));
    
    if (mfaStatus.enabled && mfaStatus.trustedDevices > 0) {
      // Check if current device is trusted
      // This would require additional implementation to check trusted devices
      // For now, we'll require MFA verification
    }

    // MFA verification required
    return res.status(403).json({
      success: false,
      error: {
        code: 'MFA_REQUIRED',
        message: 'Multi-factor authentication required',
        mfaRequired: true,
        mfaStatus: mfaStatus
      }
    });

  } catch (error) {
    console.error('MFA middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'MFA_ERROR',
        message: 'MFA verification error'
      }
    });
  }
};

// MFA Verification Middleware
export const verifyMFA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const { mfaCode, mfaType } = req.body;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        }
      });
    }

    if (!mfaCode || !mfaType) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MFA_CODE_REQUIRED',
          message: 'MFA code and type are required'
        }
      });
    }

    // Generate device fingerprint
    const deviceFingerprint = generateDeviceFingerprint(
      req.get('User-Agent') || '',
      req.ip || req.connection.remoteAddress || ''
    );

    // Verify MFA code
    const verificationResult = await mfaService.verifyMFACode(
      String(user.id),
      mfaCode,
      mfaType,
      deviceFingerprint,
      req
    );

    if (verificationResult.success) {
      // Mark MFA as verified in session
      req.mfaVerified = true;
      req.mfaType = mfaType;
      req.mfaTime = new Date();
      
      // Log successful MFA verification
      logMFASecurityEvent(
        'MIDDLEWARE_VERIFICATION_SUCCESS',
        AuditEventSeverity.LOW,
        String(user.id),
        { mfaType, deviceFingerprint },
        req
      );

      return next();
    } else {
      // Log failed MFA verification
      logMFASecurityEvent(
        'MIDDLEWARE_VERIFICATION_FAILED',
        AuditEventSeverity.MEDIUM,
        String(user.id),
        { mfaType, deviceFingerprint, error: verificationResult.message },
        req
      );

      return res.status(403).json({
        success: false,
        error: {
          code: 'MFA_VERIFICATION_FAILED',
          message: verificationResult.message,
          remainingAttempts: verificationResult.remainingAttempts,
          lockedUntil: verificationResult.lockedUntil
        }
      });
    }

  } catch (error) {
    console.error('MFA verification middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'MFA_ERROR',
        message: 'MFA verification error'
      }
    });
  }
};

// MFA Status Check Middleware
export const checkMFAStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        }
      });
    }

    const mfaStatus = await mfaService.getMFAStatus(String(user.id));
    
    // Add MFA status to request
    req.mfaStatus = mfaStatus;
    
    next();

  } catch (error) {
    console.error('MFA status check error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'MFA_ERROR',
        message: 'MFA status check error'
      }
    });
  }
};

// MFA Bypass for Trusted Devices
export const bypassMFAForTrustedDevice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    if (!user) {
      return next();
    }

    // Generate device fingerprint
    const deviceFingerprint = generateDeviceFingerprint(
      req.get('User-Agent') || '',
      req.ip || req.connection.remoteAddress || ''
    );

    // Check if device is trusted
    const mfaStatus = await mfaService.getMFAStatus(String(user.id));
    
    if (mfaStatus.enabled && mfaStatus.trustedDevices > 0) {
      // This would require additional implementation to check if current device is trusted
      // For now, we'll always require MFA verification
    }

    next();

  } catch (error) {
    console.error('MFA bypass error:', error);
    next(); // Continue with normal MFA flow
  }
};

// MFA Rate Limiting Middleware
export const mfaRateLimit = (maxAttempts: number = 5, windowMinutes: number = 15) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      
      if (!user) {
        return next();
      }

      // Check rate limiting
      const isRateLimited = mfaService['rateLimiter'].isRateLimited(
        String(user.id),
        maxAttempts,
        windowMinutes
      );

      if (isRateLimited) {
        // Log rate limiting event
        logMFASecurityEvent(
          'RATE_LIMITED',
          AuditEventSeverity.HIGH,
          String(user.id),
          { maxAttempts, windowMinutes },
          req
        );

        return res.status(429).json({
          success: false,
          error: {
            code: 'MFA_RATE_LIMITED',
            message: 'Too many MFA attempts. Please try again later.',
            retryAfter: windowMinutes * 60
          }
        });
      }

      next();

    } catch (error) {
      console.error('MFA rate limit error:', error);
      next(); // Continue with normal flow
    }
  };
};

// MFA Audit Middleware
export const mfaAudit = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      
      if (user) {
        // Log MFA action
        logMFASecurityEvent(
          `AUDIT_${action.toUpperCase()}`,
          AuditEventSeverity.LOW,
          String(user.id),
          { action, endpoint: req.path, method: req.method },
          req
        );
      }

      next();

    } catch (error) {
      console.error('MFA audit error:', error);
      next(); // Continue with normal flow
    }
  };
};

// Export all middleware
export default {
  requireMFA,
  verifyMFA,
  checkMFAStatus,
  bypassMFAForTrustedDevice,
  mfaRateLimit,
  mfaAudit
};
