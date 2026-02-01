import { pool } from '../config/database.js';

export async function migrateOrganizationLocations(): Promise<void> {
  const client = await pool.connect();

  try {
    // Check if table already exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'organization_locations'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('ℹ️ organization_locations table already exists, skipping migration');
      return;
    }

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

    // Add location_id to users table
    const usersColCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'location_id';
    `);
    if (usersColCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE users ADD COLUMN location_id INTEGER REFERENCES organization_locations(id);
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_location_id ON users(location_id);`);
      console.log('✅ Added location_id to users table');
    }

    // Add location_id to course_requests table
    const crColCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'course_requests' AND column_name = 'location_id';
    `);
    if (crColCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE course_requests ADD COLUMN location_id INTEGER REFERENCES organization_locations(id);
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_course_requests_location_id ON course_requests(location_id);`);
      console.log('✅ Added location_id to course_requests table');
    }

    // Add location_id to invoices table
    const invColCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'invoices' AND column_name = 'location_id';
    `);
    if (invColCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE invoices ADD COLUMN location_id INTEGER REFERENCES organization_locations(id);
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_invoices_location_id ON invoices(location_id);`);
      console.log('✅ Added location_id to invoices table');
    }

    // Migrate existing orgs to have default locations
    console.log('🔄 Creating default locations for existing organizations...');

    const orgsResult = await client.query(`
      SELECT
        id,
        name,
        contact_name,
        contact_email,
        contact_phone,
        address,
        address_street,
        address_city,
        address_province,
        address_postal_code
      FROM organizations
    `);

    for (const org of orgsResult.rows) {
      // Check if org already has a location
      const existingLoc = await client.query(
        'SELECT id FROM organization_locations WHERE organization_id = $1',
        [org.id]
      );

      if (existingLoc.rows.length === 0) {
        // Parse contact_name into first and last name
        let firstName = null;
        let lastName = null;
        if (org.contact_name) {
          const nameParts = org.contact_name.trim().split(' ');
          firstName = nameParts[0] || null;
          lastName = nameParts.slice(1).join(' ') || null;
        }

        // Create default location
        const locResult = await client.query(`
          INSERT INTO organization_locations (
            organization_id, location_name, address, city, province, postal_code,
            contact_first_name, contact_last_name, contact_email, contact_phone,
            is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
          RETURNING id
        `, [
          org.id,
          'Main Location',
          org.address_street || org.address || null,
          org.address_city || null,
          org.address_province || null,
          org.address_postal_code || null,
          firstName,
          lastName,
          org.contact_email || null,
          org.contact_phone || null,
        ]);

        const locationId = locResult.rows[0].id;

        // Update related records
        await client.query(
          'UPDATE course_requests SET location_id = $1 WHERE organization_id = $2 AND location_id IS NULL',
          [locationId, org.id]
        );
        await client.query(
          'UPDATE invoices SET location_id = $1 WHERE organization_id = $2 AND location_id IS NULL',
          [locationId, org.id]
        );
        await client.query(
          "UPDATE users SET location_id = $1 WHERE organization_id = $2 AND location_id IS NULL AND role = 'organization'",
          [locationId, org.id]
        );

        console.log(`  ✅ Created location for org: ${org.name}`);
      }
    }

    console.log('🎉 Organization locations migration completed!');

  } catch (error) {
    console.error('❌ Locations migration failed:', error);
    // Don't throw - allow server to continue
  } finally {
    client.release();
  }
}
