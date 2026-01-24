import jwt, { Secret } from 'jsonwebtoken';
import type { Request } from 'express';
import { AppError, errorCodes } from './errorHandler.js';
import { devLog } from './logger.js';

// JWT secrets - require env vars in production, allow fallbacks only in development
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.JWT_ACCESS_SECRET) {
  throw new Error('FATAL: JWT_ACCESS_SECRET environment variable is required in production');
}
if (isProduction && !process.env.JWT_REFRESH_SECRET) {
  throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is required in production');
}

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret_not_for_production!';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_not_for_production';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

export interface TokenPayload {
  id: number;
  userId: string;
  username: string;
  email?: string;
  role: string;
  organizationId?: number;
  organizationName?: string;
  sessionId?: string;
}

// Express Request augmentation is centralized in types/index.ts

export const generateTokens = (payload: TokenPayload) => {
  const accessToken = jwt.sign(
    payload as object,
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    payload as object,
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
};

export const verifyToken = (token: string, secret: string = ACCESS_TOKEN_SECRET): TokenPayload => {
  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    devLog('[jwtUtils] Verifying access token');
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
    devLog('[jwtUtils] Access token verified for user:', decoded.username);
    return decoded;
  } catch (error) {
    devLog('[jwtUtils] Access token verification failed');
    throw new AppError(
      401,
      errorCodes.AUTH_TOKEN_INVALID,
      'Invalid access token'
    );
  }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    devLog('[jwtUtils] Verifying refresh token');
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;
    devLog('[jwtUtils] Refresh token verified for user:', decoded.username);
    return decoded;
  } catch (error) {
    devLog('[jwtUtils] Refresh token verification failed');
    throw new AppError(
      401,
      errorCodes.AUTH_TOKEN_INVALID,
      'Invalid refresh token'
    );
  }
};

export const extractTokenFromHeader = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    devLog('[jwtUtils] No Authorization header found');
    return null;
  }

  if (!authHeader.startsWith('Bearer ')) {
    devLog('[jwtUtils] Authorization header does not start with Bearer');
    return null;
  }

  const token = authHeader.split(' ')[1];
  devLog('[jwtUtils] Token extracted:', token ? 'present' : 'not present');
  return token;
};

export const generateToken = (user: TokenPayload): string => {
  // Use the same secret as ACCESS_TOKEN_SECRET for consistency
  const accessToken = jwt.sign(
    {
      id: user.id,
      userId: user.userId,
      username: user.username,
      role: user.role,
      organizationId: user.organizationId,
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '24h' }
  );
  return accessToken;
};

export const extractTokenFromRequest = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};
