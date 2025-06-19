/**
 * Initial database schema migration
 * Creates all tables for the CPR Training System
 */

exports.up = function(knex) {
  return knex.schema
    // Create organizations table
    .createTable('organizations', function(table) {
      table.increments('id').primary();
      table.string('name', 255).notNullable().unique();
      table.string('contact_email', 255);
      table.string('contact_phone', 20);
      table.text('address');
      table.timestamps(true, true);
    })
    
    // Create users table
    .createTable('users', function(table) {
      table.increments('id').primary();
      table.string('username', 255).notNullable().unique();
      table.string('email', 255).notNullable().unique();
      table.string('password_hash', 255).notNullable();
      table.string('role', 50).notNullable().defaultTo('student');
      table.integer('organization_id').references('id').inTable('organizations');
      table.timestamps(true, true);
    })
    
    // Create class_types table
    .createTable('class_types', function(table) {
      table.increments('id').primary();
      table.string('name', 255).notNullable().unique();
      table.text('description');
      table.integer('duration_minutes').notNullable();
      table.timestamps(true, true);
    })
    
    // Create email_templates table
    .createTable('email_templates', function(table) {
      table.increments('id').primary();
      table.string('name', 255).notNullable().unique();
      table.string('key', 50).notNullable().unique();
      table.string('category', 50).notNullable();
      table.text('subject').notNullable();
      table.text('body').notNullable();
      table.boolean('is_active').defaultTo(true);
      table.boolean('is_system').defaultTo(false);
      table.integer('created_by').references('id').inTable('users');
      table.integer('last_modified_by').references('id').inTable('users');
      table.timestamp('deleted_at');
      table.timestamps(true, true);
    })
    
    // Create instructor_availability table
    .createTable('instructor_availability', function(table) {
      table.increments('id').primary();
      table.integer('instructor_id').notNullable().references('id').inTable('users');
      table.date('date').notNullable();
      table.string('status', 50).notNullable().defaultTo('available');
      table.timestamps(true, true);
      table.unique(['instructor_id', 'date']);
    })
    
    // Create classes table
    .createTable('classes', function(table) {
      table.increments('id').primary();
      table.integer('class_type_id').references('id').inTable('class_types');
      table.integer('instructor_id').references('id').inTable('users');
      table.integer('organization_id').references('id').inTable('organizations');
      table.timestamp('start_time').notNullable();
      table.timestamp('end_time').notNullable();
      table.string('status', 50).notNullable().defaultTo('scheduled');
      table.text('location');
      table.integer('max_students');
      table.timestamps(true, true);
    })
    
    // Create class_students table
    .createTable('class_students', function(table) {
      table.increments('id').primary();
      table.integer('class_id').references('id').inTable('classes');
      table.integer('student_id').references('id').inTable('users');
      table.string('attendance', 50).defaultTo('registered');
      table.timestamps(true, true);
      table.unique(['class_id', 'student_id']);
    })
    
    // Create course_requests table
    .createTable('course_requests', function(table) {
      table.increments('id').primary();
      table.integer('organization_id').notNullable().references('id').inTable('organizations');
      table.integer('course_type_id').notNullable().references('id').inTable('class_types');
      table.date('date_requested').notNullable();
      table.date('scheduled_date');
      table.string('location', 255).notNullable();
      table.integer('registered_students').notNullable().defaultTo(0);
      table.text('notes');
      table.string('status', 50).notNullable().defaultTo('pending');
      table.integer('instructor_id').references('id').inTable('users');
      table.date('confirmed_date');
      table.time('confirmed_start_time');
      table.time('confirmed_end_time');
      table.timestamp('completed_at');
      table.boolean('ready_for_billing').defaultTo(false);
      table.timestamp('ready_for_billing_at');
      table.boolean('invoiced').defaultTo(false);
      table.timestamp('invoiced_at');
      table.timestamp('last_reminder_at');
      table.boolean('is_cancelled').defaultTo(false);
      table.timestamp('cancelled_at');
      table.text('cancellation_reason');
      table.timestamps(true, true);
    })
    
    // Create certifications table
    .createTable('certifications', function(table) {
      table.increments('id').primary();
      table.integer('user_id').notNullable();
      table.integer('course_id').notNullable();
      table.string('course_name', 255).notNullable();
      table.date('issue_date').notNullable();
      table.date('expiration_date').notNullable();
      table.string('certification_number', 50).notNullable();
      table.string('status', 20).notNullable();
      table.string('instructor_name', 255).notNullable();
      table.timestamps(true, true);
    })
    
    // Create invoices table
    .createTable('invoices', function(table) {
      table.increments('id').primary();
      table.string('invoice_number', 50).notNullable().unique();
      table.integer('course_request_id').references('id').inTable('course_requests');
      table.integer('organization_id').notNullable().references('id').inTable('organizations');
      table.date('invoice_date').notNullable().defaultTo(knex.fn.now());
      table.date('due_date').notNullable();
      table.decimal('amount', 10, 2).notNullable();
      table.string('status', 20).notNullable().defaultTo('pending');
      table.string('course_type_name', 255);
      table.string('location', 255);
      table.date('date_completed');
      table.integer('students_billed');
      table.decimal('rate_per_student', 10, 2);
      table.text('notes');
      table.timestamp('email_sent_at');
      table.boolean('posted_to_org').defaultTo(false);
      table.timestamp('posted_to_org_at');
      table.date('paid_date');
      table.timestamps(true, true);
    })
    
    // Create payments table
    .createTable('payments', function(table) {
      table.increments('id').primary();
      table.integer('invoice_id').notNullable().references('id').inTable('invoices');
      table.decimal('amount', 10, 2).notNullable();
      table.date('payment_date').notNullable();
      table.string('payment_method', 50);
      table.string('reference_number', 100);
      table.text('notes');
      table.string('status', 50).defaultTo('verified');
      table.timestamp('submitted_by_org_at');
      table.timestamp('verified_by_accounting_at');
      table.timestamps(true, true);
    })
    
    // Create course_pricing table
    .createTable('course_pricing', function(table) {
      table.increments('id').primary();
      table.integer('organization_id').notNullable().references('id').inTable('organizations');
      table.integer('course_type_id').notNullable().references('id').inTable('class_types');
      table.decimal('price_per_student', 10, 2).notNullable();
      table.date('effective_date').notNullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      table.unique(['organization_id', 'course_type_id', 'is_active']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('course_pricing')
    .dropTableIfExists('payments')
    .dropTableIfExists('invoices')
    .dropTableIfExists('certifications')
    .dropTableIfExists('course_requests')
    .dropTableIfExists('class_students')
    .dropTableIfExists('classes')
    .dropTableIfExists('instructor_availability')
    .dropTableIfExists('email_templates')
    .dropTableIfExists('class_types')
    .dropTableIfExists('users')
    .dropTableIfExists('organizations');
};
