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

async function deleteMainLocations() {
  const client = await pool.connect();

  try {
    // First, check what Main Locations exist and their usage
    const check = await client.query(`
      SELECT
        ol.id,
        ol.location_name,
        o.name as org_name,
        (SELECT COUNT(*) FROM users u WHERE u.location_id = ol.id) as user_count,
        (SELECT COUNT(*) FROM course_requests cr WHERE cr.location_id = ol.id) as course_count,
        (SELECT COUNT(*) FROM invoices i WHERE i.location_id = ol.id) as invoice_count
      FROM organization_locations ol
      JOIN organizations o ON o.id = ol.organization_id
      WHERE ol.location_name IN ('Main Location', 'Main Office')
    `);

    console.log('Found Main Locations:', check.rows.length);

    // Find ones that can be deleted (no usage)
    const deletable = check.rows.filter(r =>
      parseInt(r.user_count) === 0 &&
      parseInt(r.course_count) === 0 &&
      parseInt(r.invoice_count) === 0
    );

    const inUse = check.rows.filter(r =>
      parseInt(r.user_count) > 0 ||
      parseInt(r.course_count) > 0 ||
      parseInt(r.invoice_count) > 0
    );

    console.log(`Deletable (no usage): ${deletable.length}`);
    console.log(`In use (cannot delete): ${inUse.length}`);

    if (inUse.length > 0) {
      console.log('\n⚠️  Locations in use (will NOT be deleted):');
      inUse.forEach(r => console.log(`  - ${r.org_name}: ${r.user_count} users, ${r.course_count} courses, ${r.invoice_count} invoices`));
    }

    // Delete the ones with no usage
    if (deletable.length > 0) {
      const idsToDelete = deletable.map(r => r.id);
      await client.query(
        `DELETE FROM organization_locations WHERE id = ANY($1)`,
        [idsToDelete]
      );
      console.log(`\n✅ Deleted ${deletable.length} "Main Location" entries:`);
      deletable.forEach(r => console.log(`  - ${r.org_name}`));
    } else {
      console.log('\nNo deletable Main Locations found.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

deleteMainLocations().catch(console.error);
