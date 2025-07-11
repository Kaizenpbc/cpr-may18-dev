const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkUsersSchema() {
  try {
    console.log('Checking users table schema...');
    
    // Get table schema
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Users table columns:');
    schemaResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Get sample data
    console.log('\n📊 Sample users data:');
    const usersResult = await pool.query(`
      SELECT id, username, email, role, organization_id, created_at
      FROM users 
      ORDER BY username
      LIMIT 10
    `);
    
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.username} (${user.email}) - ${user.role}`);
    });
    
  } catch (error) {
    console.error('Error checking users schema:', error);
  } finally {
    await pool.end();
  }
}

checkUsersSchema(); 