import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { pool } from '../config/database.js';
import { logSecurityEvent, AuditEventSeverity } from './auditLogger.js';

// API Key Management
export interface ApiKey {
  id: string;
  key: string;
  name: string;
  organizationId?: number;
  permissions: string[];
  rateLimit: {
    requests: number;
    window: number; // in minutes
  };
  isActive: boolean;
  expiresAt?: Date;
  lastUsed?: Date;
  createdAt: Date;
}

// Request fingerprinting
export interface RequestFingerprint {
  ip: string;
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  connection: string;
  hash: string;
}

// API Security Configuration
export interface ApiSecurityConfig {
  maxRequestSize: number; // in bytes
  maxRequestsPerMinute: number;
  suspiciousActivityThreshold: number;
  enableRequestFingerprinting: boolean;
  enableApiKeyAuth: boolean;
  enableCorsValidation: boolean;
  allowedOrigins: string[];
  blockedUserAgents: string[];
  blockedIpRanges: string[];
}

const DEFAULT_API_SECURITY_CONFIG: ApiSecurityConfig = {
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  maxRequestsPerMinute: 100,
  suspiciousActivityThreshold: 10,
  enableRequestFingerprinting: true,
  enableApiKeyAuth: true,
  enableCorsValidation: true,
  allowedOrigins: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://192.168.2.105:5173',
    'http://192.168.2.105:5174',
    'https://gta-cpr-course-admin.netlify.app',
    'https://yourdomain.com'
  ],
  blockedUserAgents: [
    'curl',
    'wget',
    'python-requests',
    'bot',
    'crawler',
    'spider'
  ],
  blockedIpRanges: [
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16'
  ]
};

// Request tracking for rate limiting and fingerprinting
const requestTracker = new Map<string, {
  count: number;
  lastRequest: Date;
  fingerprints: Set<string>;
}>();

