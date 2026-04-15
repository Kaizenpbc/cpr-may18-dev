import { query } from './database.js';
import { logSecurityEvent, AuditEventSeverity } from '../middleware/auditLogger.js';

// Initialize MFA database tables
export async function initializeMFADatabase(): Promise<void> {
  try {
    console.log('🔐 Initializing MFA database tables...');

    // Create MFA users table
    await query(`
      CREATE TABLE IF NOT EXISTS mfa_users (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'disabled',
        totp_secret VARCHAR(255),
        totp_backup_codes JSON,
        sms_verified TINYINT(1) DEFAULT 0,
        email_verified TINYINT(1) DEFAULT 0,
        last_mfa_time TIMESTAMP NULL,
        failed_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP NULL,
        trusted_devices JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create MFA codes table for temporary codes (SMS/Email)
    await query(`
      CREATE TABLE IF NOT EXISTS mfa_codes (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        code VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create MFA sessions table for tracking MFA verification sessions
    await query(`
      CREATE TABLE IF NOT EXISTS mfa_sessions (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        session_id VARCHAR(255) NOT NULL,
        device_fingerprint VARCHAR(255),
        mfa_type VARCHAR(50),
        verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create MFA audit log table
    await query(`
      CREATE TABLE IF NOT EXISTS mfa_audit_log (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255),
        event_type VARCHAR(100) NOT NULL,
        event_data JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        success TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_users_user_id ON mfa_users(user_id);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_users_status ON mfa_users(status);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_codes_user_id ON mfa_codes(user_id);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_codes_expires_at ON mfa_codes(expires_at);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_sessions_user_id ON mfa_sessions(user_id);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_sessions_session_id ON mfa_sessions(session_id);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_sessions_expires_at ON mfa_sessions(expires_at);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_user_id ON mfa_audit_log(user_id);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_event_type ON mfa_audit_log(event_type);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_created_at ON mfa_audit_log(created_at);
    `);

    // Clean up expired MFA codes and sessions
    await query(`DELETE FROM mfa_codes WHERE expires_at < NOW()`);
    await query(`DELETE FROM mfa_sessions WHERE expires_at < NOW()`);

    console.log('✅ MFA database tables initialized');
    console.log('✅ MFA indexes created');
    console.log('✅ MFA cleanup functions created');
    console.log('🔐 Cleaned up expired MFA codes and sessions');

    // Log MFA database initialization (using console.log instead of security event during startup)
    console.log('🔐 MFA database initialization completed successfully');

  } catch (error) {
    console.error('❌ MFA database initialization failed:', error);
    throw error;
  }
}

// Get MFA database health
export async function getMFADatabaseHealth(): Promise<{
  status: string;
  tables: string[];
  indexes: number;
  functions: number;
  expiredCodes: number;
  activeSessions: number;
}> {
  try {
    // Check if tables exist
    const tablesResult = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name LIKE 'mfa_%'
    `);

    const tables = tablesResult.rows.map((row: any) => row.table_name);

    // Check indexes (MySQL: information_schema.statistics)
    const indexesResult = await query(`
      SELECT COUNT(*) as count
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
      AND index_name LIKE 'idx_mfa_%'
    `);

    // MySQL has no stored functions for mfa; return 0
    const functionsResult = { rows: [{ count: '0' }] };

    // Count expired codes
    const expiredCodesResult = await query(`
      SELECT COUNT(*) as count
      FROM mfa_codes 
      WHERE expires_at < NOW()
    `);

    // Count active sessions
    const activeSessionsResult = await query(`
      SELECT COUNT(*) as count
      FROM mfa_sessions 
      WHERE expires_at > NOW()
    `);

    return {
      status: 'healthy',
      tables,
      indexes: parseInt(indexesResult.rows[0].count),
      functions: parseInt(functionsResult.rows[0].count),
      expiredCodes: parseInt(expiredCodesResult.rows[0].count),
      activeSessions: parseInt(activeSessionsResult.rows[0].count)
    };

  } catch (error) {
    console.error('MFA database health check error:', error);
    return {
      status: 'unhealthy',
      tables: [],
      indexes: 0,
      functions: 0,
      expiredCodes: 0,
      activeSessions: 0
    };
  }
}

// Cleanup expired MFA data
export async function cleanupExpiredMFAData(): Promise<{
  expiredCodes: number;
  expiredSessions: number;
}> {
  try {
    // Clean up expired codes
    const expiredCodesResult = await query(`
      DELETE FROM mfa_codes WHERE expires_at < NOW()
    `);

    // Clean up expired sessions
    const expiredSessionsResult = await query(`
      DELETE FROM mfa_sessions WHERE expires_at < NOW()
    `);

    return {
      expiredCodes: expiredCodesResult.rowCount || 0,
      expiredSessions: expiredSessionsResult.rowCount || 0
    };

  } catch (error) {
    console.error('MFA cleanup error:', error);
    return {
      expiredCodes: 0,
      expiredSessions: 0
    };
  }
}

export default {
  initializeMFADatabase,
  getMFADatabaseHealth,
  cleanupExpiredMFAData
};
