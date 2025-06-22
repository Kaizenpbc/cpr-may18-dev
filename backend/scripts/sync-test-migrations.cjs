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

async function syncTestMigrations() {
  try {
    console.log('🔄 Syncing test database migrations...');

    // Run pending migrations
    const [batchNo, log] = await db.migrate.latest();
    
    if (log.length === 0) {
      console.log('✅ Test database is up to date with migrations');
    } else {
      console.log(`✅ Applied ${log.length} new migrations to test database`);
      log.forEach(migration => {
        console.log(`   - ${migration}`);
      });
    }

    // Run seeds if needed
    console.log('\n🌱 Running test seeds...');
    const seedLog = await db.seed.run();
    
    if (seedLog.length === 0) {
      console.log('✅ Test seeds are up to date');
    } else {
      console.log(`✅ Applied ${seedLog.length} new seeds to test database`);
      seedLog.forEach(seed => {
        console.log(`   - ${seed}`);
      });
    }

    console.log('\n🎉 Test database sync complete!');

  } catch (error) {
    console.error('❌ Error syncing test database:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run if called directly
if (require.main === module) {
  syncTestMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = syncTestMigrations; 