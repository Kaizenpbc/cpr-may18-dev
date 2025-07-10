const { Pool } = require('pg');
require('dotenv').config();

async function restoreEmailTemplates() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'cpr_jun21',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'gtacpr',
  });

  try {
    console.log('📧 Restoring email templates...\n');
    
    const client = await pool.connect();
    
    // Insert default email templates with key and category fields
    const templates = [
      {
        key: 'course_confirmation',
        name: 'course_confirmation',
        subject: 'Course Confirmation - {courseName}',
        body: 'Dear {studentName},\n\nYour course "{courseName}" has been confirmed for {courseDate} at {location}.\n\nInstructor: {instructorName}\n\nPlease arrive 15 minutes early.\n\nBest regards,\nCPR Training Team',
        category: 'system'
      },
      {
        key: 'course_cancellation',
        name: 'course_cancellation',
        subject: 'Course Cancellation - {courseName}',
        body: 'Dear {studentName},\n\nUnfortunately, your course "{courseName}" scheduled for {courseDate} has been cancelled.\n\nWe will contact you to reschedule.\n\nBest regards,\nCPR Training Team',
        category: 'system'
      },
      {
        key: 'course_reminder',
        name: 'course_reminder',
        subject: 'Course Reminder - {courseName}',
        body: 'Dear {studentName},\n\nThis is a reminder for your course "{courseName}" tomorrow at {courseTime}.\n\nLocation: {location}\nInstructor: {instructorName}\n\nPlease bring your ID.\n\nBest regards,\nCPR Training Team',
        category: 'system'
      },
      {
        key: 'password_reset',
        name: 'password_reset',
        subject: 'Password Reset Request',
        body: 'Dear {userName},\n\nYou requested a password reset. Click the link below to reset your password:\n\n{resetLink}\n\nThis link expires in 1 hour.\n\nBest regards,\nCPR Training Team',
        category: 'system'
      },
      {
        key: 'welcome_instructor',
        name: 'welcome_instructor',
        subject: 'Welcome to CPR Training System',
        body: 'Dear {instructorName},\n\nWelcome to the CPR Training System!\n\nYour account has been created successfully.\n\nUsername: {username}\n\nPlease log in and update your availability.\n\nBest regards,\nCPR Training Team',
        category: 'system'
      }
    ];
    
    for (const template of templates) {
      try {
        await client.query(
          'INSERT INTO email_templates (key, name, subject, body, category, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
          [template.key, template.name, template.subject, template.body, template.category]
        );
        console.log(`✅ Restored template: ${template.name}`);
      } catch (error) {
        if (error.message.includes('duplicate key')) {
          console.log(`⚠️  Template ${template.name} already exists (skipping)`);
        } else {
          console.log(`❌ Error restoring ${template.name}: ${error.message}`);
        }
      }
    }
    
    console.log('\n🎉 Email templates restored successfully!');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error restoring templates:', error.message);
  } finally {
    await pool.end();
  }
}

restoreEmailTemplates(); 