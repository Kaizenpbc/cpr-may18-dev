const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr',
});

async function createMissingPaymentRequests() {
  try {
    console.log('🔧 Creating Missing Payment Requests for Approved Timesheets...\n');

    // Find approved timesheets without payment requests
    const missingPaymentRequestsResult = await pool.query(`
      SELECT 
        t.id as timesheet_id,
        t.instructor_id,
        t.week_start_date,
        t.total_hours,
        t.courses_taught,
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
      console.log('✅ All approved timesheets already have payment requests');
      return;
    }

    console.log(`Found ${missingPaymentRequestsResult.rows.length} approved timesheets without payment requests:`);
    
    for (const timesheet of missingPaymentRequestsResult.rows) {
      console.log(`\n📝 Processing Timesheet ID: ${timesheet.timesheet_id}`);
      console.log(`   Instructor: ${timesheet.instructor_name} (ID: ${timesheet.instructor_id})`);
      console.log(`   Week Starting: ${timesheet.week_start_date}`);
      console.log(`   Hours: ${timesheet.total_hours}, Courses: ${timesheet.courses_taught}`);

      // Calculate payment amount
      const hourlyRate = 25.00; // Default rate
      const courseBonus = 50.00; // Default bonus
      const totalAmount = (timesheet.total_hours * hourlyRate) + (timesheet.courses_taught * courseBonus);
      
      console.log(`   Calculated Amount: $${totalAmount.toFixed(2)} (${timesheet.total_hours}h × $${hourlyRate} + ${timesheet.courses_taught} courses × $${courseBonus})`);

      try {
        // Create payment request
        const insertResult = await pool.query(`
          INSERT INTO payment_requests (
            instructor_id,
            timesheet_id,
            amount,
            payment_date,
            payment_method,
            notes,
            status,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          RETURNING *
        `, [
          timesheet.instructor_id,
          timesheet.timesheet_id,
          totalAmount,
          new Date().toISOString().split('T')[0], // payment_date
          'direct_deposit', // payment_method
          `Payment for timesheet week starting ${timesheet.week_start_date}. Hours: ${timesheet.total_hours}, Courses: ${timesheet.courses_taught}`,
          'pending'
        ]);

        console.log(`   ✅ SUCCESS: Payment request created with ID: ${insertResult.rows[0].id}`);
        console.log(`   Amount: $${insertResult.rows[0].amount}`);

      } catch (insertError) {
        console.log(`   ❌ FAILED to create payment request: ${insertError.message}`);
      }
    }

    // Verify the results
    console.log('\n🔍 Verifying Results:');
    const finalCheckResult = await pool.query(`
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

    console.log(`\nTotal payment requests now: ${finalCheckResult.rows.length}`);
    finalCheckResult.rows.forEach((pr, index) => {
      console.log(`${index + 1}. ID: ${pr.id}, Instructor: ${pr.instructor_name}, Amount: $${pr.amount}, Status: ${pr.status}, Timesheet: ${pr.timesheet_id}`);
    });

    console.log('\n🎉 Missing payment requests have been created!');
    console.log('You should now see them in the accounting portal.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createMissingPaymentRequests(); 