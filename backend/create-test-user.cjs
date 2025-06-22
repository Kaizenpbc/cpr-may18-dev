const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_may18',
  user: 'postgres',
  password: 'gtacpr'
});

async function createTestUser() {
  try {
    console.log('🔍 Checking existing users...');
    
    // Check if testorg user already exists
    const existingUser = await pool.query(
      'SELECT id, username, role FROM users WHERE username = $1',
      ['testorg']
    );
    
    if (existingUser.rows.length > 0) {
      console.log('✅ User testorg already exists:', existingUser.rows[0]);
      return;
    }
    
    // Check if Test Organization exists
    const existingOrg = await pool.query(
      'SELECT id, name FROM organizations WHERE name = $1',
      ['Test Organization']
    );
    
    let organizationId;
    if (existingOrg.rows.length > 0) {
      organizationId = existingOrg.rows[0].id;
      console.log('✅ Test Organization already exists, ID:', organizationId);
    } else {
      // Create Test Organization
      const orgResult = await pool.query(
        'INSERT INTO organizations (name, contact_email, contact_phone, address, city, province, postal_code, country) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        ['Test Organization', 'test@testorg.com', '555-1234', '123 Test St', 'Test City', 'ON', 'A1A 1A1', 'Canada']
      );
      organizationId = orgResult.rows[0].id;
      console.log('✅ Created Test Organization, ID:', organizationId);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Create test user (without is_active column)
    const userResult = await pool.query(
      'INSERT INTO users (username, email, password_hash, role, organization_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, role',
      ['testorg', 'test@testorg.com', hashedPassword, 'organization', organizationId]
    );
    
    console.log('✅ Created test user:', userResult.rows[0]);
    console.log('📝 Login credentials:');
    console.log('   Username: testorg');
    console.log('   Password: password123');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await pool.end();
  }
}

createTestUser(); 