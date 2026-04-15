import { query } from './database.js';
import { encryptionService } from './encryptionConfig.js';

// Initialize encryption database tables
export async function initializeEncryptionDatabase(): Promise<void> {
  try {
    console.log('🔐 Initializing encryption database tables...');

    // Create encryption keys table
    await query(`
      CREATE TABLE IF NOT EXISTS encryption_keys (
        id VARCHAR(255) PRIMARY KEY,
        key_data LONGBLOB NOT NULL,
        algorithm VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        last_used TIMESTAMP NULL,
        usage_count INTEGER DEFAULT 0,
        metadata JSON,
        created_by VARCHAR(255) DEFAULT 'system'
      )
    `);

    // Create encryption audit log table
    await query(`
      CREATE TABLE IF NOT EXISTS encryption_audit_log (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        operation VARCHAR(100) NOT NULL,
        table_name VARCHAR(255),
        field_name VARCHAR(255),
        key_id VARCHAR(255),
        algorithm VARCHAR(50),
        data_length INTEGER,
        success TINYINT(1) DEFAULT 1,
        error_message TEXT,
        user_id VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create encryption statistics table
    await query(`
      CREATE TABLE IF NOT EXISTS encryption_statistics (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        total_encryptions INTEGER DEFAULT 0,
        total_decryptions INTEGER DEFAULT 0,
        total_keys INTEGER DEFAULT 0,
        active_keys INTEGER DEFAULT 0,
        rotating_keys INTEGER DEFAULT 0,
        archived_keys INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_encryption_keys_status ON encryption_keys(status);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_encryption_keys_created_at ON encryption_keys(created_at);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_encryption_keys_expires_at ON encryption_keys(expires_at);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_encryption_audit_log_operation ON encryption_audit_log(operation);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_encryption_audit_log_table_name ON encryption_audit_log(table_name);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_encryption_audit_log_created_at ON encryption_audit_log(created_at);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_encryption_statistics_date ON encryption_statistics(date);
    `);

    // Clean up expired keys (archive rotating keys that have passed expiry)
    await query(`
      UPDATE encryption_keys
      SET status = 'archived'
      WHERE expires_at < NOW() AND status = 'rotating'
    `);

    // Ensure today's statistics row exists
    await query(`
      INSERT IGNORE INTO encryption_statistics (date, total_encryptions, total_decryptions, total_keys, active_keys, rotating_keys, archived_keys)
      VALUES (CURRENT_DATE, 0, 0, 0, 0, 0, 0)
    `);

    console.log('✅ Encryption database tables initialized');
    console.log('✅ Encryption indexes created');
    console.log('✅ Encryption cleanup functions created');
    console.log('🔐 Cleaned up expired encryption keys');

    // Log encryption database initialization
    console.log('🔐 Encryption database initialization completed successfully');

  } catch (error) {
    console.error('❌ Encryption database initialization failed:', error);
    throw error;
  }
}

// Get encryption database health
export async function getEncryptionDatabaseHealth(): Promise<{
  status: string;
  tables: string[];
  indexes: number;
  functions: number;
  totalKeys: number;
  activeKeys: number;
  expiredKeys: number;
}> {
  try {
    // Check if tables exist
    const tablesResult = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name LIKE 'encryption_%'
    `);

    const tables = tablesResult.rows.map((row: any) => row.table_name);

    // Check indexes (MySQL: information_schema.statistics)
    const indexesResult = await query(`
      SELECT COUNT(*) as count
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
      AND index_name LIKE 'idx_encryption_%'
    `);

    // MySQL has no stored functions for encryption; return 0
    const functionsResult = { rows: [{ count: '0' }] };

    // Count keys
    const keysResult = await query<any>(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN expires_at < NOW() AND status = 'rotating' THEN 1 END) as expired
      FROM encryption_keys
    `);

    return {
      status: 'healthy',
      tables,
      indexes: parseInt(indexesResult.rows[0].count),
      functions: parseInt(functionsResult.rows[0].count),
      totalKeys: parseInt(keysResult.rows[0].total),
      activeKeys: parseInt(keysResult.rows[0].active),
      expiredKeys: parseInt(keysResult.rows[0].expired)
    };

  } catch (error) {
    console.error('Encryption database health check error:', error);
    return {
      status: 'unhealthy',
      tables: [],
      indexes: 0,
      functions: 0,
      totalKeys: 0,
      activeKeys: 0,
      expiredKeys: 0
    };
  }
}

// Cleanup expired encryption data
export async function cleanupExpiredEncryptionData(): Promise<{
  expiredKeys: number;
  oldAuditLogs: number;
}> {
  try {
    // Clean up expired keys
    const expiredKeysResult = await query(`
      UPDATE encryption_keys 
      SET status = 'archived' 
      WHERE expires_at < NOW() 
      AND status = 'rotating'
    `);

    // Clean up old audit logs (older than 1 year)
    const oldAuditLogsResult = await query(`
      DELETE FROM encryption_audit_log 
      WHERE created_at < NOW() - INTERVAL 1 YEAR
    `);

    return {
      expiredKeys: expiredKeysResult.rowCount || 0,
      oldAuditLogs: oldAuditLogsResult.rowCount || 0
    };

  } catch (error) {
    console.error('Encryption cleanup error:', error);
    return {
      expiredKeys: 0,
      oldAuditLogs: 0
    };
  }
}

// Store encryption key in database
export async function storeEncryptionKey(keyId: string, keyData: Buffer, algorithm: string, metadata: any): Promise<void> {
  try {
    await query(`
      INSERT INTO encryption_keys (id, key_data, algorithm, status, metadata, created_by)
      VALUES ($1, $2, $3, 'active', $4, 'system')
      ON DUPLICATE KEY UPDATE
      key_data = VALUES(key_data),
      algorithm = VALUES(algorithm),
      metadata = VALUES(metadata)
    `, [keyId, keyData, algorithm, JSON.stringify(metadata)]);
  } catch (error) {
    console.error('Failed to store encryption key:', error);
    throw error;
  }
}

// Get encryption key from database
export async function getEncryptionKey(keyId: string): Promise<{
  id: string;
  keyData: Buffer;
  algorithm: string;
  status: string;
  createdAt: Date;
  expiresAt?: Date;
  lastUsed?: Date;
  usageCount: number;
  metadata: any;
} | null> {
  try {
    const result = await query(`
      SELECT id, key_data, algorithm, status, created_at, expires_at, last_used, usage_count, metadata
      FROM encryption_keys
      WHERE id = $1
    `, [keyId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      keyData: row.key_data,
      algorithm: row.algorithm,
      status: row.status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      lastUsed: row.last_used,
      usageCount: row.usage_count,
      metadata: row.metadata
    };
  } catch (error) {
    console.error('Failed to get encryption key:', error);
    return null;
  }
}

// Update encryption key usage
export async function updateEncryptionKeyUsage(keyId: string): Promise<void> {
  try {
    await query(`
      UPDATE encryption_keys 
      SET usage_count = usage_count + 1, last_used = NOW()
      WHERE id = $1
    `, [keyId]);
  } catch (error) {
    console.error('Failed to update encryption key usage:', error);
  }
}

export default {
  initializeEncryptionDatabase,
  getEncryptionDatabaseHealth,
  cleanupExpiredEncryptionData,
  storeEncryptionKey,
  getEncryptionKey,
  updateEncryptionKeyUsage
};
