const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr',
});

async function checkApprovalStatus() {
  try {
    console.log('🔍 Checking if approval_status column exists...');
    
    // Check if the column exists
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'invoices' AND column_name = 'approval_status';
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ approval_status column exists!');
      console.log('   Data type:', result.rows[0].data_type);
      console.log('   Nullable:', result.rows[0].is_nullable);
      console.log('   Default:', result.rows[0].column_default);
      
      // Check current values
      const valuesResult = await pool.query(`
        SELECT approval_status, COUNT(*) as count
        FROM invoices
        GROUP BY approval_status;
      `);
      
      console.log('\n📊 Current approval_status values:');
      valuesResult.rows.forEach(row => {
        console.log(`   ${row.approval_status || 'NULL'}: ${row.count} invoices`);
      });
      
    } else {
      console.log('❌ approval_status column does not exist');
      
      // Show all columns in the invoices table
      const allColumns = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'invoices'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📋 All columns in invoices table:');
      allColumns.rows.forEach(row => {
        console.log(`   ${row.column_name} (${row.data_type})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking approval_status:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkApprovalStatus().catch(console.error); 