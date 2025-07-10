const { Pool } = require('pg');

const pool = new Pool({ 
  host: 'localhost', 
  port: 5432, 
  database: 'cpr_jun21', 
  user: 'postgres', 
  password: 'gtacpr' 
});

async function testTodaysClasses() {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const query = `
      SELECT 
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
      WHERE cr.instructor_id = $1 AND cr.status = 'confirmed' AND DATE(cr.confirmed_date) = $2 
      ORDER BY cr.confirmed_date ASC
    `;
    
    const result = await pool.query(query, [32, todayStr]);
    console.log('Today\'s classes query result (with confirmed filter):');
    console.log('Date filter:', todayStr);
    result.rows.forEach(row => console.log(row));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testTodaysClasses(); 