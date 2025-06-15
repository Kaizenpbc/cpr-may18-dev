// ===============================================
// Prometheus Metrics Collection Middleware
// ===============================================

import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'cpr_',
});

// ===============================================
// HTTP Metrics
// ===============================================

const httpRequestDuration = new client.Histogram({
  name: 'cpr_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'portal'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const httpRequestsTotal = new client.Counter({
  name: 'cpr_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'portal'],
});

const httpRequestSize = new client.Histogram({
  name: 'cpr_http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000],
});

const httpResponseSize = new client.Histogram({
  name: 'cpr_http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [100, 1000, 10000, 100000, 1000000],
});

// ===============================================
// Business Metrics
// ===============================================

const coursesTotal = new client.Gauge({
  name: 'cpr_courses_total',
  help: 'Total number of courses',
  labelNames: ['status', 'course_type', 'organization'],
});

const studentsTotal = new client.Gauge({
  name: 'cpr_students_total',
  help: 'Total number of students',
  labelNames: ['status', 'organization'],
});

const instructorsTotal = new client.Gauge({
  name: 'cpr_instructors_total',
  help: 'Total number of instructors',
  labelNames: ['status', 'availability'],
});

const revenueTotal = new client.Gauge({
  name: 'cpr_revenue_total_dollars',
  help: 'Total revenue in dollars',
  labelNames: ['period', 'organization', 'course_type'],
});

const invoicesTotal = new client.Gauge({
  name: 'cpr_invoices_total',
  help: 'Total number of invoices',
  labelNames: ['status', 'organization'],
});

const paymentsTotal = new client.Gauge({
  name: 'cpr_payments_total',
  help: 'Total number of payments',
  labelNames: ['status', 'verification_status'],
});

// ===============================================
// Authentication & Security Metrics
// ===============================================

const authenticationAttempts = new client.Counter({
  name: 'cpr_authentication_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['result', 'role', 'method'],
});

const rateLimitViolations = new client.Counter({
  name: 'cpr_rate_limit_violations_total',
  help: 'Total rate limit violations',
  labelNames: ['endpoint', 'ip_range'],
});

const securityEvents = new client.Counter({
  name: 'cpr_security_events_total',
  help: 'Total security events',
  labelNames: ['event_type', 'severity', 'source'],
});

const activeUsers = new client.Gauge({
  name: 'cpr_active_users',
  help: 'Number of currently active users',
  labelNames: ['role', 'portal'],
});

// ===============================================
// Database Metrics
// ===============================================

const databaseConnections = new client.Gauge({
  name: 'cpr_database_connections',
  help: 'Number of active database connections',
  labelNames: ['state'],
});

const databaseQueryDuration = new client.Histogram({
  name: 'cpr_database_query_duration_seconds',
  help: 'Database query execution time',
  labelNames: ['operation', 'table', 'result'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const databaseSize = new client.Gauge({
  name: 'cpr_database_size_bytes',
  help: 'Database size in bytes',
  labelNames: ['database', 'table'],
});

// ===============================================
// Application-Specific Metrics
// ===============================================

const courseCompletionRate = new client.Gauge({
  name: 'cpr_course_completion_rate',
  help: 'Course completion rate percentage',
  labelNames: ['course_type', 'organization', 'instructor'],
});

const attendanceRate = new client.Gauge({
  name: 'cpr_attendance_rate',
  help: 'Student attendance rate percentage',
  labelNames: ['course_type', 'organization'],
});

const instructorUtilization = new client.Gauge({
  name: 'cpr_instructor_utilization_rate',
  help: 'Instructor utilization rate percentage',
  labelNames: ['instructor_id', 'period'],
});

const billingCycleTime = new client.Histogram({
  name: 'cpr_billing_cycle_time_hours',
  help: 'Time from course completion to invoice generation',
  labelNames: ['organization', 'course_type'],
  buckets: [1, 6, 12, 24, 48, 72, 168], // 1 hour to 1 week
});

// ===============================================
// Register all metrics
// ===============================================

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestSize);
register.registerMetric(httpResponseSize);
register.registerMetric(coursesTotal);
register.registerMetric(studentsTotal);
register.registerMetric(instructorsTotal);
register.registerMetric(revenueTotal);
register.registerMetric(invoicesTotal);
register.registerMetric(paymentsTotal);
register.registerMetric(authenticationAttempts);
register.registerMetric(rateLimitViolations);
register.registerMetric(securityEvents);
register.registerMetric(activeUsers);
register.registerMetric(databaseConnections);
register.registerMetric(databaseQueryDuration);
register.registerMetric(databaseSize);
register.registerMetric(courseCompletionRate);
register.registerMetric(attendanceRate);
register.registerMetric(instructorUtilization);
register.registerMetric(billingCycleTime);

// ===============================================
// Middleware Functions
// ===============================================

/**
 * Main Prometheus metrics middleware
 */
export function prometheusMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  // Track request size
  const requestSize = parseInt(req.headers['content-length'] || '0', 10);
  
  // Determine portal from URL
  const portal = getPortalFromUrl(req.originalUrl);
  
  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const duration = (Date.now() - start) / 1000;
    const route = getRoutePattern(req.route?.path || req.path);
    const statusCode = res.statusCode.toString();
    
    // Record HTTP metrics
    httpRequestDuration
      .labels(req.method, route, statusCode, portal)
      .observe(duration);
    
    httpRequestsTotal
      .labels(req.method, route, statusCode, portal)
      .inc();
    
    if (requestSize > 0) {
      httpRequestSize
        .labels(req.method, route)
        .observe(requestSize);
    }
    
    // Track response size
    if (chunk) {
      const responseSize = Buffer.byteLength(chunk);
      httpResponseSize
        .labels(req.method, route, statusCode)
        .observe(responseSize);
    }
    
    return originalEnd.call(this, chunk, encoding, cb);
  };
  
  next();
}

