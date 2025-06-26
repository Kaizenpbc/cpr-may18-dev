const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cpr_jun21',
  password: 'gtacpr',
  port: 5432,
});

async function checkInstructorSchedule() {
  try {
    console.log('🔍 Checking instructor schedule and student registration data...\n');

    // 1. Check instructor ID 2 (assuming this is the test instructor)
    console.log('1. Checking instructor data:');
    const instructorResult = await pool.query(
      'SELECT id, username FROM users WHERE role = $1 AND id = $2',
      ['instructor', 2]
    );
    console.log('Instructor:', instructorResult.rows[0] || 'Not found');

    // 2. Check course_requests assigned to instructor 2
    console.log('\n2. Checking course_requests assigned to instructor 2:');
    const courseRequestsResult = await pool.query(
      `SELECT 
        cr.id,
        cr.confirmed_date,
        cr.confirmed_start_time,
        cr.confirmed_end_time,
        cr.status,
        cr.location,
        cr.registered_students,
        cr.notes,
        ct.name as course_type_name,
        o.name as organization_name
       FROM course_requests cr
       LEFT JOIN class_types ct ON cr.course_type_id = ct.id
       LEFT JOIN organizations o ON cr.organization_id = o.id
       WHERE cr.instructor_id = $1
       AND cr.confirmed_date >= CURRENT_DATE
       AND cr.status = 'confirmed'
       ORDER BY cr.confirmed_date`,
      [2]
    );
    console.log('Course requests:', courseRequestsResult.rows);

    // 3. Check classes assigned to instructor 2
    console.log('\n3. Checking classes assigned to instructor 2:');
    const classesResult = await pool.query(
      `SELECT 
        c.id,
        DATE(c.start_time) as date,
        c.start_time,
        c.end_time,
        c.status,
        c.location,
        c.max_students,
        ct.name as course_type_name,
        o.name as organization_name
       FROM classes c
       LEFT JOIN class_types ct ON c.class_type_id = ct.id
       LEFT JOIN organizations o ON c.organization_id = o.id
       WHERE c.instructor_id = $1
       AND DATE(c.start_time) >= CURRENT_DATE
       AND c.status != 'completed'
       ORDER BY c.start_time`,
      [2]
    );
    console.log('Classes:', classesResult.rows);

    // 4. Check student registrations for course requests
    console.log('\n4. Checking student registrations for course requests:');
    for (const course of courseRequestsResult.rows) {
      const studentsResult = await pool.query(
        `SELECT 
          cs.id,
          cs.student_id,
          u.username,
          u.email
         FROM course_students cs
         LEFT JOIN users u ON cs.student_id = u.id
         WHERE cs.course_request_id = $1
         ORDER BY cs.enrolled_at`,
        [course.id]
      );
      console.log(`Course ${course.id} (${course.course_type_name}) - ${course.confirmed_date}:`);
      console.log(`  Registered students: ${course.registered_students}`);
      console.log(`  Actual student records: ${studentsResult.rows.length}`);
      console.log(`  Students:`, studentsResult.rows.map(s => `${s.username} (${s.email})`));
    }

    // 5. Check the exact query that the instructor portal uses
    console.log('\n5. Testing the instructor portal query:');
    const portalQueryResult = await pool.query(
      `WITH instructor_classes AS (
        -- Get regular classes
        SELECT 
          c.id,
          DATE(c.start_time) as datescheduled,
          c.start_time,
          c.end_time,
          c.status,
          c.location,
          c.max_students,
          0 as current_students,
          c.class_type_id,
          c.organization_id::integer as organization_id,
          NULL as notes,
          NULL as registered_students
        FROM classes c
        WHERE c.instructor_id = $1 
        AND DATE(c.start_time) >= CURRENT_DATE 
        AND c.status != 'completed'
        
        UNION
        
        -- Get confirmed course requests
        SELECT 
          cr.id,
          cr.confirmed_date as datescheduled,
          cr.confirmed_start_time as start_time,
          cr.confirmed_end_time as end_time,
          cr.status,
          cr.location,
          cr.registered_students as max_students,
          0 as current_students,
          cr.class_type_id as class_type_id,
          cr.organization_id::integer as organization_id,
          cr.notes,
          cr.registered_students
        FROM course_requests cr
        WHERE cr.instructor_id = $1
        AND cr.confirmed_date >= CURRENT_DATE
        AND cr.status = 'confirmed'
      )
      SELECT 
        ic.id as course_id,
        ic.datescheduled::text,
        ic.start_time::text,
        ic.end_time::text,
        ic.status,
        ic.location,
        ic.max_students,
        ic.current_students,
        ct.name as coursetypename,
        COALESCE(o.name, 'Unassigned') as organizationname,
        COALESCE(ic.notes, '') as notes,
        COALESCE(ic.registered_students, ic.max_students, 0) as studentcount
      FROM instructor_classes ic
      LEFT JOIN class_types ct ON ic.class_type_id = ct.id
      LEFT JOIN organizations o ON ic.organization_id = o.id
      ORDER BY ic.datescheduled, ic.start_time`,
      [2]
    );
    console.log('Portal query results:', portalQueryResult.rows);

    // 6. Check if there are any recent course assignments
    console.log('\n6. Checking recent course assignments:');
    const recentAssignmentsResult = await pool.query(
      `SELECT 
        cr.id,
        cr.confirmed_date,
        cr.instructor_id,
        cr.registered_students,
        cr.status,
        u.username as instructor_name
       FROM course_requests cr
       LEFT JOIN users u ON cr.instructor_id = u.id
       WHERE cr.instructor_id IS NOT NULL
       AND cr.confirmed_date >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY cr.confirmed_date DESC`,
      []
    );
    console.log('Recent assignments:', recentAssignmentsResult.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkInstructorSchedule(); 