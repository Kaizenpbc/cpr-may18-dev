import { pool } from '../config/database.js';
import { logSecurityEvent, AuditEventSeverity } from '../middleware/auditLogger.js';
import { encryptionService } from '../config/encryptionConfig.js';
import { mfaService } from './mfaService.js';
import { Request } from 'express';

// Security Metrics Interface
export interface SecurityMetrics {
  timestamp: Date;
  authentication: {
    totalLogins: number;
    failedLogins: number;
    mfaAttempts: number;
    mfaFailures: number;
    activeSessions: number;
  };
  encryption: {
    totalEncryptions: number;
    totalDecryptions: number;
    activeKeys: number;
    keyRotations: number;
    encryptionRate: number;
  };
  api: {
    totalRequests: number;
    blockedRequests: number;
    suspiciousRequests: number;
    rateLimitedRequests: number;
  };
  system: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    databaseConnections: number;
  };
}

// Security Event Interface
export interface SecurityEvent {
  id: string;
  type: string;
  severity: AuditEventSeverity;
  message: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
  resolved: boolean;
}

// Security Alert Interface
export interface SecurityAlert {
  id: string;
  type: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
  metadata: Record<string, unknown>;
}

// Security Dashboard Data Interface
export interface SecurityDashboardData {
  metrics: SecurityMetrics;
  recentEvents: SecurityEvent[];
  activeAlerts: SecurityAlert[];
  systemHealth: {
    overall: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    components: {
      authentication: 'HEALTHY' | 'WARNING' | 'CRITICAL';
      encryption: 'HEALTHY' | 'WARNING' | 'CRITICAL';
      api: 'HEALTHY' | 'WARNING' | 'CRITICAL';
      database: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    };
  };
  trends: {
    loginAttempts: number[];
    encryptionOperations: number[];
    securityEvents: number[];
    timeLabels: string[];
  };
}

// Security Monitoring Service Class
export class SecurityMonitoringService {
  private metricsCache: Map<string, SecurityMetrics> = new Map();
  private eventsCache: SecurityEvent[] = [];
  private alertsCache: SecurityAlert[] = [];
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  // Get comprehensive security metrics
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get authentication metrics
      const authMetrics = await this.getAuthenticationMetrics(oneHourAgo, now);
      
      // Get encryption metrics
      const encryptionMetrics = await this.getEncryptionMetrics();
      
      // Get API metrics
      const apiMetrics = await this.getAPIMetrics(oneHourAgo, now);
      
      // Get system metrics
      const systemMetrics = await this.getSystemMetrics();

      const metrics: SecurityMetrics = {
        timestamp: now,
        authentication: authMetrics,
        encryption: encryptionMetrics,
        api: apiMetrics,
        system: systemMetrics
      };

      // Cache the metrics
      this.metricsCache.set('current', metrics);

