import { pool } from '../config/database.js';
import { redisManager } from '../config/redis.js';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  useDatabase?: boolean; // Whether to use database as fallback
  forceRefresh?: boolean; // Force cache refresh
}

class CacheService {
  private static instance: CacheService;
  private readonly DEFAULT_TTL = 900; // 15 minutes
  private readonly isRedisEnabled: boolean;

  private constructor() {
    this.isRedisEnabled = false; // Force Redis disabled for debugging
    console.log('🔴 [CACHE] Redis caching is disabled');
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Generic cache method with Redis fallback
   */
  private async cache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const {
      ttl = this.DEFAULT_TTL,
      useDatabase = true,
      forceRefresh = false,
    } = options;

    // Skip cache lookup if Redis is disabled
    if (!this.isRedisEnabled) {
      console.log(`📊 [CACHE MISS] Fetching fresh data for ${key}`);
      return fetcher();
    }

    // If force refresh, skip cache lookup
    if (!forceRefresh) {
      try {
        const client = redisManager.getClient();
        const cached = await client.get(key);

        if (cached) {
          console.log(`🚀 [CACHE HIT] ${key}`);
          return JSON.parse(cached as string);
        }
      } catch (error) {
        console.warn(`⚠️ [CACHE] Failed to get ${key}:`, error);
      }
    }

    // Cache miss - fetch fresh data
    console.log(`📊 [CACHE MISS] Fetching fresh data for ${key}`);
    console.log(`[DEBUG] About to call fetcher for ${key}`);
    let data;
    try {
      data = await fetcher();
      console.log(`[DEBUG] Fetcher completed successfully for ${key}:`, data);
    } catch (error) {
      console.error(`[ERROR] Fetcher failed for ${key}:`, error);
      throw error;
    }

    // Store in cache if Redis is available
    if (this.isRedisEnabled && data) {
      try {
        const client = redisManager.getClient();
        await client.setEx(key, ttl, JSON.stringify(data));
        console.log(`✅ [CACHE SET] ${key} (TTL: ${ttl}s)`);
      } catch (error) {
        console.warn(`⚠️ [CACHE] Failed to set ${key}:`, error);
      }
    }

    return data;
  }

  /**
   * Cache course types (rarely change)
   */
  async getCourseTypes(forceRefresh = false): Promise<any[]> {
    return this.cache(
      'course_types',
      async () => {
        const result = await pool.query(
          'SELECT id, name, description, duration_minutes FROM class_types ORDER BY name'
        );
        return result.rows;
      },
      { ttl: 3600, forceRefresh } // 1 hour TTL
    );
  }

  /**
   * Cache organizations (semi-static)
   */
  async getOrganizations(forceRefresh = false): Promise<any[]> {
    return this.cache(
      'organizations',
      async () => {
        const result = await pool.query(
          'SELECT id, name, contact_email, contact_phone, address FROM organizations ORDER BY name'
        );
        return result.rows;
      },
      { ttl: 1800, forceRefresh } // 30 minutes TTL
    );
  }

  /**
   * Cache user data by ID
   */
  async getUser(userId: string | number, forceRefresh = false): Promise<any> {
    return this.cache(
      `user:${userId}`,
      async () => {
        const result = await pool.query(
          'SELECT id, username, email, role, organization_id, full_name, first_name, last_name FROM users WHERE id = $1',
          [userId]
        );
        return result.rows[0] || null;
      },
      { ttl: 900, forceRefresh } // 15 minutes TTL
    );
  }

  /**
   * Cache user data by username
   */
  async getUserByUsername(
    username: string,
    forceRefresh = false
  ): Promise<any> {
    return this.cache(
      `user:username:${username}`,
      async () => {
        const result = await pool.query(
          'SELECT id, username, email, role, organization_id, full_name, first_name, last_name, password_hash FROM users WHERE username = $1',
          [username]
        );
        return result.rows[0] || null;
      },
      { ttl: 900, forceRefresh } // 15 minutes TTL
    );
  }

  /**
   * Cache organization data by ID
   */
  async getOrganization(
    orgId: string | number,
    forceRefresh = false
  ): Promise<any> {
    return this.cache(
      `organization:${orgId}`,
      async () => {
        const result = await pool.query(
          'SELECT * FROM organizations WHERE id = $1',
          [orgId]
        );
        return result.rows[0] || null;
      },
      { ttl: 1800, forceRefresh } // 30 minutes TTL
    );
  }

  /**
   * Cache certifications (mostly read-only)
   */
  async getCertifications(forceRefresh = false): Promise<any[]> {
    return this.cache(
      'certifications',
      async () => {
        const result = await pool.query('SELECT * FROM certifications');
        return result.rows;
      },
      { ttl: 3600, forceRefresh } // 1 hour TTL
    );
  }

  /**
   * Cache course pricing for organization
   */
  async getCoursePricing(
    orgId: string | number,
    forceRefresh = false
  ): Promise<any[]> {
    return this.cache(
      `course_pricing:${orgId}`,
      async () => {
        const result = await pool.query(
          `
          SELECT 
            cp.id,
            cp.organization_id as "organizationId",
            cp.course_type_id as "classTypeId", 
            cp.price_per_student as "pricePerStudent",
            cp.is_active as "isActive",
            cp.created_at as "createdAt",
            cp.updated_at as "updatedAt",
            o.name as "organizationName",
            ct.name as "classTypeName"
          FROM course_pricing cp
          JOIN class_types ct ON cp.course_type_id = ct.id
          JOIN organizations o ON cp.organization_id = o.id
          WHERE cp.organization_id = $1 AND cp.is_active = true
          ORDER BY ct.name
        `,
          [orgId]
        );
        return result.rows;
      },
      { ttl: 1800, forceRefresh } // 30 minutes TTL
    );
  }

