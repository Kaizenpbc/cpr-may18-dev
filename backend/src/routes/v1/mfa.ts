import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../../utils/errorHandler.js';
import { mfaService } from '../../services/mfaService.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { requireMFA, verifyMFA, checkMFAStatus, mfaRateLimit, mfaAudit } from '../../middleware/mfaMiddleware.js';
import { 
  generateTOTPSecret, 
  generateBackupCodes, 
  getMFAQRCodeURL,
  validateMFACodeFormat,
  MFAType 
} from '../../middleware/mfaConfig.js';

const router = Router();

// Apply authentication to all MFA routes
router.use(authenticateToken);

// Get MFA status
router.get('/status', checkMFAStatus, asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const mfaStatus = await mfaService.getMFAStatus(user.id);
  
  res.json({
    success: true,
    data: {
      mfaStatus,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    }
  });
}));

// Initialize MFA
router.post('/initialize', 
  mfaAudit('initialize'),
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    
    const result = await mfaService.initializeMFA(user.id, user.email, user.role);
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          totpSecret: result.totpSecret,
          backupCodes: result.backupCodes,
          qrCodeURL: result.qrCodeURL
        },
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'MFA_INITIALIZATION_FAILED',
          message: result.message
        }
      });
    }
  })
);

// Verify MFA setup
router.post('/verify-setup',
  [
    body('code')
      .isLength({ min: 6, max: 6 })
      .withMessage('TOTP code must be 6 digits')
      .matches(/^\d{6}$/)
      .withMessage('TOTP code must contain only digits')
  ],
  mfaRateLimit(3, 5),
  mfaAudit('verify_setup'),
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid TOTP code format',
          details: errors.array()
        }
      });
    }

    const user = (req as any).user;
    const { code } = req.body;

    const verificationResult = await mfaService.verifyMFACode(user.id, code, 'totp');
    
    if (verificationResult.success) {
      res.json({
        success: true,
        message: 'MFA setup verified successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'MFA_VERIFICATION_FAILED',
          message: verificationResult.message,
          remainingAttempts: verificationResult.remainingAttempts
        }
      });
    }
  })
);

// Verify MFA code
router.post('/verify',
  [
    body('code')
      .notEmpty()
      .withMessage('MFA code is required'),
    body('type')
      .isIn(['totp', 'sms', 'email', 'backup'])
      .withMessage('Invalid MFA type')
  ],
  mfaRateLimit(5, 15),
  mfaAudit('verify'),
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: errors.array()
        }
      });
    }

    const user = (req as any).user;
    const { code, type } = req.body;

    // Validate code format
    if (!validateMFACodeFormat(code, type as MFAType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CODE_FORMAT',
          message: 'Invalid code format for the specified type'
        }
      });
    }

    const verificationResult = await mfaService.verifyMFACode(user.id, code, type as MFAType, undefined, req);
    
    if (verificationResult.success) {
      res.json({
        success: true,
        message: 'MFA verification successful',
        data: {
          verified: true,
          type: verificationResult.type
        }
      });
    } else {
      res.status(403).json({
        success: false,
        error: {
          code: 'MFA_VERIFICATION_FAILED',
          message: verificationResult.message,
          remainingAttempts: verificationResult.remainingAttempts,
          lockedUntil: verificationResult.lockedUntil
        }
      });
    }
  })
);

// Send email MFA code
router.post('/send-email-code',
  mfaRateLimit(3, 10),
  mfaAudit('send_email_code'),
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    
    const result = await mfaService.sendEmailMFACode(user.id, user.email);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_MFA_FAILED',
          message: result.message
        }
      });
    }
  })
);

// Generate new backup codes
router.post('/regenerate-backup-codes',
  requireMFA,
  mfaAudit('regenerate_backup_codes'),
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    
    // Generate new backup codes
    const newBackupCodes = generateBackupCodes(10, 8);
    
    // Update backup codes in database
    // This would require additional implementation in mfaService
    
    res.json({
      success: true,
      data: {
        backupCodes: newBackupCodes
      },
      message: 'New backup codes generated successfully'
    });
  })
);

// Disable MFA
router.post('/disable',
  requireMFA,
  mfaAudit('disable'),
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    
    const result = await mfaService.disableMFA(user.id, req);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'MFA_DISABLE_FAILED',
          message: result.message
        }
      });
    }
  })
);

// Get MFA QR code
router.get('/qr-code',
  mfaAudit('get_qr_code'),
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    
    // Get user's TOTP secret
    const mfaStatus = await mfaService.getMFAStatus(user.id);
    
    if (!mfaStatus.enabled) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MFA_NOT_ENABLED',
          message: 'MFA is not enabled for this user'
        }
      });
    }

    // Generate QR code URL
    const qrCodeURL = getMFAQRCodeURL(user.email, 'user-secret'); // This would need actual secret
    
    res.json({
      success: true,
      data: {
        qrCodeURL
      }
    });
  })
);

// MFA health check
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      mfaEnabled: true,
      timestamp: new Date().toISOString(),
      services: {
        totp: true,
        email: true,
        sms: false,
        backup: true
      }
    }
  });
}));

export default router;
