// ===============================================
// Centralized API Version Configuration
// ===============================================

export interface ApiVersion {
  major: number;
  minor: number;
  patch: number;
  status: 'development' | 'beta' | 'active' | 'deprecated' | 'sunset' | 'removed';
  releaseDate: string;
  deprecationDate?: string;
  sunsetDate?: string;
  removalDate?: string;
  features: string[];
  breakingChanges?: string[];
  migrationGuide?: string;
  supportLevel: 'full' | 'security-only' | 'none';
}

export interface VersionConfig {
  [key: string]: ApiVersion;
}

// Central version registry
export const API_VERSIONS: VersionConfig = {
  v1: {
    major: 1,
    minor: 0,
    patch: 0,
    status: 'active',
    releaseDate: '2024-01-01',
    features: [
      'authentication',
      'user-management',
      'course-management',
      'organization-management',
      'instructor-management',
      'billing-system',
      'reporting'
    ],
    supportLevel: 'full',
    migrationGuide: '/docs/migrations/v1-to-v2'
  },
  // Future versions will be added here
  // v2: {
  //   major: 2,
  //   minor: 0,
  //   patch: 0,
  //   status: 'development',
  //   releaseDate: '2024-06-01',
  //   features: [
  //     'authentication',
  //     'user-management',
  //     'course-management',
  //     'organization-management',
  //     'instructor-management',
  //     'billing-system',
  //     'reporting',
  //     'real-time-notifications',
  //     'advanced-analytics',
  //     'mobile-api'
  //   ],
  //   breakingChanges: [
  //     'User authentication now requires 2FA',
  //     'Course scheduling API restructured',
  //     'Billing endpoints moved to separate service'
  //   ],
  //   supportLevel: 'full',
  //   migrationGuide: '/docs/migrations/v1-to-v2'
  // }
};

// Version detection patterns
export const VERSION_PATTERNS = {
  // URL path patterns: /api/v1/users, /api/v2/users
  URL_PATH: /^\/api\/v(\d+)\//,
  
  // Header patterns: API-Version: v1, API-Version: 1.0.0
  HEADER_VERSION: /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/,
  
  // Accept header patterns: application/vnd.api+json;version=1
  ACCEPT_VERSION: /version=(\d+)/,
  
  // Query parameter patterns: ?version=v1, ?version=1.0.0
  QUERY_VERSION: /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/,
};

// Default configuration
export const VERSION_CONFIG = {
  // Default version when none specified
  DEFAULT_VERSION: 'v1',
  
  // Latest stable version
  LATEST_VERSION: 'v1',
  
  // Latest development version
  LATEST_DEV_VERSION: 'v1',
  
  // Supported version detection methods (in priority order)
  DETECTION_METHODS: ['url', 'header', 'accept', 'query'] as const,
  
  // Response headers to include
  RESPONSE_HEADERS: {
    API_VERSION: 'API-Version',
    SUPPORTED_VERSIONS: 'API-Supported-Versions',
    DEPRECATED_VERSIONS: 'API-Deprecated-Versions',
    LATEST_VERSION: 'API-Latest-Version',
    DEPRECATION: 'Deprecation',
    SUNSET: 'Sunset',
  },
  
  // Deprecation warning thresholds (in days)
  WARNING_THRESHOLDS: {
    DEPRECATION_NOTICE: 180,      // 6 months
    SUNSET_WARNING: 90,           // 3 months
    FINAL_WARNING: 30,            // 1 month
    IMMINENT_REMOVAL: 7,          // 1 week
  },
  
  // Feature flags
  FEATURES: {
    STRICT_VERSION_VALIDATION: true,
    DEPRECATION_WARNINGS: true,
    VERSION_ANALYTICS: true,
    CONTENT_NEGOTIATION: true,
    MIGRATION_HELPERS: true,
  }
};

/**
 * Get version information by version string
 */
