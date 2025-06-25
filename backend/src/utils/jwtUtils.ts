import jwt from 'jsonwebtoken';
import type { Request } from 'express';
import { AppError, errorCodes } from './errorHandler.js';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

export interface TokenPayload {
  id: number;
  userId: string;
  username: string;
  role: string;
  organizationId?: number;
  organizationName?: string;
  sessionId?: string;
}

export const generateTokens = (payload: TokenPayload) => {
  const { exp, ...payloadWithoutExp } = payload as any;

  const accessToken = jwt.sign(
    payloadWithoutExp,
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    payloadWithoutExp,
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
};

export const verifyToken = (token: string, isRefreshToken = false) => {
  try {
    const secret = isRefreshToken
      ? process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
      : process.env.JWT_SECRET || 'your-secret-key';

    return jwt.verify(token, secret) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    console.log('[Debug] jwtUtils - Verifying access token');
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
    console.log(
      '[Debug] jwtUtils - Access token verified for user:',
      decoded.username,
      'session:',
      decoded.sessionId
    );
    return decoded;
  } catch (error) {
    console.error(
      '[Debug] jwtUtils - Access token verification failed:',
      error
    );
    throw new AppError(
      401,
      errorCodes.AUTH_TOKEN_INVALID,
      'Invalid access token'
    );
  }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    console.log('[Debug] jwtUtils - Verifying refresh token');
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;
    console.log(
      '[Debug] jwtUtils - Refresh token verified for user:',
      decoded.username,
      'session:',
      decoded.sessionId
    );
    return decoded;
  } catch (error) {
    console.error(
      '[Debug] jwtUtils - Refresh token verification failed:',
      error
    );
    throw new AppError(
      401,
      errorCodes.AUTH_TOKEN_INVALID,
      'Invalid refresh token'
    );
  }
};

export const extractTokenFromHeader = (req: Request): string | null => {
  console.log('[Debug] jwtUtils - Extracting token from headers');
  console.log(
    '[Debug] jwtUtils - Authorization header:',
    req.headers.authorization
  );

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('[Debug] jwtUtils - No Authorization header found');
    return null;
  }

  if (!authHeader.startsWith('Bearer ')) {
    console.log(
      '[Debug] jwtUtils - Authorization header does not start with Bearer'
    );
    return null;
  }

  const token = authHeader.split(' ')[1];
  console.log(
    '[Debug] jwtUtils - Token extracted:',
    token ? 'present' : 'not present'
  );
  return token;
};
