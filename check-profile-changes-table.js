const { pool } = require('./backend/src/config/database.js');

async function checkProfileChangesTable() {
  try {
    console.log('Checking profile_changes table structure...');
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'profile_changes'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ profile_changes table does not exist!');
      return;
    }
    
    console.log('✅ profile_changes table exists');
    
    // Get table structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'profile_changes' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nprofile_changes table columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
    });
    
    // Check if there are any records
    const countResult = await pool.query('SELECT COUNT(*) as count FROM profile_changes');
    console.log(`\nTotal profile changes records: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkProfileChangesTable(); 