const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';
const TEST_EMAIL = 'hr@cpr.com';
const TEST_PASSWORD = 'test123';

let authToken = '';

async function login() {
  try {
    console.log('🔐 Logging in as HR...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    authToken = response.data.data.access_token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testPayRateTiers() {
  console.log('\n🏷️  Testing Pay Rate Tiers...');
  
  try {
    // Get all tiers
    const tiersResponse = await axios.get(`${BASE_URL}/pay-rates/tiers`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Get tiers successful:', tiersResponse.data.data.length, 'tiers found');
    
    // Create a new tier
    const newTier = {
      name: 'Test Tier',
      description: 'Test tier for testing',
      base_hourly_rate: 28.00,
      course_bonus: 55.00
    };
    
    const createResponse = await axios.post(`${BASE_URL}/pay-rates/tiers`, newTier, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Create tier successful:', createResponse.data.data.name);
    
    return createResponse.data.data.id;
  } catch (error) {
    console.error('❌ Pay rate tiers test failed:', error.response?.data || error.message);
    return null;
  }
}

async function testInstructorPayRates() {
  console.log('\n👨‍🏫 Testing Instructor Pay Rates...');
  
  try {
    // Get instructors with pay rates
    const instructorsResponse = await axios.get(`${BASE_URL}/pay-rates/instructors`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Get instructors successful:', instructorsResponse.data.data.instructors.length, 'instructors found');
    
    if (instructorsResponse.data.data.instructors.length === 0) {
      console.log('⚠️  No instructors found, skipping pay rate tests');
      return null;
    }
    
    const instructor = instructorsResponse.data.data.instructors[0];
    console.log('📋 Testing with instructor:', instructor.username);
    
    // Set pay rate for instructor
    const payRate = {
      hourly_rate: 30.00,
      course_bonus: 60.00,
      effective_date: new Date().toISOString().split('T')[0],
      notes: 'Test rate setup',
      change_reason: 'Initial rate setup'
    };
    
    const setRateResponse = await axios.post(`${BASE_URL}/pay-rates/instructors/${instructor.id}`, payRate, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Set instructor rate successful');
    
    // Get instructor detail
    const detailResponse = await axios.get(`${BASE_URL}/pay-rates/instructors/${instructor.id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Get instructor detail successful');
    
    // Get current rate
    const currentRateResponse = await axios.get(`${BASE_URL}/pay-rates/instructors/${instructor.id}/current`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Get current rate successful:', currentRateResponse.data.data);
    
    return instructor.id;
  } catch (error) {
    console.error('❌ Instructor pay rates test failed:', error.response?.data || error.message);
    return null;
  }
}

async function testPayrollCalculation() {
  console.log('\n🧮 Testing Payroll Calculation with Stored Rates...');
  
  try {
    // Get instructors
    const instructorsResponse = await axios.get(`${BASE_URL}/pay-rates/instructors`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (instructorsResponse.data.data.instructors.length === 0) {
      console.log('⚠️  No instructors found, skipping payroll test');
      return;
    }
    
    const instructor = instructorsResponse.data.data.instructors[0];
    
    // Calculate payroll without providing hourly_rate (should use stored rate)
    const calculationResponse = await axios.post(`${BASE_URL}/payroll/calculate/${instructor.id}`, {
      start_date: '2025-01-01',
      end_date: '2025-01-31'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Payroll calculation successful');
    console.log('📊 Calculation result:', {
      instructor: calculationResponse.data.data.instructor.username,
      hourlyRate: calculationResponse.data.data.rates.hourlyRate,
      courseBonus: calculationResponse.data.data.rates.courseBonus,
      tierName: calculationResponse.data.data.rates.tierName,
      isDefaultRate: calculationResponse.data.data.rates.isDefaultRate,
      totalAmount: calculationResponse.data.data.calculation.totalAmount
    });
    
  } catch (error) {
    console.error('❌ Payroll calculation test failed:', error.response?.data || error.message);
  }
}

async function testBulkOperations() {
  console.log('\n👥 Testing Bulk Operations...');
  
  try {
    // Get instructors
    const instructorsResponse = await axios.get(`${BASE_URL}/pay-rates/instructors`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (instructorsResponse.data.data.instructors.length < 2) {
      console.log('⚠️  Need at least 2 instructors for bulk test, skipping');
      return;
    }
    
    const instructorIds = instructorsResponse.data.data.instructors.slice(0, 2).map(i => i.id);
    
    // Bulk update
    const bulkUpdate = {
      instructor_ids: instructorIds,
      hourly_rate: 32.00,
      course_bonus: 65.00,
      effective_date: new Date().toISOString().split('T')[0],
      notes: 'Bulk rate update test',
      change_reason: 'Annual rate adjustment'
    };
    
    const bulkResponse = await axios.post(`${BASE_URL}/pay-rates/bulk-update`, bulkUpdate, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Bulk update successful:', bulkResponse.data.data.length, 'instructors updated');
    
  } catch (error) {
    console.error('❌ Bulk operations test failed:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Pay Rate Management System Tests...\n');
  
  // Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without login');
    return;
  }
  
  // Test pay rate tiers
  await testPayRateTiers();
  
  // Test instructor pay rates
  await testInstructorPayRates();
  
  // Test payroll calculation
  await testPayrollCalculation();
  
  // Test bulk operations
  await testBulkOperations();
  
  console.log('\n✅ All pay rate management tests completed!');
}

// Run tests
runTests().catch(console.error); 