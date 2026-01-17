import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';

// Rate limit violation logger
const logRateLimitViolation = (req: Request, limitType: string) => {
  console.warn(`🚦 [RATE LIMIT] ${limitType} violation:`);
  console.warn(`  IP: ${req.ip}`);
  console.warn(`  Method: ${req.method}`);
  console.warn(`  URL: ${req.originalUrl}`);
  console.warn(`  User-Agent: ${req.get('User-Agent')}`);
  console.warn(`  Time: ${new Date().toISOString()}`);
};

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logRateLimitViolation(req, 'API_GENERAL');
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes',
      },
    });
  },
});

// Stricter limiter for auth routes
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Increased from 5 to 100 for better dev experience
  message: {
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: '1 hour',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logRateLimitViolation(req, 'AUTH');
    res.status(429).json({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later.',
        retryAfter: '1 hour',
      },
    });
  },
});

// Stricter limiter for registration
export const registerLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // Limit each IP to 3 registrations per day
  message: {
    error: {
      code: 'REGISTER_RATE_LIMIT_EXCEEDED',
      message: 'Too many registration attempts, please try again later.',
      retryAfter: '24 hours',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logRateLimitViolation(req, 'REGISTRATION');
    res.status(429).json({
      success: false,
      error: {
        code: 'REGISTER_RATE_LIMIT_EXCEEDED',
        message: 'Too many registration attempts, please try again later.',
        retryAfter: '24 hours',
      },
    });
  },
});

// Custom rate limiter for specific routes
export const createCustomLimiter = (
  windowMs: number,
  max: number,
  limitType: string = 'CUSTOM'
) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.',
        retryAfter: `${Math.round(windowMs / 60000)} minutes`,
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logRateLimitViolation(req, limitType);
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later.',
          retryAfter: `${Math.round(windowMs / 60000)} minutes`,
        },
      });
    },
  });
};
