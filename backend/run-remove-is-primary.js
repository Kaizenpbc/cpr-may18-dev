import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Removing is_primary column from organization_locations...');

    // Drop the is_primary column
    await client.query(`
      ALTER TABLE organization_locations
      DROP COLUMN IF EXISTS is_primary;
    `);

    console.log('✅ Removed is_primary column from organization_locations');

    // Verify the column was removed
    const result = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'organization_locations' AND column_name = 'is_primary';
    `);

    if (result.rows.length === 0) {
      console.log('✅ Verification: is_primary column no longer exists');
    } else {
      console.log('❌ Verification failed: is_primary column still exists');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
