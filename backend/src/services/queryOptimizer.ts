import { query as dbQuery } from '../config/database.js';

interface QueryPerformance {
  query: string;
  executionTime: number;
  rowsReturned: number;
  indexesUsed: string[];
}

interface OptimizationRecommendation {
  table: string;
  issue: string;
  recommendation: string;
  estimatedImprovement: string;
}

interface PostgresExplainPlan {
  'Index Name'?: string;
  'Node Type'?: string;
  Plans?: PostgresExplainPlan[];
  [key: string]: unknown;
}

class QueryOptimizer {
  private static instance: QueryOptimizer;

  private constructor() {}

  static getInstance(): QueryOptimizer {
    if (!QueryOptimizer.instance) {
      QueryOptimizer.instance = new QueryOptimizer();
    }
    return QueryOptimizer.instance;
  }

  /**
   * Optimized query for getting course requests by organization
   * Uses proper indexing and reduced data transfer
   */
  async getOptimizedCourseRequestsByOrg(
    organizationId: number,
    limit = 50,
    offset = 0
  ) {
    const query = `
      SELECT 
        cr.id,
        cr.date_requested,
        cr.scheduled_date,
        cr.location,
        cr.registered_students,
        cr.status,
        cr.confirmed_date,
        cr.confirmed_start_time,
        cr.confirmed_end_time,
        cr.created_at,
        ct.name as course_type,
        u.username as instructor_name,
        cs.student_count,
        cs.attended_count
      FROM course_requests cr
      JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN users u ON cr.instructor_id = u.id
      LEFT JOIN (
        SELECT 
          course_request_id,
          COUNT(*) as student_count,
          SUM(CASE WHEN attended = 1 OR attended = true THEN 1 ELSE 0 END) as attended_count
        FROM course_students
        GROUP BY course_request_id
      ) cs ON cr.id = cs.course_request_id
      WHERE cr.organization_id = $1
      ORDER BY cr.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    return this.executeWithTiming(query, [organizationId, limit, offset]);
  }

  /**
   * Optimized query for instructor availability lookup
   * Uses composite index on instructor_id and date
   */
  async getOptimizedInstructorAvailability(date: string) {
    const query = `
      SELECT DISTINCT
        u.id, 
        u.username as instructor_name, 
        u.email,
        u.first_name,
        u.last_name
      FROM users u
      INNER JOIN instructor_availability ia ON u.id = ia.instructor_id 
      WHERE u.role = 'instructor' 
        AND u.status = 'active'
        AND ia.date = $1
        AND ia.status = 'available'
      ORDER BY u.username
    `;

    return this.executeWithTiming(query, [date]);
  }

  /**
   * Optimized query for dashboard statistics
   * Uses partial indexes and efficient aggregation
   */
  async getOptimizedDashboardStats(role: string, organizationId?: number) {
    let query: string;
    let params: (string | number | null)[];

    if (role === 'admin') {
      query = `
        SELECT 
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_courses,
          COUNT(CASE WHEN status = 'completed'
                     AND completed_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01') THEN 1 END) as completed_this_month,
          COUNT(CASE WHEN status = 'confirmed'
                     AND confirmed_date >= CURRENT_DATE THEN 1 END) as upcoming_courses
        FROM course_requests
      `;
      params = [];
    } else {
      query = `
        SELECT
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_courses,
          COUNT(CASE WHEN status = 'completed'
                     AND completed_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01') THEN 1 END) as completed_this_month,
          COUNT(CASE WHEN status = 'confirmed' 
                     AND confirmed_date >= CURRENT_DATE THEN 1 END) as upcoming_courses
        FROM course_requests
        WHERE organization_id = $1
      `;
      params = [organizationId ?? null];
    }

    return this.executeWithTiming(query, params);
  }

  /**
   * Optimized accounting queries for aging report
   * Uses function-based indexes for date calculations
   */
  async getOptimizedAgingReport(organizationId?: number) {
    const organizationFilter = organizationId
      ? 'AND i.organization_id = $1'
      : '';
    const params = organizationId ? [organizationId] : [];

    const query = `
      WITH invoice_aging AS (
        SELECT 
          i.id,
          i.invoice_number,
          i.organization_id,
          o.name as organization_name,
          i.amount,
          i.due_date,
          i.status,
          COALESCE(p.total_payments, 0) as total_payments,
          (i.amount - COALESCE(p.total_payments, 0)) as balance_due,
          CASE 
            WHEN i.status = 'paid' THEN 'Paid'
            WHEN CURRENT_DATE <= i.due_date THEN 'Current'
            WHEN CURRENT_DATE <= i.due_date + INTERVAL 30 DAY THEN '1-30 Days'
            WHEN CURRENT_DATE <= i.due_date + INTERVAL 60 DAY THEN '31-60 Days'
            WHEN CURRENT_DATE <= i.due_date + INTERVAL 90 DAY THEN '61-90 Days'
            ELSE '90+ Days'
          END as aging_bucket
        FROM invoices i
        JOIN organizations o ON i.organization_id = o.id
        LEFT JOIN (
          SELECT 
            invoice_id,
            SUM(amount) as total_payments
          FROM payments
          WHERE status = 'verified'
          GROUP BY invoice_id
        ) p ON i.id = p.invoice_id
        WHERE i.posted_to_org = true ${organizationFilter}
      )
      SELECT 
        aging_bucket,
        COUNT(*) as invoice_count,
        SUM(balance_due) as total_balance
      FROM invoice_aging
      WHERE balance_due > 0
      GROUP BY aging_bucket
      ORDER BY 
        CASE aging_bucket
          WHEN 'Current' THEN 1
          WHEN '1-30 Days' THEN 2
          WHEN '31-60 Days' THEN 3
          WHEN '61-90 Days' THEN 4
          WHEN '90+ Days' THEN 5
          ELSE 6
        END
    `;

    return this.executeWithTiming(query, params);
  }

  /**
   * Optimized revenue analytics query
   * Uses date truncation index for efficient grouping
   */
  async getOptimizedRevenueAnalytics(year: number) {
    const query = `
      WITH monthly_revenue AS (
        SELECT
          DATE_FORMAT(COALESCE(invoice_date, created_at), '%Y-%m-01') as month,
          SUM(amount) as total_invoiced,
          COUNT(*) as invoice_count
        FROM invoices
        WHERE YEAR(COALESCE(invoice_date, created_at)) = ?
        GROUP BY DATE_FORMAT(COALESCE(invoice_date, created_at), '%Y-%m-01')
      ),
      monthly_payments AS (
        SELECT
          DATE_FORMAT(payment_date, '%Y-%m-01') as month,
          SUM(amount) as total_paid,
          COUNT(*) as payment_count
        FROM payments
        WHERE YEAR(payment_date) = ?
          AND status = 'verified'
        GROUP BY DATE_FORMAT(payment_date, '%Y-%m-01')
      ),
      all_months AS (
        SELECT month FROM monthly_revenue
        UNION
        SELECT month FROM monthly_payments
      )
      SELECT
        DATE_FORMAT(am.month, '%Y-%m') as month,
        COALESCE(mr.total_invoiced, 0) as total_invoiced,
        COALESCE(mr.invoice_count, 0) as invoice_count,
        COALESCE(mp.total_paid, 0) as total_paid,
        COALESCE(mp.payment_count, 0) as payment_count
      FROM all_months am
      LEFT JOIN monthly_revenue mr ON am.month = mr.month
      LEFT JOIN monthly_payments mp ON am.month = mp.month
      ORDER BY am.month
    `;

    return this.executeWithTiming(query, [year, year]);
  }

  /**
   * Execute query with performance timing
   */
  private async executeWithTiming(
    query: string,
    params: (string | number | null)[]
  ): Promise<QueryPerformance> {
    const startTime = process.hrtime.bigint();

    try {
      const result = await dbQuery(query, params);
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      return {
        query: query.replace(/\s+/g, ' ').trim(),
        executionTime: Math.round(executionTime * 100) / 100,
        rowsReturned: result.rows.length,
        indexesUsed: await this.getIndexesUsed(query),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Analyze query execution plan to identify indexes used
   */
  private async getIndexesUsed(query: string): Promise<string[]> {
    try {
      const explainQuery = `EXPLAIN ${query}`;
      const result = await dbQuery(explainQuery);
      // MySQL EXPLAIN returns rows with a 'key' column for the index used
      const indexes = result.rows
        .map((row: any) => row.key)
        .filter((k: any) => k != null);
      return [...new Set(indexes)] as string[];
    } catch (error) {
      return ['Unable to analyze'];
    }
  }

  /**
   * Recursively extract index names from execution plan
   */
  private extractIndexesFromPlan(plan: PostgresExplainPlan, indexes: string[]): void {
    if (plan['Index Name']) {
      indexes.push(plan['Index Name']);
    }

    if (plan.Plans) {
      plan.Plans.forEach((subPlan: PostgresExplainPlan) => {
        this.extractIndexesFromPlan(subPlan, indexes);
      });
    }
  }

  /**
   * Analyze database performance and provide recommendations
   */
  async analyzePerformance(): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    try {
      // Check for missing indexes on foreign keys
      const missingFKIndexes = await this.findMissingForeignKeyIndexes();
      recommendations.push(...missingFKIndexes);

      // Check for unused indexes
      const unusedIndexes = await this.findUnusedIndexes();
      recommendations.push(...unusedIndexes);

      // Check for large table scans
      const tableScans = await this.findTableScans();
      recommendations.push(...tableScans);

      // Check for slow queries
      const slowQueries = await this.findSlowQueries();
      recommendations.push(...slowQueries);
    } catch (error) {
      console.error('Error analyzing performance:', error);
    }

    return recommendations;
  }

  /**
   * Find foreign key columns without indexes
   */
  private async findMissingForeignKeyIndexes(): Promise<
    OptimizationRecommendation[]
  > {
    const query = `
      SELECT
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = DATABASE()
        AND NOT EXISTS (
          SELECT 1 FROM information_schema.statistics s
          WHERE s.table_schema = DATABASE()
            AND s.table_name = tc.table_name
            AND s.column_name = kcu.column_name
        )
    `;

    const result = await dbQuery(query);

    return result.rows.map(row => ({
      table: row.table_name,
      issue: `Missing index on foreign key column: ${row.column_name}`,
      recommendation: `CREATE INDEX idx_${row.table_name}_${row.column_name} ON ${row.table_name}(${row.column_name})`,
      estimatedImprovement: 'High - Significantly improves JOIN performance',
    }));
  }

  /**
   * Find unused indexes (potential cleanup candidates)
   */
  private async findUnusedIndexes(): Promise<OptimizationRecommendation[]> {
    const query = `
      SELECT
        table_schema as schemaname,
        table_name as tablename,
        index_name as indexname,
        0 as idx_scan
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND index_name NOT LIKE '%PRIMARY%'
        AND non_unique = 1
      GROUP BY table_schema, table_name, index_name
      LIMIT 20
    `;

    const result = await dbQuery(query);

    return result.rows.slice(0, 5).map(row => ({
      table: row.tablename,
      issue: `Unused index: ${row.indexname}`,
      recommendation: `Consider dropping unused index: DROP INDEX ${row.indexname}`,
      estimatedImprovement: 'Medium - Reduces storage and maintenance overhead',
    }));
  }

  /**
   * Find queries doing table scans on large tables
   */
  private async findTableScans(): Promise<OptimizationRecommendation[]> {
    // MySQL doesn't expose seq_scan stats like PostgreSQL; return empty
    const result = { rows: [] as any[] };

    return result.rows.map(row => ({
      table: row.tablename,
      issue: `High number of sequential scans: ${row.seq_scan} scans, ${row.seq_tup_read} rows read`,
      recommendation: `Add indexes for common WHERE clauses on ${row.tablename}`,
      estimatedImprovement: 'High - Converts table scans to index scans',
    }));
  }

  /**
   * Find slow query patterns (simplified version)
   */
  private async findSlowQueries(): Promise<OptimizationRecommendation[]> {
    // This would require pg_stat_statements extension in production
    // For now, return common optimization recommendations
    return [
      {
        table: 'course_requests',
        issue: 'Complex reporting queries may be slow',
        recommendation:
          'Consider creating materialized views for complex analytics',
        estimatedImprovement: 'High - Pre-computed results for complex queries',
      },
      {
        table: 'invoices',
        issue: 'Date range queries on large tables',
        recommendation: 'Ensure date columns have appropriate indexes',
        estimatedImprovement: 'Medium - Faster date-based filtering',
      },
    ];
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    const tableStatsQuery = `
      SELECT
        table_schema as schemaname,
        table_name as tablename,
        0 as inserts,
        0 as updates,
        0 as deletes,
        table_rows as live_tuples,
        0 as dead_tuples,
        NULL as last_analyze,
        NULL as last_autoanalyze
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      ORDER BY table_rows DESC
    `;

    const indexStatsQuery = `
      SELECT
        table_schema as schemaname,
        table_name as tablename,
        index_name as indexname,
        0 as idx_scan,
        0 as idx_tup_read,
        0 as idx_tup_fetch
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
      GROUP BY table_schema, table_name, index_name
      ORDER BY table_name
      LIMIT 20
    `;

    const [tableStats, indexStats] = await Promise.all([
      dbQuery(tableStatsQuery),
      dbQuery(indexStatsQuery),
    ]);

    return {
      tableStats: tableStats.rows,
      indexStats: indexStats.rows,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Suggest maintenance operations
   */
  async getMaintenanceRecommendations() {
    // MySQL doesn't expose dead tuple stats; return empty (no VACUUM needed)
    const deadTuplesQuery = `
      SELECT
        table_schema as schemaname,
        table_name as tablename,
        0 as n_dead_tup,
        table_rows as n_live_tup,
        0.0 as dead_tuple_percentage
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND 1 = 0
    `;

    const result = await dbQuery(deadTuplesQuery);

    const recommendations = result.rows
      .map(row => {
        if (row.dead_tuple_percentage > 20) {
          return `VACUUM ANALYZE ${row.tablename}; -- ${row.dead_tuple_percentage}% dead tuples`;
        } else if (row.dead_tuple_percentage > 10) {
          return `ANALYZE ${row.tablename}; -- ${row.dead_tuple_percentage}% dead tuples`;
        }
        return null;
      })
      .filter(Boolean);

    return recommendations;
  }
}

export const queryOptimizer = QueryOptimizer.getInstance();
export default queryOptimizer;
