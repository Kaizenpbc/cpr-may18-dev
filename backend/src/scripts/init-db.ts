import { query } from '../config/database.js';
import bcrypt from 'bcryptjs';

// Bump this string whenever you make schema changes that require re-running init-db.
const SCHEMA_VERSION = '2026-03-29';

/** Idempotent — creates missing indexes on high-query columns; safe to run on every startup. */
async function ensurePerformanceIndexes(): Promise<void> {
  const indexes: [string, string][] = [
    ['idx_course_requests_status', 'CREATE INDEX IF NOT EXISTS idx_course_requests_status ON course_requests(status)'],
    ['idx_course_requests_org_id', 'CREATE INDEX IF NOT EXISTS idx_course_requests_org_id ON course_requests(organization_id)'],
    ['idx_course_requests_org_status', 'CREATE INDEX IF NOT EXISTS idx_course_requests_org_status ON course_requests(organization_id, status)'],
    ['idx_invoices_status', 'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)'],
    ['idx_invoices_org_id', 'CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(organization_id)'],
    ['idx_users_role', 'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)'],
    ['idx_users_status', 'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)'],
  ];
  for (const [name, sql] of indexes) {
    try { await query(sql); } catch { /* already exists or table not yet created */ }
  }
  console.log('✅ Performance indexes verified');
}