/**
 * Metrics endpoint handler
 */
export async function metricsHandler(req: Request, res: Response) {
  try {
    // Update business metrics before serving
    await updateBusinessMetrics();
    
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).send('Error generating metrics');
  }
}

// ===============================================
// Utility Functions
// ===============================================

function getPortalFromUrl(url: string): string {
  if (url.includes('/organization')) return 'organization';
  if (url.includes('/instructor')) return 'instructor';
  if (url.includes('/admin')) return 'admin';
  if (url.includes('/accounting')) return 'accounting';
  if (url.includes('/sysadmin')) return 'sysadmin';
  return 'api';
}

function getRoutePattern(path: string): string {
  // Convert dynamic routes to patterns
  return path
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
    .replace(/\/\d{4}-\d{2}-\d{2}/g, '/:date');
}

// ===============================================
// Business Metrics Updates
// ===============================================

async function updateBusinessMetrics() {
  try {
    // This would be called periodically to update business metrics
    // For now, we'll implement basic counters
    
    // Note: In a real implementation, you'd query your database here
    // These are placeholder implementations
    
    console.log('[METRICS] Updating business metrics...');
    
    // Update course metrics (placeholder)
    // In real implementation: const courseStats = await db.query('SELECT ...');
    
  } catch (error) {
    console.error('Error updating business metrics:', error);
  }
}

// ===============================================
// Exported Metric Objects for Manual Updates
// ===============================================

export const metrics = {
  http: {
    duration: httpRequestDuration,
    total: httpRequestsTotal,
    requestSize: httpRequestSize,
    responseSize: httpResponseSize,
  },
  business: {
    courses: coursesTotal,
    students: studentsTotal,
    instructors: instructorsTotal,
    revenue: revenueTotal,
    invoices: invoicesTotal,
    payments: paymentsTotal,
    completionRate: courseCompletionRate,
    attendanceRate: attendanceRate,
    instructorUtilization: instructorUtilization,
    billingCycleTime: billingCycleTime,
  },
  security: {
    authAttempts: authenticationAttempts,
    rateLimitViolations: rateLimitViolations,
    securityEvents: securityEvents,
    activeUsers: activeUsers,
  },
  database: {
    connections: databaseConnections,
    queryDuration: databaseQueryDuration,
    size: databaseSize,
  },
  register,
};

// ===============================================
// Metric Update Helpers
// ===============================================

export class MetricsCollector {
  static recordAuth(result: 'success' | 'failure', role: string, method: 'password' | 'token' = 'password') {
    authenticationAttempts.labels(result, role, method).inc();
  }
  
  static recordRateLimitViolation(endpoint: string, ip: string) {
    const ipRange = ip.split('.').slice(0, 3).join('.') + '.x';
    rateLimitViolations.labels(endpoint, ipRange).inc();
  }
  
  static recordSecurityEvent(eventType: string, severity: 'low' | 'medium' | 'high' | 'critical', source: string) {
    securityEvents.labels(eventType, severity, source).inc();
  }
  
  static updateActiveUsers(role: string, portal: string, count: number) {
    activeUsers.labels(role, portal).set(count);
  }
  
  static recordDatabaseQuery(operation: string, table: string, duration: number, result: 'success' | 'error') {
    databaseQueryDuration.labels(operation, table, result).observe(duration / 1000);
  }
  
  static updateCourseMetrics(status: string, courseType: string, organization: string, count: number) {
    coursesTotal.labels(status, courseType, organization).set(count);
  }
  
  static updateRevenueMetrics(period: string, organization: string, courseType: string, amount: number) {
    revenueTotal.labels(period, organization, courseType).set(amount);
  }
  
  static recordBillingCycle(organization: string, courseType: string, hours: number) {
    billingCycleTime.labels(organization, courseType).observe(hours);
  }
}

export default prometheusMiddleware; 