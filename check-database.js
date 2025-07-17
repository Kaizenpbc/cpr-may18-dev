const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr',
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking database connection and table structure...\n');
    
    // Check which database we're connected to
    const dbResult = await pool.query('SELECT current_database() as db_name;');
    console.log(`📊 Connected to database: ${dbResult.rows[0].db_name}`);
    
    // Check if invoices table exists
    const tableResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'invoices' AND table_schema = 'public';
    `);
    
    if (tableResult.rows.length === 0) {
      console.log('❌ invoices table does not exist');
      return;
    }
    
    console.log('✅ invoices table exists');
    
    // Check all columns in the invoices table
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'invoices' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 All columns in invoices table:');
    columnsResult.rows.forEach((col, index) => {
      console.log(`  ${index + 1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable} - Default: ${col.column_default || 'NULL'}`);
    });
    
    // Check if approval_status column exists specifically
    const approvalStatusResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'invoices' AND column_name = 'approval_status' AND table_schema = 'public';
    `);
    
    console.log('\n🔍 approval_status column check:');
    if (approvalStatusResult.rows.length > 0) {
      console.log('✅ approval_status column exists');
      console.log(`   Data type: ${approvalStatusResult.rows[0].data_type}`);
      console.log(`   Nullable: ${approvalStatusResult.rows[0].is_nullable}`);
      console.log(`   Default: ${approvalStatusResult.rows[0].column_default || 'NULL'}`);
    } else {
      console.log('❌ approval_status column does not exist');
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkDatabase().catch(console.error); 