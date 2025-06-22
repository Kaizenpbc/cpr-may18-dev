const knex = require('knex');
const bcrypt = require('bcryptjs');

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
};

const db = knex(testConfig);

async function seedTestData() {
  try {
    console.log('🌱 Seeding test data...');

    // Clear existing data
    await db('users').del();
    await db('organizations').del();
    await db('course_types').del();
    await db('class_types').del();

    // Create test organization
    const [orgResult] = await db('organizations').insert({
      name: 'Test Organization',
      contact_email: 'test@example.com',
      contact_phone: '555-0123',
      address: '123 Test Street, Test City, TC 12345',
    }).returning('id');
    
    const orgId = orgResult.id;

    // Create test course types
    const courseTypes = [
      {
        name: 'CPR Basic',
        description: 'Basic CPR certification course',
        duration: 120,
        price: 75.00,
      },
      {
        name: 'CPR Advanced',
        description: 'Advanced CPR with AED training',
        duration: 180,
        price: 95.00,
      },
    ];

    const courseTypeIds = await db('course_types').insert(courseTypes).returning('id');

    // Create test class types
    const classTypes = [
      {
        name: 'CPR Basic Class',
        description: 'Basic CPR class',
        duration_minutes: 120,
      },
      {
        name: 'CPR Advanced Class',
        description: 'Advanced CPR class',
        duration_minutes: 180,
      },
    ];

    const classTypeIds = await db('class_types').insert(classTypes).returning('id');

    // Create test users
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    const users = [
      {
        username: 'testadmin',
        email: 'admin@test.com',
        password_hash: hashedPassword,
        role: 'admin',
        organization_id: orgId,
      },
      {
        username: 'testinstructor',
        email: 'instructor@test.com',
        password_hash: hashedPassword,
        role: 'instructor',
        organization_id: orgId,
      },
      {
        username: 'teststudent',
        email: 'student@test.com',
        password_hash: hashedPassword,
        role: 'student',
        organization_id: orgId,
      },
    ];

    const userIds = await db('users').insert(users).returning('id');
    const adminUserId = userIds[0].id;

    // Create test email templates
    const emailTemplates = [
      {
        name: 'Test Course Assignment',
        key: 'test_course_assignment',
        category: 'course',
        subject: 'Test Course Assignment',
        body: 'Dear {{instructorName}}, you have been assigned to teach {{courseName}}.',
        is_active: true,
        is_system: false,
        created_by: adminUserId,
        last_modified_by: adminUserId,
      },
    ];

    await db('email_templates').insert(emailTemplates);

    console.log('✅ Test data seeded successfully!');
    console.log('\nTest Credentials:');
    console.log('Admin: admin@test.com / test123');
    console.log('Instructor: instructor@test.com / test123');
    console.log('Student: student@test.com / test123');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run if called directly
if (require.main === module) {
  seedTestData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = seedTestData; 