import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifyRefreshToken, generateTokens } from '../utils/jwtUtils';
import { extractTokenFromHeader } from '../utils/jwtUtils';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { errorCodes } from '../utils/errorHandler';
import { AppError } from '../utils/errorHandler';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        role?: string;
        organizationId?: number;
      };
    }
  }
}

// Role-based authentication middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json(ApiResponseBuilder.error(
        errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
        'Access denied: No role specified'
      ));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json(ApiResponseBuilder.error(
        errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
        'Access denied: Insufficient privileges'
      ));
    }

    next();
  };
};

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  console.log('[Debug] authMiddleware - Authenticating request:', req.path);
  console.log('[Debug] authMiddleware - Headers:', req.headers);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).send();
  }

  const token = extractTokenFromHeader(req);
  console.log('[Debug] authMiddleware - Extracted token:', token ? 'present' : 'not present');
  
  if (!token) {
    console.log('[Debug] authMiddleware - No token provided');
    // Try to refresh using refresh token
    const refreshToken = req.cookies.refreshToken;
    console.log('[Debug] authMiddleware - Refresh token from cookies:', refreshToken ? 'present' : 'not present');
    
    if (!refreshToken) {
      console.log('[Debug] authMiddleware - No refresh token found');
      return res.status(401).json(ApiResponseBuilder.error(errorCodes.AUTH_TOKEN_INVALID, 'No token provided'));
    }

    try {
      console.log('[Debug] authMiddleware - Attempting refresh with cookie token');
      const payload = verifyRefreshToken(refreshToken);
      console.log('[Debug] authMiddleware - Refresh token valid for user:', payload.username);
      
      // Fetch fresh user data from database to ensure we have current role and organizationId
      const { pool } = await import('../config/database');
      const result = await pool.query(
        'SELECT id, username, role, organization_id FROM users WHERE id = $1',
        [parseInt(payload.userId, 10)]
      );
      
      if (result.rows.length === 0) {
        console.log('[Debug] authMiddleware - User not found in database');
        res.clearCookie('refreshToken');
        return res.status(401).json(ApiResponseBuilder.error(errorCodes.AUTH_TOKEN_INVALID, 'User not found'));
      }
      
      const user = result.rows[0];
      console.log('[Debug] authMiddleware - Fresh user data:', { username: user.username, role: user.role, organizationId: user.organization_id });
      
      const tokens = generateTokens({
        userId: user.id,
        username: user.username,
        role: user.role,
        organizationId: user.organization_id
      });
      console.log('[Debug] authMiddleware - Generated new tokens');
      
      // Set new tokens
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Changed from 'strict' to 'lax' to allow cross-site requests
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Set user for this request with fresh data
      req.user = {
        userId: user.id.toString(),
        username: user.username,
        role: user.role,
        organizationId: user.organization_id
      };
      
      // Set new access token in response header
      res.setHeader('Authorization', `Bearer ${tokens.accessToken}`);
      
      console.log('[Debug] authMiddleware - Token refresh successful');
      // Continue with the request
      return next();
    } catch (error) {
      console.error('[Debug] authMiddleware - Refresh token invalid:', error);
      // Clear the invalid refresh token
      res.clearCookie('refreshToken');
      return res.status(401).json(ApiResponseBuilder.error(errorCodes.AUTH_TOKEN_INVALID, 'Invalid refresh token'));
    }
  }

  try {
    console.log('[Debug] authMiddleware - Verifying access token');
    const payload = verifyAccessToken(token);
    req.user = payload;
    console.log('[Debug] authMiddleware - Token verified successfully for user:', payload.username);
    next();
  } catch (error) {
    console.error('[Debug] authMiddleware - Access token invalid:', error);
    // If access token is invalid, try to refresh
    const refreshToken = req.cookies.refreshToken;
    console.log('[Debug] authMiddleware - Refresh token from cookies:', refreshToken ? 'present' : 'not present');
    
    if (!refreshToken) {
      console.log('[Debug] authMiddleware - No refresh token found');
      return res.status(401).json(ApiResponseBuilder.error(errorCodes.AUTH_TOKEN_INVALID, 'Invalid token'));
    }

    try {
      console.log('[Debug] authMiddleware - Verifying refresh token');
      const payload = verifyRefreshToken(refreshToken);
      console.log('[Debug] authMiddleware - Refresh token valid for user:', payload.username);
      
      // Fetch fresh user data from database to ensure we have current role and organizationId
      const { pool } = await import('../config/database');
      const result = await pool.query(
        'SELECT id, username, role, organization_id FROM users WHERE id = $1',
        [parseInt(payload.userId, 10)]
      );
      
      if (result.rows.length === 0) {
        console.log('[Debug] authMiddleware - User not found in database');
        res.clearCookie('refreshToken');
        return res.status(401).json(ApiResponseBuilder.error(errorCodes.AUTH_TOKEN_INVALID, 'User not found'));
      }
      
      const user = result.rows[0];
      console.log('[Debug] authMiddleware - Fresh user data:', { username: user.username, role: user.role, organizationId: user.organization_id });
      
      const tokens = generateTokens({
        userId: user.id,
        username: user.username,
        role: user.role,
        organizationId: user.organization_id
      });
      console.log('[Debug] authMiddleware - Generated new tokens');
      
      // Set new tokens
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Changed from 'strict' to 'lax' to allow cross-site requests
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Set user for this request with fresh data
      req.user = {
        userId: user.id.toString(),
        username: user.username,
        role: user.role,
        organizationId: user.organization_id
      };
      
      // Set new access token in response header
      res.setHeader('Authorization', `Bearer ${tokens.accessToken}`);
      
      console.log('[Debug] authMiddleware - Token refresh successful');
      // Continue with the request
      next();
    } catch (error) {
      console.error('[Debug] authMiddleware - Refresh token invalid:', error);
      // Clear the invalid refresh token
      res.clearCookie('refreshToken');
      return res.status(401).json(ApiResponseBuilder.error(errorCodes.AUTH_TOKEN_INVALID, 'Invalid refresh token'));
    }
  }
};

// Helper function to extract token from headers
const extractTokenFromHeaders = (req: Request): string | null => {
  console.log('[Debug] jwtUtils - Extracting token from headers');
  const authHeader = req.headers['authorization'];
  console.log('[Debug] jwtUtils - Authorization header:', authHeader);

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log('[Debug] jwtUtils - Token extracted:', token ? 'present' : 'missing');
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
          message: 'Authentication required'
        }
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
        }
      });
    }

    next();
  };
}; 