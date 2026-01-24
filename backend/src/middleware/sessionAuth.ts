import { Request, Response, NextFunction } from 'express';
import {
  extractTokenFromHeader,
  verifyAccessToken,
  TokenPayload,
} from '../utils/jwtUtils.js';
import { validateUserSession, SessionData } from '../services/sessionManager.js';
import { AppError, errorCodes } from '../utils/errorHandler.js';
import { redisManager } from '../config/redis.js';
import { devLog } from '../utils/logger.js';

// Express Request augmentation is centralized in types/index.ts

interface AuthOptions {
  requireSession?: boolean;
  allowedRoles?: string[];
  requireActiveSession?: boolean;
  checkIPBinding?: boolean;
  checkUserAgentBinding?: boolean;
}

/**
 * Enhanced authentication middleware with Redis session management
 */
export const authenticateSession = (options: AuthOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('🔐 [SESSION AUTH] Processing authentication request');

      // Extract basic request information
      const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'unknown';

      req.ipAddress = ipAddress;
      req.userAgent = userAgent;

      // Extract and verify JWT token
      const token = extractTokenFromHeader(req);
      if (!token) {
        devLog('[SESSION AUTH] No token provided');
        throw new AppError(
          401,
          errorCodes.AUTH_TOKEN_MISSING,
          'Authentication token required'
        );
      }

      let decoded: TokenPayload;
      try {
        decoded = verifyAccessToken(token);
      } catch (error) {
        devLog('[SESSION AUTH] Token verification failed');
        throw new AppError(
          401,
          errorCodes.AUTH_TOKEN_INVALID,
          'Invalid authentication token'
        );
      }

      req.user = {
        id: decoded.id,
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        organizationId: decoded.organizationId,
        organizationName: decoded.organizationName,
        sessionId: decoded.sessionId
      };
      console.log(
        `🔐 [SESSION AUTH] Token verified for user: ${decoded.username} (${decoded.role})`
      );

      // Session validation (if enabled and session ID is present)
      if (options.requireSession !== false && decoded.sessionId) {
        try {
          if (!redisManager.isReady()) {
            console.log(
              '🔐 [SESSION AUTH] Redis not connected, falling back to JWT-only auth'
            );
            // Fall back to JWT-only authentication
            if (options.requireSession === true) {
              throw new AppError(
                503,
                'SESSION_UNAVAILABLE',
                'Session service unavailable'
              );
            }
            // Continue with JWT-only auth
            next();
            return;
          }
          // Validate session with security checks
          const sessionData = await validateUserSession(
            decoded.sessionId,
            ipAddress,
            userAgent
          );

          if (!sessionData) {
            console.error(
              `🔐 [SESSION AUTH] Session validation failed for session: ${decoded.sessionId}`
            );
            throw new AppError(
              401,
              errorCodes.AUTH_SESSION_INVALID,
              'Session expired or invalid'
            );
          }

          req.sessionData = sessionData;
          console.log(
            `🔐 [SESSION AUTH] Session validated: ${decoded.sessionId} (security: ${sessionData.securityLevel})`
          );

          // Additional security checks
          if (
            options.checkIPBinding !== false &&
            sessionData.ipAddress !== ipAddress
          ) {
            console.error(
              `🚨 [SESSION AUTH] IP address mismatch: session=${sessionData.ipAddress}, request=${ipAddress}`
            );
            throw new AppError(
              401,
              'AUTH_IP_MISMATCH',
              'Session IP address validation failed'
            );
          }

          if (
            options.checkUserAgentBinding !== false &&
            sessionData.userAgent !== userAgent
          ) {
            // Perform lenient user agent checking
            const sessionFingerprint = extractUserAgentFingerprint(
              sessionData.userAgent
            );
            const requestFingerprint = extractUserAgentFingerprint(userAgent);

            if (sessionFingerprint !== requestFingerprint) {
              console.error(`🚨 [SESSION AUTH] User agent mismatch detected`);
              throw new AppError(
                401,
                'AUTH_USER_AGENT_MISMATCH',
                'Session user agent validation failed'
              );
            }
          }

          // Check if session is active
          if (
            options.requireActiveSession !== false &&
            !sessionData.isActive
          ) {
            console.error(
              `🔐 [SESSION AUTH] Session ${decoded.sessionId} is inactive`
            );
            throw new AppError(
              401,
              errorCodes.AUTH_SESSION_INVALID,
              'Session is inactive'
            );
          }
        } catch (error) {
          if (error instanceof AppError) {
            throw error;
          }
          console.error('❌ [SESSION AUTH] Session validation error:', error);

          // If session validation fails but requireSession is not strictly true, fall back to JWT
          if (options.requireSession !== true) {
            console.log(
              '🔐 [SESSION AUTH] Falling back to JWT-only authentication'
            );
          } else {
            throw new AppError(
              503,
              'SESSION_ERROR',
              'Session validation failed'
            );
          }
        }
      } else if (options.requireSession === true) {
        console.error(
          '🔐 [SESSION AUTH] Session required but no session ID in token'
        );
        throw new AppError(
          401,
          errorCodes.AUTH_SESSION_REQUIRED,
          'Valid session required'
        );
      }

      // Role-based authorization
      if (options.allowedRoles && options.allowedRoles.length > 0) {
        if (!decoded.role || !options.allowedRoles.includes(decoded.role)) {
          console.error(
            `🔐 [SESSION AUTH] Role authorization failed: user has ${decoded.role}, required: ${options.allowedRoles.join(', ')}`
          );
          throw new AppError(
            403,
            errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
            'Insufficient permissions'
          );
        }
      }

      console.log(
        `✅ [SESSION AUTH] Authentication successful for ${decoded.username}`
      );
      next();
    } catch (error) {
      console.error('❌ [SESSION AUTH] Authentication failed:', error);

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
          timestamp: new Date().toISOString(),
        });
      }

      return res.status(500).json({
        error: 'Internal authentication error',
        code: 'AUTH_INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  };
};

/**
 * Middleware for different authentication levels
 */

// Standard authentication (JWT + optional session)
export const authenticate = authenticateSession({
  requireSession: false,
  requireActiveSession: true,
  checkIPBinding: false,
  checkUserAgentBinding: false,
});

// High security authentication (JWT + required session + IP/UA binding)
export const authenticateSecure = authenticateSession({
  requireSession: true,
  requireActiveSession: true,
  checkIPBinding: true,
  checkUserAgentBinding: true,
});

// Role-based authentication middleware
export const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return authenticateSession({
    requireSession: false,
    allowedRoles,
  });
};

