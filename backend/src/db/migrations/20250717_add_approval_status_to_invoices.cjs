module.exports = {
  async up(db) {
    await db.query(`
      ALTER TABLE invoices
      ADD COLUMN approval_status VARCHAR(32) DEFAULT 'pending' NULL;
    `);
  },

  async down(db) {
    await db.query(`
      ALTER TABLE invoices
      DROP COLUMN approval_status;
    `);
  },
}; 