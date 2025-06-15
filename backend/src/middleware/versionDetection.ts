// ===============================================
// Enhanced API Version Detection Middleware
// ===============================================

import { Request, Response, NextFunction } from 'express';
import {
  VERSION_CONFIG,
  isVersionSupported,
  getDeprecationInfo,
  generateVersionHeaders,
  extractVersionFromPath,
  extractVersionFromHeader,
  extractVersionFromAccept,
  extractVersionFromQuery,
  normalizeVersionString,
} from '../config/versions';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      apiVersion: string;
      versionInfo: {
        detected: boolean;
        method: 'url' | 'header' | 'accept' | 'query' | 'default';
        original: string;
        normalized: string;
        isSupported: boolean;
        isDeprecated: boolean;
        deprecationInfo?: any;
      };
      deprecationWarning?: any;
      versionAnalytics?: any;
      endpointDeprecation?: any;
    }
  }
}

interface VersionDetectionOptions {
  strict?: boolean;              // Reject unsupported versions
  requireVersion?: boolean;      // Require explicit version
  logAnalytics?: boolean;        // Log version usage analytics
  enableDeprecationWarnings?: boolean; // Send deprecation warnings
}

/**
 * Enhanced version detection middleware
 */
export function versionDetectionMiddleware(options: VersionDetectionOptions = {}) {
  const {
    strict = VERSION_CONFIG.FEATURES.STRICT_VERSION_VALIDATION,
    requireVersion = false,
    logAnalytics = VERSION_CONFIG.FEATURES.VERSION_ANALYTICS,
    enableDeprecationWarnings = VERSION_CONFIG.FEATURES.DEPRECATION_WARNINGS,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const detectionResult = detectVersion(req);
      
      // Set version info on request
      req.apiVersion = detectionResult.normalized;
      req.versionInfo = detectionResult;

      // Validate version support
      if (strict && !detectionResult.isSupported) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'UNSUPPORTED_API_VERSION',
            message: `API version '${detectionResult.original}' is not supported`,
            details: {
              requestedVersion: detectionResult.original,
              supportedVersions: VERSION_CONFIG.LATEST_VERSION, // Could be expanded
              latestVersion: VERSION_CONFIG.LATEST_VERSION,
            },
          },
          meta: {
            timestamp: new Date().toISOString(),
            version: process.env.API_VERSION || '1.0.0',
          },
        });
      }

      // Check for required version
      if (requireVersion && !detectionResult.detected) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VERSION_REQUIRED',
            message: 'API version must be specified',
            details: {
              supportedMethods: VERSION_CONFIG.DETECTION_METHODS,
              examples: [
                'URL: /api/v1/endpoint',
                'Header: API-Version: v1',
                'Query: ?version=v1',
                'Accept: application/vnd.api+json;version=1',
              ],
            },
          },
          meta: {
            timestamp: new Date().toISOString(),
            version: process.env.API_VERSION || '1.0.0',
          },
        });
      }

      // Set version headers
      const versionHeaders = generateVersionHeaders(req.apiVersion);
      Object.entries(versionHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      // Handle deprecation warnings
      if (enableDeprecationWarnings && detectionResult.deprecationInfo) {
        const deprecation = detectionResult.deprecationInfo;
        
        // Set standard deprecation headers (RFC 8594)
        if (deprecation.isDeprecated) {
          res.setHeader('Deprecation', 'true');
          
          if (deprecation.sunsetDate) {
            res.setHeader('Sunset', new Date(deprecation.sunsetDate).toUTCString());
          }
        }

        // Add deprecation info to response (will be picked up by response builder)
        req.deprecationWarning = deprecation;
      }

      // Log analytics if enabled
      if (logAnalytics) {
        logVersionUsage(req, detectionResult);
      }

      next();
    } catch (error) {
      console.error('[VERSION DETECTION ERROR]', error);
      
      // Fall back to default version
      req.apiVersion = VERSION_CONFIG.DEFAULT_VERSION;
      req.versionInfo = {
        detected: false,
        method: 'default',
        original: 'unknown',
        normalized: VERSION_CONFIG.DEFAULT_VERSION,
        isSupported: true,
        isDeprecated: false,
      };

      next();
    }
  };
}

/**
 * Detect API version from request using multiple methods
 */
