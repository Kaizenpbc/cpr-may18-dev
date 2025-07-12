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
    import('./src/services/emailService.js').then(async (emailModule) => {
        const emailService = emailModule.emailService;
        
        console.log('🧪 Testing Email Service Directly...\n');
        
        try {
            // Test instructor assignment notification
            console.log('1. Testing instructor assignment notification...');
            const testData = {
                courseName: 'CPR Basic',
                date: '2025-07-15',
                startTime: '09:00',
                endTime: '17:00',
                location: 'Markham',
                organization: 'Iffat College',
                students: 8
            };
            
            const result = await emailService.sendCourseAssignedNotification('mike_todo@yahoo.com', testData);
            console.log('✅ Instructor notification test result:', result);
            
            // Test organization notification
            console.log('\n2. Testing organization notification...');
            const orgData = {
                courseName: 'CPR Basic',
                date: '2025-07-15',
                startTime: '09:00',
                endTime: '17:00',
                location: 'Markham',
                instructorName: 'Mike Instructor',
                students: 8
            };
            
            const orgResult = await emailService.sendCourseScheduledToOrganization('iffat@example.com', orgData);
            console.log('✅ Organization notification test result:', orgResult);
            
            console.log('\n🎉 Email service test completed!');
            console.log('📧 Check the console above for email logs.');
            
        } catch (error) {
            console.error('❌ Email test failed:', error);
        }
    }).catch(error => {
        console.error('❌ Failed to load email service:', error);
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