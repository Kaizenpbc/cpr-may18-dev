import { pool } from './src/config/database.ts';

async function checkAllEmailColumns() {
  try {
    console.log('Checking all tables for email-related columns...');
    
    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('\nAll tables in database:');
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // Check for email-related columns in all tables
    const emailColumnsResult = await pool.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND (column_name ILIKE '%email%' OR column_name ILIKE '%mail%')
      ORDER BY table_name, column_name;
    `);
    
    console.log('\nEmail-related columns found:');
    if (emailColumnsResult.rows.length === 0) {
      console.log('No email-related columns found');
    } else {
      emailColumnsResult.rows.forEach(row => {
        console.log(`- ${row.table_name}.${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }
    
    // Also check for contact-related columns
    const contactColumnsResult = await pool.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND column_name ILIKE '%contact%'
      ORDER BY table_name, column_name;
    `);
    
    console.log('\nContact-related columns found:');
    if (contactColumnsResult.rows.length === 0) {
      console.log('No contact-related columns found');
    } else {
      contactColumnsResult.rows.forEach(row => {
        console.log(`- ${row.table_name}.${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error checking email columns:', error);
    await pool.end();
  }
}

checkAllEmailColumns(); 