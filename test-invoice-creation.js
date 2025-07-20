const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function testInvoiceCreation() {
  try {
    console.log('🔍 Testing invoice creation process...\n');
    
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
      LIMIT 5
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
        console.log(`     Ready for billing: ${course.ready_for_billing_at}`);
        console.log(`     Already invoiced: ${course.invoiced}`);
        console.log('');
      });
    } else {
      console.log('❌ No courses found in billing queue');
      return;
    }
    
    // 2. Test invoice creation for the first course
    const testCourse = billingQueue.rows[0];
    console.log(`2. Testing invoice creation for course ${testCourse.course_id}...`);
    
    // Simulate the invoice creation process
    const baseCost = testCourse.students_attended * testCourse.rate_per_student;
    const taxAmount = baseCost * 0.13;
    const totalAmount = baseCost + taxAmount;
    
    console.log(`   Calculations:`);
    console.log(`   - Base cost: $${baseCost.toFixed(2)}`);
    console.log(`   - Tax (13%): $${taxAmount.toFixed(2)}`);
    console.log(`   - Total: $${totalAmount.toFixed(2)}`);
    
    // 3. Check if course is eligible for invoice creation
    console.log('\n3. Validating course eligibility...');
    
    const validationChecks = [
      {
        name: 'Course is completed',
        check: testCourse.status === 'completed',
        value: 'completed'
      },
      {
        name: 'Course is ready for billing',
        check: testCourse.ready_for_billing_at !== null,
        value: testCourse.ready_for_billing_at ? 'Yes' : 'No'
      },
      {
        name: 'Course is not already invoiced',
        check: !testCourse.invoiced,
        value: testCourse.invoiced ? 'Yes' : 'No'
      },
      {
        name: 'Has students attended',
        check: testCourse.students_attended > 0,
        value: testCourse.students_attended
      },
      {
        name: 'Has pricing configured',
        check: testCourse.rate_per_student > 0,
        value: `$${testCourse.rate_per_student}`
      }
    ];
    
    validationChecks.forEach(check => {
      console.log(`   ${check.check ? '✅' : '❌'} ${check.name}: ${check.value}`);
    });
    
    const allValid = validationChecks.every(check => check.check);
    console.log(`\n   Overall validation: ${allValid ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (allValid) {
      console.log('\n4. Course is eligible for invoice creation!');
      console.log('   The frontend should now show:');
      console.log('   - Success message: "Invoice created successfully! The course has been removed from the billing queue."');
      console.log('   - Course should disappear from the billing queue');
      console.log('   - Invoice should appear in the Accounts Receivable section');
    } else {
      console.log('\n4. Course is NOT eligible for invoice creation');
      console.log('   The frontend should show an error message explaining why');
    }
    
    // 5. Check existing invoices for this organization
    console.log('\n5. Checking existing invoices for this organization...');
    const existingInvoices = await pool.query(`
      SELECT 
        i.id,
        i.invoice_number,
        i.amount,
        i.status,
        i.created_at,
        cr.id as course_id
      FROM invoices i
      JOIN course_requests cr ON i.course_request_id = cr.id
      WHERE cr.organization_id = $1
      ORDER BY i.created_at DESC
      LIMIT 5
    `, [testCourse.organization_id]);
    
    if (existingInvoices.rows.length > 0) {
      console.log(`   Found ${existingInvoices.rows.length} existing invoices:`);
      existingInvoices.rows.forEach(invoice => {
        console.log(`   - Invoice #${invoice.invoice_number}: $${invoice.amount} (${invoice.status})`);
      });
    } else {
      console.log('   No existing invoices found for this organization');
    }
    
  } catch (error) {
    console.error('❌ Error testing invoice creation:', error);
  } finally {
    await pool.end();
  }
}

testInvoiceCreation(); 