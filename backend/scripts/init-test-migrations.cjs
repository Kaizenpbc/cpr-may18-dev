const knex = require('knex');
const path = require('path');

// Test database configuration
const testConfig = {
  client: 'postgresql',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'cpr_jun21_test',
  },
  pool: {
    min: 1,
    max: 5,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: path.join(__dirname, '../src/db/migrations'),
  },
  seeds: {
    directory: path.join(__dirname, '../src/db/seeds'),
  },
};

const db = knex(testConfig);

async function initTestMigrations() {
  try {
    console.log('🔄 Initializing test database migrations...');

    // Check if migrations table exists
    const tableExists = await db.schema.hasTable('knex_migrations');
    
    if (!tableExists) {
      console.log('📋 Creating migrations tracking table...');
      await db.migrate.init();
    }

    // Mark existing migrations as applied (since schema was copied)
    const migrations = [
      '20250619203051_001_initial_schema.cjs',
      '20250619204614_002_additional_tables.cjs'
    ];

    console.log('📝 Marking existing migrations as applied...');
    for (const migration of migrations) {
      try {
        await db('knex_migrations').insert({
          name: migration,
          batch: 1,
          migration_time: new Date()
        });
        console.log(`   ✅ Marked ${migration} as applied`);
      } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`   ℹ️  ${migration} already marked as applied`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ Test database migrations initialized!');
    console.log('\n📊 Migration Status:');
    const appliedMigrations = await db('knex_migrations').select('*').orderBy('batch', 'asc');
    appliedMigrations.forEach(migration => {
      console.log(`   - ${migration.name} (Batch ${migration.batch})`);
    });

  } catch (error) {
    console.error('❌ Error initializing test migrations:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run if called directly
if (require.main === module) {
  initTestMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = initTestMigrations; 