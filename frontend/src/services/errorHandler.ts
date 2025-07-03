import { toast } from 'react-toastify';
import logger from '../utils/logger';

export interface AppError {
  code: string;
  message: string;
  statusCode?: number;
  details?: any;
  userMessage?: string;
  isRetryable?: boolean;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  endpoint?: string;
  userId?: string;
}

// Centralized error handling service
export class ErrorHandler {
  private static instance: ErrorHandler;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Parse and standardize errors from different sources
  parseError(error: any, context?: ErrorContext): AppError {
    // Handle axios errors
    if (error.response) {
      return {
        code: error.response.data?.error?.code || 'API_ERROR',
        message: error.response.data?.error?.message || error.message,
        statusCode: error.response.status,
        details: error.response.data,
        userMessage: this.getUserFriendlyMessage(error.response.status, error.response.data?.error?.code),
        isRetryable: this.isRetryableError(error.response.status)
      };
    }

    // Handle network errors
    if (error.request) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network request failed',
        userMessage: 'Unable to connect to server. Please check your internet connection.',
        isRetryable: true
      };
    }

    // Handle React Query errors
    if (error?.code) {
      return {
        code: error.code,
        message: error.message,
        userMessage: error.userMessage || this.getUserFriendlyMessage(undefined, error.code),
        isRetryable: error.isRetryable || false
      };
    }

    // Handle generic errors
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      userMessage: 'Something went wrong. Please try again.',
      isRetryable: false
    };
  }

  // Get user-friendly error messages
  private getUserFriendlyMessage(statusCode?: number, errorCode?: string): string {
    if (errorCode) {
      switch (errorCode) {
        case 'AUTH_1001':
          return 'Your session has expired. Please log in again.';
        case 'AUTH_1002':
          return 'Invalid credentials. Please check your username and password.';
        case 'AUTH_1003':
          return 'Invalid authentication token. Please log in again.';
        case 'AUTH_1004':
          return 'You do not have permission to perform this action.';
        case 'AUTH_1005':
          return 'Authentication required. Please log in.';
        case 'VALIDATION_ERROR':
          return 'Please check your input and try again.';
        case 'NOT_FOUND':
          return 'The requested resource was not found.';
        case 'NETWORK_ERROR':
          return 'Unable to connect to server. Please check your internet connection.';
        default:
          break;
      }
    }

    if (statusCode) {
      switch (statusCode) {
        case 400:
          return 'Invalid request. Please check your input.';
        case 401:
          return 'Please log in to continue.';
        case 403:
          return 'You do not have permission to perform this action.';
        case 404:
          return 'The requested resource was not found.';
        case 409:
          return 'This resource already exists.';
        case 422:
          return 'Please check your input and try again.';
        case 429:
          return 'Too many requests. Please wait a moment and try again.';
        case 500:
          return 'Server error. Please try again later.';
        case 502:
        case 503:
        case 504:
          return 'Service temporarily unavailable. Please try again later.';
        default:
          return 'Something went wrong. Please try again.';
      }
    }

    return 'Something went wrong. Please try again.';
  }

  // Determine if an error is retryable
  private isRetryableError(statusCode?: number): boolean {
    if (!statusCode) return false;
    
    // Retry on server errors and rate limiting
    return statusCode >= 500 || statusCode === 429;
  }

  // Handle errors with consistent user feedback
  handleError(error: any, context?: ErrorContext, options?: {
    showToast?: boolean;
    showConsole?: boolean;
    redirectToLogin?: boolean;
  }): AppError {
    const parsedError = this.parseError(error, context);
    const {
      showToast = true,
      showConsole = true,
      redirectToLogin = false
    } = options || {};

    // Log error for debugging
    if (showConsole) {
      logger.error('Error occurred:', {
        error: parsedError,
        context,
        originalError: error
      });
    }

    // Show user-friendly toast
    if (showToast) {
      this.showErrorToast(parsedError);
    }

    // Handle authentication errors
    if (parsedError.statusCode === 401 || parsedError.code === 'AUTH_1001' || parsedError.code === 'AUTH_1003') {
      if (redirectToLogin) {
        this.redirectToLogin();
      }
    }

    return parsedError;
  }

  // Show error toast with consistent styling
  private showErrorToast(error: AppError): void {
    toast.error(error.userMessage || error.message, {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      toastId: error.code // Prevent duplicate toasts
    });
  }

  // Show success toast
  showSuccessToast(message: string): void {
    toast.success(message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true
    });
  }

  // Show warning toast
  showWarningToast(message: string): void {
    toast.warning(message, {
      position: 'top-right',
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true
    });
  }

  // Show info toast
  showInfoToast(message: string): void {
    toast.info(message, {
      position: 'top-right',
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true
    });
  }

  // Redirect to login page
  private redirectToLogin(): void {
    // Clear any stored tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.clear();
    
    // Redirect to login
    window.location.href = '/login';
  }

  // Create a React Query error handler
  createQueryErrorHandler(context?: ErrorContext) {
    return (error: any) => {
      return this.handleError(error, context, {
        showToast: true,
        showConsole: true,
        redirectToLogin: true
      });
    };
  }

  // Create a mutation error handler
  createMutationErrorHandler(context?: ErrorContext) {
    return (error: any) => {
      return this.handleError(error, context, {
        showToast: true,
        showConsole: true,
        redirectToLogin: true
      });
    };
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Export convenience functions
export const handleError = (error: any, context?: ErrorContext, options?: any) => 
  errorHandler.handleError(error, context, options);

export const showSuccessToast = (message: string) => 
  errorHandler.showSuccessToast(message);

export const showErrorToast = (message: string) => 
  errorHandler.showErrorToast({ code: 'CUSTOM_ERROR', message, userMessage: message });

export const showWarningToast = (message: string) => 
  errorHandler.showWarningToast(message);

export const showInfoToast = (message: string) => 
  errorHandler.showInfoToast(message); 