const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function fixSysadminPassword() {
  try {
    console.log('🔧 Fixing sysadmin password...');
    
    // Generate new password hash
    const password = 'test1234';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    console.log('Generated password hash:', passwordHash);
    console.log('Hash length:', passwordHash.length);
    
    // Update the password in database
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING id, username, role',
      [passwordHash, 'sysadmin']
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Password updated successfully for user:', result.rows[0]);
    } else {
      console.log('❌ No user found with username "sysadmin"');
    }
    
    // Verify the update
    const verifyResult = await pool.query(
      'SELECT id, username, role, password_hash FROM users WHERE username = $1',
      ['sysadmin']
    );
    
    if (verifyResult.rows.length > 0) {
      const user = verifyResult.rows[0];
      console.log('✅ User found:', {
        id: user.id,
        username: user.username,
        role: user.role,
        passwordHashLength: user.password_hash ? user.password_hash.length : 0
      });
      
      // Test password verification
      const isValid = await bcrypt.compare(password, user.password_hash);
      console.log('✅ Password verification test:', isValid);
    }
    
  } catch (error) {
    console.error('❌ Error fixing password:', error);
  } finally {
    await pool.end();
  }
}

fixSysadminPassword(); 