const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function testInvoiceHistoryColumns() {
  console.log('🔍 Testing Invoice History table columns and calculations...\n');
  
  try {
    // Get sample invoice data
    const result = await pool.query(`
      SELECT 
        i.id as invoiceid,
        i.invoice_number as invoicenumber,
        i.amount,
        i.students_billed,
        cp.price_per_student as rate_per_student,
        COALESCE(payments.total_paid, 0) as paidtodate,
        (i.amount - COALESCE(payments.total_paid, 0)) as balancedue,
        o.name as organizationname,
        ct.name as course_type_name,
        cr.location,
        cr.completed_at as date_completed
      FROM invoice_with_breakdown i
      JOIN organizations o ON i.organization_id = o.id
      LEFT JOIN course_requests cr ON i.course_request_id = cr.id
      LEFT JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN course_pricing cp ON cr.organization_id = cp.organization_id AND cr.course_type_id = cp.course_type_id AND cp.is_active = true
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) as total_paid
        FROM payments 
        WHERE status = 'verified'
        GROUP BY invoice_id
      ) payments ON payments.invoice_id = i.id
      ORDER BY i.created_at DESC
      LIMIT 3
    `);
    
    console.log('📊 Invoice History Table Data Structure:');
    result.rows.forEach((row, index) => {
      console.log(`\n   Invoice ${index + 1}: ${row.invoicenumber}`);
      console.log(`     Organization: ${row.organizationname}`);
      console.log(`     Course Name: ${row.course_type_name}`);
      console.log(`     Location: ${row.location}`);
      console.log(`     Students: ${row.students_billed}`);
      console.log(`     Rate/Student: $${row.rate_per_student || 'N/A'}`);
      
      if (row.rate_per_student && row.students_billed) {
        const basePrice = Number(row.rate_per_student) * Number(row.students_billed);
        const hst = basePrice * 0.13;
        const total = basePrice + hst;
        
        console.log(`     Base Price: $${basePrice.toFixed(2)}`);
        console.log(`     HST: $${hst.toFixed(2)}`);
        console.log(`     Total: $${total.toFixed(2)}`);
        console.log(`     Paid: $${row.paidtodate}`);
        console.log(`     Balance: $${row.balancedue}`);
      } else {
        console.log(`     Base Price: N/A (pricing not configured)`);
        console.log(`     HST: N/A`);
        console.log(`     Total: $${row.amount}`);
        console.log(`     Paid: $${row.paidtodate}`);
        console.log(`     Balance: $${row.balancedue}`);
      }
    });
    
    console.log('\n✅ Invoice History table should now show:');
    console.log('   - No Course # column');
    console.log('   - Rate/Student (per student rate)');
    console.log('   - Base Price (rate × students)');
    console.log('   - HST (base price × 0.13)');
    console.log('   - Total (base price + HST)');
    console.log('   - Balance (from backend balancedue)');
    
  } catch (error) {
    console.error('❌ Error testing invoice history columns:', error.message);
  } finally {
    await pool.end();
  }
}

testInvoiceHistoryColumns(); 