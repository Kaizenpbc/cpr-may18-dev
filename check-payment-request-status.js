const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'gtacpr',
  database: 'cpr_jun21',
  port: 5432
});

async function checkPaymentRequestStatus() {
  console.log('🔍 Checking Payment Request Status\n');
  console.log('==================================');

  try {
    // Check payment requests
    const result = await pool.query(`
      SELECT 
        id, 
        status, 
        payment_method, 
        notes,
        created_at,
        updated_at
      FROM payment_requests 
      ORDER BY id DESC 
      LIMIT 10
    `);

    console.log(`Found ${result.rows.length} payment requests:`);
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}, Status: ${row.status}, Method: ${row.payment_method || 'N/A'}`);
      console.log(`   Notes: ${row.notes || 'None'}`);
      console.log(`   Created: ${row.created_at}, Updated: ${row.updated_at}`);
      console.log('');
    });

    // Check if there are any pending requests
    const pendingResult = await pool.query(`
      SELECT COUNT(*) as count FROM payment_requests WHERE status = 'pending'
    `);
    console.log(`Pending requests: ${pendingResult.rows[0].count}`);

    // Check if there are any returned_to_hr requests
    const returnedResult = await pool.query(`
      SELECT COUNT(*) as count FROM payment_requests WHERE status = 'returned_to_hr'
    `);
    console.log(`Returned to HR requests: ${returnedResult.rows[0].count}`);

  } catch (error) {
    console.error('Error checking payment requests:', error);
  } finally {
    await pool.end();
  }
}

checkPaymentRequestStatus(); 