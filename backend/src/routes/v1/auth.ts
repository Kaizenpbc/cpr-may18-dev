import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../../config/database';
import { generateTokens, verifyAccessToken, verifyRefreshToken } from '../../utils/jwtUtils';
import { ApiResponseBuilder } from '../../utils/apiResponse';
import { AppError, errorCodes, asyncHandler } from '../../utils/errorHandler';
import { validateSchema, commonSchemas } from '../../middleware/inputSanitizer';
import { createUserSession, invalidateUserSession, refreshUserSession } from '../../services/sessionManager';
import { redisManager, ensureRedisConnection } from '../../config/redis';
import { sessionManager } from '../../services/sessionManager';
import { cacheService } from '../../services/cacheService';

const router = express.Router();

// Login endpoint with enhanced session management
router.post('/login', 
  validateSchema(commonSchemas.login),
  asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;

  console.log('Login attempt:', { username });

  try {
    console.log('Attempting database query...');
    const result = await pool.query(
        'SELECT id, username, password_hash, role, organization_id FROM users WHERE username = $1',
      [username]
    );

      console.log('Query result:', result.rows.length > 0 ? 'User found' : 'User not found');

    if (result.rows.length === 0) {
        console.log('User not found');
      throw new AppError(401, errorCodes.AUTH_INVALID_CREDENTIALS, 'Invalid username or password');
    }

    const user = result.rows[0];
      
      console.log('Attempting password verification...');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
      console.log('Password verification result:', isValidPassword);

    if (!isValidPassword) {
        console.log('Invalid password');
      throw new AppError(401, errorCodes.AUTH_INVALID_CREDENTIALS, 'Invalid username or password');
    }

      // Extract request metadata for session management
      const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const deviceInfo = extractDeviceInfo(userAgent);

      console.log('🔐 [AUTH] Creating session for successful login');

      try {
        // Ensure Redis connection before creating session
        await ensureRedisConnection();

        // Create enhanced session with Redis
        const sessionResult = await createUserSession({
          userId: user.id.toString(),
          username: user.username,
          role: user.role,
          organizationId: user.organization_id,
          ipAddress,
          userAgent,
          deviceInfo
        });

        console.log(`🔐 [AUTH] Session created successfully: ${sessionResult.sessionId}`);

        // Set refresh token as httpOnly cookie
        res.cookie('refreshToken', sessionResult.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        console.log('Login successful for user:', user.username);
        res.json(ApiResponseBuilder.success({
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            organizationId: user.organization_id,
          },
          accessToken: sessionResult.accessToken,
          sessionId: sessionResult.sessionId
        }, 'Login successful'));

      } catch (sessionError) {
        console.error('❌ [AUTH] Session creation failed, falling back to standard JWT:', sessionError);
        
        // Fall back to standard JWT authentication if Redis is unavailable
    const tokens = generateTokens({
          userId: user.id.toString(),
      username: user.username,
      role: user.role,
      organizationId: user.organization_id
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

        console.log('Login successful for user (JWT fallback):', user.username);
    res.json(ApiResponseBuilder.success({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        organizationId: user.organization_id,
          },
          accessToken: tokens.accessToken
        }, 'Login successful'));
      }

    } catch (error) {
      console.log('Login error:', error);
      console.error('Error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        details: error instanceof AppError ? error.details : undefined
      });
      throw error;
    }
  })
);

// Enhanced logout endpoint with session invalidation
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  console.log('🔐 [AUTH] Processing logout request');
  
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      console.log('🔐 [AUTH] Refresh token found, attempting session invalidation');
      
      try {
        await ensureRedisConnection();
        
        // Try to refresh the session to get session ID for invalidation
        const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
        const userAgent = req.headers['user-agent'] || 'unknown';
        
        const sessionResult = await refreshUserSession(refreshToken, ipAddress, userAgent);
        
        if (sessionResult) {
          // Extract session ID from the refresh token (we'd need to decode it)
          const { verifyRefreshToken } = await import('../../utils/jwtUtils');
          const decoded = verifyRefreshToken(refreshToken);
          
          if (decoded.sessionId) {
            await invalidateUserSession(decoded.sessionId);
            console.log(`🔐 [AUTH] Session ${decoded.sessionId} invalidated successfully`);
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
}));

