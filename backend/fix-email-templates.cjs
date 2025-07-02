const { Pool } = require('pg');
require('dotenv').config();

async function fixEmailTemplates() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'gtacpr',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'cpr_may18',
  });

  const client = await pool.connect();

  try {
    console.log('🔧 Fixing email_templates table...');

    // Add sub_category column if it doesn't exist
    await client.query(`
      ALTER TABLE email_templates 
      ADD COLUMN IF NOT EXISTS sub_category VARCHAR(100) DEFAULT 'general';
    `);

    // Update existing records to have sub_category
    await client.query(`
      UPDATE email_templates 
      SET sub_category = 'general' 
      WHERE sub_category IS NULL;
    `);

    // Make sub_category NOT NULL
    await client.query(`
      ALTER TABLE email_templates 
      ALTER COLUMN sub_category SET NOT NULL;
    `);

    console.log('✅ Database schema fixed successfully!');

    // Check the table structure
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'email_templates' 
      ORDER BY ordinal_position;
    `);

    console.log('📋 Current table structure:');
    result.rows.forEach(row => {
      console.log(`   • ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

  } catch (error) {
    console.error('❌ Error fixing email templates:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixEmailTemplates().then(() => {
  console.log('🎉 Email templates fix completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Failed to fix email templates:', error);
  process.exit(1);
}); 