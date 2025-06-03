import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request) => boolean;
  varyBy?: string[]; // Headers/params to vary cache by
}

/**
 * Middleware to cache API responses in Redis
 */
export const cacheMiddleware = (options: CacheOptions = {}) => {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator,
    skipCache,
    varyBy = []
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if specified condition is met
    if (skipCache && skipCache(req)) {
      return next();
    }

    // Generate cache key
    let cacheKey: string;
    if (keyGenerator) {
      cacheKey = keyGenerator(req);
    } else {
      // Default key generation
      const baseKey = `api:${req.originalUrl}`;
      const varyParts = varyBy.map(header => {
        const value = req.headers[header.toLowerCase()] || req.params[header] || req.query[header];
        return `${header}:${value}`;
      }).join('|');
      
      cacheKey = varyParts ? `${baseKey}|${varyParts}` : baseKey;
    }

    try {
      // Check if Redis is enabled
      if (process.env.REDIS_ENABLED === 'true') {
        // Try to get from cache
        const client = cacheService['redisManager']?.getClient();
        if (client) {
          const cached = await client.get(cacheKey);
          
          if (cached) {
            console.log(`🚀 [CACHE HIT] ${cacheKey}`);
            const cachedData = JSON.parse(cached);
            
            // Set cache headers
            res.setHeader('X-Cache', 'HIT');
            res.setHeader('X-Cache-Key', cacheKey);
            
            return res.json(cachedData);
          }
        }
      }

      // Cache miss - continue to route handler
      console.log(`📊 [CACHE MISS] ${cacheKey}`);
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);

      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = function(body: any) {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300 && process.env.REDIS_ENABLED === 'true') {
          // Cache in background (don't wait)
          cacheResponse(cacheKey, body, ttl).catch(error => {
            console.warn(`⚠️ [CACHE] Failed to cache ${cacheKey}:`, error);
          });
        }
        
        return originalJson(body);
      };

      next();

    } catch (error) {
      console.warn(`⚠️ [CACHE MIDDLEWARE] Error for ${cacheKey}:`, error);
      // Continue without caching on error
      next();
    }
  };
};

/**
 * Cache API response in background
 */
async function cacheResponse(key: string, data: any, ttl: number): Promise<void> {
  try {
    const client = cacheService['redisManager']?.getClient();
    if (client) {
      await client.setex(key, ttl, JSON.stringify(data));
      console.log(`✅ [CACHE SET] ${key} (TTL: ${ttl}s)`);
    }
  } catch (error) {
    console.warn(`⚠️ [CACHE] Failed to set ${key}:`, error);
  }
}

/**
 * Predefined cache configurations for common use cases
 */
export const cacheConfigs = {
  // Reference data - cache for 1 hour
  referenceData: (ttl = 3600) => cacheMiddleware({
    ttl,
    keyGenerator: (req) => `ref:${req.path}`,
  }),

  // User-specific data - cache for 15 minutes, vary by user
  userData: (ttl = 900) => cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const user = (req as any).user;
      return `user:${user?.id || 'anon'}:${req.path}`;
    },
    skipCache: (req) => !(req as any).user, // Skip if no user
  }),

  // Organization-specific data - cache for 30 minutes
  orgData: (ttl = 1800) => cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const user = (req as any).user;
      return `org:${user?.organizationId || 'none'}:${req.path}`;
    },
    varyBy: ['role'],
  }),

  // Dashboard data - cache for 5 minutes
  dashboard: (ttl = 300) => cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const user = (req as any).user;
      return `dashboard:${user?.role}:${user?.organizationId || 'none'}`;
    },
  }),

  // Public API - cache for 10 minutes
  publicApi: (ttl = 600) => cacheMiddleware({
    ttl,
    keyGenerator: (req) => `public:${req.path}:${JSON.stringify(req.query)}`,
  }),
};

/**
 * Middleware to invalidate cache on data modifications
 */
export const cacheInvalidation = (patterns: string[] | ((req: Request) => string[])) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original end function
    const originalEnd = res.end.bind(res);
    
    res.end = function(chunk?: any, encoding?: any) {
      // Only invalidate on successful modifications (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Get patterns to invalidate
        const invalidationPatterns = typeof patterns === 'function' 
          ? patterns(req) 
          : patterns;

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
  organizations: ['organizations', 'org:*', 'api:/api/v1/accounting/organizations*'],
  
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