/**
 * Data migration to populate organization_locations from existing organizations
 *
 * For each existing organization:
 * 1. Creates a default primary location using the org's current address/contact
 * 2. Links all existing course_requests to this location
 * 3. Links all existing invoices to this location
 * 4. Links all existing org users to this location
 */

module.exports = {
  up: async (db) => {
    // Get all existing organizations
    const orgsResult = await db.query(`
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

    const organizations = orgsResult.rows;

    for (const org of organizations) {
      // Parse contact_name into first and last name
      let firstName = null;
      let lastName = null;
      if (org.contact_name) {
        const nameParts = org.contact_name.trim().split(' ');
        firstName = nameParts[0] || null;
        lastName = nameParts.slice(1).join(' ') || null;
      }

      // Create default primary location for this org
      const locationResult = await db.query(`
        INSERT INTO organization_locations (
          organization_id,
          location_name,
          address,
          city,
          province,
          postal_code,
          contact_first_name,
          contact_last_name,
          contact_email,
          contact_phone,
          is_primary,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, TRUE)
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

      const locationId = locationResult.rows[0].id;

      // Update all course_requests for this org to use the new location
      await db.query(`
        UPDATE course_requests
        SET location_id = $1
        WHERE organization_id = $2 AND location_id IS NULL
      `, [locationId, org.id]);

      // Update all invoices for this org to use the new location
      await db.query(`
        UPDATE invoices
        SET location_id = $1
        WHERE organization_id = $2 AND location_id IS NULL
      `, [locationId, org.id]);

      // Update all org users to use the new location
      await db.query(`
        UPDATE users
        SET location_id = $1
        WHERE organization_id = $2 AND location_id IS NULL AND role = 'organization'
      `, [locationId, org.id]);
    }

    console.log(`Migrated ${organizations.length} organizations to locations`);
  },

  down: async (db) => {
    // Clear location_id from all related tables
    await db.query(`UPDATE users SET location_id = NULL WHERE location_id IS NOT NULL`);
    await db.query(`UPDATE course_requests SET location_id = NULL WHERE location_id IS NOT NULL`);
    await db.query(`UPDATE invoices SET location_id = NULL WHERE location_id IS NOT NULL`);

    // Delete all organization_locations
    await db.query(`DELETE FROM organization_locations`);
  },
};
