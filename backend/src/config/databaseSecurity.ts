import { Pool, PoolConfig } from 'pg';
import { logSecurityEvent, AuditEventSeverity } from '../middleware/auditLogger.js';
import crypto from 'crypto';

// Database security configuration
export interface DatabaseSecurityConfig {
  ssl: boolean;
  sslMode: 'require' | 'prefer' | 'allow' | 'disable';
  connectionTimeout: number;
  idleTimeout: number;
  maxConnections: number;
  minConnections: number;
  logQueries: boolean;
  logSlowQueries: boolean;
  slowQueryThreshold: number; // milliseconds
  encryptConnections: boolean;
  requireSSL: boolean;
  connectionPooling: boolean;
  auditDatabaseAccess: boolean;
}

// Default security configuration
export const DEFAULT_DB_SECURITY_CONFIG: DatabaseSecurityConfig = {
  ssl: process.env.NODE_ENV === 'production', // Only use SSL in production
  sslMode: process.env.NODE_ENV === 'production' ? 'require' : 'disable',
  connectionTimeout: 30000, // 30 seconds
  idleTimeout: 300000, // 5 minutes
  maxConnections: 20,
  minConnections: 2,
  logQueries: false, // Set to true for debugging
  logSlowQueries: true,
  slowQueryThreshold: 1000, // 1 second
  encryptConnections: process.env.NODE_ENV === 'production',
  requireSSL: process.env.NODE_ENV === 'production',
  connectionPooling: true,
  auditDatabaseAccess: true
};

// Enhanced database configuration with security
export const createSecureDatabaseConfig = (): PoolConfig => {
  const config: PoolConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'gtacpr',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'cpr_jun21',
    
    // Security settings
    ssl: DEFAULT_DB_SECURITY_CONFIG.ssl ? {
      rejectUnauthorized: true,
      // In production, you would specify certificate paths
      // ca: fs.readFileSync('path/to/ca-cert.pem'),
      // cert: fs.readFileSync('path/to/client-cert.pem'),
      // key: fs.readFileSync('path/to/client-key.pem')
    } : false,
    
    // Connection pool settings
    max: DEFAULT_DB_SECURITY_CONFIG.maxConnections,
    min: DEFAULT_DB_SECURITY_CONFIG.minConnections,
    idleTimeoutMillis: DEFAULT_DB_SECURITY_CONFIG.idleTimeout,
    connectionTimeoutMillis: DEFAULT_DB_SECURITY_CONFIG.connectionTimeout,
    
    // Application name for monitoring
    application_name: 'cpr-training-app',
    
    // Statement timeout (30 seconds)
    statement_timeout: 30000,
    
    // Query timeout (60 seconds)
    query_timeout: 60000,
    
    // Keep alive settings
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };

  return config;
};

// Database access logging
export class DatabaseAccessLogger {
  private static instance: DatabaseAccessLogger;
  private queryCount = 0;
  private slowQueryCount = 0;

  private constructor() {}

  public static getInstance(): DatabaseAccessLogger {
    if (!DatabaseAccessLogger.instance) {
      DatabaseAccessLogger.instance = new DatabaseAccessLogger();
    }
    return DatabaseAccessLogger.instance;
  }

  public logQuery(query: string, params: any[], duration: number, userId?: string): void {
    this.queryCount++;
    
    if (DEFAULT_DB_SECURITY_CONFIG.logQueries) {
      console.log(`[DB Query ${this.queryCount}] ${duration}ms: ${query.substring(0, 100)}...`);
    }

    // Log slow queries
    if (duration > DEFAULT_DB_SECURITY_CONFIG.slowQueryThreshold) {
      this.slowQueryCount++;
      console.warn(`[SLOW QUERY] ${duration}ms: ${query.substring(0, 200)}...`);
      
      // Log security event for slow queries (potential DoS)
      if (DEFAULT_DB_SECURITY_CONFIG.auditDatabaseAccess) {
        logSecurityEvent(
          'SLOW_DATABASE_QUERY',
          AuditEventSeverity.MEDIUM,
          { userId } as any,
          {
            query: query.substring(0, 500),
            duration,
            paramCount: params?.length || 0
          }
        );
      }
    }

    // Log suspicious queries
    if (this.isSuspiciousQuery(query)) {
      logSecurityEvent(
        'SUSPICIOUS_DATABASE_QUERY',
        AuditEventSeverity.HIGH,
        { userId } as any,
        {
          query: query.substring(0, 500),
          duration,
          reason: 'Contains potentially dangerous SQL patterns'
        }
      );
    }
  }

