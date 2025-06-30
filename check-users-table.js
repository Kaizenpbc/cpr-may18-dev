const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function checkUsersTable() {
  try {
    console.log('Checking users table...');
    
    // First check if the table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ Users table does not exist!');
      return;
    }
    
    console.log('✅ Users table exists');
    
    // Check table structure
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY column_name;
    `);
    
    console.log('\n📋 Users table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    
    // Check if there are any users
    const userCount = await pool.query(`
      SELECT COUNT(*) as count FROM users;
    `);
    
    console.log(`\n📊 Total users: ${userCount.rows[0].count}`);
    
    if (parseInt(userCount.rows[0].count) > 0) {
      // Get all users with correct column names
      const users = await pool.query(`
        SELECT 
          id,
          email,
          role,
          organization_id,
          created_at,
          updated_at
        FROM users 
        ORDER BY id
        LIMIT 10;
      `);
      
      console.log('\n📋 First 10 users:');
      users.rows.forEach(user => {
        console.log(`  - ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Org ID: ${user.organization_id || 'N/A'}`);
      });
      
      // Check roles
      const roles = await pool.query(`
        SELECT DISTINCT role, COUNT(*) as count
        FROM users 
        GROUP BY role
        ORDER BY role;
      `);
      
      console.log('\n📋 User roles:');
      roles.rows.forEach(role => {
        console.log(`  - ${role.role}: ${role.count} users`);
      });
    }
    
  } catch (error) {
    console.error('Error checking users table:', error);
  } finally {
    await pool.end();
  }
}

checkUsersTable(); 