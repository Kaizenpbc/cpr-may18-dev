import type { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder } from './apiResponse.js';

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, unknown> | string;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown> | string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorCodes = {
  // Authentication Errors (1000-1999)
  AUTH_INVALID_CREDENTIALS: 'AUTH_1001',
  AUTH_TOKEN_EXPIRED: 'AUTH_1002',
  AUTH_TOKEN_INVALID: 'AUTH_1003',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_1004',
  AUTH_TOKEN_MISSING: 'AUTH_1005',
  AUTH_SESSION_INVALID: 'AUTH_1006',
  AUTH_SESSION_REQUIRED: 'AUTH_1007',

  // Validation Errors (2000-2999)
  VALIDATION_ERROR: 'VAL_2001',
  INVALID_INPUT: 'VAL_2002',

  // Resource Errors (3000-3999)
  RESOURCE_NOT_FOUND: 'RES_3001',
  RESOURCE_ALREADY_EXISTS: 'RES_3002',
  RESOURCE_DELETED: 'RES_3003',
  ACCESS_DENIED: 'RES_3004',

  // Database Errors (4000-4999)
  DB_CONNECTION_ERROR: 'DB_4001',
  DB_QUERY_ERROR: 'DB_4002',
  DB_TRANSACTION_ERROR: 'DB_4003',

  // Server Errors (5000-5999)
  INTERNAL_SERVER_ERROR: 'SRV_5001',
  SERVICE_UNAVAILABLE: 'SRV_5002',
  EMAIL_SEND_ERROR: 'SRV_5003',

  // Notification Errors (6000-6999)
  NOTIFICATION_NOT_FOUND: 'NOT_6001',
  NOTIFICATION_CREATION_FAILED: 'NOT_6002',
  NOTIFICATION_UPDATE_FAILED: 'NOT_6003',
} as const;

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    ...(err instanceof AppError && { details: err.details }),
  });

  if (err instanceof AppError) {
    return res
      .status(err.statusCode)
      .json(ApiResponseBuilder.error(err.code, err.message, err.details));
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res
      .status(400)
      .json(
        ApiResponseBuilder.error(
          errorCodes.VALIDATION_ERROR,
          'Validation Error',
          err.message
        )
      );
  }

  if (err.name === 'JsonWebTokenError') {
    return res
      .status(401)
      .json(
        ApiResponseBuilder.error(
          errorCodes.AUTH_TOKEN_INVALID,
          'Invalid token',
          err.message
        )
      );
  }

  // Default error
  return res
    .status(500)
    .json(
      ApiResponseBuilder.error(
        errorCodes.INTERNAL_SERVER_ERROR,
        'Internal Server Error',
        process.env.NODE_ENV === 'development' ? err.message : undefined
      )
    );
}

// Async handler to catch errors in async routes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AsyncRequestHandler = (req: Request<any, any, any, any>, res: Response, next: NextFunction) => Promise<void | Response<any>>;

export function asyncHandler(fn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
