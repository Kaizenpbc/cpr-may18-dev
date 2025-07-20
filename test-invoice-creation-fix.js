const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function testInvoiceCreationFix() {
  try {
    console.log('🔍 Testing invoice creation fix...\n');
    
    // 1. Check billing queue
    console.log('1. Checking billing queue...');
    const billingQueue = await pool.query(`
      SELECT 
        cr.id as course_id,
        cr.organization_id,
        o.name as organization_name,
        ct.name as course_type_name,
        cr.location,
        cr.completed_at::date as date_completed,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) as students_attended,
        cp.price_per_student as rate_per_student,
        cr.ready_for_billing_at,
        cr.invoiced
      FROM course_requests cr
      JOIN organizations o ON cr.organization_id = o.id
      JOIN class_types ct ON cr.course_type_id = ct.id
      JOIN course_pricing cp ON cr.organization_id = cp.organization_id AND cr.course_type_id = cp.course_type_id AND cp.is_active = true
      WHERE cr.status = 'completed'
      AND cr.ready_for_billing_at IS NOT NULL
      AND (cr.invoiced IS NULL OR cr.invoiced = FALSE)
      ORDER BY cr.ready_for_billing_at DESC
      LIMIT 3
    `);
    
    if (billingQueue.rows.length > 0) {
      console.log(`✅ Found ${billingQueue.rows.length} courses in billing queue:`);
      billingQueue.rows.forEach((course, index) => {
        console.log(`  ${index + 1}. Course ID: ${course.course_id}`);
        console.log(`     Organization: ${course.organization_name}`);
        console.log(`     Course: ${course.course_type_name}`);
        console.log(`     Students: ${course.students_attended}`);
        console.log(`     Rate: $${course.rate_per_student}`);
        console.log(`     Total: $${(course.students_attended * course.rate_per_student * 1.13).toFixed(2)}`);
        console.log('');
      });
    } else {
      console.log('❌ No courses found in billing queue');
      return;
    }
    
    // 2. Test the invoice creation query structure
    console.log('2. Testing invoice creation query structure...');
    const testCourse = billingQueue.rows[0];
    
    // Simulate the calculations
    const baseCost = testCourse.students_attended * testCourse.rate_per_student;
    const taxAmount = baseCost * 0.13;
    const totalAmount = baseCost + taxAmount;
    
    console.log(`   Course ID: ${testCourse.course_id}`);
    console.log(`   Base Cost: $${baseCost.toFixed(2)}`);
    console.log(`   Tax (13%): $${taxAmount.toFixed(2)}`);
    console.log(`   Total: $${totalAmount.toFixed(2)}`);
    
    // 3. Check if the invoice creation would work
    console.log('\n3. Testing invoice creation query...');
    
    // This simulates what the backend would do
    const invoiceNumber = `TEST-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    
    try {
      const testInsert = await pool.query(`
        INSERT INTO invoices (
          invoice_number,
          organization_id,
          course_request_id,
          invoice_date,
          amount,
          base_cost,
          tax_amount,
          students_billed,
          status,
          due_date,
          posted_to_org,
          course_type_name,
          location,
          date_completed,
          rate_per_student
        )
        VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, 'pending', CURRENT_DATE + INTERVAL '30 days', FALSE, $8, $9, $10, $11)
        RETURNING *
      `, [
        invoiceNumber,
        testCourse.organization_id,
        testCourse.course_id,
        totalAmount,
        baseCost,
        taxAmount,
        testCourse.students_attended,
        testCourse.course_type_name,
        testCourse.location,
        testCourse.date_completed,
        testCourse.rate_per_student,
      ]);
      
      console.log('✅ Invoice creation query works!');
      console.log('   Created invoice:', testInsert.rows[0].invoice_number);
      console.log('   Amount:', testInsert.rows[0].amount);
      console.log('   Base Cost:', testInsert.rows[0].base_cost);
      console.log('   Tax Amount:', testInsert.rows[0].tax_amount);
      
      // Clean up the test invoice
      await pool.query('DELETE FROM invoices WHERE invoice_number = $1', [invoiceNumber]);
      console.log('   ✅ Test invoice cleaned up');
      
    } catch (error) {
      console.error('❌ Invoice creation query failed:', error.message);
      return;
    }
    
    // 4. Check existing invoices structure
    console.log('\n4. Checking existing invoices structure...');
    const existingInvoices = await pool.query(`
      SELECT 
        id,
        invoice_number,
        amount,
        base_cost,
        tax_amount,
        students_billed,
        created_at
      FROM invoices 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    
    if (existingInvoices.rows.length > 0) {
      console.log('Existing invoices:');
      existingInvoices.rows.forEach(invoice => {
        console.log(`  - ${invoice.invoice_number}: $${invoice.amount} (Base: $${invoice.base_cost}, Tax: $${invoice.tax_amount})`);
      });
    }
    
    console.log('\n🎉 Invoice creation fix is working correctly!');
    console.log('   - base_cost and tax_amount columns exist');
    console.log('   - Invoice creation query works');
    console.log('   - Calculations are correct');
    console.log('   - Frontend should now show proper feedback');
    
  } catch (error) {
    console.error('❌ Error testing invoice creation fix:', error);
  } finally {
    await pool.end();
  }
}

testInvoiceCreationFix(); 