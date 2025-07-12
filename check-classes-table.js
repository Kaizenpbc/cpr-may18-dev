const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkClassesTable() {
  try {
    console.log('🔍 Checking classes table structure...\n');

    // Check table structure
    const structureResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'classes' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Classes table columns:');
    structureResult.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type}`);
    });

    // Check if there are any classes for instructor 32
    const classesResult = await pool.query(`
      SELECT * FROM classes WHERE instructor_id = 32
    `);
    
    console.log('\n📚 Classes for instructor 32:', classesResult.rows.length);
    classesResult.rows.forEach((cls, index) => {
      console.log(`   Class ${index + 1}:`, cls);
    });

    // Check course_requests for instructor 32 today
    const courseRequestsResult = await pool.query(`
      SELECT 
        cr.id,
        cr.confirmed_date,
        cr.status,
        cr.location,
        ct.name as course_type_name,
        o.name as organization_name
      FROM course_requests cr
      LEFT JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN organizations o ON cr.organization_id = o.id
      WHERE cr.instructor_id = 32 
      AND cr.confirmed_date::date = CURRENT_DATE
    `);
    
    console.log('\n📋 Course requests for instructor 32 today:', courseRequestsResult.rows.length);
    courseRequestsResult.rows.forEach((cr, index) => {
      console.log(`   Course Request ${index + 1}:`, cr);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkClassesTable(); 