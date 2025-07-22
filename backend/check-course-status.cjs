const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function checkCourseStatus() {
  console.log('🔍 Checking course status in database for Iffat College...\n');
  
  try {
    // Get all courses for Iffat College (organization_id = 2)
    const result = await pool.query(`
      SELECT 
        cr.id,
        cr.status,
        cr.archived,
        cr.archived_at,
        cr.confirmed_date,
        cr.location,
        i.id as invoice_id,
        i.invoice_number,
        i.status as invoice_status
      FROM course_requests cr
      LEFT JOIN invoices i ON cr.id = i.course_request_id
      WHERE cr.organization_id = 2
      ORDER BY cr.confirmed_date DESC
    `);
    
    console.log(`📊 Found ${result.rows.length} courses for Iffat College:\n`);
    
    result.rows.forEach((course, index) => {
      console.log(`${index + 1}. Course ID: ${course.id}`);
      console.log(`   Status: ${course.status}`);
      console.log(`   Archived: ${course.archived}`);
      console.log(`   Archived At: ${course.archived_at || 'N/A'}`);
      console.log(`   Confirmed Date: ${course.confirmed_date}`);
      console.log(`   Location: ${course.location}`);
      console.log(`   Invoice ID: ${course.invoice_id || 'N/A'}`);
      console.log(`   Invoice Number: ${course.invoice_number || 'N/A'}`);
      console.log(`   Invoice Status: ${course.invoice_status || 'N/A'}`);
      console.log('');
    });
    
    // Summary
    const completed = result.rows.filter(c => c.status === 'completed');
    const archived = result.rows.filter(c => c.archived === true);
    const withInvoices = result.rows.filter(c => c.invoice_id !== null);
    
    console.log('📈 Summary:');
    console.log(`   Total courses: ${result.rows.length}`);
    console.log(`   Completed: ${completed.length}`);
    console.log(`   Archived: ${archived.length}`);
    console.log(`   With invoices: ${withInvoices.length}`);
    
    // Check which completed courses are not archived
    const completedNotArchived = completed.filter(c => c.archived !== true);
    if (completedNotArchived.length > 0) {
      console.log('\n⚠️  Completed courses NOT archived:');
      completedNotArchived.forEach(course => {
        console.log(`   Course ${course.id}: ${course.invoice_id ? 'Has invoice but not archived' : 'No invoice'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCourseStatus(); 