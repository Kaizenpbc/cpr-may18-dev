const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function testInvoiceAttendance() {
  const client = await pool.connect();
  try {
    console.log('🔍 Testing invoice attendance feature...\n');
    
    // 1. Check if we have any invoices
    console.log('1. Checking for existing invoices...');
    const invoicesResult = await client.query(`
      SELECT id, invoice_number, course_request_id, students_billed
      FROM invoices 
      ORDER BY id DESC 
      LIMIT 5
    `);
    
    if (invoicesResult.rows.length === 0) {
      console.log('❌ No invoices found in database');
      return;
    }
    
    console.log(`✅ Found ${invoicesResult.rows.length} invoices:`);
    invoicesResult.rows.forEach(inv => {
      console.log(`   - Invoice ID: ${inv.id}, Number: ${inv.invoice_number}, Course: ${inv.course_request_id}, Students: ${inv.students_billed}`);
    });
    
    // 2. Test the new query with attendance data
    console.log('\n2. Testing invoice query with attendance data...');
    const testInvoiceId = invoicesResult.rows[0].id;
    
    const attendanceQuery = `
      SELECT 
        i.id as invoice_id,
        i.invoice_number,
        i.organization_id,
        i.course_request_id,
        i.created_at as invoice_date,
        i.due_date,
        i.amount,
        i.status,
        i.students_billed,
        i.paid_date,
        o.name as organization_name,
        o.contact_email,
        cr.location,
        ct.name as course_type_name,
        cr.completed_at as date_completed,
        COALESCE(
          json_agg(
            json_build_object(
              'first_name', cs.first_name,
              'last_name', cs.last_name,
              'email', cs.email,
              'attended', cs.attended
            ) ORDER BY cs.last_name, cs.first_name
          ) FILTER (WHERE cs.id IS NOT NULL),
          '[]'::json
        ) as attendance_list
      FROM invoices i
      JOIN organizations o ON i.organization_id = o.id
      LEFT JOIN course_requests cr ON i.course_request_id = cr.id
      LEFT JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN course_students cs ON cr.id = cs.course_request_id
      WHERE i.id = $1
      GROUP BY i.id, i.invoice_number, i.organization_id, i.course_request_id, i.created_at, i.due_date, i.amount, i.status, i.students_billed, i.paid_date, o.name, o.contact_email, cr.location, ct.name, cr.completed_at
    `;
    
    const attendanceResult = await client.query(attendanceQuery, [testInvoiceId]);
    
    if (attendanceResult.rows.length === 0) {
      console.log('❌ No invoice found with ID:', testInvoiceId);
      return;
    }
    
    const invoice = attendanceResult.rows[0];
    console.log(`✅ Invoice ${invoice.invoice_number} found:`);
    console.log(`   - Organization: ${invoice.organization_name}`);
    console.log(`   - Course: ${invoice.course_type_name}`);
    console.log(`   - Location: ${invoice.location}`);
    console.log(`   - Students Billed: ${invoice.students_billed}`);
    
    // 3. Check attendance data
    console.log('\n3. Attendance data:');
    if (invoice.attendance_list && Array.isArray(invoice.attendance_list)) {
      console.log(`   - Total students in attendance list: ${invoice.attendance_list.length}`);
      
      if (invoice.attendance_list.length > 0) {
        console.log('   - Student details:');
        invoice.attendance_list.forEach((student, index) => {
          console.log(`     ${index + 1}. ${student.first_name} ${student.last_name} (${student.email || 'no email'}) - ${student.attended ? 'Present' : 'Absent'}`);
        });
        
        const present = invoice.attendance_list.filter(s => s.attended).length;
        const absent = invoice.attendance_list.filter(s => s.attended === false).length;
        console.log(`   - Summary: Present: ${present}, Absent: ${absent}, Total: ${invoice.attendance_list.length}`);
      } else {
        console.log('   - No students in attendance list');
      }
    } else {
      console.log('   - No attendance list data');
    }
    
    // 4. Test HTTP endpoint (simulate the request)
    console.log('\n4. Testing HTTP endpoint...');
    console.log(`   - PDF endpoint: GET http://localhost:3001/api/v1/accounting/invoices/${testInvoiceId}/pdf`);
    console.log(`   - Preview endpoint: GET http://localhost:3001/api/v1/accounting/invoices/${testInvoiceId}/preview`);
    console.log('   - You can test these endpoints in your browser or with curl');
    
    console.log('\n🎉 Test completed! The attendance feature should be working.');
    
  } catch (error) {
    console.error('❌ Error testing invoice attendance:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testInvoiceAttendance(); 