const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkOrganizationsEmails() {
  try {
    console.log('🔍 Checking organizations and their contact emails...\n');
    
    const result = await pool.query(`
      SELECT 
        id,
        name,
        contact_email,
        contact_phone,
        address
      FROM organizations 
      ORDER BY name
    `);
    
    console.log(`📋 Found ${result.rows.length} organizations:\n`);
    
    let orgsWithEmails = 0;
    let orgsWithoutEmails = 0;
    
    result.rows.forEach(org => {
      if (org.contact_email) {
        console.log(`✅ ${org.name}: ${org.contact_email}`);
        orgsWithEmails++;
      } else {
        console.log(`❌ ${org.name}: No contact email`);
        orgsWithoutEmails++;
      }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   Organizations with emails: ${orgsWithEmails}`);
    console.log(`   Organizations without emails: ${orgsWithoutEmails}`);
    
    if (orgsWithoutEmails > 0) {
      console.log(`\n💡 ${orgsWithoutEmails} organizations don't have contact emails!`);
      console.log('💡 This is why emails aren\'t being sent when you post invoices.');
      console.log('💡 You need to add contact emails to these organizations.');
    }
    
    if (orgsWithEmails > 0) {
      console.log(`\n✅ ${orgsWithEmails} organizations have contact emails.`);
      console.log('✅ Emails should be sent when you post invoices to these organizations.');
    }
    
  } catch (error) {
    console.error('❌ Error checking organizations:', error);
  } finally {
    await pool.end();
  }
}

checkOrganizationsEmails(); 