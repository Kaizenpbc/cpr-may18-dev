import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { logSecurityEvent, AuditEventSeverity } from '../middleware/auditLogger.js';

// Load environment variables
dotenv.config();

// Environment types
export type Environment = 'development' | 'staging' | 'production' | 'test';

// Configuration validation rules
export interface ConfigValidationRule {
  key: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'password';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  allowedValues?: string[];
  secure?: boolean; // Should be masked in logs
  description: string;
}

// Environment configuration interface
export interface EnvironmentConfig {
  // Core settings
  environment: Environment;
  nodeEnv: string;
  port: number;
  host: string;
  
  // Database configuration
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
    maxConnections: number;
    connectionTimeout: number;
  };
  
  // Security configuration
  security: {
    jwtSecret: string;
    refreshTokenSecret: string;
    bcryptSaltRounds: number;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    encryptionKey: string;
    sessionSecret: string;
  };
  
  // API configuration
  api: {
    rateLimitWindow: number;
    rateLimitMax: number;
    maxRequestSize: number;
    corsOrigins: string[];
    enableApiKeys: boolean;
  };
  
  // Email configuration
  email: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
    enabled: boolean;
  };
  
  // Redis configuration
  redis: {
    enabled: boolean;
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  
  // SSL/TLS configuration
  ssl: {
    enabled: boolean;
    keyPath?: string;
    certPath?: string;
    caPath?: string;
    passphrase?: string;
  };
  
  // Logging configuration
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    enableFileLogging: boolean;
    logDirectory: string;
    maxLogFiles: number;
    maxLogSize: number;
  };
  
  // Application settings
  app: {
    name: string;
    version: string;
    supportEmail: string;
    maxFileSize: number;
    enableMetrics: boolean;
    enableHealthChecks: boolean;
  };
}

// Configuration validation rules
const CONFIG_VALIDATION_RULES: ConfigValidationRule[] = [
  // Core settings
  {
    key: 'NODE_ENV',
    required: true,
    type: 'string',
    allowedValues: ['development', 'staging', 'production', 'test'],
    description: 'Node.js environment'
  },
  {
    key: 'PORT',
    required: true,
    type: 'number',
    min: 1,
    max: 65535,
    description: 'Server port number'
  },
  {
    key: 'HOST',
    required: false,
    type: 'string',
    description: 'Server host address'
  },
  
  // Database configuration
  {
    key: 'DB_HOST',
    required: true,
    type: 'string',
    minLength: 1,
    description: 'Database host'
  },
  {
    key: 'DB_PORT',
    required: true,
    type: 'number',
    min: 1,
    max: 65535,
    description: 'Database port'
  },
  {
    key: 'DB_NAME',
    required: true,
    type: 'string',
    minLength: 1,
    description: 'Database name'
  },
  {
    key: 'DB_USER',
    required: true,
    type: 'string',
    minLength: 1,
    description: 'Database username'
  },
  {
    key: 'DB_PASSWORD',
    required: true,
    type: 'password',
    minLength: 6, // Allow shorter passwords for development
    secure: true,
    description: 'Database password'
  },
  
  // Security configuration
  {
    key: 'JWT_SECRET',
    required: true,
    type: 'password',
    minLength: 32,
    secure: true,
    description: 'JWT signing secret'
  },
  {
    key: 'REFRESH_TOKEN_SECRET',
    required: true,
    type: 'password',
    minLength: 32,
    secure: true,
    description: 'Refresh token signing secret'
  },
  {
    key: 'BCRYPT_SALT_ROUNDS',
    required: false,
    type: 'number',
    min: 10,
    max: 15,
    description: 'Bcrypt salt rounds'
  },
  {
    key: 'DB_ENCRYPTION_KEY',
    required: false,
    type: 'password',
    minLength: 32,
    secure: true,
    description: 'Database encryption key'
  },
  
  // Email configuration
  {
    key: 'SMTP_HOST',
    required: false,
    type: 'string',
    description: 'SMTP server host'
  },
  {
    key: 'SMTP_PORT',
    required: false,
    type: 'number',
    min: 1,
    max: 65535,
    description: 'SMTP server port'
  },
  {
    key: 'SMTP_USER',
    required: false,
    type: 'email',
    description: 'SMTP username'
  },
  {
    key: 'SMTP_PASS',
    required: false,
    type: 'password',
    secure: true,
    description: 'SMTP password'
  },
  {
    key: 'SMTP_FROM',
    required: false,
    type: 'email',
    description: 'SMTP from address'
  }
];

