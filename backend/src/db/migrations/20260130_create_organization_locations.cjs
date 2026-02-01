/**
 * Migration to create organization_locations table and add location_id to related tables
 *
 * Organizations can have multiple locations (branches, campuses, etc.)
 * Each location operates independently with its own:
 * - Contact person
 * - Course scheduling
 * - Invoicing
 */

module.exports = {
  up: async (db) => {
    // Create organization_locations table
    await db.query(`
      CREATE TABLE organization_locations (
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

    // Create index for faster lookups
    await db.query(`
      CREATE INDEX idx_org_locations_org_id ON organization_locations(organization_id);
    `);

    // Create index for active locations
    await db.query(`
      CREATE INDEX idx_org_locations_active ON organization_locations(organization_id, is_active);
    `);

    // Add location_id to users table (for org users restricted to a location)
    await db.query(`
      ALTER TABLE users
      ADD COLUMN location_id INTEGER REFERENCES organization_locations(id);
    `);

    // Add location_id to course_requests table
    await db.query(`
      ALTER TABLE course_requests
      ADD COLUMN location_id INTEGER REFERENCES organization_locations(id);
    `);

    // Add location_id to invoices table
    await db.query(`
      ALTER TABLE invoices
      ADD COLUMN location_id INTEGER REFERENCES organization_locations(id);
    `);

    // Create indexes for the new foreign keys
    await db.query(`
      CREATE INDEX idx_users_location_id ON users(location_id);
    `);

    await db.query(`
      CREATE INDEX idx_course_requests_location_id ON course_requests(location_id);
    `);

    await db.query(`
      CREATE INDEX idx_invoices_location_id ON invoices(location_id);
    `);
  },

  down: async (db) => {
    // Remove indexes first
    await db.query(`DROP INDEX IF EXISTS idx_invoices_location_id;`);
    await db.query(`DROP INDEX IF EXISTS idx_course_requests_location_id;`);
    await db.query(`DROP INDEX IF EXISTS idx_users_location_id;`);
    await db.query(`DROP INDEX IF EXISTS idx_org_locations_active;`);
    await db.query(`DROP INDEX IF EXISTS idx_org_locations_org_id;`);

    // Remove location_id columns
    await db.query(`ALTER TABLE invoices DROP COLUMN IF EXISTS location_id;`);
    await db.query(`ALTER TABLE course_requests DROP COLUMN IF EXISTS location_id;`);
    await db.query(`ALTER TABLE users DROP COLUMN IF EXISTS location_id;`);

    // Drop organization_locations table
    await db.query(`DROP TABLE IF EXISTS organization_locations;`);
  },
};
