const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function checkMikeFullName() {
  try {
    console.log('🔍 Searching for Mike\'s full name across all tables...\n');
    
    // 1. Check users table for any name-related columns
    console.log('1. Checking users table structure...');
    const userColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY column_name
    `);
    
    console.log('Users table columns:');
    userColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // 2. Check if there's an instructors table
    console.log('\n2. Checking for instructors table...');
    const instructorsTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'instructors'
      );
    `);
    
    if (instructorsTable.rows[0].exists) {
      console.log('✅ Instructors table exists');
      const instructorColumns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'instructors' 
        ORDER BY column_name
      `);
      
      console.log('Instructors table columns:');
      instructorColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
      
      // Check if Mike has an instructor record
      const mikeInstructor = await pool.query(`
        SELECT * FROM instructors WHERE user_id = 32
      `);
      
      if (mikeInstructor.rows.length > 0) {
        console.log('\nMike\'s instructor record:');
        console.log(mikeInstructor.rows[0]);
      } else {
        console.log('\n❌ No instructor record found for Mike');
      }
    } else {
      console.log('❌ Instructors table does not exist');
    }
    
    // 3. Check course_requests table for instructor names
    console.log('\n3. Checking course_requests for instructor names...');
    const courseRequests = await pool.query(`
      SELECT DISTINCT instructor_name 
      FROM course_requests 
      WHERE instructor_name IS NOT NULL 
      AND instructor_name != ''
      ORDER BY instructor_name
    `);
    
    console.log('Instructor names found in course_requests:');
    courseRequests.rows.forEach(row => {
      console.log(`  - ${row.instructor_name}`);
    });
    
    // 4. Check timesheets table for instructor names
    console.log('\n4. Checking timesheets for instructor names...');
    const timesheets = await pool.query(`
      SELECT DISTINCT instructor_name 
      FROM timesheets 
      WHERE instructor_name IS NOT NULL 
      AND instructor_name != ''
      ORDER BY instructor_name
    `);
    
    console.log('Instructor names found in timesheets:');
    timesheets.rows.forEach(row => {
      console.log(`  - ${row.instructor_name}`);
    });
    
    // 5. Check payment_requests table for instructor names
    console.log('\n5. Checking payment_requests for instructor names...');
    const paymentRequests = await pool.query(`
      SELECT DISTINCT instructor_name 
      FROM payment_requests 
      WHERE instructor_name IS NOT NULL 
      AND instructor_name != ''
      ORDER BY instructor_name
    `);
    
    console.log('Instructor names found in payment_requests:');
    paymentRequests.rows.forEach(row => {
      console.log(`  - ${row.instructor_name}`);
    });
    
    // 6. Check if there are any profile-related tables
    console.log('\n6. Checking for profile-related tables...');
    const profileTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%profile%' 
           OR table_name LIKE '%name%' 
           OR table_name LIKE '%person%')
      ORDER BY table_name
    `);
    
    if (profileTables.rows.length > 0) {
      console.log('Profile-related tables found:');
      profileTables.rows.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    } else {
      console.log('❌ No profile-related tables found');
    }
    
    // 7. Check all tables for any name-related columns
    console.log('\n7. Searching all tables for name-related columns...');
    const nameColumns = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND (column_name LIKE '%name%' 
           OR column_name LIKE '%first%' 
           OR column_name LIKE '%last%' 
           OR column_name LIKE '%full%')
      ORDER BY table_name, column_name
    `);
    
    console.log('Name-related columns found:');
    nameColumns.rows.forEach(col => {
      console.log(`  - ${col.table_name}.${col.column_name} (${col.data_type})`);
    });
    
    // 8. Check if Mike appears in any of these name columns
    console.log('\n8. Searching for Mike in name columns...');
    for (const col of nameColumns.rows) {
      try {
        const result = await pool.query(`
          SELECT DISTINCT ${col.column_name}
          FROM ${col.table_name}
          WHERE ${col.column_name} ILIKE '%mike%'
          OR ${col.column_name} ILIKE '%michael%'
        `);
        
        if (result.rows.length > 0) {
          console.log(`Found in ${col.table_name}.${col.column_name}:`);
          result.rows.forEach(row => {
            console.log(`  - ${row[col.column_name]}`);
          });
        }
      } catch (error) {
        // Skip if query fails (e.g., column doesn't exist in current table)
      }
    }
    
  } catch (error) {
    console.error('❌ Error searching for Mike\'s full name:', error);
  } finally {
    await pool.end();
  }
}

checkMikeFullName(); 