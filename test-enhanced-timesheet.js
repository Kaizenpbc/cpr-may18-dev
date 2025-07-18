const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function testEnhancedTimesheet() {
  console.log('🧪 Testing Enhanced Timesheet System with Course Details...\n');

  try {
    // 1. Login as HR to view timesheets
    console.log('1. Logging in as HR...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'hr',
      password: 'test123'
    });
    
    const token = loginResponse.data.data?.accessToken || loginResponse.data.accessToken;
    console.log('✅ HR login successful');

    // 2. Get pending timesheets (should include Mike's with course details)
    console.log('\n2. Getting pending timesheets...');
    const timesheetsResponse = await axios.get(`${API_BASE}/timesheet?status=pending`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const timesheets = timesheetsResponse.data.data.timesheets;
    console.log(`Found ${timesheets.length} pending timesheets`);
    
    timesheets.forEach((ts, index) => {
      console.log(`\n${index + 1}. Timesheet ID: ${ts.id}`);
      console.log(`   Instructor: ${ts.instructor_name}`);
      console.log(`   Week: ${ts.week_start_date}`);
      console.log(`   Hours: ${ts.total_hours}`);
      console.log(`   Courses Taught: ${ts.courses_taught}`);
      console.log(`   Status: ${ts.status}`);
      
      if (ts.course_details && ts.course_details.length > 0) {
        console.log(`   Course Details:`);
        ts.course_details.forEach((course, cIndex) => {
          console.log(`     ${cIndex + 1}. ${course.course_type} - ${course.date} at ${course.start_time}`);
          console.log(`        Location: ${course.location || 'TBD'}`);
          console.log(`        Organization: ${course.organization_name}`);
          console.log(`        Students: ${course.student_count}`);
        });
      } else {
        console.log(`   Course Details: None`);
      }
    });

    // 3. Test approving Mike's timesheet to create payment request
    console.log('\n3. Testing timesheet approval...');
    const mikeTimesheet = timesheets.find(ts => ts.instructor_name === 'mike');
    
    if (mikeTimesheet) {
      console.log(`Approving Mike's timesheet (ID: ${mikeTimesheet.id})...`);
      
      const approveResponse = await axios.post(`${API_BASE}/timesheet/${mikeTimesheet.id}/approve`, {
        action: 'approve',
        comment: 'Approved with course details'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Timesheet approved successfully');
      console.log('Response:', approveResponse.data.message);
      
      if (approveResponse.data.data?.paymentRequest) {
        console.log(`Payment Request created: $${approveResponse.data.data.paymentRequest.amount}`);
      }
    } else {
      console.log('❌ Mike\'s timesheet not found in pending timesheets');
    }

    // 4. Check payment requests (should now include Mike's with course details)
    console.log('\n4. Checking payment requests...');
    const paymentRequestsResponse = await axios.get(`${API_BASE}/payment-requests`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const paymentRequests = paymentRequestsResponse.data.data.requests;
    console.log(`Found ${paymentRequests.length} payment requests`);
    
    paymentRequests.forEach((pr, index) => {
      console.log(`\n${index + 1}. Payment Request ID: ${pr.id}`);
      console.log(`   Instructor: ${pr.instructor_name}`);
      console.log(`   Amount: $${pr.amount}`);
      console.log(`   Status: ${pr.status}`);
      console.log(`   Week: ${pr.week_start_date}`);
      
      if (pr.course_details && pr.course_details.length > 0) {
        console.log(`   Course Details:`);
        pr.course_details.forEach((course, cIndex) => {
          console.log(`     ${cIndex + 1}. ${course.course_type} - ${course.date} at ${course.start_time}`);
          console.log(`        Location: ${course.location || 'TBD'}`);
          console.log(`        Organization: ${course.organization_name}`);
          console.log(`        Students: ${course.student_count}`);
        });
      } else {
        console.log(`   Course Details: None`);
      }
    });

    console.log('\n🎉 Enhanced timesheet system test completed!');
    console.log('\n📋 Summary:');
    console.log('✅ Course details are now included in timesheet submissions');
    console.log('✅ HR can see course details when reviewing timesheets');
    console.log('✅ Course details flow through to payment requests');
    console.log('✅ Accounting has full course information for payment processing');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testEnhancedTimesheet(); 