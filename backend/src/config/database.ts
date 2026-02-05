import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { retry } from '@lifeomic/attempt';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

// Database configuration
// Supports both DATABASE_URL (for Render/Heroku) and individual DB_* variables (for local)
const getPoolConfig = (): PoolConfig => {
  // If DATABASE_URL is set, use it (Render, Heroku, etc.)
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };
  }

  // Otherwise, require individual DB_* variables
  const password = process.env.DB_PASSWORD;
  if (!password) {
    throw new Error('DB_PASSWORD environment variable is required (or set DATABASE_URL)');
  }

  return {
    user: process.env.DB_USER || 'postgres',
    password,
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'cpr_jun21',
  };
};

const poolConfig: PoolConfig = getPoolConfig();

// Create the connection pool
const pool = new Pool(poolConfig);

// Graceful shutdown function
export const closeDatabaseConnections = async (): Promise<void> => {
  try {
    console.log('🔄 Closing database connections...');
    await pool.end();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
};

// After pool is created
pool.query("SET TIME ZONE 'America/Toronto';").catch(err => {
  console.error('Failed to set timezone to America/Toronto:', err);
});

// DISABLED: Automatic database initialization to prevent schema conflicts
// This should only be run manually when needed, not on every startup
const initializeDatabase = async () => {
  console.log('🚫 Database initialization DISABLED for stability');
  console.log('📋 To initialize database, run: npm run db:init');
  console.log('🔧 Current database:', process.env.DB_NAME || 'cpr_jun21');
  return;
};

// Custom error class for database operations
class DatabaseError extends Error {
  originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

// Function to execute queries with retry mechanism
export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  return retry(
    async () => {
      try {
        return await pool.query<T>(text, params);
      } catch (error) {
        throw new DatabaseError('Database query failed', error);
      }
    },
    {
      maxAttempts: 3,
      delay: 1000,
      factor: 2,
      jitter: true,
    }
  );
};

// Health check function
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await pool.end();
    console.log('Database pool has ended');
    process.exit(0);
  } catch (err) {
    console.error('Error during pool shutdown:', err);
    process.exit(1);
  }
});

export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

export { pool, initializeDatabase };
