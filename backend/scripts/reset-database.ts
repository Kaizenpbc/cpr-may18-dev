import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Require DB_PASSWORD in production
const getDbPassword = (): string => {
  const password = process.env.DB_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DB_PASSWORD environment variable is required in production');
    }
    console.warn('⚠️  WARNING: DB_PASSWORD not set. This script should only run in development.');
    return '';
  }
  return password;
};

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: getDbPassword(),
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cpr_jun21',
});

async function resetDatabase() {
  try {
    console.log('🔄 Resetting database to stable state...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Check current database
    const dbResult = await pool.query('SELECT current_database()');
    console.log(`📊 Current database: ${dbResult.rows[0].current_database}`);
    
    // Check if required tables exist
    const tables = ['users', 'organizations', 'class_types', 'classes', 'course_requests'];
    const missingTables: string[] = [];
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (!result.rows[0].exists) {
        missingTables.push(table);
      }
    }
    
    if (missingTables.length > 0) {
      console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
      console.log('🔧 Run database initialization: npm run db:init');
      return;
    }
    
    // Check if required columns exist in classes table
    const columns = ['id', 'class_type_id', 'instructor_id', 'organization_id', 'start_time', 'end_time', 'status'];
    const missingColumns: string[] = [];
    
    for (const column of columns) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'classes' 
          AND column_name = $1
        )
      `, [column]);
      
      if (!result.rows[0].exists) {
        missingColumns.push(column);
      }
    }
    
    if (missingColumns.length > 0) {
      console.log(`❌ Missing columns in classes table: ${missingColumns.join(', ')}`);
      console.log('🔧 Run database initialization: npm run db:init');
      return;
    }
    
    console.log('✅ Database schema is stable');
    
    // Check for basic data
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const orgCount = await pool.query('SELECT COUNT(*) FROM organizations');
    const classTypeCount = await pool.query('SELECT COUNT(*) FROM class_types');
    
    console.log(`📊 Data status:`);
    console.log(`   Users: ${userCount.rows[0].count}`);
    console.log(`   Organizations: ${orgCount.rows[0].count}`);
    console.log(`   Class Types: ${classTypeCount.rows[0].count}`);
    
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log('⚠️  No users found - consider running: npm run db:seed');
    }
    
    console.log('✅ Database reset check completed');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
  } finally {
    await pool.end();
  }
}

resetDatabase(); 