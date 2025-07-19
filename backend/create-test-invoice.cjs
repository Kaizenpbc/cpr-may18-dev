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

async function createTestInvoice() {
  const client = await pool.connect();
  try {
    console.log('🔧 Creating test invoice with attendance data...\n');
    
    await client.query('BEGIN');
    
    // 1. Check if we have organizations and class types
    console.log('1. Checking for organizations and class types...');
    const orgResult = await client.query('SELECT id, name FROM organizations LIMIT 1');
    const classTypeResult = await client.query('SELECT id, name FROM class_types LIMIT 1');
    
    if (orgResult.rows.length === 0) {
      console.log('❌ No organizations found. Creating test organization...');
      const newOrg = await client.query(`
        INSERT INTO organizations (name, contact_email, contact_phone, address, created_at)
        VALUES ('Test Organization', 'test@example.com', '555-0123', '123 Test St, Toronto, ON', CURRENT_TIMESTAMP)
        RETURNING id, name
      `);
      console.log(`✅ Created organization: ${newOrg.rows[0].name} (ID: ${newOrg.rows[0].id})`);
    } else {
      console.log(`✅ Using existing organization: ${orgResult.rows[0].name} (ID: ${orgResult.rows[0].id})`);
    }
    
    if (classTypeResult.rows.length === 0) {
      console.log('❌ No class types found. Creating test class type...');
      const newClassType = await client.query(`
        INSERT INTO class_types (name, description, duration_minutes, created_at)
        VALUES ('CPR Training', 'Basic CPR certification course', 180, CURRENT_TIMESTAMP)
        RETURNING id, name
      `);
      console.log(`✅ Created class type: ${newClassType.rows[0].name} (ID: ${newClassType.rows[0].id})`);
    } else {
      console.log(`✅ Using existing class type: ${classTypeResult.rows[0].name} (ID: ${classTypeResult.rows[0].id})`);
    }
    
    const organizationId = orgResult.rows.length > 0 ? orgResult.rows[0].id : (await client.query('SELECT id FROM organizations ORDER BY id DESC LIMIT 1')).rows[0].id;
    const classTypeId = classTypeResult.rows.length > 0 ? classTypeResult.rows[0].id : (await client.query('SELECT id FROM class_types ORDER BY id DESC LIMIT 1')).rows[0].id;
    
    // 2. Create a test course request
    console.log('\n2. Creating test course request...');
    const courseRequest = await client.query(`
      INSERT INTO course_requests (
        organization_id, course_type_id, date_requested, scheduled_date, location, 
        registered_students, status, confirmed_date, completed_at, created_at
      )
      VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE, 'Test Location', 5, 'completed', CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, location, registered_students
    `, [organizationId, classTypeId]);
    
    const courseRequestId = courseRequest.rows[0].id;
    console.log(`✅ Created course request: ID ${courseRequestId}, Location: ${courseRequest.rows[0].location}, Students: ${courseRequest.rows[0].registered_students}`);
    
    // 3. Create test students with attendance data
    console.log('\n3. Creating test students with attendance data...');
    const testStudents = [
      { first_name: 'John', last_name: 'Doe', email: 'john.doe@example.com', attended: true },
      { first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@example.com', attended: true },
      { first_name: 'Bob', last_name: 'Johnson', email: 'bob.johnson@example.com', attended: false },
      { first_name: 'Alice', last_name: 'Brown', email: 'alice.brown@example.com', attended: true },
      { first_name: 'Charlie', last_name: 'Wilson', email: 'charlie.wilson@example.com', attended: false }
    ];
    
    for (const student of testStudents) {
      await client.query(`
        INSERT INTO course_students (
          course_request_id, first_name, last_name, email, attended, attendance_marked, created_at
        )
        VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP)
      `, [courseRequestId, student.first_name, student.last_name, student.email, student.attended]);
    }
    
    console.log(`✅ Created ${testStudents.length} students with attendance data`);
    
    // 4. Create a test invoice
    console.log('\n4. Creating test invoice...');
    const invoiceNumber = `TEST-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const studentsAttended = testStudents.filter(s => s.attended).length;
    const amount = studentsAttended * 50.00; // $50 per student
    
    const invoice = await client.query(`
      INSERT INTO invoices (
        invoice_number, organization_id, course_request_id, invoice_date, amount, 
        students_billed, status, due_date, created_at
      )
      VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, 'pending', CURRENT_DATE + INTERVAL '30 days', CURRENT_TIMESTAMP)
      RETURNING id, invoice_number, amount, students_billed
    `, [invoiceNumber, organizationId, courseRequestId, amount, studentsAttended]);
    
    const invoiceId = invoice.rows[0].id;
    console.log(`✅ Created invoice: ${invoice.rows[0].invoice_number} (ID: ${invoiceId})`);
    console.log(`   - Amount: $${invoice.rows[0].amount}`);
    console.log(`   - Students Billed: ${invoice.rows[0].students_billed}`);
    
    await client.query('COMMIT');
    
    console.log('\n🎉 Test data created successfully!');
    console.log(`📋 Test Invoice ID: ${invoiceId}`);
    console.log(`📋 Test Invoice Number: ${invoiceNumber}`);
    console.log('\n🔗 You can now test the PDF endpoints:');
    console.log(`   - PDF: http://localhost:3001/api/v1/accounting/invoices/${invoiceId}/pdf`);
    console.log(`   - Preview: http://localhost:3001/api/v1/accounting/invoices/${invoiceId}/preview`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating test invoice:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createTestInvoice(); 