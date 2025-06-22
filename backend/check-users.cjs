const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_may18',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...');
    
    // Check users table
    const usersResult = await pool.query(
      'SELECT id, username, email, role, organization_id FROM users ORDER BY id'
    );
    
    console.log('Users in database:');
    usersResult.rows.forEach(user => {
      console.log(`  - ID: ${user.id}, Username: ${user.username}, Role: ${user.role}, Org ID: ${user.organization_id || 'none'}`);
    });
    
    // Check organizations table
    const orgsResult = await pool.query(
      'SELECT id, name FROM organizations ORDER BY id'
    );
    
    console.log('\nOrganizations in database:');
    orgsResult.rows.forEach(org => {
      console.log(`  - ID: ${org.id}, Name: ${org.name}`);
    });
    
    // Find organization users
    console.log('\nOrganization users:');
    const orgUsersResult = await pool.query(
      'SELECT u.id, u.username, u.role, o.name as org_name FROM users u LEFT JOIN organizations o ON u.organization_id = o.id WHERE u.role = \'organization\' ORDER BY u.id'
    );
    
    orgUsersResult.rows.forEach(user => {
      console.log(`  - Username: ${user.username}, Organization: ${user.org_name || 'none'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkUsers(); 