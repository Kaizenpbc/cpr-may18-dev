import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../../utils/errorHandler.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { requireMFA } from '../../middleware/mfaMiddleware.js';
import { databaseEncryptionService } from '../../services/encryptionService.js';
import { encryptionService } from '../../config/encryptionConfig.js';
import { logSecurityEvent, AuditEventSeverity } from '../../middleware/auditLogger.js';

const router = Router();

// Apply authentication to all encryption routes
router.use(authenticateToken);

// Get encryption status and statistics
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const stats = encryptionService.getEncryptionStats();
  const config = await databaseEncryptionService.validateEncryptionConfig();
  
  res.json({
    success: true,
    data: {
      encryptionEnabled: true,
      statistics: stats,
      configuration: config,
      timestamp: new Date().toISOString()
    }
  });
}));

// Test encryption/decryption
router.post('/test',
  requireMFA,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    
    const testResult = await databaseEncryptionService.testEncryption();
    
    // Log encryption test
    logSecurityEvent(
      'ENCRYPTION_TEST_PERFORMED',
      AuditEventSeverity.LOW,
      req,
      {
        userId: user.id,
        success: testResult.success,
        testData: testResult.testData
      }
    );
    
    res.json({
      success: testResult.success,
      data: {
        testResult,
        timestamp: new Date().toISOString()
      },
      message: testResult.message
    });
  })
);

// Rotate encryption keys
router.post('/rotate-keys',
  requireMFA,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    
    const rotationResult = await databaseEncryptionService.rotateEncryptionKeys();
    
    if (rotationResult.success) {
      // Log key rotation
      logSecurityEvent(
        'ENCRYPTION_KEYS_ROTATED_BY_USER',
        AuditEventSeverity.MEDIUM,
        req,
        {
          userId: user.id,
          newKeyId: rotationResult.newKeyId
        }
      );
      
      res.json({
        success: true,
        data: {
          newKeyId: rotationResult.newKeyId,
          timestamp: new Date().toISOString()
        },
        message: rotationResult.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'KEY_ROTATION_FAILED',
          message: rotationResult.message
        }
      });
    }
  })
);

// Encrypt specific data
router.post('/encrypt',
  [
    body('data')
      .notEmpty()
      .withMessage('Data to encrypt is required'),
    body('tableName')
      .optional()
      .isString()
      .withMessage('Table name must be a string'),
    body('fieldName')
      .optional()
      .isString()
      .withMessage('Field name must be a string')
  ],
  requireMFA,
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
    const { data, tableName, fieldName } = req.body;

    try {
      let encryptedData: string;
      
      if (tableName && fieldName) {
        // Encrypt for specific table/field
        encryptedData = await databaseEncryptionService.encryptDataForStorage(
          data,
          tableName,
          fieldName
        );
      } else {
        // General encryption
        const encryptionResult = encryptionService.encrypt(data);
        encryptedData = JSON.stringify(encryptionResult);
      }

      // Log encryption operation
      logSecurityEvent(
        'MANUAL_ENCRYPTION_PERFORMED',
        AuditEventSeverity.LOW,
        req,
        {
          userId: user.id,
          tableName,
          fieldName,
          dataLength: data.length
        }
      );

      res.json({
        success: true,
        data: {
          encryptedData,
          originalData: data,
          timestamp: new Date().toISOString()
        },
        message: 'Data encrypted successfully'
      });
    } catch (error) {
      console.error('Encryption error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ENCRYPTION_FAILED',
          message: 'Failed to encrypt data'
        }
      });
    }
  })
);

// Decrypt specific data
router.post('/decrypt',
  [
    body('encryptedData')
      .notEmpty()
      .withMessage('Encrypted data is required'),
    body('tableName')
      .optional()
      .isString()
      .withMessage('Table name must be a string'),
    body('fieldName')
      .optional()
      .isString()
      .withMessage('Field name must be a string')
  ],
  requireMFA,
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
    const { encryptedData, tableName, fieldName } = req.body;

    try {
      let decryptedData: string;
      
      if (tableName && fieldName) {
        // Decrypt for specific table/field
        decryptedData = await databaseEncryptionService.decryptDataFromStorage(
          encryptedData,
          tableName,
          fieldName
        );
      } else {
        // General decryption
        const parsed = JSON.parse(encryptedData);
        const decryptionResult = encryptionService.decrypt(
          parsed.encryptedData,
          parsed.keyId,
          parsed.iv,
          parsed.tag
        );
        decryptedData = decryptionResult.decryptedData;
      }

      // Log decryption operation
      logSecurityEvent(
        'MANUAL_DECRYPTION_PERFORMED',
        AuditEventSeverity.LOW,
        req,
        {
          userId: user.id,
          tableName,
          fieldName,
          dataLength: decryptedData.length
        }
      );

      res.json({
        success: true,
        data: {
          decryptedData,
          encryptedData,
          timestamp: new Date().toISOString()
        },
        message: 'Data decrypted successfully'
      });
    } catch (error) {
      console.error('Decryption error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DECRYPTION_FAILED',
          message: 'Failed to decrypt data'
        }
      });
    }
  })
);

// Get encryption configuration
router.get('/config', asyncHandler(async (req: Request, res: Response) => {
  const config = await databaseEncryptionService.validateEncryptionConfig();
  
  res.json({
    success: true,
    data: {
      configuration: config,
      timestamp: new Date().toISOString()
    }
  });
}));

// Get encryption statistics
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const stats = await databaseEncryptionService.getEncryptionStats();
  
  res.json({
    success: true,
    data: {
      statistics: stats,
      timestamp: new Date().toISOString()
    }
  });
}));

// Encryption health check
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const config = await databaseEncryptionService.validateEncryptionConfig();
  const testResult = await databaseEncryptionService.testEncryption();
  
  res.json({
    success: true,
    data: {
      encryptionEnabled: true,
      configurationValid: config.valid,
      testPassed: testResult.success,
      issues: config.issues,
      warnings: config.warnings,
      timestamp: new Date().toISOString()
    }
  });
}));

export default router;
