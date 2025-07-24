const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function approveVendorInvoices() {
  try {
    console.log('🔍 Approving vendor invoices...\n');

    // Get admin user ID (assuming there's an admin user)
    const adminResult = await pool.query(`
      SELECT id FROM users WHERE role = 'admin' OR role = 'sysadmin' LIMIT 1
    `);

    if (adminResult.rows.length === 0) {
      console.log('❌ No admin user found. Creating a test admin user...');
      
      // Create a test admin user if none exists
      await pool.query(`
        INSERT INTO users (username, email, password_hash, role, created_at, updated_at)
        VALUES ('admin', 'admin@example.com', 'test_hash', 'admin', NOW(), NOW())
        ON CONFLICT (email) DO NOTHING
      `);
      
      const newAdminResult = await pool.query(`
        SELECT id FROM users WHERE email = 'admin@example.com'
      `);
      
      if (newAdminResult.rows.length === 0) {
        throw new Error('Failed to create admin user');
      }
      
      var adminUserId = newAdminResult.rows[0].id;
      console.log('✅ Created test admin user with ID:', adminUserId);
    } else {
      var adminUserId = adminResult.rows[0].id;
      console.log('✅ Using existing admin user with ID:', adminUserId);
    }

    // Get submitted invoices
    const submittedInvoices = await pool.query(`
      SELECT 
        vi.id, 
        vi.invoice_number, 
        vi.vendor_id, 
        vi.status,
        v.name as vendor_name
      FROM vendor_invoices vi 
      LEFT JOIN vendors v ON vi.vendor_id = v.id 
      WHERE vi.status = 'submitted'
      ORDER BY vi.created_at DESC
    `);

    console.log(`📋 Found ${submittedInvoices.rows.length} submitted invoices to approve:`);
    submittedInvoices.rows.forEach(invoice => {
      console.log(`   - ID: ${invoice.id}, Invoice: ${invoice.invoice_number}, Vendor: ${invoice.vendor_name}`);
    });

    if (submittedInvoices.rows.length === 0) {
      console.log('✅ No submitted invoices to approve');
      return;
    }

    // Approve each invoice
    for (const invoice of submittedInvoices.rows) {
      console.log(`\n🔧 Approving invoice ${invoice.id} (${invoice.invoice_number})...`);
      
      await pool.query(`
        UPDATE vendor_invoices 
        SET status = 'sent_to_accounting', 
            approved_by = $1, 
            admin_notes = $2, 
            sent_to_accounting_at = NOW(), 
            updated_at = NOW()
        WHERE id = $3
      `, [
        adminUserId, 
        `Auto-approved by system - Vendor: ${invoice.vendor_name}`, 
        invoice.id
      ]);
      
      console.log(`✅ Approved invoice ${invoice.id} - Vendor: ${invoice.vendor_name}`);
    }

    // Verify the updates
    const approvedInvoices = await pool.query(`
      SELECT 
        vi.id, 
        vi.invoice_number, 
        vi.vendor_id, 
        vi.status,
        v.name as vendor_name,
        vi.sent_to_accounting_at
      FROM vendor_invoices vi 
      LEFT JOIN vendors v ON vi.vendor_id = v.id 
      WHERE vi.status = 'sent_to_accounting'
      ORDER BY vi.sent_to_accounting_at DESC
    `);

    console.log('\n📋 Approved invoices (now visible in Accounting Portal):');
    approvedInvoices.rows.forEach(invoice => {
      console.log(`   - ID: ${invoice.id}, Invoice: ${invoice.invoice_number}, Vendor: ${invoice.vendor_name}`);
    });

    console.log('\n🎉 All invoices approved! They should now appear in the Accounting Portal with correct vendor names.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

approveVendorInvoices(); 