  /**
   * Cache all course pricing (for admin/accountant views)
   */
  async getAllCoursePricing(forceRefresh = false): Promise<any[]> {
    return this.cache(
      'course_pricing:all',
      async () => {
        const result = await pool.query(
          `
          SELECT 
            cp.id,
            cp.organization_id as "organizationId",
            cp.course_type_id as "classTypeId", 
            cp.price_per_student as "pricePerStudent",
            cp.is_active as "isActive",
            cp.created_at as "createdAt",
            cp.updated_at as "updatedAt",
            cp.effective_date as "effectiveDate",
            o.name as "organizationName",
            ct.name as "classTypeName",
            ct.description as "courseDescription"
          FROM course_pricing cp
          JOIN class_types ct ON cp.course_type_id = ct.id
          JOIN organizations o ON cp.organization_id = o.id
          WHERE cp.is_active = true
          ORDER BY o.name, ct.name
        `
        );
        return result.rows;
      },
      { ttl: 1800, forceRefresh } // 30 minutes TTL
    );
  }

  /**
   * Cache dashboard data (computed data)
   */
  async getDashboardStats(
    role: string,
    userId?: string | number,
    forceRefresh = false
  ): Promise<any> {
    const cacheKey = userId ? `dashboard:${role}:${userId}` : `dashboard:${role}`;

    return this.cache(
      cacheKey,
      async () => {
        console.log(`[DEBUG] getDashboardStats called with role: ${role}, userId: ${userId}`);
        
        if (role === 'instructor' && userId) {
          // Instructor-specific stats from 'course_requests' table (not 'classes')
          console.log(`[DEBUG] Fetching instructor stats for userId: ${userId}`);
          
          const totalRes = await pool.query(
            `SELECT COUNT(*) as count FROM course_requests WHERE instructor_id = $1`,
            [userId]
          );
          console.log(`[DEBUG] Total query result:`, totalRes.rows[0]);
          
          const scheduledRes = await pool.query(
            `SELECT COUNT(*) as count FROM course_requests WHERE instructor_id = $1 AND status = 'scheduled'`,
            [userId]
          );
          console.log(`[DEBUG] Scheduled query result:`, scheduledRes.rows[0]);
          
          const completedRes = await pool.query(
            `SELECT COUNT(*) as count FROM course_requests WHERE instructor_id = $1 AND status = 'completed'`,
            [userId]
          );
          console.log(`[DEBUG] Completed query result:`, completedRes.rows[0]);
          
          const cancelledRes = await pool.query(
            `SELECT COUNT(*) as count FROM course_requests WHERE instructor_id = $1 AND status = 'cancelled'`,
            [userId]
          );
          console.log(`[DEBUG] Cancelled query result:`, cancelledRes.rows[0]);
          
          const result = {
            totalClasses: parseInt(totalRes.rows[0]?.count || 0),
            scheduledClasses: parseInt(scheduledRes.rows[0]?.count || 0),
            completedClasses: parseInt(completedRes.rows[0]?.count || 0),
            cancelledClasses: parseInt(cancelledRes.rows[0]?.count || 0),
            lastUpdated: new Date().toISOString(),
          };
          
          console.log(`[DEBUG] Returning instructor stats:`, result);
          return result;
        } else {
          console.log(`[DEBUG] Fetching non-instructor stats for role: ${role}`);
          // Default/fallback (admin, org, etc)
          const pendingCourses = await pool.query(
            'SELECT COUNT(*) as count FROM course_requests WHERE status = $1',
            ['pending']
          );
          const completedThisMonth = await pool.query(`
            SELECT COUNT(*) as count FROM course_requests 
            WHERE status = 'completed' 
            AND EXTRACT(MONTH FROM completed_at) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM completed_at) = EXTRACT(YEAR FROM CURRENT_DATE)
          `);
          const result = {
            pendingCourses: parseInt(pendingCourses.rows[0]?.count || 0),
            completedThisMonth: parseInt(completedThisMonth.rows[0]?.count || 0),
            lastUpdated: new Date().toISOString(),
          };
          console.log(`[DEBUG] Returning non-instructor stats:`, result);
          return result;
        }
      },
      { ttl: 300, forceRefresh } // 5 minutes TTL for dashboard
    );
  }

  /**
   * Invalidate cache entries matching pattern
   */
  async invalidate(pattern: string): Promise<void> {
    if (!this.isRedisEnabled) {
      console.log(`🔴 [CACHE] Redis disabled, skipping invalidation for ${pattern}`);
      return;
    }

    try {
      const client = redisManager.getClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
        console.log(`✅ [CACHE] Invalidated ${keys.length} keys matching ${pattern}`);
      }
    } catch (error) {
      console.error(`❌ [CACHE] Failed to invalidate ${pattern}:`, error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<void> {
    if (!this.isRedisEnabled) {
      console.log('🔴 [CACHE] Redis disabled, skipping cache clear');
      return;
    }

    try {
      const client = redisManager.getClient();
      await client.flushDb();
      console.log('✅ [CACHE] All cache entries cleared');
    } catch (error) {
      console.error('❌ [CACHE] Failed to clear cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    if (!this.isRedisEnabled) {
      return {
        enabled: false,
        message: 'Redis caching is disabled',
      };
    }

    try {
      const client = redisManager.getClient();
      const info = await client.info();
      const keys = await client.keys('*');
      return {
        enabled: true,
        keys: keys.length,
        info,
      };
    } catch (error) {
      console.error('❌ [CACHE] Failed to get cache stats:', error);
      return {
        enabled: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();
export default cacheService;
