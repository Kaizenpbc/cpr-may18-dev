const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function testDashboardQuery() {
  try {
    const startDate = '2025-07-01';
    const endDate = '2025-07-31';
    
    console.log('Testing dashboard query for akil (user ID: 100)');
    console.log('Date range:', startDate, 'to', endDate);
    
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT cr.id) as total_courses,
        COUNT(DISTINCT CASE WHEN cr.status = 'completed' THEN cr.id END) as completed_courses,
        COUNT(DISTINCT CASE WHEN cr.status = 'confirmed' THEN cr.id END) as scheduled_courses,
        COUNT(DISTINCT CASE WHEN cr.status = 'cancelled' THEN cr.id END) as cancelled_courses,
        COALESCE(SUM(cs.student_count), 0) as total_students,
        COALESCE(SUM(cs.attended_count), 0) as students_attended
      FROM course_requests cr
      LEFT JOIN (
        SELECT 
          course_request_id,
          COUNT(*) as student_count,
          COUNT(CASE WHEN attended = true THEN 1 END) as attended_count
        FROM course_students
        GROUP BY course_request_id
      ) cs ON cr.id = cs.course_request_id
      WHERE cr.instructor_id = 100
      AND (
        (cr.scheduled_date >= $1 AND cr.scheduled_date <= $2)
        OR (cr.confirmed_date >= $1 AND cr.confirmed_date <= $2)
      )
    `, [startDate, endDate]);
    
    console.log('Dashboard query result:', result.rows[0]);
    
    // Also check the raw course data
    const courseData = await pool.query(`
      SELECT id, status, scheduled_date, confirmed_date, completed_at
      FROM course_requests 
      WHERE instructor_id = 100
    `);
    
    console.log('Raw course data for akil:', courseData.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testDashboardQuery(); 