import { pool } from '../config/database.js';
import bcrypt from 'bcryptjs';

export async function initializeDatabase() {
  console.log('🔧 Initializing database...');

  try {
    // Create organizations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(20),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create vendors table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(20),
        address TEXT,
        vendor_type VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'student',
        organization_id INTEGER REFERENCES organizations(id),
        full_name VARCHAR(255),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        mobile VARCHAR(20),
        reset_token TEXT,
        reset_token_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add phone column to users if it doesn't exist
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`);
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        console.log(`Note: Could not add phone column: ${e.message}`);
      }
    }

    // Create class_types table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        duration_minutes INTEGER NOT NULL,
        course_code VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns to class_types if they don't exist
    try {
      await pool.query(`ALTER TABLE class_types ADD COLUMN IF NOT EXISTS course_code VARCHAR(50)`);
      await pool.query(`ALTER TABLE class_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`);
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        console.log(`Note: Could not add class_types columns: ${e.message}`);
      }
    }

    // Create sessions table for session management
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id),
        data JSONB,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create other essential tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS instructor_availability (
        id SERIAL PRIMARY KEY,
        instructor_id INTEGER NOT NULL REFERENCES users(id),
        date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(instructor_id, date)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_requests (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id),
        course_type_id INTEGER NOT NULL REFERENCES class_types(id),
        date_requested DATE NOT NULL,
        scheduled_date DATE,
        location VARCHAR(255) NOT NULL,
        registered_students INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        instructor_id INTEGER REFERENCES users(id),
        confirmed_date DATE,
        confirmed_start_time TIME,
        confirmed_end_time TIME,
        completed_at TIMESTAMP,
        ready_for_billing BOOLEAN DEFAULT false,
        ready_for_billing_at TIMESTAMP,
        invoiced BOOLEAN DEFAULT false,
        invoiced_at TIMESTAMP,
        last_reminder_at TIMESTAMP,
        is_cancelled BOOLEAN DEFAULT false,
        cancelled_at TIMESTAMP,
        cancellation_reason TEXT,
        archived BOOLEAN DEFAULT false,
        archived_at TIMESTAMP,
        instructor_comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns to course_requests if they don't exist
    const columnsToAdd = [
      { name: 'confirmed_date', type: 'DATE' },
      { name: 'confirmed_start_time', type: 'TIME' },
      { name: 'confirmed_end_time', type: 'TIME' },
      { name: 'completed_at', type: 'TIMESTAMP' },
      { name: 'ready_for_billing', type: 'BOOLEAN DEFAULT false' },
      { name: 'ready_for_billing_at', type: 'TIMESTAMP' },
      { name: 'invoiced', type: 'BOOLEAN DEFAULT false' },
      { name: 'invoiced_at', type: 'TIMESTAMP' },
      { name: 'last_reminder_at', type: 'TIMESTAMP' },
      { name: 'is_cancelled', type: 'BOOLEAN DEFAULT false' },
      { name: 'cancelled_at', type: 'TIMESTAMP' },
      { name: 'cancellation_reason', type: 'TEXT' },
      { name: 'archived', type: 'BOOLEAN DEFAULT false' },
      { name: 'archived_at', type: 'TIMESTAMP' },
      { name: 'instructor_comments', type: 'TEXT' }
    ];

    for (const col of columnsToAdd) {
      try {
        await pool.query(`ALTER TABLE course_requests ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
      } catch (e: any) {
        // Column might already exist, ignore error
        if (!e.message.includes('already exists')) {
          console.log(`Note: Could not add column ${col.name}: ${e.message}`);
        }
      }
    }

    // Create course_students table (for tracking students in course requests)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_students (
        id SERIAL PRIMARY KEY,
        course_request_id INTEGER NOT NULL REFERENCES course_requests(id),
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        college VARCHAR(255),
        attendance_marked BOOLEAN DEFAULT false,
        attended BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add phone and college columns if they don't exist (migration for existing tables)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_students' AND column_name = 'phone') THEN
          ALTER TABLE course_students ADD COLUMN phone VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_students' AND column_name = 'college') THEN
          ALTER TABLE course_students ADD COLUMN college VARCHAR(255);
        END IF;
      END $$;
    `);

    // Create colleges table (for external institutions)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS colleges (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create classes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        class_type_id INTEGER REFERENCES class_types(id),
        instructor_id INTEGER REFERENCES users(id),
        organization_id INTEGER REFERENCES organizations(id),
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
        location TEXT,
        max_students INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create class_students table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_students (
        id SERIAL PRIMARY KEY,
        class_id INTEGER REFERENCES classes(id),
        student_id INTEGER REFERENCES users(id),
        attendance VARCHAR(50) DEFAULT 'registered',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(class_id, student_id)
      )
    `);

    // Create certifications table
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        organization_id INTEGER NOT NULL REFERENCES organizations(id),
        course_request_id INTEGER REFERENCES course_requests(id),
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
        email_sent_at TIMESTAMP,
        posted_to_org BOOLEAN DEFAULT false,
        posted_to_org_at TIMESTAMP,
        paid_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create payments table
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
        submitted_by_org_at TIMESTAMP,
        verified_by_accounting_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create course_pricing table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_pricing (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id),
        course_type_id INTEGER NOT NULL REFERENCES class_types(id),
        price_per_student DECIMAL(10,2) NOT NULL,
        effective_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(organization_id, course_type_id, is_active)
      )
    `);

    // Create email_templates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        key VARCHAR(50) NOT NULL UNIQUE,
        category VARCHAR(50) NOT NULL,
        sub_category VARCHAR(50),
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        is_system BOOLEAN DEFAULT false,
        created_by INTEGER REFERENCES users(id),
        last_modified_by INTEGER REFERENCES users(id),
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add sub_category column if it doesn't exist (for existing databases)
    try {
      await pool.query(`ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS sub_category VARCHAR(50)`);
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        console.log(`Note: Could not add sub_category column: ${e.message}`);
      }
    }

    // Create notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'info',
        category VARCHAR(50) NOT NULL DEFAULT 'system',
        link VARCHAR(500),
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for faster notification queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false
    `);

    // Create notification_settings table for user preferences
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        course_notifications BOOLEAN DEFAULT true,
        billing_notifications BOOLEAN DEFAULT true,
        reminder_notifications BOOLEAN DEFAULT true,
        system_notifications BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create system_configurations table for sysadmin settings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_configurations (
        id SERIAL PRIMARY KEY,
        config_key VARCHAR(100) NOT NULL UNIQUE,
        config_value TEXT NOT NULL,
        description TEXT,
        category VARCHAR(50) NOT NULL DEFAULT 'general',
        updated_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tables created');

    // Check if admin user exists
    const adminCheck = await pool.query("SELECT id FROM users WHERE username = 'admin'");
    if (adminCheck.rows.length === 0) {
      console.log('👤 Creating default users...');
      const passwordHash = await bcrypt.hash('test123', 12);

      // Create test organization first
      await pool.query(`
        INSERT INTO organizations (name, contact_email)
        VALUES ('Test Organization', 'test@org.com')
        ON CONFLICT (name) DO NOTHING
      `);

      // Get the test organization ID
      const orgResult = await pool.query(`SELECT id FROM organizations WHERE name = 'Test Organization'`);
      const testOrgId = orgResult.rows[0]?.id || 1;

      // Create default users (without organization)
      await pool.query(`
        INSERT INTO users (username, email, password_hash, role) VALUES
        ('admin', 'admin@cpr.com', $1, 'admin'),
        ('sysadmin', 'sysadmin@cpr.com', $1, 'sysadmin'),
        ('instructor', 'instructor@cpr.com', $1, 'instructor'),
        ('accountant', 'accountant@cpr.com', $1, 'accountant')
        ON CONFLICT (username) DO NOTHING
      `, [passwordHash]);

      // Create organization user linked to Test Organization
      await pool.query(`
        INSERT INTO users (username, email, password_hash, role, organization_id)
        VALUES ('orguser', 'orguser@cpr.com', $1, 'organization', $2)
        ON CONFLICT (username) DO NOTHING
      `, [passwordHash, testOrgId]);

      // Create class types
      await pool.query(`
        INSERT INTO class_types (name, description, duration_minutes) VALUES
        ('CPR Basic', 'Basic CPR certification course', 180),
        ('CPR Advanced', 'Advanced CPR certification course', 240),
        ('First Aid', 'First Aid certification course', 120)
        ON CONFLICT (name) DO NOTHING
      `);

      console.log('✅ Default data created');
    } else {
      console.log('ℹ️ Database already has data');
    }

    // Always ensure orguser exists (even if database already has data)
    const orgUserCheck = await pool.query("SELECT id FROM users WHERE username = 'orguser'");
    if (orgUserCheck.rows.length === 0) {
      console.log('👤 Creating orguser account...');
      const passwordHash = await bcrypt.hash('test123', 12);

      // Ensure test organization exists
      await pool.query(`
        INSERT INTO organizations (name, contact_email)
        VALUES ('Test Organization', 'test@org.com')
        ON CONFLICT (name) DO NOTHING
      `);

      const orgResult = await pool.query(`SELECT id FROM organizations WHERE name = 'Test Organization'`);
      const testOrgId = orgResult.rows[0]?.id || 1;

      await pool.query(`
        INSERT INTO users (username, email, password_hash, role, organization_id)
        VALUES ('orguser', 'orguser@cpr.com', $1, 'organization', $2)
        ON CONFLICT (username) DO NOTHING
      `, [passwordHash, testOrgId]);

      console.log('✅ orguser account created');
    }

    // Insert default system configurations
    await pool.query(`
      INSERT INTO system_configurations (config_key, config_value, description, category) VALUES
      ('invoice_due_days', '30', 'Number of days until invoice is due', 'billing'),
      ('invoice_late_fee_percent', '1.5', 'Late fee percentage for overdue invoices', 'billing'),
      ('email_smtp_host', '', 'SMTP server host', 'email'),
      ('email_smtp_port', '587', 'SMTP server port', 'email'),
      ('email_smtp_user', '', 'SMTP username', 'email'),
      ('email_smtp_pass', '', 'SMTP password', 'email'),
      ('email_from_address', 'noreply@cprtraining.com', 'Default from email address', 'email'),
      ('company_name', 'CPR Training System', 'Company name', 'general'),
      ('support_email', 'support@cprtraining.com', 'Support email address', 'general'),
      ('session_timeout_minutes', '60', 'Session timeout in minutes', 'security')
      ON CONFLICT (config_key) DO NOTHING
    `);

    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}
