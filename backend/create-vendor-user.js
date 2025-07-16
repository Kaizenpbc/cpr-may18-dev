import { pool } from './src/config/database.ts';
import bcrypt from 'bcrypt';

async function createVendorUser() {
  try {
    console.log('Creating vendor user...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    // Check if vendor user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      ['vendor']
    );
    
    if (existingUser.rows.length > 0) {
      console.log('Vendor user already exists, updating password...');
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE username = $2',
        [hashedPassword, 'vendor']
      );
    } else {
      console.log('Creating new vendor user...');
      const insertQuery = `INSERT INTO users (username, password_hash, role, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`;
      console.log('Insert query:', insertQuery);
      await pool.query(
        insertQuery,
        ['vendor', hashedPassword, 'vendor']
      );
    }
    
    // Check if vendor record exists
    const existingVendor = await pool.query(
      'SELECT id FROM vendors WHERE contact_email = $1',
      ['vendor@example.com']
    );
    
    if (existingVendor.rows.length === 0) {
      console.log('Creating vendor record...');
      await pool.query(
        `INSERT INTO vendors (
          name, contact_email, contact_phone, address, vendor_type, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          'Test Vendor Company',
          'vendor@example.com',
          '555-1234',
          '123 Vendor St, Vendor City, ON, A1B 2C3',
          'supplier',
          true
        ]
      );
    } else {
      console.log('Vendor record already exists');
    }
    
    console.log('✅ Vendor user created/updated successfully');
    console.log('Username: vendor');
    console.log('Password: test123');
    console.log('Contact Email: vendor@example.com');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error creating vendor user:', error);
    if (error.query) {
      console.error('Failed query:', error.query);
    }
    await pool.end();
  }
}

createVendorUser(); 