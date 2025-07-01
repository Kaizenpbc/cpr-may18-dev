import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cpr_jun21',
};

const pool = new Pool(poolConfig);

async function checkDatabase() {
  try {
    console.log('🔍 Checking database structure and content...\n');

    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Check current database
    const dbResult = await pool.query('SELECT current_database()');
    console.log(`📊 Current database: ${dbResult.rows[0].current_database}`);

    // Check all tables
    const tables = await pool.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public'
       ORDER BY table_name`
    );
    console.log('\n📋 Available tables:');
    tables.rows.forEach(t => console.log(`   - ${t.table_name}`));

    // Check classes table structure
    const classesColumns = await pool.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns 
       WHERE table_name = 'classes'
       ORDER BY ordinal_position`
    );
    console.log('\n📝 Classes Table Structure:');
    classesColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

    // Check instructor_availability table structure
    const availabilityColumns = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'instructor_availability'
       ORDER BY ordinal_position`
    );
    console.log('\n📅 Instructor Availability Table Structure:');
    availabilityColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    // Check users table for instructor
    const instructor = await pool.query(
      `SELECT id, username, email, role FROM users WHERE role = 'instructor' LIMIT 5`
    );
    console.log('\n👨‍🏫 Instructor Users:');
    instructor.rows.forEach(user => {
      console.log(`   - ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
    });

    // Check data counts
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const orgCount = await pool.query('SELECT COUNT(*) FROM organizations');
    const classTypeCount = await pool.query('SELECT COUNT(*) FROM class_types');
    const classCount = await pool.query('SELECT COUNT(*) FROM classes');
    
    console.log('\n📊 Data Summary:');
    console.log(`   Users: ${userCount.rows[0].count}`);
    console.log(`   Organizations: ${orgCount.rows[0].count}`);
    console.log(`   Class Types: ${classTypeCount.rows[0].count}`);
    console.log(`   Classes: ${classCount.rows[0].count}`);

    console.log('\n✅ Database check completed successfully');

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase(); 