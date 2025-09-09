import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { logSecurityEvent, AuditEventSeverity } from './auditLogger.js';

// Request validation configuration
export interface ValidationConfig {
  maxStringLength: number;
  maxArrayLength: number;
  maxObjectDepth: number;
  allowedFileTypes: string[];
  maxFileSize: number;
  sanitizeInput: boolean;
  strictMode: boolean;
}

const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  maxStringLength: 10000,
  maxArrayLength: 1000,
  maxObjectDepth: 10,
  allowedFileTypes: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  sanitizeInput: true,
  strictMode: true
};

// Common validation rules
export const commonValidations = {
  // ID validation
  id: (field: string = 'id'): ValidationChain => 
    param(field)
      .isInt({ min: 1 })
      .withMessage(`${field} must be a positive integer`),

  // UUID validation
  uuid: (field: string = 'id'): ValidationChain =>
    param(field)
      .isUUID()
      .withMessage(`${field} must be a valid UUID`),

  // Email validation
  email: (field: string = 'email'): ValidationChain =>
    body(field)
      .isEmail()
      .normalizeEmail()
      .withMessage('Must be a valid email address')
      .isLength({ max: 255 })
      .withMessage('Email must be less than 255 characters'),

  // Password validation
  password: (field: string = 'password'): ValidationChain =>
    body(field)
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),

  // Username validation
  username: (field: string = 'username'): ValidationChain =>
    body(field)
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),

  // Phone number validation
  phone: (field: string = 'phone'): ValidationChain =>
    body(field)
      .optional()
      .isMobilePhone('any')
      .withMessage('Must be a valid phone number'),

  // URL validation
  url: (field: string = 'url'): ValidationChain =>
    body(field)
      .optional()
      .isURL()
      .withMessage('Must be a valid URL'),

  // Date validation
  date: (field: string = 'date'): ValidationChain =>
    body(field)
      .optional()
      .isISO8601()
      .withMessage('Must be a valid ISO 8601 date'),

  // Pagination validation
  pagination: (): ValidationChain[] => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  // Role validation
  role: (field: string = 'role'): ValidationChain =>
    body(field)
      .isIn(['admin', 'instructor', 'organization', 'accountant', 'hr', 'courseadmin', 'vendor', 'sysadmin'])
      .withMessage('Role must be one of: admin, instructor, organization, accountant, hr, courseadmin, vendor, sysadmin'),

  // Status validation
  status: (field: string = 'status'): ValidationChain =>
    body(field)
      .optional()
      .isIn(['active', 'inactive', 'pending', 'approved', 'rejected'])
      .withMessage('Status must be one of: active, inactive, pending, approved, rejected')
};

// Input sanitization
export function sanitizeInput(input: any, config: ValidationConfig = DEFAULT_VALIDATION_CONFIG): any {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim()
      .substring(0, config.maxStringLength);
  }
  
  if (Array.isArray(input)) {
    if (input.length > config.maxArrayLength) {
      return input.slice(0, config.maxArrayLength);
    }
    return input.map(item => sanitizeInput(item, config));
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    let depth = 0;
    
    for (const [key, value] of Object.entries(input)) {
      if (depth >= config.maxObjectDepth) break;
      
      // Sanitize key
      const cleanKey = key.replace(/[^a-zA-Z0-9_-]/g, '');
      if (cleanKey) {
        sanitized[cleanKey] = sanitizeInput(value, { ...config, maxObjectDepth: config.maxObjectDepth - 1 });
      }
    }
    
    return sanitized;
  }
  
  return input;
}

// Request size validation
export function validateRequestSize(req: Request, config: ValidationConfig = DEFAULT_VALIDATION_CONFIG): boolean {
  const contentLength = parseInt(req.get('Content-Length') || '0');
  return contentLength <= config.maxFileSize;
}

// File type validation
export function validateFileType(filename: string, config: ValidationConfig = DEFAULT_VALIDATION_CONFIG): boolean {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return config.allowedFileTypes.includes(extension);
}

