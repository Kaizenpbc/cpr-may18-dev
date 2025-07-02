const { Pool } = require('pg');
require('dotenv').config();

async function testEmailTemplates() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'gtacpr',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'cpr_jun21', // Use the same database as the main app
  });

  try {
    console.log('🔍 Checking email templates in database...');
    
    const result = await pool.query('SELECT COUNT(*) as count FROM email_templates WHERE deleted_at IS NULL');
    console.log('Total email templates:', result.rows[0].count);
    
    if (result.rows[0].count > 0) {
      const templates = await pool.query('SELECT name, key, is_active FROM email_templates WHERE deleted_at IS NULL');
      console.log('\nEmail templates found:');
      templates.rows.forEach(row => {
        console.log(`- ${row.name} (${row.key}) - Active: ${row.is_active}`);
      });
    } else {
      console.log('No email templates found. Running seed script...');
      // Run the seed script
      const { execSync } = require('child_process');
      execSync('node seed-email-templates-simple.cjs', { stdio: 'inherit' });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testEmailTemplates(); 