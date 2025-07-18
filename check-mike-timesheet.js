const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkMikeTimesheet() {
  try {
    console.log('🔍 Checking Mike\'s timesheet and payment requests...\n');

    // 1. Check Mike's timesheets
    console.log('1. Mike\'s Timesheets:');
    const timesheetsResult = await pool.query(`
      SELECT 
        t.id,
        t.status,
        t.week_start_date,
        t.total_hours,
        t.courses_taught,
        t.created_at,
        u.username
      FROM timesheets t
      JOIN users u ON t.instructor_id = u.id
      WHERE u.username = 'mike'
      ORDER BY t.created_at DESC
    `);

    if (timesheetsResult.rows.length === 0) {
      console.log('❌ No timesheets found for Mike');
    } else {
      timesheetsResult.rows.forEach((ts, index) => {
        console.log(`${index + 1}. ID: ${ts.id}, Status: ${ts.status}, Week: ${ts.week_start_date}, Hours: ${ts.total_hours}, Courses: ${ts.courses_taught}`);
      });
    }

    // 2. Check payment requests for Mike
    console.log('\n2. Payment Requests for Mike:');
    const paymentRequestsResult = await pool.query(`
      SELECT 
        pr.id,
        pr.timesheet_id,
        pr.amount,
        pr.status,
        pr.created_at,
        u.username
      FROM payment_requests pr
      JOIN users u ON pr.instructor_id = u.id
      WHERE u.username = 'mike'
      ORDER BY pr.created_at DESC
    `);

    if (paymentRequestsResult.rows.length === 0) {
      console.log('❌ No payment requests found for Mike');
    } else {
      paymentRequestsResult.rows.forEach((pr, index) => {
        console.log(`${index + 1}. ID: ${pr.id}, Timesheet ID: ${pr.timesheet_id}, Amount: $${pr.amount}, Status: ${pr.status}`);
      });
    }

    // 3. Check if there are approved timesheets without payment requests
    console.log('\n3. Approved Timesheets Without Payment Requests:');
    const missingPaymentRequestsResult = await pool.query(`
      SELECT 
        t.id as timesheet_id,
        t.instructor_id,
        t.week_start_date,
        u.username
      FROM timesheets t
      JOIN users u ON t.instructor_id = u.id
      LEFT JOIN payment_requests pr ON t.id = pr.timesheet_id
      WHERE t.status = 'approved' 
        AND pr.id IS NULL
      ORDER BY t.updated_at DESC
    `);

    if (missingPaymentRequestsResult.rows.length === 0) {
      console.log('✅ All approved timesheets have payment requests');
    } else {
      console.log(`Found ${missingPaymentRequestsResult.rows.length} approved timesheets without payment requests:`);
      missingPaymentRequestsResult.rows.forEach((ts, index) => {
        console.log(`${index + 1}. Timesheet ID: ${ts.timesheet_id}, Instructor: ${ts.username}, Week: ${ts.week_start_date}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMikeTimesheet(); 