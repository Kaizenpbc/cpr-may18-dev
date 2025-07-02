import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Running organization pricing migration...');
    
    // Create the table
    await client.query(`
      CREATE TABLE IF NOT EXISTS organization_pricing (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        class_type_id INTEGER NOT NULL REFERENCES class_types(id) ON DELETE CASCADE,
        price_per_student DECIMAL(10,2) NOT NULL CHECK (price_per_student >= 0),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        last_modified_by INTEGER REFERENCES users(id),
        deleted_at TIMESTAMP NULL,
        
        -- Ensure unique pricing per organization per class type
        UNIQUE(organization_id, class_type_id, deleted_at)
      );
    `);
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_organization_pricing_org_id ON organization_pricing(organization_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_organization_pricing_class_type_id ON organization_pricing(class_type_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_organization_pricing_active ON organization_pricing(is_active) WHERE is_active = true;
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_organization_pricing_composite ON organization_pricing(organization_id, class_type_id, is_active) WHERE is_active = true;
    `);
    
    // Create trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_organization_pricing_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create trigger
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_organization_pricing_updated_at ON organization_pricing;
      CREATE TRIGGER trigger_organization_pricing_updated_at
          BEFORE UPDATE ON organization_pricing
          FOR EACH ROW
          EXECUTE FUNCTION update_organization_pricing_updated_at();
    `);
    
    console.log('✅ Organization pricing migration completed successfully!');
    
    // Verify the table was created
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'organization_pricing' AND table_schema = 'public';
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Table verification: organization_pricing table exists');
    } else {
      console.log('❌ Table verification failed: organization_pricing table not found');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error); 