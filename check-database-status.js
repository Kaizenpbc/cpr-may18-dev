const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'gtacpr',
  database: 'cpr_jun21',
  port: 5432
});

async function checkDatabaseStatus() {
  console.log('🔍 Checking Database Status for Payment Request Workflow\n');
  console.log('=====================================================');

  try {
    // Check timesheets
    console.log('\n📊 Checking Timesheets:');
    const timesheetsResult = await pool.query(`
      SELECT 
        t.id,
        t.instructor_id,
        t.week_start_date,
        t.total_hours,
        t.courses_taught,
        t.status,
        t.created_at,
        u.username as instructor_name
      FROM timesheets t
      JOIN users u ON t.instructor_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 10
    `);

    console.log(`Found ${timesheetsResult.rows.length} timesheets:`);
    timesheetsResult.rows.forEach((ts, index) => {
      console.log(`${index + 1}. ID: ${ts.id}, Instructor: ${ts.instructor_name} (${ts.instructor_id}), Status: ${ts.status}, Week: ${ts.week_start_date}, Hours: ${ts.total_hours}`);
    });

    // Check payment requests
    console.log('\n💰 Checking Payment Requests:');
    const paymentRequestsResult = await pool.query(`
      SELECT 
        pr.id,
        pr.instructor_id,
        pr.timesheet_id,
        pr.amount,
        pr.status,
        pr.created_at,
        u.username as instructor_name
      FROM payment_requests pr
      JOIN users u ON pr.instructor_id = u.id
      ORDER BY pr.created_at DESC
      LIMIT 10
    `);

    console.log(`Found ${paymentRequestsResult.rows.length} payment requests:`);
    paymentRequestsResult.rows.forEach((pr, index) => {
      console.log(`${index + 1}. ID: ${pr.id}, Instructor: ${pr.instructor_name} (${pr.instructor_id}), Amount: $${pr.amount}, Status: ${pr.status}, Timesheet: ${pr.timesheet_id}`);
    });

    // Check users with different roles
    console.log('\n👥 Checking Users by Role:');
    const usersResult = await pool.query(`
      SELECT username, role, id
      FROM users
      WHERE role IN ('hr', 'instructor', 'accountant')
      ORDER BY role, username
    `);

    console.log('Available users:');
    usersResult.rows.forEach((user) => {
      console.log(`- ${user.username} (${user.role}) - ID: ${user.id}`);
    });

    console.log('\n📋 Summary:');
    console.log(`✅ Timesheets: ${timesheetsResult.rows.length}`);
    console.log(`✅ Payment Requests: ${paymentRequestsResult.rows.length}`);
    console.log(`✅ Users: ${usersResult.rows.length}`);

    if (timesheetsResult.rows.length === 0) {
      console.log('\n🔧 Next Steps:');
      console.log('1. Create a timesheet first (login as instructor)');
      console.log('2. Then approve it as HR user');
      console.log('3. Payment request should be created automatically');
    } else if (timesheetsResult.rows.filter(t => t.status === 'pending').length > 0) {
      console.log('\n🔧 Next Steps:');
      console.log('1. Login as HR user to approve pending timesheets');
      console.log('2. Payment requests should be created automatically');
    } else if (timesheetsResult.rows.filter(t => t.status === 'approved').length > 0 && paymentRequestsResult.rows.length === 0) {
      console.log('\n⚠️ Issue Found:');
      console.log('Approved timesheets exist but no payment requests were created');
      console.log('This indicates the automatic workflow is not working');
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabaseStatus(); 