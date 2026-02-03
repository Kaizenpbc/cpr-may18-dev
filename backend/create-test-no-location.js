import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTestUser() {
  const password = 'test123';
  const hash = bcrypt.hashSync(password, 10);

  // Get first org ID
  const orgResult = await pool.query('SELECT id, name FROM organizations LIMIT 1');
  const org = orgResult.rows[0];

  // Create user with org but NO location
  const result = await pool.query(
    `INSERT INTO users (username, email, password_hash, role, organization_id, location_id)
     VALUES ($1, $2, $3, $4, $5, NULL)
     RETURNING id, username`,
    ['test-no-location', 'test-no-loc@test.com', hash, 'organization', org.id]
  );

  console.log('Created test user:');
  console.log('  Username: test-no-location');
  console.log('  Password: test123');
  console.log('  Role: organization');
  console.log(`  Org: ${org.name} (id: ${org.id})`);
  console.log('  Location: NULL (no location)');
  console.log('');
  console.log('Try logging in on Render - should be BLOCKED with MISSING_LOCATION error');

  await pool.end();
}

createTestUser().catch(console.error);
