const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function fixIffatPassword() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'gtacpr',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'cpr_jun21',
  });

  try {
    console.log('🔧 Fixing iffat password in PostgreSQL...');
    const newPassword = 'test123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const res = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING id, username, email, role',
      [hashedPassword, 'iffat']
    );
    if (res.rowCount === 0) {
      console.log('❌ User "iffat" not found');
    } else {
      console.log('✅ Password fixed! iffat can now login with: test123');
      console.log('User:', res.rows[0]);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixIffatPassword(); 