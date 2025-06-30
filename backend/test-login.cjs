const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function testLogin() {
  try {
    console.log('🧪 Testing login functionality...');
    
    // Test 1: Check if sysadmin user exists
    const userResult = await pool.query(
      'SELECT id, username, role, password_hash FROM users WHERE username = $1',
      ['sysadmin']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ No sysadmin user found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ User found:', {
      id: user.id,
      username: user.username,
      role: user.role,
      passwordHashLength: user.password_hash ? user.password_hash.length : 0
    });
    
    // Test 2: Test password verification
    const password = 'test1234';
    const isValid = await bcrypt.compare(password, user.password_hash);
    console.log('🔐 Password verification test:', isValid);
    
    // Test 3: Test with wrong password
    const wrongPassword = 'wrongpassword';
    const isWrongValid = await bcrypt.compare(wrongPassword, user.password_hash);
    console.log('🔐 Wrong password test:', isWrongValid);
    
    // Test 4: Check database connection info
    const dbInfo = await pool.query('SELECT current_database() as db_name, current_user as db_user');
    console.log('🗄️ Database info:', dbInfo.rows[0]);
    
  } catch (error) {
    console.error('❌ Error testing login:', error);
  } finally {
    await pool.end();
  }
}

testLogin(); 