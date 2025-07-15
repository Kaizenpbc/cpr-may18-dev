const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'gtacpr',
  database: 'cpr_jun21',
  port: 5432
});

async function checkPaymentRequestsAfterApproval() {
  console.log('🔍 Checking Payment Requests After HR Approval\n');
  console.log('===============================================');

  try {
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
        u.username as instructor_name,
        t.week_start_date,
        t.total_hours
      FROM payment_requests pr
      JOIN users u ON pr.instructor_id = u.id
      JOIN timesheets t ON pr.timesheet_id = t.id
      ORDER BY pr.created_at DESC
      LIMIT 10
    `);

    console.log(`Found ${paymentRequestsResult.rows.length} payment requests:`);
    if (paymentRequestsResult.rows.length > 0) {
      paymentRequestsResult.rows.forEach((pr, index) => {
        console.log(`${index + 1}. ID: ${pr.id}, Instructor: ${pr.instructor_name} (${pr.instructor_id}), Amount: $${pr.amount}, Status: ${pr.status}, Timesheet: ${pr.timesheet_id}, Week: ${pr.week_start_date}`);
      });
      console.log('\n✅ SUCCESS: Payment request was created automatically!');
    } else {
      console.log('❌ No payment requests found');
      console.log('\n⚠️ ISSUE: Payment request was NOT created after HR approval');
    }

    // Check recently approved timesheets
    console.log('\n📊 Checking Recently Approved Timesheets:');
    const approvedTimesheetsResult = await pool.query(`
      SELECT 
        t.id,
        t.instructor_id,
        t.week_start_date,
        t.total_hours,
        t.status,
        t.updated_at,
        u.username as instructor_name
      FROM timesheets t
      JOIN users u ON t.instructor_id = u.id
      WHERE t.status = 'approved'
      ORDER BY t.updated_at DESC
      LIMIT 5
    `);

    console.log(`Found ${approvedTimesheetsResult.rows.length} approved timesheets:`);
    approvedTimesheetsResult.rows.forEach((ts, index) => {
      console.log(`${index + 1}. ID: ${ts.id}, Instructor: ${ts.instructor_name} (${ts.instructor_id}), Week: ${ts.week_start_date}, Hours: ${ts.total_hours}, Updated: ${ts.updated_at}`);
    });

    console.log('\n📋 Summary:');
    console.log(`✅ Payment Requests: ${paymentRequestsResult.rows.length}`);
    console.log(`✅ Approved Timesheets: ${approvedTimesheetsResult.rows.length}`);
    
    if (paymentRequestsResult.rows.length === 0 && approvedTimesheetsResult.rows.length > 0) {
      console.log('\n🔧 Next Steps:');
      console.log('1. Check backend logs for payment request creation errors');
      console.log('2. Verify the PaymentRequestService is working correctly');
      console.log('3. Check if there are any database constraints preventing creation');
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPaymentRequestsAfterApproval(); 