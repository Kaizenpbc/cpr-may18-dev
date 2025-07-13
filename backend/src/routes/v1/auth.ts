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

// Login endpoint with enhanced session management and better error messages
router.post(
  '/login',
  validateSchema(commonSchemas.login),
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    console.log('Login attempt:', { username });

    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    try {
      console.log('Attempting database query...');
      const result = await pool.query(
        'SELECT id, username, password_hash, role, organization_id FROM users WHERE username = $1',
        [username]
      );

      console.log(
        'Query result:',
        result.rows.length > 0 ? 'User found' : 'User not found'
      );

      if (result.rows.length === 0) {
        console.log('User not found');
        return res.status(401).json({ 
          error: `User '${username}' not found. Please check your username or contact your administrator.`,
          code: 'USER_NOT_FOUND',
          suggestions: [
            'Check your username spelling',
            'Contact your administrator to create an account',
            'Use the "Forgot Password" option if you have an email account'
          ]
        });
      }

      const user = result.rows[0];

      console.log('Attempting password verification...');
      const isValidPassword = await bcrypt.compare(
        password,
        user.password_hash
      );
      console.log('Password verification result:', isValidPassword);

      if (!isValidPassword) {
        console.log('Invalid password');
        return res.status(401).json({ 
          error: `Incorrect password for user '${username}'. Please try again or use "Forgot Password".`,
          code: 'INVALID_PASSWORD',
          suggestions: [
            'Check your password spelling',
            'Use "Forgot Password" to reset your password',
            'Contact your administrator for assistance'
          ]
        });
      }

      // Fetch organization name
      let organizationName = '';
      if (user.organization_id) {
        const orgResult = await pool.query(
          'SELECT name FROM organizations WHERE id = $1',
          [user.organization_id]
        );
        organizationName = orgResult.rows[0]?.name || '';
      }

      // Extract request metadata for session management
      const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const deviceInfo = extractDeviceInfo(userAgent);

      console.log('🔐 [AUTH] Creating session for successful login');

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
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Try to create Redis session, but don't fail if it doesn't work
      try {
        await ensureRedisConnection();
        const sessionResult = await createUserSession({
          userId: user.id.toString(),
          username: user.username,
          role: user.role,
          organizationId: user.organization_id,
          ipAddress,
          userAgent,
          deviceInfo,
        });

        console.log(
          `🔐 [AUTH] Session created successfully: ${sessionResult.sessionId}`
        );

        console.log('Login successful for user:', user.username);
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
              accessToken: sessionResult.accessToken,
              sessionId: sessionResult.sessionId,
            },
            'Login successful'
          )
        );
      } catch (sessionError) {
        console.error(
          '❌ [AUTH] Session creation failed, using standard JWT:',
          sessionError
        );

        // Use standard JWT authentication
        console.log('Login successful for user (JWT):', user.username);
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
      }
    } catch (error) {
      console.log('Login error:', error);
      console.error('Error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        details: error instanceof AppError ? error.details : undefined,
      });
      throw error;
    }
  })
);

