require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'cpr_jun21'
});

async function checkIffatCourses() {
  console.log('🔍 Checking completed courses for Iffat College...\n');
  
  try {
    // First, find Iffat College's organization ID
    const orgResult = await pool.query(`
      SELECT id, name 
      FROM organizations 
      WHERE name ILIKE '%iffat%' OR name ILIKE '%ifat%'
    `);
    
    if (orgResult.rows.length === 0) {
      console.log('❌ Iffat College not found in organizations table');
      return;
    }
    
    const organization = orgResult.rows[0];
    console.log(`✅ Found organization: ${organization.name} (ID: ${organization.id})`);
    
    // Check completed courses for this organization
    const completedCoursesResult = await pool.query(`
      SELECT 
        cr.id,
        cr.course_date,
        cr.location,
        ct.name as course_type,
        cr.status,
        cr.students_enrolled,
        cr.created_at,
        i.invoice_number,
        i.status as invoice_status,
        i.amount as invoice_amount
      FROM course_requests cr
      LEFT JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN invoices i ON cr.id = i.course_request_id
      WHERE cr.organization_id = $1 
        AND cr.status = 'completed'
      ORDER BY cr.course_date DESC
    `, [organization.id]);
    
    console.log(`\n📊 Completed Courses for ${organization.name}:`);
    console.log(`   Total completed courses: ${completedCoursesResult.rows.length}`);
    
    if (completedCoursesResult.rows.length > 0) {
      console.log('\n📋 Course Details:');
      completedCoursesResult.rows.forEach((course, index) => {
        console.log(`\n   ${index + 1}. Course ID: ${course.id}`);
        console.log(`      Date: ${course.course_date}`);
        console.log(`      Location: ${course.location}`);
        console.log(`      Type: ${course.course_type}`);
        console.log(`      Students: ${course.students_enrolled}`);
        console.log(`      Invoice: ${course.invoice_number || 'Not created'}`);
        console.log(`      Invoice Status: ${course.invoice_status || 'N/A'}`);
        console.log(`      Invoice Amount: $${course.invoice_amount || 'N/A'}`);
      });
    }
    
    // Check all course statuses for this organization
    const allCoursesResult = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM course_requests 
      WHERE organization_id = $1
      GROUP BY status
      ORDER BY status
    `, [organization.id]);
    
    console.log('\n📈 All Course Statuses:');
    allCoursesResult.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count} courses`);
    });
    
    // Check recent activity
    const recentActivityResult = await pool.query(`
      SELECT 
        cr.id,
        cr.course_date,
        cr.status,
        cr.students_enrolled,
        i.invoice_number,
        i.status as invoice_status
      FROM course_requests cr
      LEFT JOIN invoices i ON cr.id = i.course_request_id
      WHERE cr.organization_id = $1 
        AND cr.created_at >= NOW() - INTERVAL '30 days'
      ORDER BY cr.created_at DESC
      LIMIT 5
    `, [organization.id]);
    
    if (recentActivityResult.rows.length > 0) {
      console.log('\n🕒 Recent Activity (Last 30 Days):');
      recentActivityResult.rows.forEach((activity, index) => {
        console.log(`   ${index + 1}. Course ${activity.id} - ${activity.status} (${activity.course_date})`);
        console.log(`      Students: ${activity.students_enrolled}, Invoice: ${activity.invoice_number || 'None'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking Iffat College courses:', error);
  } finally {
    await pool.end();
  }
}

checkIffatCourses(); 