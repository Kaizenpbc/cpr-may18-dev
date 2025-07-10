const { Pool } = require('pg');
require('dotenv').config();

async function cleanupClassesTables() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'cpr_jun21',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'gtacpr',
  });

  try {
    const client = await pool.connect();
    console.log('🔍 Searching for tables related to classes or completed courses...\n');

    // Find tables with relevant names
    const res = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
        AND (tablename ILIKE '%class%' OR tablename ILIKE '%course%' OR tablename ILIKE '%completed%')
    `);

    if (res.rows.length === 0) {
      console.log('❌ No relevant tables found.');
      client.release();
      return;
    }

    console.log('Found tables:');
    res.rows.forEach(row => console.log('  -', row.tablename));
    console.log('');

    // Attempt to delete all records from each table
    for (const row of res.rows) {
      const table = row.tablename;
      try {
        const del = await client.query(`DELETE FROM ${table}`);
        console.log(`✅ Deleted ${del.rowCount} records from ${table}`);
      } catch (error) {
        console.log(`❌ Error deleting from ${table}: ${error.message}`);
      }
    }

    console.log('\n🎉 Cleanup of class/course-related tables completed!');
    client.release();
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  } finally {
    await pool.end();
  }
}

cleanupClassesTables(); 