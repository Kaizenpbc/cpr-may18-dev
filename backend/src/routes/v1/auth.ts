import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../../config/database.js';
import {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../utils/jwtUtils.js';
import { ApiResponseBuilder } from '../../utils/apiResponse.js';
import { keysToCamel } from '../../utils/caseConverter.js';
import { AppError, errorCodes, asyncHandler } from '../../utils/errorHandler.js';
import { validateSchema, commonSchemas } from '../../middleware/inputSanitizer.js';
import { TokenBlacklist } from '../../utils/tokenBlacklist.js';
import {
  createUserSession,
  invalidateUserSession,
  refreshUserSession,
} from '../../services/sessionManager.js';
import { redisManager, ensureRedisConnection } from '../../config/redis.js';
import { sessionManager } from '../../services/sessionManager.js';
import { cacheService } from '../../services/cacheService.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Separate secret for password reset tokens (different from access tokens for security)
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.JWT_RESET_SECRET) {
  throw new Error('FATAL: JWT_RESET_SECRET environment variable is required in production');
}
const RESET_TOKEN_SECRET = process.env.JWT_RESET_SECRET || 'dev_reset_secret_not_for_production!';

// Login endpoint with enhanced session management and better error messages
router.post(
  '/login',
  validateSchema(commonSchemas.login),
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    try {
      // Combined query: fetch user and organization name in a single JOIN query for better performance
      const result = await pool.query(
        `SELECT u.id, u.username, u.password_hash, u.role, u.organization_id, o.name as organization_name
         FROM users u
         LEFT JOIN organizations o ON u.organization_id = o.id
         WHERE u.username = $1`,
        [username]
      );

      // Use same error message for both cases to prevent username enumeration
      const invalidCredentialsResponse = {
        error: 'Invalid username or password. Please check your credentials and try again.',
        code: 'INVALID_CREDENTIALS',
        suggestions: [
          'Check your username and password spelling',
          'Use "Forgot Password" to reset your password',
          'Contact your administrator for assistance'
        ]
      };

      if (result.rows.length === 0) {
        return res.status(401).json(invalidCredentialsResponse);
      }

      const user = result.rows[0];
      const organizationName = user.organization_name || '';

      const isValidPassword = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!isValidPassword) {
        return res.status(401).json(invalidCredentialsResponse);
      }

      // Extract request metadata for session management
      const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const deviceInfo = extractDeviceInfo(userAgent);

      // Generate tokens first
      const tokens = generateTokens({
        id: user.id,
        userId: user.id.toString(),
        username: user.username,
        role: user.role,
        organizationId: user.organization_id,
        organizationName,
      });

      // Set refresh token as httpOnly cookie
      // Use sameSite: 'none' for cross-origin requests (Netlify frontend -> Render backend)
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: true, // Required for sameSite: 'none'
        sameSite: 'none', // Required for cross-origin cookies
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return JWT response immediately for fast login
      res.json(
        ApiResponseBuilder.success(
          {
            user: {
              id: user.id,
              username: user.username,
              role: user.role,
              organizationId: user.organization_id,
              organizationName,
            },
            accessToken: tokens.accessToken,
          },
          'Login successful'
        )
      );

      // Create Redis session in background (non-blocking) for enhanced session tracking
      // This doesn't affect the login response time
      setImmediate(async () => {
        try {
          await ensureRedisConnection();
          await createUserSession({
            userId: user.id.toString(),
            username: user.username,
            role: user.role,
            organizationId: user.organization_id,
            ipAddress,
            userAgent,
            deviceInfo,
          });
        } catch (sessionError) {
          // Session creation is non-blocking; ignore failures
        }
      });
    } catch (error) {
      console.error('[AUTH] Login error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  })
);

// Password reset request endpoint
router.post('/forgot-password', asyncHandler(async (req: Request, res: Response) => {
  const { email, username } = req.body;

  if (!email && !username) {
    return res.status(400).json({
      error: 'Email or username is required',
      code: 'MISSING_IDENTIFIER'
    });
  }

  let query, params;
  if (email) {
    query = 'SELECT * FROM users WHERE email = $1';
    params = [email];
  } else {
    query = 'SELECT * FROM users WHERE username = $1';
    params = [username];
  }

  const result = await pool.query(query, params);
  const user = result.rows[0];

  if (user) {
    // Generate reset token with separate secret
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      RESET_TOKEN_SECRET,
      { expiresIn: '1h' }
    );

    // Store reset token in database
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = NOW() + INTERVAL \'1 hour\' WHERE id = $2',
      [resetToken, user.id]
    );

    // In a real application, you would send an email here

    return res.json({
      message: 'Password reset instructions have been sent to your email address.',
      code: 'RESET_SENT',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined // Only in dev
    });
  }

  // Always return the same message for security
  res.json({
    message: 'If an account exists with this email/username, you will receive recovery instructions.',
    code: 'RESET_SENT'
  });
}));

