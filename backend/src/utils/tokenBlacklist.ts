import { pool } from '../config/database.js';

/**
 * Token blacklist utility for invalidating JWT tokens on logout
 */
export class TokenBlacklist {
  /**
   * Add a token to the blacklist
   * @param token - The JWT token to blacklist
   * @param expiresAt - When the token expires (for cleanup)
   */
  static async addToBlacklist(token: string, expiresAt: Date): Promise<void> {
    try {
      const query = `
        INSERT INTO token_blacklist (token_hash, expires_at, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (token_hash) DO NOTHING
      `;
      
      // Hash the token for storage (don't store the actual token)
      const tokenHash = this.hashToken(token);
      
      await pool.query(query, [tokenHash, expiresAt]);
      console.log('🔐 [BLACKLIST] Token added to blacklist');
    } catch (error) {
      console.error('❌ [BLACKLIST] Failed to add token to blacklist:', error);
      throw error;
    }
  }

  /**
   * Check if a token is blacklisted
   * @param token - The JWT token to check
   * @returns True if the token is blacklisted, false otherwise
   */
  static async isBlacklisted(token: string): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM token_blacklist
        WHERE token_hash = $1
      `;
      
      const tokenHash = this.hashToken(token);
      const result = await pool.query(query, [tokenHash]);
      
      const isBlacklisted = parseInt(result.rows[0].count) > 0;
      if (isBlacklisted) {
        console.log('🔐 [BLACKLIST] Token found in blacklist');
      }
      
      return isBlacklisted;
    } catch (error) {
      console.error('❌ [BLACKLIST] Failed to check token blacklist:', error);
      // If we can't check the blacklist, assume the token is valid
      return false;
    }
  }

  /**
   * Clean up expired tokens from the blacklist
   */
  static async cleanupExpiredTokens(): Promise<void> {
    try {
      const query = `
        DELETE FROM token_blacklist
        WHERE expires_at < NOW()
      `;
      
      const result = await pool.query(query);
      console.log(`🔐 [BLACKLIST] Cleaned up ${result.rowCount} expired tokens`);
    } catch (error) {
      console.error('❌ [BLACKLIST] Failed to cleanup expired tokens:', error);
    }
  }

  /**
   * Hash a token for storage (using a simple hash for now)
   * In production, use a proper cryptographic hash
   * @param token - The JWT token to hash
   * @returns The hashed token
   */
  private static hashToken(token: string): string {
    // Simple hash function - in production, use crypto.createHash('sha256')
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}

/**
 * Initialize the token blacklist table if it doesn't exist
 */
export async function initializeTokenBlacklist(): Promise<void> {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS token_blacklist (
        id SERIAL PRIMARY KEY,
        token_hash VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    await pool.query(createTableQuery);
    console.log('✅ [BLACKLIST] Token blacklist table initialized');
    
    // Create indexes separately to avoid PostgreSQL syntax issues
    try {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_token_blacklist_hash ON token_blacklist (token_hash)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist (expires_at)');
      console.log('✅ [BLACKLIST] Indexes created');
    } catch (indexError) {
      console.log('⚠️ [BLACKLIST] Index creation failed (non-critical):', indexError);
    }
    
    // Clean up expired tokens on startup
    await TokenBlacklist.cleanupExpiredTokens();
  } catch (error) {
    console.error('❌ [BLACKLIST] Failed to initialize token blacklist:', error);
  }
} 