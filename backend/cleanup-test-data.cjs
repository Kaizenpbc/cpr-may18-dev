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

async function cleanupTestData() {
  const client = await pool.connect();
  try {
    console.log('🧹 Cleaning up test data...\n');
    
    await client.query('BEGIN');
    
    // 1. Find and delete test invoices
    console.log('1. Finding test invoices...');
    const testInvoices = await client.query(`
      SELECT i.id, i.invoice_number, i.course_request_id, o.name as org_name
      FROM invoices i
      JOIN organizations o ON i.organization_id = o.id
      WHERE i.invoice_number LIKE 'TEST-%'
    `);
    
    if (testInvoices.rows.length > 0) {
      console.log(`Found ${testInvoices.rows.length} test invoice(s):`);
      testInvoices.rows.forEach(inv => {
        console.log(`   - Invoice: ${inv.invoice_number} (ID: ${inv.id}) for ${inv.org_name}`);
      });
      
      // Delete test invoices
      for (const invoice of testInvoices.rows) {
        await client.query('DELETE FROM invoices WHERE id = $1', [invoice.id]);
        console.log(`   ✅ Deleted invoice ${invoice.invoice_number}`);
      }
    } else {
      console.log('   No test invoices found');
    }
    
    // 2. Find and delete test course requests
    console.log('\n2. Finding test course requests...');
    const testCourses = await client.query(`
      SELECT cr.id, cr.location, cr.registered_students, o.name as org_name, ct.name as course_type
      FROM course_requests cr
      JOIN organizations o ON cr.organization_id = o.id
      JOIN class_types ct ON cr.course_type_id = ct.id
      WHERE cr.location = 'Test Location' OR o.name = 'Test Organization'
    `);
    
    if (testCourses.rows.length > 0) {
      console.log(`Found ${testCourses.rows.length} test course(s):`);
      testCourses.rows.forEach(course => {
        console.log(`   - Course: ${course.course_type} at ${course.location} (ID: ${course.id}) for ${course.org_name}`);
      });
      
      // Delete course students first (foreign key constraint)
      for (const course of testCourses.rows) {
        const studentsDeleted = await client.query('DELETE FROM course_students WHERE course_request_id = $1', [course.id]);
        console.log(`   ✅ Deleted ${studentsDeleted.rowCount} students from course ${course.id}`);
      }
      
      // Delete course requests
      for (const course of testCourses.rows) {
        await client.query('DELETE FROM course_requests WHERE id = $1', [course.id]);
        console.log(`   ✅ Deleted course ${course.id}`);
      }
    } else {
      console.log('   No test courses found');
    }
    
    // 3. Clean up test organizations (only if they have no other data)
    console.log('\n3. Checking for test organizations...');
    const testOrgs = await client.query(`
      SELECT o.id, o.name, 
             COUNT(cr.id) as course_count,
             COUNT(i.id) as invoice_count
      FROM organizations o
      LEFT JOIN course_requests cr ON o.id = cr.organization_id
      LEFT JOIN invoices i ON o.id = i.organization_id
      WHERE o.name = 'Test Organization'
      GROUP BY o.id, o.name
    `);
    
    if (testOrgs.rows.length > 0) {
      testOrgs.rows.forEach(org => {
        console.log(`   - Organization: ${org.name} (ID: ${org.id})`);
        console.log(`     Courses: ${org.course_count}, Invoices: ${org.invoice_count}`);
        
        if (parseInt(org.course_count) === 0 && parseInt(org.invoice_count) === 0) {
          client.query('DELETE FROM organizations WHERE id = $1', [org.id]);
          console.log(`   ✅ Deleted test organization ${org.name}`);
        } else {
          console.log(`   ⚠️  Keeping organization ${org.name} (has other data)`);
        }
      });
    } else {
      console.log('   No test organizations found');
    }
    
    await client.query('COMMIT');
    
    console.log('\n🎉 Test data cleanup completed!');
    console.log('📋 The test course should no longer appear in your course list.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error cleaning up test data:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupTestData(); 