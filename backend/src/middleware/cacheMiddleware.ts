import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';
import { redisManager } from '../config/redis';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request) => boolean;
  varyBy?: string[]; // Headers/params to vary cache by
  key?: string;
  skipIf?: (req: Request) => boolean;
}

/**
 * Middleware to cache API responses in Redis
 */
export function cacheMiddleware(options: CacheOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if Redis is disabled
    if (!redisManager.isReady()) {
      return next();
    }

    // Skip caching if skipIf condition is met
    if (options.skipIf && options.skipIf(req)) {
      return next();
    }

    // Generate cache key
    const cacheKey = options.key || `cache:${req.originalUrl}`;

    try {
      // Check cache
      const cachedData = await redisManager.getClient().get(cacheKey);

      if (cachedData) {
        // Cache hit
        const data = JSON.parse(cachedData);
        res.setHeader('X-Cache', 'HIT');
        return res.json(data);
      }

      // Cache miss
      res.setHeader('X-Cache', 'MISS');

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = function(data: any) {
        // Cache successful responses
        if (res.statusCode === 200) {
          const ttl = options.ttl || 3600; // Default 1 hour
          redisManager.getClient().setEx(cacheKey, ttl, JSON.stringify(data));
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('❌ [CACHE] Error in cache middleware:', error);
      next();
    }
  };
}

/**
 * Cache API response in background
 */
export async function cacheResponse(key: string, data: any, ttl: number = 3600): Promise<void> {
  if (!redisManager.isReady()) {
    return;
  }

  try {
    await redisManager.getClient().setEx(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error('❌ [CACHE] Error caching response:', error);
  }
}

/**
 * Predefined cache configurations for common use cases
 */
export const cacheConfigs = {
  // Reference data - cache for 1 hour
  referenceData: (ttl = 3600) =>
    cacheMiddleware({
      ttl,
      keyGenerator: req => `ref:${req.path}`,
    }),

  // User-specific data - cache for 15 minutes, vary by user
  userData: (ttl = 900) =>
    cacheMiddleware({
      ttl,
      keyGenerator: req => {
        const user = (req as any).user;
        return `user:${user?.id || 'anon'}:${req.path}`;
      },
      skipCache: req => !(req as any).user, // Skip if no user
    }),

  // Organization-specific data - cache for 30 minutes
  orgData: (ttl = 1800) =>
    cacheMiddleware({
      ttl,
      keyGenerator: req => {
        const user = (req as any).user;
        return `org:${user?.organizationId || 'none'}:${req.path}`;
      },
      varyBy: ['role'],
    }),

  // Dashboard data - cache for 5 minutes
  dashboard: (ttl = 300) =>
    cacheMiddleware({
      ttl,
      keyGenerator: req => {
        const user = (req as any).user;
        return `dashboard:${user?.role}:${user?.organizationId || 'none'}`;
      },
    }),

  // Public API - cache for 10 minutes
  publicApi: (ttl = 600) =>
    cacheMiddleware({
      ttl,
      keyGenerator: req => `public:${req.path}:${JSON.stringify(req.query)}`,
    }),
};

/**
 * Middleware to invalidate cache on data modifications
 */
export const cacheInvalidation = (
  patterns: string[] | ((req: Request) => string[])
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original end function
    const originalEnd = res.end.bind(res);

    res.end = function (chunk?: any, encoding?: any) {
      // Only invalidate on successful modifications (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Get patterns to invalidate
        const invalidationPatterns =
          typeof patterns === 'function' ? patterns(req) : patterns;

        // Invalidate in background
        Promise.all(
          invalidationPatterns.map(pattern => cacheService.invalidate(pattern))
        ).catch(error => {
          console.warn('⚠️ [CACHE INVALIDATION] Error:', error);
        });
      }

      return originalEnd(chunk, encoding);
    };

    next();
  };
};

/**
 * Predefined cache invalidation patterns
 */
export const invalidationPatterns = {
  // Invalidate all course types cache
  courseTypes: ['course_types', 'api:/api/v1/course-types*'],

  // Invalidate all organizations cache
  organizations: [
    'organizations',
    'org:*',
    'api:/api/v1/accounting/organizations*',
  ],

  // Invalidate user-specific cache
  userData: (userId: string) => [`user:${userId}:*`, `user:username:*`],

  // Invalidate organization-specific cache
  orgData: (orgId: string) => [`org:${orgId}:*`, `organization:${orgId}`],

  // Invalidate dashboard cache
  dashboard: ['dashboard:*'],

  // Invalidate course pricing cache
  coursePricing: (orgId?: string) =>
    orgId ? [`course_pricing:${orgId}`] : ['course_pricing:*'],
};

export default cacheMiddleware;
