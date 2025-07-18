const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function enhanceTimesheetCourses() {
  try {
    console.log('🔧 Enhancing Timesheet System to Include Course Details...\n');

    // 1. Check current timesheet table structure
    console.log('1. Current Timesheet Table Structure:');
    const tableStructureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'timesheets'
      ORDER BY ordinal_position
    `);

    console.log('Current columns:');
    tableStructureResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // 2. Check if we need to add course_details column
    const hasCourseDetails = tableStructureResult.rows.some(col => col.column_name === 'course_details');
    
    if (!hasCourseDetails) {
      console.log('\n2. Adding course_details column to timesheets table...');
      await pool.query(`
        ALTER TABLE timesheets 
        ADD COLUMN course_details JSONB DEFAULT '[]'::jsonb
      `);
      console.log('✅ Added course_details column');
    } else {
      console.log('\n2. course_details column already exists');
    }

    // 3. Get Mike's current timesheet and courses
    console.log('\n3. Getting Mike\'s current timesheet and courses...');
    const mikeTimesheetResult = await pool.query(`
      SELECT t.id, t.week_start_date, t.status, u.username
      FROM timesheets t
      JOIN users u ON t.instructor_id = u.id
      WHERE u.username = 'mike' AND t.status = 'pending'
      ORDER BY t.created_at DESC
      LIMIT 1
    `);

    if (mikeTimesheetResult.rows.length === 0) {
      console.log('❌ No pending timesheet found for Mike');
      return;
    }

    const timesheet = mikeTimesheetResult.rows[0];
    console.log(`Found timesheet ID: ${timesheet.id}, Week: ${timesheet.week_start_date}`);

    // 4. Get courses for Mike's timesheet week
    const weekStartDate = timesheet.week_start_date;
    const endDate = new Date(weekStartDate);
    endDate.setDate(endDate.getDate() + 6);

    const coursesResult = await pool.query(`
      SELECT 
        cr.id,
        cr.confirmed_date::text as date,
        cr.confirmed_start_time::text as start_time,
        cr.confirmed_end_time::text as end_time,
        cr.status,
        cr.location,
        ct.name as course_type,
        o.name as organization_name,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as student_count
      FROM course_requests cr
      JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN organizations o ON cr.organization_id = o.id
      WHERE cr.instructor_id = (SELECT id FROM users WHERE username = 'mike')
      AND cr.confirmed_date >= $1::date
      AND cr.confirmed_date <= $2::date
      AND cr.status IN ('confirmed', 'completed')
      ORDER BY cr.confirmed_date, cr.confirmed_start_time
    `, [weekStartDate, endDate.toISOString().split('T')[0]]);

    console.log(`Found ${coursesResult.rows.length} courses for the week:`);
    coursesResult.rows.forEach((course, index) => {
      console.log(`   ${index + 1}. ${course.course_type} - ${course.date} at ${course.start_time} - ${course.organization_name} (${course.student_count} students)`);
    });

    // 5. Update Mike's timesheet with course details
    console.log('\n4. Updating Mike\'s timesheet with course details...');
    await pool.query(`
      UPDATE timesheets 
      SET course_details = $1, updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(coursesResult.rows), timesheet.id]);

    console.log('✅ Updated timesheet with course details');

    // 6. Show the enhanced timesheet
    console.log('\n5. Enhanced Timesheet Data:');
    const enhancedTimesheetResult = await pool.query(`
      SELECT 
        t.id,
        t.week_start_date,
        t.status,
        t.total_hours,
        t.courses_taught,
        t.course_details,
        u.username
      FROM timesheets t
      JOIN users u ON t.instructor_id = u.id
      WHERE t.id = $1
    `, [timesheet.id]);

    const enhancedTimesheet = enhancedTimesheetResult.rows[0];
    console.log(`Timesheet ID: ${enhancedTimesheet.id}`);
    console.log(`Week: ${enhancedTimesheet.week_start_date}`);
    console.log(`Status: ${enhancedTimesheet.status}`);
    console.log(`Hours: ${enhancedTimesheet.total_hours}`);
    console.log(`Courses Taught: ${enhancedTimesheet.courses_taught}`);
    console.log(`Course Details: ${JSON.stringify(enhancedTimesheet.course_details, null, 2)}`);

    console.log('\n🎉 Timesheet enhancement complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. HR can now see course details when approving timesheets');
    console.log('2. Course details will be included in payment requests');
    console.log('3. Accounting will have full course information for payment processing');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

enhanceTimesheetCourses(); 