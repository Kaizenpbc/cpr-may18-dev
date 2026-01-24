import express, { Request, Response } from 'express';
import { asyncHandler } from '../../utils/errorHandler.js';
import { ApiResponseBuilder } from '../../utils/apiResponse.js';
import { AppError, errorCodes } from '../../utils/errorHandler.js';
import { keysToCamel } from '../../utils/caseConverter.js';
import {
  authenticateToken,
  requireRole,
} from '../../middleware/authMiddleware.js';
import { queryOptimizer } from '../../services/queryOptimizer.js';
import { pool } from '../../config/database.js';
import { cacheService } from '../../services/cacheService.js';
import fs from 'fs/promises';
import path from 'path';
import { devLog } from '../../utils/devLog.js';

const router = express.Router();

// Apply authentication and admin role requirement to all routes
router.use(authenticateToken);
router.use(requireRole(['admin']));

// ==========================================
// DATABASE OPTIMIZATION ENDPOINTS
// ==========================================

// Run database optimization script
router.post(
  '/optimize',
  asyncHandler(async (req: Request, res: Response) => {
    devLog('🔧 [DB OPTIMIZATION] Starting database optimization...');

    // Read and execute the optimization script
    const scriptPath = path.join(__dirname, '../../db/optimize-database.sql');
    const optimizationScript = await fs.readFile(scriptPath, 'utf-8');

    // Split into individual statements (basic approach)
    const statements = optimizationScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      .filter(stmt => !['BEGIN', 'COMMIT'].includes(stmt.toUpperCase()));

    let successful = 0;
    let failed = 0;
    const results: string[] = [];

    for (const statement of statements) {
      try {
        if (statement.toUpperCase().includes('CREATE INDEX CONCURRENTLY')) {
          // Handle concurrent index creation separately
          await pool.query(statement);
          successful++;
          results.push(`✅ ${statement.substring(0, 100)}...`);
        } else if (statement.toUpperCase().includes('ANALYZE')) {
          // Handle ANALYZE statements
          await pool.query(statement);
          successful++;
          results.push(`📊 ${statement}`);
        } else if (statement.trim().length > 0) {
          // Handle other statements
          await pool.query(statement);
          successful++;
          results.push(`✅ ${statement.substring(0, 100)}...`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('already exists')) {
          results.push(
            `⚠️ ${statement.substring(0, 100)}... (already exists)`
          );
          successful++;
        } else {
          failed++;
          results.push(
            `❌ ${statement.substring(0, 100)}... (${errorMessage})`
          );
        }
      }
    }

    devLog(
      `🔧 [DB OPTIMIZATION] Completed: ${successful} successful, ${failed} failed`
    );

    res.json(
      ApiResponseBuilder.success(keysToCamel({
        message: 'Database optimization completed',
        successful,
        failed,
        results: results.slice(-20), // Show last 20 results
      }))
    );
  })
);

// Get performance analysis
router.get(
  '/performance-analysis',
  asyncHandler(async (req: Request, res: Response) => {
    devLog('📊 [DB ANALYSIS] Running performance analysis...');

    const recommendations = await queryOptimizer.analyzePerformance();
    const dbStats = await queryOptimizer.getDatabaseStats();
    const maintenanceRecommendations =
      await queryOptimizer.getMaintenanceRecommendations();

    res.json(
      ApiResponseBuilder.success(keysToCamel({
        performance_recommendations: recommendations,
        database_statistics: dbStats,
        maintenance_recommendations: maintenanceRecommendations,
        analysis_timestamp: new Date().toISOString(),
      }))
    );
  })
);

// Get database statistics
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await queryOptimizer.getDatabaseStats();

    // Get additional connection and size information
    const connectionStats = await pool.query(`
      SELECT
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);

    const sizeStats = await pool.query(`
      SELECT
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        pg_size_pretty(SUM(pg_total_relation_size(oid))) as total_table_size
      FROM pg_class
      WHERE relkind = 'r'
    `);

    res.json(
      ApiResponseBuilder.success(keysToCamel({
        ...stats,
        connection_stats: connectionStats.rows[0],
        size_stats: sizeStats.rows[0],
      }))
    );
  })
);

// Test optimized queries
router.get(
  '/test-optimized-queries',
  asyncHandler(async (req: Request, res: Response) => {
    devLog('🧪 [DB TEST] Testing optimized queries...');

    const results = [];

    // Test 1: Optimized course requests query
    try {
      const orgResult = await pool.query(
        'SELECT id FROM organizations LIMIT 1'
      );
      if (orgResult.rows.length > 0) {
        const orgId = orgResult.rows[0].id;
        const courseRequestsResult =
          await queryOptimizer.getOptimizedCourseRequestsByOrg(orgId, 10);
        results.push({
          test: 'Optimized Course Requests Query',
          status: 'success',
          execution_time: courseRequestsResult.executionTime,
          rows_returned: courseRequestsResult.rowsReturned,
          indexes_used: courseRequestsResult.indexesUsed,
        });
      }
    } catch (error) {
      results.push({
        test: 'Optimized Course Requests Query',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Test 2: Optimized instructor availability query
    try {
      const availabilityResult =
        await queryOptimizer.getOptimizedInstructorAvailability(
          new Date().toISOString().split('T')[0]
        );
      results.push({
        test: 'Optimized Instructor Availability Query',
        status: 'success',
        execution_time: availabilityResult.executionTime,
        rows_returned: availabilityResult.rowsReturned,
        indexes_used: availabilityResult.indexesUsed,
      });
    } catch (error) {
      results.push({
        test: 'Optimized Instructor Availability Query',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Test 3: Optimized dashboard stats query
    try {
      const dashboardResult =
        await queryOptimizer.getOptimizedDashboardStats('admin');
      results.push({
        test: 'Optimized Dashboard Stats Query',
        status: 'success',
        execution_time: dashboardResult.executionTime,
        rows_returned: dashboardResult.rowsReturned,
        indexes_used: dashboardResult.indexesUsed,
      });
    } catch (error) {
      results.push({
        test: 'Optimized Dashboard Stats Query',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Test 4: Optimized aging report query
    try {
      const agingResult = await queryOptimizer.getOptimizedAgingReport();
      results.push({
        test: 'Optimized Aging Report Query',
        status: 'success',
        execution_time: agingResult.executionTime,
        rows_returned: agingResult.rowsReturned,
        indexes_used: agingResult.indexesUsed,
      });
    } catch (error) {
      results.push({
        test: 'Optimized Aging Report Query',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const successfulTests = results.filter(
      r => r.status === 'success'
    ).length;
    const totalTests = results.length;

    res.json(
      ApiResponseBuilder.success(keysToCamel({
        summary: {
          total_tests: totalTests,
          successful_tests: successfulTests,
          success_rate: Math.round((successfulTests / totalTests) * 100),
        },
        test_results: results,
        test_timestamp: new Date().toISOString(),
      }))
    );
  })
);

// Run database maintenance
router.post(
  '/maintenance',
  asyncHandler(async (req: Request, res: Response) => {
    const { operation } = req.body; // 'vacuum', 'analyze', 'reindex'

    if (
      !operation ||
      !['vacuum', 'analyze', 'reindex', 'auto'].includes(operation)
    ) {
      throw new AppError(
        400,
        errorCodes.VALIDATION_ERROR,
        'Valid operation required: vacuum, analyze, reindex, or auto'
      );
    }

    devLog(`🔧 [DB MAINTENANCE] Running ${operation} operation...`);

    const results: string[] = [];

    if (operation === 'auto') {
      // Get maintenance recommendations and execute them
      const recommendations =
        await queryOptimizer.getMaintenanceRecommendations();

      for (const recommendation of recommendations) {
        if (recommendation && typeof recommendation === 'string') {
          try {
            await pool.query(recommendation);
            results.push(`✅ ${recommendation}`);
          } catch (error) {
            results.push(`❌ ${recommendation} - ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    } else {
      // Get tables that need maintenance
      const tablesQuery = `
        SELECT tablename
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY n_live_tup DESC
        LIMIT 10
      `;

      const tablesResult = await pool.query(tablesQuery);

      for (const table of tablesResult.rows) {
        if (table.tablename && typeof table.tablename === 'string') {
          try {
            let query: string | null = null;
            switch (operation) {
              case 'vacuum':
                query = `VACUUM ANALYZE ${table.tablename}`;
                break;
              case 'analyze':
                query = `ANALYZE ${table.tablename}`;
                break;
              case 'reindex':
                query = `REINDEX TABLE ${table.tablename}`;
                break;
            }

            if (query) {
              await pool.query(query);
              results.push(`✅ ${query}`);
            }
          } catch (error) {
            results.push(`❌ ${table.tablename} - ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    }

    res.json(
      ApiResponseBuilder.success(keysToCamel({
        operation,
        results,
        completed_at: new Date().toISOString(),
      }))
    );
  })
);

// Get query execution plans
router.post(
  '/explain-query',
  asyncHandler(async (req: Request, res: Response) => {
    const { query, analyze = false } = req.body;

    if (!query) {
      throw new AppError(
        400,
        errorCodes.VALIDATION_ERROR,
        'Query is required'
      );
    }

    // Prevent dangerous operations
    const dangerousKeywords = [
      'DROP',
      'DELETE',
      'UPDATE',
      'INSERT',
      'ALTER',
      'CREATE',
      'TRUNCATE',
    ];
    const upperQuery = query.toUpperCase();

    if (dangerousKeywords.some(keyword => upperQuery.includes(keyword))) {
      throw new AppError(
        400,
        errorCodes.VALIDATION_ERROR,
        'Only SELECT queries are allowed for analysis'
      );
    }

    const explainQuery = analyze
      ? `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`
      : `EXPLAIN (FORMAT JSON) ${query}`;

    const result = await pool.query(explainQuery);
    const plan = result.rows[0]['QUERY PLAN'][0];

    res.json(
      ApiResponseBuilder.success(keysToCamel({
        query,
        execution_plan: plan,
        analyzed: analyze,
        timestamp: new Date().toISOString(),
      }))
    );
  })
);

// Get slow queries (requires pg_stat_statements extension)
router.get(
  '/slow-queries',
  asyncHandler(async (req: Request, res: Response) => {
    // Check if pg_stat_statements is available
    const extensionCheck = await pool.query(`
      SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
    `);

    if (extensionCheck.rows.length === 0) {
      return res.json(
        ApiResponseBuilder.success(keysToCamel({
          message: 'pg_stat_statements extension not available',
          recommendations: [
            'Enable pg_stat_statements extension for detailed query analysis',
            "Add shared_preload_libraries = 'pg_stat_statements' to postgresql.conf",
            'CREATE EXTENSION pg_stat_statements;',
          ],
        }))
      );
    }

    // Get slow queries
    const slowQueriesResult = await pool.query(`
      SELECT
        query,
        calls,
        total_time,
        mean_time,
        rows,
        100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY mean_time DESC
      LIMIT 10
    `);

    res.json(
      ApiResponseBuilder.success(keysToCamel({
        slow_queries: slowQueriesResult.rows,
        analysis_timestamp: new Date().toISOString(),
      }))
    );
  })
);

// Cache integration endpoints
router.post(
  '/invalidate-cache',
  asyncHandler(async (req: Request, res: Response) => {
    const { pattern = '*' } = req.body;

    await cacheService.invalidate(pattern);

    res.json(
      ApiResponseBuilder.success(keysToCamel({
        message: `Cache invalidated for pattern: ${pattern}`,
        timestamp: new Date().toISOString(),
      }))
    );
  })
);

router.get(
  '/cache-stats',
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await cacheService.getStats();

    res.json(ApiResponseBuilder.success(keysToCamel(stats)));
  })
);

// Get comprehensive performance report
router.get(
  '/performance-report',
  asyncHandler(async (req: Request, res: Response) => {
    devLog('📊 [PERFORMANCE REPORT] Generating comprehensive report...');

    const [dbStats, recommendations, maintenanceRecs, cacheStats] =
      await Promise.all([
        queryOptimizer.getDatabaseStats(),
        queryOptimizer.analyzePerformance(),
        queryOptimizer.getMaintenanceRecommendations(),
        cacheService.getStats(),
      ]);

    // Get connection info
    const connectionInfo = await pool.query(`
      SELECT
        setting as max_connections,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as current_connections
      FROM pg_settings
      WHERE name = 'max_connections'
    `);

    // Get database size
    const sizeInfo = await pool.query(`
      SELECT
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        pg_size_pretty(SUM(pg_total_relation_size(c.oid))) as tables_size,
        pg_size_pretty(SUM(pg_indexes_size(c.oid))) as indexes_size
      FROM pg_class c
      LEFT JOIN pg_namespace n ON (n.oid = c.relnamespace)
      WHERE n.nspname = 'public' AND c.relkind = 'r'
    `);

    const report = {
      summary: {
        database_size: sizeInfo.rows[0]?.database_size || 'Unknown',
        tables_size: sizeInfo.rows[0]?.tables_size || 'Unknown',
        indexes_size: sizeInfo.rows[0]?.indexes_size || 'Unknown',
        max_connections: parseInt(
          connectionInfo.rows[0]?.max_connections || 0
        ),
        current_connections: parseInt(
          connectionInfo.rows[0]?.current_connections || 0
        ),
        total_tables: dbStats.tableStats.length,
        total_indexes: dbStats.indexStats.length,
      },
      performance_issues: {
        critical: recommendations.filter(r =>
          r.estimatedImprovement.includes('High')
        ).length,
        medium: recommendations.filter(r =>
          r.estimatedImprovement.includes('Medium')
        ).length,
        low: recommendations.filter(r =>
          r.estimatedImprovement.includes('Low')
        ).length,
      },
      cache_performance: {
        enabled: cacheStats?.enabled ?? false,
        connected: cacheStats?.isConnected ?? false,
        status: cacheStats?.enabled
          ? cacheStats?.isConnected
            ? 'Healthy'
            : 'Disconnected'
          : 'Disabled',
      },
      maintenance_required: maintenanceRecs.length > 0,
      maintenance_operations: maintenanceRecs.length,
      detailed_analysis: {
        database_statistics: dbStats,
        performance_recommendations: recommendations,
        maintenance_recommendations: maintenanceRecs,
        cache_statistics: cacheStats,
      },
      generated_at: new Date().toISOString(),
    };

    res.json(ApiResponseBuilder.success(keysToCamel(report)));
  })
);

export default router;
