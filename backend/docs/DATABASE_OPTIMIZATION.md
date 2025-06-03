# Database Optimization Guide

## Overview

This guide covers the comprehensive database optimization system implemented for the CPR Training System. The optimization includes indexes, query optimization, caching integration, and performance monitoring tools.

## Features

### 1. Automated Index Creation
- **Primary Indexes**: Foreign keys, frequently queried columns
- **Composite Indexes**: Multi-column indexes for complex queries
- **Partial Indexes**: Conditional indexes for specific use cases
- **Function-based Indexes**: Case-insensitive and date-based indexes

### 2. Query Optimization
- Optimized queries for common operations
- Query execution plan analysis
- Performance timing and metrics
- Index usage tracking

### 3. Cache Integration
- Redis caching for reference data
- Cache invalidation strategies
- Performance monitoring and statistics
- Automatic cache warming

### 4. Database Maintenance
- Automated VACUUM and ANALYZE operations
- Dead tuple monitoring and cleanup
- Index usage analysis
- Performance recommendations

## API Endpoints

### Database Optimization

#### Run Database Optimization
```bash
POST /api/v1/database/optimize
```
**Description**: Applies all database optimizations including indexes and maintenance.

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Database optimization completed",
    "successful": 45,
    "failed": 2,
    "results": [
      "✅ CREATE INDEX CONCURRENTLY idx_users_username ON users(username)",
      "✅ CREATE INDEX CONCURRENTLY idx_course_requests_status ON course_requests(status)",
      "⚠️ CREATE INDEX idx_existing_index... (already exists)"
    ]
  }
}
```

#### Performance Analysis
```bash
GET /api/v1/database/performance-analysis
```
**Description**: Analyzes database performance and provides optimization recommendations.

**Response**:
```json
{
  "success": true,
  "data": {
    "performance_recommendations": [
      {
        "table": "course_requests",
        "issue": "Missing index on foreign key column: organization_id",
        "recommendation": "CREATE INDEX idx_course_requests_organization_id ON course_requests(organization_id)",
        "estimatedImprovement": "High - Significantly improves JOIN performance"
      }
    ],
    "database_statistics": {
      "tableStats": [...],
      "indexStats": [...]
    },
    "maintenance_recommendations": [
      "VACUUM ANALYZE course_requests; -- 15.2% dead tuples"
    ]
  }
}
```

#### Test Optimized Queries
```bash
GET /api/v1/database/test-optimized-queries
```
**Description**: Tests optimized query performance and reports execution times.

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_tests": 4,
      "successful_tests": 4,
      "success_rate": 100
    },
    "test_results": [
      {
        "test": "Optimized Course Requests Query",
        "status": "success",
        "execution_time": 12.5,
        "rows_returned": 25,
        "indexes_used": ["idx_course_requests_organization_id", "idx_course_requests_status"]
      }
    ]
  }
}
```

### Database Statistics

#### Get Database Statistics
```bash
GET /api/v1/database/stats
```
**Description**: Retrieves comprehensive database statistics including table sizes, connection info, and index usage.

#### Get Performance Report
```bash
GET /api/v1/database/performance-report
```
**Description**: Generates a comprehensive performance report with recommendations.

### Maintenance Operations

#### Run Database Maintenance
```bash
POST /api/v1/database/maintenance
Content-Type: application/json

{
  "operation": "auto"  // or "vacuum", "analyze", "reindex"
}
```
**Description**: Performs database maintenance operations.

### Query Analysis

#### Explain Query
```bash
POST /api/v1/database/explain-query
Content-Type: application/json

{
  "query": "SELECT * FROM course_requests WHERE organization_id = 1",
  "analyze": true
}
```
**Description**: Analyzes query execution plan and performance.

### Cache Integration

#### Get Cache Statistics
```bash
GET /api/v1/database/cache-stats
```

#### Invalidate Cache
```bash
POST /api/v1/database/invalidate-cache
Content-Type: application/json

{
  "pattern": "course_types"  // or "*" for all
}
```

## Performance Testing

