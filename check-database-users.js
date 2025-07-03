const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkDatabaseUsers() {
  try {
    console.log('🔍 Checking database directly for all users...\n');

    // Query all users with their roles and organization info
    const usersQuery = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.organization_id,
        o.name as organization_name,
        u.created_at
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      ORDER BY u.id
    `;

    const usersResult = await pool.query(usersQuery);
    const users = usersResult.rows;

    console.log(`📊 Found ${users.length} users in database:\n`);

    users.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`  Username: ${user.username}`);
      console.log(`  Email: ${user.email || 'N/A'}`);
      console.log(`  Role: ${user.role || 'N/A'}`);
      console.log(`  Organization ID: ${user.organization_id || 'N/A'}`);
      console.log(`  Organization Name: ${user.organization_name || 'N/A'}`);
      console.log(`  Created: ${user.created_at}`);
      console.log('');
    });

    // Count users by role
    const roleCounts = {};
    users.forEach(user => {
      const role = user.role || 'no_role';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });

    console.log('📈 Users by role:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`);
    });

    // Check for organization users specifically
    const orgUsers = users.filter(user => user.role === 'organization');
    console.log(`\n🏢 Organization users: ${orgUsers.length}`);
    
    if (orgUsers.length > 0) {
      orgUsers.forEach(user => {
        console.log(`  - ${user.username} (${user.email}) - Org: ${user.organization_name}`);
      });
    } else {
      console.log('  ❌ No organization users found in database');
    }

    // Check organizations table
    console.log('\n🏢 Organizations in database:');
    const orgsResult = await pool.query('SELECT id, name, contact_email, contact_phone FROM organizations ORDER BY id');
    const organizations = orgsResult.rows;

    if (organizations.length > 0) {
      organizations.forEach(org => {
        console.log(`  ID: ${org.id} - Name: ${org.name} - Email: ${org.contact_email} - Phone: ${org.contact_phone}`);
      });
    } else {
      console.log('  ❌ No organizations found in database');
    }

    // Test organization user login if any exist
    if (orgUsers.length > 0) {
      console.log('\n🔐 Testing organization user login...');
      const testUser = orgUsers[0];
      
      try {
        const axios = require('axios');
        const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
          username: testUser.username,
          password: 'test123'
        });

        if (loginResponse.data.success) {
          console.log(`✅ Login successful with ${testUser.username}`);
          console.log(`   Organization ID: ${loginResponse.data.data.user.organizationId}`);
          console.log(`   Organization Name: ${loginResponse.data.data.user.organizationName}`);
        } else {
          console.log(`❌ Login failed with ${testUser.username}`);
        }
      } catch (error) {
        console.log(`❌ Login error with ${testUser.username}:`, error.response?.data?.message || error.message);
      }
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabaseUsers(); 