const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
});

async function checkVendorAccounts() {
  try {
    console.log('🔍 Checking vendor accounts in database...');
    
    // Check vendors table
    const vendors = await pool.query(`
      SELECT id, name, contact_email 
      FROM vendors 
      ORDER BY id;
    `);
    
    console.log('👥 Vendors:');
    vendors.rows.forEach(vendor => {
      console.log(`  - ID: ${vendor.id}, Name: ${vendor.name}, Email: ${vendor.contact_email}`);
    });
    
    // Check users table for vendor accounts
    const vendorUsers = await pool.query(`
      SELECT id, username, email, role 
      FROM users 
      WHERE role = 'vendor' OR email IN (
        SELECT contact_email FROM vendors WHERE contact_email IS NOT NULL
      )
      ORDER BY id;
    `);
    
    console.log('\n👤 Vendor Users:');
    vendorUsers.rows.forEach(user => {
      console.log(`  - ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Role: ${user.role}`);
    });
    
    // Check if there's a connection between vendors and users
    const vendorUserConnections = await pool.query(`
      SELECT v.id as vendor_id, v.name as vendor_name, v.contact_email,
             u.id as user_id, u.username, u.email as user_email, u.role
      FROM vendors v
      LEFT JOIN users u ON v.contact_email = u.email
      ORDER BY v.id;
    `);
    
    console.log('\n🔗 Vendor-User Connections:');
    vendorUserConnections.rows.forEach(conn => {
      console.log(`  - Vendor: ${conn.vendor_name} (${conn.contact_email})`);
      console.log(`    User: ${conn.user_email ? `${conn.username} (${conn.user_email})` : 'No user account'}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking vendor accounts:', error.message);
  } finally {
    await pool.end();
  }
}

checkVendorAccounts(); 