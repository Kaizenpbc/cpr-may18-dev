const nodemailer = require('nodemailer');
require('dotenv').config();

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
const transporter = nodemailer.createTransporter({
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
        console.log('To: mike_todo@yahoo.com');
        console.log('SMTP Host:', process.env.SMTP_HOST);
        
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: 'mike_todo@yahoo.com',
            subject: 'CPR Training System - Email Test',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #007bff;">Email Test Successful!</h2>
                    <p>Your email configuration is working correctly.</p>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <h3>Test Details:</h3>
                        <p><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</p>
                        <p><strong>From Address:</strong> ${process.env.SMTP_FROM}</p>
                        <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
                        <p><strong>System:</strong> CPR Training Management System</p>
                    </div>
                    
                    <p>This email confirms that the email functionality in your CPR Training System is properly configured and working.</p>
                    
                    <div style="margin: 20px 0; padding: 15px; background-color: #e3f2fd; border-radius: 5px;">
                        <p style="margin: 0;"><strong>Available Email Features:</strong></p>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            <li>Course assignment notifications</li>
                            <li>Class scheduling confirmations</li>
                            <li>Invoice reminders</li>
                            <li>Course completion notifications</li>
                            <li>Instructor availability confirmations</li>
                        </ul>
                    </div>
                    
                    <p style="color: #6c757d; font-size: 0.9em;">
                        This is an automated test message from the CPR Training System.
                    </p>
                </div>
            `,
            text: `
Email Test Successful!

Your email configuration is working correctly.

Test Details:
- SMTP Host: ${process.env.SMTP_HOST}
- From Address: ${process.env.SMTP_FROM}
- Test Time: ${new Date().toLocaleString()}
- System: CPR Training Management System

This email confirms that the email functionality in your CPR Training System is properly configured and working.

Available Email Features:
- Course assignment notifications
- Class scheduling confirmations
- Invoice reminders
- Course completion notifications
- Instructor availability confirmations

This is an automated test message from the CPR Training System.
            `
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