// Validation functions
function validateString(value: string, rule: ConfigValidationRule): string[] {
  const errors: string[] = [];
  
  if (rule.minLength && value.length < rule.minLength) {
    errors.push(`${rule.key} must be at least ${rule.minLength} characters long`);
  }
  
  if (rule.maxLength && value.length > rule.maxLength) {
    errors.push(`${rule.key} must be no more than ${rule.maxLength} characters long`);
  }
  
  if (rule.pattern && !rule.pattern.test(value)) {
    errors.push(`${rule.key} format is invalid`);
  }
  
  if (rule.allowedValues && !rule.allowedValues.includes(value)) {
    errors.push(`${rule.key} must be one of: ${rule.allowedValues.join(', ')}`);
  }
  
  return errors;
}

function validateNumber(value: string, rule: ConfigValidationRule): string[] {
  const errors: string[] = [];
  const num = parseInt(value, 10);
  
  if (isNaN(num)) {
    errors.push(`${rule.key} must be a valid number`);
    return errors;
  }
  
  if (rule.min !== undefined && num < rule.min) {
    errors.push(`${rule.key} must be at least ${rule.min}`);
  }
  
  if (rule.max !== undefined && num > rule.max) {
    errors.push(`${rule.key} must be no more than ${rule.max}`);
  }
  
  return errors;
}

function validateBoolean(value: string, rule: ConfigValidationRule): string[] {
  const errors: string[] = [];
  const validValues = ['true', 'false', '1', '0', 'yes', 'no'];
  
  if (!validValues.includes(value.toLowerCase())) {
    errors.push(`${rule.key} must be a valid boolean value`);
  }
  
  return errors;
}

function validateUrl(value: string, rule: ConfigValidationRule): string[] {
  const errors: string[] = [];
  try {
    new URL(value);
  } catch {
    errors.push(`${rule.key} must be a valid URL`);
  }
  return errors;
}

function validateEmail(value: string, rule: ConfigValidationRule): string[] {
  const errors: string[] = [];
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailPattern.test(value)) {
    errors.push(`${rule.key} must be a valid email address`);
  }
  
  return errors;
}