### Running the Test Suite

```bash
# Run comprehensive database performance tests
node test-database-performance.js
```

The test suite includes:
- Database optimization validation
- Performance analysis testing
- Optimized query performance testing
- Cache integration testing
- Maintenance operation testing
- Comprehensive reporting

### Expected Performance Improvements

After optimization, you should see:
- **50-90% faster** query execution for indexed operations
- **Reduced database load** through effective caching
- **Improved concurrency** with optimized indexes
- **Better maintenance** with automated monitoring

## Index Strategy

### Core Tables Optimization

#### Users Table
```sql
-- Primary lookups
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_organization_id ON users(organization_id);

-- Composite index for active users by role and organization
CREATE INDEX idx_users_role_org ON users(role, organization_id) WHERE status = 'active';
```

#### Course Requests Table (Most Critical)
```sql
-- Individual indexes
CREATE INDEX idx_course_requests_status ON course_requests(status);
CREATE INDEX idx_course_requests_organization_id ON course_requests(organization_id);
CREATE INDEX idx_course_requests_instructor_id ON course_requests(instructor_id);
CREATE INDEX idx_course_requests_scheduled_date ON course_requests(scheduled_date);

-- Composite indexes for common query patterns
CREATE INDEX idx_course_requests_org_status ON course_requests(organization_id, status);
CREATE INDEX idx_course_requests_instructor_date ON course_requests(instructor_id, confirmed_date) 
  WHERE status IN ('confirmed', 'completed');

-- Partial indexes for specific use cases
CREATE INDEX idx_course_requests_billing ON course_requests(status, ready_for_billing_at) 
  WHERE status = 'completed' AND ready_for_billing_at IS NOT NULL;
```

#### Financial Tables
```sql
-- Invoices optimization
CREATE INDEX idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_org_posted ON invoices(organization_id, posted_to_org) 
  WHERE posted_to_org = true;

-- Payments optimization
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_verification ON payments(status, submitted_by_org_at) 
  WHERE status = 'pending_verification';
```

### Analytics Indexes

```sql
-- Time-based analytics
CREATE INDEX idx_course_requests_analytics_monthly ON course_requests(
  DATE_TRUNC('month', created_at), 
  organization_id, 
  course_type_id
);

-- Revenue analytics
CREATE INDEX idx_invoices_revenue_monthly ON invoices(
  DATE_TRUNC('month', COALESCE(invoice_date, created_at)),
  organization_id,
  status
);
```

## Query Optimization Examples

### Before Optimization
```sql
-- Slow: Full table scan
SELECT * FROM course_requests 
WHERE organization_id = 123 AND status = 'pending'
ORDER BY created_at DESC;

-- Execution time: ~200ms for 10k records
```

### After Optimization
```sql
-- Fast: Uses composite index
SELECT cr.id, cr.date_requested, cr.location, ct.name as course_type
FROM course_requests cr
JOIN class_types ct ON cr.course_type_id = ct.id
WHERE cr.organization_id = 123 AND cr.status = 'pending'
ORDER BY cr.created_at DESC;

-- Execution time: ~15ms with idx_course_requests_org_status
```

### Optimized Dashboard Query
```sql
-- Uses conditional aggregation with indexes
SELECT 
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_courses,
  COUNT(CASE WHEN status = 'completed' 
             AND completed_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) as completed_this_month,
  COUNT(CASE WHEN status = 'confirmed' 
             AND confirmed_date >= CURRENT_DATE THEN 1 END) as upcoming_courses
FROM course_requests
WHERE organization_id = $1;

-- Uses: idx_course_requests_org_status, idx_course_requests_status
```

## Cache Strategy

### Cache Layers

1. **Reference Data** (1 hour TTL)
   - Course types
   - Organizations
   - Certifications

2. **User Data** (15 minutes TTL)
   - User profiles
   - User permissions

3. **Dashboard Data** (5 minutes TTL)
   - Statistics
   - Aggregated data

4. **API Responses** (Variable TTL)
   - Frequently accessed endpoints
   - Search results

