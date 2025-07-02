const { Pool } = require('pg');

async function checkSchema() {
  const pool = new Pool({
    user: 'postgres',
    password: 'gtacpr',
    host: '127.0.0.1',
    port: 5432,
    database: 'cpr_jun21',
  });

  try {
    console.log('🔍 Checking email_templates table schema...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'email_templates' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nEmail templates table schema:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type}) - Nullable: ${row.is_nullable} - Default: ${row.column_default || 'none'}`);
    });
    
    // Check if sub_category column exists
    const subCategoryExists = result.rows.some(row => row.column_name === 'sub_category');
    console.log(`\nsub_category column exists: ${subCategoryExists}`);
    
    if (!subCategoryExists) {
      console.log('⚠️  sub_category column is missing! Adding it...');
      await pool.query('ALTER TABLE email_templates ADD COLUMN sub_category VARCHAR(100) DEFAULT \'general\'');
      console.log('✅ sub_category column added');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema(); 