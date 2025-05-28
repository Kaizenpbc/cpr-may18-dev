import { emailService } from '../services/emailService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testEmailService() {
  try {
    console.log('Testing email service...');

    // Verify connection
    const isConnected = await emailService.verifyConnection();
    if (!isConnected) {
      console.error('Failed to connect to email service');
      return;
    }

    // Test email address
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';

    // Test availability confirmation
    console.log('Testing availability confirmation email...');
    const date = new Date().toISOString().split('T')[0];
    await emailService.sendAvailabilityConfirmation(testEmail, date);

    // Test class scheduled notification
    console.log('Testing class scheduled notification...');
    const classDetails = {
      date: date,
      startTime: '09:00',
      endTime: '12:00',
      location: '123 Main St',
      organization: 'Test Organization',
      courseType: 'Basic CPR',
      students: 10
    };
    await emailService.sendClassScheduledNotification(testEmail, classDetails);

    // Test class reminder
    console.log('Testing class reminder email...');
    await emailService.sendClassReminder(testEmail, classDetails);

    console.log('All email tests completed!');
  } catch (error) {
    console.error('Error testing email service:', error);
  }
}

// Run the test
testEmailService(); 