const axios = require('axios');

async function testFrontendAPI() {
  try {
    console.log('🔍 Testing frontend API call to instructor classes today...\n');

    // Test the API endpoint directly
    const response = await axios.get('http://localhost:3001/instructor/classes/today', {
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE' // This would need a real token
      }
    });

    console.log('✅ API Response:', response.data);
  } catch (error) {
    console.error('❌ API Error:', error.response?.data || error.message);
  }
}

// For now, let's just test the backend endpoint directly
async function testBackendDirectly() {
  try {
    console.log('🔍 Testing backend endpoint directly...\n');

    // Simulate the exact query the backend makes
    const { Pool } = require('pg');
    require('dotenv').config();

    const pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    const userId = 32; // Mike's user ID
    
    // Use database current date to avoid timezone issues
    const currentDateResult = await pool.query('SELECT CURRENT_DATE as current_date');
    const todayStr = currentDateResult.rows[0].current_date.toISOString().split('T')[0];

    console.log('📅 Current Date (DB):', todayStr);
    console.log('👤 User ID:', userId);

    const result = await pool.query(
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

    console.log('\n📋 Courses found:', result.rows.length);
    result.rows.forEach((course, index) => {
      console.log(`   Course ${index + 1}:`, {
        id: course.id,
        course_id: course.course_id,
        instructor_id: course.instructor_id,
        status: course.status,
        course_name: course.course_name,
        organizationname: course.organizationname,
        location: course.location,
        confirmed_date: course.start_time
      });
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testBackendDirectly(); 