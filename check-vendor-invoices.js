// Check recent vendor invoices
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
});

async function checkVendorInvoices() {
  try {
    console.log('🔍 Checking vendor invoices in database...');
    
    // Check if vendor_invoices table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'vendor_invoices'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ vendor_invoices table does not exist');
      return;
    }
    
    console.log('✅ vendor_invoices table exists');
    
    // Get table structure
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'vendor_invoices'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Table structure:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check for invoice 001
    const invoice001 = await pool.query(`
      SELECT * FROM vendor_invoices 
      WHERE invoice_number = '001' 
      OR pdf_filename LIKE '%001%'
      OR id = 1;
    `);
    
    if (invoice001.rows.length > 0) {
      console.log('✅ Found invoice 001:');
      console.log(JSON.stringify(invoice001.rows[0], null, 2));
    } else {
      console.log('❌ Invoice 001 not found');
    }
    
    // Get all vendor invoices
    const allInvoices = await pool.query(`
      SELECT id, invoice_number, pdf_filename, status, vendor_id, created_at, updated_at
      FROM vendor_invoices 
      ORDER BY created_at DESC 
      LIMIT 10;
    `);
    
    console.log('📊 Recent vendor invoices:');
    allInvoices.rows.forEach(invoice => {
      console.log(`  - ID: ${invoice.id}, Number: ${invoice.invoice_number}, File: ${invoice.pdf_filename}, Status: ${invoice.status}, Vendor: ${invoice.vendor_id}, Created: ${invoice.created_at}`);
    });
    
    // Check vendors table
    const vendors = await pool.query(`
      SELECT id, name, email FROM vendors LIMIT 5;
    `);
    
    console.log('👥 Available vendors:');
    vendors.rows.forEach(vendor => {
      console.log(`  - ID: ${vendor.id}, Name: ${vendor.name}, Email: ${vendor.email}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking vendor invoices:', error.message);
  } finally {
    await pool.end();
  }
}

checkVendorInvoices(); 