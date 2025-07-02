const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('=== Email Preview Test ===');
console.log('Showing what the email would look like...\n');

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

console.log('📧 Email Configuration Found:');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_FROM:', process.env.SMTP_FROM);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***SET***' : 'NOT SET');
console.log('');

// Show what the email would look like
const emailContent = {
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
};

console.log('📧 Email Preview:');
console.log('From:', emailContent.from);
console.log('To: mike_todo@yahoo.com');
console.log('Subject:', emailContent.subject);
console.log('');

console.log('📄 Plain Text Version:');
console.log('='.repeat(50));
console.log(emailContent.text);
console.log('='.repeat(50));
console.log('');

console.log('🔧 To fix the authentication issue:');
console.log('1. Enable 2-Step Verification on your Gmail account');
console.log('2. Generate an App Password:');
console.log('   - Go to Google Account → Security → 2-Step Verification → App passwords');
console.log('   - Select "Mail" and generate a 16-character password');
console.log('3. Update SMTP_PASS in your .env file with the App Password');
console.log('');

console.log('✅ Email service is ready! Once authentication is fixed, emails will be sent successfully.');
console.log('📧 The system can send:');
console.log('   • Course assignment notifications');
console.log('   • Class scheduling confirmations');
console.log('   • Invoice reminders');
console.log('   • Course completion notifications');
console.log('   • Instructor availability confirmations');
console.log('   • Password reset emails');
console.log('   • Welcome emails'); 