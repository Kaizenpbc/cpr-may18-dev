const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('=== Simple Email Test ===');
console.log('Testing Gmail SMTP directly...\n');

// Check SMTP configuration
console.log('📧 Email Configuration:');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_FROM:', process.env.SMTP_FROM);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***SET***' : 'NOT SET');
console.log('');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function testEmail() {
  try {
    console.log('🔧 Testing Gmail connection...');
    
    // Verify connection
    await transporter.verify();
    console.log('✅ Gmail connection successful!');
    
    // Send test email
    console.log('📧 Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: 'mike_todo@yahoo.com',
      subject: 'CPR Training System - Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">CPR Training System - Test Email</h2>
          <p>This is a test email to verify that the email service is working correctly.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Test Details:</strong></p>
            <p>Date: ${new Date().toLocaleString()}</p>
            <p>SMTP Host: ${process.env.SMTP_HOST}</p>
            <p>From: ${process.env.SMTP_FROM}</p>
          </div>
          <p style="color: #6c757d; font-size: 0.9em;">This is a test email, please do not reply.</p>
        </div>
      `
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 Authentication Error - This usually means:');
      console.log('1. Gmail requires App Password instead of regular password');
      console.log('2. 2-Step Verification needs to be enabled');
      console.log('3. App Password needs to be generated');
      console.log('\n💡 Solution:');
      console.log('1. Go to https://myaccount.google.com/security');
      console.log('2. Enable 2-Step Verification');
      console.log('3. Generate App Password for "Mail"');
      console.log('4. Update SMTP_PASS in .env file');
    }
  }
}

testEmail(); 