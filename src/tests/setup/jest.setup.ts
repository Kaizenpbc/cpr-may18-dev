import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import setupTestDatabase from './testDbSetup';
import seedTestData from './seedTestData';
import * as path from 'path';
import { server } from '../../server';
import { closeDatabaseConnections } from '../../../backend/src/config/database';

// Load environment variables from root directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Global test database pool
export const testPool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.TEST_DB_NAME || 'cpr_test_db',
});

// Global setup - runs once before all tests
beforeAll(async () => {
  // Setup test database
  await setupTestDatabase();
  
  // Seed test data
  await seedTestData();
}, 30000); // Increase timeout for database setup

// Global teardown - runs once after all tests
afterAll(async () => {
  // Close test database connections
  await testPool.end();
  
  // Close main database connections
  await closeDatabaseConnections();
  
  // Close server if it exists
  if (server) {
    server.close();
  }
  
  // Force close any remaining handles
  if (global.gc) {
    global.gc();
  }
  
  // Give time for cleanup
  await new Promise(resolve => setTimeout(resolve, 1000));
}, 15000);

// Reset database between tests
beforeEach(async () => {
  // Clear all tables
  await testPool.query('TRUNCATE TABLE users CASCADE');
  
  // Reseed test data
  await seedTestData();
}); 