const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';
const TEST_USERNAME = 'hr_user';
const TEST_PASSWORD = 'test123';

let authToken = '';

async function testLogin() {
  try {
    console.log('🔐 Testing login...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: TEST_USERNAME,
      password: TEST_PASSWORD
    });
    
    if (response.data.success) {
      authToken = response.data.data.accessToken;
      console.log('✅ Login successful');
      return true;
    } else {
      console.log('❌ Login failed:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.response?.data || error.message);
    return false;
  }
}

async function testPayRateTiers() {
  try {
    console.log('\n🏷️  Testing pay rate tiers API...');
    
    // Get all tiers
    const response = await axios.get(`${BASE_URL}/pay-rates/tiers`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Get tiers successful:', response.data.data.length, 'tiers found');
      response.data.data.forEach(tier => {
        console.log(`   - ${tier.name}: $${tier.base_hourly_rate}/hour + $${tier.course_bonus} per course`);
      });
      return true;
    } else {
      console.log('❌ Get tiers failed:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Pay rate tiers test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testInstructorsAPI() {
  try {
    console.log('\n👨‍🏫 Testing instructors API...');
    
    const response = await axios.get(`${BASE_URL}/pay-rates/instructors`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Get instructors successful:', response.data.data.instructors.length, 'instructors found');
      return true;
    } else {
      console.log('❌ Get instructors failed:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Instructors API test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testSetInstructorRate() {
  try {
    console.log('\n💰 Testing set instructor rate...');
    
    // First get instructors
    const instructorsResponse = await axios.get(`${BASE_URL}/pay-rates/instructors`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (instructorsResponse.data.data.instructors.length === 0) {
      console.log('⚠️  No instructors found, skipping rate test');
      return false;
    }
    
    const instructor = instructorsResponse.data.data.instructors[0];
    console.log(`📋 Testing with instructor: ${instructor.username}`);
    
    // Set pay rate
    const rateData = {
      hourly_rate: 30.00,
      course_bonus: 60.00,
      effective_date: new Date().toISOString().split('T')[0],
      notes: 'Test rate setup',
      change_reason: 'Initial rate setup'
    };
    
    const response = await axios.post(`${BASE_URL}/pay-rates/instructors/${instructor.id}`, rateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Set instructor rate successful');
      return true;
    } else {
      console.log('❌ Set instructor rate failed:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Set instructor rate test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testPayrollCalculation() {
  try {
    console.log('\n🧮 Testing payroll calculation with stored rates...');
    
    // Get instructors
    const instructorsResponse = await axios.get(`${BASE_URL}/pay-rates/instructors`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (instructorsResponse.data.data.instructors.length === 0) {
      console.log('⚠️  No instructors found, skipping payroll test');
      return false;
    }
    
    const instructor = instructorsResponse.data.data.instructors[0];
    
    // Calculate payroll without providing hourly_rate (should use stored rate)
    const response = await axios.post(`${BASE_URL}/payroll/calculate/${instructor.id}`, {
      start_date: '2025-01-01',
      end_date: '2025-01-31'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Payroll calculation successful');
      console.log('📊 Calculation result:', {
        instructor: response.data.data.instructor.username,
        hourlyRate: response.data.data.rates.hourlyRate,
        courseBonus: response.data.data.rates.courseBonus,
        tierName: response.data.data.rates.tierName,
        isDefaultRate: response.data.data.rates.isDefaultRate,
        totalAmount: response.data.data.calculation.totalAmount
      });
      return true;
    } else {
      console.log('❌ Payroll calculation failed:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Payroll calculation test failed:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Testing Pay Rate Management System API...\n');
  
  const results = {
    login: false,
    tiers: false,
    instructors: false,
    setRate: false,
    payroll: false
  };
  
  // Test login
  results.login = await testLogin();
  if (!results.login) {
    console.log('❌ Cannot proceed without login');
    return results;
  }
  
  // Test pay rate tiers
  results.tiers = await testPayRateTiers();
  
  // Test instructors API
  results.instructors = await testInstructorsAPI();
  
  // Test set instructor rate
  results.setRate = await testSetInstructorRate();
  
  // Test payroll calculation
  results.payroll = await testPayrollCalculation();
  
  // Summary
  console.log('\n📋 Test Results Summary:');
  console.log(`   Login: ${results.login ? '✅' : '❌'}`);
  console.log(`   Pay Rate Tiers: ${results.tiers ? '✅' : '❌'}`);
  console.log(`   Instructors API: ${results.instructors ? '✅' : '❌'}`);
  console.log(`   Set Instructor Rate: ${results.setRate ? '✅' : '❌'}`);
  console.log(`   Payroll Calculation: ${results.payroll ? '✅' : '❌'}`);
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Pay rate management system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
  }
  
  return results;
}

// Run tests
runAllTests().catch(console.error); 