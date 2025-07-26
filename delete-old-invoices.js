const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function deleteOldInvoices() {
  const client = await pool.connect();
  try {
    console.log('🔍 Finding old invoices to delete...');
    // Find all invoice IDs except the most recent one for each vendor
    const { rows: toDelete } = await client.query(`
      SELECT id FROM vendor_invoices vi
      WHERE id NOT IN (
        SELECT DISTINCT ON (vendor_id) id
        FROM vendor_invoices
        ORDER BY vendor_id, created_at DESC
      )
    `);
    if (toDelete.length === 0) {
      console.log('✅ No old invoices to delete.');
      return;
    }
    const ids = toDelete.map(r => r.id);
    console.log('🗑️ Deleting invoice IDs:', ids);
    await client.query('DELETE FROM vendor_invoices WHERE id = ANY($1)', [ids]);
    console.log(`✅ Deleted ${ids.length} old invoices.`);
  } catch (error) {
    console.error('❌ Error deleting old invoices:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

deleteOldInvoices(); 