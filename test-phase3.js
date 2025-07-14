const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';
let hrToken = '';
let instructorToken = '';

// Test data
const testData = {
  instructor: {
    username: 'instructor',
    password: 'test123',
    id: 2 // Update this to match your instructor user ID
  },
  hr: {
    username: 'hr',
    password: 'test123',
    id: 1 // Update this to match your HR user ID
  },
  timesheetData: {
    week_start_date: '2025-02-03',
    total_hours: 40.5,
    courses_taught: 3,
    notes: 'Test timesheet submission'
  },
  paymentData: {
    instructor_id: 2,
    amount: 1250.00,
    payment_date: '2025-01-15',
    payment_method: 'direct_deposit',
    notes: 'Test payment creation'
  },
  notificationData: {
    recipient_id: 1,
    type: 'test_notification',
    title: 'Test Notification',
    message: 'This is a test notification for Phase 3'
  }
};

// Helper function to make authenticated requests
const makeRequest = async (method, endpoint, data = null, token = hrToken) => {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  if (data) {
    config.data = data;
  }
  
  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error in ${method} ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
};

// Login helpers
const loginUser = async (username, password) => {
  const response = await axios.post(`${BASE_URL}/auth/login`, { username, password });
  return response.data.data?.accessToken || response.data.token || response.data.data?.token || response.data.access_token;
};

