const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'cpr_jun21',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'gtacpr',
      }
);

async function fixUserPasswords() {
  try {
    console.log('🔧 Fixing user passwords...');

    // Users to fix - add more as needed
    const usersToFix = ['sean', 'peter'];
    const password = 'test1234';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    console.log('Generated password hash for password:', password);

    for (const username of usersToFix) {
      const result = await pool.query(
        'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING id, username, role',
        [passwordHash, username]
      );

      if (result.rows.length > 0) {
        console.log(`✅ Password updated for user: ${result.rows[0].username} (${result.rows[0].role})`);

        // Verify
        const isValid = await bcrypt.compare(password, passwordHash);
        console.log(`   Password verification: ${isValid ? 'PASS' : 'FAIL'}`);
      } else {
        console.log(`❌ No user found with username "${username}"`);
      }
    }

  } catch (error) {
    console.error('❌ Error fixing passwords:', error);
  } finally {
    await pool.end();
  }
}

fixUserPasswords();
