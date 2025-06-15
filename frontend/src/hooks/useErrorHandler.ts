// ===============================================
// React Error Handling Hook
// ===============================================

import { useCallback } from 'react';
import { ErrorContext, StandardError, EnhancedError } from '../types/errors';
import ApiErrorHandler from '../utils/ApiErrorHandler';
import ErrorLogger from '../services/ErrorLogger';
import { useSnackbar } from '../contexts/SnackbarContext';

interface UseErrorHandlerOptions {
  enableLogging?: boolean;
  enableNotifications?: boolean;
  enableRetry?: boolean;
  context?: Partial<ErrorContext>;
}

interface ErrorHandlerResult {
  handleError: (error: unknown, context?: Partial<ErrorContext>) => StandardError;
  handleEnhancedError: (error: unknown, context?: Partial<ErrorContext>) => EnhancedError;
  handleApiError: (
    error: unknown,
    apiContext: { endpoint: string; method: string; requestData?: any }
  ) => StandardError;
  handleAuthError: (
    error: unknown,
    authContext: { action: string; userId?: string }
  ) => StandardError;
  isRetryableError: (error: StandardError) => boolean;
  getRetryDelay: (attempt: number) => number;
  showErrorNotification: (error: StandardError | EnhancedError) => void;
}

export const useErrorHandler = (options: UseErrorHandlerOptions = {}): ErrorHandlerResult => {
  const {
    enableLogging = true,
    enableNotifications = true,
    enableRetry = true,
    context: defaultContext = {},
  } = options;

  const { showSnackbar } = useSnackbar();

  /**
   * Main error handling function
   */
  const handleError = useCallback(
    (error: unknown, context?: Partial<ErrorContext>): StandardError => {
      const errorContext: ErrorContext = {
        service: 'Frontend',
        method: 'Unknown',
        ...defaultContext,
        ...context,
      };

      const standardError = ApiErrorHandler.handleError(error, errorContext);

      // Log error if enabled
      if (enableLogging) {
        ErrorLogger.logError(standardError).catch(loggingError =>
          console.warn('[useErrorHandler] Failed to log error:', loggingError)
        );
      }

      // Show notification if enabled
      if (enableNotifications) {
        showErrorNotification(standardError);
      }

      return standardError;
    },
    [enableLogging, enableNotifications, defaultContext, showSnackbar]
  );

  /**
   * Enhanced error handling with categorization
   */
  const handleEnhancedError = useCallback(
    (error: unknown, context?: Partial<ErrorContext>): EnhancedError => {
      const errorContext: ErrorContext = {
        service: 'Frontend',
        method: 'Unknown',
        ...defaultContext,
        ...context,
      };

      const enhancedError = ApiErrorHandler.handleEnhancedError(error, errorContext);

      // Log error if enabled
      if (enableLogging) {
        ErrorLogger.logError(enhancedError).catch(loggingError =>
          console.warn('[useErrorHandler] Failed to log error:', loggingError)
        );
      }

      // Show notification if enabled
      if (enableNotifications) {
        showErrorNotification(enhancedError);
      }

      return enhancedError;
    },
    [enableLogging, enableNotifications, defaultContext, showSnackbar]
  );

  /**
   * Handle API-specific errors
   */
  const handleApiError = useCallback(
    (
      error: unknown,
      apiContext: { endpoint: string; method: string; requestData?: any }
    ): StandardError => {
      const errorContext: ErrorContext = {
        service: 'ApiService',
        method: `${apiContext.method} ${apiContext.endpoint}`,
        ...defaultContext,
        additionalData: {
          endpoint: apiContext.endpoint,
          method: apiContext.method,
          requestData: apiContext.requestData,
        },
      };

      const standardError = ApiErrorHandler.handleError(error, errorContext);

      // Log API error with additional context
      if (enableLogging) {
        ErrorLogger.logApiError(standardError, {
          endpoint: apiContext.endpoint,
          method: apiContext.method,
          requestData: apiContext.requestData,
        }).catch(loggingError =>
          console.warn('[useErrorHandler] Failed to log API error:', loggingError)
        );
      }

      // Show notification if enabled
      if (enableNotifications) {
        showErrorNotification(standardError);
      }

      return standardError;
    },
    [enableLogging, enableNotifications, defaultContext, showSnackbar]
  );

  /**
   * Handle authentication-specific errors
   */
  const handleAuthError = useCallback(
    (
      error: unknown,
      authContext: { action: string; userId?: string }
    ): StandardError => {
      const errorContext: ErrorContext = {
        service: 'AuthService',
        method: authContext.action,
        userId: authContext.userId,
        ...defaultContext,
      };

      const standardError = ApiErrorHandler.handleError(error, errorContext);

      // Log auth error with additional context
      if (enableLogging) {
        ErrorLogger.logAuthError(standardError, {
          action: authContext.action,
          userId: authContext.userId,
        }).catch(loggingError =>
          console.warn('[useErrorHandler] Failed to log auth error:', loggingError)
        );
      }

      // Show notification if enabled
      if (enableNotifications) {
        showErrorNotification(standardError);
      }

      return standardError;
    },
    [enableLogging, enableNotifications, defaultContext, showSnackbar]
  );

  /**
   * Check if error is retryable
   */
  const isRetryableError = useCallback((error: StandardError): boolean => {
    return enableRetry && ApiErrorHandler.isRetryableError(error);
  }, [enableRetry]);

  /**
   * Get retry delay
   */
  const getRetryDelay = useCallback((attempt: number): number => {
    return ApiErrorHandler.getRetryDelay(attempt);
  }, []);

  /**
   * Show user-friendly error notification
   */
  const showErrorNotification = useCallback(
    (error: StandardError | EnhancedError) => {
      const isEnhanced = 'userMessage' in error;
      const message = isEnhanced ? error.userMessage : error.message;
      const suggestion = isEnhanced ? error.suggestion : '';
      
      // Determine notification severity
      let severity: 'error' | 'warning' | 'info' = 'error';
      if (error.statusCode < 500) {
        severity = error.statusCode >= 400 ? 'warning' : 'info';
      }

      // Show primary message
      showSnackbar(message, severity);

      // Show suggestion if available and different from message
      if (suggestion && suggestion !== message) {
        setTimeout(() => {
          showSnackbar(suggestion, 'info');
        }, 3000);
      }
    },
    [showSnackbar]
  );

  return {
    handleError,
    handleEnhancedError,
    handleApiError,
    handleAuthError,
    isRetryableError,
    getRetryDelay,
    showErrorNotification,
  };
};

