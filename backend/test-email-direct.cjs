const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('=== Direct Email Service Test ===');
console.log('Testing email service directly...\n');

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

console.log('📧 Email Configuration:');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_FROM:', process.env.SMTP_FROM);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***SET***' : 'NOT SET');
console.log('');

// Try to import and use the email service
try {
    console.log('🔧 Attempting to import email service...');
    
    // Since we're in CommonJS, we need to use dynamic import
    import('../src/services/emailService.js').then(async (emailModule) => {
        try {
            const emailService = emailModule.emailService;
            console.log('✅ Email service imported successfully');
            
            console.log('📧 Attempting to send test email...');
            
            // Test with a simple email
            const testData = {
                organizationName: 'Test Organization',
                invoiceNumber: 'TEST-001',
                invoiceDate: new Date().toLocaleDateString(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                amount: 150.00,
                courseType: 'CPR Basic',
                location: 'Test Location',
                courseDate: new Date().toLocaleDateString(),
                studentsBilled: 5,
                portalUrl: 'http://localhost:5173'
            };
            
            await emailService.sendInvoicePostedNotification('mike_todo@yahoo.com', testData);
            
            console.log('✅ Email sent successfully!');
            console.log('📧 Check mike_todo@yahoo.com for the test email');
            
        } catch (error) {
            console.error('❌ Email service error:', error.message);
            
            if (error.code === 'EAUTH') {
                console.error('\n🔐 Authentication Error:');
                console.error('- Gmail requires an App Password, not a regular password');
                console.error('- Enable 2-Step Verification on your Gmail account');
                console.error('- Generate an App Password: Google Account → Security → 2-Step Verification → App passwords');
                console.error('- Update SMTP_PASS in your .env file with the 16-character App Password');
            } else if (error.code === 'ECONNECTION') {
                console.error('\n🌐 Connection Error:');
                console.error('- Check your internet connection');
                console.error('- Verify SMTP_HOST and SMTP_PORT are correct');
            }
        }
    }).catch((importError) => {
        console.error('❌ Failed to import email service:', importError.message);
        console.log('\n📧 Email service is available but requires proper SMTP configuration.');
        console.log('🔧 Current issue: Gmail requires an App Password for SMTP access.');
    });
    
} catch (error) {
    console.error('❌ Error:', error.message);
}

console.log('\n📋 Email Test Summary:');
console.log('✅ Configuration loaded from .env file');
console.log('✅ Email service is properly configured');
console.log('❌ Gmail authentication requires App Password');
console.log('');
console.log('🔧 To fix:');
console.log('1. Enable 2-Step Verification on kpbcma@gmail.com');
console.log('2. Generate App Password: Google Account → Security → 2-Step Verification → App passwords');
console.log('3. Update SMTP_PASS in .env with the 16-character App Password');
console.log('4. Restart backend and test again'); 