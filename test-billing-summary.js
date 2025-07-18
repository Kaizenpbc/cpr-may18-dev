const axios = require('axios');

async function testBillingSummary() {
  try {
    console.log('🔐 Logging in...');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'iffat',
      password: 'test123'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');
    
    // Get billing summary
    console.log('📊 Getting billing summary...');
    const billingResponse = await axios.get('http://localhost:3001/api/v1/organization/billing-summary', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Billing summary response:');
    console.log(JSON.stringify(billingResponse.data, null, 2));
    
    // Check chart data
    const data = billingResponse.data.data;
    const chartData = [
      { name: 'Paid', value: data.paid_invoices || 0, color: '#4caf50' },
      { name: 'Pending', value: data.pending_invoices || 0, color: '#ff9800' },
      { name: 'Overdue', value: data.overdue_invoices || 0, color: '#f44336' },
      { name: 'Payment Submitted', value: data.payment_submitted || 0, color: '#2196f3' },
    ].filter(item => item.value > 0);
    
    console.log('\n📈 Chart data:');
    console.log(chartData);
    
    if (chartData.length === 0) {
      console.log('⚠️ No data for chart - all values are 0');
    } else {
      console.log('✅ Chart should display data');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testBillingSummary(); 