export function getVersionInfo(version: string): ApiVersion | null {
  const normalizedVersion = normalizeVersionString(version);
  return API_VERSIONS[normalizedVersion] || null;
}

/**
 * Get all versions with specific status
 */
export function getVersionsByStatus(status: ApiVersion['status']): string[] {
  return Object.keys(API_VERSIONS).filter(
    version => API_VERSIONS[version].status === status
  );
}

/**
 * Get all supported versions (active + deprecated)
 */
export function getSupportedVersions(): string[] {
  return Object.keys(API_VERSIONS).filter(
    version => ['active', 'deprecated'].includes(API_VERSIONS[version].status)
  );
}

/**
 * Check if version is supported
 */
export function isVersionSupported(version: string): boolean {
  const versionInfo = getVersionInfo(version);
  return versionInfo ? ['active', 'deprecated'].includes(versionInfo.status) : false;
}

/**
 * Check if version is deprecated
 */
export function isVersionDeprecated(version: string): boolean {
  const versionInfo = getVersionInfo(version);
  return versionInfo ? versionInfo.status === 'deprecated' : false;
}

/**
 * Check if version is sunset (removal imminent)
 */
export function isVersionSunset(version: string): boolean {
  const versionInfo = getVersionInfo(version);
  return versionInfo ? versionInfo.status === 'sunset' : false;
}

/**
 * Get deprecation info for a version
 */
