const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function searchMikeLowercase() {
  try {
    console.log('🔍 Searching for "mike" (lowercase) in all name fields...\n');
    
    // 1. Search in instructors table
    console.log('1. Searching in instructors table...');
    const instructors = await pool.query(`
      SELECT * FROM instructors 
      WHERE LOWER(name) LIKE '%mike%'
      OR LOWER(name) LIKE '%michael%'
    `);
    
    if (instructors.rows.length > 0) {
      console.log('Found in instructors table:');
      instructors.rows.forEach(instructor => {
        console.log(`  - ID: ${instructor.id}, Name: ${instructor.name}, User ID: ${instructor.user_id}`);
      });
    } else {
      console.log('❌ No matches found in instructors table');
    }
    
    // 2. Search in course_students table for any "mike" references
    console.log('\n2. Searching in course_students table...');
    const courseStudents = await pool.query(`
      SELECT DISTINCT first_name, last_name, email
      FROM course_students 
      WHERE LOWER(first_name) LIKE '%mike%'
      OR LOWER(last_name) LIKE '%mike%'
      OR LOWER(email) LIKE '%mike%'
    `);
    
    if (courseStudents.rows.length > 0) {
      console.log('Found in course_students table:');
      courseStudents.rows.forEach(student => {
        console.log(`  - ${student.first_name} ${student.last_name} (${student.email})`);
      });
    } else {
      console.log('❌ No matches found in course_students table');
    }
    
    // 3. Search in organizations table
    console.log('\n3. Searching in organizations table...');
    const organizations = await pool.query(`
      SELECT * FROM organizations 
      WHERE LOWER(name) LIKE '%mike%'
      OR LOWER(contact_email) LIKE '%mike%'
    `);
    
    if (organizations.rows.length > 0) {
      console.log('Found in organizations table:');
      organizations.rows.forEach(org => {
        console.log(`  - ID: ${org.id}, Name: ${org.name}, Email: ${org.contact_email}`);
      });
    } else {
      console.log('❌ No matches found in organizations table');
    }
    
    // 4. Search in vendors table
    console.log('\n4. Searching in vendors table...');
    const vendors = await pool.query(`
      SELECT * FROM vendors 
      WHERE LOWER(name) LIKE '%mike%'
      OR LOWER(contact_email) LIKE '%mike%'
      OR LOWER(contact_first_name) LIKE '%mike%'
      OR LOWER(contact_last_name) LIKE '%mike%'
    `);
    
    if (vendors.rows.length > 0) {
      console.log('Found in vendors table:');
      vendors.rows.forEach(vendor => {
        console.log(`  - ID: ${vendor.id}, Name: ${vendor.name}, Contact: ${vendor.contact_first_name} ${vendor.contact_last_name}`);
      });
    } else {
      console.log('❌ No matches found in vendors table');
    }
    
    // 5. Search in all tables for any "mike" references
    console.log('\n5. Searching all tables for "mike" references...');
    const allTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    for (const table of allTables.rows) {
      try {
        // Get all text/varchar columns for this table
        const columns = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1 
          AND (data_type = 'character varying' OR data_type = 'text')
        `, [table.table_name]);
        
        for (const col of columns.rows) {
          try {
            const result = await pool.query(`
              SELECT DISTINCT ${col.column_name}
              FROM ${table.table_name}
              WHERE LOWER(${col.column_name}) LIKE '%mike%'
              LIMIT 5
            `);
            
            if (result.rows.length > 0) {
              console.log(`Found in ${table.table_name}.${col.column_name}:`);
              result.rows.forEach(row => {
                console.log(`  - ${row[col.column_name]}`);
              });
            }
          } catch (error) {
            // Skip if query fails
          }
        }
      } catch (error) {
        // Skip if table query fails
      }
    }
    
    // 6. Check if there are any views that might show instructor names
    console.log('\n6. Checking for views that might show instructor names...');
    const views = await pool.query(`
      SELECT viewname 
      FROM pg_views 
      WHERE schemaname = 'public'
    `);
    
    console.log('Available views:');
    views.rows.forEach(view => {
      console.log(`  - ${view.viewname}`);
    });
    
    // 7. Check specific views for mike
    for (const view of views.rows) {
      try {
        const result = await pool.query(`
          SELECT * FROM ${view.viewname} 
          WHERE LOWER(CAST(* AS TEXT)) LIKE '%mike%'
          LIMIT 3
        `);
        
        if (result.rows.length > 0) {
          console.log(`\nFound in view ${view.viewname}:`);
          result.rows.forEach(row => {
            console.log(`  - ${JSON.stringify(row)}`);
          });
        }
      } catch (error) {
        // Skip if view query fails
      }
    }
    
  } catch (error) {
    console.error('❌ Error searching for mike:', error);
  } finally {
    await pool.end();
  }
}

searchMikeLowercase(); 