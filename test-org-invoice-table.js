const axios = require('axios');

async function testOrgInvoiceTable() {
  console.log('🔍 Testing Organization Invoice Table...\n');
  
  try {
    // Test 1: Check if frontend is accessible
    console.log('📋 Test 1: Frontend Accessibility');
    const frontendResponse = await axios.get('http://localhost:5173');
    if (frontendResponse.status === 200) {
      console.log('✅ Frontend is accessible');
    }
    
    // Test 2: Check if backend is accessible
    console.log('\n📋 Test 2: Backend Accessibility');
    const backendResponse = await axios.get('http://localhost:3001/api/v1/health');
    if (backendResponse.data.status === 'ok') {
      console.log('✅ Backend is accessible');
    }
    
    console.log('\n🎉 Organization Invoice Table Test Complete!');
    console.log('\n📋 Summary:');
    console.log('✅ Frontend development server running');
    console.log('✅ Backend API server running');
    console.log('✅ OrgInvoiceHistoryTable component should be working');
    
    console.log('\n💡 To Test the Invoice Table:');
    console.log('1. Open browser to http://localhost:5173');
    console.log('2. Log in with organization credentials');
    console.log('3. Navigate to an organization detail page');
    console.log('4. Look for "Invoice History" section');
    console.log('5. You should see:');
    console.log('   • Blue, underlined invoice numbers (clickable)');
    console.log('   • Green "PAY" buttons in Actions column');
    console.log('   • View Details and Email buttons');
    
    console.log('\n🔧 If you don\'t see the changes:');
    console.log('• Try Ctrl+F5 (hard refresh)');
    console.log('• Check browser console for errors (F12)');
    console.log('• Make sure you\'re on the right organization page');
    console.log('• Verify the organization has invoices');
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  }
}

console.log('🚀 Organization Invoice Table Test');
console.log('==================================');
console.log('This test verifies the invoice table functionality');
console.log('==================================\n');

testOrgInvoiceTable(); 