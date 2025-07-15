const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'gtacpr',
  database: 'cpr_jun21',
  port: 5432
});

async function testPaymentRequestService() {
  console.log('🔧 Testing Payment Request Service Directly\n');
  console.log('===========================================');

  try {
    // Get an approved timesheet
    console.log('\n📊 Getting approved timesheets:');
    const timesheetsResult = await pool.query(`
      SELECT 
        t.id,
        t.instructor_id,
        t.week_start_date,
        t.total_hours,
        t.courses_taught,
        t.status,
        u.username as instructor_name
      FROM timesheets t
      JOIN users u ON t.instructor_id = u.id
      WHERE t.status = 'approved'
      ORDER BY t.updated_at DESC
      LIMIT 1
    `);

    if (timesheetsResult.rows.length === 0) {
      console.log('❌ No approved timesheets found');
      return;
    }

    const timesheet = timesheetsResult.rows[0];
    console.log(`Found approved timesheet: ID ${timesheet.id}, Instructor: ${timesheet.instructor_name}, Hours: ${timesheet.total_hours}`);

    // Try to create a payment request manually
    console.log('\n💰 Attempting to create payment request manually...');
    
    // Calculate payment amount (basic calculation)
    const hourlyRate = 25.00; // Default rate
    const courseBonus = 50.00; // Default bonus
    const totalAmount = (timesheet.total_hours * hourlyRate) + (timesheet.courses_taught * courseBonus);
    
    console.log(`Calculated amount: $${totalAmount.toFixed(2)} (${timesheet.total_hours}h × $${hourlyRate} + ${timesheet.courses_taught} courses × $${courseBonus})`);

    // Check if payment request already exists for this timesheet
    const existingResult = await pool.query(`
      SELECT id FROM payment_requests WHERE timesheet_id = $1
    `, [timesheet.id]);

    if (existingResult.rows.length > 0) {
      console.log('⚠️ Payment request already exists for this timesheet');
      return;
    }

    // Try to insert payment request manually
    try {
      const insertResult = await pool.query(`
        INSERT INTO payment_requests (
          instructor_id,
          timesheet_id,
          amount,
          status,
          request_date,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
      `, [
        timesheet.instructor_id,
        timesheet.id,
        totalAmount,
        'pending',
        new Date().toISOString().split('T')[0]
      ]);

      console.log('✅ SUCCESS: Payment request created manually!');
      console.log('Created payment request:', insertResult.rows[0]);
      
      // Verify it was created
      const verifyResult = await pool.query(`
        SELECT 
          pr.*,
          u.username as instructor_name,
          t.week_start_date
        FROM payment_requests pr
        JOIN users u ON pr.instructor_id = u.id
        JOIN timesheets t ON pr.timesheet_id = t.id
        WHERE pr.id = $1
      `, [insertResult.rows[0].id]);

      console.log('Verification:', verifyResult.rows[0]);

    } catch (insertError) {
      console.log('❌ FAILED to create payment request manually');
      console.log('Error:', insertError.message);
      console.log('This suggests a database constraint or schema issue');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await pool.end();
  }
}

testPaymentRequestService(); 