const axios = require('axios');

async function checkIffatCourses() {
  console.log('🔍 Checking Iffat College courses via API...\n');
  
  try {
    // First, let's check if the backend is responding
    const healthResponse = await axios.get('http://localhost:3001/api/v1/health');
    console.log('✅ Backend is running');
    
    // Get all organizations to find Iffat College
    const orgsResponse = await axios.get('http://localhost:3001/api/v1/organizations');
    const organizations = orgsResponse.data.data;
    
    const iffatOrg = organizations.find(org => 
      org.name.toLowerCase().includes('iffat') || 
      org.name.toLowerCase().includes('ifat')
    );
    
    if (!iffatOrg) {
      console.log('❌ Iffat College not found in organizations');
      return;
    }
    
    console.log(`✅ Found organization: ${iffatOrg.name} (ID: ${iffatOrg.id})`);
    
    // Get courses for this organization
    const coursesResponse = await axios.get(`http://localhost:3001/api/v1/organizations/${iffatOrg.id}/courses`);
    const courses = coursesResponse.data.data;
    
    const completedCourses = courses.filter(course => course.status === 'completed');
    
    console.log(`\n📊 Course Summary for ${iffatOrg.name}:`);
    console.log(`   Total courses: ${courses.length}`);
    console.log(`   Completed courses: ${completedCourses.length}`);
    
    // Count by status
    const statusCounts = {};
    courses.forEach(course => {
      statusCounts[course.status] = (statusCounts[course.status] || 0) + 1;
    });
    
    console.log('\n📈 Course Status Breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} courses`);
    });
    
    if (completedCourses.length > 0) {
      console.log('\n📋 Completed Course Details:');
      completedCourses.forEach((course, index) => {
        console.log(`\n   ${index + 1}. Course ID: ${course.id}`);
        console.log(`      Date: ${course.course_date}`);
        console.log(`      Location: ${course.location}`);
        console.log(`      Type: ${course.course_type_name}`);
        console.log(`      Students: ${course.students_enrolled}`);
        console.log(`      Invoice: ${course.invoice_number || 'Not created'}`);
        console.log(`      Invoice Status: ${course.invoice_status || 'N/A'}`);
        console.log(`      Invoice Amount: $${course.invoice_amount || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

checkIffatCourses(); 