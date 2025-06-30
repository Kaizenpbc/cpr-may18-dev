import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({
  host: 'localhost',
  database: 'cpr_may18',
  user: 'postgres',
  password: 'gtacpr'
});

async function resetSysadminPassword() {
  try {
    console.log('Resetting sysadmin password to "test123"...');
    
    // Generate password hash for "test123"
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('test123', saltRounds);
    
    console.log('Generated password hash:', passwordHash.substring(0, 20) + '...');
    
    // Update the sysadmin user's password
    const result = await pool.query(`
      UPDATE users 
      SET password_hash = $1, updated_at = NOW()
      WHERE username = 'sysadmin' AND role = 'sysadmin'
      RETURNING id, username, role
    `, [passwordHash]);
    
    if (result.rowCount === 0) {
      console.log('❌ No sysadmin user found to update');
      return;
    }
    
    console.log('✅ Successfully updated sysadmin password!');
    console.log('Updated user:', result.rows[0]);
    console.log('\n🔑 New credentials:');
    console.log('Username: sysadmin');
    console.log('Password: test123');
    console.log('\nYou can now log in with these credentials.');
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
  } finally {
    await pool.end();
  }
}

resetSysadminPassword(); 