// Main request validation middleware
export const requestValidator = (config: Partial<ValidationConfig> = {}) => {
  const validationConfig = { ...DEFAULT_VALIDATION_CONFIG, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Validate request size
      if (!validateRequestSize(req, validationConfig)) {
        await logSecurityEvent(
          'REQUEST_SIZE_EXCEEDED',
          AuditEventSeverity.MEDIUM,
          req,
          { 
            contentLength: req.get('Content-Length'),
            maxSize: validationConfig.maxFileSize 
          }
        );
        return res.status(413).json({
          success: false,
          error: {
            code: 'REQUEST_TOO_LARGE',
            message: 'Request size exceeds maximum allowed'
          }
        });
      }

      // 2. Sanitize input if enabled
      if (validationConfig.sanitizeInput) {
        req.body = sanitizeInput(req.body, validationConfig);
        req.query = sanitizeInput(req.query, validationConfig);
        req.params = sanitizeInput(req.params, validationConfig);
      }

      // 3. Validate file uploads
      if (req.file) {
        if (!validateFileType(req.file.originalname, validationConfig)) {
          await logSecurityEvent(
            'INVALID_FILE_TYPE',
            AuditEventSeverity.MEDIUM,
            req,
            { filename: req.file.originalname, allowedTypes: validationConfig.allowedFileTypes }
          );
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_FILE_TYPE',
              message: 'File type not allowed'
            }
          });
        }

        if (req.file.size > validationConfig.maxFileSize) {
          await logSecurityEvent(
            'FILE_SIZE_EXCEEDED',
            AuditEventSeverity.MEDIUM,
            req,
            { 
              filename: req.file.originalname,
              size: req.file.size,
              maxSize: validationConfig.maxFileSize 
            }
          );
          return res.status(400).json({
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'File size exceeds maximum allowed'
            }
          });
        }
      }

      // 4. Validate multiple files
      if (req.files) {
        const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
        
        for (const file of files) {
          if (!validateFileType(file.originalname, validationConfig)) {
            await logSecurityEvent(
              'INVALID_FILE_TYPE',
              AuditEventSeverity.MEDIUM,
              req,
              { filename: file.originalname, allowedTypes: validationConfig.allowedFileTypes }
            );
            return res.status(400).json({
              success: false,
              error: {
                code: 'INVALID_FILE_TYPE',
                message: 'File type not allowed'
              }
            });
          }

          if (file.size > validationConfig.maxFileSize) {
            await logSecurityEvent(
              'FILE_SIZE_EXCEEDED',
              AuditEventSeverity.MEDIUM,
              req,
              { 
                filename: file.originalname,
                size: file.size,
                maxSize: validationConfig.maxFileSize 
              }
            );
            return res.status(400).json({
              success: false,
              error: {
                code: 'FILE_TOO_LARGE',
                message: 'File size exceeds maximum allowed'
              }
            });
          }
        }
      }

      next();
    } catch (error) {
      console.error('Request validation error:', error);
      await logSecurityEvent(
        'REQUEST_VALIDATION_ERROR',
        AuditEventSeverity.HIGH,
        req,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      next();
    }
  };
};

// Validation result handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined
    }));

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: errorMessages
      }
    });
  }
  
  next();
};

// Custom validation rules
export const customValidations = {
  // Check if value is not empty
  notEmpty: (field: string): ValidationChain =>
    body(field)
      .notEmpty()
      .withMessage(`${field} is required`),

  // Check if value is a positive number
  positiveNumber: (field: string): ValidationChain =>
    body(field)
      .isFloat({ min: 0 })
      .withMessage(`${field} must be a positive number`),

  // Check if value is a valid currency amount
  currency: (field: string): ValidationChain =>
    body(field)
      .isFloat({ min: 0 })
      .withMessage(`${field} must be a valid currency amount`),

  // Check if value is a valid percentage
  percentage: (field: string): ValidationChain =>
    body(field)
      .isFloat({ min: 0, max: 100 })
      .withMessage(`${field} must be a valid percentage (0-100)`),

  // Check if value is a valid time
  time: (field: string): ValidationChain =>
    body(field)
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage(`${field} must be a valid time (HH:MM)`),

  // Check if value is a valid date range
  dateRange: (startField: string, endField: string): ValidationChain[] => [
    body(startField)
      .isISO8601()
      .withMessage(`${startField} must be a valid date`),
    body(endField)
      .isISO8601()
      .withMessage(`${endField} must be a valid date`)
      .custom((value, { req }) => {
        const startDate = new Date(req.body[startField]);
        const endDate = new Date(value);
        if (endDate <= startDate) {
          throw new Error(`${endField} must be after ${startField}`);
        }
        return true;
      })
  ]
};

// Export validation config for use in other modules
export { DEFAULT_VALIDATION_CONFIG };
