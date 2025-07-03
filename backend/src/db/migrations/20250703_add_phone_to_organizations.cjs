/**
 * Migration to add a nullable phone column to the organizations table
 */

module.exports = {
  up: async (db) => {
    await db.query(`
      ALTER TABLE organizations
      ADD COLUMN phone VARCHAR(32);
    `);
  },

  down: async (db) => {
    await db.query(`
      ALTER TABLE organizations
      DROP COLUMN IF EXISTS phone;
    `);
  },
}; 