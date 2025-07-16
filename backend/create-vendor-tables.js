import { pool } from './src/config/database.ts';

async function createVendorTables() {
  try {
    console.log('Creating vendor tables...');
    
    // Create vendor_invoices table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendor_invoices (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL REFERENCES vendors(id),
        invoice_number VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        invoice_date DATE NOT NULL,
        due_date DATE,
        manual_type VARCHAR(100),
        quantity INTEGER,
        pdf_filename VARCHAR(255),
        status VARCHAR(50) DEFAULT 'submitted',
        notes TEXT,
        payment_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('✅ vendor_invoices table created/verified');
    
    // Create index for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vendor_invoices_vendor_id ON vendor_invoices(vendor_id);
      CREATE INDEX IF NOT EXISTS idx_vendor_invoices_status ON vendor_invoices(status);
      CREATE INDEX IF NOT EXISTS idx_vendor_invoices_created_at ON vendor_invoices(created_at);
    `);
    
    console.log('✅ Indexes created/verified');
    
    await pool.end();
    console.log('✅ Vendor tables setup completed');
  } catch (error) {
    console.error('❌ Error creating vendor tables:', error);
    await pool.end();
  }
}

createVendorTables(); 