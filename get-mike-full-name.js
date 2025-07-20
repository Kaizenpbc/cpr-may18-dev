const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function getMikeFullName() {
  try {
    console.log('🔍 Getting Mike\'s full name and details...\n');
    
    // Get Mike's information from course_students table
    const mikeStudents = await pool.query(`
      SELECT DISTINCT 
        first_name, 
        last_name, 
        email,
        COUNT(*) as record_count
      FROM course_students 
      WHERE LOWER(first_name) LIKE '%mike%'
      OR LOWER(last_name) LIKE '%mike%'
      OR LOWER(email) LIKE '%mike%'
      GROUP BY first_name, last_name, email
      ORDER BY first_name, last_name
    `);
    
    console.log('📋 Mike\'s Information Found:');
    mikeStudents.rows.forEach(student => {
      console.log(`  - Full Name: ${student.first_name} ${student.last_name}`);
      console.log(`  - Email: ${student.email}`);
      console.log(`  - Appears in ${student.record_count} course records`);
      console.log('');
    });
    
    // Also check the organization that has Mike's email
    const orgWithMike = await pool.query(`
      SELECT * FROM organizations 
      WHERE LOWER(contact_email) LIKE '%mike%'
    `);
    
    if (orgWithMike.rows.length > 0) {
      console.log('📋 Organization Associated with Mike:');
      orgWithMike.rows.forEach(org => {
        console.log(`  - Organization: ${org.name}`);
        console.log(`  - Contact Email: ${org.contact_email}`);
        console.log(`  - Organization ID: ${org.id}`);
      });
    }
    
    // Check if there are any other variations of Mike's name
    console.log('\n🔍 Checking for other variations of Mike\'s name...');
    const allMikeVariations = await pool.query(`
      SELECT DISTINCT 
        first_name, 
        last_name, 
        email
      FROM course_students 
      WHERE LOWER(first_name) LIKE '%michael%'
      OR LOWER(last_name) LIKE '%michael%'
      OR LOWER(email) LIKE '%mike%'
      ORDER BY first_name, last_name
    `);
    
    console.log('All variations found:');
    allMikeVariations.rows.forEach(student => {
      console.log(`  - ${student.first_name} ${student.last_name} (${student.email})`);
    });
    
  } catch (error) {
    console.error('❌ Error getting Mike\'s full name:', error);
  } finally {
    await pool.end();
  }
}

getMikeFullName(); 