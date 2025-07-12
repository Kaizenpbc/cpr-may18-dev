const axios = require('axios');

async function sendTestEmails() {
  console.log('📧 Sending test emails to Mike and Iffat...\n');

  try {
    // Login as admin
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'admin',
      password: 'gtacpr'
    });

    const token = loginResponse.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };

    console.log('✅ Admin login successful');

    // Send test email to Mike
    console.log('\n📧 Sending test email to Mike...');
    const mikeResponse = await axios.post('http://localhost:3001/api/v1/email-templates/test', {
      to: 'mike_todo@yahoo.com',
      subject: 'Test Email - Course Assignment',
      body: 'This is a test email for Mike. Course assignment notifications are working!'
    }, { headers });

    console.log('✅ Test email sent to Mike');

    // Send test email to Iffat
    console.log('\n📧 Sending test email to Iffat...');
    const iffatResponse = await axios.post('http://localhost:3001/api/v1/email-templates/test', {
      to: 'iffat@example.com',
      subject: 'Test Email - Course Confirmation',
      body: 'This is a test email for Iffat. Course confirmation notifications are working!'
    }, { headers });

    console.log('✅ Test email sent to Iffat');

    console.log('\n🎉 Both test emails sent successfully!');
    console.log('📧 Check the backend console for email logs.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.error || error.message);
  }
}

sendTestEmails(); 