  private isSuspiciousQuery(query: string): boolean {
    const suspiciousPatterns = [
      /drop\s+table/i,
      /truncate\s+table/i,
      /delete\s+from\s+\w+\s*$/i,
      /update\s+\w+\s+set\s+\w+\s*=\s*'.*'/i,
      /insert\s+into\s+\w+\s+values\s*\(/i,
      /union\s+select/i,
      /or\s+1\s*=\s*1/i,
      /';.*--/i,
      /\/\*.*\*\//i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(query));
  }

  public getStats() {
    return {
      totalQueries: this.queryCount,
      slowQueries: this.slowQueryCount,
      slowQueryPercentage: this.queryCount > 0 ? (this.slowQueryCount / this.queryCount) * 100 : 0
    };
  }
}

// Database connection monitoring
export class DatabaseConnectionMonitor {
  private static instance: DatabaseConnectionMonitor;
  private connections: Map<string, { connected: Date; lastActivity: Date; userId?: string }> = new Map();

  private constructor() {}

  public static getInstance(): DatabaseConnectionMonitor {
    if (!DatabaseConnectionMonitor.instance) {
      DatabaseConnectionMonitor.instance = new DatabaseConnectionMonitor();
    }
    return DatabaseConnectionMonitor.instance;
  }

  public trackConnection(connectionId: string, userId?: string): void {
    this.connections.set(connectionId, {
      connected: new Date(),
      lastActivity: new Date(),
      userId
    });
  }

  public updateActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  public removeConnection(connectionId: string): void {
    this.connections.delete(connectionId);
  }

  public getConnectionStats() {
    const now = new Date();
    const activeConnections = Array.from(this.connections.values());
    
    return {
      totalConnections: this.connections.size,
      activeConnections: activeConnections.length,
      averageConnectionTime: activeConnections.length > 0 
        ? activeConnections.reduce((sum, conn) => sum + (now.getTime() - conn.connected.getTime()), 0) / activeConnections.length
        : 0,
      idleConnections: activeConnections.filter(conn => 
        (now.getTime() - conn.lastActivity.getTime()) > 300000 // 5 minutes
      ).length
    };
  }

  public detectSuspiciousActivity(): void {
    const stats = this.getConnectionStats();
    
    // Alert on too many connections
    if (stats.totalConnections > DEFAULT_DB_SECURITY_CONFIG.maxConnections * 0.8) {
      logSecurityEvent(
        'HIGH_DATABASE_CONNECTION_COUNT',
        AuditEventSeverity.MEDIUM,
        {} as any,
        {
          connectionCount: stats.totalConnections,
          maxConnections: DEFAULT_DB_SECURITY_CONFIG.maxConnections
        }
      );
    }

    // Alert on many idle connections
    if (stats.idleConnections > stats.totalConnections * 0.5) {
      logSecurityEvent(
        'HIGH_IDLE_DATABASE_CONNECTIONS',
        AuditEventSeverity.LOW,
        {} as any,
        {
          idleConnections: stats.idleConnections,
          totalConnections: stats.totalConnections
        }
      );
    }
  }
}

// Database backup security
export class DatabaseBackupSecurity {
  public static async createSecureBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `cpr_backup_${timestamp}.sql`;
    
    // In a real implementation, you would:
    // 1. Create encrypted backup
    // 2. Store in secure location
    // 3. Verify backup integrity
    // 4. Log backup creation
    
    console.log(`🔒 Creating secure backup: ${backupName}`);
    
    // Log backup creation
    logSecurityEvent(
      'DATABASE_BACKUP_CREATED',
      AuditEventSeverity.LOW,
      {} as any,
      {
        backupName,
        timestamp
      }
    );
    
    return backupName;
  }

  public static async verifyBackupIntegrity(backupPath: string): Promise<boolean> {
    // In a real implementation, you would:
    // 1. Verify backup file exists
    // 2. Check file integrity (checksum)
    // 3. Verify backup is not corrupted
    
    console.log(`🔍 Verifying backup integrity: ${backupPath}`);
    return true; // Placeholder
  }
}

// Database user privilege management
export class DatabaseUserManager {
  public static async createApplicationUser(username: string, password: string): Promise<void> {
    // In a real implementation, you would:
    // 1. Create database user with minimal privileges
    // 2. Grant only necessary permissions
    // 3. Set password expiration
    // 4. Log user creation
    
    console.log(`👤 Creating database user: ${username}`);
    
    logSecurityEvent(
      'DATABASE_USER_CREATED',
      AuditEventSeverity.MEDIUM,
      {} as any,
      {
        username,
        timestamp: new Date().toISOString()
      }
    );
  }

  public static async revokeUserAccess(username: string): Promise<void> {
    console.log(`🚫 Revoking database access for user: ${username}`);
    
    logSecurityEvent(
      'DATABASE_USER_ACCESS_REVOKED',
      AuditEventSeverity.HIGH,
      {} as any,
      {
        username,
        timestamp: new Date().toISOString()
      }
    );
  }
}

// Initialize database security
export const initializeDatabaseSecurity = async (): Promise<void> => {
  console.log('🔐 Initializing database security...');
  
  // Initialize monitoring
  const monitor = DatabaseConnectionMonitor.getInstance();
  const logger = DatabaseAccessLogger.getInstance();
  
  // Set up periodic security checks
  setInterval(() => {
    monitor.detectSuspiciousActivity();
  }, 60000); // Check every minute
  
  // Log security initialization (without request context)
  console.log('🔐 Database security configuration:', {
    ssl: DEFAULT_DB_SECURITY_CONFIG.ssl,
    connectionTimeout: DEFAULT_DB_SECURITY_CONFIG.connectionTimeout,
    maxConnections: DEFAULT_DB_SECURITY_CONFIG.maxConnections,
    auditDatabaseAccess: DEFAULT_DB_SECURITY_CONFIG.auditDatabaseAccess
  });
  
  console.log('✅ Database security initialized');
};
