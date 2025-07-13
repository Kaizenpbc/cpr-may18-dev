const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function resetIffatPassword() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'gtacpr',
    database: 'cpr_training'
  });

  try {
    console.log('🔍 Checking current iffat user...');
    
    // Check current user
    const [users] = await connection.execute(
      'SELECT id, username, email, role, password_hash FROM users WHERE username = ?',
      ['iffat']
    );

    if (users.length === 0) {
      console.log('❌ User "iffat" not found');
      return;
    }

    const user = users[0];
    console.log('✅ Found iffat user:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Current Password Hash: ${user.password_hash}`);

    // Hash the new password
    const newPassword = 'test123';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    console.log('\n🔄 Resetting password to "test123"...');

    // Update the password
    await connection.execute(
      'UPDATE users SET password_hash = ? WHERE username = ?',
      [hashedPassword, 'iffat']
    );

    console.log('✅ Password reset successfully!');
    console.log(`   New Password Hash: ${hashedPassword}`);

    // Verify the update
    const [updatedUsers] = await connection.execute(
      'SELECT id, username, email, role, password_hash FROM users WHERE username = ?',
      ['iffat']
    );

    if (updatedUsers.length > 0) {
      const updatedUser = updatedUsers[0];
      console.log('\n✅ Verification - Updated user:');
      console.log(`   ID: ${updatedUser.id}`);
      console.log(`   Username: ${updatedUser.username}`);
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   Role: ${updatedUser.role}`);
      console.log(`   New Password Hash: ${updatedUser.password_hash}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

resetIffatPassword(); 