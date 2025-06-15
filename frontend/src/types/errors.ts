// ===============================================
// Standardized Error Types & Interfaces
// ===============================================

export interface ErrorContext {
  service: string;
  method: string;
  userId?: string;
  requestId?: string;
  additionalData?: Record<string, any>;
}

export interface StandardError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
  context?: ErrorContext;
  timestamp: string;
  traceId?: string;
}

export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  SYSTEM = 'SYSTEM',
}

export class ServiceError extends Error {
  public readonly standardError: StandardError;

  constructor(standardError: StandardError) {
    super(standardError.message);
    this.standardError = standardError;
    this.name = 'ServiceError';
  }
}

// Standardized API Response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    traceId?: string;
  };
  metadata?: {
    timestamp: string;
    version: string;
    requestId?: string;
  };
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Enhanced error for tracking and analytics
export interface EnhancedError extends StandardError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  userMessage: string;
  suggestion: string;
  isRetryable: boolean;
  retryCount?: number;
  maxRetries?: number;
} 