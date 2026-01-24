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

// Note: SessionData is defined in services/sessionManager.ts
// Import it there if needed: import { SessionData } from '../services/sessionManager.js'

// Centralized Express Request augmentation
// All Request extensions should be added here to avoid duplicate declarations
declare global {
  namespace Express {
    interface Request {
      // Authentication
      user?: TokenPayload;

      // MFA
      mfaVerified?: boolean;
      mfaType?: string;
      mfaTime?: Date;
      mfaStatus?: MFAStatus;

      // Session data (from sessionAuth.ts / services/sessionManager.ts)
      // Using any due to circular dependency issues with SessionData type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessionData?: any;
      ipAddress?: string;
      userAgent?: string;

      // Session info from middleware/sessionManager.ts (distinct from express-session's session)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessionInfo?: any;

      // API versioning (from routes/index.ts)
      apiVersion?: string;

      // API Security (complex types - using any with eslint-disable)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiKey?: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fingerprint?: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      passwordStrength?: any;
    }
  }
}
