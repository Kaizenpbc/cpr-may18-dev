import { pool } from './database.js';

// Initialize security monitoring database tables
export async function initializeSecurityMonitoringDatabase(): Promise<void> {
  try {
    console.log('🔐 Initializing security monitoring database tables...');

    // Create security alerts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS security_alerts (
        id VARCHAR(255) PRIMARY KEY,
        alert_type VARCHAR(50) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        source VARCHAR(255) NOT NULL,
        metadata JSONB,
        acknowledged BOOLEAN DEFAULT FALSE,
        resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create security metrics table for historical data
    await pool.query(`
      CREATE TABLE IF NOT EXISTS security_metrics (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        hour INTEGER NOT NULL,
        authentication_logins INTEGER DEFAULT 0,
        authentication_failures INTEGER DEFAULT 0,
        mfa_attempts INTEGER DEFAULT 0,
        mfa_failures INTEGER DEFAULT 0,
        encryption_operations INTEGER DEFAULT 0,
        api_requests INTEGER DEFAULT 0,
        api_blocked INTEGER DEFAULT 0,
        security_events INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create security dashboard cache table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS security_dashboard_cache (
        id SERIAL PRIMARY KEY,
        cache_key VARCHAR(255) UNIQUE NOT NULL,
        cache_data JSONB NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create security monitoring configuration table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS security_monitoring_config (
        id SERIAL PRIMARY KEY,
        config_key VARCHAR(255) UNIQUE NOT NULL,
        config_value JSONB NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(alert_type);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(resolved);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_security_alerts_source ON security_alerts(source);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_security_metrics_date_hour ON security_metrics(date, hour);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_security_metrics_date ON security_metrics(date);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_security_dashboard_cache_key ON security_dashboard_cache(cache_key);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_security_dashboard_cache_expires ON security_dashboard_cache(expires_at);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_security_monitoring_config_key ON security_monitoring_config(config_key);
    `);

    // Create function to clean up expired cache entries
    await pool.query(`
      CREATE OR REPLACE FUNCTION cleanup_expired_security_cache()
      RETURNS void AS $$
      BEGIN
        DELETE FROM security_dashboard_cache WHERE expires_at < NOW();
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create function to update security metrics
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_security_metrics(
        p_date DATE,
        p_hour INTEGER,
        p_logins INTEGER DEFAULT 0,
        p_failures INTEGER DEFAULT 0,
        p_mfa_attempts INTEGER DEFAULT 0,
        p_mfa_failures INTEGER DEFAULT 0,
        p_encryption_ops INTEGER DEFAULT 0,
        p_api_requests INTEGER DEFAULT 0,
        p_api_blocked INTEGER DEFAULT 0,
        p_security_events INTEGER DEFAULT 0
      )
      RETURNS void AS $$
      BEGIN
        INSERT INTO security_metrics (
          date, hour, authentication_logins, authentication_failures,
          mfa_attempts, mfa_failures, encryption_operations,
          api_requests, api_blocked, security_events
        )
        VALUES (
          p_date, p_hour, p_logins, p_failures,
          p_mfa_attempts, p_mfa_failures, p_encryption_ops,
          p_api_requests, p_api_blocked, p_security_events
        )
        ON CONFLICT (date, hour) DO UPDATE SET
          authentication_logins = security_metrics.authentication_logins + p_logins,
          authentication_failures = security_metrics.authentication_failures + p_failures,
          mfa_attempts = security_metrics.mfa_attempts + p_mfa_attempts,
          mfa_failures = security_metrics.mfa_failures + p_mfa_failures,
          encryption_operations = security_metrics.encryption_operations + p_encryption_ops,
          api_requests = security_metrics.api_requests + p_api_requests,
          api_blocked = security_metrics.api_blocked + p_api_blocked,
          security_events = security_metrics.security_events + p_security_events;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create function to update updated_at timestamp
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_security_alerts_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger for updated_at
    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_security_alerts_updated_at ON security_alerts;
      CREATE TRIGGER trigger_update_security_alerts_updated_at
        BEFORE UPDATE ON security_alerts
        FOR EACH ROW
        EXECUTE FUNCTION update_security_alerts_updated_at();
    `);

    // Create trigger for security_monitoring_config updated_at
    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_security_monitoring_config_updated_at ON security_monitoring_config;
      CREATE TRIGGER trigger_update_security_monitoring_config_updated_at
        BEFORE UPDATE ON security_monitoring_config
        FOR EACH ROW
        EXECUTE FUNCTION update_security_alerts_updated_at();
    `);

    // Clean up expired cache entries
    await pool.query('SELECT cleanup_expired_security_cache();');

    // Insert default monitoring configuration
    await pool.query(`
      INSERT INTO security_monitoring_config (config_key, config_value, description)
      VALUES 
        ('alert_thresholds', '{"failed_logins": 5, "mfa_failures": 3, "suspicious_requests": 10, "encryption_errors": 1}', 'Thresholds for generating security alerts'),
        ('monitoring_intervals', '{"metrics_collection": 300, "cache_refresh": 60, "health_check": 30}', 'Intervals for various monitoring operations'),
        ('retention_periods', '{"metrics": 90, "events": 30, "alerts": 365, "cache": 1}', 'Data retention periods in days')
      ON CONFLICT (config_key) DO NOTHING;
    `);

    console.log('✅ Security monitoring database tables initialized');
    console.log('✅ Security monitoring indexes created');
    console.log('✅ Security monitoring functions created');
    console.log('🔐 Cleaned up expired security cache entries');

    // Log security monitoring database initialization
    console.log('🔐 Security monitoring database initialization completed successfully');

  } catch (error) {
    console.error('❌ Security monitoring database initialization failed:', error);
    throw error;
  }
}

// Get security monitoring database health
export async function getSecurityMonitoringDatabaseHealth(): Promise<{
  status: string;
  tables: string[];
  indexes: number;
  functions: number;
  totalAlerts: number;
  activeAlerts: number;
  cacheEntries: number;
}> {
  try {
    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'security_%'
    `);

    const tables = tablesResult.rows.map(row => row.table_name);

    // Check indexes
    const indexesResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_security_%'
    `);

    // Check functions
    const functionsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM pg_proc 
      WHERE proname LIKE '%security%'
    `);

    // Count alerts
    const alertsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN resolved = false THEN 1 END) as active
      FROM security_alerts
    `);

    // Count cache entries
    const cacheResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM security_dashboard_cache
      WHERE expires_at > NOW()
    `);

    return {
      status: 'healthy',
      tables,
      indexes: parseInt(indexesResult.rows[0].count),
      functions: parseInt(functionsResult.rows[0].count),
      totalAlerts: parseInt(alertsResult.rows[0].total),
      activeAlerts: parseInt(alertsResult.rows[0].active),
      cacheEntries: parseInt(cacheResult.rows[0].count)
    };

  } catch (error) {
    console.error('Security monitoring database health check error:', error);
    return {
      status: 'unhealthy',
      tables: [],
      indexes: 0,
      functions: 0,
      totalAlerts: 0,
      activeAlerts: 0,
      cacheEntries: 0
    };
  }
}

