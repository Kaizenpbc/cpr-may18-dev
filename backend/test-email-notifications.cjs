const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testEmailNotifications() {
  console.log('🧪 Testing Email Notifications for Instructor Assignment...\n');

  try {
    // Step 1: Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'gtacpr'
    });

    const token = loginResponse.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };

    console.log('✅ Admin login successful\n');

    // Step 2: Get pending courses
    console.log('2. Getting pending courses...');
    const coursesResponse = await axios.get(`${BASE_URL}/courses/pending`, { headers });
    const courses = coursesResponse.data.data;

    if (courses.length === 0) {
      console.log('❌ No pending courses found. Cannot test instructor assignment.');
      return;
    }

    console.log(`✅ Found ${courses.length} pending courses`);
    const courseToAssign = courses[0];
    console.log(`   Course ID: ${courseToAssign.id}`);
    console.log(`   Organization: ${courseToAssign.organization_name}`);
    console.log(`   Course Type: ${courseToAssign.course_type_name}\n`);

    // Step 3: Get available instructors
    console.log('3. Getting available instructors...');
    const instructorsResponse = await axios.get(`${BASE_URL}/instructors`, { headers });
    const instructors = instructorsResponse.data.data.filter(instructor => 
      instructor.assignment_status === 'Available'
    );

    if (instructors.length === 0) {
      console.log('❌ No available instructors found. Cannot test instructor assignment.');
      return;
    }

    console.log(`✅ Found ${instructors.length} available instructors`);
    const instructorToAssign = instructors[0];
    console.log(`   Instructor: ${instructorToAssign.instructor_name} (${instructorToAssign.email})\n`);

    // Step 4: Assign instructor to first pending course
    console.log('4. Assigning instructor to course...');
    console.log(`   Course: ${courseToAssign.course_type_name}`);
    console.log(`   Instructor: ${instructorToAssign.instructor_name} (${instructorToAssign.email})`);
    console.log(`   Time: 09:00 - 17:00`);

    const assignResponse = await axios.put(
      `${BASE_URL}/courses/${courseToAssign.id}/assign-instructor`,
      {
        instructorId: instructorToAssign.id,
        startTime: '09:00',
        endTime: '17:00'
      },
      { headers }
    );

    if (assignResponse.data.success) {
      console.log('✅ Instructor assignment successful!');
      console.log('   - Course status updated to Confirmed');
      console.log(`   - Instructor: ${instructorToAssign.email}`);
      console.log('   - Email notifications should have been sent');
      console.log('\n📧 Check the backend console for email logs!');
    } else {
      console.log('❌ Instructor assignment failed:', assignResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.error || error.message);
  }
}

testEmailNotifications(); 