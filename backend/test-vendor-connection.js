import { pool } from './src/config/database.js';

async function testVendorConnection() {
  try {
    console.log('Testing vendor connection...');
    
    // Test database connection
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('Database connection successful:', result.rows[0]);
    
    // Test if vendor_invoices table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'vendor_invoices'
      );
    `);
    
    console.log('vendor_invoices table exists:', tableCheck.rows[0].exists);
    
    // Test if vendors table exists
    const vendorsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'vendors'
      );
    `);
    
    console.log('vendors table exists:', vendorsCheck.rows[0].exists);
    
    await pool.end();
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
    await pool.end();
  }
}

testVendorConnection(); 