// Enhanced refresh token endpoint
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  console.log('🔐 [AUTH] Processing token refresh request');
  
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    console.log('🔐 [AUTH] No refresh token provided');
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'Refresh token required');
  }

  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Try enhanced session refresh first
    try {
      await ensureRedisConnection();
      
      const sessionResult = await refreshUserSession(refreshToken, ipAddress, userAgent);
      
      if (sessionResult) {
        console.log('🔐 [AUTH] Session refresh successful');
        
        // Update refresh token cookie
        res.cookie('refreshToken', sessionResult.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.json(ApiResponseBuilder.success({
          accessToken: sessionResult.accessToken
        }, 'Token refreshed successfully'));
      }
    } catch (sessionError) {
      console.error('❌ [AUTH] Enhanced session refresh failed, falling back to standard JWT:', sessionError);
    }

    // Fall back to standard JWT refresh
    const { verifyRefreshToken } = await import('../../utils/jwtUtils');
    const payload = verifyRefreshToken(refreshToken);
    
    // Fetch fresh user data from database
    const result = await pool.query(
      'SELECT id, username, role, organization_id FROM users WHERE id = $1',
      [parseInt(payload.userId, 10)]
    );

    if (result.rows.length === 0) {
      console.log('🔐 [AUTH] User not found in database');
      res.clearCookie('refreshToken');
      throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not found');
    }

    const user = result.rows[0];

    const tokens = generateTokens({
      userId: user.id.toString(),
      username: user.username,
      role: user.role,
      organizationId: user.organization_id
    });

    // Set new refresh token
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    console.log('🔐 [AUTH] Standard JWT token refresh successful');
    res.json(ApiResponseBuilder.success({
      accessToken: tokens.accessToken
    }, 'Token refreshed successfully'));

  } catch (error) {
    console.error('🔐 [AUTH] Token refresh failed:', error);
    res.clearCookie('refreshToken');
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'Invalid refresh token');
  }
}));

// Session management endpoints

// Get current session info
router.get('/session-info', asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'No active session');
  }

  try {
    await ensureRedisConnection();
    
    const { verifyRefreshToken } = await import('../../utils/jwtUtils');
    const decoded = verifyRefreshToken(refreshToken);
    
    if (decoded.sessionId) {
      const sessionData = await redisManager.getSession(decoded.sessionId);
      
      if (sessionData) {
        return res.json(ApiResponseBuilder.success({
          sessionId: sessionData.sessionId,
          userId: sessionData.userId,
          username: sessionData.username,
          role: sessionData.role,
          securityLevel: sessionData.securityLevel,
          createdAt: sessionData.createdAt,
          lastAccess: sessionData.lastAccess,
          ipAddress: sessionData.ipAddress,
          deviceInfo: sessionData.deviceInfo
        }, 'Session information retrieved'));
      }
    }
    
    // Fall back to JWT information
    res.json(ApiResponseBuilder.success({ 
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      sessionType: 'jwt-only'
    }, 'Session information retrieved (JWT)'));
    
  } catch (error) {
    console.error('❌ [AUTH] Failed to get session info:', error);
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'Invalid session');
      }
    }));

// Invalidate all sessions for current user
router.post('/logout-all', asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'No active session');
  }

  try {
    await ensureRedisConnection();
    
    const { verifyRefreshToken } = await import('../../utils/jwtUtils');
    const decoded = verifyRefreshToken(refreshToken);
    
    const { invalidateAllUserSessions } = await import('../../services/sessionManager');
    const invalidatedCount = await invalidateAllUserSessions(decoded.userId);
    
    // Clear current refresh token
    res.clearCookie('refreshToken');
    
    console.log(`🔐 [AUTH] Invalidated ${invalidatedCount} sessions for user ${decoded.username}`);
    res.json(ApiResponseBuilder.success({
      invalidatedSessions: invalidatedCount
    }, 'All sessions invalidated successfully'));
    
  } catch (error) {
    console.error('❌ [AUTH] Failed to invalidate all sessions:', error);
    // Clear cookie even if session invalidation fails
    res.clearCookie('refreshToken');
    res.json(ApiResponseBuilder.success(null, 'Logged out successfully'));
  }
}));

/**
 * Helper function to extract device information from user agent
 */
function extractDeviceInfo(userAgent: string): string {
  const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
  const osMatch = userAgent.match(/(Windows NT [\d.]+|Mac OS X [\d_]+|Linux|Android [\d.]+|iOS [\d.]+)/);
  
  const browser = browserMatch ? `${browserMatch[1]} ${browserMatch[2]}` : 'Unknown Browser';
  const os = osMatch ? osMatch[1].replace(/_/g, '.') : 'Unknown OS';
  
  return `${browser} on ${os}`;
}

export default router; 