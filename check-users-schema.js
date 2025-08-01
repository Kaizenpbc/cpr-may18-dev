const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function checkUsersSchema() {
  console.log('🔍 Checking users table schema...\n');
  
  try {
    // Get column information for users table
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 users table columns:');
    schemaResult.rows.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Get a sample user record
    const sampleResult = await pool.query(`
      SELECT * FROM users LIMIT 1
    `);
    
    if (sampleResult.rows.length > 0) {
      console.log('\n📄 Sample user record:');
      const sample = sampleResult.rows[0];
      Object.keys(sample).forEach(key => {
        console.log(`   ${key}: ${sample[key]}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsersSchema(); 