import { pool } from '../config/database.js';
import { createHash } from 'crypto';

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
    } catch (error) {
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
      
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
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
      
      await pool.query(query);
    } catch (error) {
      // Cleanup failure is non-critical, continue silently
    }
  }

  /**
   * Hash a token for storage using SHA-256
   * @param token - The JWT token to hash
   * @returns The hashed token (hex string)
   */
  private static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
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

    // Create indexes separately to avoid PostgreSQL syntax issues
    try {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_token_blacklist_hash ON token_blacklist (token_hash)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist (expires_at)');
    } catch {
      // Index creation failure is non-critical
    }

    // Clean up expired tokens on startup
    await TokenBlacklist.cleanupExpiredTokens();
  } catch {
    // Initialization failure - table may already exist or DB unavailable
  }
} 