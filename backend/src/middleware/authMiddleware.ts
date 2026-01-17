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

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret';

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
      return res.status(403).json({ message: 'No role specified' });
    }

    if (!roles.includes(req.user.role)) {
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
    console.log('[TRACE] Auth middleware - Request headers:', {
      authorization: req.headers.authorization ? 'present' : 'missing',
      cookie: req.headers.cookie ? 'present' : 'missing'
    });

    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.split(' ')[1];

    if (!token && req.query.token) {
      console.log('[TRACE] Auth middleware - Token found in query parameters');
      let queryToken = req.query.token as string;
      if (queryToken.startsWith('Bearer ')) {
        queryToken = queryToken.substring(7);
      }
      token = queryToken;
    }

    if (!token) {
      console.log('[TRACE] Auth middleware - No token provided');
      return res.status(401).json({
        success: false,
        error: {
          code: errorCodes.AUTH_TOKEN_MISSING,
          message: 'No token provided'
        }
      });
    }

    try {
      console.log('[TRACE] Auth middleware - Verifying token');

      // Check if token is blacklisted
      console.log('[TRACE] Auth middleware - Checking blacklist for token:', token.substring(0, 20) + '...');
      let isBlacklisted = false;
      try {
        isBlacklisted = await TokenBlacklist.isBlacklisted(token);
        console.log('[TRACE] Auth middleware - Blacklist check result:', isBlacklisted);
      } catch (blacklistError) {
        console.error('[TRACE] Auth middleware - Blacklist check failed:', blacklistError);
        // Continue with token verification even if blacklist check fails
      }

      if (isBlacklisted) {
        console.log('[TRACE] Auth middleware - Token is blacklisted');
        return res.status(401).json({
          success: false,
          error: {
            code: errorCodes.AUTH_TOKEN_INVALID,
            message: 'Token has been invalidated'
          }
        });
      }

      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
      console.log('[TRACE] Auth middleware - Token verified, user:', {
        id: decoded.id,
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role
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
    } catch (err) {
      console.log('[TRACE] Auth middleware - Token verification failed:', err);

      // Check if it's a token expiration error
      if (err instanceof jwt.TokenExpiredError) {
        console.log('[TRACE] Auth middleware - Token expired, attempting refresh');

        // Safely access cookies with null check
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
          console.log('[TRACE] Auth middleware - No refresh token available');
          return res.status(401).json({
            success: false,
            error: {
              code: errorCodes.AUTH_TOKEN_INVALID,
              message: 'Token expired and no refresh token available'
            }
          });
        }

        try {
          console.log('[TRACE] Auth middleware - Attempting token refresh');
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

          console.log('[TRACE] Auth middleware - Token refresh successful');
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
          console.log('[TRACE] Auth middleware - Token refresh failed:', refreshErr);
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
        console.log('[TRACE] Auth middleware - Token invalid:', err);
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
    console.error('[TRACE] Auth middleware - Unexpected error:', error);
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
  console.log('[Debug] jwtUtils - Extracting token from headers');
  const authHeader = req.headers['authorization'];
  console.log('[Debug] jwtUtils - Authorization header:', authHeader);

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log(
      '[Debug] jwtUtils - Token extracted:',
      token ? 'present' : 'missing'
    );
    return token;
  }

  console.log('[Debug] jwtUtils - No valid token found in headers');
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
