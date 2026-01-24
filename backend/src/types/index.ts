import type { Request } from 'express';

/**
 * Token payload from JWT authentication
 */
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

/**
 * Express Request with guaranteed authenticated user
 * Use this type for routes that have authenticateToken middleware
 */
export interface AuthenticatedRequest extends Request {
  user: TokenPayload;
}

/**
 * Database error type for PostgreSQL errors
 */
export interface DatabaseError extends Error {
  code?: string;
  detail?: string;
  constraint?: string;
  schema?: string;
  table?: string;
  column?: string;
}

/**
 * Type guard to check if an error is a DatabaseError
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof Error && 'code' in error;
}

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Extract database error code from unknown error type
 */
export function getDbErrorCode(error: unknown): string | undefined {
  if (isDatabaseError(error)) {
    return error.code;
  }
  return undefined;
}

/**
 * MFA status information
 */
export interface MFAStatus {
  enabled: boolean;
  type?: string;
  trustedDevices: number;
  lastVerified?: Date;
}

// Re-export the global Express augmentation
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      mfaVerified?: boolean;
      mfaType?: string;
      mfaTime?: Date;
      mfaStatus?: MFAStatus;
    }
  }
}