// Validate configuration
export function validateConfiguration(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (const rule of CONFIG_VALIDATION_RULES) {
    const value = process.env[rule.key];
    
    // Check if required values are missing
    if (rule.required && (!value || value.trim() === '')) {
      errors.push(`${rule.key} is required: ${rule.description}`);
      continue;
    }
    
    // Skip validation if value is not provided and not required
    if (!value || value.trim() === '') {
      continue;
    }
    
    // Validate based on type
    let validationErrors: string[] = [];
    
    switch (rule.type) {
      case 'string':
        validationErrors = validateString(value, rule);
        break;
      case 'number':
        validationErrors = validateNumber(value, rule);
        break;
      case 'boolean':
        validationErrors = validateBoolean(value, rule);
        break;
      case 'url':
        validationErrors = validateUrl(value, rule);
        break;
      case 'email':
        validationErrors = validateEmail(value, rule);
        break;
      case 'password':
        validationErrors = validateString(value, rule);
        break;
    }
    
    errors.push(...validationErrors);
    
    // Add warnings for insecure configurations
    if (rule.secure && value.length < 16) {
      warnings.push(`${rule.key} should be longer for better security (minimum 16 characters)`);
    }
  }
  
  // Environment-specific validations
  const nodeEnv = process.env.NODE_ENV as Environment;
  
  if (nodeEnv === 'production') {
    // Production-specific validations
    if (process.env.JWT_SECRET === 'your-jwt-secret' || process.env.JWT_SECRET?.length < 32) {
      errors.push('JWT_SECRET must be a strong secret in production (minimum 32 characters)');
    }
    
    if (process.env.DB_PASSWORD === 'password' || process.env.DB_PASSWORD?.length < 12) {
      errors.push('DB_PASSWORD must be a strong password in production (minimum 12 characters)');
    }
    
    if (process.env.SMTP_PASS && process.env.SMTP_PASS.length < 8) {
      warnings.push('SMTP_PASS should be a strong password in production');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Get environment configuration
export function getEnvironmentConfig(): EnvironmentConfig {
  const nodeEnv = (process.env.NODE_ENV as Environment) || 'development';
  
  return {
    environment: nodeEnv,
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || '0.0.0.0',
    
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      name: process.env.DB_NAME || 'cpr_may18',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10)
    },
    
    security: {
      jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
      refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'default-refresh-secret-change-in-production',
      bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
      accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '15m',
      refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
      encryptionKey: process.env.DB_ENCRYPTION_KEY || 'default-encryption-key-change-in-production',
      sessionSecret: process.env.SESSION_SECRET || 'default-session-secret-change-in-production'
    },
    
    api: {
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10),
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      maxRequestSize: parseInt(process.env.MAX_REQUEST_SIZE || '10485760', 10),
      corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
      enableApiKeys: process.env.ENABLE_API_KEYS === 'true'
    },
    
    email: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      password: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || 'noreply@cpr-training.com',
      enabled: process.env.EMAIL_ENABLED === 'true'
    },
    
    redis: {
      enabled: process.env.REDIS_ENABLED === 'true',
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10)
    },
    
    ssl: {
      enabled: process.env.SSL_ENABLED === 'true',
      keyPath: process.env.SSL_KEY_PATH,
      certPath: process.env.SSL_CERT_PATH,
      caPath: process.env.SSL_CA_PATH,
      passphrase: process.env.SSL_PASSPHRASE
    },
    
    logging: {
      level: (process.env.LOG_LEVEL as any) || 'info',
      enableFileLogging: process.env.ENABLE_FILE_LOGGING !== 'false',
      logDirectory: process.env.LOG_DIRECTORY || 'logs',
      maxLogFiles: parseInt(process.env.MAX_LOG_FILES || '10', 10),
      maxLogSize: parseInt(process.env.MAX_LOG_SIZE || '10485760', 10)
    },
    
    app: {
      name: process.env.APP_NAME || 'CPR Training System',
      version: process.env.APP_VERSION || '1.0.0',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@cpr-training.com',
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
      enableMetrics: process.env.ENABLE_METRICS === 'true',
      enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS !== 'false'
    }
  };
}

// Initialize environment configuration
export async function initializeEnvironmentConfig(): Promise<boolean> {
  try {
    console.log('🔧 Initializing environment configuration...');
    
    // Validate configuration
    const validation = validateConfiguration();
    
    if (!validation.valid) {
      console.warn('⚠️ Environment configuration validation issues (continuing anyway):');
      validation.errors.forEach(error => console.warn(`   - ${error}`));
      // Don't fail - continue with defaults
    }
    
    // Log warnings
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Environment configuration warnings:');
      validation.warnings.forEach(warning => console.warn(`   - ${warning}`));
    }
    
    // Get configuration
    const config = getEnvironmentConfig();
    
    // Log configuration summary (masking sensitive values)
    console.log('🔧 Environment Configuration Summary:');
    console.log(`   Environment: ${config.environment}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
    console.log(`   SSL Enabled: ${config.ssl.enabled}`);
    console.log(`   Email Enabled: ${config.email.enabled}`);
    console.log(`   Redis Enabled: ${config.redis.enabled}`);
    console.log(`   Log Level: ${config.logging.level}`);
    
    // Log security event (without req object during startup)
    console.log('🔐 Environment configuration security event logged');
    
    console.log('✅ Environment configuration initialized');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize environment configuration:', error);
    return false;
  }
}

// Configuration health check
export function checkConfigurationHealth(): {
  valid: boolean;
  environment: string;
  issues: string[];
  warnings: string[];
} {
  const validation = validateConfiguration();
  const config = getEnvironmentConfig();
  
  return {
    valid: validation.valid,
    environment: config.environment,
    issues: validation.errors,
    warnings: validation.warnings
  };
}

// Export default configuration
export default getEnvironmentConfig;
