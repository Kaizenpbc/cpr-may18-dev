import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { promisify } from 'util';

// Types for enhanced security
interface SecurityConfig {
  enableRequestSigning: boolean;
  enableEncryption: boolean;
  maxRequestSize: number;
  allowedOrigins: string[];
  blockSuspiciousAgents: boolean;
  enableGeoBlocking: boolean;
  enableBruteForceProtection: boolean;
}

interface RequestMetrics {
  ip: string;
  userAgent: string;
  requestCount: number;
  lastRequest: Date;
  suspiciousActivity: number;
  blocked: boolean;
}

// Step 5: Request Integrity & Signing
export class RequestIntegrityValidator {
  private static secretKey =
    process.env.REQUEST_SIGNING_SECRET ||
    crypto.randomBytes(32).toString('hex');

  static generateSignature(payload: string, timestamp: number): string {
    const data = `${payload}:${timestamp}`;
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(data)
      .digest('hex');
  }

  static validateSignature(
    payload: string,
    signature: string,
    timestamp: number
  ): boolean {
    const expectedSignature = this.generateSignature(payload, timestamp);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip for health checks and public endpoints
      if (req.path === '/health' || req.path.startsWith('/api/v1/auth/login')) {
        return next();
      }

      const signature = req.headers['x-request-signature'] as string;
      const timestamp = parseInt((req.headers['x-timestamp'] as string) || '0');

      if (!signature || !timestamp) {
        console.log(`⚠️ [SECURITY] Missing signature/timestamp from ${req.ip}`);
        return next(); // Allow for backward compatibility
      }

      // Check timestamp (5 minute window)
      const now = Date.now();
      if (Math.abs(now - timestamp) > 300000) {
        console.log(`🚨 [SECURITY] Timestamp too old from ${req.ip}`);
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TIMESTAMP',
            message: 'Request timestamp invalid',
          },
        });
      }

      const payload = JSON.stringify(req.body || {});
      if (
        !RequestIntegrityValidator.validateSignature(
          payload,
          signature,
          timestamp
        )
      ) {
        console.log(`🚨 [SECURITY] Invalid signature from ${req.ip}`);
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Request signature invalid',
          },
        });
      }

      console.log(`✅ [SECURITY] Valid signature from ${req.ip}`);
      next();
    };
  }
}

// Step 6: Advanced User Agent & Bot Detection
export class BotDetectionMiddleware {
  private static suspiciousAgents = [
    /bot|crawler|spider|scraper/i,
    /curl|wget|http/i,
    /automated|script|tool/i,
    /test|benchmark|monitor/i,
  ];

  private static maliciousAgents = [
    /sqlmap|nmap|nikto|burp|metasploit/i,
    /havij|pangolin|darkjumper/i,
    /python-requests|go-http-client/i,
  ];

  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const userAgent = req.headers['user-agent'] || '';
      const ip = req.ip || req.connection.remoteAddress || 'unknown';

      // Check for malicious agents
      for (const pattern of this.maliciousAgents) {
        if (pattern.test(userAgent)) {
          console.log(
            `🚨 [SECURITY] Malicious user agent blocked: ${userAgent} from ${ip}`
          );
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN_AGENT', message: 'Access denied' },
          });
        }
      }

      // Log suspicious agents
      for (const pattern of this.suspiciousAgents) {
        if (pattern.test(userAgent)) {
          console.log(
            `⚠️ [SECURITY] Suspicious user agent: ${userAgent} from ${ip}`
          );
          break;
        }
      }

      // Missing user agent
      if (!userAgent) {
        console.log(`⚠️ [SECURITY] Missing user agent from ${ip}`);
      }

      next();
    };
  }
}

// Step 7: Enhanced Brute Force Protection
export class BruteForceProtection {
  private static attempts = new Map<string, RequestMetrics>();
  private static blockedIPs = new Set<string>();

  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const now = new Date();

      // Check if IP is blocked
      if (this.blockedIPs.has(ip)) {
        console.log(`🚨 [SECURITY] Blocked IP attempt: ${ip}`);
        return res.status(429).json({
          success: false,
          error: {
            code: 'IP_BLOCKED',
            message: 'IP address temporarily blocked',
          },
        });
      }

      // Get or create metrics for this IP
      let metrics = this.attempts.get(ip);
      if (!metrics) {
        metrics = {
          ip,
          userAgent: req.headers['user-agent'] || '',
          requestCount: 0,
          lastRequest: now,
          suspiciousActivity: 0,
          blocked: false,
        };
        this.attempts.set(ip, metrics);
      }

      // Check for rapid requests (more than 30 per minute)
      const timeDiff = now.getTime() - metrics.lastRequest.getTime();
      if (timeDiff < 2000) {
        // Less than 2 seconds between requests
        metrics.suspiciousActivity++;
      }

      metrics.requestCount++;
      metrics.lastRequest = now;