// Test functions
const testLogin = async () => {
  console.log('\n🔐 Testing HR and Instructor Login...');
  try {
    hrToken = await loginUser(testData.hr.username, testData.hr.password);
    instructorToken = await loginUser(testData.instructor.username, testData.instructor.password);
    if (!hrToken || !instructorToken) throw new Error('Missing token');
    console.log('✅ HR and Instructor login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
};

const testTimesheetStats = async () => {
  console.log('\n📊 Testing Timesheet Statistics...');
  try {
    const response = await makeRequest('GET', '/timesheet/stats', null, hrToken);
    console.log('✅ Timesheet stats retrieved:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Timesheet stats failed');
    return false;
  }
};

const testTimesheetSubmission = async () => {
  console.log('\n📝 Testing Timesheet Submission (Instructor)...');
  try {
    const response = await makeRequest('POST', '/timesheet', testData.timesheetData, instructorToken);
    console.log('✅ Timesheet submitted:', response.data);
    return response.data.id;
  } catch (error) {
    console.error('❌ Timesheet submission failed');
    return null;
  }
};

const testTimesheetApproval = async (timesheetId) => {
  console.log('\n✅ Testing Timesheet Approval (HR)...');
  try {
    const response = await makeRequest('POST', `/timesheet/${timesheetId}/approve`, {
      action: 'approve',
      comment: 'Approved by HR'
    }, hrToken);
    console.log('✅ Timesheet approved:', response.message);
    return true;
  } catch (error) {
    console.error('❌ Timesheet approval failed');
    return false;
  }
};

const testPayrollStats = async () => {
  console.log('\n💰 Testing Payroll Statistics...');
  try {
    const response = await makeRequest('GET', '/payroll/stats', null, hrToken);
    console.log('✅ Payroll stats retrieved:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Payroll stats failed');
    return false;
  }
};

const testPayrollCalculation = async () => {
  console.log('\n🧮 Testing Payroll Calculation...');
  try {
    const response = await makeRequest('POST', `/payroll/calculate/${testData.instructor.id}`, {
      start_date: '2025-01-01',
      end_date: '2025-01-31',
      hourly_rate: 25.00
    }, hrToken);
    console.log('✅ Payroll calculation successful:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Payroll calculation failed');
    return false;
  }
};

const testPaymentCreation = async () => {
  console.log('\n💳 Testing Payment Creation...');
  try {
    const response = await makeRequest('POST', '/payroll/payments', testData.paymentData, hrToken);
    console.log('✅ Payment created:', response.data);
    return response.data.id;
  } catch (error) {
    console.error('❌ Payment creation failed');
    return null;
  }
};

const testPaymentProcessing = async (paymentId) => {
  console.log('\n⚙️ Testing Payment Processing...');
  try {
    const response = await makeRequest('POST', `/payroll/payments/${paymentId}/process`, {
      action: 'approve',
      transaction_id: 'TXN123456',
      notes: 'Payment processed successfully'
    }, hrToken);
    console.log('✅ Payment processed:', response.message);
    return true;
  } catch (error) {
    console.error('❌ Payment processing failed');
    return false;
  }
};

const testNotificationCreation = async () => {
  console.log('\n🔔 Testing Notification Creation...');
  try {
    const response = await makeRequest('POST', '/notifications', testData.notificationData, hrToken);
    console.log('✅ Notification created:', response.data);
    return response.data.id;
  } catch (error) {
    console.error('❌ Notification creation failed');
    return null;
  }
};

const testNotificationRetrieval = async () => {
  console.log('\n📋 Testing Notification Retrieval...');
  try {
    const response = await makeRequest('GET', '/notifications', null, hrToken);
    console.log('✅ Notifications retrieved:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Notification retrieval failed');
    return false;
  }
};

const testSystemNotifications = async () => {
  console.log('\n🖥️ Testing System Notifications...');
  try {
    const response = await makeRequest('GET', '/notifications/system', null, hrToken);
    console.log('✅ System notifications retrieved:', response.data);
    return true;
  } catch (error) {
    console.error('❌ System notifications failed');
    return false;
  }
};

const testBulkNotifications = async () => {
  console.log('\n📢 Testing Bulk Notifications...');
  try {
    const response = await makeRequest('POST', '/notifications/bulk', {
      recipient_ids: [1, 2],
      type: 'bulk_test',
      title: 'Bulk Test Notification',
      message: 'This is a bulk test notification'
    }, hrToken);
    console.log('✅ Bulk notifications sent:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Bulk notifications failed');
    return false;
  }
};

const testTimesheetRetrieval = async () => {
  console.log('\n📋 Testing Timesheet Retrieval...');
  try {
    const response = await makeRequest('GET', '/timesheet', null, hrToken);
    console.log('✅ Timesheets retrieved:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Timesheet retrieval failed');
    return false;
  }
};

const testPayrollRetrieval = async () => {
  console.log('\n💰 Testing Payroll Retrieval...');
  try {
    const response = await makeRequest('GET', '/payroll/payments', null, hrToken);
    console.log('✅ Payroll payments retrieved:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Payroll retrieval failed');
    return false;
  }
};

const testInstructorSummary = async () => {
  console.log('\n👤 Testing Instructor Summary...');
  try {
    const response = await makeRequest('GET', `/timesheet/instructor/${testData.instructor.id}/summary`, null, hrToken);
    console.log('✅ Instructor timesheet summary retrieved:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Instructor summary failed');
    return false;
  }
};

const testPayrollReport = async () => {
  console.log('\n📊 Testing Payroll Report...');
  try {
    const response = await makeRequest('GET', '/payroll/report', null, hrToken);
    console.log('✅ Payroll report retrieved:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Payroll report failed');
    return false;
  }
};

// Main test runner
const runPhase3Tests = async () => {
  console.log('🚀 Starting Phase 3 Tests...');
  console.log('=' * 50);
  
  const results = {
    login: false,
    timesheetStats: false,
    timesheetSubmission: false,
    timesheetApproval: false,
    payrollStats: false,
    payrollCalculation: false,
    paymentCreation: false,
    paymentProcessing: false,
    notificationCreation: false,
    notificationRetrieval: false,
    systemNotifications: false,
    bulkNotifications: false,
    timesheetRetrieval: false,
    payrollRetrieval: false,
    instructorSummary: false,
    payrollReport: false
  };
  
  // Test login first
  results.login = await testLogin();
  if (!results.login) {
    console.error('❌ Cannot proceed without authentication');
    return results;
  }
  
  // Test timesheet functionality
  results.timesheetStats = await testTimesheetStats();
  results.timesheetRetrieval = await testTimesheetRetrieval();
  
  const timesheetId = await testTimesheetSubmission();
  results.timesheetSubmission = timesheetId !== null;
  
  if (timesheetId) {
    results.timesheetApproval = await testTimesheetApproval(timesheetId);
  }
  
  // Test payroll functionality
  results.payrollStats = await testPayrollStats();
  results.payrollCalculation = await testPayrollCalculation();
  results.payrollRetrieval = await testPayrollRetrieval();
  
  const paymentId = await testPaymentCreation();
  results.paymentCreation = paymentId !== null;
  
  if (paymentId) {
    results.paymentProcessing = await testPaymentProcessing(paymentId);
  }
  
  // Test notification functionality
  results.notificationRetrieval = await testNotificationRetrieval();
  results.systemNotifications = await testSystemNotifications();
  
  const notificationId = await testNotificationCreation();
  results.notificationCreation = notificationId !== null;
  
  results.bulkNotifications = await testBulkNotifications();
  
  // Test additional functionality
  results.instructorSummary = await testInstructorSummary();
  results.payrollReport = await testPayrollReport();
  
  // Print results
  console.log('\n' + '=' * 50);
  console.log('📋 Phase 3 Test Results:');
  console.log('=' * 50);
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  console.log('\n' + '=' * 50);
  console.log(`🎯 Overall Success Rate: ${successRate}% (${passedTests}/${totalTests})`);
  console.log('=' * 50);
  
  if (successRate === '100.0') {
    console.log('🎉 All Phase 3 tests passed! The system is ready for production use.');
  } else {
    console.log('⚠️ Some tests failed. Please review the errors above.');
  }
  
  return results;
};

// Run the tests
runPhase3Tests().catch(console.error); 