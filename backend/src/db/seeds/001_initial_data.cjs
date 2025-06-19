/**
 * Initial data seed for CPR Training System
 * Populates tables with default data
 */

const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Clear existing data in the correct order (child tables first)
  console.log('🧹 Clearing existing data...');
  
  // Clear tables that reference users first
  await knex('activity_logs').del();
  await knex('audit_logs').del();
  await knex('sessions').del();
  await knex('payments').del();
  await knex('invoices').del();
  await knex('certifications').del();
  await knex('course_requests').del();
  await knex('class_students').del();
  await knex('classes').del();
  await knex('instructor_availability').del();
  await knex('email_templates').del();
  await knex('course_pricing').del();
  await knex('course_students').del();
  await knex('enrollments').del();
  await knex('vendors').del();
  
  // Clear main tables
  await knex('class_types').del();
  await knex('users').del();
  await knex('organizations').del();

  console.log('✅ Existing data cleared');

  // Insert organizations
  console.log('🏢 Inserting organizations...');
  const organizations = await knex('organizations').insert([
    {
      name: 'Test Organization',
      contact_email: 'test@org.com',
      contact_phone: '555-1234',
      address: '123 Main St'
    },
    {
      name: 'Demo Company',
      contact_email: 'demo@company.com',
      contact_phone: '555-5678',
      address: '456 Business Ave'
    }
  ]).returning('*');

  // Hash passwords
  console.log('🔐 Hashing passwords...');
  const saltRounds = 12;
  const adminPasswordHash = await bcrypt.hash('test123', saltRounds);
  const instructorPasswordHash = await bcrypt.hash('test123', saltRounds);
  const orgPasswordHash = await bcrypt.hash('test123', saltRounds);
  const accountantPasswordHash = await bcrypt.hash('test123', saltRounds);

  // Insert users
  console.log('👥 Inserting users...');
  const users = await knex('users').insert([
    {
      username: 'admin',
      email: 'admin@cpr.com',
      password_hash: adminPasswordHash,
      role: 'admin'
    },
    {
      username: 'instructor',
      email: 'instructor@cpr.com',
      password_hash: instructorPasswordHash,
      role: 'instructor'
    },
    {
      username: 'orguser',
      email: 'org@cpr.com',
      password_hash: orgPasswordHash,
      role: 'organization',
      organization_id: organizations[0].id
    },
    {
      username: 'accountant',
      email: 'accountant@cpr.com',
      password_hash: accountantPasswordHash,
      role: 'accountant'
    }
  ]).returning('*');

  // Insert class types
  console.log('📚 Inserting class types...');
  const classTypes = await knex('class_types').insert([
    {
      name: 'CPR Basic',
      description: 'Basic CPR certification course',
      duration_minutes: 180
    },
    {
      name: 'CPR Advanced',
      description: 'Advanced CPR certification course',
      duration_minutes: 240
    },
    {
      name: 'First Aid',
      description: 'First Aid certification course',
      duration_minutes: 120
    }
  ]).returning('*');

  // Insert email templates
  console.log('📧 Inserting email templates...');
  await knex('email_templates').insert([
    {
      name: 'Course Assignment Notification',
      key: 'course_assigned_instructor',
      category: 'course',
      subject: 'Course Assignment Notification',
      body: 'Dear {{instructorName}},\n\nYou have been assigned to teach {{courseName}}.\n\nBest regards,\nCPR Team',
      created_by: users[0].id,
      last_modified_by: users[0].id
    },
    {
      name: 'Course Reminder',
      key: 'course_reminder_instructor',
      category: 'reminder',
      subject: 'Course Reminder',
      body: 'Dear {{instructorName}},\n\nThis is a reminder that you have a course {{courseName}} scheduled for {{courseDate}}.\n\nBest regards,\nCPR Team',
      created_by: users[0].id,
      last_modified_by: users[0].id
    }
  ]);

  // Insert course pricing
  console.log('💰 Inserting course pricing...');
  await knex('course_pricing').insert([
    {
      organization_id: organizations[0].id,
      course_type_id: classTypes[0].id,
      price_per_student: 75.00,
      effective_date: new Date()
    },
    {
      organization_id: organizations[0].id,
      course_type_id: classTypes[1].id,
      price_per_student: 95.00,
      effective_date: new Date()
    },
    {
      organization_id: organizations[0].id,
      course_type_id: classTypes[2].id,
      price_per_student: 60.00,
      effective_date: new Date()
    }
  ]);

  console.log('✅ Initial data seeded successfully');
  console.log('📊 Summary:');
  console.log(`   - ${organizations.length} organizations created`);
  console.log(`   - ${users.length} users created`);
  console.log(`   - ${classTypes.length} class types created`);
  console.log(`   - 2 email templates created`);
  console.log(`   - 3 course pricing records created`);
}; 