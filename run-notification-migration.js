require('dotenv').config({ path: './backend/.env' });

const { createNotificationsTable } = require('./backend/src/db/migrations/20250127_create_notifications.cjs');

async function main() {
  try {
    console.log('Running notification migration...');
    await createNotificationsTable();
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main(); 