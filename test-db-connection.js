const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function checkDatabase() {
  try {
    console.log('Checking database connection and tables...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Check current database
    const dbResult = await client.query('SELECT current_database()');
    console.log('📊 Current database:', dbResult.rows[0].current_database);
    
    // Check if profile_changes table exists
    const tableResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'profile_changes'
      );
    `);
    
    console.log('📋 profile_changes table exists:', tableResult.rows[0].exists);
    
    if (tableResult.rows[0].exists) {
      // Get table structure
      const columnsResult = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'profile_changes' 
        ORDER BY ordinal_position
      `);
      
      console.log('📋 profile_changes table columns:');
      columnsResult.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type})`);
      });
      
      // Test insert
      const insertResult = await client.query(`
        INSERT INTO profile_changes (user_id, change_type, field_name, old_value, new_value, status)
        VALUES ($1, $2, $3, $4, $5, 'pending')
        RETURNING id, created_at
      `, [1, 'instructor', 'email', null, 'test@example.com']);
      
      console.log('✅ Insert test successful:', insertResult.rows[0]);
      
      // Clean up
      await client.query('DELETE FROM profile_changes WHERE id = $1', [insertResult.rows[0].id]);
      console.log('✅ Test record cleaned up');
    } else {
      console.log('❌ profile_changes table does not exist!');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase(); 