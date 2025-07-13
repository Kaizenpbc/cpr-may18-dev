const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function fixIffatPassword() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'gtacpr',
    database: 'cpr_training'
  });

  try {
    console.log('🔧 Fixing iffat password...');
    
    // Hash the new password
    const newPassword = 'test123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    await connection.execute(
      'UPDATE users SET password_hash = ? WHERE username = ?',
      [hashedPassword, 'iffat']
    );

    console.log('✅ Password fixed! iffat can now login with: test123');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

fixIffatPassword(); 