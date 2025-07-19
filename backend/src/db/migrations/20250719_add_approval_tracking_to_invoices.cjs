module.exports = {
  async up(db) {
    await db.query(`
      ALTER TABLE invoices
      ADD COLUMN approved_by INTEGER REFERENCES users(id),
      ADD COLUMN approved_at TIMESTAMP;
    `);
  },

  async down(db) {
    await db.query(`
      ALTER TABLE invoices
      DROP COLUMN approved_by,
      DROP COLUMN approved_at;
    `);
  },
}; 