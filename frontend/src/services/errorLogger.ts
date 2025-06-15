import { StandardError, ErrorContext } from '../types/errors';
import logger from '../utils/logger';

interface LogEntry {
  timestamp: string;
  level: string;
  code: string;
  message: string;
  statusCode: number;
  context?: ErrorContext;
  details?: any;
  traceId?: string;
  stack?: string;
  environment: string;
  service?: string;
  method?: string;
  userId?: string;
  requestId?: string;
  url: string;
  userAgent: string;
}

export class ErrorLogger {
  /**
   * Main error logging method
   */
  static async logError(error: StandardError): Promise<void> {
    const logEntry = this.createLogEntry(error);
    
    try {
      // Log to console (always for development)
      if (import.meta.env.DEV) {
        this.logToConsole(logEntry);
      }
      
      // Log to external service (production)
      if (import.meta.env.PROD) {
        await this.sendToExternalLogger(logEntry);
      }
      
      // Store in local storage for debugging
      this.storeInLocalStorage(logEntry);
      
      // Send to analytics if available
      await this.sendToAnalytics(logEntry);
      
    } catch (loggingError) {
      // Fallback logging if main logging fails
      console.error('[ErrorLogger] Failed to log error:', loggingError);
      console.error('[ErrorLogger] Original error:', error);
    }
  }

  /**
   * Log route-specific errors
   */
  static async logRouteError(
    error: StandardError, 
    routeContext: { route: string; params?: any }
  ): Promise<void> {
    const enhancedError: StandardError = {
      ...error,
      context: {
        ...error.context,
        route: routeContext.route,
        params: routeContext.params,
        errorType: 'route'
      }
    };
    
    await this.logError(enhancedError);
  }

  /**
   * Log API-specific errors
   */
  static async logApiError(
    error: StandardError,
    apiContext: { 
      endpoint: string; 
      method: string; 
      requestData?: any;
      responseData?: any;
    }
  ): Promise<void> {
    const enhancedError: StandardError = {
      ...error,
      context: {
        ...error.context,
        endpoint: apiContext.endpoint,
        method: apiContext.method,
        requestData: apiContext.requestData,
        responseData: apiContext.responseData,
        errorType: 'api'
      }
    };
    
    await this.logError(enhancedError);
  }

  /**
   * Log authentication-specific errors
   */
  static async logAuthError(
    error: StandardError,
    authContext: { 
      action: string; 
      userId?: string;
      attemptedRole?: string;
    }
  ): Promise<void> {
    const enhancedError: StandardError = {
      ...error,
      context: {
        ...error.context,
        action: authContext.action,
        userId: authContext.userId,
        attemptedRole: authContext.attemptedRole,
        errorType: 'auth'
      }
    };
    
    await this.logError(enhancedError);
  }

