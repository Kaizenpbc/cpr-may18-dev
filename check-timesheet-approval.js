const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr',
});

async function checkTimesheetApproval() {
  try {
    console.log('🔍 Checking Timesheet Approval and Payment Request Creation...\n');

    // First, let's see what columns exist in the timesheets table
    console.log('1. Checking timesheets table structure:');
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'timesheets' 
      ORDER BY ordinal_position
    `);
    
    console.log('Timesheets table columns:');
    columnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // Check recent timesheets
    console.log('\n2. Recent Timesheets:');
    const timesheetsResult = await pool.query(`
      SELECT 
        t.id,
        t.instructor_id,
        t.week_start_date,
        t.total_hours,
        t.courses_taught,
        t.status,
        t.updated_at,
        u.username as instructor_name
      FROM timesheets t
      JOIN users u ON t.instructor_id = u.id
      ORDER BY t.updated_at DESC
      LIMIT 5
    `);

    if (timesheetsResult.rows.length === 0) {
      console.log('❌ No timesheets found');
      return;
    }

    timesheetsResult.rows.forEach((timesheet, index) => {
      console.log(`\n${index + 1}. Timesheet ID: ${timesheet.id}`);
      console.log(`   Instructor: ${timesheet.instructor_name} (ID: ${timesheet.instructor_id})`);
      console.log(`   Week Starting: ${timesheet.week_start_date}`);
      console.log(`   Hours: ${timesheet.total_hours}, Courses: ${timesheet.courses_taught}`);
      console.log(`   Status: ${timesheet.status}`);
      console.log(`   Updated At: ${timesheet.updated_at}`);
    });

    // Check payment requests
    console.log('\n3. Recent Payment Requests:');
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
      LIMIT 5
    `);

    if (paymentRequestsResult.rows.length === 0) {
      console.log('❌ No payment requests found');
    } else {
      paymentRequestsResult.rows.forEach((pr, index) => {
        console.log(`\n${index + 1}. Payment Request ID: ${pr.id}`);
        console.log(`   Instructor: ${pr.instructor_name} (ID: ${pr.instructor_id})`);
        console.log(`   Timesheet ID: ${pr.timesheet_id}`);
        console.log(`   Amount: $${pr.amount}`);
        console.log(`   Status: ${pr.status}`);
        console.log(`   Created At: ${pr.created_at}`);
      });
    }

    // Check if there are approved timesheets without payment requests
    console.log('\n4. Approved Timesheets Without Payment Requests:');
    const missingPaymentRequestsResult = await pool.query(`
      SELECT 
        t.id as timesheet_id,
        t.instructor_id,
        t.week_start_date,
        t.updated_at,
        u.username as instructor_name
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
      console.log(`❌ Found ${missingPaymentRequestsResult.rows.length} approved timesheets without payment requests:`);
      missingPaymentRequestsResult.rows.forEach((row, index) => {
        console.log(`\n${index + 1}. Timesheet ID: ${row.timesheet_id}`);
        console.log(`   Instructor: ${row.instructor_name} (ID: ${row.instructor_id})`);
        console.log(`   Week Starting: ${row.week_start_date}`);
        console.log(`   Updated At: ${row.updated_at}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTimesheetApproval(); 