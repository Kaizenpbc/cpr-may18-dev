import mysql from 'mysql2/promise';
import type { Pool, PoolConnection, PoolOptions, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { retry } from '@lifeomic/attempt';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Convert PostgreSQL-style $1,$2,... placeholders to MySQL ? placeholders.
// Handles duplicate references (e.g. $1 used twice) by duplicating the value.
function convertPlaceholders(sql: string, params?: any[]): { sql: string; params: any[] } {
  if (!params || params.length === 0) return { sql, params: params ?? [] };
  const newParams: any[] = [];
  const converted = sql.replace(/\$(\d+)/g, (_, num) => {
    newParams.push(params[parseInt(num, 10) - 1]);
    return '?';
  });
  return { sql: converted, params: newParams };
}

const getPoolConfig = (): PoolOptions => {
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cpr_jun21',
    connectionLimit: parseInt(process.env.DB_POOL_MAX || '10'),
    connectTimeout: parseInt(process.env.DB_CONN_TIMEOUT || '5000'),
    waitForConnections: true,
    queueLimit: 0,
    timezone: '+00:00',
  };
};

const pool: Pool = mysql.createPool(getPoolConfig());

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

// Normalised result type — mirrors pg's QueryResult shape so all callers remain unchanged
export interface QueryResult<T = Record<string, any>> {
  rows: T[];
  rowCount: number;
}

// Handle RETURNING clause: strip it from SQL and do a follow-up SELECT.
// Returns null if no RETURNING clause present.
async function executeWithReturning<T>(
  conn: Pool | PoolConnection,
  text: string,
  p: any[]
): Promise<QueryResult<T> | null> {
  const retIdx = text.search(/\bRETURNING\b/i);
  if (retIdx === -1) return null;

  const returnCols = text.slice(retIdx).replace(/^RETURNING\s+/i, '').trim();
  const cleanSql = text.slice(0, retIdx).trimEnd();

  const isInsert = /^\s*INSERT/i.test(cleanSql);
  const isUpdate = /^\s*UPDATE/i.test(cleanSql);

  if (!isInsert && !isUpdate) {
    // DELETE RETURNING or unsupported — run stripped SQL, return rowCount only
    const [mutResult] = await conn.query(cleanSql, p);
    return { rows: [], rowCount: (mutResult as ResultSetHeader).affectedRows ?? 0 };
  }

  // Extract table name from INSERT INTO or UPDATE
  const tableMatch = cleanSql.match(/(?:INSERT\s+(?:IGNORE\s+)?INTO|UPDATE)\s+`?(\w+)`?/i);
  if (!tableMatch) return null;
  const tableName = tableMatch[1];

  const [mutResult] = await conn.query(cleanSql, p);
  const header = mutResult as ResultSetHeader;

  let selectSql: string;
  let selectParams: any[];

  if (isInsert) {
    selectSql = `SELECT ${returnCols} FROM \`${tableName}\` WHERE id = ?`;
    selectParams = [header.insertId];
  } else {
    // UPDATE: find WHERE clause and reuse its params for the follow-up SELECT
    const whereIdx = cleanSql.search(/\bWHERE\b/i);
    if (whereIdx === -1) return { rows: [], rowCount: header.affectedRows };
    const whereClause = cleanSql.slice(whereIdx);
    const setParamCount = (cleanSql.slice(0, whereIdx).match(/\?/g) || []).length;
    selectSql = `SELECT ${returnCols} FROM \`${tableName}\` ${whereClause}`;
    selectParams = p.slice(setParamCount);
  }

  const [rows] = await conn.query(selectSql, selectParams);
  return {
    rows: Array.isArray(rows) ? (rows as T[]) : [],
    rowCount: header.affectedRows,
  };
}

// Execute a query with retry. Accepts $1/$2/... placeholders (converted to ? internally).
export const query = async <T = Record<string, any>>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  return retry(
    async () => {
      try {
        const { sql, params: p } = convertPlaceholders(text, params);
        const withReturning = await executeWithReturning<T>(pool, sql, p);
        if (withReturning) return withReturning;
        const [result] = await pool.query(sql, p);
        const rows = Array.isArray(result) ? (result as T[]) : [];
        const rowCount = Array.isArray(result)
          ? result.length
          : (result as ResultSetHeader).affectedRows ?? 0;
        return { rows, rowCount };
      } catch (error) {
        throw new Error(
          `Database query failed: ${error instanceof Error ? error.message : String(error)}`
        );
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

// Transaction client shim — mirrors pg's pool.connect() API.
// BEGIN / COMMIT / ROLLBACK strings are intercepted and routed to mysql2 transaction methods.
export const getClient = async () => {
  const connection = await pool.getConnection();
  return {
    query: async <T = Record<string, any>>(text: string, params?: any[]): Promise<QueryResult<T>> => {
      const trimmed = text.trim().toUpperCase();
      if (trimmed === 'BEGIN') {
        await connection.beginTransaction();
        return { rows: [], rowCount: 0 };
      }
      if (trimmed === 'COMMIT') {
        await connection.commit();
        return { rows: [], rowCount: 0 };
      }
      if (trimmed === 'ROLLBACK') {
        await connection.rollback();
        return { rows: [], rowCount: 0 };
      }
      const { sql, params: p } = convertPlaceholders(text, params);
      const withReturning = await executeWithReturning<T>(connection, sql, p);
      if (withReturning) return withReturning;
      const [result] = await connection.query(sql, p);
      const rows = Array.isArray(result) ? (result as T[]) : [];
      const rowCount = Array.isArray(result)
        ? result.length
        : (result as ResultSetHeader).affectedRows ?? 0;
      return { rows, rowCount };
    },
    release: () => connection.release(),
  };
};

// DISABLED: Automatic database initialization to prevent schema conflicts
const initializeDatabase = async () => {
  console.log('🚫 Database initialization DISABLED for stability');
  console.log('📋 To initialize database, run: npm run db:init');
  console.log('🔧 Current database:', process.env.DB_NAME || 'cpr_jun21');
  return;
};

export { pool, initializeDatabase };
