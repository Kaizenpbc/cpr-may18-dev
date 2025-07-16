const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: 'gtacpr',
  database: process.env.DB_NAME || 'cpr_may18',
});

async function createVendorUser() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creating vendor user...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('test123', 12);
    console.log('✅ Password hashed successfully');
    
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      ['vendor', 'georgebailoo@gmail.com']
    );
    
    if (existingUser.rows.length > 0) {
      console.log('⚠️ User already exists with username "vendor" or email "georgebailoo@gmail.com"');
      console.log('Updating existing user...');
      
      // Update existing user
      await client.query(
        `UPDATE users 
         SET username = $1, 
             email = $2, 
             password_hash = $3, 
             role = $4,
             updated_at = NOW()
         WHERE username = $1 OR email = $2`,
        ['vendor', 'georgebailoo@gmail.com', hashedPassword, 'vendor']
      );
      
      console.log('✅ Existing user updated successfully');
    } else {
      // Create new user
      const userResult = await client.query(
        `INSERT INTO users (username, email, password_hash, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id`,
        ['vendor', 'georgebailoo@gmail.com', hashedPassword, 'vendor']
      );
      
      console.log('✅ New user created with ID:', userResult.rows[0].id);
    }
    
    // Check if vendor record already exists
    const existingVendor = await client.query(
      'SELECT id FROM vendors WHERE email = $1',
      ['georgebailoo@gmail.com']
    );
    
    if (existingVendor.rows.length > 0) {
      console.log('⚠️ Vendor record already exists for email "georgebailoo@gmail.com"');
      console.log('Updating existing vendor record...');
      
      // Update existing vendor
      await client.query(
        `UPDATE vendors 
         SET vendor_name = $1, 
             contact_first_name = $2, 
             contact_last_name = $3,
             email = $4,
             phone = $5,
             address_street = $6,
             address_city = $7,
             address_province = $8,
             address_postal_code = $9,
             vendor_type = $10,
             status = $11,
             updated_at = NOW()
         WHERE email = $4`,
        [
          'GTACPR Manual Supplies',
          'George',
          'Bailoo',
          'georgebailoo@gmail.com',
          '(555) 123-4567',
          '123 Business St, Suite 100',
          'Anytown',
          'CA',
          '90210',
          'Manual Supplies',
          'active'
        ]
      );
      
      console.log('✅ Existing vendor record updated successfully');
    } else {
      // Create new vendor record
      const vendorResult = await client.query(
        `INSERT INTO vendors (
          vendor_name, contact_first_name, contact_last_name, email, phone, 
          address_street, address_city, address_province, address_postal_code, 
          vendor_type, status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING id`,
        [
          'GTACPR Manual Supplies',
          'George',
          'Bailoo',
          'georgebailoo@gmail.com',
          '(555) 123-4567',
          '123 Business St, Suite 100',
          'Anytown',
          'CA',
          '90210',
          'Manual Supplies',
          'active'
        ]
      );
      
      console.log('✅ New vendor record created with ID:', vendorResult.rows[0].id);
    }
    
    console.log('\n🎉 Vendor user setup completed successfully!');
    console.log('📋 Login credentials:');
    console.log('   Username: vendor');
    console.log('   Password: test123');
    console.log('   Email: georgebailoo@gmail.com');
    console.log('   Role: vendor');
    console.log('\n🔗 You can now access the vendor portal at: http://localhost:3000/vendor');
    
  } catch (error) {
    console.error('❌ Error creating vendor user:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
createVendorUser()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  }); 