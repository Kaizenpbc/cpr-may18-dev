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
import { query, pool } from '../../config/database.js';
import { cacheService } from '../../services/cacheService.js';
import fs from 'fs/promises';
import path from 'path';
import { devLog } from '../../utils/devLog.js';

// Use pg's built-in escapeIdentifier for safe SQL identifier interpolation
const escapeIdentifier = (identifier: string): string => {
  // Validate identifier against PostgreSQL naming rules
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }
  // Double-quote and escape any double quotes inside
  return '"' + identifier.replace(/"/g, '""') + '"';
};

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
          await query(statement);
          successful++;
          results.push(`✅ ${statement.substring(0, 100)}...`);
        } else if (statement.toUpperCase().includes('ANALYZE')) {
          // Handle ANALYZE statements
          await query(statement);
          successful++;
          results.push(`📊 ${statement}`);
        } else if (statement.trim().length > 0) {
          // Handle other statements
          await query(statement);
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
    const connectionStats = await query(`
      SELECT
        COUNT(*) as total_connections,
        SUM(CASE WHEN command != 'Sleep' THEN 1 ELSE 0 END) as active_connections,
        SUM(CASE WHEN command = 'Sleep' THEN 1 ELSE 0 END) as idle_connections
      FROM information_schema.processlist
    `);

    const sizeStats = await query(`
      SELECT
        CONCAT(ROUND(SUM(data_length + index_length) / 1024 / 1024, 2), ' MB') as database_size,
        CONCAT(ROUND(SUM(data_length + index_length) / 1024 / 1024, 2), ' MB') as total_table_size
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
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
      const orgResult = await query(
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
            await query(recommendation);
            results.push(`✅ ${recommendation}`);
          } catch (error) {
            results.push(`❌ ${recommendation} - ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    } else {
      // Get tables that need maintenance
      const tablesQuery = `
        SELECT table_name as tablename
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
        LIMIT 10
      `;

      const tablesResult = await query(tablesQuery);

      for (const table of tablesResult.rows) {
        if (table.tablename && typeof table.tablename === 'string') {
          try {
            // Use safe identifier escaping to prevent SQL injection
            const safeTableName = escapeIdentifier(table.tablename);
            let maintenanceSql: string | null = null;
            switch (operation) {
              case 'vacuum':
                maintenanceSql = `OPTIMIZE TABLE ${safeTableName}`;
                break;
              case 'analyze':
                maintenanceSql = `ANALYZE TABLE ${safeTableName}`;
                break;
              case 'reindex':
                maintenanceSql = `ANALYZE TABLE ${safeTableName}`;
                break;
            }

            if (maintenanceSql) {
              await query(maintenanceSql);
              results.push(`✅ ${maintenanceSql}`);
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
    const { query: userQuery, analyze = false } = req.body;

    if (!userQuery || typeof userQuery !== 'string') {
      throw new AppError(
        400,
        errorCodes.VALIDATION_ERROR,
        'Query is required and must be a string'
      );
    }

    // Normalize query for security checks
    const normalizedQuery = userQuery
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/--.*$/gm, '')           // Remove line comments
      .replace(/\s+/g, ' ')             // Normalize whitespace
      .trim()
      .toUpperCase();

    // Query must start with SELECT (after normalization)
    if (!normalizedQuery.startsWith('SELECT')) {
      throw new AppError(
        400,
        errorCodes.VALIDATION_ERROR,
        'Only SELECT queries are allowed for analysis'
      );
    }

    // Prevent dangerous operations - check for any occurrence
    const dangerousPatterns = [
      /\bDROP\b/i,
      /\bDELETE\b/i,
      /\bUPDATE\b/i,
      /\bINSERT\b/i,
      /\bALTER\b/i,
      /\bCREATE\b/i,
      /\bTRUNCATE\b/i,
      /\bEXEC(UTE)?\b/i,
      /\bCALL\b/i,
      /\bGRANT\b/i,
      /\bREVOKE\b/i,
      /;\s*\w/i,          // Prevent multiple statements
    ];

    if (dangerousPatterns.some(pattern => pattern.test(userQuery))) {
      throw new AppError(
        400,
        errorCodes.VALIDATION_ERROR,
        'Query contains forbidden operations. Only simple SELECT queries are allowed.'
      );
    }

    // MySQL EXPLAIN: returns tabular rows, not JSON plan
    const explainQuery = `EXPLAIN ${userQuery}`;
    const result = await query(explainQuery);

    res.json(
      ApiResponseBuilder.success(keysToCamel({
        query: userQuery,
        execution_plan: result.rows,
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
    // MySQL does not have pg_stat_statements; return process list as approximate
    const slowQueriesResult = await query(`
      SELECT
        info as query,
        time as total_time,
        time as mean_time,
        0 as calls,
        0 as rows,
        NULL as hit_percent
      FROM information_schema.processlist
      WHERE command != 'Sleep' AND time > 1
      ORDER BY time DESC
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

    // Get connection info (MySQL)
    const connectionInfo = await query(`
      SELECT
        @@max_connections as max_connections,
        COUNT(*) as current_connections
      FROM information_schema.processlist
    `);

    // Get database size (MySQL)
    const sizeInfo = await query(`
      SELECT
        CONCAT(ROUND(SUM(data_length + index_length) / 1024 / 1024, 2), ' MB') as database_size,
        CONCAT(ROUND(SUM(data_length) / 1024 / 1024, 2), ' MB') as tables_size,
        CONCAT(ROUND(SUM(index_length) / 1024 / 1024, 2), ' MB') as indexes_size
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
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
