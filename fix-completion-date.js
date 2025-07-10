const { Pool } = require('pg');

const pool = new Pool({ 
  host: 'localhost', 
  port: 5432, 
  database: 'cpr_jun21', 
  user: 'postgres', 
  password: 'gtacpr' 
});

async function fixCompletionDate() {
  try {
    console.log('Fixing completion date for course request 24...');
    
    const result = await pool.query(
      'UPDATE course_requests SET completed_at = CURRENT_TIMESTAMP WHERE id = 24 AND status = \'completed\' RETURNING id, completed_at'
    );
    
    console.log('Updated course request:');
    result.rows.forEach(row => console.log(row));
    
    // Also update the invoice to reflect the completion date
    const invoiceResult = await pool.query(
      'UPDATE invoices SET updated_at = CURRENT_TIMESTAMP WHERE course_request_id = 24 RETURNING id, invoice_number'
    );
    
    console.log('Updated invoice:');
    invoiceResult.rows.forEach(row => console.log(row));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixCompletionDate(); 