// Reset password with token
router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({
      error: 'Token and new password are required',
      code: 'MISSING_DATA'
    });
  }

  // Verify token with separate secret
  const decoded = jwt.verify(token, RESET_TOKEN_SECRET) as { userId: number; type: string };

  if (decoded.type !== 'password_reset') {
    return res.status(400).json({
      error: 'Invalid reset token',
      code: 'INVALID_TOKEN'
    });
  }

  // Check if token exists and is not expired
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1 AND reset_token = $2 AND reset_token_expires > NOW()',
    [decoded.userId, token]
  );

  if (result.rows.length === 0) {
    return res.status(400).json({
      error: 'Reset token is invalid or expired',
      code: 'EXPIRED_TOKEN'
    });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password and clear reset token
  await pool.query(
    'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
    [hashedPassword, decoded.userId]
  );

  res.json({
    message: 'Password has been reset successfully. You can now log in with your new password.',
    code: 'PASSWORD_RESET'
  });
}));

// Change password (for logged-in users)
router.post('/change-password', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'UNAUTHORIZED'
    });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      error: 'Current password and new password are required',
      code: 'MISSING_PASSWORDS'
    });
  }

  // Get current user
  const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];

  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({
      error: 'Current password is incorrect',
      code: 'INVALID_CURRENT_PASSWORD'
    });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, userId]);

  res.json({
    message: 'Password changed successfully',
    code: 'PASSWORD_CHANGED'
  });
}));

// Enhanced logout endpoint with session invalidation and token blacklisting
router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Get the access token from the Authorization header
      const authHeader = req.headers.authorization;
      const accessToken = authHeader && authHeader.split(' ')[1];

      // Add access token to blacklist if present
      if (accessToken) {
        try {
          // Decode the token to get expiration time
          const decoded = jwt.decode(accessToken) as any;
          const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to 24 hours

          await TokenBlacklist.addToBlacklist(accessToken, expiresAt);
        } catch (blacklistError) {
          // Continue with logout even if blacklisting fails
        }
      }

      const refreshToken = req.cookies.refreshToken;

      if (refreshToken) {
        try {
          await ensureRedisConnection();

          // Try to refresh the session to get session ID for invalidation
          const ipAddress =
            req.ip || req.connection.remoteAddress || '127.0.0.1';
          const userAgent = req.headers['user-agent'] || 'unknown';

          const sessionResult = await refreshUserSession(
            refreshToken,
            ipAddress,
            userAgent
          );

          if (sessionResult) {
            // Extract session ID from the refresh token (we'd need to decode it)
            const { verifyRefreshToken } = await import('../../utils/jwtUtils.js');
            const decoded = verifyRefreshToken(refreshToken);

            if (decoded.sessionId) {
              await invalidateUserSession(decoded.sessionId);
            }
          }
        } catch (sessionError) {
          // Continue with logout even if session invalidation fails
        }
      }

      // Clear the refresh token cookie
      res.clearCookie('refreshToken');

      res.json(ApiResponseBuilder.success(null, 'Logged out successfully'));
    } catch (error) {
      console.error('[AUTH] Logout error:', error);

      // Even if logout fails, clear the cookie
      res.clearCookie('refreshToken');

      res.json(ApiResponseBuilder.success(null, 'Logged out successfully'));
    }
  })
);

// Enhanced refresh token endpoint
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: errorCodes.AUTH_TOKEN_INVALID,
          message: 'Refresh token required. Please log in again.',
          details: 'No refresh token found in cookies. This may happen if cookies are disabled or cleared.'
        }
      });
    }

    try {
      const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // Try enhanced session refresh first
      try {
        await ensureRedisConnection();

        const sessionResult = await refreshUserSession(
          refreshToken,
          ipAddress,
          userAgent
        );

        if (sessionResult) {
          // Update refresh token cookie
          res.cookie('refreshToken', sessionResult.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          });

          return res.json(
            ApiResponseBuilder.success(
              {
                accessToken: sessionResult.accessToken,
              },
              'Token refreshed successfully'
            )
          );
        }
      } catch (sessionError) {
        // Fall back to standard JWT refresh
      }

      // Fall back to standard JWT refresh
      const { verifyRefreshToken } = await import('../../utils/jwtUtils.js');
      const payload = verifyRefreshToken(refreshToken);

      // Fetch fresh user data from database with organization name in a single query
      const result = await pool.query(
        `SELECT u.id, u.username, u.role, u.organization_id, o.name as organization_name
         FROM users u
         LEFT JOIN organizations o ON u.organization_id = o.id
         WHERE u.id = $1`,
        [parseInt(payload.userId, 10)]
      );

      if (result.rows.length === 0) {
        res.clearCookie('refreshToken');
        throw new AppError(
          401,
          errorCodes.AUTH_TOKEN_INVALID,
          'User not found'
        );
      }

      const user = result.rows[0];
      const organizationName = user.organization_name || '';

      const tokens = generateTokens({
        id: user.id,
        userId: user.id.toString(),
        username: user.username,
        role: user.role,
        organizationId: user.organization_id,
        organizationName,
      });

      // Set new refresh token
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json(
        ApiResponseBuilder.success(
          {
            accessToken: tokens.accessToken,
            user: {
              id: user.id,
              username: user.username,
              role: user.role,
              organizationId: user.organization_id,
              organizationName,
            },
          },
          'Token refreshed successfully'
        )
      );
    } catch (error) {
      console.error('[AUTH] Token refresh failed:', error);
      res.clearCookie('refreshToken');
      throw new AppError(
        401,
        errorCodes.AUTH_TOKEN_INVALID,
        'Invalid refresh token'
      );
    }
  })
);

