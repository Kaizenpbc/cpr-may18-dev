const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function testPayRateTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing Pay Rate Database Tables...\n');
    
    // Check if pay_rate_tiers table exists
    const tiersCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pay_rate_tiers'
      );
    `);
    
    if (tiersCheck.rows[0].exists) {
      console.log('✅ pay_rate_tiers table exists');
      
      // Check tiers data
      const tiersData = await client.query('SELECT * FROM pay_rate_tiers ORDER BY base_hourly_rate');
      console.log(`📊 Found ${tiersData.rows.length} pay rate tiers:`);
      tiersData.rows.forEach(tier => {
        console.log(`   - ${tier.name}: $${tier.base_hourly_rate}/hour + $${tier.course_bonus} per course`);
      });
    } else {
      console.log('❌ pay_rate_tiers table does not exist');
    }
    
    // Check if instructor_pay_rates table exists
    const ratesCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'instructor_pay_rates'
      );
    `);
    
    if (ratesCheck.rows[0].exists) {
      console.log('\n✅ instructor_pay_rates table exists');
      
      // Check rates data
      const ratesData = await client.query(`
        SELECT ipr.*, u.username, prt.name as tier_name
        FROM instructor_pay_rates ipr
        LEFT JOIN users u ON ipr.instructor_id = u.id
        LEFT JOIN pay_rate_tiers prt ON ipr.tier_id = prt.id
        ORDER BY ipr.effective_date DESC
        LIMIT 5
      `);
      console.log(`📊 Found ${ratesData.rows.length} instructor pay rates`);
    } else {
      console.log('\n❌ instructor_pay_rates table does not exist');
    }
    
    // Check if pay_rate_history table exists
    const historyCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pay_rate_history'
      );
    `);
    
    if (historyCheck.rows[0].exists) {
      console.log('\n✅ pay_rate_history table exists');
      
      // Check history data
      const historyData = await client.query('SELECT COUNT(*) as count FROM pay_rate_history');
      console.log(`📊 Found ${historyData.rows[0].count} history records`);
    } else {
      console.log('\n❌ pay_rate_history table does not exist');
    }
    
    // Check for instructors
    const instructorsData = await client.query(`
      SELECT id, username, email, role 
      FROM users 
      WHERE role = 'instructor' 
      ORDER BY username
      LIMIT 5
    `);
    
    console.log(`\n👨‍🏫 Found ${instructorsData.rows.length} instructors:`);
    instructorsData.rows.forEach(instructor => {
      console.log(`   - ${instructor.username} (${instructor.email})`);
    });
    
    // Check for HR users
    const hrData = await client.query(`
      SELECT id, username, email, role 
      FROM users 
      WHERE role = 'hr' 
      ORDER BY username
    `);
    
    console.log(`\n👔 Found ${hrData.rows.length} HR users:`);
    hrData.rows.forEach(hr => {
      console.log(`   - ${hr.username} (${hr.email})`);
    });
    
  } catch (error) {
    console.error('❌ Error testing pay rate tables:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testPayRateTables(); 