      return metrics;
    } catch (error) {
      console.error('Failed to get security metrics:', error);
      throw error;
    }
  }

  // Get recent security events
  async getRecentSecurityEvents(limit: number = 50): Promise<SecurityEvent[]> {
    try {
      const result = await pool.query(`
        SELECT 
          id,
          event_type,
          severity,
          message,
          user_id,
          ip_address,
          user_agent,
          metadata,
          created_at,
          resolved
        FROM security_audit_log
        ORDER BY created_at DESC
        LIMIT $1
      `, [limit]);

      const events: SecurityEvent[] = result.rows.map(row => ({
        id: row.id,
        type: row.event_type,
        severity: row.severity,
        message: row.message,
        userId: row.user_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        metadata: row.metadata,
        timestamp: row.created_at,
        resolved: row.resolved || false
      }));

      this.eventsCache = events;
      return events;
    } catch (error) {
      console.error('Failed to get recent security events:', error);
      return [];
    }
  }

  // Get active security alerts
  async getActiveSecurityAlerts(): Promise<SecurityAlert[]> {
    try {
      const result = await pool.query(`
        SELECT 
          id,
          alert_type,
          title,
          description,
          source,
          created_at,
          acknowledged,
          resolved,
          metadata
        FROM security_alerts
        WHERE resolved = false
        ORDER BY created_at DESC
      `);

      const alerts: SecurityAlert[] = result.rows.map(row => ({
        id: row.id,
        type: row.alert_type,
        title: row.title,
        description: row.description,
        source: row.source,
        timestamp: row.created_at,
        acknowledged: row.acknowledged || false,
        resolved: row.resolved || false,
        metadata: row.metadata
      }));

      this.alertsCache = alerts;
      return alerts;
    } catch (error) {
      console.error('Failed to get active security alerts:', error);
      return [];
    }
  }

  // Get security trends data
  async getSecurityTrends(hours: number = 24): Promise<{
    loginAttempts: number[];
    encryptionOperations: number[];
    securityEvents: number[];
    timeLabels: string[];
  }> {
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
      
      // Get hourly data points
      const timeLabels: string[] = [];
      const loginAttempts: number[] = [];
      const encryptionOperations: number[] = [];
      const securityEvents: number[] = [];

      for (let i = hours - 1; i >= 0; i--) {
        const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
        
        timeLabels.push(hourStart.toISOString().substring(11, 16)); // HH:MM format

        // Get login attempts for this hour
        const loginResult = await pool.query(`
          SELECT COUNT(*) as count
          FROM security_audit_log
          WHERE event_type LIKE '%LOGIN%'
          AND created_at >= $1 AND created_at < $2
        `, [hourStart, hourEnd]);
        loginAttempts.push(parseInt(loginResult.rows[0].count));

        // Get encryption operations for this hour
        const encryptionResult = await pool.query(`
          SELECT COUNT(*) as count
          FROM encryption_audit_log
          WHERE created_at >= $1 AND created_at < $2
        `, [hourStart, hourEnd]);
        encryptionOperations.push(parseInt(encryptionResult.rows[0].count));

        // Get security events for this hour
        const eventsResult = await pool.query(`
          SELECT COUNT(*) as count
          FROM security_audit_log
          WHERE severity IN ('HIGH', 'CRITICAL')
          AND created_at >= $1 AND created_at < $2
        `, [hourStart, hourEnd]);
        securityEvents.push(parseInt(eventsResult.rows[0].count));
      }

      return {
        loginAttempts,
        encryptionOperations,
        securityEvents,
        timeLabels
      };
    } catch (error) {
      console.error('Failed to get security trends:', error);
      return {
        loginAttempts: [],
        encryptionOperations: [],
        securityEvents: [],
        timeLabels: []
      };
    }
  }

  // Get comprehensive dashboard data
  async getSecurityDashboardData(): Promise<SecurityDashboardData> {
    try {
      const [metrics, recentEvents, activeAlerts, trends] = await Promise.all([
        this.getSecurityMetrics(),
        this.getRecentSecurityEvents(20),
        this.getActiveSecurityAlerts(),
        this.getSecurityTrends(24)
      ]);

      // Determine system health
      const systemHealth = this.calculateSystemHealth(metrics, activeAlerts);

      return {
        metrics,
        recentEvents,
        activeAlerts,
        systemHealth,
        trends
      };
    } catch (error) {
      console.error('Failed to get security dashboard data:', error);
      throw error;
    }
  }

  // Create security alert
  async createSecurityAlert(
    type: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
    title: string,
    description: string,
    source: string,
    metadata: Record<string, unknown> = {}
  ): Promise<SecurityAlert> {
    try {
      const alertId = crypto.randomUUID();
      
      await pool.query(`
        INSERT INTO security_alerts (id, alert_type, title, description, source, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [alertId, type, title, description, source, JSON.stringify(metadata)]);

      const alert: SecurityAlert = {
        id: alertId,
        type,
        title,
        description,
        source,
        timestamp: new Date(),
        acknowledged: false,
        resolved: false,
        metadata
      };

      // Add to cache
      this.alertsCache.unshift(alert);

      // Log security alert creation
      logSecurityEvent(
        'SECURITY_ALERT_CREATED',
        AuditEventSeverity.MEDIUM,
        {} as Request,
        { alertId, type, title, source }
      );

      return alert;
    } catch (error) {
      console.error('Failed to create security alert:', error);
      throw error;
    }
  }

  // Acknowledge security alert
  async acknowledgeSecurityAlert(alertId: string): Promise<boolean> {
    try {
      await pool.query(`
        UPDATE security_alerts 
        SET acknowledged = true 
        WHERE id = $1
      `, [alertId]);

      // Update cache
      const alertIndex = this.alertsCache.findIndex(alert => alert.id === alertId);
      if (alertIndex !== -1) {
        this.alertsCache[alertIndex].acknowledged = true;
      }

      return true;
    } catch (error) {
      console.error('Failed to acknowledge security alert:', error);
      return false;
    }
  }

  // Resolve security alert
  async resolveSecurityAlert(alertId: string): Promise<boolean> {
    try {
      await pool.query(`
        UPDATE security_alerts 
        SET resolved = true 
        WHERE id = $1
      `, [alertId]);

      // Update cache
      const alertIndex = this.alertsCache.findIndex(alert => alert.id === alertId);
      if (alertIndex !== -1) {
        this.alertsCache[alertIndex].resolved = true;
      }

      return true;
    } catch (error) {
      console.error('Failed to resolve security alert:', error);
      return false;
    }
  }

  // Private helper methods
  private async getAuthenticationMetrics(startTime: Date, endTime: Date): Promise<{
    totalLogins: number;
    failedLogins: number;
    mfaAttempts: number;
    mfaFailures: number;
    activeSessions: number;
  }> {
    try {
      // Get login metrics
      const loginResult = await pool.query(`
        SELECT 
          COUNT(CASE WHEN event_type = 'LOGIN_SUCCESS' THEN 1 END) as total_logins,
          COUNT(CASE WHEN event_type = 'LOGIN_FAILED' THEN 1 END) as failed_logins
        FROM security_audit_log
        WHERE created_at >= $1 AND created_at <= $2
      `, [startTime, endTime]);

      // Get MFA metrics
      const mfaResult = await pool.query(`
        SELECT 
          COUNT(CASE WHEN event_type LIKE '%MFA%' THEN 1 END) as mfa_attempts,
          COUNT(CASE WHEN event_type = 'MFA_VERIFICATION_FAILED' THEN 1 END) as mfa_failures
        FROM security_audit_log
        WHERE created_at >= $1 AND created_at <= $2
      `, [startTime, endTime]);

      // Get active sessions
      const sessionResult = await pool.query(`
        SELECT COUNT(*) as active_sessions
        FROM mfa_sessions
        WHERE expires_at > NOW()
      `);

      return {
        totalLogins: parseInt(loginResult.rows[0].total_logins) || 0,
        failedLogins: parseInt(loginResult.rows[0].failed_logins) || 0,
        mfaAttempts: parseInt(mfaResult.rows[0].mfa_attempts) || 0,
        mfaFailures: parseInt(mfaResult.rows[0].mfa_failures) || 0,
        activeSessions: parseInt(sessionResult.rows[0].active_sessions) || 0
      };
    } catch (error) {
      console.error('Failed to get authentication metrics:', error);
      return {
        totalLogins: 0,
        failedLogins: 0,
        mfaAttempts: 0,
        mfaFailures: 0,
        activeSessions: 0
      };
    }
  }

  private async getEncryptionMetrics(): Promise<{
    totalEncryptions: number;
    totalDecryptions: number;
    activeKeys: number;
    keyRotations: number;
    encryptionRate: number;
  }> {
    try {
      const stats = encryptionService.getEncryptionStats();
      
      // Get key rotations from audit log
      const rotationResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM encryption_audit_log
        WHERE operation = 'ENCRYPTION_KEYS_ROTATED'
        AND created_at >= NOW() - INTERVAL '24 hours'
      `);

      return {
        totalEncryptions: stats.totalEncryptions,
        totalDecryptions: stats.totalDecryptions,
        activeKeys: stats.activeKeys,
        keyRotations: parseInt(rotationResult.rows[0].count) || 0,
        encryptionRate: stats.totalEncryptions > 0 ? (stats.totalDecryptions / stats.totalEncryptions) * 100 : 0
      };
    } catch (error) {
      console.error('Failed to get encryption metrics:', error);
      return {
        totalEncryptions: 0,
        totalDecryptions: 0,
        activeKeys: 0,
        keyRotations: 0,
        encryptionRate: 0
      };
    }
  }

  private async getAPIMetrics(startTime: Date, endTime: Date): Promise<{
    totalRequests: number;
    blockedRequests: number;
    suspiciousRequests: number;
    rateLimitedRequests: number;
  }> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(CASE WHEN event_type = 'API_REQUEST' THEN 1 END) as total_requests,
          COUNT(CASE WHEN event_type = 'SUSPICIOUS_REQUEST' THEN 1 END) as suspicious_requests,
          COUNT(CASE WHEN event_type = 'RATE_LIMITED' THEN 1 END) as rate_limited_requests
        FROM security_audit_log
        WHERE created_at >= $1 AND created_at <= $2
      `, [startTime, endTime]);

      return {
        totalRequests: parseInt(result.rows[0].total_requests) || 0,
        blockedRequests: parseInt(result.rows[0].suspicious_requests) || 0,
        suspiciousRequests: parseInt(result.rows[0].suspicious_requests) || 0,
        rateLimitedRequests: parseInt(result.rows[0].rate_limited_requests) || 0
      };
    } catch (error) {
      console.error('Failed to get API metrics:', error);
      return {
        totalRequests: 0,
        blockedRequests: 0,
        suspiciousRequests: 0,
        rateLimitedRequests: 0
      };
    }
  }

  private async getSystemMetrics(): Promise<{
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    databaseConnections: number;
  }> {
    try {
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();
      
      // Get database connections
      const dbResult = await pool.query(`
        SELECT COUNT(*) as connections
        FROM pg_stat_activity
        WHERE state = 'active'
      `);

      return {
        uptime: Math.floor(uptime),
        memoryUsage: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        cpuUsage: 0, // Would need additional library for CPU usage
        databaseConnections: parseInt(dbResult.rows[0].connections) || 0
      };
    } catch (error) {
      console.error('Failed to get system metrics:', error);
      return {
        uptime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        databaseConnections: 0
      };
    }
  }

  private calculateSystemHealth(metrics: SecurityMetrics, alerts: SecurityAlert[]): {
    overall: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    components: {
      authentication: 'HEALTHY' | 'WARNING' | 'CRITICAL';
      encryption: 'HEALTHY' | 'WARNING' | 'CRITICAL';
      api: 'HEALTHY' | 'WARNING' | 'CRITICAL';
      database: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    };
  } {
    const criticalAlerts = alerts.filter(alert => alert.type === 'CRITICAL' && !alert.resolved);
    const highAlerts = alerts.filter(alert => alert.type === 'HIGH' && !alert.resolved);

    // Calculate component health
    const authentication = this.calculateComponentHealth(
      metrics.authentication.failedLogins,
      metrics.authentication.mfaFailures,
      criticalAlerts.filter(alert => alert.source === 'authentication').length
    );

    const encryption = this.calculateComponentHealth(
      0, // No direct failure metric
      metrics.encryption.encryptionRate < 95 ? 1 : 0, // Low encryption rate
      criticalAlerts.filter(alert => alert.source === 'encryption').length
    );

    const api = this.calculateComponentHealth(
      metrics.api.blockedRequests,
      metrics.api.suspiciousRequests,
      criticalAlerts.filter(alert => alert.source === 'api').length
    );

    const database = this.calculateComponentHealth(
      metrics.system.databaseConnections > 80 ? 1 : 0, // High connection count
      0,
      criticalAlerts.filter(alert => alert.source === 'database').length
    );

    // Calculate overall health
    const componentHealths = [authentication, encryption, api, database];
    const overall = componentHealths.includes('CRITICAL') ? 'CRITICAL' :
                   componentHealths.includes('WARNING') ? 'WARNING' : 'HEALTHY';

    return {
      overall,
      components: {
        authentication,
        encryption,
        api,
        database
      }
    };
  }

  private calculateComponentHealth(
    failureCount: number,
    warningCount: number,
    criticalAlerts: number
  ): 'HEALTHY' | 'WARNING' | 'CRITICAL' {
    if (criticalAlerts > 0 || failureCount > 10) {
      return 'CRITICAL';
    } else if (failureCount > 5 || warningCount > 0) {
      return 'WARNING';
    } else {
      return 'HEALTHY';
    }
  }
}

// Export singleton instance
export const securityMonitoringService = new SecurityMonitoringService();
