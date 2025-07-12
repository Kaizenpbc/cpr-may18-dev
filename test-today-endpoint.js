const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function testTodayEndpoint() {
  try {
    console.log('🔍 Testing instructor classes today endpoint logic...\n');

    const userId = 32; // Mike's user ID
    
    // Use database current date to avoid timezone issues
    const currentDateResult = await pool.query('SELECT CURRENT_DATE as current_date');
    const todayStr = currentDateResult.rows[0].current_date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log('📅 Current Date (DB):', todayStr);
    console.log('👤 User ID:', userId);

    // Get confirmed course requests from course_requests table for today with actual student counts
    const courseRequestsDbResult = await pool.query(
      `SELECT 
        cr.id,
        cr.id as course_id,
        cr.instructor_id,
        cr.confirmed_date as start_time,
        cr.confirmed_date as end_time,
        cr.status,
        cr.location,
        cr.registered_students as max_students,
        CASE WHEN cr.status = 'completed' THEN true ELSE false END as completed,
        cr.created_at,
        cr.updated_at,
        ct.name as course_name,
        ct.name as coursetypename,
        COALESCE(o.name, 'Unassigned') as organizationname,
        COALESCE(cr.location, '') as notes,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as studentcount,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) as studentsattendance
       FROM course_requests cr
       JOIN class_types ct ON cr.course_type_id = ct.id
       LEFT JOIN organizations o ON cr.organization_id = o.id
       WHERE cr.instructor_id = $1 AND cr.status = 'confirmed' AND cr.confirmed_date::date = $2::date
       ORDER BY cr.confirmed_date ASC`,
      [userId, todayStr]
    );
    
    console.log('\n📋 Raw DB result:');
    console.log(JSON.stringify(courseRequestsDbResult.rows, null, 2));
    
    // Transform the data like the backend does
    const allData = courseRequestsDbResult.rows;
    const result = allData.map(row => {
      // Extract date from start_time for compatibility
      const date = row.start_time ? new Date(row.start_time).toISOString().split('T')[0] : null;
      return {
        ...row,
        date: date
      };
    });
    
    console.log('\n📋 Transformed result:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n✅ Expected API response:');
    console.log(JSON.stringify({ success: true, data: result }, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testTodayEndpoint(); 