export function getDeprecationInfo(version: string) {
  const versionInfo = getVersionInfo(version);
  if (!versionInfo || !['deprecated', 'sunset'].includes(versionInfo.status)) {
    return null;
  }

  const now = new Date();
  const deprecationDate = versionInfo.deprecationDate ? new Date(versionInfo.deprecationDate) : null;
  const sunsetDate = versionInfo.sunsetDate ? new Date(versionInfo.sunsetDate) : null;
  const removalDate = versionInfo.removalDate ? new Date(versionInfo.removalDate) : null;

  let warningLevel: 'info' | 'warning' | 'critical' = 'info';
  let timeRemaining = '';
  let message = '';

  if (removalDate) {
    const daysUntilRemoval = Math.ceil((removalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilRemoval <= VERSION_CONFIG.WARNING_THRESHOLDS.IMMINENT_REMOVAL) {
      warningLevel = 'critical';
      timeRemaining = `${daysUntilRemoval} days until removal`;
      message = `API version ${version} will be removed in ${daysUntilRemoval} days. Immediate migration required.`;
    } else if (daysUntilRemoval <= VERSION_CONFIG.WARNING_THRESHOLDS.FINAL_WARNING) {
      warningLevel = 'critical';
      timeRemaining = `${daysUntilRemoval} days until removal`;
      message = `API version ${version} will be removed in ${daysUntilRemoval} days. Please migrate immediately.`;
    } else if (daysUntilRemoval <= VERSION_CONFIG.WARNING_THRESHOLDS.SUNSET_WARNING) {
      warningLevel = 'warning';
      timeRemaining = `${daysUntilRemoval} days until removal`;
      message = `API version ${version} is scheduled for removal in ${daysUntilRemoval} days. Please plan your migration.`;
    }
  } else if (sunsetDate) {
    const daysUntilSunset = Math.ceil((sunsetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    warningLevel = 'warning';
    timeRemaining = `${daysUntilSunset} days until sunset`;
    message = `API version ${version} will enter sunset phase in ${daysUntilSunset} days.`;
  } else if (deprecationDate) {
    warningLevel = 'info';
    message = `API version ${version} is deprecated. Please consider migrating to the latest version.`;
  }

  return {
    isDeprecated: true,
    status: versionInfo.status,
    level: warningLevel,
    message,
    timeRemaining,
    deprecationDate: versionInfo.deprecationDate,
    sunsetDate: versionInfo.sunsetDate,
    removalDate: versionInfo.removalDate,
    migrationGuide: versionInfo.migrationGuide || '/docs/migrations/',
    newVersion: VERSION_CONFIG.LATEST_VERSION,
  };
}

/**
 * Normalize version string to standard format
 */
export function normalizeVersionString(version: string): string {
  // Handle various version formats: v1, 1, 1.0, 1.0.0 -> v1
  const match = version.match(VERSION_PATTERNS.HEADER_VERSION);
  if (match) {
    const major = match[1];
    return `v${major}`;
  }
  
  // If already in v1 format, return as is
  if (version.startsWith('v') && /^v\d+$/.test(version)) {
    return version;
  }
  
  // Default fallback
  return VERSION_CONFIG.DEFAULT_VERSION;
}

/**
 * Extract version from URL path
 */
export function extractVersionFromPath(path: string): string | null {
  const match = path.match(VERSION_PATTERNS.URL_PATH);
  return match ? `v${match[1]}` : null;
}

/**
 * Extract version from header
 */
export function extractVersionFromHeader(headerValue: string): string | null {
  if (!headerValue) return null;
  const match = headerValue.match(VERSION_PATTERNS.HEADER_VERSION);
  return match ? `v${match[1]}` : null;
}

/**
 * Extract version from Accept header
 */
export function extractVersionFromAccept(acceptHeader: string): string | null {
  if (!acceptHeader) return null;
  const match = acceptHeader.match(VERSION_PATTERNS.ACCEPT_VERSION);
  return match ? `v${match[1]}` : null;
}

/**
 * Extract version from query parameter
 */
export function extractVersionFromQuery(queryValue: string): string | null {
  if (!queryValue) return null;
  const match = queryValue.match(VERSION_PATTERNS.QUERY_VERSION);
  return match ? `v${match[1]}` : null;
}

/**
 * Get version compatibility matrix
 */
export function getCompatibilityMatrix(): Record<string, string[]> {
  const matrix: Record<string, string[]> = {};
  
  Object.keys(API_VERSIONS).forEach(version => {
    const versionInfo = API_VERSIONS[version];
    // For now, assume each version is only compatible with itself
    // This can be extended for backward compatibility
    matrix[version] = [version];
  });
  
  return matrix;
}

/**
 * Generate version response headers
 */
export function generateVersionHeaders(currentVersion: string) {
  const supported = getSupportedVersions();
  const deprecated = getVersionsByStatus('deprecated');
  const latest = VERSION_CONFIG.LATEST_VERSION;
  const versionInfo = getVersionInfo(currentVersion);
  const deprecationInfo = getDeprecationInfo(currentVersion);

  const headers: Record<string, string> = {
    [VERSION_CONFIG.RESPONSE_HEADERS.API_VERSION]: currentVersion,
    [VERSION_CONFIG.RESPONSE_HEADERS.SUPPORTED_VERSIONS]: supported.join(','),
    [VERSION_CONFIG.RESPONSE_HEADERS.LATEST_VERSION]: latest,
  };

  if (deprecated.length > 0) {
    headers[VERSION_CONFIG.RESPONSE_HEADERS.DEPRECATED_VERSIONS] = deprecated.join(',');
  }

  if (deprecationInfo) {
    headers[VERSION_CONFIG.RESPONSE_HEADERS.DEPRECATION] = 'true';
    
    if (versionInfo?.sunsetDate) {
      headers[VERSION_CONFIG.RESPONSE_HEADERS.SUNSET] = new Date(versionInfo.sunsetDate).toUTCString();
    }
  }

  return headers;
}

export default {
  API_VERSIONS,
  VERSION_PATTERNS,
  VERSION_CONFIG,
  getVersionInfo,
  getVersionsByStatus,
  getSupportedVersions,
  isVersionSupported,
  isVersionDeprecated,
  isVersionSunset,
  getDeprecationInfo,
  normalizeVersionString,
  extractVersionFromPath,
  extractVersionFromHeader,
  extractVersionFromAccept,
  extractVersionFromQuery,
  getCompatibilityMatrix,
  generateVersionHeaders,
}; 