// Cleanup expired security monitoring data
export async function cleanupExpiredSecurityMonitoringData(): Promise<{
  expiredCacheEntries: number;
  oldMetrics: number;
  oldAlerts: number;
}> {
  try {
    // Clean up expired cache entries
    const expiredCacheResult = await pool.query(`
      DELETE FROM security_dashboard_cache WHERE expires_at < NOW()
    `);

    // Clean up old metrics (older than 90 days)
    const oldMetricsResult = await pool.query(`
      DELETE FROM security_metrics WHERE date < NOW() - INTERVAL '90 days'
    `);

    // Clean up old resolved alerts (older than 1 year)
    const oldAlertsResult = await pool.query(`
      DELETE FROM security_alerts 
      WHERE resolved = true 
      AND created_at < NOW() - INTERVAL '1 year'
    `);

    return {
      expiredCacheEntries: expiredCacheResult.rowCount || 0,
      oldMetrics: oldMetricsResult.rowCount || 0,
      oldAlerts: oldAlertsResult.rowCount || 0
    };

  } catch (error) {
    console.error('Security monitoring cleanup error:', error);
    return {
      expiredCacheEntries: 0,
      oldMetrics: 0,
      oldAlerts: 0
    };
  }
}

// Store security metrics
export async function storeSecurityMetrics(
  date: Date,
  hour: number,
  metrics: {
    logins?: number;
    failures?: number;
    mfaAttempts?: number;
    mfaFailures?: number;
    encryptionOps?: number;
    apiRequests?: number;
    apiBlocked?: number;
    securityEvents?: number;
  }
): Promise<void> {
  try {
    await pool.query(`
      SELECT update_security_metrics(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
    `, [
      date,
      hour,
      metrics.logins || 0,
      metrics.failures || 0,
      metrics.mfaAttempts || 0,
      metrics.mfaFailures || 0,
      metrics.encryptionOps || 0,
      metrics.apiRequests || 0,
      metrics.apiBlocked || 0,
      metrics.securityEvents || 0
    ]);
  } catch (error) {
    console.error('Failed to store security metrics:', error);
    throw error;
  }
}

// Get security monitoring configuration
export async function getSecurityMonitoringConfig(key: string): Promise<any> {
  try {
    const result = await pool.query(`
      SELECT config_value
      FROM security_monitoring_config
      WHERE config_key = $1
    `, [key]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].config_value;
  } catch (error) {
    console.error('Failed to get security monitoring config:', error);
    return null;
  }
}

// Update security monitoring configuration
export async function updateSecurityMonitoringConfig(key: string, value: any): Promise<void> {
  try {
    await pool.query(`
      INSERT INTO security_monitoring_config (config_key, config_value)
      VALUES ($1, $2)
      ON CONFLICT (config_key) DO UPDATE SET
      config_value = $2,
      updated_at = NOW()
    `, [key, JSON.stringify(value)]);
  } catch (error) {
    console.error('Failed to update security monitoring config:', error);
    throw error;
  }
}

export default {
  initializeSecurityMonitoringDatabase,
  getSecurityMonitoringDatabaseHealth,
  cleanupExpiredSecurityMonitoringData,
  storeSecurityMetrics,
  getSecurityMonitoringConfig,
  updateSecurityMonitoringConfig
};
