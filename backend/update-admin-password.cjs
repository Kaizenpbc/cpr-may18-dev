const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_may18',
  user: 'postgres',
  password: 'gtacpr',
});

async function upsertSysadmin() {
  try {
    console.log('🔐 Creating/updating sysadmin user with password test123...');
    const passwordHash = bcrypt.hashSync('test123', 10);
    const result = await pool.query(`
      INSERT INTO users (username, password_hash, email, role, full_name, created_at, status)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, 'active')
      ON CONFLICT (username) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, username, role, email;
    `, ['sysadmin', passwordHash, 'sysadmin@cpr.com', 'system_admin', 'System Administrator']);
    console.log('✅ Sysadmin user created/updated:', result.rows[0]);
  } catch (error) {
    console.error('❌ Error creating/updating sysadmin user:', error);
  } finally {
    await pool.end();
  }
}

upsertSysadmin(); 