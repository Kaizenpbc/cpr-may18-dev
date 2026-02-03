const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function showOrgLocations() {
  const result = await pool.query(`
    SELECT o.id as org_id, o.name as org_name, ol.id as loc_id, ol.location_name
    FROM organizations o
    LEFT JOIN organization_locations ol ON o.id = ol.organization_id
    ORDER BY o.name, ol.location_name
  `);

  console.log('Org → Locations mapping:\n');
  let currentOrg = null;
  result.rows.forEach(row => {
    if (row.org_name !== currentOrg) {
      currentOrg = row.org_name;
      console.log(row.org_name + ' (org_id: ' + row.org_id + ')');
    }
    if (row.loc_id) {
      console.log('  └── ' + row.location_name + ' (loc_id: ' + row.loc_id + ')');
    } else {
      console.log('  └── (no locations)');
    }
  });

  await pool.end();
}

showOrgLocations().catch(console.error);
