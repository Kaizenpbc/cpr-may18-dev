import type { Request, Response, NextFunction } from 'express';
import {
  verifyAccessToken,
  verifyRefreshToken,
  generateTokens,
  TokenPayload
} from '../utils/jwtUtils.js';
import { extractTokenFromHeader } from '../utils/jwtUtils.js';
import { ApiResponseBuilder } from '../utils/apiResponse.js';
import { errorCodes } from '../utils/errorHandler.js';
import { AppError } from '../utils/errorHandler.js';
import { TokenBlacklist } from '../utils/tokenBlacklist.js';
import jwt from 'jsonwebtoken';

const MIN_SECRET_LENGTH = 32;

const validateSecret = (secret: string | undefined, name: string): string => {
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`${name} environment variable is required in production`);
    }
    console.warn(`WARNING: ${name} not set, using insecure development fallback`);
    return name === 'JWT_ACCESS_SECRET' ? 'dev_access_secret_not_for_production!' : 'dev_refresh_secret_not_for_production';
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`${name} must be at least ${MIN_SECRET_LENGTH} characters in production`);
    }
    console.warn(`WARNING: ${name} is less than ${MIN_SECRET_LENGTH} characters, this is insecure`);
  }
  return secret;
};

const ACCESS_TOKEN_SECRET = validateSecret(process.env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET');
const REFRESH_TOKEN_SECRET = validateSecret(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// Role-based authentication middleware
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.role) {
      console.log('[AUTH ERROR] No role specified for user:', req.user?.username);
      return res.status(403).json({ message: 'No role specified' });
    }

    if (!roles.includes(req.user.role)) {
      console.log(`[AUTH ERROR] Insufficient permissions. User: ${req.user.username}, Role: ${req.user.role}, Required: ${roles.join(', ')}`);
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  // Skip authentication for preflight requests
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    // Security: Tokens should only come from Authorization headers, not query parameters

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: errorCodes.AUTH_TOKEN_MISSING,
          message: 'No token provided'
        }
      });
    }

    try {
      // Check if token is blacklisted
      let isBlacklisted = false;
      try {
        isBlacklisted = await TokenBlacklist.isBlacklisted(token);
      } catch (blacklistError) {
        // Continue with token verification even if blacklist check fails
      }

      if (isBlacklisted) {
        return res.status(401).json({
          success: false,
          error: {
            code: errorCodes.AUTH_TOKEN_INVALID,
            message: 'Token has been invalidated'
          }
        });
      }

      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;

      req.user = {
        id: decoded.id,
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        organizationId: decoded.organizationId,
        organizationName: decoded.organizationName,
        sessionId: decoded.sessionId
      };
      next();
    } catch (err) {
      // Check if it's a token expiration error
      if (err instanceof jwt.TokenExpiredError) {
        // Safely access cookies with null check
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
          return res.status(401).json({
            success: false,
            error: {
              code: errorCodes.AUTH_TOKEN_INVALID,
              message: 'Token expired and no refresh token available'
            }
          });
        }

        try {
          const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as TokenPayload;
          const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded);

          // Set new tokens
          res.setHeader('x-access-token', accessToken);
          res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
          });

          req.user = {
            id: decoded.id,
            userId: decoded.userId,
            username: decoded.username,
            role: decoded.role,
            organizationId: decoded.organizationId,
            organizationName: decoded.organizationName,
            sessionId: decoded.sessionId
          };
          next();
        } catch (refreshErr) {
          return res.status(401).json({
            success: false,
            error: {
              code: errorCodes.AUTH_TOKEN_INVALID,
              message: 'Invalid refresh token'
            }
          });
        }
      } else {
        // Token is invalid for other reasons
        return res.status(401).json({
          success: false,
          error: {
            code: errorCodes.AUTH_TOKEN_INVALID,
            message: 'Invalid token'
          }
        });
      }
    }
  } catch (error) {
    console.error('[AUTH] Middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: errorCodes.INTERNAL_SERVER_ERROR,
        message: 'Internal server error'
      }
    });
  }
};

// Helper function to extract token from headers
const extractTokenFromHeaders = (req: Request): string | null => {
  const authHeader = req.headers['authorization'];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
};

// Middleware to authorize specific roles
export const authorizeRoles = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: errorCodes.AUTH_TOKEN_INVALID,
          message: 'Authentication required',
        },
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        },
      });
    }

    next();
  };
};
