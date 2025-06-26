const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_may18',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'classes' 
      ORDER BY ordinal_position
    `);
    
    console.log('Classes table columns:');
    result.rows.forEach(row => {
      console.log(`${row.column_name} (${row.data_type})`);
    });
    
    // Also check if class_types table exists
    const classTypesResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'class_types' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nClass_types table columns:');
    classTypesResult.rows.forEach(row => {
      console.log(`${row.column_name} (${row.data_type})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkSchema(); 