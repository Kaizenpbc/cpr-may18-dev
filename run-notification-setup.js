const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function setupNotifications() {
  console.log('🔧 Setting up notification tables...\n');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-notification-tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 SQL file loaded successfully');
    
    // Split the SQL into individual commands
    const commands = sqlContent.split(';').filter(cmd => cmd.trim());
    
    console.log(`🔧 Executing ${commands.length} SQL commands...`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i].trim();
      if (command) {
        try {
          console.log(`   Executing command ${i + 1}/${commands.length}...`);
          await pool.query(command);
          console.log(`   ✅ Command ${i + 1} executed successfully`);
        } catch (error) {
          if (error.code === '42710') { // duplicate_object
            console.log(`   ⚠️  Command ${i + 1} skipped (already exists)`);
          } else {
            console.error(`   ❌ Command ${i + 1} failed:`, error.message);
          }
        }
      }
    }
    
    console.log('\n✅ Notification tables setup completed!');
    
    // Verify the tables were created
    const verifyResult = await pool.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = t.table_name) as exists
      FROM (
        VALUES ('notifications'), ('notification_preferences')
      ) AS t(table_name)
    `);
    
    console.log('\n📊 Verification:');
    verifyResult.rows.forEach(row => {
      console.log(`   ${row.table_name}: ${row.exists ? '✅ Created' : '❌ Missing'}`);
    });
    
  } catch (error) {
    console.error('❌ Error setting up notifications:', error.message);
  } finally {
    await pool.end();
  }
}

setupNotifications(); 