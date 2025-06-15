// ===============================================
// Enhanced API Response Builder with Versioning
// ===============================================

import { Request, Response } from 'express';
import { VERSION_CONFIG } from '../config/versions';

export interface VersionedApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    traceId?: string;
  };
  meta: {
    timestamp: string;
    version: string;
    apiVersion: string;
    requestId?: string;
    deprecation?: {
      isDeprecated: boolean;
      level?: 'info' | 'warning' | 'critical';
      message?: string;
      timeRemaining?: string;
      deprecationDate?: string;
      sunsetDate?: string;
      migrationGuide?: string;
      newVersion?: string;
    };
    endpoint?: {
      isDeprecated?: boolean;
      message?: string;
      alternative?: string;
      migrationGuide?: string;
    };
    analytics?: {
      requestId: string;
      detectionMethod: string;
      version: string;
    };
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export class VersionedApiResponseBuilder {
  /**
   * Build success response with version metadata
   */
  static success<T>(
    data: T,
    req: Request,
    meta?: Partial<VersionedApiResponse['meta']>
  ): VersionedApiResponse<T> {
    const response: VersionedApiResponse<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
        apiVersion: req.apiVersion || VERSION_CONFIG.DEFAULT_VERSION,
        requestId: req.headers['x-request-id'] as string || 
                  req.versionAnalytics?.requestId ||
                  `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...meta,
      },
    };

    // Add deprecation info if present
    if (req.deprecationWarning) {
      response.meta.deprecation = {
        isDeprecated: true,
        ...req.deprecationWarning,
      };
    }

    // Add endpoint deprecation info if present
    if (req.endpointDeprecation) {
      response.meta.endpoint = {
        isDeprecated: true,
        ...req.endpointDeprecation,
      };
    }

    // Add analytics info if present
    if (req.versionAnalytics) {
      response.meta.analytics = {
        requestId: req.versionAnalytics.requestId,
        detectionMethod: req.versionAnalytics.detectionMethod,
        version: req.versionAnalytics.version,
      };
    }

    return response;
  }

  /**
   * Build error response with version metadata
   */
  static error(
    code: string,
    message: string,
    req: Request,
    details?: any,
    statusCode?: number
  ): VersionedApiResponse {
    const response: VersionedApiResponse = {
      success: false,
      error: {
        code,
        message,
        details,
        traceId: req.headers['x-trace-id'] as string || 
                req.versionAnalytics?.requestId ||
                `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
        apiVersion: req.apiVersion || VERSION_CONFIG.DEFAULT_VERSION,
        requestId: req.headers['x-request-id'] as string || 
                  req.versionAnalytics?.requestId ||
                  `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
    };

    // Add deprecation info even for errors
    if (req.deprecationWarning) {
      response.meta.deprecation = {
        isDeprecated: true,
        ...req.deprecationWarning,
      };
    }

    // Add endpoint deprecation info if present
    if (req.endpointDeprecation) {
      response.meta.endpoint = {
        isDeprecated: true,
        ...req.endpointDeprecation,
      };
    }

    // Add analytics info if present
    if (req.versionAnalytics) {
      response.meta.analytics = {
        requestId: req.versionAnalytics.requestId,
        detectionMethod: req.versionAnalytics.detectionMethod,
        version: req.versionAnalytics.version,
      };
    }

    return response;
  }

  /**
   * Build paginated response with version metadata
   */
  static paginate<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    req: Request,
    meta?: Partial<VersionedApiResponse['meta']>
  ): VersionedApiResponse<T[]> {
    const response = this.success(data, req, meta);
    
    response.meta.pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return response;
  }

  /**
   * Send versioned response with appropriate headers
   */
  static send<T>(
    res: Response,
    response: VersionedApiResponse<T>,
    statusCode: number = 200
  ): Response {
    // Set version-specific headers if not already set
    const versionHeaders: { [key: string]: string } = {
      'Content-Type': 'application/json',
      'X-API-Version': response.meta.apiVersion,
    };

    // Add request ID if available
    if (response.meta.requestId) {
      versionHeaders['X-Request-ID'] = response.meta.requestId;
    }

    // Add deprecation headers if applicable
    if (response.meta.deprecation?.isDeprecated) {
      versionHeaders['Deprecation'] = 'true';
      
      if (response.meta.deprecation.sunsetDate) {
        versionHeaders['Sunset'] = new Date(response.meta.deprecation.sunsetDate).toUTCString();
      }
    }

    // Add endpoint deprecation headers
    if (response.meta.endpoint?.isDeprecated && response.meta.endpoint.migrationGuide) {
      versionHeaders['Link'] = `<${response.meta.endpoint.migrationGuide}>; rel="migration-guide"`;
    }

    // Set headers
    Object.entries(versionHeaders).forEach(([key, value]) => {
      if (value && !res.getHeader(key)) {
        res.setHeader(key, value);
      }
    });

    return res.status(statusCode).json(response);
  }

  /**
   * Convenience method for success response with send
   */
  static sendSuccess<T>(
    res: Response,
    data: T,
    req: Request,
    statusCode: number = 200,
    meta?: Partial<VersionedApiResponse['meta']>
  ): Response {
    const response = this.success(data, req, meta);
    return this.send(res, response, statusCode);
  }

  /**
   * Convenience method for error response with send
   */
  static sendError(
    res: Response,
    code: string,
    message: string,
    req: Request,
    statusCode: number = 400,
    details?: any
  ): Response {
    const response = this.error(code, message, req, details, statusCode);
    return this.send(res, response, statusCode);
  }

  /**
   * Convenience method for paginated response with send
   */
  static sendPaginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    req: Request,
    statusCode: number = 200,
    meta?: Partial<VersionedApiResponse['meta']>
  ): Response {
    const response = this.paginate(data, page, limit, total, req, meta);
    return this.send(res, response, statusCode);
  }

  /**
   * Handle version-specific response transformations
   */
  static transformResponseForVersion<T>(
    data: T,
    version: string,
    transformers?: Record<string, (data: T) => T>
  ): T {
    // Apply version-specific transformations if available
    if (transformers && transformers[version]) {
      return transformers[version](data);
    }
    
    // Default: return data as-is
    return data;
  }

  /**
   * Create version-specific error with migration guidance
   */
  static versionError(
    req: Request,
    error: {
      code: string;
      message: string;
      supportedVersions?: string[];
      migrationGuide?: string;
    }
  ): VersionedApiResponse {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: {
          currentVersion: req.apiVersion,
          supportedVersions: error.supportedVersions || [VERSION_CONFIG.LATEST_VERSION],
          migrationGuide: error.migrationGuide || '/docs/migrations/',
          latestVersion: VERSION_CONFIG.LATEST_VERSION,
        },
        traceId: req.versionAnalytics?.requestId ||
                `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
        apiVersion: req.apiVersion || VERSION_CONFIG.DEFAULT_VERSION,
        requestId: req.versionAnalytics?.requestId ||
                  `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
    };
  }

  /**
   * Create deprecation-aware response
   */
  static deprecationAware<T>(
    data: T,
    req: Request,
    deprecationInfo: {
      message: string;
      migrationGuide: string;
      newVersion: string;
      timeRemaining?: string;
    }
  ): VersionedApiResponse<T> {
    const response = this.success(data, req);
    
    response.meta.deprecation = {
      isDeprecated: true,
      level: 'warning',
      ...deprecationInfo,
    };

    return response;
  }

  /**
   * Get response format based on API version
   */
  static getResponseFormat(version: string): 'v1' | 'v2' | 'latest' {
    // This can be extended for version-specific response formats
    switch (version) {
      case 'v1':
        return 'v1';
      case 'v2':
        return 'v2';
      default:
        return 'latest';
    }
  }

  /**
   * Validate response data for version compatibility
   */
  static validateForVersion<T>(
    data: T,
    version: string,
    validators?: Record<string, (data: T) => boolean>
  ): boolean {
    if (validators && validators[version]) {
      return validators[version](data);
    }
    
    // Default validation: always pass
    return true;
  }
}

export default VersionedApiResponseBuilder; 