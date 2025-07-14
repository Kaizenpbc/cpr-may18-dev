const { pool } = require('./backend/src/config/database.js');

async function testProfileChangesInsert() {
  try {
    console.log('Testing profile_changes table insert...');
    
    // Test the exact query from the route
    const result = await pool.query(
      `INSERT INTO profile_changes (user_id, change_type, field_name, old_value, new_value, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING id, created_at`,
      [1, 'instructor', 'email', null, 'test@example.com']
    );
    
    console.log('✅ Insert successful:', result.rows[0]);
    
    // Clean up the test record
    await pool.query('DELETE FROM profile_changes WHERE id = $1', [result.rows[0].id]);
    console.log('✅ Test record cleaned up');
    
  } catch (error) {
    console.error('❌ Insert failed:', error);
  } finally {
    await pool.end();
  }
}

testProfileChangesInsert(); 