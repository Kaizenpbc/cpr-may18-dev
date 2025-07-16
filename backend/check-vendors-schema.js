import { pool } from './src/config/database.ts';

async function checkVendorsSchema() {
  try {
    console.log('Checking vendors table structure...');
    
    // Get table columns
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'vendors'
      ORDER BY ordinal_position;
    `);
    
    console.log('Vendors table columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'vendors'
      );
    `);
    
    console.log('\nVendors table exists:', tableExists.rows[0].exists);
    
    await pool.end();
  } catch (error) {
    console.error('Error checking vendors schema:', error);
    await pool.end();
  }
}

checkVendorsSchema(); 