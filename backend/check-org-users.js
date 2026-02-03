import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkOrgUsers() {
  console.log('Organization users on Render:\n');

  const result = await pool.query(`
    SELECT u.id, u.username, u.organization_id, u.location_id,
           o.name as org_name, ol.location_name
    FROM users u
    LEFT JOIN organizations o ON u.organization_id = o.id
    LEFT JOIN organization_locations ol ON u.location_id = ol.id
    WHERE u.role = 'organization'
    ORDER BY u.id
  `);

  result.rows.forEach(r => {
    const status = (r.organization_id && r.location_id) ? 'CAN LOGIN' : 'BLOCKED';
    console.log(`${r.username}:`);
    console.log(`  Org: ${r.org_name || 'NONE'}`);
    console.log(`  Location: ${r.location_name || 'NONE'}`);
    console.log(`  Status: ${status}`);
    console.log('');
  });

  await pool.end();
}

checkOrgUsers().catch(console.error);
