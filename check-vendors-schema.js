const { Pool } = require('pg');

async function checkVendorsSchema(databaseName) {
  const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: databaseName,
    password: 'gtacpr',
    port: 5432,
  });

  try {
    console.log(`\n=== Checking database: ${databaseName} ===`);
    
    // Check if vendors table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'vendors'
      );
    `);
    
    console.log('Vendors table exists:', tableExists.rows[0].exists);
    
    if (tableExists.rows[0].exists) {
      // Get column information
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'vendors' 
        ORDER BY ordinal_position
      `);
      
      console.log('Vendors table columns:');
      columns.rows.forEach(col => {
        console.log(`- ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });
      
      // Check vendor count
      const count = await pool.query('SELECT COUNT(*) FROM vendors');
      console.log('Number of vendors:', count.rows[0].count);
      
      // Try to query vendors to see what happens
      try {
        const vendors = await pool.query('SELECT * FROM vendors LIMIT 1');
        console.log('Query test successful');
      } catch (queryError) {
        console.log('Query test failed:', queryError.message);
      }
    }
  } catch (error) {
    console.error(`Error checking ${databaseName}:`, error.message);
  } finally {
    await pool.end();
  }
}

async function checkBothDatabases() {
  await checkVendorsSchema('cpr_may18');
  await checkVendorsSchema('cpr_jun21');
}

checkBothDatabases(); 