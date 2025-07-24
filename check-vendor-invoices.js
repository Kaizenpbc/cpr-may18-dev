// Check recent vendor invoices
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkVendorInvoices() {
  try {
    console.log('🔍 [DATABASE] Checking recent vendor invoices...\n');
    
    const result = await pool.query(`
      SELECT 
        id, 
        invoice_number, 
        amount, 
        description, 
        status, 
        created_at,
        pdf_filename
      FROM vendor_invoices 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    if (result.rows.length === 0) {
      console.log('📋 No vendor invoices found in database');
    } else {
      console.log('📋 Recent Vendor Invoices:');
      result.rows.forEach((row, index) => {
        console.log(`\n  ${index + 1}. Invoice #${row.id}:`);
        console.log(`     Invoice Number: ${row.invoice_number}`);
        console.log(`     Amount: $${row.amount}`);
        console.log(`     Description: ${row.description || 'N/A'}`);
        console.log(`     Status: ${row.status}`);
        console.log(`     PDF File: ${row.pdf_filename || 'N/A'}`);
        console.log(`     Created: ${row.created_at}`);
      });
    }

    // Check file storage
    console.log('\n📁 Checking uploads directory...');
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, 'backend', 'uploads', 'vendor-invoices');
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      console.log(`  Found ${files.length} files in uploads/vendor-invoices/`);
      if (files.length > 0) {
        console.log('  Recent files:');
        files.slice(-3).forEach(file => {
          const filePath = path.join(uploadsDir, file);
          const stats = fs.statSync(filePath);
          console.log(`    - ${file} (${stats.size} bytes, ${stats.mtime})`);
        });
      }
    } else {
      console.log('  Uploads directory not found');
    }

  } catch (error) {
    console.error('❌ [DATABASE] Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkVendorInvoices(); 