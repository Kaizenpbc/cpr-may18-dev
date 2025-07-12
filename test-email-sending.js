const axios = require('axios');

async function testEmailSending() {
  try {
    console.log('🔍 Testing email sending functionality...');
    
    // First, let's check what organizations have contact emails
    console.log('\n📋 Step 1: Checking organizations with contact emails...');
    
    const orgsResponse = await axios.get('http://localhost:3001/api/v1/accounting/organizations', {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE', // Replace with actual token
        'Content-Type': 'application/json'
      }
    });
    
    const orgsWithEmails = orgsResponse.data.data.filter(org => org.contactemail);
    console.log(`✅ Found ${orgsWithEmails.length} organizations with contact emails:`);
    
    orgsWithEmails.forEach(org => {
      console.log(`   - ${org.name}: ${org.contactemail}`);
    });
    
    if (orgsWithEmails.length === 0) {
      console.log('❌ No organizations have contact emails! This is why emails aren\'t being sent.');
      return;
    }
    
    // Check for unposted invoices
    console.log('\n📋 Step 2: Checking for unposted invoices...');
    
    const invoicesResponse = await axios.get('http://localhost:3001/api/v1/accounting/invoices', {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE', // Replace with actual token
        'Content-Type': 'application/json'
      }
    });
    
    const unpostedInvoices = invoicesResponse.data.data.filter(inv => !inv.posted_to_org);
    console.log(`✅ Found ${unpostedInvoices.length} unposted invoices`);
    
    if (unpostedInvoices.length === 0) {
      console.log('❌ No unposted invoices found. All invoices are already posted.');
      console.log('💡 To test email sending, you need to create a new invoice first.');
      return;
    }
    
    // Show unposted invoices with their organization emails
    console.log('\n📄 Unposted invoices:');
    unpostedInvoices.forEach(inv => {
      console.log(`   - Invoice ${inv.invoicenumber}: ${inv.organizationname} (${inv.contactemail || 'No email'})`);
    });
    
    // Find an invoice with a valid email
    const invoiceWithEmail = unpostedInvoices.find(inv => inv.contactemail);
    
    if (!invoiceWithEmail) {
      console.log('❌ No unposted invoices have organizations with contact emails!');
      console.log('💡 You need to add contact emails to organizations first.');
      return;
    }
    
    console.log(`\n🎯 Selected invoice for testing: ${invoiceWithEmail.invoicenumber}`);
    console.log(`📧 Will send email to: ${invoiceWithEmail.contactemail}`);
    
    // Test posting the invoice (this should trigger email)
    console.log('\n📤 Step 3: Posting invoice to trigger email...');
    
    const postResponse = await axios.put(
      `http://localhost:3001/api/v1/accounting/invoices/${invoiceWithEmail.invoiceid}/post-to-org`,
      {},
      {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE', // Replace with actual token
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (postResponse.data.success) {
      console.log('✅ Invoice posted successfully!');
      console.log(`📧 Email should have been sent to: ${invoiceWithEmail.contactemail}`);
      console.log('\n🔍 Check the following:');
      console.log('   1. Backend console logs for email sending details');
      console.log('   2. Your email inbox (and spam/junk folder)');
      console.log('   3. The email address: ' + invoiceWithEmail.contactemail);
      
      // Check if email_sent_at was updated
      if (postResponse.data.data.emailSent) {
        console.log('✅ Email sent flag is true');
      } else {
        console.log('⚠️ Email sent flag is false - check backend logs');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing email sending:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 You need to replace "YOUR_TOKEN_HERE" with a valid authentication token');
      console.log('💡 Get a token by logging into the accounting portal');
    }
  }
}

// Instructions
console.log('🚀 Email Sending Test Script');
console.log('================================');
console.log('This script will help identify why emails aren\'t being received:');
console.log('1. Check if organizations have contact emails');
console.log('2. Check if there are unposted invoices');
console.log('3. Test posting an invoice to trigger email');
console.log('4. Provide debugging information');
console.log('================================\n');

testEmailSending(); 