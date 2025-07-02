INSERT INTO email_templates (
  name, key, category, subject, body, is_active, is_system
) VALUES (
  'Organization Assignment',
  'course_scheduled_organization',
  'Course',
  'Course Request Confirmed',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h2 style="color: #007bff;">Course Request Confirmed</h2><p>Your course request has been confirmed and an instructor has been assigned:</p><div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;"><p><strong>Course Name:</strong> {{courseName}}</p><p><strong>Date:</strong> {{date}}</p><p><strong>Time:</strong> {{startTime}} - {{endTime}}</p><p><strong>Location:</strong> {{location}}</p><p><strong>Instructor:</strong> {{instructorName}}</p><p><strong>Number of Students:</strong> {{students}}</p></div><p>You can view the full details and manage your courses through your organization portal.</p><p style="color: #6c757d; font-size: 0.9em;">Thank you for being part of GTA CPR. This is an automated message, please do not reply. For any assistance, please email admin@gtacpr.com or call (647) 588-8872.</p></div>',
  true,
  true
); 