export async function initializeDatabase() {
  console.log('🔧 Checking database schema...');

  if (!process.env.FORCE_DB_INIT) {
    try {
      // Check if schema_info table exists and version matches
      const versionCheck = await query(`
        SELECT value FROM schema_info WHERE \`key\` = 'version' LIMIT 1
      `);
      if (versionCheck.rows.length > 0 && versionCheck.rows[0].value === SCHEMA_VERSION) {
        console.log(`✅ Database schema is current (v${SCHEMA_VERSION}) — skipping init`);
        // Always refresh views — idempotent, fast, and safe
        try {
          await query(`CREATE OR REPLACE VIEW invoice_with_breakdown AS SELECT * FROM invoices`);
          await query(`CREATE OR REPLACE VIEW course_request_details AS
            SELECT
              cr.id, cr.organization_id, cr.course_type_id, cr.date_requested,
              cr.scheduled_date, cr.location, cr.registered_students as students_registered,
              cr.notes, cr.status, cr.instructor_id, cr.confirmed_date,
              cr.confirmed_start_time, cr.confirmed_end_time, cr.completed_at,
              cr.created_at, cr.updated_at,
              o.name AS organization_name,
              ct.name AS course_type_name,
              u.username AS instructor_username,
              u.first_name AS instructor_first_name,
              u.last_name AS instructor_last_name
            FROM course_requests cr
            LEFT JOIN organizations o ON cr.organization_id = o.id
            LEFT JOIN class_types ct ON cr.course_type_id = ct.id
            LEFT JOIN users u ON cr.instructor_id = u.id`);
          console.log('✅ Views refreshed');
        } catch (viewErr) {
          console.error('❌ View refresh failed — queries using these views will fail:', viewErr instanceof Error ? viewErr.message : viewErr);
        }
        // Ensure high-frequency indexes exist on every startup (idempotent)
        await ensurePerformanceIndexes();
        return;
      }
    } catch {
      // schema_info table doesn't exist yet — fall through to full init
    }

    // If core tables already exist (e.g. deployed via mysql-schema.sql), just stamp
    // the current version and skip DDL to avoid syntax conflicts on existing data.
    // BUT always recreate views — they are cheap, safe (CREATE OR REPLACE), and may be missing.
    try {
      const tableCheck = await query(`SHOW TABLES LIKE 'users'`);
      if (tableCheck.rows.length > 0) {
        await query(
          `INSERT INTO schema_info (\`key\`, value) VALUES ('version', $1)
           ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP`,
          [SCHEMA_VERSION]
        );
        console.log(`✅ Tables already exist — stamped schema version ${SCHEMA_VERSION}, skipping DDL`);
        // Always recreate views — idempotent, cheap, and may be missing after first deploy
        try {
          await query(`CREATE OR REPLACE VIEW invoice_with_breakdown AS SELECT * FROM invoices`);
          await query(`CREATE OR REPLACE VIEW course_request_details AS
            SELECT
              cr.id, cr.organization_id, cr.course_type_id, cr.date_requested,
              cr.scheduled_date, cr.location, cr.registered_students as students_registered,
              cr.notes, cr.status, cr.instructor_id, cr.confirmed_date,
              cr.confirmed_start_time, cr.confirmed_end_time, cr.completed_at,
              cr.created_at, cr.updated_at,
              o.name AS organization_name,
              ct.name AS course_type_name,
              u.username AS instructor_username,
              u.first_name AS instructor_first_name,
              u.last_name AS instructor_last_name
            FROM course_requests cr
            LEFT JOIN organizations o ON cr.organization_id = o.id
            LEFT JOIN class_types ct ON cr.course_type_id = ct.id
            LEFT JOIN users u ON cr.instructor_id = u.id`);
          console.log('✅ Views refreshed');
        } catch (viewErr) {
          console.error('❌ View refresh failed — queries using these views will fail:', viewErr instanceof Error ? viewErr.message : viewErr);
        }
        // Ensure high-frequency indexes exist on every startup (idempotent)
        await ensurePerformanceIndexes();
        return;
      }
    } catch {
      // Can't check — fall through to full init
    }
  }

  console.log('🔧 Initializing database...');

  try {
    // Drop legacy views so they can be recreated with updated column definitions.
    // No CASCADE — dependent objects must be handled explicitly, not silently destroyed.
    console.log('🧹 Cleaning up legacy views...');
    try { await query(`DROP VIEW IF EXISTS course_request_details`); } catch { /* ignore if has deps */ }
    try { await query(`DROP VIEW IF EXISTS invoice_with_breakdown`); } catch { /* ignore if has deps */ }
    try { await query(`DROP VIEW IF EXISTS course_student_counts`); } catch { /* ignore if has deps */ }
    console.log('✅ Legacy views cleaned up');

    // Create organizations table
    await query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
    await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255)`);
    await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contact_position VARCHAR(100)`);
    await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address_street VARCHAR(255)`);
    await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address_city VARCHAR(100)`);
    await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address_province VARCHAR(100)`);
    await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address_postal_code VARCHAR(20)`);
    await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Canada'`);
    await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ceo_name VARCHAR(255)`);
    await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ceo_email VARCHAR(255)`);
    await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ceo_phone VARCHAR(50)`);
    await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS organization_comments TEXT`);

    // Create vendors table
    await query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(20),
        address TEXT,
        vendor_type VARCHAR(100),
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile VARCHAR(20)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_onboarded DATE`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_offboarded DATE`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS user_comments TEXT`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`);

    // Create class_types table
    await query(`
      CREATE TABLE IF NOT EXISTS class_types (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        duration_minutes INTEGER NOT NULL,
        course_code VARCHAR(50),
        max_students INTEGER,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns to class_types if they don't exist
    await query(`ALTER TABLE class_types ADD COLUMN IF NOT EXISTS course_code VARCHAR(50)`);
    await query(`ALTER TABLE class_types ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1`);
    await query(`ALTER TABLE class_types ADD COLUMN IF NOT EXISTS max_students INTEGER`);

    // Create sessions table for session management
    await query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id),
        data JSON,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create other essential tables
    await query(`
      CREATE TABLE IF NOT EXISTS instructor_availability (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        instructor_id INTEGER NOT NULL REFERENCES users(id),
        date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(instructor_id, date)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS course_requests (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
        ready_for_billing TINYINT(1) DEFAULT 0,
        ready_for_billing_at TIMESTAMP,
        invoiced TINYINT(1) DEFAULT 0,
        invoiced_at TIMESTAMP,
        last_reminder_at TIMESTAMP,
        is_cancelled TINYINT(1) DEFAULT 0,
        cancelled_at TIMESTAMP,
        cancellation_reason TEXT,
        archived TINYINT(1) DEFAULT 0,
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
      { name: 'ready_for_billing', type: 'TINYINT(1) DEFAULT 0' },
      { name: 'ready_for_billing_at', type: 'TIMESTAMP' },
      { name: 'invoiced', type: 'TINYINT(1) DEFAULT 0' },
      { name: 'invoiced_at', type: 'TIMESTAMP' },
      { name: 'last_reminder_at', type: 'TIMESTAMP' },
      { name: 'is_cancelled', type: 'TINYINT(1) DEFAULT 0' },
      { name: 'cancelled_at', type: 'TIMESTAMP' },
      { name: 'cancellation_reason', type: 'TEXT' },
      { name: 'archived', type: 'TINYINT(1) DEFAULT 0' },
      { name: 'archived_at', type: 'TIMESTAMP' },
      { name: 'instructor_comments', type: 'TEXT' }
    ];

    for (const col of columnsToAdd) {
      try {
        await query(`ALTER TABLE course_requests ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
      } catch (e: any) {
        // Column might already exist, ignore error
        if (!e.message.includes('already exists')) {
          console.log(`Note: Could not add column ${col.name}: ${e.message}`);
        }
      }
    }

    // Create course_students table (for tracking students in course requests)
    await query(`
      CREATE TABLE IF NOT EXISTS course_students (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        course_request_id INTEGER NOT NULL REFERENCES course_requests(id),
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        college VARCHAR(255),
        attendance_marked TINYINT(1) DEFAULT 0,
        attended TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add phone and college columns if they don't exist (migration for existing tables)
    await query(`ALTER TABLE course_students ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`);
    await query(`ALTER TABLE course_students ADD COLUMN IF NOT EXISTS college VARCHAR(255)`);

    // Create colleges table (for external institutions)
    await query(`
      CREATE TABLE IF NOT EXISTS colleges (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create classes table
    await query(`
      CREATE TABLE IF NOT EXISTS classes (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
    await query(`
      CREATE TABLE IF NOT EXISTS class_students (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        class_id INTEGER REFERENCES classes(id),
        student_id INTEGER REFERENCES users(id),
        attendance VARCHAR(50) DEFAULT 'registered',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(class_id, student_id)
      )
    `);

    // Create certifications table
    await query(`
      CREATE TABLE IF NOT EXISTS certifications (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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

    await query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
        posted_to_org TINYINT(1) DEFAULT 0,
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
    await query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS posted_to_org TINYINT(1) DEFAULT 0`);
    await query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS posted_to_org_at TIMESTAMP NULL`);
    await query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_date DATE`);
    await query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS base_cost DECIMAL(10,2)`);
    await query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2)`);
    await query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approved_by INTEGER`);
    await query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL`);
    await query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS students_billed INTEGER`);
    await query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS rate_per_student DECIMAL(10,2)`);
    await query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS course_type_name VARCHAR(255)`);
    await query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS location VARCHAR(255)`);
    await query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS date_completed DATE`);
    await query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT`);
    await query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP NULL`);
    await query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL`);
    await query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending'`);

    // Migrate existing invoices: set approval_status based on posted_to_org
    await query(`
      UPDATE invoices
      SET approval_status = 'approved'
      WHERE posted_to_org = TRUE
        AND (approval_status IS NULL OR approval_status = '');
    `);
    await query(`
      UPDATE invoices
      SET approval_status = 'pending'
      WHERE posted_to_org = FALSE
        AND (approval_status IS NULL OR approval_status = '');
    `);

    // Create payments table
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
    await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP NULL`);
    await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS reversed_by INTEGER`);
    await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS reversal_reason TEXT`);

    // Create course_pricing table
    await query(`
      CREATE TABLE IF NOT EXISTS course_pricing (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id),
        course_type_id INTEGER NOT NULL REFERENCES class_types(id),
        price_per_student DECIMAL(10,2) NOT NULL,
        effective_date DATE NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(organization_id, course_type_id, is_active)
      )
    `);

    // Create email_templates table
    await query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        \`key\` VARCHAR(50) NOT NULL UNIQUE,
        category VARCHAR(50) NOT NULL,
        sub_category VARCHAR(50),
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        is_system TINYINT(1) DEFAULT 0,
        created_by INTEGER REFERENCES users(id),
        last_modified_by INTEGER REFERENCES users(id),
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add sub_category column if it doesn't exist (for existing databases)
    try {
      await query(`ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS sub_category VARCHAR(50)`);
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        console.log(`Note: Could not add sub_category column: ${e.message}`);
      }
    }

    // Create notifications table
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'info',
        category VARCHAR(50) NOT NULL DEFAULT 'system',
        link VARCHAR(500),
        is_read TINYINT(1) DEFAULT 0,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for faster notification queries
    await query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read)
    `);

    // Create notification_settings table for user preferences
    await query(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        course_notifications TINYINT(1) DEFAULT 1,
        billing_notifications TINYINT(1) DEFAULT 1,
        reminder_notifications TINYINT(1) DEFAULT 1,
        system_notifications TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create system_configurations table for sysadmin settings
    await query(`
      CREATE TABLE IF NOT EXISTS system_configurations (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
    await query(`
      CREATE TABLE IF NOT EXISTS profile_changes (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
    await query(`
      CREATE INDEX IF NOT EXISTS idx_profile_changes_status ON profile_changes(status)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_profile_changes_user_id ON profile_changes(user_id)
    `);

    // Create instructor_certifications table for tracking instructor credentials
    await query(`
      CREATE TABLE IF NOT EXISTS instructor_certifications (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
    await query(`
      CREATE INDEX IF NOT EXISTS idx_instructor_certifications_instructor ON instructor_certifications(instructor_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_instructor_certifications_expiration ON instructor_certifications(expiration_date)
    `);

    // Create vendor_invoices table
    await query(`
      CREATE TABLE IF NOT EXISTS vendor_invoices (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
    await query(`ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS approved_by INTEGER`);
    await query(`ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL`);
    await query(`ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS rejection_reason TEXT`);
    await query(`ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS rate DECIMAL(10,2)`);
    await query(`ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS hst DECIMAL(10,2)`);
    await query(`ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS total DECIMAL(10,2)`);
    await query(`ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS admin_notes TEXT`);

    // Create indexes for vendor_invoices
    await query(`
      CREATE INDEX IF NOT EXISTS idx_vendor_invoices_vendor_id ON vendor_invoices(vendor_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_vendor_invoices_status ON vendor_invoices(status)
    `);

    // Create vendor_payments table
    await query(`
      CREATE TABLE IF NOT EXISTS vendor_payments (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
    await query(`
      CREATE INDEX IF NOT EXISTS idx_vendor_payments_invoice ON vendor_payments(vendor_invoice_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_vendor_payments_status ON vendor_payments(status)
    `);

    // ============================================
    // PAYROLL & HR TABLES (Added from code audit)
    // ============================================

    // Create pay_rate_tiers table for instructor pay tiers
    await query(`
      CREATE TABLE IF NOT EXISTS pay_rate_tiers (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        base_hourly_rate DECIMAL(10,2) NOT NULL,
        course_bonus DECIMAL(10,2) DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create instructor_pay_rates table for individual instructor rates
    await query(`
      CREATE TABLE IF NOT EXISTS instructor_pay_rates (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tier_id INTEGER REFERENCES pay_rate_tiers(id),
        hourly_rate DECIMAL(10,2) NOT NULL,
        course_bonus DECIMAL(10,2) DEFAULT 0,
        effective_date DATE DEFAULT CURRENT_DATE,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(instructor_id, is_active)
      )
    `);

    // Create index for instructor_pay_rates
    await query(`
      CREATE INDEX IF NOT EXISTS idx_instructor_pay_rates_instructor ON instructor_pay_rates(instructor_id)
    `);

    // Create pay_rate_history table for tracking rate changes
    await query(`
      CREATE TABLE IF NOT EXISTS pay_rate_history (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
    await query(`
      CREATE INDEX IF NOT EXISTS idx_pay_rate_history_instructor ON pay_rate_history(instructor_id)
    `);

    // Create timesheets table for instructor time tracking
    await query(`
      CREATE TABLE IF NOT EXISTS timesheets (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
    await query(`
      CREATE INDEX IF NOT EXISTS idx_timesheets_instructor ON timesheets(instructor_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_timesheets_week ON timesheets(week_start_date)
    `);

    // Create timesheet_notes table for comments/notes on timesheets
    await query(`
      CREATE TABLE IF NOT EXISTS timesheet_notes (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        timesheet_id INTEGER NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        user_role VARCHAR(50),
        note_text TEXT NOT NULL,
        note_type VARCHAR(50) DEFAULT 'comment',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for timesheet_notes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_timesheet_notes_timesheet ON timesheet_notes(timesheet_id)
    `);

    // Create payment_requests table for instructor payment requests
    await query(`
      CREATE TABLE IF NOT EXISTS payment_requests (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
    await query(`
      CREATE INDEX IF NOT EXISTS idx_payment_requests_instructor ON payment_requests(instructor_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_payment_requests_timesheet ON payment_requests(timesheet_id)
    `);

    // Create payroll_payments table for actual payments made
    await query(`
      CREATE TABLE IF NOT EXISTS payroll_payments (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
    await query(`
      CREATE INDEX IF NOT EXISTS idx_payroll_payments_instructor ON payroll_payments(instructor_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_payroll_payments_status ON payroll_payments(status)
    `);

    // Create enrollments table for student class enrollments
    await query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
        course_request_id INTEGER REFERENCES course_requests(id) ON DELETE CASCADE,
        enrollment_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'cancelled', 'no_show')),
        completion_date DATE,
        certificate_issued TINYINT(1) DEFAULT 0,
        certificate_number VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for enrollments
    await query(`
      CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_enrollments_course_request ON enrollments(course_request_id)
    `);

    // Create indexes for improved query performance on frequently queried columns
    await query(`
      CREATE INDEX IF NOT EXISTS idx_course_requests_instructor_id ON course_requests(instructor_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_course_requests_organization_id ON course_requests(organization_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_course_requests_status ON course_requests(status)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_course_students_course_request_id ON course_students(course_request_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_course_students_attended ON course_students(course_request_id, attended)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_classes_instructor_id ON classes(instructor_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_classes_organization_id ON classes(organization_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)
    `);

    // ============================================
    // HOLIDAYS TABLE
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS holidays (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        description TEXT,
        is_recurring TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, date)
      )
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date)
    `);

    // ============================================
    // PAY RATES TABLE (legacy compatibility)
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS pay_rates (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_type_id INTEGER REFERENCES class_types(id),
        rate_per_hour DECIMAL(10,2),
        rate_per_class DECIMAL(10,2),
        effective_date DATE DEFAULT CURRENT_DATE,
        end_date DATE,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_pay_rates_instructor ON pay_rates(instructor_id)
    `);

    // ============================================
    // COLUMN MIGRATIONS FOR EXISTING TABLES
    // ============================================

    // Add missing columns to users table (MFA, security, etc.)
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled TINYINT(1) DEFAULT 0`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_backup_codes JSON`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP NULL`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP NULL`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS certifications TEXT`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS pay_rate DECIMAL(10,2)`);

    // Add missing columns to instructor_availability table
    await query(`ALTER TABLE instructor_availability ADD COLUMN IF NOT EXISTS available_date DATE`);
    await query(`ALTER TABLE instructor_availability ADD COLUMN IF NOT EXISTS start_time TIME`);
    await query(`ALTER TABLE instructor_availability ADD COLUMN IF NOT EXISTS end_time TIME`);
    await query(`ALTER TABLE instructor_availability ADD COLUMN IF NOT EXISTS is_available TINYINT(1) DEFAULT 1`);
    await query(`ALTER TABLE instructor_availability ADD COLUMN IF NOT EXISTS notes TEXT`);

    // Add missing columns to email_templates table
    await query(`ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS template_type VARCHAR(50)`);

    // Add missing columns to vendors table
    await query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS user_id INTEGER`);
    await query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS company_name VARCHAR(255)`);
    await query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255)`);
    await query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS tax_id VARCHAR(100)`);
    await query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100)`);
    await query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'`);
    await query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS notes TEXT`);

    // Add missing columns to audit_log table
    await query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_id INTEGER`);
    await query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

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
        // MySQL: drop FK by name (ignore error if it doesn't exist)
        try { await query(`ALTER TABLE ${fk.table} DROP FOREIGN KEY ${fk.constraint}`); } catch { /* ignore */ }
        await query(`ALTER TABLE ${fk.table} ADD CONSTRAINT ${fk.constraint} ${fk.sql}`);
      } catch (e: any) {
        console.log(`Note: Could not add constraint ${fk.constraint}: ${e.message}`);
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
        // MySQL 8.0.19+ / MariaDB 10.2.1+: drop then re-add CHECK constraint
        try { await query(`ALTER TABLE ${chk.table} DROP CONSTRAINT ${chk.constraint}`); } catch { /* ignore if not exists */ }
        await query(`ALTER TABLE ${chk.table} ADD CONSTRAINT ${chk.constraint} ${chk.sql}`);
      } catch (e: any) {
        console.log(`Note: Could not add constraint ${chk.constraint}: ${e.message}`);
      }
    }

    // Create audit_log table
    await query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        table_name VARCHAR(100) NOT NULL,
        record_id INTEGER NOT NULL,
        action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
        old_values JSON,
        new_values JSON,
        changed_by INTEGER REFERENCES users(id),
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit_log(changed_by)`);

    // Add soft delete columns
    await query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL`);
    await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL`);
    await query(`ALTER TABLE course_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL`);

    // Soft delete indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON invoices(deleted_at)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_course_requests_deleted_at ON course_requests(deleted_at)`);

    // Clear sensitive credentials from system_configurations (move to env vars)
    await query(`
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

    // Drop existing views so they can be recreated with current column definitions.
    // No CASCADE — dependent objects must be handled explicitly.
    try { await query(`DROP VIEW IF EXISTS invoice_with_breakdown`); } catch { /* ignore if has deps */ }
    try { await query(`DROP VIEW IF EXISTS course_request_details`); } catch { /* ignore if has deps */ }

    // Invoice breakdown view - now just a pass-through since base_cost and tax_amount are stored columns
    await query(`
      CREATE VIEW invoice_with_breakdown AS
      SELECT * FROM invoices
    `);

    // Course request details view
    await query(`
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
    const adminCheck = await query("SELECT id FROM users WHERE username = 'admin'");
    if (adminCheck.rows.length === 0) {
      console.log('👤 Creating default users...');
      const passwordHash = await bcrypt.hash('test123', 12);

      // Create test organization first
      await query(`
        INSERT IGNORE INTO organizations (name, contact_email)
        VALUES ('Test Organization', 'test@org.com')
      `);

      // Get the test organization ID
      const orgResult = await query(`SELECT id FROM organizations WHERE name = 'Test Organization'`);
      const testOrgId = orgResult.rows[0]?.id || 1;

      // Create default users (without organization) - use INSERT...SELECT to handle both username and email uniqueness
      const defaultUsers = [
        { username: 'admin', email: 'admin@cpr.com', role: 'admin' },
        { username: 'sysadmin', email: 'sysadmin@cpr.com', role: 'sysadmin' },
        { username: 'instructor', email: 'instructor@cpr.com', role: 'instructor' },
        { username: 'accountant', email: 'accountant@cpr.com', role: 'accountant' }
      ];
      for (const user of defaultUsers) {
        await query(`
          INSERT INTO users (username, email, password_hash, role)
          SELECT $1, $2, $3, $4
          WHERE NOT EXISTS (
            SELECT 1 FROM users WHERE username = $1 OR email = $2
          )
        `, [user.username, user.email, passwordHash, user.role]);
      }

      // Create organization user linked to Test Organization
      await query(`
        INSERT INTO users (username, email, password_hash, role, organization_id)
        SELECT 'orguser', 'orguser@cpr.com', $1, 'organization', $2
        WHERE NOT EXISTS (
          SELECT 1 FROM users WHERE username = 'orguser' OR email = 'orguser@cpr.com'
        )
      `, [passwordHash, testOrgId]);

      // Create class types
      await query(`
        INSERT IGNORE INTO class_types (name, description, duration_minutes) VALUES
        ('CPR Basic', 'Basic CPR certification course', 180),
        ('CPR Advanced', 'Advanced CPR certification course', 240),
        ('First Aid', 'First Aid certification course', 120)
      `);

      console.log('✅ Default data created');
    } else {
      console.log('ℹ️ Database already has data');
    }

    // Always ensure orguser exists (even if database already has data)
    const orgUserCheck = await query("SELECT id FROM users WHERE username = 'orguser' OR email = 'orguser@cpr.com'");
    if (orgUserCheck.rows.length === 0) {
      console.log('👤 Creating orguser account...');
      const passwordHash = await bcrypt.hash('test123', 12);

      // Ensure test organization exists
      await query(`
        INSERT IGNORE INTO organizations (name, contact_email)
        VALUES ('Test Organization', 'test@org.com')
      `);

      const orgResult = await query(`SELECT id FROM organizations WHERE name = 'Test Organization'`);
      const testOrgId = orgResult.rows[0]?.id || 1;

      // Use INSERT...SELECT with NOT EXISTS to handle both username and email uniqueness
      await query(`
        INSERT INTO users (username, email, password_hash, role, organization_id)
        SELECT 'orguser', 'orguser@cpr.com', $1, 'organization', $2
        WHERE NOT EXISTS (
          SELECT 1 FROM users WHERE username = 'orguser' OR email = 'orguser@cpr.com'
        )
      `, [passwordHash, testOrgId]);

      console.log('✅ orguser account created');
    }

    // List all users in database (temporary debug)
    const allUsers = await query('SELECT id, username, email, role, organization_id FROM users ORDER BY id');
    console.log('📋 All users in database:');
    allUsers.rows.forEach((u: any) => {
      console.log(`   - ID: ${u.id}, Username: ${u.username}, Email: ${u.email}, Role: ${u.role}, OrgID: ${u.organization_id || 'none'}`);
    });

    // List all organizations
    const allOrgs = await query('SELECT id, name, contact_email FROM organizations ORDER BY id');
    console.log('🏢 All organizations in database:');
    if (allOrgs.rows.length === 0) {
      console.log('   ⚠️ NO ORGANIZATIONS DEFINED!');
    } else {
      allOrgs.rows.forEach((o: any) => {
        console.log(`   - ID: ${o.id}, Name: ${o.name}, Email: ${o.contact_email}`);
      });
    }

    // Fix passwords for sean and peter (temporary fix - can be removed after passwords are working)
    const usersToFix = ['sean', 'peter'];
    const fixPasswordHash = await bcrypt.hash('test1234', 10);
    console.log('🔧 Attempting to reset passwords for:', usersToFix.join(', '));
    for (const username of usersToFix) {
      const updateResult = await query(
        'UPDATE users SET password_hash = $1 WHERE username = $2',
        [fixPasswordHash, username]
      );
      if (updateResult.rowCount > 0) {
        console.log(`✅ Password reset for user: ${username}`);
      } else {
        console.log(`⚠️ User not found: ${username}`);
      }
    }

    // Insert default system configurations
    await query(`
      INSERT IGNORE INTO system_configurations (config_key, config_value, description, category) VALUES
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
    `);

    // Insert default pay rate tiers
    await query(`
      INSERT IGNORE INTO pay_rate_tiers (name, description, base_hourly_rate, course_bonus) VALUES
      ('Standard', 'Standard instructor rate', 25.00, 50.00),
      ('Senior', 'Senior instructor rate', 35.00, 75.00),
      ('Lead', 'Lead instructor rate', 45.00, 100.00)
    `);

    // Record schema version so subsequent startups skip full init
    await query(`
      CREATE TABLE IF NOT EXISTS schema_info (
        \`key\` VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`
      INSERT INTO schema_info (\`key\`, value) VALUES ('version', $1)
      ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP
    `, [SCHEMA_VERSION]);

    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}