function detectVersion(req: Request) {
  let detectedVersion: string | null = null;
  let detectionMethod: 'url' | 'header' | 'accept' | 'query' | 'default' = 'default';
  let originalVersion = '';

  // Method 1: URL Path (highest priority)
  const pathVersion = extractVersionFromPath(req.path);
  if (pathVersion) {
    detectedVersion = pathVersion;
    detectionMethod = 'url';
    originalVersion = pathVersion;
  }

  // Method 2: API-Version Header
  if (!detectedVersion) {
    const headerVersion = extractVersionFromHeader(req.headers['api-version'] as string);
    if (headerVersion) {
      detectedVersion = headerVersion;
      detectionMethod = 'header';
      originalVersion = req.headers['api-version'] as string;
    }
  }

  // Method 3: Accept Header Content Negotiation
  if (!detectedVersion && VERSION_CONFIG.FEATURES.CONTENT_NEGOTIATION) {
    const acceptVersion = extractVersionFromAccept(req.headers.accept as string);
    if (acceptVersion) {
      detectedVersion = acceptVersion;
      detectionMethod = 'accept';
      originalVersion = req.headers.accept as string;
    }
  }

  // Method 4: Query Parameter (lowest priority)
  if (!detectedVersion) {
    const queryVersion = extractVersionFromQuery(req.query.version as string);
    if (queryVersion) {
      detectedVersion = queryVersion;
      detectionMethod = 'query';
      originalVersion = req.query.version as string;
    }
  }

  // Default version if none detected
  if (!detectedVersion) {
    detectedVersion = VERSION_CONFIG.DEFAULT_VERSION;
    originalVersion = 'none';
  }

  // Normalize version string
  const normalizedVersion = normalizeVersionString(detectedVersion);
  
  // Check support status
  const isSupported = isVersionSupported(normalizedVersion);
  const deprecationInfo = getDeprecationInfo(normalizedVersion);

  return {
    detected: detectionMethod !== 'default',
    method: detectionMethod,
    original: originalVersion,
    normalized: normalizedVersion,
    isSupported,
    isDeprecated: !!deprecationInfo,
    deprecationInfo,
  };
}

/**
 * Log version usage analytics
 */
function logVersionUsage(req: Request, detectionResult: any) {
  const analytics = {
    timestamp: new Date().toISOString(),
    version: detectionResult.normalized,
    detectionMethod: detectionResult.method,
    endpoint: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
    clientIp: req.ip || req.connection.remoteAddress,
    isDeprecated: detectionResult.isDeprecated,
    requestId: req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };

  // Log to console for now (can be extended to external analytics service)
  console.log('[VERSION ANALYTICS]', analytics);

  // Store in request for potential response inclusion
  req.versionAnalytics = analytics;
}

/**
 * Middleware to validate specific version requirements
 */
export function requireVersion(requiredVersion: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.apiVersion !== requiredVersion) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VERSION_MISMATCH',
          message: `This endpoint requires API version ${requiredVersion}`,
          details: {
            currentVersion: req.apiVersion,
            requiredVersion,
            endpoint: req.path,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: process.env.API_VERSION || '1.0.0',
          apiVersion: req.apiVersion,
        },
      });
    }
    next();
  };
}

/**
 * Middleware to check minimum version requirements
 */
export function requireMinimumVersion(minimumVersion: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const currentMajor = parseInt(req.apiVersion.replace('v', ''));
    const requiredMajor = parseInt(minimumVersion.replace('v', ''));

    if (currentMajor < requiredMajor) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VERSION_TOO_OLD',
          message: `This endpoint requires API version ${minimumVersion} or higher`,
          details: {
            currentVersion: req.apiVersion,
            minimumVersion,
            upgradeRequired: true,
            endpoint: req.path,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: process.env.API_VERSION || '1.0.0',
          apiVersion: req.apiVersion,
        },
      });
    }
    next();
  };
}

/**
 * Middleware to handle version-specific feature flags
 */
export function featureFlag(feature: string, availableInVersions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!availableInVersions.includes(req.apiVersion)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FEATURE_NOT_AVAILABLE',
          message: `Feature '${feature}' is not available in API version ${req.apiVersion}`,
          details: {
            feature,
            currentVersion: req.apiVersion,
            availableInVersions,
            latestVersion: VERSION_CONFIG.LATEST_VERSION,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: process.env.API_VERSION || '1.0.0',
          apiVersion: req.apiVersion,
        },
      });
    }
    next();
  };
}

/**
 * Middleware to handle deprecated endpoint warnings
 */
export function deprecatedEndpoint(deprecationInfo: {
  deprecatedInVersion: string;
  removalInVersion: string;
  alternative?: string;
  migrationGuide?: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Add deprecation warning to request for response inclusion
    req.endpointDeprecation = {
      isDeprecated: true,
      message: `Endpoint ${req.method} ${req.path} is deprecated`,
      ...deprecationInfo,
    };

    // Set deprecation headers
    res.setHeader('Deprecation', 'true');
    if (deprecationInfo.migrationGuide) {
      res.setHeader('Link', `<${deprecationInfo.migrationGuide}>; rel="migration-guide"`);
    }

    next();
  };
}

export default versionDetectionMiddleware; 