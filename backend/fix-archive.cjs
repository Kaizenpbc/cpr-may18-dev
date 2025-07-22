const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function fixArchive() {
  console.log('🔧 Fixing archive status for Course 31...\n');
  
  try {
    // Check current status
    const checkResult = await pool.query(`
      SELECT id, status, archived, archived_at, 
             (SELECT invoice_number FROM invoices WHERE course_request_id = 31 LIMIT 1) as invoice_number
      FROM course_requests 
      WHERE id = 31
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('❌ Course 31 not found');
      return;
    }
    
    const course = checkResult.rows[0];
    console.log('📋 Current status:');
    console.log(`   Course ID: ${course.id}`);
    console.log(`   Status: ${course.status}`);
    console.log(`   Archived: ${course.archived}`);
    console.log(`   Archived At: ${course.archived_at || 'N/A'}`);
    console.log(`   Invoice: ${course.invoice_number || 'N/A'}`);
    
    if (course.status === 'completed' && course.invoice_number && !course.archived) {
      console.log('\n🔧 Archiving course...');
      
      const updateResult = await pool.query(`
        UPDATE course_requests 
        SET archived = TRUE,
            archived_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 31 AND status = 'completed'
      `);
      
      if (updateResult.rowCount > 0) {
        console.log('✅ Course archived successfully!');
        
        // Verify the change
        const verifyResult = await pool.query(`
          SELECT id, status, archived, archived_at 
          FROM course_requests 
          WHERE id = 31
        `);
        
        const updatedCourse = verifyResult.rows[0];
        console.log('\n📋 Updated status:');
        console.log(`   Archived: ${updatedCourse.archived}`);
        console.log(`   Archived At: ${updatedCourse.archived_at}`);
        
      } else {
        console.log('❌ Failed to archive course');
      }
    } else {
      console.log('ℹ️  Course does not meet archive criteria or is already archived');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixArchive(); 