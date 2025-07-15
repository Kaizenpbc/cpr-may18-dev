const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'gtacpr',
  database: 'cpr_jun21',
  port: 5432
});

async function checkDatabaseConstraints() {
  console.log('🔍 Checking Database Constraints\n');
  console.log('================================');

  try {
    // Check the payment_requests table structure
    const tableResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'payment_requests'
      ORDER BY ordinal_position
    `);

    console.log('Payment Requests Table Structure:');
    tableResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });

    console.log('\n');

    // Check for check constraints on the status column
    const constraintResult = await pool.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'payment_requests'::regclass
    `);

    console.log('Table Constraints:');
    if (constraintResult.rows.length > 0) {
      constraintResult.rows.forEach(row => {
        console.log(`  ${row.constraint_name}: ${row.constraint_definition}`);
      });
    } else {
      console.log('  No constraints found');
    }

    console.log('\n');

    // Check what status values are currently in use
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM payment_requests 
      GROUP BY status
      ORDER BY status
    `);

    console.log('Current Status Values:');
    statusResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} requests`);
    });

  } catch (error) {
    console.error('Error checking database constraints:', error);
  } finally {
    await pool.end();
  }
}

checkDatabaseConstraints(); 