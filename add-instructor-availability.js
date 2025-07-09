const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cpr_jun21',
  password: 'gtacpr',
  port: 5432,
});

async function addInstructorAvailability() {
  try {
    console.log('➕ Adding instructor availability records...');
    
    // Get current date and add availability for the next 30 days
    const today = new Date();
    const availabilityDates = [];
    
    // Add availability for the next 30 days (excluding weekends)
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        availabilityDates.push(date.toISOString().split('T')[0]);
      }
    }
    
    console.log(`📅 Adding availability for ${availabilityDates.length} dates:`);
    availabilityDates.forEach(date => console.log(`  - ${date}`));
    
    // Insert availability records
    for (const date of availabilityDates) {
      try {
        // Check if availability already exists
        const existingCheck = await pool.query(
          'SELECT id FROM instructor_availability WHERE instructor_id = $1 AND date = $2',
          [2, date]
        );
        
        if (existingCheck.rows.length === 0) {
          // Insert new availability
          await pool.query(
            `INSERT INTO instructor_availability (instructor_id, date, status, created_at, updated_at)
             VALUES ($1, $2, 'available', NOW(), NOW())`,
            [2, date]
          );
          console.log(`✅ Added availability for ${date}`);
        } else {
          console.log(`⏭️  Availability already exists for ${date}`);
        }
      } catch (error) {
        console.error(`❌ Error adding availability for ${date}:`, error.message);
      }
    }
    
    // Verify the records were added
    const verification = await pool.query(
      'SELECT date, status FROM instructor_availability WHERE instructor_id = 2 ORDER BY date ASC'
    );
    
    console.log(`\n📊 Verification: ${verification.rows.length} availability records found for instructor 2`);
    
    if (verification.rows.length > 0) {
      console.log('\n📅 Current availability records:');
      verification.rows.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.date} - ${record.status}`);
      });
    }
    
    console.log('\n🎉 Instructor availability setup complete!');
    console.log('💡 The instructor should now see available dates on the My Schedule page.');
    
  } catch (error) {
    console.error('❌ Error adding instructor availability:', error);
  } finally {
    await pool.end();
  }
}

addInstructorAvailability(); 