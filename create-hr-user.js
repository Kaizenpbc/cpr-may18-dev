const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function createHRUser() {
  const client = await pool.connect();
  
  try {
    console.log('🔐 Creating HR user...');
    
    const passwordHash = await bcrypt.hash('test123', 10);
    
    const result = await client.query(`
      INSERT INTO users (username, email, password_hash, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        updated_at = NOW()
      RETURNING id, username, email, role
    `, ['hr_user', 'hr@cpr.com', passwordHash, 'hr']);

    console.log('✅ HR user created/updated successfully:', result.rows[0]);
    
  } catch (error) {
    console.error('❌ Error creating HR user:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createHRUser(); 