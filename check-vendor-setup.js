const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function checkVendorSetup() {
  console.log('🔍 Checking Vendor Setup...\n');

  try {
    // Check if vendor_invoices table exists
    console.log('1. Checking vendor_invoices table...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'vendor_invoices'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ vendor_invoices table exists');
      
      // Check table structure
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'vendor_invoices'
        ORDER BY ordinal_position;
      `);
      
      console.log('📋 Table columns:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
      
      // Check if there are any vendor records
      const vendorCount = await pool.query('SELECT COUNT(*) as count FROM vendor_invoices');
      console.log(`\n📊 Total vendor invoices: ${vendorCount.rows[0].count}`);
      
      if (vendorCount.rows[0].count > 0) {
        const sampleInvoices = await pool.query('SELECT * FROM vendor_invoices LIMIT 3');
        console.log('\n📄 Sample invoices:');
        sampleInvoices.rows.forEach((invoice, index) => {
          console.log(`   Invoice ${index + 1}:`);
          console.log(`     - ID: ${invoice.id}`);
          console.log(`     - Number: ${invoice.invoice_number}`);
          console.log(`     - Amount: ${invoice.amount}`);
          console.log(`     - Status: ${invoice.status}`);
          console.log(`     - Vendor ID: ${invoice.vendor_id}`);
        });
      }
    } else {
      console.log('❌ vendor_invoices table does not exist');
    }

    // Check vendors table
    console.log('\n2. Checking vendors table...');
    const vendorsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'vendors'
      );
    `);
    
    if (vendorsCheck.rows[0].exists) {
      console.log('✅ vendors table exists');
      
      const vendorCount = await pool.query('SELECT COUNT(*) as count FROM vendors');
      console.log(`📊 Total vendors: ${vendorCount.rows[0].count}`);
      
      if (vendorCount.rows[0].count > 0) {
        const vendors = await pool.query('SELECT id, name, contact_email FROM vendors LIMIT 5');
        console.log('\n👥 Sample vendors:');
        vendors.rows.forEach(vendor => {
          console.log(`   - ID: ${vendor.id}, Name: ${vendor.name}, Email: ${vendor.contact_email}`);
        });
      }
    } else {
      console.log('❌ vendors table does not exist');
    }

    // Check users table for vendor users
    console.log('\n3. Checking users table for vendor users...');
    const vendorUsers = await pool.query(`
      SELECT id, email, role, name 
      FROM users 
      WHERE role = 'vendor' 
      LIMIT 5
    `);
    
    console.log(`📊 Vendor users found: ${vendorUsers.rows.length}`);
    if (vendorUsers.rows.length > 0) {
      vendorUsers.rows.forEach(user => {
        console.log(`   - ID: ${user.id}, Email: ${user.email}, Name: ${user.name}`);
      });
    } else {
      console.log('❌ No vendor users found');
    }

    // Check authentication tokens
    console.log('\n4. Checking recent authentication...');
    const recentTokens = await pool.query(`
      SELECT user_id, created_at 
      FROM token_blacklist 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log(`📊 Recent token activity: ${recentTokens.rows.length} records`);

  } catch (error) {
    console.error('❌ Error checking vendor setup:', error.message);
  } finally {
    await pool.end();
  }
}

checkVendorSetup(); 