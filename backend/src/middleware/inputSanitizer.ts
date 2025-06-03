import { Request, Response, NextFunction } from 'express';
import joi from 'joi';
import { body, validationResult, matchedData } from 'express-validator';
import validator from 'validator';
import xss from 'xss';

// XSS sanitization configuration
const xssOptions = {
  whiteList: {}, // No HTML tags allowed
  stripIgnoreTag: true, // Remove tags instead of escaping
  stripIgnoreTagBody: ['script'], // Remove script tag content
};

/**
 * Sanitizes a string value by:
 * 1. Trimming whitespace
 * 2. Removing XSS attempts
 * 3. Escaping SQL injection patterns
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }
  
  // Basic sanitization
  let sanitized = input.trim();
  
  // XSS protection
  sanitized = xss(sanitized, xssOptions);
  
  // Additional SQL injection pattern removal
  sanitized = sanitized.replace(/['";\\]/g, ''); // Remove common SQL injection chars
  sanitized = sanitized.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|OR|AND)\b)/gi, '');
  
  return sanitized;
}

/**
 * Sanitizes an object recursively
 */
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key as well
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Express middleware for input sanitization
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  console.log('🧼 [INPUT SANITIZER] Processing request:', {
    method: req.method,
    path: req.path,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    queryKeys: Object.keys(req.query),
    paramsKeys: Object.keys(req.params)
  });

  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
      console.log('🧼 [INPUT SANITIZER] Body sanitized');
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
      console.log('🧼 [INPUT SANITIZER] Query parameters sanitized');
    }
    
    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
      console.log('🧼 [INPUT SANITIZER] URL parameters sanitized');
    }
    
    console.log('✅ [INPUT SANITIZER] Request sanitization completed');
    next();
  } catch (error) {
    console.error('❌ [INPUT SANITIZER] Error during sanitization:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'INPUT_SANITIZATION_ERROR',
        message: 'Invalid input data format'
      }
    });
  }
};

/**
 * Schema validation middleware factory
 */
export const validateSchema = (schema: joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true, // Remove unknown fields
      convert: true // Convert types when possible
    });
    
    if (error) {
      console.error('❌ [SCHEMA VALIDATION] Validation failed:', {
        path: req.path,
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input validation failed',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        }
      });
    }
    
    // Replace request body with validated and sanitized data
    req.body = value;
    console.log('✅ [SCHEMA VALIDATION] Validation passed for:', req.path);
    next();
  };
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // User authentication
  login: joi.object({
    username: joi.string()
      .alphanum()
      .min(3)
      .max(50)
      .required()
      .messages({
        'string.alphanum': 'Username can only contain alphanumeric characters',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 50 characters'
      }),
    password: joi.string()
      .min(6)
      .max(100)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long'
      })
  }),
  
  // User registration/creation
  userCreate: joi.object({
    username: joi.string()
      .alphanum()
      .min(3)
      .max(50)
      .required(),
    email: joi.string()
      .email()
      .max(100)
      .required(),
    firstName: joi.string()
      .min(1)
      .max(50)
      .pattern(/^[a-zA-Z\s'-]+$/)
      .required()
      .messages({
        'string.pattern.base': 'First name can only contain letters, spaces, hyphens and apostrophes'
      }),
    lastName: joi.string()
      .min(1)
      .max(50)
      .pattern(/^[a-zA-Z\s'-]+$/)
      .required(),
    role: joi.string()
      .valid('admin', 'instructor', 'organization', 'accounting', 'system_admin')
      .required(),
    organizationId: joi.number().integer().positive().optional()
  }),
  
  // Course request
  courseRequest: joi.object({
    courseTypeId: joi.number().integer().positive().required(),
    requestedDate: joi.date().min('now').required(),
    locationAddress: joi.string().min(5).max(200).required(),
    estimatedStudents: joi.number().integer().min(1).max(100).required(),
    contactName: joi.string().min(2).max(100).required(),
    contactPhone: joi.string()
      .pattern(/^[\d\s\-\(\)\+]+$/)
      .min(10)
      .max(20)
      .required()
      .messages({
        'string.pattern.base': 'Phone number contains invalid characters'
      }),
    contactEmail: joi.string().email().max(100).required(),
    specialRequirements: joi.string().max(500).optional().allow('')
  }),
  
  // Email template
  emailTemplate: joi.object({
    name: joi.string().min(1).max(100).required(),
    category: joi.string()
      .valid('Instructor', 'Organization', 'Other')
      .required(),
    subCategory: joi.string().max(50).optional().allow(''),
    subject: joi.string().min(1).max(200).required(),
    body: joi.string().min(1).max(10000).required(),
    active: joi.boolean().default(true)
  }),
  
  // Invoice payment submission
  paymentSubmission: joi.object({
    paymentMethod: joi.string()
      .valid('check', 'wire_transfer', 'ach', 'credit_card', 'cash')
      .required(),
    referenceNumber: joi.string().min(1).max(50).required(),
    paymentDate: joi.date().max('now').required(),
    amount: joi.number().positive().precision(2).required(),
    notes: joi.string().max(500).optional().allow('')
  }),
  
  // Generic ID parameter
  idParam: joi.object({
    id: joi.number().integer().positive().required()
  })
};

/**
 * Input validation for specific endpoints
 */
export const validateLogin = validateSchema(commonSchemas.login);
export const validateUserCreate = validateSchema(commonSchemas.userCreate);
export const validateCourseRequest = validateSchema(commonSchemas.courseRequest);
export const validateEmailTemplate = validateSchema(commonSchemas.emailTemplate);
export const validatePaymentSubmission = validateSchema(commonSchemas.paymentSubmission);

/**
 * SQL injection detection patterns
 */
const sqlInjectionPatterns = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION)\b)/gi,
  /('|(\\)|;|--|\/\*|\*\/)/g,
  /(OR|AND)\s+\d+\s*=\s*\d+/gi,
  /UNION\s+SELECT/gi,
  /('\s*(OR|AND)\s*')/gi
];

/**
 * XSS detection patterns
 */
const xssPatterns = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<[^>]*\s(onclick|onload|onerror|onmouseover)\s*=/gi
];

/**
 * Advanced security middleware for detecting potential attacks
 */
export const detectMaliciousInput = (req: Request, res: Response, next: NextFunction): Response | void => {
  const allInput = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params
  });
  
  // Check for SQL injection patterns
  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(allInput)) {
      console.error('🚨 [SECURITY ALERT] SQL injection attempt detected:', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        pattern: pattern.source
      });
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'MALICIOUS_INPUT_DETECTED',
          message: 'Potentially malicious input detected'
        }
      });
    }
  }
  
  // Check for XSS patterns
  for (const pattern of xssPatterns) {
    if (pattern.test(allInput)) {
      console.error('🚨 [SECURITY ALERT] XSS attempt detected:', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        pattern: pattern.source
      });
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'MALICIOUS_INPUT_DETECTED',
          message: 'Potentially malicious input detected'
        }
      });
    }
  }
  
  console.log('✅ [SECURITY CHECK] No malicious patterns detected');
  next();
}; 