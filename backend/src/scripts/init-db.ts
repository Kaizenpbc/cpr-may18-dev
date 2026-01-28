import { pool } from '../config/database.js';
import bcrypt from 'bcryptjs';

export async function initializeDatabase() {
  console.log('🔧 Initializing database...');

  try {
    // CRITICAL: Drop any legacy views FIRST to prevent column reference errors
    // This handles views that may have been created by older code versions
    console.log('🧹 Cleaning up legacy views...');
    await pool.query(`DROP VIEW IF EXISTS course_request_details CASCADE`);
    await pool.query(`DROP VIEW IF EXISTS invoice_with_breakdown CASCADE`);
    await pool.query(`DROP VIEW IF EXISTS course_student_counts CASCADE`);
    console.log('✅ Legacy views cleaned up');

    // Create organizations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        contact_name VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        contact_position VARCHAR(100),
        address TEXT,
        address_street VARCHAR(255),
        address_city VARCHAR(100),
        address_province VARCHAR(100),
        address_postal_code VARCHAR(20),
        country VARCHAR(100) DEFAULT 'Canada',
        ceo_name VARCHAR(255),
        ceo_email VARCHAR(255),
        ceo_phone VARCHAR(50),
        organization_comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns to organizations table (migration for existing tables)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'contact_name') THEN
          ALTER TABLE organizations ADD COLUMN contact_name VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'contact_position') THEN
          ALTER TABLE organizations ADD COLUMN contact_position VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'address_street') THEN
          ALTER TABLE organizations ADD COLUMN address_street VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'address_city') THEN
          ALTER TABLE organizations ADD COLUMN address_city VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'address_province') THEN
          ALTER TABLE organizations ADD COLUMN address_province VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'address_postal_code') THEN
          ALTER TABLE organizations ADD COLUMN address_postal_code VARCHAR(20);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'country') THEN
          ALTER TABLE organizations ADD COLUMN country VARCHAR(100) DEFAULT 'Canada';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'ceo_name') THEN
          ALTER TABLE organizations ADD COLUMN ceo_name VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'ceo_email') THEN
          ALTER TABLE organizations ADD COLUMN ceo_email VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'ceo_phone') THEN
          ALTER TABLE organizations ADD COLUMN ceo_phone VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'organization_comments') THEN
          ALTER TABLE organizations ADD COLUMN organization_comments TEXT;
        END IF;
      END $$;
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
        date_onboarded DATE,
        user_comments TEXT,
        status VARCHAR(20) DEFAULT 'active',
        reset_token TEXT,
        reset_token_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns to users table
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
          ALTER TABLE users ADD COLUMN phone VARCHAR(20);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'date_onboarded') THEN
          ALTER TABLE users ADD COLUMN date_onboarded DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_comments') THEN
          ALTER TABLE users ADD COLUMN user_comments TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') THEN
          ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';
        END IF;
      END $$;
    `);

    // Create class_types table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        duration_minutes INTEGER NOT NULL,
        course_code VARCHAR(50),
        max_students INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns to class_types if they don't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_types' AND column_name = 'course_code') THEN
          ALTER TABLE class_types ADD COLUMN course_code VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_types' AND column_name = 'is_active') THEN
          ALTER TABLE class_types ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_types' AND column_name = 'max_students') THEN
          ALTER TABLE class_types ADD COLUMN max_students INTEGER;
        END IF;
      END $$;
    `);

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
        base_cost DECIMAL(10,2),
        tax_amount DECIMAL(10,2),
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
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        approval_status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add columns to invoices table if they don't exist (migration for existing tables)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'posted_to_org') THEN
          ALTER TABLE invoices ADD COLUMN posted_to_org BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'posted_to_org_at') THEN
          ALTER TABLE invoices ADD COLUMN posted_to_org_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'paid_date') THEN
          ALTER TABLE invoices ADD COLUMN paid_date DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'base_cost') THEN
          ALTER TABLE invoices ADD COLUMN base_cost DECIMAL(10,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'tax_amount') THEN
          ALTER TABLE invoices ADD COLUMN tax_amount DECIMAL(10,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'approved_by') THEN
          ALTER TABLE invoices ADD COLUMN approved_by INTEGER REFERENCES users(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'approved_at') THEN
          ALTER TABLE invoices ADD COLUMN approved_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'students_billed') THEN
          ALTER TABLE invoices ADD COLUMN students_billed INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'rate_per_student') THEN
          ALTER TABLE invoices ADD COLUMN rate_per_student DECIMAL(10,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'course_type_name') THEN
          ALTER TABLE invoices ADD COLUMN course_type_name VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'location') THEN
          ALTER TABLE invoices ADD COLUMN location VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'date_completed') THEN
          ALTER TABLE invoices ADD COLUMN date_completed DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'notes') THEN
          ALTER TABLE invoices ADD COLUMN notes TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'email_sent_at') THEN
          ALTER TABLE invoices ADD COLUMN email_sent_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'deleted_at') THEN
          ALTER TABLE invoices ADD COLUMN deleted_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'approval_status') THEN
          ALTER TABLE invoices ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending';
        END IF;
      END $$;
    `);

    // Migrate existing invoices: set approval_status based on posted_to_org
    await pool.query(`
      UPDATE invoices
      SET approval_status = 'approved'
      WHERE posted_to_org = TRUE
        AND (approval_status IS NULL OR approval_status = '');
    `);
    await pool.query(`
      UPDATE invoices
      SET approval_status = 'pending'
      WHERE posted_to_org = FALSE
        AND (approval_status IS NULL OR approval_status = '');
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
        reversed_at TIMESTAMP,
        reversed_by INTEGER REFERENCES users(id),
        reversal_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add columns to payments table if they don't exist (migration for existing tables)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'reversed_at') THEN
          ALTER TABLE payments ADD COLUMN reversed_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'reversed_by') THEN
          ALTER TABLE payments ADD COLUMN reversed_by INTEGER REFERENCES users(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'reversal_reason') THEN
          ALTER TABLE payments ADD COLUMN reversal_reason TEXT;
        END IF;
      END $$;
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

    // Create profile_changes table for HR workflow
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profile_changes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        change_type VARCHAR(50) NOT NULL,
        field_name VARCHAR(100) NOT NULL,
        old_value TEXT,
        new_value TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        hr_comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for profile_changes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_profile_changes_status ON profile_changes(status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_profile_changes_user_id ON profile_changes(user_id)
    `);

    // Create instructor_certifications table for tracking instructor credentials
    await pool.query(`
      CREATE TABLE IF NOT EXISTS instructor_certifications (
        id SERIAL PRIMARY KEY,
        instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        certification_type VARCHAR(100) NOT NULL,
        certification_number VARCHAR(100),
        issue_date DATE,
        expiration_date DATE,
        issuing_authority VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
        document_path VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for instructor_certifications
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_instructor_certifications_instructor ON instructor_certifications(instructor_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_instructor_certifications_expiration ON instructor_certifications(expiration_date)
    `);

    // Create vendor_invoices table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendor_invoices (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL REFERENCES vendors(id),
        invoice_number VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        rate DECIMAL(10,2),
        hst DECIMAL(10,2),
        total DECIMAL(10,2),
        description TEXT,
        invoice_date DATE NOT NULL,
        due_date DATE,
        manual_type VARCHAR(100),
        quantity INTEGER,
        pdf_filename VARCHAR(255),
        status VARCHAR(50) DEFAULT 'submitted',
        notes TEXT,
        admin_notes TEXT,
        payment_date DATE,
        sent_to_accounting_at TIMESTAMP,
        paid_at TIMESTAMP,
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add columns to vendor_invoices if they don't exist (migration for existing tables)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_invoices' AND column_name = 'approved_by') THEN
          ALTER TABLE vendor_invoices ADD COLUMN approved_by INTEGER REFERENCES users(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_invoices' AND column_name = 'approved_at') THEN
          ALTER TABLE vendor_invoices ADD COLUMN approved_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_invoices' AND column_name = 'rejection_reason') THEN
          ALTER TABLE vendor_invoices ADD COLUMN rejection_reason TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_invoices' AND column_name = 'rate') THEN
          ALTER TABLE vendor_invoices ADD COLUMN rate DECIMAL(10,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_invoices' AND column_name = 'hst') THEN
          ALTER TABLE vendor_invoices ADD COLUMN hst DECIMAL(10,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_invoices' AND column_name = 'total') THEN
          ALTER TABLE vendor_invoices ADD COLUMN total DECIMAL(10,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_invoices' AND column_name = 'admin_notes') THEN
          ALTER TABLE vendor_invoices ADD COLUMN admin_notes TEXT;
        END IF;
      END $$;
    `);

    // Create indexes for vendor_invoices
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vendor_invoices_vendor_id ON vendor_invoices(vendor_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vendor_invoices_status ON vendor_invoices(status)
    `);

    // Create vendor_payments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendor_payments (
        id SERIAL PRIMARY KEY,
        vendor_invoice_id INTEGER NOT NULL REFERENCES vendor_invoices(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        payment_date DATE NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        reference_number VARCHAR(100),
        notes TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'reversed')),
        processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for vendor_payments
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vendor_payments_invoice ON vendor_payments(vendor_invoice_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vendor_payments_status ON vendor_payments(status)
    `);

    // ============================================
    // PAYROLL & HR TABLES (Added from code audit)
    // ============================================

    // Create pay_rate_tiers table for instructor pay tiers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pay_rate_tiers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        base_hourly_rate DECIMAL(10,2) NOT NULL,
        course_bonus DECIMAL(10,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create instructor_pay_rates table for individual instructor rates
    await pool.query(`
      CREATE TABLE IF NOT EXISTS instructor_pay_rates (
        id SERIAL PRIMARY KEY,
        instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tier_id INTEGER REFERENCES pay_rate_tiers(id),
        hourly_rate DECIMAL(10,2) NOT NULL,
        course_bonus DECIMAL(10,2) DEFAULT 0,
        effective_date DATE DEFAULT CURRENT_DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(instructor_id, is_active)
      )
    `);

    // Create index for instructor_pay_rates
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_instructor_pay_rates_instructor ON instructor_pay_rates(instructor_id)
    `);

    // Create pay_rate_history table for tracking rate changes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pay_rate_history (
        id SERIAL PRIMARY KEY,
        instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        old_hourly_rate DECIMAL(10,2),
        new_hourly_rate DECIMAL(10,2) NOT NULL,
        old_tier_id INTEGER REFERENCES pay_rate_tiers(id),
        new_tier_id INTEGER REFERENCES pay_rate_tiers(id),
        old_course_bonus DECIMAL(10,2),
        new_course_bonus DECIMAL(10,2),
        changed_by INTEGER REFERENCES users(id),
        change_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for pay_rate_history
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_pay_rate_history_instructor ON pay_rate_history(instructor_id)
    `);

    // Create timesheets table for instructor time tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS timesheets (
        id SERIAL PRIMARY KEY,
        instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        week_start_date DATE NOT NULL,
        week_end_date DATE,
        total_hours DECIMAL(5,2) DEFAULT 0,
        courses_taught INTEGER DEFAULT 0,
        notes TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),
        hr_comment TEXT,
        submitted_at TIMESTAMP,
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(instructor_id, week_start_date)
      )
    `);

    // Create indexes for timesheets
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheets_instructor ON timesheets(instructor_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheets_week ON timesheets(week_start_date)
    `);

    // Create timesheet_notes table for comments/notes on timesheets
    await pool.query(`
      CREATE TABLE IF NOT EXISTS timesheet_notes (
        id SERIAL PRIMARY KEY,
        timesheet_id INTEGER NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        user_role VARCHAR(50),
        note_text TEXT NOT NULL,
        note_type VARCHAR(50) DEFAULT 'comment',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for timesheet_notes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheet_notes_timesheet ON timesheet_notes(timesheet_id)
    `);

    // Create payment_requests table for instructor payment requests
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_requests (
        id SERIAL PRIMARY KEY,
        instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        timesheet_id INTEGER REFERENCES timesheets(id),
        amount DECIMAL(10,2) NOT NULL,
        base_amount DECIMAL(10,2),
        bonus_amount DECIMAL(10,2),
        payment_date DATE,
        payment_method VARCHAR(50),
        status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'returned_to_hr')),
        notes TEXT,
        hr_notes TEXT,
        processed_by INTEGER REFERENCES users(id),
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for payment_requests
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_requests_instructor ON payment_requests(instructor_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_requests_timesheet ON payment_requests(timesheet_id)
    `);

    // Create payroll_payments table for actual payments made
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payroll_payments (
        id SERIAL PRIMARY KEY,
        instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        payment_request_id INTEGER REFERENCES payment_requests(id),
        amount DECIMAL(10,2) NOT NULL,
        payment_date DATE NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'reversed')),
        hr_notes TEXT,
        processed_by INTEGER REFERENCES users(id),
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for payroll_payments
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payroll_payments_instructor ON payroll_payments(instructor_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payroll_payments_status ON payroll_payments(status)
    `);

    // Create enrollments table for student class enrollments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
        course_request_id INTEGER REFERENCES course_requests(id) ON DELETE CASCADE,
        enrollment_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'cancelled', 'no_show')),
        completion_date DATE,
        certificate_issued BOOLEAN DEFAULT false,
        certificate_number VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for enrollments
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_enrollments_course_request ON enrollments(course_request_id)
    `);

    // Create indexes for improved query performance on frequently queried columns
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_course_requests_instructor_id ON course_requests(instructor_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_course_requests_organization_id ON course_requests(organization_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_course_requests_status ON course_requests(status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_course_students_course_request_id ON course_students(course_request_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_course_students_attended ON course_students(course_request_id, attended)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_classes_instructor_id ON classes(instructor_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_classes_organization_id ON classes(organization_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)
    `);

    // ============================================
    // HOLIDAYS TABLE
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS holidays (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        description TEXT,
        is_recurring BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date)
    `);

    // ============================================
    // PAY RATES TABLE (legacy compatibility)
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pay_rates (
        id SERIAL PRIMARY KEY,
        instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_type_id INTEGER REFERENCES class_types(id),
        rate_per_hour DECIMAL(10,2),
        rate_per_class DECIMAL(10,2),
        effective_date DATE DEFAULT CURRENT_DATE,
        end_date DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_pay_rates_instructor ON pay_rates(instructor_id)
    `);

    // ============================================
    // COLUMN MIGRATIONS FOR EXISTING TABLES
    // ============================================

    // Add missing columns to users table (MFA, security, etc.)
    await pool.query(`
      DO $$
      BEGIN
        -- MFA columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'mfa_enabled') THEN
          ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'mfa_secret') THEN
          ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'mfa_backup_codes') THEN
          ALTER TABLE users ADD COLUMN mfa_backup_codes TEXT[];
        END IF;
        -- Security columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'failed_login_attempts') THEN
          ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'locked_until') THEN
          ALTER TABLE users ADD COLUMN locked_until TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_changed_at') THEN
          ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP;
        END IF;
        -- Contact/profile columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'address') THEN
          ALTER TABLE users ADD COLUMN address TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'emergency_contact_name') THEN
          ALTER TABLE users ADD COLUMN emergency_contact_name VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'emergency_contact_phone') THEN
          ALTER TABLE users ADD COLUMN emergency_contact_phone VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'certifications') THEN
          ALTER TABLE users ADD COLUMN certifications TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'pay_rate') THEN
          ALTER TABLE users ADD COLUMN pay_rate DECIMAL(10,2);
        END IF;
      END $$;
    `);

    // Add missing columns to instructor_availability table
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instructor_availability' AND column_name = 'available_date') THEN
          ALTER TABLE instructor_availability ADD COLUMN available_date DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instructor_availability' AND column_name = 'start_time') THEN
          ALTER TABLE instructor_availability ADD COLUMN start_time TIME;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instructor_availability' AND column_name = 'end_time') THEN
          ALTER TABLE instructor_availability ADD COLUMN end_time TIME;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instructor_availability' AND column_name = 'is_available') THEN
          ALTER TABLE instructor_availability ADD COLUMN is_available BOOLEAN DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instructor_availability' AND column_name = 'notes') THEN
          ALTER TABLE instructor_availability ADD COLUMN notes TEXT;
        END IF;
      END $$;
    `);

    // Add missing columns to email_templates table
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_templates' AND column_name = 'template_type') THEN
          ALTER TABLE email_templates ADD COLUMN template_type VARCHAR(50);
        END IF;
      END $$;
    `);

    // Add missing columns to vendors table
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'user_id') THEN
          ALTER TABLE vendors ADD COLUMN user_id INTEGER REFERENCES users(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'company_name') THEN
          ALTER TABLE vendors ADD COLUMN company_name VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'contact_name') THEN
          ALTER TABLE vendors ADD COLUMN contact_name VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'tax_id') THEN
          ALTER TABLE vendors ADD COLUMN tax_id VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'payment_terms') THEN
          ALTER TABLE vendors ADD COLUMN payment_terms VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'status') THEN
          ALTER TABLE vendors ADD COLUMN status VARCHAR(50) DEFAULT 'active';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'notes') THEN
          ALTER TABLE vendors ADD COLUMN notes TEXT;
        END IF;
      END $$;
    `);

    // Add missing columns to audit_log table
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'user_id') THEN
          ALTER TABLE audit_log ADD COLUMN user_id INTEGER REFERENCES users(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'created_at') THEN
          ALTER TABLE audit_log ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
      END $$;
    `);

    console.log('✅ Tables created');

    // ==========================================
    // DATABASE INTEGRITY FIXES
    // ==========================================
    console.log('🔒 Applying database integrity constraints...');

    // Foreign Key Constraints
    const foreignKeyConstraints = [
      // Course Requests
      { table: 'course_requests', constraint: 'fk_course_requests_organization', sql: 'FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE' },
      { table: 'course_requests', constraint: 'fk_course_requests_instructor', sql: 'FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL' },
      { table: 'course_requests', constraint: 'fk_course_requests_course_type', sql: 'FOREIGN KEY (course_type_id) REFERENCES class_types(id) ON DELETE RESTRICT' },
      // Course Students
      { table: 'course_students', constraint: 'fk_course_students_course_request', sql: 'FOREIGN KEY (course_request_id) REFERENCES course_requests(id) ON DELETE CASCADE' },
      // Invoices
      { table: 'invoices', constraint: 'fk_invoices_organization', sql: 'FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT' },
      { table: 'invoices', constraint: 'fk_invoices_course_request', sql: 'FOREIGN KEY (course_request_id) REFERENCES course_requests(id) ON DELETE SET NULL' },
      // Payments
      { table: 'payments', constraint: 'fk_payments_invoice', sql: 'FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE' },
      // Instructor Availability
      { table: 'instructor_availability', constraint: 'fk_instructor_availability_user', sql: 'FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE' },
      // Classes
      { table: 'classes', constraint: 'fk_classes_instructor', sql: 'FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL' },
      { table: 'classes', constraint: 'fk_classes_type', sql: 'FOREIGN KEY (type_id) REFERENCES class_types(id) ON DELETE RESTRICT' },
      // Users
      { table: 'users', constraint: 'fk_users_organization', sql: 'FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL' },
    ];

    for (const fk of foreignKeyConstraints) {
      try {
        await pool.query(`ALTER TABLE ${fk.table} DROP CONSTRAINT IF EXISTS ${fk.constraint}`);
        await pool.query(`ALTER TABLE ${fk.table} ADD CONSTRAINT ${fk.constraint} ${fk.sql}`);
      } catch (e: any) {
        // Constraint might fail if data violates it - log but continue
        if (!e.message.includes('already exists')) {
          console.log(`Note: Could not add constraint ${fk.constraint}: ${e.message}`);
        }
      }
    }

    // CHECK Constraints for data integrity
    const checkConstraints = [
      { table: 'invoices', constraint: 'check_invoice_amount_positive', sql: 'CHECK (amount >= 0)' },
      { table: 'invoices', constraint: 'check_invoice_base_cost_positive', sql: 'CHECK (base_cost IS NULL OR base_cost >= 0)' },
      { table: 'invoices', constraint: 'check_invoice_tax_positive', sql: 'CHECK (tax_amount IS NULL OR tax_amount >= 0)' },
      { table: 'payments', constraint: 'check_payment_amount_positive', sql: 'CHECK (amount > 0)' },
      { table: 'course_pricing', constraint: 'check_pricing_positive', sql: 'CHECK (price_per_student >= 0)' },
      { table: 'invoices', constraint: 'check_invoice_due_date', sql: 'CHECK (due_date IS NULL OR invoice_date IS NULL OR due_date >= invoice_date)' },
      { table: 'course_requests', constraint: 'check_course_times', sql: 'CHECK (confirmed_end_time IS NULL OR confirmed_start_time IS NULL OR confirmed_end_time > confirmed_start_time)' },
    ];

    for (const chk of checkConstraints) {
      try {
        await pool.query(`ALTER TABLE ${chk.table} DROP CONSTRAINT IF EXISTS ${chk.constraint}`);
        await pool.query(`ALTER TABLE ${chk.table} ADD CONSTRAINT ${chk.constraint} ${chk.sql}`);
      } catch (e: any) {
        if (!e.message.includes('already exists')) {
          console.log(`Note: Could not add constraint ${chk.constraint}: ${e.message}`);
        }
      }
    }

    // Create audit_log table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(100) NOT NULL,
        record_id INTEGER NOT NULL,
        action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
        old_values JSONB,
        new_values JSONB,
        changed_by INTEGER REFERENCES users(id),
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit_log(changed_by)`);

    // Add soft delete columns
    await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL`);
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL`);
    await pool.query(`ALTER TABLE course_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL`);

    // Soft delete indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_invoices_not_deleted ON invoices(id) WHERE deleted_at IS NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_payments_not_deleted ON payments(id) WHERE deleted_at IS NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_course_requests_not_deleted ON course_requests(id) WHERE deleted_at IS NULL`);

    // Clear sensitive credentials from system_configurations (move to env vars)
    await pool.query(`
      UPDATE system_configurations
      SET config_value = '[MOVED_TO_ENV_VARS]',
          description = 'Value moved to environment variables for security'
      WHERE config_key IN ('email_smtp_pass', 'email_smtp_user', 'email_api_key')
        AND config_value NOT LIKE '[MOVED%]'
        AND config_value != ''
    `);

    console.log('✅ Database integrity constraints applied');

    // Create views for common queries
    console.log('📊 Creating database views...');

    // Drop existing views first (required when column structure changes)
    await pool.query(`DROP VIEW IF EXISTS invoice_with_breakdown CASCADE`);
    await pool.query(`DROP VIEW IF EXISTS course_request_details CASCADE`);

    // Invoice breakdown view - now just a pass-through since base_cost and tax_amount are stored columns
    await pool.query(`
      CREATE VIEW invoice_with_breakdown AS
      SELECT * FROM invoices
    `);

    // Course request details view
    await pool.query(`
      CREATE VIEW course_request_details AS
      SELECT
        cr.id,
        cr.organization_id,
        cr.course_type_id,
        cr.date_requested,
        cr.scheduled_date,
        cr.location,
        cr.registered_students as students_registered,
        cr.notes,
        cr.status,
        cr.instructor_id,
        cr.confirmed_date,
        cr.confirmed_start_time,
        cr.confirmed_end_time,
        cr.completed_at,
        cr.created_at,
        cr.updated_at,
        o.name AS organization_name,
        ct.name AS course_type_name,
        u.username AS instructor_username,
        u.first_name AS instructor_first_name,
        u.last_name AS instructor_last_name
      FROM course_requests cr
      LEFT JOIN organizations o ON cr.organization_id = o.id
      LEFT JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN users u ON cr.instructor_id = u.id
    `);

    console.log('✅ Views created');

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

      // Create default users (without organization) - use INSERT...SELECT to handle both username and email uniqueness
      const defaultUsers = [
        { username: 'admin', email: 'admin@cpr.com', role: 'admin' },
        { username: 'sysadmin', email: 'sysadmin@cpr.com', role: 'sysadmin' },
        { username: 'instructor', email: 'instructor@cpr.com', role: 'instructor' },
        { username: 'accountant', email: 'accountant@cpr.com', role: 'accountant' }
      ];
      for (const user of defaultUsers) {
        await pool.query(`
          INSERT INTO users (username, email, password_hash, role)
          SELECT $1, $2, $3, $4
          WHERE NOT EXISTS (
            SELECT 1 FROM users WHERE username = $1 OR email = $2
          )
        `, [user.username, user.email, passwordHash, user.role]);
      }

      // Create organization user linked to Test Organization
      await pool.query(`
        INSERT INTO users (username, email, password_hash, role, organization_id)
        SELECT 'orguser', 'orguser@cpr.com', $1, 'organization', $2
        WHERE NOT EXISTS (
          SELECT 1 FROM users WHERE username = 'orguser' OR email = 'orguser@cpr.com'
        )
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
    const orgUserCheck = await pool.query("SELECT id FROM users WHERE username = 'orguser' OR email = 'orguser@cpr.com'");
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

      // Use INSERT...SELECT with NOT EXISTS to handle both username and email uniqueness
      await pool.query(`
        INSERT INTO users (username, email, password_hash, role, organization_id)
        SELECT 'orguser', 'orguser@cpr.com', $1, 'organization', $2
        WHERE NOT EXISTS (
          SELECT 1 FROM users WHERE username = 'orguser' OR email = 'orguser@cpr.com'
        )
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

    // Insert default pay rate tiers
    await pool.query(`
      INSERT INTO pay_rate_tiers (name, description, base_hourly_rate, course_bonus) VALUES
      ('Standard', 'Standard instructor rate', 25.00, 50.00),
      ('Senior', 'Senior instructor rate', 35.00, 75.00),
      ('Lead', 'Lead instructor rate', 45.00, 100.00)
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}
