// ===============================================
// Versioned API Routes Integration
// ===============================================

import { Router, Request, Response } from 'express';
import { versionDetectionMiddleware } from '../../middleware/versionDetection.js';
import VersionedApiResponseBuilder from '../../utils/apiResponseVersioned.js';
import MigrationUtils from '../../utils/migrationUtils.js';
import { VERSION_CONFIG } from '../../config/versions.js';

// Import existing route modules
import v1Routes from '../v1/index.js';

const router = Router();

// Apply version detection middleware to all routes
router.use(versionDetectionMiddleware({
  strict: false,              // Allow unsupported versions for now
  requireVersion: false,      // Don't require explicit version
  logAnalytics: true,         // Enable analytics
  enableDeprecationWarnings: true, // Enable deprecation warnings
}));

// Version information endpoint
router.get('/versions', (req: Request, res: Response) => {
  const versionInfo = {
    currentVersion: req.apiVersion,
    supportedVersions: ['v1'], // Will expand as more versions are added
    latestVersion: VERSION_CONFIG.LATEST_VERSION,
    deprecatedVersions: [],
    versionDetection: {
      method: req.versionInfo.method,
      detected: req.versionInfo.detected,
    },
  };

  return VersionedApiResponseBuilder.sendSuccess(
    res,
    versionInfo,
    req,
    200,
    {
      requestId: req.headers['x-request-id'] as string,
    }
  );
});

// Migration information endpoint
router.get('/migration/:fromVersion/:toVersion', (req: Request, res: Response) => {
  const { fromVersion, toVersion } = req.params;
  
  try {
    const migrationReport = MigrationUtils.generateMigrationReport(fromVersion, toVersion);
    const compatibility = MigrationUtils.validateClientCompatibility(fromVersion, toVersion);
    
    const migrationInfo = {
      ...migrationReport,
      compatibility,
      canAutoMigrate: MigrationUtils.canAutoMigrate(fromVersion, toVersion),
    };

    return VersionedApiResponseBuilder.sendSuccess(
      res,
      migrationInfo,
      req,
      200
    );
  } catch (error: any) {
    return VersionedApiResponseBuilder.sendError(
      res,
      'MIGRATION_INFO_ERROR',
      'Failed to generate migration information',
      req,
      500,
      { error: error.message }
    );
  }
});

// Health check with version info
router.get('/health', (req: Request, res: Response) => {
  const healthInfo = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || '1.0.0',
    apiVersion: req.apiVersion,
    services: {
      database: 'connected',
      redis: 'optional',
      external: 'healthy',
    },
  };

  return VersionedApiResponseBuilder.sendSuccess(
    res,
    healthInfo,
    req,
    200
  );
});

// Route version-specific implementations
router.use('/v1', v1Routes);

// Future version routes would be added here:
// router.use('/v2', v2Routes);

// Default route for unversioned requests (redirect to latest)
router.use('/', (req: Request, res: Response, next) => {
  // If this is already a versioned request, skip
  if (req.path.startsWith('/v')) {
    return next();
  }

  // For unversioned requests, provide guidance
  const guidance = {
    message: 'API version not specified',
    recommendation: 'Please specify API version in your requests',
    methods: [
      'URL: /api/v1/endpoint',
      'Header: API-Version: v1',
      'Query: ?version=v1',
    ],
    defaultVersion: VERSION_CONFIG.DEFAULT_VERSION,
    latestVersion: VERSION_CONFIG.LATEST_VERSION,
    documentation: '/docs/api/versioning',
  };

  return VersionedApiResponseBuilder.sendSuccess(
    res,
    guidance,
    req,
    200
  );
});

// 404 handler with version-aware error
router.use('*', (req: Request, res: Response) => {
  const versionContext = {
    requestedPath: req.originalUrl,
    apiVersion: req.apiVersion,
    method: req.method,
    availableVersions: ['v1'],
    suggestion: `Check if the endpoint exists in API version ${req.apiVersion}`,
  };

  return VersionedApiResponseBuilder.sendError(
    res,
    'ENDPOINT_NOT_FOUND',
    `Endpoint not found: ${req.method} ${req.originalUrl}`,
    req,
    404,
    versionContext
  );
});

export default router; 