const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function testTimesheetFlow() {
  const client = await pool.connect();

  try {
    console.log('=== TIMESHEET FLOW TEST ===\n');

    // Get the timesheet we created
    const timesheetResult = await client.query('SELECT * FROM timesheets ORDER BY id DESC LIMIT 1');
    const timesheet = timesheetResult.rows[0];
    console.log('Found Timesheet ID:', timesheet.id, 'Status:', timesheet.status);

    // Create payment request if needed
    console.log('\nChecking payment request...');
    const existingPR = await client.query(
      'SELECT * FROM payment_requests WHERE timesheet_id = $1',
      [timesheet.id]
    );

    if (existingPR.rows.length === 0) {
      const amount = 200;
      const paymentResult = await client.query(
        `INSERT INTO payment_requests (
          instructor_id, timesheet_id, amount, payment_date, status, created_at, updated_at
        ) VALUES ($1, $2, $3, CURRENT_DATE, 'pending', NOW(), NOW())
        RETURNING *`,
        [timesheet.instructor_id, timesheet.id, amount]
      );

      console.log('Payment request created:', {
        id: paymentResult.rows[0].id,
        amount: paymentResult.rows[0].amount,
        status: paymentResult.rows[0].status,
      });
    } else {
      console.log('Payment request already exists:', existingPR.rows[0].id);
    }

    // Verify the complete flow
    console.log('\n=== FLOW VERIFICATION ===\n');
    const verifyResult = await client.query(
      `SELECT
        t.id as timesheet_id,
        t.week_start_date,
        t.status as timesheet_status,
        t.total_hours,
        t.teaching_hours,
        t.travel_time,
        t.prep_time,
        t.is_late,
        t.courses_taught,
        pr.id as payment_id,
        pr.amount,
        pr.status as payment_status,
        u.username as instructor_name
      FROM timesheets t
      LEFT JOIN payment_requests pr ON pr.timesheet_id = t.id
      JOIN users u ON t.instructor_id = u.id
      WHERE t.id = $1`,
      [timesheet.id]
    );

    const result = verifyResult.rows[0];
    console.log('Instructor:', result.instructor_name);
    console.log('Week Of:', result.week_start_date);
    console.log('');
    console.log('TIMESHEET:');
    console.log('  - ID:', result.timesheet_id);
    console.log('  - Status:', result.timesheet_status);
    console.log('  - Courses Taught:', result.courses_taught);
    console.log('  - Teaching Hours:', result.teaching_hours);
    console.log('  - Travel Time:', result.travel_time);
    console.log('  - Prep Time:', result.prep_time);
    console.log('  - Total Hours:', result.total_hours);
    console.log('  - Is Late:', result.is_late);
    console.log('');
    console.log('PAYMENT REQUEST:');
    console.log('  - ID:', result.payment_id);
    console.log('  - Amount: $' + result.amount);
    console.log('  - Status:', result.payment_status);

    console.log('\n=== TEST COMPLETE ===');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

testTimesheetFlow();
