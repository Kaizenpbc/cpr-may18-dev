/**
 * Additional tables migration
 * Creates tables that exist in the database but weren't in the initial migration
 */

exports.up = function(knex) {
  return knex.schema
    // Create activity_logs table
    .createTable('activity_logs', function(table) {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users');
      table.string('action', 255).notNullable();
      table.text('details');
      table.string('ip_address', 45);
      table.string('user_agent', 500);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    
    // Create audit_logs table
    .createTable('audit_logs', function(table) {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users');
      table.string('action', 255).notNullable();
      table.text('old_values');
      table.text('new_values');
      table.string('table_name', 255);
      table.integer('record_id');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    
    // Create sessions table
    .createTable('sessions', function(table) {
      table.string('sid').primary();
      table.json('sess').notNullable();
      table.timestamp('expire').notNullable();
      table.integer('instructor_id').references('id').inTable('users');
      table.integer('course_id');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    
    // Create vendors table
    .createTable('vendors', function(table) {
      table.increments('id').primary();
      table.string('name', 255).notNullable();
      table.string('contact_email', 255);
      table.string('contact_phone', 20);
      table.text('address');
      table.string('vendor_type', 100);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })
    
    // Create course_students table (if different from class_students)
    .createTable('course_students', function(table) {
      table.increments('id').primary();
      table.integer('course_request_id').references('id').inTable('course_requests');
      table.integer('student_id').references('id').inTable('users');
      table.string('status', 50).defaultTo('enrolled');
      table.timestamp('enrolled_at').defaultTo(knex.fn.now());
      table.timestamp('completed_at');
      table.timestamps(true, true);
    })
    
    // Create enrollments table
    .createTable('enrollments', function(table) {
      table.increments('id').primary();
      table.integer('student_id').references('id').inTable('users');
      table.integer('class_id').references('id').inTable('classes');
      table.string('status', 50).defaultTo('enrolled');
      table.timestamp('enrolled_at').defaultTo(knex.fn.now());
      table.timestamp('completed_at');
      table.timestamps(true, true);
    });

  // Add final attendance tracking columns to course_requests
  await knex.raw(`
    ALTER TABLE course_requests 
    ADD COLUMN IF NOT EXISTS final_student_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS final_attendance_count INTEGER DEFAULT 0
  `);
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('enrollments')
    .dropTableIfExists('course_students')
    .dropTableIfExists('vendors')
    .dropTableIfExists('sessions')
    .dropTableIfExists('audit_logs')
    .dropTableIfExists('activity_logs');
};