// Session management endpoints

// Get current session info
router.get(
  '/session-info',
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new AppError(
        401,
        errorCodes.AUTH_TOKEN_INVALID,
        'No active session'
      );
    }

    try {
      await ensureRedisConnection();

      const { verifyRefreshToken } = await import('../../utils/jwtUtils.js');
      const decoded = verifyRefreshToken(refreshToken);

      if (decoded.sessionId) {
        const sessionData = await redisManager.getSession(decoded.sessionId);

        if (sessionData) {
          return res.json(
            ApiResponseBuilder.success(
              {
                sessionId: sessionData.sessionId,
                userId: sessionData.userId,
                username: sessionData.username,
                role: sessionData.role,
                securityLevel: sessionData.securityLevel,
                createdAt: sessionData.createdAt,
                lastAccess: sessionData.lastAccess,
                ipAddress: sessionData.ipAddress,
                deviceInfo: sessionData.deviceInfo,
              },
              'Session information retrieved'
            )
          );
        }
      }

      // Fall back to JWT information
      res.json(
        ApiResponseBuilder.success(
          {
            userId: decoded.userId,
            username: decoded.username,
            role: decoded.role,
            sessionType: 'jwt-only',
          },
          'Session information retrieved (JWT)'
        )
      );
    } catch (error) {
      console.error('❌ [AUTH] Failed to get session info:', error);
      throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'Invalid session');
    }
  })
);

// Invalidate all sessions for current user
router.post(
  '/logout-all',
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new AppError(
        401,
        errorCodes.AUTH_TOKEN_INVALID,
        'No active session'
      );
    }

    try {
      await ensureRedisConnection();

      const { verifyRefreshToken } = await import('../../utils/jwtUtils.js');
      const decoded = verifyRefreshToken(refreshToken);

      const { invalidateAllUserSessions } = await import(
        '../../services/sessionManager.js'
      );
      const invalidatedCount = await invalidateAllUserSessions(decoded.userId);

      // Clear current refresh token
      res.clearCookie('refreshToken');

      res.json(
        ApiResponseBuilder.success(
          {
            invalidatedSessions: invalidatedCount,
          },
          'All sessions invalidated successfully'
        )
      );
    } catch (error) {
      console.error('[AUTH] Failed to invalidate all sessions:', error);
      // Clear cookie even if session invalidation fails
      res.clearCookie('refreshToken');
      res.json(ApiResponseBuilder.success(null, 'Logged out successfully'));
    }
  })
);

// Get current user profile
router.get('/me', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }

  // Join with organizations table to get organization name
  const result = await pool.query(
    `SELECT u.id, u.username, u.email, u.role, u.organization_id, o.name as organization_name
     FROM users u
     LEFT JOIN organizations o ON u.organization_id = o.id
     WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'User not found');
  }

  const user = result.rows[0];
  res.json(ApiResponseBuilder.success({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id,
      organizationName: user.organization_name
    }
  }));
}));

// Password recovery endpoint
router.post(
  '/recover-password',
  validateSchema(commonSchemas.email),
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
      const result = await pool.query(
        'SELECT id, username, email FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        // Don't reveal that the user doesn't exist
        return res.json(
          ApiResponseBuilder.success(
            null,
            'If an account exists with this email, you will receive recovery instructions.'
          )
        );
      }

      const user = result.rows[0];

      // TODO: Implement actual email sending

      res.json(
        ApiResponseBuilder.success(
          null,
          'If an account exists with this email, you will receive recovery instructions.'
        )
      );
    } catch (error) {
      console.error('[AUTH] Password recovery error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  })
);

/**
 * Helper function to extract device information from user agent
 */
function extractDeviceInfo(userAgent: string): string {
  const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
  const osMatch = userAgent.match(
    /(Windows NT [\d.]+|Mac OS X [\d_]+|Linux|Android [\d.]+|iOS [\d.]+)/
  );

  const browser = browserMatch
    ? `${browserMatch[1]} ${browserMatch[2]}`
    : 'Unknown Browser';
  const os = osMatch ? osMatch[1].replace(/_/g, '.') : 'Unknown OS';

  return `${browser} on ${os}`;
}

export default router;
