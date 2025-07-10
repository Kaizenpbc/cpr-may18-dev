const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_may18',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkOrganizations() {
  try {
    console.log('🔍 Checking organizations...\n');
    
    // Check all organizations
    const orgsResult = await pool.query('SELECT id, name FROM organizations ORDER BY id');
    console.log('🏢 All organizations:', orgsResult.rows);
    
    // Check what organization ID 1 is
    const org1Result = await pool.query('SELECT id, name FROM organizations WHERE id = 1');
    console.log('\n🏢 Organization ID 1:', org1Result.rows);
    
    // Check what organization ID 2 is (if it exists)
    const org2Result = await pool.query('SELECT id, name FROM organizations WHERE id = 2');
    console.log('\n🏢 Organization ID 2:', org2Result.rows);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkOrganizations(); 