const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkInvoices() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking vendor invoices in database...');
    
    // Check if vendor_invoices table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'vendor_invoices'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ vendor_invoices table does not exist!');
      return;
    }
    
    console.log('✅ vendor_invoices table exists');
    
    // Check total count of invoices
    const countResult = await client.query(`
      SELECT COUNT(*) as total_invoices
      FROM vendor_invoices
    `);
    
    console.log(`📊 Total invoices: ${countResult.rows[0].total_invoices}`);
    
    // Check status distribution
    const statusResult = await client.query(`
      SELECT status, COUNT(*) as count
      FROM vendor_invoices
      GROUP BY status
      ORDER BY status
    `);
    
    console.log('\n📋 Status distribution:');
    if (statusResult.rows.length === 0) {
      console.log('  No invoices found');
    } else {
      statusResult.rows.forEach(row => {
        console.log(`  ${row.status}: ${row.count} invoices`);
      });
    }
    
    // Check recent invoices
    const recentResult = await client.query(`
      SELECT id, vendor_id, status, amount, created_at, updated_at
      FROM vendor_invoices
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log('\n📄 Recent invoices:');
    if (recentResult.rows.length === 0) {
      console.log('  No recent invoices found');
    } else {
      recentResult.rows.forEach(row => {
        console.log(`  ID: ${row.id}, Status: ${row.status}, Amount: $${row.amount}, Created: ${row.created_at}`);
      });
    }
    
    // Check if there are any vendors
    const vendorResult = await client.query(`
      SELECT COUNT(*) as vendor_count
      FROM vendors
    `);
    
    console.log(`\n🏢 Total vendors: ${vendorResult.rows[0].vendor_count}`);
    
  } catch (error) {
    console.error('❌ Error checking invoices:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkInvoices(); 