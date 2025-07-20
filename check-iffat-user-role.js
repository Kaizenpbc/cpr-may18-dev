const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function checkIffatUserRole() {
  try {
    console.log('🔍 Checking Iffat\'s user account and organization role...\n');
    
    // 1. Find Iffat's user account
    console.log('1. Searching for Iffat\'s user account...');
    const userResult = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.organization_id,
        u.created_at,
        u.last_login,
        o.name as organization_name,
        o.contact_email
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.email ILIKE '%iffat%' 
         OR u.username ILIKE '%iffat%'
         OR o.name ILIKE '%iffat%'
         OR o.contact_email ILIKE '%iffat%'
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No user found with "iffat" in email, username, or organization name');
      
      // Let's check all organization users
      console.log('\n2. Checking all organization users...');
      const allOrgUsers = await pool.query(`
        SELECT 
          u.id,
          u.username,
          u.email,
          u.role,
          u.organization_id,
          u.created_at,
          o.name as organization_name,
          o.contact_email
        FROM users u
        LEFT JOIN organizations o ON u.organization_id = o.id
        WHERE u.role = 'organization'
        ORDER BY u.created_at DESC
      `);
      
      if (allOrgUsers.rows.length > 0) {
        console.log(`✅ Found ${allOrgUsers.rows.length} organization user(s):`);
        allOrgUsers.rows.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.username} (${user.email})`);
          console.log(`      Organization: ${user.organization_name}`);
          console.log(`      Role: ${user.role}`);
          console.log(`      Created: ${user.created_at}`);
          console.log('');
        });
      } else {
        console.log('❌ No organization users found');
      }
      
      return;
    }
    
    console.log(`✅ Found ${userResult.rows.length} user(s) matching "iffat":`);
    userResult.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username} (${user.email})`);
      console.log(`      Organization: ${user.organization_name}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Organization ID: ${user.organization_id}`);
      console.log(`      Created: ${user.created_at}`);
      console.log(`      Last Login: ${user.last_login || 'Never'}`);
      console.log('');
    });
    
    // 2. Check the specific invoice organization
    console.log('2. Checking invoice INV-2025-277254 organization...');
    const invoiceResult = await pool.query(`
      SELECT 
        i.id,
        i.invoice_number,
        i.organization_id,
        i.amount,
        i.status,
        o.name as organization_name,
        o.contact_email
      FROM invoices i
      JOIN organizations o ON i.organization_id = o.id
      WHERE i.invoice_number = 'INV-2025-277254'
    `);
    
    if (invoiceResult.rows.length > 0) {
      const invoice = invoiceResult.rows[0];
      console.log('✅ Invoice found:');
      console.log(`   Organization: ${invoice.organization_name}`);
      console.log(`   Organization ID: ${invoice.organization_id}`);
      console.log(`   Contact Email: ${invoice.contact_email}`);
      console.log('');
      
      // 3. Check if there's a user for this organization
      console.log('3. Checking for users associated with this organization...');
      const orgUsersResult = await pool.query(`
        SELECT 
          u.id,
          u.username,
          u.email,
          u.role,
          u.organization_id,
          u.created_at,
          u.last_login
        FROM users u
        WHERE u.organization_id = $1
        ORDER BY u.created_at DESC
      `, [invoice.organization_id]);
      
      if (orgUsersResult.rows.length > 0) {
        console.log(`✅ Found ${orgUsersResult.rows.length} user(s) for this organization:`);
        orgUsersResult.rows.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.username} (${user.email})`);
          console.log(`      Role: ${user.role}`);
          console.log(`      Created: ${user.created_at}`);
          console.log(`      Last Login: ${user.last_login || 'Never'}`);
          console.log('');
        });
        
        // Check if any have organization role
        const orgRoleUsers = orgUsersResult.rows.filter(u => u.role === 'organization');
        if (orgRoleUsers.length > 0) {
          console.log('✅ Found users with organization role:');
          orgRoleUsers.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.username} (${user.email})`);
          });
        } else {
          console.log('❌ No users with organization role found');
          console.log('   This is the problem! Users need organization role to submit payments.');
          
          // Fix: Update the first user to have organization role
          const firstUser = orgUsersResult.rows[0];
          console.log(`\n🔧 Fixing: Updating ${firstUser.username} to have organization role...`);
          
          const updateResult = await pool.query(`
            UPDATE users 
            SET role = 'organization', updated_at = NOW()
            WHERE id = $1
            RETURNING id, username, email, role
          `, [firstUser.id]);
          
          if (updateResult.rows.length > 0) {
            const updatedUser = updateResult.rows[0];
            console.log('✅ User role updated successfully:');
            console.log(`   ${updatedUser.username} (${updatedUser.email}) - Role: ${updatedUser.role}`);
          } else {
            console.log('❌ Failed to update user role');
          }
        }
      } else {
        console.log('❌ No users found for this organization');
        console.log('   Need to create a user account for this organization');
      }
    } else {
      console.log('❌ Invoice INV-2025-277254 not found');
    }
    
    // 4. Check all organizations
    console.log('\n4. Checking all organizations...');
    const orgsResult = await pool.query(`
      SELECT 
        o.id,
        o.name,
        o.contact_email,
        COUNT(u.id) as user_count,
        COUNT(CASE WHEN u.role = 'organization' THEN 1 END) as org_role_users
      FROM organizations o
      LEFT JOIN users u ON o.id = u.organization_id
      GROUP BY o.id, o.name, o.contact_email
      ORDER BY o.name
    `);
    
    console.log('All organizations:');
    orgsResult.rows.forEach((org, index) => {
      console.log(`   ${index + 1}. ${org.name}`);
      console.log(`      Contact: ${org.contact_email}`);
      console.log(`      Users: ${org.user_count} (${org.org_role_users} with org role)`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error checking user role:', error);
  } finally {
    await pool.end();
  }
}

checkIffatUserRole(); 