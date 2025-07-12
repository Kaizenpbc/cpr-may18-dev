const axios = require('axios');

async function testInvoiceEmail() {
  try {
    console.log('🔍 Testing invoice email functionality...');
    
    // Test 1: Check if we can get invoices
    console.log('\n📋 Step 1: Getting invoices...');
    const invoicesResponse = await axios.get('http://localhost:3001/api/v1/accounting/invoices', {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE', // Replace with actual token
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Found ${invoicesResponse.data.data.length} invoices`);
    
    // Find an unposted invoice
    const unpostedInvoice = invoicesResponse.data.data.find(invoice => !invoice.posted_to_org);
    
    if (!unpostedInvoice) {
      console.log('❌ No unposted invoices found. All invoices are already posted.');
      return;
    }
    
    console.log(`\n📄 Found unposted invoice: ${unpostedInvoice.invoicenumber}`);
    console.log(`📧 Organization email: ${unpostedInvoice.contactemail}`);
    console.log(`🏢 Organization: ${unpostedInvoice.organizationname}`);
    
    // Test 2: Post the invoice (this should trigger email)
    console.log('\n📤 Step 2: Posting invoice to organization...');
    
    const postResponse = await axios.put(
      `http://localhost:3001/api/v1/accounting/invoices/${unpostedInvoice.invoiceid}/post-to-org`,
      {},
      {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE', // Replace with actual token
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Post response:', postResponse.data);
    
    if (postResponse.data.success) {
      console.log('🎉 Invoice posted successfully!');
      console.log(`📧 Email should have been sent to: ${unpostedInvoice.contactemail}`);
      
      // Check if email_sent_at was updated
      if (postResponse.data.data.emailSent) {
        console.log('✅ Email sent flag is true');
      } else {
        console.log('⚠️ Email sent flag is false - check backend logs');
      }
    }
    
    // Test 3: Check the updated invoice
    console.log('\n📋 Step 3: Checking updated invoice...');
    const updatedInvoicesResponse = await axios.get('http://localhost:3001/api/v1/accounting/invoices', {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE', // Replace with actual token
        'Content-Type': 'application/json'
      }
    });
    
    const updatedInvoice = updatedInvoicesResponse.data.data.find(
      inv => inv.invoiceid === unpostedInvoice.invoiceid
    );
    
    if (updatedInvoice) {
      console.log(`📊 Invoice status: posted_to_org = ${updatedInvoice.posted_to_org}`);
      console.log(`📧 Email sent at: ${updatedInvoice.emailsentat || 'Not set'}`);
    }
    
    console.log('\n🔍 Check the backend console logs for email sending details...');
    console.log('📧 Look for lines like: "📧 [POST TO ORG] Invoice notification sent to..."');
    
  } catch (error) {
    console.error('❌ Error testing invoice email:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 You need to replace "YOUR_TOKEN_HERE" with a valid authentication token');
      console.log('💡 Get a token by logging into the accounting portal');
    }
  }
}

// Instructions for running the test
console.log('🚀 Invoice Email Test Script');
console.log('================================');
console.log('Before running this script:');
console.log('1. Make sure the backend is running (npm run dev:backend)');
console.log('2. Replace "YOUR_TOKEN_HERE" with a valid authentication token');
console.log('3. Check the backend console for email logs');
console.log('================================\n');

testInvoiceEmail(); 