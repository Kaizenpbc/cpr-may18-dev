const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
});

async function checkStructure() {
  try {
    console.log('🔍 Checking course_students table structure in cpr_jun21...');
    
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'course_students' 
      ORDER BY ordinal_position
    `);
    
    console.log('\ncourse_students columns:');
    if (columns.rows.length === 0) {
      console.log('  No columns found - table might not exist');
    } else {
      columns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'course_students'
      );
    `);
    
    console.log(`\nTable exists: ${tableExists.rows[0].exists}`);
    
  } catch (error) {
    console.error('❌ Error checking structure:', error);
  } finally {
    await pool.end();
  }
}

checkStructure(); 