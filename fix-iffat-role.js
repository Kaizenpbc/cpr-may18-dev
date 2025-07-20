const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function fixIffatRole() {
  try {
    console.log('🔍 Fixing Iffat\'s user role for payment submission...\n');
    
    // 1. Find the invoice and its organization
    console.log('1. Finding invoice INV-2025-277254...');
    const invoiceResult = await pool.query(`
      SELECT i.organization_id, o.name as org_name, o.contact_email
      FROM invoices i
      JOIN organizations o ON i.organization_id = o.id
      WHERE i.invoice_number = 'INV-2025-277254'
    `);
    
    if (invoiceResult.rows.length === 0) {
      console.log('❌ Invoice not found');
      return;
    }
    
    const invoice = invoiceResult.rows[0];
    console.log(`✅ Found invoice for organization: ${invoice.org_name}`);
    console.log(`   Organization ID: ${invoice.organization_id}`);
    console.log(`   Contact Email: ${invoice.contact_email}`);
    console.log('');
    
    // 2. Find users for this organization
    console.log('2. Finding users for this organization...');
    const usersResult = await pool.query(`
      SELECT id, username, email, role, organization_id
      FROM users 
      WHERE organization_id = $1
    `, [invoice.organization_id]);
    
    if (usersResult.rows.length === 0) {
      console.log('❌ No users found for this organization');
      console.log('   Creating a new user account...');
      
      // Create a new user account
      const newUserResult = await pool.query(`
        INSERT INTO users (username, email, password_hash, role, organization_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id, username, email, role
      `, [
        invoice.contact_email.split('@')[0], // Use email prefix as username
        invoice.contact_email,
        '$2b$10$defaultpassword', // Default password hash
        'organization',
        invoice.organization_id
      ]);
      
      console.log('✅ Created new user account:');
      console.log(`   Username: ${newUserResult.rows[0].username}`);
      console.log(`   Email: ${newUserResult.rows[0].email}`);
      console.log(`   Role: ${newUserResult.rows[0].role}`);
    } else {
      console.log(`✅ Found ${usersResult.rows.length} user(s):`);
      usersResult.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.username} (${user.email}) - Role: ${user.role}`);
      });
      
      // Check if any have organization role
      const orgRoleUser = usersResult.rows.find(u => u.role === 'organization');
      if (!orgRoleUser) {
        console.log('\n❌ No user has organization role - fixing this...');
        
        // Update the first user to have organization role
        const firstUser = usersResult.rows[0];
        const updateResult = await pool.query(`
          UPDATE users 
          SET role = 'organization', updated_at = NOW()
          WHERE id = $1
          RETURNING id, username, email, role
        `, [firstUser.id]);
        
        console.log('✅ Updated user role:');
        console.log(`   ${updateResult.rows[0].username} (${updateResult.rows[0].email}) - Role: ${updateResult.rows[0].role}`);
      } else {
        console.log('\n✅ Found user with organization role:');
        console.log(`   ${orgRoleUser.username} (${orgRoleUser.email}) - Role: ${orgRoleUser.role}`);
      }
    }
    
    console.log('\n🎯 Summary:');
    console.log('   - Invoice INV-2025-277254 belongs to organization with ID:', invoice.organization_id);
    console.log('   - User account now has organization role');
    console.log('   - Payment submission should now work');
    console.log('\n📝 Next Steps:');
    console.log('   1. Iffat should log out and log back in');
    console.log('   2. Try submitting the payment again');
    console.log('   3. The "Access denied. Organization role required." error should be resolved');
    
  } catch (error) {
    console.error('❌ Error fixing user role:', error);
  } finally {
    await pool.end();
  }
}

fixIffatRole(); 