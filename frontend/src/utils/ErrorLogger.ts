// ===============================================
// Error Logger Utility
// ===============================================

import { StandardError, EnhancedError, ErrorContext } from '../types/errors';

interface ApiErrorLogContext {
  endpoint: string;
  method: string;
  requestData?: unknown;
}

interface AuthErrorLogContext {
  action: string;
  userId?: string;
}

/**
 * ErrorLogger provides centralized error logging functionality.
 * In production, this could be extended to send logs to external services
 * like Sentry, LogRocket, or a custom logging backend.
 */
export const ErrorLogger = {
  /**
   * Log a standard error
   */
  logError: async (error: StandardError, context: ErrorContext): Promise<void> => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      type: 'standard',
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      },
      context: {
        service: context.service,
        method: context.method,
        userId: context.userId,
        requestId: context.requestId,
      },
    };

    // In development, log to console
    if (import.meta.env.DEV) {
      console.error('[ErrorLogger] Standard Error:', logEntry);
    }

    // In production, you would send to external service
    // await sendToLoggingService(logEntry);
  },

  /**
   * Log an enhanced error with additional context
   */
  logEnhancedError: async (error: EnhancedError, context: ErrorContext): Promise<void> => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      type: 'enhanced',
      error: {
        code: error.code,
        message: error.message,
        userMessage: error.userMessage,
        suggestion: error.suggestion,
        statusCode: error.statusCode,
        isRetryable: error.isRetryable,
        details: error.details,
      },
      context: {
        service: context.service,
        method: context.method,
        userId: context.userId,
        requestId: context.requestId,
        additionalData: context.additionalData,
      },
    };

    // In development, log to console
    if (import.meta.env.DEV) {
      console.error('[ErrorLogger] Enhanced Error:', logEntry);
    }
  },

  /**
   * Log an API-specific error
   */
  logApiError: async (error: StandardError, apiContext: ApiErrorLogContext): Promise<void> => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      type: 'api',
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      },
      apiContext: {
        endpoint: apiContext.endpoint,
        method: apiContext.method,
        hasRequestData: !!apiContext.requestData,
      },
    };

    // In development, log to console
    if (import.meta.env.DEV) {
      console.error('[ErrorLogger] API Error:', logEntry);
    }
  },

  /**
   * Log an authentication-specific error
   */
  logAuthError: async (error: StandardError, authContext: AuthErrorLogContext): Promise<void> => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      type: 'auth',
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      },
      authContext: {
        action: authContext.action,
        userId: authContext.userId ? '[REDACTED]' : undefined, // Don't log actual user IDs
      },
    };

    // In development, log to console
    if (import.meta.env.DEV) {
      console.error('[ErrorLogger] Auth Error:', logEntry);
    }
  },
};

export default ErrorLogger;
