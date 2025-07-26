const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
});

async function testVendorQuery() {
  try {
    console.log('🔍 Testing vendor query directly...');
    
    // This is the exact query that the API should be running for a vendor user
    const query = `
      SELECT 
        vi.*,
        v.name as company,
        v.name as billing_company,
        COALESCE(vi.rate, 0) as rate,
        COALESCE(vi.amount, 0) as amount,
        COALESCE(vi.subtotal, vi.amount) as subtotal,
        COALESCE(vi.hst, 0) as hst,
        COALESCE(vi.total, vi.amount) as total
      FROM vendor_invoices vi
      LEFT JOIN vendors v ON vi.vendor_id = v.id
      WHERE 1=1
      ORDER BY vi.created_at DESC
    `;
    
    console.log('🔍 Query:', query);
    
    const result = await pool.query(query);
    
    console.log(`✅ Found ${result.rows.length} invoices:`);
    
    result.rows.forEach((invoice, index) => {
      console.log(`\n  ${index + 1}. Invoice ID: ${invoice.id}`);
      console.log(`     Number: ${invoice.invoice_number}`);
      console.log(`     Status: ${invoice.status}`);
      console.log(`     Vendor ID: ${invoice.vendor_id}`);
      console.log(`     Company: ${invoice.company}`);
      console.log(`     Created: ${invoice.created_at}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing vendor query:', error.message);
  } finally {
    await pool.end();
  }
}

testVendorQuery(); 