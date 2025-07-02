const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3001/api/v1';
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'test123';

async function testEmailNotifications() {
  try {
    console.log('🧪 Testing Email Notifications for Instructor Assignment...\n');

    // Step 1: Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    const token = loginResponse.data.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };

    console.log('✅ Admin login successful\n');

    // Step 2: Get pending courses
    console.log('2. Fetching pending courses...');
    const pendingCoursesResponse = await axios.get(`${BASE_URL}/courses/pending`, { headers });
    const pendingCourses = pendingCoursesResponse.data.data;

    if (pendingCourses.length === 0) {
      console.log('❌ No pending courses found. Cannot test instructor assignment.');
      return;
    }

    console.log(`✅ Found ${pendingCourses.length} pending courses\n`);

    // Step 3: Get available instructors
    console.log('3. Fetching available instructors...');
    const instructorsResponse = await axios.get(`${BASE_URL}/instructors`, { headers });
    const instructors = instructorsResponse.data.data.filter(instructor => 
      instructor.availability_status === 'Available' || instructor.availability_status === 'Available'
    );

    if (instructors.length === 0) {
      console.log('❌ No available instructors found. Cannot test instructor assignment.');
      return;
    }

    console.log(`✅ Found ${instructors.length} available instructors\n`);

    // Step 4: Assign instructor to first pending course
    const courseToAssign = pendingCourses[0];
    const instructorToAssign = instructors[0];

    console.log('4. Assigning instructor to course...');
    console.log(`   Course: ${courseToAssign.course_type_name} (${courseToAssign.location})`);
    console.log(`   Instructor: ${instructorToAssign.instructor_name} (${instructorToAssign.email})`);
    console.log(`   Date: ${courseToAssign.scheduled_date}`);

    const assignResponse = await axios.put(
      `${BASE_URL}/courses/${courseToAssign.id}/assign-instructor`,
      {
        instructorId: instructorToAssign.id,
        startTime: '09:00',
        endTime: '12:00'
      },
      { headers }
    );

    if (assignResponse.data.success) {
      console.log('✅ Instructor assignment successful!');
      console.log('📧 Email notifications should have been sent to:');
      console.log(`   - Instructor: ${instructorToAssign.email}`);
      
      // Get organization email
      const orgResponse = await axios.get(`${BASE_URL}/organizations/${courseToAssign.organization_id}`, { headers });
      const orgEmail = orgResponse.data.data.contact_email;
      console.log(`   - Organization: ${orgEmail}`);
      
      console.log('\n📋 Check the email service logs to verify emails were sent.');
      console.log('📋 Check the instructor and organization email inboxes.');
    } else {
      console.log('❌ Instructor assignment failed:', assignResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testEmailNotifications(); 