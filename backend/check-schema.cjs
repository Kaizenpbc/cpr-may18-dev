const { pool } = require('./src/config/database.js');

async function checkUsersSchema() {
  try {
    console.log('🔍 Checking users table schema...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Users table columns:');
    result.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check if phone column exists
    const phoneColumn = result.rows.find(col => col.column_name === 'phone');
    if (phoneColumn) {
      console.log('\n✅ Phone column successfully added to users table!');
    } else {
      console.log('\n❌ Phone column not found in users table');
    }
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await pool.end();
  }
}

checkUsersSchema(); 