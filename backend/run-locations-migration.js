import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Running organization_locations migration...');

    // Create organization_locations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS organization_locations (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        location_name VARCHAR(255) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        province VARCHAR(100),
        postal_code VARCHAR(20),
        contact_first_name VARCHAR(100),
        contact_last_name VARCHAR(100),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(32),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created organization_locations table');

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_org_locations_org_id ON organization_locations(organization_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_org_locations_active ON organization_locations(organization_id, is_active);
    `);
    console.log('✅ Created indexes');

    // Add location_id to users table
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES organization_locations(id);
    `);
    console.log('✅ Added location_id to users table');

    // Add location_id to course_requests table
    await client.query(`
      ALTER TABLE course_requests ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES organization_locations(id);
    `);
    console.log('✅ Added location_id to course_requests table');

    // Add location_id to invoices table
    await client.query(`
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES organization_locations(id);
    `);
    console.log('✅ Added location_id to invoices table');

    // Create indexes for new columns
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_location_id ON users(location_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_course_requests_location_id ON course_requests(location_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_invoices_location_id ON invoices(location_id);`);
    console.log('✅ Created indexes for location_id columns');

    // NOTE: No auto-creation of default locations
    // All locations must be explicitly created by administrators
    // Users cannot log in until assigned to a location
    console.log('ℹ️  No default locations created - admins must create locations explicitly');
    console.log('ℹ️  Organization users must be assigned to a location before they can log in');

    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
