const axios = require('axios');

async function testSysadminAPI() {
  try {
    console.log('🔍 Testing SYSADMIN API endpoints...\n');
    
    // You'll need to replace this with a valid sysadmin token
    const token = 'YOUR_SYSADMIN_TOKEN_HERE';
    
    if (token === 'YOUR_SYSADMIN_TOKEN_HERE') {
      console.log('❌ Please replace YOUR_SYSADMIN_TOKEN_HERE with a valid sysadmin token');
      console.log('💡 Get a token by logging into the SYSADMIN portal');
      return;
    }
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Test 1: Get all configurations
    console.log('📋 Test 1: Getting all configurations...');
    try {
      const response = await axios.get('http://localhost:3001/api/v1/sysadmin/configurations', { headers });
      console.log('✅ All configurations retrieved successfully');
      console.log(`   Found ${Object.keys(response.data.data).length} categories`);
      Object.keys(response.data.data).forEach(category => {
        console.log(`   - ${category}: ${response.data.data[category].length} settings`);
      });
    } catch (error) {
      console.log('❌ Failed to get configurations:', error.response?.data?.message || error.message);
    }
    
    // Test 2: Get configuration categories
    console.log('\n📋 Test 2: Getting configuration categories...');
    try {
      const response = await axios.get('http://localhost:3001/api/v1/sysadmin/configurations/categories', { headers });
      console.log('✅ Categories retrieved successfully');
      console.log('   Categories:', response.data.data.join(', '));
    } catch (error) {
      console.log('❌ Failed to get categories:', error.response?.data?.message || error.message);
    }
    
    // Test 3: Get invoice due days
    console.log('\n📋 Test 3: Getting invoice due days...');
    try {
      const response = await axios.get('http://localhost:3001/api/v1/sysadmin/configurations/invoice/due-days', { headers });
      console.log('✅ Invoice due days retrieved successfully');
      console.log(`   Due days: ${response.data.data.dueDays} days`);
    } catch (error) {
      console.log('❌ Failed to get invoice due days:', error.response?.data?.message || error.message);
    }
    
    // Test 4: Get late fee percentage
    console.log('\n📋 Test 4: Getting late fee percentage...');
    try {
      const response = await axios.get('http://localhost:3001/api/v1/sysadmin/configurations/invoice/late-fee', { headers });
      console.log('✅ Late fee percentage retrieved successfully');
      console.log(`   Late fee: ${response.data.data.lateFeePercent}%`);
    } catch (error) {
      console.log('❌ Failed to get late fee percentage:', error.response?.data?.message || error.message);
    }
    
    // Test 5: Update a configuration (invoice due days)
    console.log('\n📋 Test 5: Updating invoice due days to 45...');
    try {
      const response = await axios.put(
        'http://localhost:3001/api/v1/sysadmin/configurations/invoice_due_days',
        { value: '45' },
        { headers }
      );
      console.log('✅ Invoice due days updated successfully');
      console.log(`   New value: ${response.data.data.config_value}`);
    } catch (error) {
      console.log('❌ Failed to update invoice due days:', error.response?.data?.message || error.message);
    }
    
    // Test 6: Verify the update
    console.log('\n📋 Test 6: Verifying the update...');
    try {
      const response = await axios.get('http://localhost:3001/api/v1/sysadmin/configurations/invoice/due-days', { headers });
      console.log('✅ Invoice due days verification successful');
      console.log(`   Current due days: ${response.data.data.dueDays} days`);
    } catch (error) {
      console.log('❌ Failed to verify update:', error.response?.data?.message || error.message);
    }
    
    console.log('\n🎉 SYSADMIN API testing completed!');
    
  } catch (error) {
    console.error('❌ Error testing SYSADMIN API:', error.response?.data || error.message);
  }
}

// Instructions
console.log('🚀 SYSADMIN API Test Script');
console.log('================================');
console.log('This script tests the new SYSADMIN configuration API:');
console.log('1. Get all configurations');
console.log('2. Get configuration categories');
console.log('3. Get invoice due days');
console.log('4. Get late fee percentage');
console.log('5. Update a configuration');
console.log('6. Verify the update');
console.log('================================\n');

testSysadminAPI(); 