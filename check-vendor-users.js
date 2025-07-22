const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function checkVendorUsers() {
  console.log('🔍 Checking Vendor Users...\n');

  try {
    // Check users table structure
    console.log('1. Checking users table structure...');
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Users table columns:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    // Check for vendor users
    console.log('\n2. Checking for vendor users...');
    const vendorUsers = await pool.query(`
      SELECT id, email, role 
      FROM users 
      WHERE role = 'vendor'
    `);
    
    console.log(`📊 Vendor users found: ${vendorUsers.rows.length}`);
    if (vendorUsers.rows.length > 0) {
      vendorUsers.rows.forEach(user => {
        console.log(`   - ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);
      });
    } else {
      console.log('❌ No vendor users found');
      
      // Check all users
      console.log('\n3. Checking all users...');
      const allUsers = await pool.query(`
        SELECT id, email, role 
        FROM users 
        LIMIT 10
      `);
      
      console.log(`📊 Total users: ${allUsers.rows.length}`);
      allUsers.rows.forEach(user => {
        console.log(`   - ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);
      });
    }

    // Check if vendor email matches any user
    console.log('\n4. Checking vendor email match...');
    const vendorEmail = await pool.query(`
      SELECT contact_email FROM vendors LIMIT 1
    `);
    
    if (vendorEmail.rows.length > 0) {
      const email = vendorEmail.rows[0].contact_email;
      console.log(`🔍 Looking for user with email: ${email}`);
      
      const userMatch = await pool.query(`
        SELECT id, email, role FROM users WHERE email = $1
      `, [email]);
      
      if (userMatch.rows.length > 0) {
        console.log(`✅ Found user: ID ${userMatch.rows[0].id}, Role: ${userMatch.rows[0].role}`);
      } else {
        console.log('❌ No user found with vendor email');
      }
    }

  } catch (error) {
    console.error('❌ Error checking vendor users:', error.message);
  } finally {
    await pool.end();
  }
}

checkVendorUsers(); 