### Cache Implementation

```typescript
// Example: Cached course types
async getCourseTypes(forceRefresh = false): Promise<any[]> {
  return this.cache(
    'course_types',
    async () => {
      const result = await pool.query(
        'SELECT id, name, description FROM class_types ORDER BY name'
      );
      return result.rows;
    },
    { ttl: 3600, forceRefresh } // 1 hour TTL
  );
}
```

## Maintenance Guidelines

### Daily Tasks (Automated)
- Monitor cache hit rates
- Check for slow queries
- Review connection counts

### Weekly Tasks
```bash
# Run performance analysis
curl -X GET "http://localhost:3001/api/v1/database/performance-analysis"

# Run maintenance operations
curl -X POST "http://localhost:3001/api/v1/database/maintenance" \
  -H "Content-Type: application/json" \
  -d '{"operation": "auto"}'
```

### Monthly Tasks
- Review index usage statistics
- Analyze table growth patterns
- Update optimization strategy
- Run comprehensive performance report

### Database Health Checks
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- Check table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename)) as size,
  pg_size_pretty(pg_indexes_size(tablename)) as index_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename) DESC;

-- Check dead tuples
SELECT tablename, n_dead_tup, n_live_tup,
  ROUND((n_dead_tup::float / NULLIF(n_live_tup, 0)) * 100, 2) as dead_tuple_percentage
FROM pg_stat_user_tables
WHERE n_dead_tup > 0
ORDER BY dead_tuple_percentage DESC;
```

## Performance Monitoring

### Key Metrics to Monitor

1. **Query Performance**
   - Average execution time
   - Slow query count
   - Index hit ratio

2. **Cache Performance**
   - Hit rate percentage
   - Memory usage
   - Eviction rate

3. **Database Health**
   - Connection count
   - Dead tuple percentage
   - Table bloat

4. **System Resources**
   - CPU usage
   - Memory usage
   - Disk I/O

### Alerting Thresholds

- Query execution time > 1000ms
- Cache hit rate < 80%
- Dead tuple percentage > 20%
- Connection count > 80% of max

## Troubleshooting

### Common Issues

#### Slow Queries
1. Check if appropriate indexes exist
2. Analyze query execution plan
3. Consider query rewriting
4. Check table statistics

#### Cache Misses
1. Verify Redis connection
2. Check TTL settings
3. Monitor eviction policy
4. Review cache key patterns

#### High Database Load
1. Check for missing indexes
2. Analyze slow query log
3. Review connection pooling
4. Consider read replicas

### Performance Debugging

```bash
# Test query performance
curl -X POST "http://localhost:3001/api/v1/database/explain-query" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM course_requests WHERE status = '\''pending'\''", "analyze": true}'

# Check index usage
curl -X GET "http://localhost:3001/api/v1/database/stats"

# Test optimized queries
curl -X GET "http://localhost:3001/api/v1/database/test-optimized-queries"
```

## Security Considerations

### Access Control
- Database optimization endpoints require admin role
- Query analysis limited to SELECT statements
- No direct SQL execution allowed

### Data Protection
- Sensitive data excluded from cache
- Audit logging for optimization operations
- Connection encryption enforced

## Best Practices

1. **Index Management**
   - Regular monitoring of index usage
   - Remove unused indexes
   - Update statistics regularly

2. **Query Optimization**
   - Use parameterized queries
   - Avoid SELECT *
   - Optimize JOIN conditions

3. **Cache Strategy**
   - Set appropriate TTL values
   - Use cache versioning
   - Implement cache warming

4. **Monitoring**
   - Set up automated alerts
   - Regular performance reviews
   - Capacity planning

## Future Enhancements

### Planned Features
- Automated query optimization suggestions
- Predictive index recommendations
- Advanced cache strategies
- Real-time performance dashboards

### Scaling Considerations
- Read replica setup
- Partitioning strategies
- Connection pooling optimization
- Horizontal scaling preparation

---

For additional support or questions about database optimization, consult the system administrator or refer to the PostgreSQL documentation. 