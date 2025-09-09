import { pool } from './database.js';
import { logSecurityEvent, AuditEventSeverity } from '../middleware/auditLogger.js';

// Initialize MFA database tables
export async function initializeMFADatabase(): Promise<void> {
  try {
    console.log('🔐 Initializing MFA database tables...');

    // Create MFA users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mfa_users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'disabled',
        totp_secret VARCHAR(255),
        totp_backup_codes TEXT[],
        sms_verified BOOLEAN DEFAULT FALSE,
        email_verified BOOLEAN DEFAULT FALSE,
        last_mfa_time TIMESTAMP,
        failed_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        trusted_devices TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create MFA codes table for temporary codes (SMS/Email)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mfa_codes (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        code VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create MFA sessions table for tracking MFA verification sessions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mfa_sessions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        session_id VARCHAR(255) NOT NULL,
        device_fingerprint VARCHAR(255),
        mfa_type VARCHAR(50),
        verified_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create MFA audit log table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mfa_audit_log (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255),
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB,
        ip_address INET,
        user_agent TEXT,
        success BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_users_user_id ON mfa_users(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_users_status ON mfa_users(status);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_codes_user_id ON mfa_codes(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_codes_expires_at ON mfa_codes(expires_at);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_sessions_user_id ON mfa_sessions(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_sessions_session_id ON mfa_sessions(session_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_sessions_expires_at ON mfa_sessions(expires_at);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_user_id ON mfa_audit_log(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_event_type ON mfa_audit_log(event_type);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_created_at ON mfa_audit_log(created_at);
    `);

    // Create function to clean up expired MFA codes
    await pool.query(`
      CREATE OR REPLACE FUNCTION cleanup_expired_mfa_codes()
      RETURNS void AS $$
      BEGIN
        DELETE FROM mfa_codes WHERE expires_at < NOW();
        DELETE FROM mfa_sessions WHERE expires_at < NOW();
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create function to update updated_at timestamp
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_mfa_users_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger for updated_at
    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_mfa_users_updated_at ON mfa_users;
      CREATE TRIGGER trigger_update_mfa_users_updated_at
        BEFORE UPDATE ON mfa_users
        FOR EACH ROW
        EXECUTE FUNCTION update_mfa_users_updated_at();
    `);

    // Clean up expired codes
    await pool.query('SELECT cleanup_expired_mfa_codes();');

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
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'mfa_%'
    `);

    const tables = tablesResult.rows.map(row => row.table_name);

    // Check indexes
    const indexesResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_mfa_%'
    `);

    // Check functions
    const functionsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM pg_proc 
      WHERE proname LIKE '%mfa%'
    `);

    // Count expired codes
    const expiredCodesResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM mfa_codes 
      WHERE expires_at < NOW()
    `);

    // Count active sessions
    const activeSessionsResult = await pool.query(`
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
    const expiredCodesResult = await pool.query(`
      DELETE FROM mfa_codes WHERE expires_at < NOW()
    `);

    // Clean up expired sessions
    const expiredSessionsResult = await pool.query(`
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
