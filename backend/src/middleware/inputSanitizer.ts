import { Request, Response, NextFunction } from 'express';
import joi from 'joi';
import { body, validationResult, matchedData } from 'express-validator';
import validator from 'validator';

/**
 * Sanitizes a string value by trimming whitespace and removing null bytes.
 *
 * XSS prevention: React JSX automatically HTML-escapes output at render time.
 *   Do NOT HTML-encode here — it causes double-encoding and corrupts stored data.
 * SQL injection: prevented by parameterized queries ($1, $2, ...) in every query.
 *   Do NOT strip SQL keywords — it breaks legitimate data like "Select Insurance".
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }
  // Only trim whitespace and strip null bytes (which can confuse some parsers)
  return input.trim().replace(/\0/g, '');
}

/**
 * Sanitizes an object recursively
 */
const SENSITIVE_FIELDS = ['password', 'currentPassword', 'newPassword', 'token', 'refreshToken', 'accessToken', 'confirmPassword'];

export function sanitizeObject(obj: unknown): unknown {
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
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key as well
      const sanitizedKey = sanitizeString(key);

      // Skip sanitization for sensitive fields
      if (SENSITIVE_FIELDS.includes(key)) {
        sanitized[sanitizedKey] = value;
      } else {
        sanitized[sanitizedKey] = sanitizeObject(value);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Express middleware for input sanitization
 */
export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.log('🧼 [INPUT SANITIZER] Processing request:', {
    method: req.method,
    path: req.path,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    queryKeys: Object.keys(req.query),
    paramsKeys: Object.keys(req.params),
  });

  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
      console.log('🧼 [INPUT SANITIZER] Body sanitized');
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query) as typeof req.query;
      console.log('🧼 [INPUT SANITIZER] Query parameters sanitized');
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params) as typeof req.params;
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
        message: 'Invalid input data format',
      },
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
      convert: true, // Convert types when possible
    });

    if (error) {
      console.error('❌ [SCHEMA VALIDATION] Validation failed:', {
        path: req.path,
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        })),
      });

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input validation failed',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        },
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
    username: joi.string().required().messages({
      'string.empty': 'Username is required',
      'any.required': 'Username is required'
    }),
    password: joi.string().required().messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    })
  }),

  // Password recovery
  email: joi.object({
    email: joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
  }),

  // User registration/creation
  userCreate: joi.object({
    username: joi.string().alphanum().min(3).max(50).required(),
    email: joi.string().email().max(100).required(),
    firstName: joi
      .string()
      .min(1)
      .max(50)
      .pattern(/^[a-zA-Z\s'-]+$/)
      .required()
      .messages({
        'string.pattern.base':
          'First name can only contain letters, spaces, hyphens and apostrophes',
      }),
    lastName: joi
      .string()
      .min(1)
      .max(50)
      .pattern(/^[a-zA-Z\s'-]+$/)
      .required(),
    role: joi
      .string()
      .valid(
        'admin',
        'instructor',
        'organization',
        'accounting',
        'system_admin'
      )
      .required(),
    organizationId: joi.number().integer().positive().optional(),
  }),

  // Course request
  courseRequest: joi.object({
    courseTypeId: joi.number().integer().positive().required(),
    requestedDate: joi.date().min('now').required(),
    locationAddress: joi.string().min(5).max(200).required(),
    estimatedStudents: joi.number().integer().min(1).max(100).required(),
    contactName: joi.string().min(2).max(100).required(),
    contactPhone: joi
      .string()
      .pattern(/^[\d\s\-\(\)\+]+$/)
      .min(10)
      .max(20)
      .required()
      .messages({
        'string.pattern.base': 'Phone number contains invalid characters',
      }),
    contactEmail: joi.string().email().max(100).required(),
    specialRequirements: joi.string().max(500).optional().allow(''),
  }),

  // Email template
  emailTemplate: joi.object({
    name: joi.string().min(1).max(100).required(),
    category: joi
      .string()
      .valid('Instructor', 'Organization', 'Course Admin', 'Accountant', 'Sys Admin', 'Other')
      .required(),
    subCategory: joi.string().max(50).optional().allow(''),
    subject: joi.string().min(1).max(200).required(),
    htmlContent: joi.string().min(1).max(10000).required(),
    textContent: joi.string().max(10000).optional().allow(''),
    body: joi.string().max(10000).optional().allow(''),
    isActive: joi.boolean().default(true),
    isSystem: joi.boolean().default(false),
  }),

  // Invoice payment submission
  paymentSubmission: joi.object({
    paymentMethod: joi
      .string()
      .valid('check', 'wire_transfer', 'ach', 'credit_card', 'cash')
      .required(),
    referenceNumber: joi.string().min(1).max(50).required(),
    paymentDate: joi.date().max('now').required(),
    amount: joi.number().positive().precision(2).required(),
    notes: joi.string().max(500).optional().allow(''),
  }),

  // Generic ID parameter
  idParam: joi.object({
    id: joi.number().integer().positive().required(),
  }),
};

/**
 * Input validation for specific endpoints
 */
export const validateLogin = validateSchema(commonSchemas.login);
export const validateUserCreate = validateSchema(commonSchemas.userCreate);
export const validateCourseRequest = validateSchema(
  commonSchemas.courseRequest
);
export const validateEmailTemplate = validateSchema(
  commonSchemas.emailTemplate
);
export const validatePaymentSubmission = validateSchema(
  commonSchemas.paymentSubmission
);

