const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function checkMikeDetails() {
  try {
    console.log('🔍 Checking Mike\'s user details...\n');
    
    // Get Mike's user record
    const mikeResult = await pool.query(`
      SELECT 
        id,
        username,
        email,
        role,
        organization_id,
        phone,
        created_at,
        updated_at
      FROM users 
      WHERE username = 'mike'
    `);
    
    if (mikeResult.rows.length === 0) {
      console.log('❌ User "mike" not found in database');
      return;
    }
    
    const mike = mikeResult.rows[0];
    console.log('📋 Mike\'s User Details:');
    console.log(`  - ID: ${mike.id}`);
    console.log(`  - Username: ${mike.username}`);
    console.log(`  - Email: ${mike.email}`);
    console.log(`  - Role: ${mike.role}`);
    console.log(`  - Organization ID: ${mike.organization_id || 'N/A'}`);
    console.log(`  - Phone: ${mike.phone || 'N/A'}`);
    console.log(`  - Created: ${mike.created_at}`);
    console.log(`  - Updated: ${mike.updated_at}`);
    
    // Check if there's an organization name
    if (mike.organization_id) {
      const orgResult = await pool.query(`
        SELECT name FROM organizations WHERE id = $1
      `, [mike.organization_id]);
      
      if (orgResult.rows.length > 0) {
        console.log(`  - Organization: ${orgResult.rows[0].name}`);
      }
    }
    
    // Check if there are any additional user details in other tables
    console.log('\n🔍 Checking for additional user information...');
    
    // Check if there's a full_name column or similar
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY column_name
    `);
    
    console.log('\n📋 All users table columns:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // Check if there are any other tables that might have user names
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%user%' 
      OR table_name LIKE '%instructor%'
      OR table_name LIKE '%profile%'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Related tables that might have user information:');
    tablesResult.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking Mike\'s details:', error);
  } finally {
    await pool.end();
  }
}

checkMikeDetails(); 