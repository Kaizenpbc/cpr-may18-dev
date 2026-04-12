import { pool, query as dbQuery, getClient as getDbClient, QueryResult } from './database.js';
import { DatabaseAccessLogger, DatabaseConnectionMonitor } from './databaseSecurity.js';
import { logSecurityEvent, AuditEventSeverity } from '../middleware/auditLogger.js';
import crypto from 'crypto';

type DbClient = Awaited<ReturnType<typeof getDbClient>>;

// Secure database wrapper class
export class SecureDatabase {
  private accessLogger: DatabaseAccessLogger;
  private connectionMonitor: DatabaseConnectionMonitor;

  constructor() {
    this.accessLogger = DatabaseAccessLogger.getInstance();
    this.connectionMonitor = DatabaseConnectionMonitor.getInstance();
  }

  // Secure query execution with logging and monitoring
  public async query<T = Record<string, any>>(
    text: string,
    params?: unknown[],
    userId?: string
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const queryId = crypto.randomUUID();

    try {
      console.log(`[DB Query ${queryId}] Starting: ${text.substring(0, 100)}...`);
      const result = await dbQuery<T>(text, params as any[]);
      const duration = Date.now() - startTime;
      this.accessLogger.logQuery(text, params as any[] || [], duration, userId);
      console.log(`[DB Query ${queryId}] Completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[DB Query ${queryId}] Failed after ${duration}ms:`, error);
      logSecurityEvent(
        'DATABASE_QUERY_ERROR',
        AuditEventSeverity.MEDIUM,
        { userId } as any,
        {
          query: text.substring(0, 500),
          error: error instanceof Error ? error.message : 'Unknown error',
          duration,
          queryId
        }
      );
      throw error;
    }
  }

  // Get a client with connection tracking
  public async getClient(): Promise<DbClient> {
    const client = await getDbClient();
    const connectionId = crypto.randomUUID();
    this.connectionMonitor.trackConnection(connectionId);
    return client;
  }

  // Transaction wrapper with security logging
  public async transaction<T>(
    callback: (client: DbClient) => Promise<T>,
    userId?: string
  ): Promise<T> {
    const client = await this.getClient();
    const transactionId = crypto.randomUUID();

    try {
      await client.query('BEGIN');
      console.log(`[Transaction ${transactionId}] Started`);
      const result = await callback(client);
      await client.query('COMMIT');
      console.log(`[Transaction ${transactionId}] Committed`);
      logSecurityEvent(
        'DATABASE_TRANSACTION_SUCCESS',
        AuditEventSeverity.LOW,
        { userId } as any,
        { transactionId, timestamp: new Date().toISOString() }
      );
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`[Transaction ${transactionId}] Rolled back:`, error);
      logSecurityEvent(
        'DATABASE_TRANSACTION_FAILURE',
        AuditEventSeverity.MEDIUM,
        { userId } as any,
        {
          transactionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      );
      throw error;
    } finally {
      client.release();
    }
  }

  // Health check with security monitoring
  public async healthCheck(): Promise<{
    healthy: boolean;
    stats: Record<string, unknown> | null;
    security: Record<string, unknown>;
  }> {
    try {
      const startTime = Date.now();
      await dbQuery('SELECT 1');
      const responseTime = Date.now() - startTime;
      const stats = this.connectionMonitor.getConnectionStats();
      const queryStats = this.accessLogger.getStats();
      return {
        healthy: true,
        stats: { responseTime, ...stats, ...queryStats },
        security: { sslEnabled: false, connectionEncrypted: false, auditLogging: true }
      };
    } catch (error) {
      return {
        healthy: false,
        stats: null,
        security: {
          sslEnabled: false,
          connectionEncrypted: false,
          auditLogging: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // Graceful shutdown
  public async close(): Promise<void> {
    try {
      console.log('🔄 Closing secure database connections...');
      await pool.end();
      console.log('✅ Secure database connections closed');
    } catch (error) {
      console.error('❌ Error closing secure database connections:', error);
      throw error;
    }
  }
}

// Singleton instance
let secureDbInstance: SecureDatabase | null = null;

export const getSecureDatabase = (): SecureDatabase => {
  if (!secureDbInstance) {
    secureDbInstance = new SecureDatabase();
  }
  return secureDbInstance;
};

// Initialize secure database
export const initializeSecureDatabase = async (): Promise<void> => {
  console.log('🔐 Initializing secure database...');
  const db = getSecureDatabase();
  const health = await db.healthCheck();
  if (!health.healthy) {
    throw new Error('Failed to initialize secure database connection');
  }
  console.log('✅ Secure database initialized');
  console.log(`📊 Database stats:`, health.stats);
};

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  if (secureDbInstance) {
    await secureDbInstance.close();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (secureDbInstance) {
    await secureDbInstance.close();
  }
  process.exit(0);
});
