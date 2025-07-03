const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';
let authToken = '';

// Test results storage
const testResults = [];

// Helper function to add test result
function addResult(endpoint, method, status, details = '') {
    testResults.push({
        endpoint,
        method,
        status: status ? '✅ PASS' : '❌ FAIL',
        details
    });
}

// Helper function to make authenticated request
async function makeRequest(method, endpoint, data = null) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return { success: true, status: response.status, data: response.data };
    } catch (error) {
        return { 
            success: false, 
            status: error.response?.status || 'ERROR',
            data: error.response?.data || error.message 
        };
    }
}

// Test all endpoints
async function testAllEndpoints() {
    console.log('🧪 Testing All Instructor Endpoints\n');
    
    // 1. Login to get token
    console.log('1. Testing Login...');
    let loginSuccess = false;
    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
            const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
                username: 'instructor',
                password: 'test123'
            });
            if (loginResponse.data.data && loginResponse.data.data.accessToken) {
                authToken = loginResponse.data.data.accessToken;
                addResult('/auth/login', 'POST', true, 'Login successful');
                console.log('✅ Login successful');
                loginSuccess = true;
                break;
            } else {
                console.log(`❌ Login failed - no token (attempt ${attempt})`);
            }
        } catch (error) {
            console.log(`❌ Login failed (attempt ${attempt}):`, error.response?.data?.message || error.message);
            await new Promise(res => setTimeout(res, 1000));
        }
    }
    if (!loginSuccess) {
        addResult('/auth/login', 'POST', false, 'Login failed after retries');
        return;
    }

    // 2. GET /instructor/availability
    console.log('\n2. Testing GET /instructor/availability...');
    const availabilityGet = await makeRequest('GET', '/instructor/availability');
    addResult('/instructor/availability', 'GET', availabilityGet.success, 
        availabilityGet.success ? `Status: ${availabilityGet.status}` : availabilityGet.data?.message || availabilityGet.data);

    // 3. PUT /instructor/availability
    console.log('\n3. Testing PUT /instructor/availability...');
    const availabilityPut = await makeRequest('PUT', '/instructor/availability', {
        availability: [
            {
                day: 'monday',
                start_time: '09:00',
                end_time: '17:00',
                available: true
            }
        ]
    });
    addResult('/instructor/availability', 'PUT', availabilityPut.success,
        availabilityPut.success ? `Status: ${availabilityPut.status}` : availabilityPut.data?.message || availabilityPut.data);

    // 4. GET /instructor/schedule
    console.log('\n4. Testing GET /instructor/schedule...');
    const scheduleGet = await makeRequest('GET', '/instructor/schedule');
    addResult('/instructor/schedule', 'GET', scheduleGet.success,
        scheduleGet.success ? `Status: ${scheduleGet.status}` : scheduleGet.data?.message || scheduleGet.data);

    // 5. PUT /instructor/profile
    console.log('\n5. Testing PUT /instructor/profile...');
    const profilePut = await makeRequest('PUT', '/instructor/profile', {
        first_name: 'Updated',
        last_name: 'Instructor',
        email: 'instructor@test.com',
        phone: '123-456-7890'
    });
    addResult('/instructor/profile', 'PUT', profilePut.success,
        profilePut.success ? `Status: ${profilePut.status}` : profilePut.data?.message || profilePut.data);

    // 6. GET /instructor/classes
    console.log('\n6. Testing GET /instructor/classes...');
    const classesGet = await makeRequest('GET', '/instructor/classes');
    addResult('/instructor/classes', 'GET', classesGet.success,
        classesGet.success ? `Status: ${classesGet.status}, Classes: ${classesGet.data?.length || 0}` : classesGet.data?.message || classesGet.data);

    // 7. GET /instructor/classes/:id
    console.log('\n7. Testing GET /instructor/classes/:id...');
    const classDetailGet = await makeRequest('GET', '/instructor/classes/1');
    addResult('/instructor/classes/:id', 'GET', classDetailGet.success,
        classDetailGet.success ? `Status: ${classDetailGet.status}` : classDetailGet.data?.message || classDetailGet.data);

    // 8. GET /instructor/classes/:id/students
    console.log('\n8. Testing GET /instructor/classes/:id/students...');
    const studentsGet = await makeRequest('GET', '/instructor/classes/1/students');
    addResult('/instructor/classes/:id/students', 'GET', studentsGet.success,
        studentsGet.success ? `Status: ${studentsGet.status}` : studentsGet.data?.message || studentsGet.data);

    // 9. POST /instructor/classes/:id/students
    console.log('\n9. Testing POST /instructor/classes/:id/students...');
    const addStudentsPost = await makeRequest('POST', '/instructor/classes/1/students', {
        students: [
            {
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@test.com'
            },
            {
                first_name: 'Jane',
                last_name: 'Smith',
                email: 'jane.smith@test.com'
            }
        ]
    });
    addResult('/instructor/classes/:id/students', 'POST', addStudentsPost.success,
        addStudentsPost.success ? `Status: ${addStudentsPost.status}` : addStudentsPost.data?.message || addStudentsPost.data);

    // 10. POST /instructor/classes/:id/complete
    console.log('\n10. Testing POST /instructor/classes/:id/complete...');
    // Note: All classes are already completed, so this will correctly fail
    const completePost = await makeRequest('POST', '/instructor/classes/9/complete', {
        instructor_comments: 'Test completion'
    });
    // This is expected to fail since class 9 is already completed
    const expectedFailure = !completePost.success && completePost.data?.error === 'Class is already completed';
    addResult('/instructor/classes/:id/complete', 'POST', expectedFailure,
        expectedFailure ? '✅ Correctly prevents duplicate completion' : completePost.data?.message || completePost.data);

    // 11. POST /instructor/classes/:id/attendance
    console.log('\n11. Testing POST /instructor/classes/:id/attendance...');
    const attendancePost = await makeRequest('POST', '/instructor/classes/1/attendance', {
        students: [
            { id: 1, attended: true },
            { id: 2, attended: false }
        ]
    });
    addResult('/instructor/classes/:id/attendance', 'POST', attendancePost.success,
        attendancePost.success ? `Status: ${attendancePost.status}` : attendancePost.data?.message || attendancePost.data);

    // 12. GET /instructor/attendance
    console.log('\n12. Testing GET /instructor/attendance...');
    const attendanceGet = await makeRequest('GET', '/instructor/attendance');
    addResult('/instructor/attendance', 'GET', attendanceGet.success,
        attendanceGet.success ? `Status: ${attendanceGet.status}` : attendanceGet.data?.message || attendanceGet.data);

    // 13. POST /instructor/classes/notes
    console.log('\n13. Testing POST /instructor/classes/notes...');
    const notesPost = await makeRequest('POST', '/instructor/classes/notes', {
        classId: 1,
        notes: 'Test notes for the class'
    });
    addResult('/instructor/classes/notes', 'POST', notesPost.success,
        notesPost.success ? `Status: ${notesPost.status}` : notesPost.data?.message || notesPost.data);

    // Print summary table
    console.log('\n' + '='.repeat(80));
    console.log('📊 INSTRUCTOR ENDPOINTS TEST SUMMARY');
    console.log('='.repeat(80));
    console.log('| Endpoint'.padEnd(35) + '| Method'.padEnd(8) + '| Status'.padEnd(10) + '| Details'.padEnd(25) + '|');
    console.log('|' + '-'.repeat(34) + '|' + '-'.repeat(7) + '|' + '-'.repeat(9) + '|' + '-'.repeat(24) + '|');
    
    testResults.forEach(result => {
        const endpoint = result.endpoint.padEnd(34);
        const method = result.method.padEnd(7);
        const status = result.status.padEnd(9);
        let details = result.details;
        if (typeof details === 'object') {
            details = JSON.stringify(details);
        }
        details = String(details || '').substring(0, 23).padEnd(24);
        console.log(`| ${endpoint}| ${method}| ${status}| ${details}|`);
    });
    
    console.log('='.repeat(80));
    
    // Print full error for /instructor/profile
    const profileResult = testResults.find(r => r.endpoint === '/instructor/profile' && r.method === 'PUT');
    if (profileResult && !profileResult.status.includes('PASS')) {
        console.log('\nFull error for PUT /instructor/profile:');
        if (typeof profileResult.details === 'object') {
            console.log(JSON.stringify(profileResult.details, null, 2));
        } else {
            console.log(profileResult.details);
        }
    }
    // Print full error for /instructor/classes/:id
    const classDetailResult = testResults.find(r => r.endpoint === '/instructor/classes/:id' && r.method === 'GET');
    if (classDetailResult && !classDetailResult.status.includes('PASS')) {
        console.log('\nFull error for GET /instructor/classes/:id:');
        if (typeof classDetailResult.details === 'object') {
            console.log(JSON.stringify(classDetailResult.details, null, 2));
        } else {
            console.log(classDetailResult.details);
        }
    }
    
    // Summary statistics
    const passed = testResults.filter(r => r.status === '✅ PASS').length;
    const failed = testResults.filter(r => r.status === '❌ FAIL').length;
    const total = testResults.length;
    
    console.log(`\n📈 SUMMARY STATISTICS:`);
    console.log(`✅ Passed: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
    console.log(`❌ Failed: ${failed}/${total} (${Math.round(failed/total*100)}%)`);
    
    if (failed > 0) {
        console.log('\n🔍 FAILED ENDPOINTS:');
        testResults.filter(r => r.status === '❌ FAIL').forEach(result => {
            console.log(`   ${result.method} ${result.endpoint}: ${result.details}`);
        });
    }
    
    console.log('\n✨ Test completed!');
}

// Run the tests
testAllEndpoints().catch(console.error); 