/**
 * Higher-order component for automatic error handling
 */
export const withErrorHandler = <P extends object>(
  Component: React.ComponentType<P>,
  options?: UseErrorHandlerOptions
) => {
  const WrappedComponent = (props: P & { errorHandler?: ErrorHandlerResult }) => {
    const errorHandler = useErrorHandler(options);
    return <Component {...props} errorHandler={errorHandler} />;
  };

  WrappedComponent.displayName = `withErrorHandler(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

/**
 * Hook for handling async operations with automatic error handling
 */
export const useAsyncErrorHandler = (options?: UseErrorHandlerOptions) => {
  const { handleError, handleEnhancedError } = useErrorHandler(options);

  const executeAsync = useCallback(
    async <T>(
      asyncOperation: () => Promise<T>,
      context?: Partial<ErrorContext>
    ): Promise<T | null> => {
      try {
        return await asyncOperation();
      } catch (error) {
        handleError(error, context);
        return null;
      }
    },
    [handleError]
  );

  const executeAsyncWithRetry = useCallback(
    async <T>(
      asyncOperation: () => Promise<T>,
      maxRetries: number = 3,
      context?: Partial<ErrorContext>
    ): Promise<T | null> => {
      let lastError: unknown;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await asyncOperation();
        } catch (error) {
          lastError = error;
          const standardError = handleEnhancedError(error, {
            ...context,
            additionalData: { attempt, maxRetries },
          });

          // If not retryable or last attempt, throw
          if (!standardError.isRetryable || attempt === maxRetries) {
            break;
          }

          // Wait before retry
          const delay = ApiErrorHandler.getRetryDelay(attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      return null;
    },
    [handleEnhancedError]
  );

  return {
    executeAsync,
    executeAsyncWithRetry,
  };
};

export default useErrorHandler; 