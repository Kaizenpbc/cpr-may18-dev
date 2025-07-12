const axios = require('axios');

console.log('🧪 Testing email functionality after fix...');

async function testEmailFix() {
  try {
    // Test the post-to-org endpoint
    console.log('📤 Testing post-to-org endpoint...');
    
    // First, let's get a list of invoices that haven't been posted yet
    const invoicesResponse = await axios.get('http://localhost:3001/api/v1/accounting/invoices', {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE', // You'll need to replace this
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📋 Found invoices:', invoicesResponse.data.data.length);
    
    // Look for an invoice that hasn't been posted yet
    const unpostedInvoice = invoicesResponse.data.data.find(invoice => !invoice.posted_to_org);
    
    if (unpostedInvoice) {
      console.log('✅ Found unposted invoice:', unpostedInvoice.invoicenumber);
      console.log('📧 Organization email:', unpostedInvoice.contactemail);
      
      // Test posting the invoice (this should trigger email)
      console.log('📤 Posting invoice to organization...');
      
      const postResponse = await axios.put(
        `http://localhost:3001/api/v1/accounting/invoices/${unpostedInvoice.invoiceid}/post-to-org`,
        {},
        {
          headers: {
            'Authorization': 'Bearer YOUR_TOKEN_HERE', // You'll need to replace this
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Post response:', postResponse.data);
      console.log('📧 Email should have been sent to:', unpostedInvoice.contactemail);
      
    } else {
      console.log('❌ No unposted invoices found');
    }
    
  } catch (error) {
    console.error('❌ Error testing email fix:', error.response?.data || error.message);
  }
}

testEmailFix(); 