const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  user: 'postgres',
  password: 'gtacpr',
  port: 5432,
  database: 'cpr_may18',
});

async function checkDuplicates() {
  try {
    console.log('🔍 Checking for duplicate student entries...\n');
    
    // Find duplicates by email
    const duplicateQuery = `
      SELECT 
        email,
        COUNT(*) as count,
        array_agg(id) as ids,
        array_agg(created_at) as created_dates
      FROM course_students
      WHERE course_request_id = 27
      GROUP BY email
      HAVING COUNT(*) > 1
      ORDER BY email
    `;
    
    const duplicateResult = await pool.query(duplicateQuery);
    
    if (duplicateResult.rows.length === 0) {
      console.log('✅ No duplicate emails found');
      return;
    }
    
    console.log('⚠️  Found duplicate student entries:');
    duplicateResult.rows.forEach(dup => {
      console.log(`   Email: ${dup.email}`);
      console.log(`   Count: ${dup.count}`);
      console.log(`   IDs: ${dup.ids.join(', ')}`);
      console.log(`   Created Dates: ${dup.created_dates.join(', ')}`);
      console.log('');
    });
    
    // Show all records for this course
    console.log('📋 All student records for course 27:');
    const allRecordsQuery = `
      SELECT 
        id,
        email,
        first_name,
        last_name,
        attended,
        created_at
      FROM course_students
      WHERE course_request_id = 27
      ORDER BY email, created_at
    `;
    
    const allRecordsResult = await pool.query(allRecordsQuery);
    allRecordsResult.rows.forEach((record, index) => {
      console.log(`   ${index + 1}. ID: ${record.id} | Email: ${record.email} | Name: ${record.first_name} ${record.last_name} | Attended: ${record.attended} | Created: ${record.created_at}`);
    });
    console.log('');
    
    // Count unique students vs total records
    const uniqueCountQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT email) as unique_students
      FROM course_students
      WHERE course_request_id = 27
    `;
    
    const countResult = await pool.query(uniqueCountQuery);
    console.log('📊 Student Count Analysis:');
    console.log(`   Total Records: ${countResult.rows[0].total_records}`);
    console.log(`   Unique Students: ${countResult.rows[0].unique_students}`);
    console.log('');
    
    // Ask if user wants to remove duplicates
    console.log('🔧 To fix this, we can:');
    console.log('   1. Remove duplicate entries (keep the oldest)');
    console.log('   2. Update the query to count unique students');
    console.log('   3. Add a unique constraint to prevent future duplicates');
    console.log('');
    
    // For now, let's show what the corrected query would return
    console.log('🔍 Testing corrected query (counting unique students):');
    const correctedQuery = `
      SELECT 
        cr.id as course_id,
        cr.status,
        (SELECT COUNT(DISTINCT email) FROM course_students cs WHERE cs.course_request_id = cr.id) as unique_students_attended,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as total_records
      FROM course_requests cr
      WHERE cr.id = 27
    `;
    
    const correctedResult = await pool.query(correctedQuery);
    console.log(`   Course ID: ${correctedResult.rows[0].course_id}`);
    console.log(`   Status: ${correctedResult.rows[0].status}`);
    console.log(`   Unique Students Attended: ${correctedResult.rows[0].unique_students_attended}`);
    console.log(`   Total Records: ${correctedResult.rows[0].total_records}`);
    
  } catch (error) {
    console.error('❌ Error checking duplicates:', error);
  } finally {
    await pool.end();
  }
}

checkDuplicates(); 