// High security role-based authentication
export const requireRoleSecure = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return authenticateSession({
    requireSession: true,
    requireActiveSession: true,
    checkIPBinding: true,
    checkUserAgentBinding: true,
    allowedRoles,
  });
};

// Admin-only authentication (always high security)
export const requireAdmin = authenticateSession({
  requireSession: true,
  requireActiveSession: true,
  checkIPBinding: true,
  checkUserAgentBinding: true,
  allowedRoles: ['admin', 'system_admin'],
});

// Accounting-only authentication (high security)
export const requireAccounting = authenticateSession({
  requireSession: true,
  requireActiveSession: true,
  checkIPBinding: true,
  checkUserAgentBinding: false, // More lenient for accounting staff
  allowedRoles: ['accounting', 'admin', 'system_admin'],
});

/**
 * Helper function to extract user agent fingerprint
 */
function extractUserAgentFingerprint(userAgent: string): string {
  const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
  const osMatch = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/);

  return `${browserMatch ? browserMatch[1] + browserMatch[2] : 'unknown'}-${osMatch ? osMatch[1] : 'unknown'}`;
}

/**
 * Middleware to check session health and extend if needed
 */
export const maintainSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.sessionData && req.sessionData.sessionId) {
      // Check if session needs extension (within 5 minutes of expiry)
      const sessionAge =
        Date.now() - new Date(req.sessionData.createdAt).getTime();
      const sessionExpiry = getSessionExpiry(req.sessionData.securityLevel);
      const timeToExpiry = sessionExpiry * 1000 - sessionAge;

      if (timeToExpiry < 300000) {
        // Less than 5 minutes
        console.log(
          `🔐 [SESSION MAINTENANCE] Extending session ${req.sessionData.sessionId}`
        );
        await redisManager.extendSession(
          req.sessionData.sessionId,
          sessionExpiry
        );
      }
    }

    next();
  } catch (error) {
    console.error(
      '❌ [SESSION MAINTENANCE] Failed to maintain session:',
      error
    );
    // Don't fail the request, just log the error
    next();
  }
};

/**
 * Helper function to get session expiry based on security level
 */
function getSessionExpiry(
  securityLevel: 'standard' | 'high' | 'critical'
): number {
  const refreshTokenExpiry = parseInt(
    process.env.REFRESH_TOKEN_EXPIRY || '604800'
  ); // 7 days

  switch (securityLevel) {
    case 'critical':
      return Math.min(refreshTokenExpiry, 3600); // Max 1 hour for critical
    case 'high':
      return Math.min(refreshTokenExpiry, 14400); // Max 4 hours for high
    case 'standard':
    default:
      return refreshTokenExpiry; // Full expiry for standard
  }
}
