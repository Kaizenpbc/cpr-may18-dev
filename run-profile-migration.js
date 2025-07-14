const { up } = require('./backend/src/db/migrations/20250714_create_profile_changes.cjs');

async function runMigration() {
  try {
    console.log('🚀 Running profile changes migration...');
    await up();
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 