import('./src/services/emailService.ts').then(async (emailModule) => {
  const emailService = emailModule.emailService;
  
  console.log('📧 Sending test emails to Mike and Iffat...\n');
  
  try {
    // Test email to Mike
    console.log('1. Sending test email to Mike...');
    const mikeResult = await emailService.sendCourseAssignedNotification('mike_todo@yahoo.com', {
      courseName: 'CPR Basic Test',
      date: '2025-07-15',
      startTime: '09:00',
      endTime: '17:00',
      location: 'Markham',
      organization: 'Iffat College',
      students: 8
    });
    console.log('✅ Test email sent to Mike:', mikeResult);
    
    // Test email to Iffat
    console.log('\n2. Sending test email to Iffat...');
    const iffatResult = await emailService.sendCourseScheduledToOrganization('iffat@example.com', {
      courseName: 'CPR Basic Test',
      date: '2025-07-15',
      startTime: '09:00',
      endTime: '17:00',
      location: 'Markham',
      instructorName: 'Mike Instructor',
      students: 8
    });
    console.log('✅ Test email sent to Iffat:', iffatResult);
    
    console.log('\n🎉 Both test emails sent successfully!');
    console.log('📧 Check the console above for email logs.');
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
  }
}).catch(error => {
  console.error('❌ Failed to load email service:', error);
}); 