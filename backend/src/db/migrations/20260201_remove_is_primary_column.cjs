/**
 * Migration to remove is_primary column from organization_locations
 *
 * All locations are now equal - no primary location concept
 */

module.exports = {
  up: async (db) => {
    // Drop the is_primary column
    await db.query(`
      ALTER TABLE organization_locations
      DROP COLUMN IF EXISTS is_primary;
    `);

    console.log('Removed is_primary column from organization_locations');
  },

  down: async (db) => {
    // Re-add the is_primary column if needed
    await db.query(`
      ALTER TABLE organization_locations
      ADD COLUMN is_primary BOOLEAN DEFAULT FALSE;
    `);

    console.log('Re-added is_primary column to organization_locations');
  },
};