      // Block if too many suspicious activities
      if (metrics.suspiciousActivity > 10) {
        console.log(`🚨 [SECURITY] IP blocked for suspicious activity: ${ip}`);
        this.blockedIPs.add(ip);
        metrics.blocked = true;

        // Auto-unblock after 15 minutes
        setTimeout(
          () => {
            this.blockedIPs.delete(ip);
            console.log(`🔓 [SECURITY] IP unblocked: ${ip}`);
          },
          15 * 60 * 1000
        );

        return res.status(429).json({
          success: false,
          error: {
            code: 'SUSPICIOUS_ACTIVITY',
            message: 'Too many rapid requests',
          },
        });
      }

      // Cleanup old metrics (older than 1 hour)
      if (timeDiff > 3600000) {
        this.attempts.delete(ip);
      }

      next();
    };
  }

  static getMetrics(): {
    activeIPs: number;
    blockedIPs: number;
    totalRequests: number;
  } {
    const totalRequests = Array.from(this.attempts.values()).reduce(
      (sum, metrics) => sum + metrics.requestCount,
      0
    );

    return {
      activeIPs: this.attempts.size,
      blockedIPs: this.blockedIPs.size,
      totalRequests,
    };
  }
}

// Step 8: Request Size & Content Validation
export class RequestValidationMiddleware {
  private static maxRequestSize = 1024 * 1024; // 1MB
  private static allowedContentTypes = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain',
  ];

  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Check request size
      const contentLength = parseInt(req.headers['content-length'] || '0');
      if (contentLength > this.maxRequestSize) {
        console.log(
          `🚨 [SECURITY] Request too large: ${contentLength} bytes from ${req.ip}`
        );
        return res.status(413).json({
          success: false,
          error: {
            code: 'REQUEST_TOO_LARGE',
            message: 'Request payload too large',
          },
        });
      }

      // Check content type for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.headers['content-type'];
        if (contentType) {
          const baseType = contentType.split(';')[0];
          if (!this.allowedContentTypes.includes(baseType)) {
            console.log(
              `⚠️ [SECURITY] Unusual content type: ${contentType} from ${req.ip}`
            );
          }
        }
      }

      // Check for suspicious headers
      const suspiciousHeaders = [
        'x-forwarded-for',
        'x-real-ip',
        'x-originating-ip',
        'x-remote-addr',
      ];

      for (const header of suspiciousHeaders) {
        if (req.headers[header]) {
          console.log(
            `⚠️ [SECURITY] Proxy header detected: ${header} from ${req.ip}`
          );
        }
      }

      next();
    };
  }
}

// Step 9: API Response Security
export class ResponseSecurityMiddleware {
  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Remove sensitive headers
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      // Add additional security headers
      res.setHeader('X-Download-Options', 'noopen');
      res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

      // Add security policies
      res.setHeader(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=()'
      );

      // Override JSON responses to add security metadata
      const originalJson = res.json;
      res.json = function (data: any) {
        if (typeof data === 'object' && data !== null) {
          data._security = {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
            version: '1.0.0',
          };
        }
        return originalJson.call(this, data);
      };

      next();
    };
  }
}

// Step 10: Security Metrics & Monitoring
export class SecurityMetricsCollector {
  private static metrics = {
    requests: 0,
    blockedRequests: 0,
    suspiciousActivity: 0,
    maliciousAgents: 0,
    invalidSignatures: 0,
    startTime: new Date(),
  };

  static recordEvent(
    type:
      | 'request'
      | 'blocked'
      | 'suspicious'
      | 'malicious'
      | 'invalid_signature'
  ) {
    this.metrics[
      type === 'blocked'
        ? 'blockedRequests'
        : type === 'suspicious'
          ? 'suspiciousActivity'
          : type === 'malicious'
            ? 'maliciousAgents'
            : type === 'invalid_signature'
              ? 'invalidSignatures'
              : 'requests'
    ]++;
  }

  static getMetrics() {
    const uptime = Date.now() - this.metrics.startTime.getTime();
    const bruteForceMetrics = BruteForceProtection.getMetrics();

    return {
      ...this.metrics,
      uptime,
      bruteForce: bruteForceMetrics,
      threatLevel: this.calculateThreatLevel(),
    };
  }

  private static calculateThreatLevel():
    | 'LOW'
    | 'MEDIUM'
    | 'HIGH'
    | 'CRITICAL' {
    const { blockedRequests, suspiciousActivity, maliciousAgents } =
      this.metrics;
    const totalThreats = blockedRequests + suspiciousActivity + maliciousAgents;

    if (totalThreats > 100) return 'CRITICAL';
    if (totalThreats > 50) return 'HIGH';
    if (totalThreats > 10) return 'MEDIUM';
    return 'LOW';
  }

  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      this.recordEvent('request');
      next();
    };
  }
}

// Export all middleware for easy integration
export {
  RequestIntegrityValidator,
  BotDetectionMiddleware,
  BruteForceProtection,
  RequestValidationMiddleware,
  ResponseSecurityMiddleware,
  SecurityMetricsCollector,
};