// API Key validation
export async function validateApiKey(apiKey: string): Promise<ApiKey | null> {
  try {
    const result = await pool.query(
      `SELECT * FROM api_keys WHERE key = $1 AND is_active = TRUE 
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [apiKey]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const key = result.rows[0];

    // Update last used timestamp
    await pool.query(
      'UPDATE api_keys SET last_used = NOW() WHERE id = $1',
      [key.id]
    );

    return {
      id: key.id,
      key: key.key,
      name: key.name,
      organizationId: key.organization_id,
      permissions: key.permissions || [],
      rateLimit: key.rate_limit || { requests: 100, window: 60 },
      isActive: key.is_active,
      expiresAt: key.expires_at,
      lastUsed: new Date(),
      createdAt: key.created_at
    };
  } catch (error) {
    console.error('API key validation error:', error);
    return null;
  }
}

// Generate request fingerprint
export function generateRequestFingerprint(req: Request): RequestFingerprint {
  const fingerprint = {
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    acceptLanguage: req.get('Accept-Language') || 'unknown',
    acceptEncoding: req.get('Accept-Encoding') || 'unknown',
    connection: req.get('Connection') || 'unknown',
    hash: ''
  };

  // Create hash from fingerprint data
  const hashInput = `${fingerprint.ip}-${fingerprint.userAgent}-${fingerprint.acceptLanguage}`;
  fingerprint.hash = crypto.createHash('sha256').update(hashInput).digest('hex');

  return fingerprint;
}

// Check if request is suspicious
export function isSuspiciousRequest(req: Request, fingerprint: RequestFingerprint): boolean {
  const config = DEFAULT_API_SECURITY_CONFIG;

  // Allow health check endpoints to bypass user agent checks
  if (req.url.startsWith('/api/v1/health')) {
    return false;
  }

  // In development mode, allow curl, wget, and other CLI tools for all endpoints
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
    const devTools = ['curl', 'wget', 'powershell', 'insomnia', 'postman', 'httpie'];
    if (devTools.some(tool => fingerprint.userAgent.toLowerCase().includes(tool))) {
      return false;
    }
  }

  // Allow curl and other common tools for health checks
  if (req.url.includes('/health') && (
    fingerprint.userAgent.toLowerCase().includes('curl') ||
    fingerprint.userAgent.toLowerCase().includes('powershell') ||
    fingerprint.userAgent.toLowerCase().includes('wget')
  )) {
    return false;
  }

  // Check blocked user agents (only in production)
  if (process.env.NODE_ENV === 'production' && config.blockedUserAgents.some(blocked =>
    fingerprint.userAgent.toLowerCase().includes(blocked.toLowerCase())
  )) {
    return true;
  }

  // Check for common attack patterns
  const suspiciousPatterns = [
    /\.\.\//, // Directory traversal
    /<script/i, // XSS attempts
    /union\s+select/i, // SQL injection
    /javascript:/i, // JavaScript injection
    /eval\(/i, // Code injection
    /exec\(/i, // Command injection
  ];

  const url = req.url.toLowerCase();
  const body = JSON.stringify(req.body || {}).toLowerCase();

  return suspiciousPatterns.some(pattern =>
    pattern.test(url) || pattern.test(body)
  );
}

// Rate limiting per IP/fingerprint
export function checkRateLimit(identifier: string, limit: number = 100): boolean {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60 * 1000); // 1 minute window

  if (!requestTracker.has(identifier)) {
    requestTracker.set(identifier, {
      count: 1,
      lastRequest: now,
      fingerprints: new Set()
    });
    return true;
  }

  const tracker = requestTracker.get(identifier)!;

  // Reset counter if outside window
  if (tracker.lastRequest < windowStart) {
    tracker.count = 1;
    tracker.lastRequest = now;
    return true;
  }

  // Check if limit exceeded
  if (tracker.count >= limit) {
    return false;
  }

  tracker.count++;
  tracker.lastRequest = now;
  return true;
}

// CORS validation
export function validateCors(req: Request): boolean {
  const config = DEFAULT_API_SECURITY_CONFIG;
  const origin = req.get('Origin');

  if (!origin) {
    return true; // Allow requests without origin (e.g., mobile apps)
  }

  return config.allowedOrigins.includes(origin);
}

// Main API security middleware
export const apiSecurity = (config: Partial<ApiSecurityConfig> = {}) => {
  const securityConfig = { ...DEFAULT_API_SECURITY_CONFIG, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Request size limiting
      const contentLength = parseInt(req.get('Content-Length') || '0');
      if (contentLength > securityConfig.maxRequestSize) {
        await logSecurityEvent(
          'REQUEST_SIZE_EXCEEDED',
          AuditEventSeverity.MEDIUM,
          req,
          { contentLength, maxSize: securityConfig.maxRequestSize }
        );
        return res.status(413).json({
          success: false,
          error: {
            code: 'REQUEST_TOO_LARGE',
            message: 'Request size exceeds maximum allowed'
          }
        });
      }

      // 2. Generate request fingerprint
      const fingerprint = generateRequestFingerprint(req);

      // 3. Check for suspicious activity
      if (securityConfig.enableRequestFingerprinting && isSuspiciousRequest(req, fingerprint)) {
        await logSecurityEvent(
          'SUSPICIOUS_REQUEST_DETECTED',
          AuditEventSeverity.HIGH,
          req,
          { fingerprint: fingerprint.hash, url: req.url }
        );
        return res.status(400).json({
          success: false,
          error: {
            code: 'SUSPICIOUS_REQUEST',
            message: 'Request appears to be malicious'
          }
        });
      }

      // 4. Rate limiting
      const rateLimitKey = `${fingerprint.ip}-${fingerprint.hash}`;
      if (!checkRateLimit(rateLimitKey, securityConfig.maxRequestsPerMinute)) {
        await logSecurityEvent(
          'RATE_LIMIT_EXCEEDED',
          AuditEventSeverity.MEDIUM,
          req,
          { ip: fingerprint.ip, limit: securityConfig.maxRequestsPerMinute }
        );
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests from this IP'
          }
        });
      }

      // 5. CORS validation
      if (securityConfig.enableCorsValidation && !validateCors(req)) {
        await logSecurityEvent(
          'CORS_VIOLATION',
          AuditEventSeverity.MEDIUM,
          req,
          { origin: req.get('Origin') }
        );
        return res.status(403).json({
          success: false,
          error: {
            code: 'CORS_VIOLATION',
            message: 'Origin not allowed'
          }
        });
      }

      // 6. API Key validation (if required)
      if (securityConfig.enableApiKeyAuth && req.path.startsWith('/api/v1/external/')) {
        const apiKey = req.get('X-API-Key') || req.get('Authorization')?.replace('Bearer ', '');

        if (!apiKey) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'API_KEY_REQUIRED',
              message: 'API key is required for external endpoints'
            }
          });
        }

        const validKey = await validateApiKey(apiKey);
        if (!validKey) {
          await logSecurityEvent(
            'INVALID_API_KEY',
            AuditEventSeverity.HIGH,
            req,
            { apiKey: apiKey.substring(0, 8) + '...' }
          );
          return res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_API_KEY',
              message: 'Invalid or expired API key'
            }
          });
        }

        // Add API key info to request
        req.apiKey = validKey;
      }

      // Add fingerprint to request for logging
      req.fingerprint = fingerprint;

      next();
    } catch (error) {
      console.error('API security middleware error:', error);
      await logSecurityEvent(
        'API_SECURITY_ERROR',
        AuditEventSeverity.HIGH,
        req,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      next();
    }
  };
};

// API Key management functions
export async function createApiKey(
  name: string,
  organizationId?: number,
  permissions: string[] = [],
  rateLimit: { requests: number; window: number } = { requests: 100, window: 60 },
  expiresAt?: Date
): Promise<ApiKey> {
  const key = crypto.randomBytes(32).toString('hex');

  const result = await pool.query(
    `INSERT INTO api_keys (key, name, organization_id, permissions, rate_limit, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [key, name, organizationId, permissions, rateLimit, expiresAt]
  );

  return {
    id: result.rows[0].id,
    key: result.rows[0].key,
    name: result.rows[0].name,
    organizationId: result.rows[0].organization_id,
    permissions: result.rows[0].permissions,
    rateLimit: result.rows[0].rate_limit,
    isActive: result.rows[0].is_active,
    expiresAt: result.rows[0].expires_at,
    lastUsed: result.rows[0].last_used,
    createdAt: result.rows[0].created_at
  };
}

export async function revokeApiKey(keyId: string): Promise<boolean> {
  try {
    await pool.query(
      'UPDATE api_keys SET is_active = FALSE WHERE id = $1',
      [keyId]
    );
    return true;
  } catch (error) {
    console.error('Error revoking API key:', error);
    return false;
  }
}

// Initialize API security tables
export async function initializeApiSecurity(): Promise<void> {
  try {
    // Create API keys table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        key VARCHAR(64) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        organization_id INTEGER REFERENCES organizations(id),
        permissions TEXT[] DEFAULT '{}',
        rate_limit JSONB DEFAULT '{"requests": 100, "window": 60}',
        is_active BOOLEAN DEFAULT TRUE,
        expires_at TIMESTAMP,
        last_used TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key) WHERE is_active = TRUE
    `);

    console.log('✅ API security tables initialized');
  } catch (error) {
    console.error('❌ Failed to initialize API security tables:', error);
    throw error;
  }
}

// Cleanup old request tracking data
export function cleanupRequestTracking(): void {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

  for (const [key, tracker] of requestTracker.entries()) {
    if (tracker.lastRequest < cutoff) {
      requestTracker.delete(key);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupRequestTracking, 60 * 60 * 1000);
