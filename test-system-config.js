const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function testSystemConfig() {
  try {
    console.log('🔍 Testing system_configurations table...\n');
    
    // Test 1: Check if table exists and has data
    const result = await pool.query(`
      SELECT 
        config_key,
        config_value,
        description,
        category,
        updated_at
      FROM system_configurations 
      ORDER BY category, config_key
    `);
    
    console.log(`✅ Found ${result.rows.length} configurations:\n`);
    
    // Group by category
    const byCategory = {};
    result.rows.forEach(row => {
      if (!byCategory[row.category]) {
        byCategory[row.category] = [];
      }
      byCategory[row.category].push(row);
    });
    
    // Display by category
    Object.keys(byCategory).forEach(category => {
      console.log(`📋 ${category.toUpperCase()} SETTINGS:`);
      byCategory[category].forEach(config => {
        console.log(`   ${config.config_key}: ${config.config_value} (${config.description})`);
      });
      console.log('');
    });
    
    // Test 2: Check specific key
    const invoiceDueDays = await pool.query(`
      SELECT config_value FROM system_configurations 
      WHERE config_key = 'invoice_due_days'
    `);
    
    if (invoiceDueDays.rows.length > 0) {
      console.log(`✅ Invoice due days setting: ${invoiceDueDays.rows[0].config_value} days`);
    } else {
      console.log('❌ Invoice due days setting not found');
    }
    
    // Test 3: Check email settings
    const smtpHost = await pool.query(`
      SELECT config_value FROM system_configurations 
      WHERE config_key = 'email_smtp_host'
    `);
    
    if (smtpHost.rows.length > 0) {
      console.log(`✅ SMTP host setting: ${smtpHost.rows[0].config_value}`);
    } else {
      console.log('❌ SMTP host setting not found');
    }
    
    console.log('\n🎉 System configurations table is ready for use!');
    
  } catch (error) {
    console.error('❌ Error testing system configurations:', error);
  } finally {
    await pool.end();
  }
}

testSystemConfig(); 