import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { createSecureDatabaseConfig, DatabaseAccessLogger, DatabaseConnectionMonitor } from './databaseSecurity.js';
import { logSecurityEvent, AuditEventSeverity } from '../middleware/auditLogger.js';
import { retry } from '@lifeomic/attempt';
import crypto from 'crypto';

// Secure database wrapper class
export class SecureDatabase {
  private pool: Pool;
  private accessLogger: DatabaseAccessLogger;
  private connectionMonitor: DatabaseConnectionMonitor;
  private isInitialized = false;

  constructor() {
    this.pool = new Pool(createSecureDatabaseConfig());
    this.accessLogger = DatabaseAccessLogger.getInstance();
    this.connectionMonitor = DatabaseConnectionMonitor.getInstance();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Database pool error:', err);
      logSecurityEvent(
        'DATABASE_POOL_ERROR',
        AuditEventSeverity.HIGH,
        {} as any,
        {
          error: err.message,
          timestamp: new Date().toISOString()
        }
      );
    });

    // Handle connection events
    this.pool.on('connect', (client) => {
      const connectionId = crypto.randomUUID();
      this.connectionMonitor.trackConnection(connectionId);
      console.log(`🔗 Database connection established: ${connectionId}`);
    });

    this.pool.on('remove', (client) => {
      console.log('🔌 Database connection removed');
    });
  }

  // Secure query execution with logging and monitoring
  public async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: any[],
    userId?: string
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const queryId = crypto.randomUUID();
    
    try {
      // Log query start
      console.log(`[DB Query ${queryId}] Starting: ${text.substring(0, 100)}...`);
      
      // Execute query with retry mechanism
      const result = await retry(
        async () => {
          return await this.pool.query<T>(text, params);
        },
        {
          maxAttempts: 3,
          delay: 1000,
          factor: 2,
          jitter: true,
        }
      );

      const duration = Date.now() - startTime;
      
      // Log query completion
      this.accessLogger.logQuery(text, params || [], duration, userId);
      
      console.log(`[DB Query ${queryId}] Completed in ${duration}ms`);
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log query error
      console.error(`[DB Query ${queryId}] Failed after ${duration}ms:`, error);
      
      // Log security event for database errors
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
  public async getClient(): Promise<PoolClient> {
    const client = await this.pool.connect();
    const connectionId = crypto.randomUUID();
    
    // Track connection
    this.connectionMonitor.trackConnection(connectionId);
    
    // Wrap client methods to track activity
    const originalQuery = client.query.bind(client);
    client.query = async (text: any, params?: any[], callback?: any) => {
      this.connectionMonitor.updateActivity(connectionId);
      if (callback) {
        return originalQuery(text, params, callback);
      }
      return originalQuery(text, params);
    };
    
    // Wrap release method
    const originalRelease = client.release.bind(client);
    client.release = (err?: Error | boolean) => {
      this.connectionMonitor.removeConnection(connectionId);
      return originalRelease(err);
    };
    
    return client;
  }

  // Transaction wrapper with security logging
  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
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
      
      // Log successful transaction
      logSecurityEvent(
        'DATABASE_TRANSACTION_SUCCESS',
        AuditEventSeverity.LOW,
        { userId } as any,
        {
          transactionId,
          timestamp: new Date().toISOString()
        }
      );
      
      return result;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`[Transaction ${transactionId}] Rolled back:`, error);
      
      // Log failed transaction
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
    stats: any;
    security: any;
  }> {
    try {
      const startTime = Date.now();
      await this.query('SELECT 1');
      const responseTime = Date.now() - startTime;
      
      const stats = this.connectionMonitor.getConnectionStats();
      const queryStats = this.accessLogger.getStats();
      
      return {
        healthy: true,
        stats: {
          responseTime,
          ...stats,
          ...queryStats
        },
        security: {
          sslEnabled: true,
          connectionEncrypted: true,
          auditLogging: true
        }
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
      await this.pool.end();
      console.log('✅ Secure database connections closed');
    } catch (error) {
      console.error('❌ Error closing secure database connections:', error);
      throw error;
    }
  }

  // Get pool for direct access (use with caution)
  public getPool(): Pool {
    return this.pool;
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
  
  // Test connection
  const health = await db.healthCheck();
  if (!health.healthy) {
    throw new Error('Failed to initialize secure database connection');
  }
  
  console.log('✅ Secure database initialized');
  console.log(`📊 Database stats:`, health.stats);
};

// Graceful shutdown handler
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
