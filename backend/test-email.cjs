const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('=== Email Test Script ===');
console.log('Testing email configuration...');

// Check if SMTP configuration exists
if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP configuration missing!');
    console.log('Current SMTP settings:');
    console.log('SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
    console.log('SMTP_USER:', process.env.SMTP_USER || 'NOT SET');
    console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'SET' : 'NOT SET');
    console.log('SMTP_FROM:', process.env.SMTP_FROM || 'NOT SET');
    process.exit(1);
}

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

async function testEmail() {
    try {
        console.log('📧 Attempting to send test email...');
        console.log('From:', process.env.SMTP_FROM);
        console.log('To: admin@gtacpr.com');
        console.log('SMTP Host:', process.env.SMTP_HOST);
        
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: 'admin@gtacpr.com',
            subject: 'CPR Training System - Admin Test',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #007bff;">Hello Mr. CEO</h2>
                    <p>GTA Scheduling System is coming along</p>
                </div>
            `,
            text: `Hello Mr. CEO, GTA Scheduling System is coming along`
        });
        
        console.log('✅ Email sent successfully!');
        console.log('📧 Message ID:', info.messageId);
        console.log('📧 Response:', info.response);
        console.log('📧 Accepted recipients:', info.accepted);
        console.log('📧 Rejected recipients:', info.rejected);
        
    } catch (error) {
        console.error('❌ Email test failed:', error.message);
        console.error('Full error details:', error);
        
        // Provide helpful error messages
        if (error.code === 'EAUTH') {
            console.error('\n🔐 Authentication Error:');
            console.error('- Check your SMTP_USER and SMTP_PASS');
            console.error('- For Gmail, ensure you\'re using an App Password, not your regular password');
            console.error('- Make sure 2-Step Verification is enabled for Gmail');
        } else if (error.code === 'ECONNECTION') {
            console.error('\n🌐 Connection Error:');
            console.error('- Check your internet connection');
            console.error('- Verify SMTP_HOST and SMTP_PORT are correct');
            console.error('- Check if your firewall is blocking the connection');
        } else if (error.code === 'EENVELOPE') {
            console.error('\n📧 Envelope Error:');
            console.error('- Check the FROM email address');
            console.error('- Verify the TO email address is valid');
        }
    }
}

// Verify connection first
async function verifyConnection() {
    try {
        console.log('🔍 Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection verified successfully');
        return true;
    } catch (error) {
        console.error('❌ SMTP connection verification failed:', error.message);
        return false;
    }
}

// Run the test
async function runTest() {
    const connectionOk = await verifyConnection();
    if (connectionOk) {
        await testEmail();
    } else {
        console.error('❌ Cannot send email - SMTP connection failed');
    }
}

runTest(); 