  /**
   * Create structured log entry
   */
  private static createLogEntry(error: StandardError): LogEntry {
    return {
      timestamp: error.timestamp,
      level: this.getLogLevel(error.statusCode),
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      context: error.context,
      details: error.details,
      traceId: error.traceId,
      stack: error instanceof Error ? error.stack : undefined,
      environment: import.meta.env.MODE || 'unknown',
      service: error.context?.service,
      method: error.context?.method,
      userId: error.context?.userId,
      requestId: error.context?.requestId,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
  }

  /**
   * Determine log level based on status code
   */
  private static getLogLevel(statusCode: number): string {
    if (statusCode >= 500) return 'ERROR';
    if (statusCode >= 400) return 'WARN';
    if (statusCode >= 300) return 'INFO';
    return 'DEBUG';
  }

  /**
   * Log to console with structured format
   */
  private static logToConsole(logEntry: LogEntry): void {
    const consoleMethod = this.getConsoleMethod(logEntry.level);
    
    console.group(`🚨 [${logEntry.level}] ${logEntry.code}`);
    console.log('📋 Message:', logEntry.message);
    console.log('🏷️ Status:', logEntry.statusCode);
    console.log('⏰ Time:', logEntry.timestamp);
    console.log('🔍 Trace ID:', logEntry.traceId);
    console.log('🌐 Context:', logEntry.context);
    
    if (logEntry.details) {
      console.log('📊 Details:', logEntry.details);
    }
    
    if (logEntry.stack) {
      console.log('📚 Stack:', logEntry.stack);
    }
    
    console.groupEnd();
  }

  /**
   * Get appropriate console method
   */
  private static getConsoleMethod(level: string): (...args: any[]) => void {
    switch (level) {
      case 'ERROR':
        return console.error;
      case 'WARN':
        return console.warn;
      case 'INFO':
        return console.info;
      default:
        return console.log;
    }
  }

  /**
   * Send to external logging service
   */
  private static async sendToExternalLogger(logEntry: LogEntry): Promise<void> {
    try {
      // Example: Send to a logging service like LogRocket, Sentry, etc.
      const loggingEndpoint = import.meta.env.VITE_LOGGING_ENDPOINT;
      
      if (!loggingEndpoint) {
        return; // No external logging configured
      }

      await fetch(loggingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...logEntry,
          source: 'frontend',
          version: import.meta.env.VITE_APP_VERSION || '1.0.0',
        }),
      });
    } catch (error) {
      // Silently fail for external logging to avoid infinite loops
      console.warn('[ErrorLogger] Failed to send to external logger:', error);
    }
  }

  /**
   * Store in local storage for debugging
   */
  private static storeInLocalStorage(logEntry: LogEntry): void {
    try {
      const maxEntries = 50; // Keep last 50 errors
      const storageKey = 'app_error_logs';
      
      // Get existing logs
      const existingLogs = JSON.parse(
        localStorage.getItem(storageKey) || '[]'
      ) as LogEntry[];
      
      // Add new log entry
      existingLogs.unshift(logEntry);
      
      // Keep only recent entries
      const recentLogs = existingLogs.slice(0, maxEntries);
      
      // Store back to localStorage
      localStorage.setItem(storageKey, JSON.stringify(recentLogs));
    } catch (error) {
      // Silently fail if localStorage is not available
      console.warn('[ErrorLogger] Failed to store in localStorage:', error);
    }
  }

  /**
   * Send to analytics service
   */
  private static async sendToAnalytics(logEntry: LogEntry): Promise<void> {
    try {
      // Example: Send to analytics service
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'exception', {
          description: `${logEntry.code}: ${logEntry.message}`,
          fatal: logEntry.level === 'ERROR',
          custom_map: {
            error_code: logEntry.code,
            trace_id: logEntry.traceId,
            service: logEntry.service,
            method: logEntry.method,
          },
        });
      }

      // Example: Send to custom analytics
      const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
      if (analyticsEndpoint) {
        await fetch(analyticsEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event: 'error_logged',
            properties: {
              error_code: logEntry.code,
              error_level: logEntry.level,
              service: logEntry.service,
              method: logEntry.method,
              status_code: logEntry.statusCode,
              trace_id: logEntry.traceId,
              timestamp: logEntry.timestamp,
            },
          }),
        });
      }
    } catch (error) {
      console.warn('[ErrorLogger] Failed to send to analytics:', error);
    }
  }

  /**
   * Get error logs from local storage
   */
  static getStoredLogs(): LogEntry[] {
    try {
      const storageKey = 'app_error_logs';
      return JSON.parse(localStorage.getItem(storageKey) || '[]') as LogEntry[];
    } catch (error) {
      console.warn('[ErrorLogger] Failed to retrieve stored logs:', error);
      return [];
    }
  }

  /**
   * Clear stored error logs
   */
  static clearStoredLogs(): void {
    try {
      const storageKey = 'app_error_logs';
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('[ErrorLogger] Failed to clear stored logs:', error);
    }
  }

  /**
   * Get error summary for debugging
   */
  static getErrorSummary(): {
    totalErrors: number;
    errorsByCode: Record<string, number>;
    errorsByLevel: Record<string, number>;
    recentErrors: LogEntry[];
  } {
    const logs = this.getStoredLogs();
    
    const errorsByCode: Record<string, number> = {};
    const errorsByLevel: Record<string, number> = {};
    
    logs.forEach(log => {
      errorsByCode[log.code] = (errorsByCode[log.code] || 0) + 1;
      errorsByLevel[log.level] = (errorsByLevel[log.level] || 0) + 1;
    });
    
    return {
      totalErrors: logs.length,
      errorsByCode,
      errorsByLevel,
      recentErrors: logs.slice(0, 10), // Last 10 errors
    };
  }

  /**
   * Log performance-related errors
   */
  static async logPerformanceError(
    error: StandardError,
    performanceContext: {
      operation: string;
      duration: number;
      threshold: number;
    }
  ): Promise<void> {
    const enhancedError: StandardError = {
      ...error,
      context: {
        ...error.context,
        operation: performanceContext.operation,
        duration: performanceContext.duration,
        threshold: performanceContext.threshold,
        errorType: 'performance'
      }
    };
    
    await this.logError(enhancedError);
  }
}

export default ErrorLogger;
