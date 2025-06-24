import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { retry } from '@lifeomic/attempt';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

// Database configuration
const poolConfig: PoolConfig = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cpr_may18',
};

// Create the connection pool
const pool = new Pool(poolConfig);

// Initialize database tables
const initializeDatabase = async () => {
  try {
    console.log('🚀 Starting database initialization...');

    // Create users table if it doesn't exist
    console.log('📝 Creating users table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'student',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table created successfully');

    // Create organizations table if it doesn't exist
    console.log('🏢 Creating organizations table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(20),
        address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Organizations table created successfully');

    // Insert default organizations if none exist
    console.log('📊 Inserting default organizations...');
    await pool.query(`
      INSERT INTO organizations (name, contact_email, contact_phone, address)
      VALUES 
        ('Test Organization', 'test@org.com', '555-1234', '123 Main St'),
        ('Demo Company', 'demo@company.com', '555-5678', '456 Business Ave')
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('✅ Default organizations inserted successfully');

    // Add organization_id to users table if it doesn't exist
    console.log('🔗 Adding organization_id column to users table...');
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'organization_id'
        ) THEN 
          ALTER TABLE users ADD COLUMN organization_id INTEGER REFERENCES organizations(id);
        END IF;
      END $$;
    `);
    console.log('✅ Organization_id column added successfully');

    // Create default admin user if it doesn't exist
    console.log('👤 Creating default admin user...');
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'test123';
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
    const adminPasswordHash = await bcrypt.hash(adminPassword, saltRounds);

    await pool.query(
      `
      INSERT INTO users (username, email, password_hash, role)
      VALUES ('admin', 'admin@cpr.com', $1, 'admin')
      ON CONFLICT (username) DO NOTHING;
    `,
      [adminPasswordHash]
    );
    console.log('✅ Admin user created successfully');

    // Create email_templates table if it doesn't exist
    console.log('📧 Creating email_templates table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        key VARCHAR(50) NOT NULL UNIQUE,
        category VARCHAR(50) NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        is_system BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        last_modified_by INTEGER REFERENCES users(id),
        deleted_at TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log('✅ Email_templates table created successfully');

    // Insert default email templates if none exist
    console.log('📝 Inserting default email templates...');
    await pool.query(`
      INSERT INTO email_templates (name, key, category, subject, body, created_by, last_modified_by)
      VALUES 
        ('Course Assignment Notification', 'course_assigned_instructor', 'course',
         'Course Assignment Notification',
         'Dear {{instructorName}},\n\nYou have been assigned to teach {{courseName}}.\n\nBest regards,\nCPR Team',
         (SELECT id FROM users WHERE username = 'admin'),
         (SELECT id FROM users WHERE username = 'admin')),
        ('Course Reminder', 'course_reminder_instructor', 'reminder',
         'Course Reminder',
         'Dear {{instructorName}},\n\nThis is a reminder that you have a course {{courseName}} scheduled for {{courseDate}}.\n\nBest regards,\nCPR Team',
         (SELECT id FROM users WHERE username = 'admin'),
         (SELECT id FROM users WHERE username = 'admin'))
      ON CONFLICT (key) DO NOTHING;
    `);
    console.log('✅ Default email templates inserted successfully');

    // Create default instructor user if it doesn't exist
    console.log('👨‍🏫 Creating default instructor user...');
    const instructorPassword =
      process.env.DEFAULT_INSTRUCTOR_PASSWORD || 'test123';
    const instructorPasswordHash = await bcrypt.hash(
      instructorPassword,
      saltRounds
    );

    await pool.query(
      `
      INSERT INTO users (username, email, password_hash, role)
      VALUES ('instructor', 'instructor@cpr.com', $1, 'instructor')
      ON CONFLICT (username) DO NOTHING;
    `,
      [instructorPasswordHash]
    );
    console.log('✅ Instructor user created successfully');

    // Create default organization user if it doesn't exist
    console.log('🏢 Creating default organization user...');
    const orgPassword = process.env.DEFAULT_ORG_PASSWORD || 'test123';
    const orgPasswordHash = await bcrypt.hash(orgPassword, saltRounds);

    await pool.query(
      `
      INSERT INTO users (username, email, password_hash, role, organization_id)
      VALUES ('orguser', 'org@cpr.com', $1, 'organization', 1)
      ON CONFLICT (username) DO NOTHING;
    `,
      [orgPasswordHash]
    );
    console.log('✅ Organization user created successfully');

    // Create default accountant user if it doesn't exist
    console.log('💰 Creating default accountant user...');
    const accountantPassword =
      process.env.DEFAULT_ACCOUNTANT_PASSWORD || 'test123';
    const accountantPasswordHash = await bcrypt.hash(
      accountantPassword,
      saltRounds
    );

    await pool.query(
      `
      INSERT INTO users (username, email, password_hash, role)
      VALUES ('accountant', 'accountant@cpr.com', $1, 'accountant')
      ON CONFLICT (username) DO NOTHING;
    `,
      [accountantPasswordHash]
    );
    console.log('✅ Accountant user created successfully');

    // Create class_types table if it doesn't exist
    console.log('📚 Creating class_types table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        duration_minutes INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Class_types table created successfully');

    // Create instructor_availability table if it doesn't exist
    console.log('📅 Creating instructor_availability table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS instructor_availability (
        id SERIAL PRIMARY KEY,
        instructor_id INTEGER NOT NULL REFERENCES users(id),
        date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'available',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(instructor_id, date)
      );
    `);
    console.log('✅ Instructor_availability table created successfully');

    // Create classes table if it doesn't exist
    console.log('📝 Creating classes table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        class_type_id INTEGER REFERENCES class_types(id),
        instructor_id INTEGER REFERENCES users(id),
        organization_id INTEGER REFERENCES organizations(id),
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
        location TEXT,
        max_students INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Classes table created successfully');

    // Create class_students table if it doesn't exist
    console.log('👥 Creating class_students table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_students (
        id SERIAL PRIMARY KEY,
        class_id INTEGER REFERENCES classes(id),
        student_id INTEGER REFERENCES users(id),
        attendance VARCHAR(50) DEFAULT 'registered',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(class_id, student_id)
      );
    `);
    console.log('✅ Class_students table created successfully');

    // Insert default class types if none exist
    console.log('📊 Inserting default class types...');
    await pool.query(`
      INSERT INTO class_types (name, description, duration_minutes)
      VALUES 
        ('CPR Basic', 'Basic CPR certification course', 180),
        ('CPR Advanced', 'Advanced CPR certification course', 240),
        ('First Aid', 'First Aid certification course', 120)
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('✅ Default class types inserted successfully');

    // Insert some sample classes
    console.log('📅 Inserting sample classes...');
    await pool.query(`
      WITH inserted_class AS (
        INSERT INTO classes (class_type_id, instructor_id, organization_id, start_time, end_time, status, location, max_students)
        SELECT 
          ct.id,
          (SELECT id FROM users WHERE username = 'instructor'),
          1,
          NOW() + interval '1 day',
          NOW() + interval '1 day' + interval '3 hours',
          'scheduled',
          'Main Training Room',
          10
        FROM class_types ct
        WHERE ct.name = 'CPR Basic'
        RETURNING id
      )
      INSERT INTO class_students (class_id, student_id, attendance)
      SELECT 
        ic.id,
        u.id,
        'registered'
      FROM inserted_class ic
      CROSS JOIN (
        SELECT id FROM users WHERE role = 'student' LIMIT 3
      ) u
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Sample classes and enrollments inserted successfully');

    // Create course_requests table if it doesn't exist
    console.log('📋 Creating course_requests table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_requests (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id),
        course_type_id INTEGER NOT NULL REFERENCES class_types(id),
        request_submitted_date DATE NOT NULL, -- When organization submitted the request (system date)
        scheduled_date DATE, -- Organization's preferred date for the course
        location VARCHAR(255) NOT NULL,
        registered_students INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        instructor_id INTEGER REFERENCES users(id),
        confirmed_date DATE, -- Actual date when admin assigns instructor (may differ from scheduled_date)
        confirmed_start_time TIME,
        confirmed_end_time TIME,
        completed_at TIMESTAMP WITH TIME ZONE,
        instructor_comments TEXT, -- Instructor notes when completing the course
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Course_requests table created successfully');

    // Migrate existing database: rename date_requested to request_submitted_date
    console.log('🔄 Migrating date fields...');
    await pool.query(`
      DO $$ 
      BEGIN 
        -- Rename date_requested to request_submitted_date if it exists
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'course_requests' AND column_name = 'date_requested'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'course_requests' AND column_name = 'request_submitted_date'
        ) THEN 
          ALTER TABLE course_requests RENAME COLUMN date_requested TO request_submitted_date;
        END IF;

        -- Add request_submitted_date if it doesn't exist (for new installations)
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'course_requests' AND column_name = 'request_submitted_date'
        ) THEN 
          ALTER TABLE course_requests ADD COLUMN request_submitted_date DATE DEFAULT CURRENT_DATE;
        END IF;

        -- Add scheduled_date if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'course_requests' AND column_name = 'scheduled_date'
        ) THEN 
          ALTER TABLE course_requests ADD COLUMN scheduled_date DATE;
        END IF;

        -- Add confirmed_date columns if they don't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'course_requests' AND column_name = 'confirmed_date'
        ) THEN 
          ALTER TABLE course_requests ADD COLUMN confirmed_date DATE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'course_requests' AND column_name = 'confirmed_start_time'
        ) THEN 
          ALTER TABLE course_requests ADD COLUMN confirmed_start_time TIME;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'course_requests' AND column_name = 'confirmed_end_time'
        ) THEN 
          ALTER TABLE course_requests ADD COLUMN confirmed_end_time TIME;
        END IF;

        -- Add completed_at if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'course_requests' AND column_name = 'completed_at'
        ) THEN 
          ALTER TABLE course_requests ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
        END IF;

        -- Add ready_for_billing columns if they don't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'course_requests' AND column_name = 'ready_for_billing'
        ) THEN 
          ALTER TABLE course_requests ADD COLUMN ready_for_billing BOOLEAN DEFAULT FALSE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'course_requests' AND column_name = 'ready_for_billing_at'
        ) THEN 
          ALTER TABLE course_requests ADD COLUMN ready_for_billing_at TIMESTAMP WITH TIME ZONE;
        END IF;

        -- Add invoiced column to track if course has been invoiced
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'course_requests' AND column_name = 'invoiced'
        ) THEN 
          ALTER TABLE course_requests ADD COLUMN invoiced BOOLEAN DEFAULT FALSE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'course_requests' AND column_name = 'invoiced_at'
        ) THEN 
          ALTER TABLE course_requests ADD COLUMN invoiced_at TIMESTAMP WITH TIME ZONE;
        END IF;

        -- Add last_reminder_at column to track reminder status
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'course_requests' AND column_name = 'last_reminder_at'
        ) THEN 
          ALTER TABLE course_requests ADD COLUMN last_reminder_at TIMESTAMP WITH TIME ZONE;
        END IF;

        -- Add instructor_comments column for instructor notes when completing courses
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'course_requests' AND column_name = 'instructor_comments'
        ) THEN 
          ALTER TABLE course_requests ADD COLUMN instructor_comments TEXT;
        END IF;
      END $$;
    `);

    // Only migrate data if old columns exist
    console.log('🔄 Migrating data from old columns if they exist...');
    await pool.query(`
      DO $$ 
      BEGIN 
        -- Copy preferred_date to scheduled_date if preferred_date column exists
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'course_requests' AND column_name = 'preferred_date'
        ) THEN 
          UPDATE course_requests 
          SET scheduled_date = preferred_date 
          WHERE scheduled_date IS NULL AND preferred_date IS NOT NULL;
        END IF;

        -- Move old scheduled fields to confirmed fields if they exist
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'course_requests' AND column_name = 'scheduled_start_time'
        ) THEN 
          UPDATE course_requests 
          SET confirmed_start_time = scheduled_start_time,
              confirmed_end_time = scheduled_end_time
          WHERE confirmed_start_time IS NULL 
            AND scheduled_start_time IS NOT NULL 
            AND instructor_id IS NOT NULL;
        END IF;
      END $$;
    `);

    // Clean up old columns if they exist
    console.log('🧹 Cleaning up old columns...');
    await pool.query(`
      DO $$ 
      BEGIN 
        -- Drop preferred_date if it exists
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'course_requests' AND column_name = 'preferred_date'
        ) THEN 
          ALTER TABLE course_requests DROP COLUMN preferred_date;
        END IF;

        -- Drop old scheduled columns if they exist (since they're now confirmed columns)
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'course_requests' AND column_name = 'scheduled_start_time'
        ) THEN 
          ALTER TABLE course_requests DROP COLUMN scheduled_start_time;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'course_requests' AND column_name = 'scheduled_end_time'
        ) THEN 
          ALTER TABLE course_requests DROP COLUMN scheduled_end_time;
        END IF;
      END $$;
    `);
    console.log('✅ Date field migration completed');

    // Create certifications table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS certifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        course_name VARCHAR(255) NOT NULL,
        issue_date DATE NOT NULL,
        expiration_date DATE NOT NULL,
        certification_number VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        instructor_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create invoices table if it doesn't exist
    console.log('💰 Creating invoices table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        course_request_id INTEGER REFERENCES course_requests(id),
        organization_id INTEGER NOT NULL REFERENCES organizations(id),
        invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
        due_date DATE NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        course_type_name VARCHAR(255),
        location VARCHAR(255),
        date_completed DATE,
        students_billed INTEGER,
        rate_per_student DECIMAL(10,2),
        notes TEXT,
        email_sent_at TIMESTAMP WITH TIME ZONE,
        posted_to_org BOOLEAN DEFAULT FALSE,
        posted_to_org_at TIMESTAMP WITH TIME ZONE,
        paid_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Invoices table created successfully');

    // Add posted_to_org columns to invoices table if they don't exist
    console.log('🔄 Enhancing invoices table with posting columns...');
    await pool.query(`
      DO $$ 
      BEGIN 
        -- Add posted_to_org column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'invoices' AND column_name = 'posted_to_org'
        ) THEN 
          ALTER TABLE invoices ADD COLUMN posted_to_org BOOLEAN DEFAULT FALSE;
        END IF;

        -- Add posted_to_org_at column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'invoices' AND column_name = 'posted_to_org_at'
        ) THEN 
          ALTER TABLE invoices ADD COLUMN posted_to_org_at TIMESTAMP WITH TIME ZONE;
        END IF;

        -- Update existing invoices to be posted (for backward compatibility)
        UPDATE invoices 
        SET posted_to_org = TRUE, posted_to_org_at = created_at 
        WHERE posted_to_org IS NULL OR posted_to_org = FALSE;
      END $$;
    `);
    console.log('✅ Invoices table enhanced with posting columns');

    // Add missing columns to invoices table if they don't exist
    console.log('🔄 Ensuring all invoice columns exist...');
    await pool.query(`
      DO $$ 
      BEGIN 
        -- Add invoice_date column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'invoices' AND column_name = 'invoice_date'
        ) THEN 
          ALTER TABLE invoices ADD COLUMN invoice_date DATE DEFAULT CURRENT_DATE;
          -- Update existing records to use created_at as invoice_date
          UPDATE invoices SET invoice_date = created_at::date WHERE invoice_date IS NULL;
        END IF;

        -- Add paid_date column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'invoices' AND column_name = 'paid_date'
        ) THEN 
          ALTER TABLE invoices ADD COLUMN paid_date DATE;
        END IF;

        -- Add students_billed column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'invoices' AND column_name = 'students_billed'
        ) THEN 
          ALTER TABLE invoices ADD COLUMN students_billed INTEGER;
        END IF;

        -- Rename course_id to course_request_id if needed
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'invoices' AND column_name = 'course_id'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'invoices' AND column_name = 'course_request_id'
        ) THEN 
          ALTER TABLE invoices RENAME COLUMN course_id TO course_request_id;
        END IF;

        -- Add email_sent_at column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'invoices' AND column_name = 'email_sent_at'
        ) THEN 
          ALTER TABLE invoices ADD COLUMN email_sent_at TIMESTAMP WITH TIME ZONE;
        END IF;
      END $$;
    `);
    console.log('✅ Invoice columns migration completed');

    // Create payments table if it doesn't exist
    console.log('💳 Creating payments table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER NOT NULL REFERENCES invoices(id),
        amount DECIMAL(10,2) NOT NULL,
        payment_date DATE NOT NULL,
        payment_method VARCHAR(50),
        reference_number VARCHAR(100),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'verified',
        submitted_by_org_at TIMESTAMP WITH TIME ZONE,
        verified_by_accounting_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Payments table created successfully');

    // Add new columns to payments table if they don't exist
    console.log('🔄 Enhancing payments table with new columns...');
    await pool.query(`
      DO $$ 
      BEGIN 
        -- Add status column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'payments' AND column_name = 'status'
        ) THEN 
          ALTER TABLE payments ADD COLUMN status VARCHAR(50) DEFAULT 'verified';
        END IF;

        -- Add submitted_by_org_at column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'payments' AND column_name = 'submitted_by_org_at'
        ) THEN 
          ALTER TABLE payments ADD COLUMN submitted_by_org_at TIMESTAMP WITH TIME ZONE;
        END IF;

        -- Add verified_by_accounting_at column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'payments' AND column_name = 'verified_by_accounting_at'
        ) THEN 
          ALTER TABLE payments ADD COLUMN verified_by_accounting_at TIMESTAMP WITH TIME ZONE;
        END IF;
      END $$;
    `);
    console.log('✅ Payments table enhanced with new columns');

    // Create course_pricing table if it doesn't exist
    console.log('💵 Creating course_pricing table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_pricing (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id),
        course_type_id INTEGER NOT NULL REFERENCES class_types(id),
        price_per_student DECIMAL(10,2) NOT NULL,
        effective_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(organization_id, course_type_id, is_active)
      );
    `);
    console.log('✅ Course_pricing table created successfully');

    // Add cancellation tracking columns if they don't exist
    const hasCancellationColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'course_requests' 
      AND column_name IN ('is_cancelled', 'cancelled_at', 'cancellation_reason')
    `);

    if (hasCancellationColumns.rows.length < 3) {
      await pool.query(`
        ALTER TABLE course_requests
        ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS cancellation_reason TEXT
      `);
      console.log('Added cancellation tracking columns to course_requests table');
    }

    console.log(
      '🎉 [DATABASE SUCCESS] All database tables initialized successfully!'
    );
    console.log('📊 [DATABASE INFO] Database schema setup completed');
    console.log('✅ [DATABASE READY] Database is ready for operations');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Database initialization will be called explicitly from index.ts
// initializeDatabase().catch(console.error);

// Custom error class for database operations
class DatabaseError extends Error {
  originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

// Function to execute queries with retry mechanism
export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  return retry(
    async () => {
      try {
        return await pool.query<T>(text, params);
      } catch (error) {
        throw new DatabaseError('Database query failed', error);
      }
    },
    {
      maxAttempts: 3,
      delay: 1000,
      factor: 2,
      jitter: true,
    }
  );
};

// Health check function
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await pool.end();
    console.log('Database pool has ended');
    process.exit(0);
  } catch (err) {
    console.error('Error during pool shutdown:', err);
    process.exit(1);
  }
});

export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

export { pool, initializeDatabase };