// Password reset request endpoint
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    console.log('[AuthController] Password reset request:', {
      headers: {
        authorization: req.headers.authorization ? '[REDACTED]' : undefined
      }
    });

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
      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.id, type: 'password_reset' },
        process.env.JWT_ACCESS_SECRET || 'access_secret',
        { expiresIn: '1h' }
      );

      // Store reset token in database
      await pool.query(
        'UPDATE users SET reset_token = $1, reset_token_expires = NOW() + INTERVAL \'1 hour\' WHERE id = $2',
        [resetToken, user.id]
      );

      // In a real application, you would send an email here
      console.log('[AuthController] Password reset token generated for:', user.email || user.username);
      
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
  } catch (error) {
    console.error('[AuthController] Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password with token
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        error: 'Token and new password are required',
        code: 'MISSING_DATA'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'access_secret') as any;
    
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
  } catch (error) {
    console.error('[AuthController] Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password (for logged-in users)
router.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    console.error('[AuthController] Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enhanced logout endpoint with session invalidation and token blacklisting
router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    console.log('🔐 [AUTH] Processing logout request');

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
          console.log('🔐 [AUTH] Access token added to blacklist');
        } catch (blacklistError) {
          console.error('❌ [AUTH] Failed to blacklist access token:', blacklistError);
          // Continue with logout even if blacklisting fails
        }
      }

      const refreshToken = req.cookies.refreshToken;

      if (refreshToken) {
        console.log(
          '🔐 [AUTH] Refresh token found, attempting session invalidation'
        );

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
              console.log(
                `🔐 [AUTH] Session ${decoded.sessionId} invalidated successfully`
              );
            }
          }
        } catch (sessionError) {
          console.error('❌ [AUTH] Session invalidation failed:', sessionError);
          // Continue with logout even if session invalidation fails
        }
      }

      // Clear the refresh token cookie
      res.clearCookie('refreshToken');

      console.log('✅ [AUTH] Logout completed successfully');
      res.json(ApiResponseBuilder.success(null, 'Logged out successfully'));
    } catch (error) {
      console.error('❌ [AUTH] Logout error:', error);

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
    console.log('🔐 [AUTH] Processing token refresh request');

    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      console.log('🔐 [AUTH] No refresh token provided');
      throw new AppError(
        401,
        errorCodes.AUTH_TOKEN_INVALID,
        'Refresh token required'
      );
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
          console.log('🔐 [AUTH] Session refresh successful');

          // Update refresh token cookie
          res.cookie('refreshToken', sessionResult.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
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
        console.error(
          '❌ [AUTH] Enhanced session refresh failed, falling back to standard JWT:',
          sessionError
        );
      }

      // Fall back to standard JWT refresh
      const { verifyRefreshToken } = await import('../../utils/jwtUtils.js');
      const payload = verifyRefreshToken(refreshToken);

      // Fetch fresh user data from database
      const result = await pool.query(
        'SELECT id, username, role, organization_id FROM users WHERE id = $1',
        [parseInt(payload.userId, 10)]
      );

      if (result.rows.length === 0) {
        console.log('🔐 [AUTH] User not found in database');
        res.clearCookie('refreshToken');
        throw new AppError(
          401,
          errorCodes.AUTH_TOKEN_INVALID,
          'User not found'
        );
      }

      const user = result.rows[0];

      // Fetch organization name
      let organizationName = '';
      if (user.organization_id) {
        const orgResult = await pool.query(
          'SELECT name FROM organizations WHERE id = $1',
          [user.organization_id]
        );
        organizationName = orgResult.rows[0]?.name || '';
      }

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
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      console.log('🔐 [AUTH] Standard JWT token refresh successful');
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
      console.error('🔐 [AUTH] Token refresh failed:', error);
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

      console.log(
        `🔐 [AUTH] Invalidated ${invalidatedCount} sessions for user ${decoded.username}`
      );
      res.json(
        ApiResponseBuilder.success(
          {
            invalidatedSessions: invalidatedCount,
          },
          'All sessions invalidated successfully'
        )
      );
    } catch (error) {
      console.error('❌ [AUTH] Failed to invalidate all sessions:', error);
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

    console.log('🔐 [AUTH] Password recovery attempt:', {
      email,
      timestamp: new Date().toISOString()
    });

    try {
      const result = await pool.query(
        'SELECT id, username, email FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        // Don't reveal that the user doesn't exist
        console.log('ℹ️ [AUTH] No user found for email:', email);
        return res.json(
          ApiResponseBuilder.success(
            null,
            'If an account exists with this email, you will receive recovery instructions.'
          )
        );
      }

      const user = result.rows[0];

      // TODO: Implement actual email sending
      console.log('📧 [AUTH] Would send recovery email to:', {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      });

      res.json(
        ApiResponseBuilder.success(
          null,
          'If an account exists with this email, you will receive recovery instructions.'
        )
      );
    } catch (error) {
      console.error('❌ [AUTH] Password recovery error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
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
