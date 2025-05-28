import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { pool } from '../config/database';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface InvoiceReminderData {
  organizationName: string;
  invoiceNumber: string;
  dueDate: string;
  amount: number;
  daysUntilDue: number;
  invoiceId: number;
}

// Email templates
const EMAIL_TEMPLATES = {
  AVAILABILITY_CONFIRMATION: (date: string) => ({
    subject: 'Availability Update Confirmation',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Availability Update Confirmation</h2>
        <p>Your availability has been updated for: <strong>${format(new Date(date), 'MMMM do, yyyy')}</strong></p>
        <p>You can view and manage your schedule anytime through the instructor portal.</p>
        <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
          <p style="margin: 0;"><strong>Note:</strong> You will receive notifications when classes are scheduled during your available times.</p>
        </div>
        <p style="color: #6c757d; font-size: 0.9em;">This is an automated message, please do not reply.</p>
      </div>
    `
  }),

  CLASS_SCHEDULED: (classDetails: any) => ({
    subject: 'New Class Scheduled',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">New Class Scheduled</h2>
        <p>A new class has been scheduled for you:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Date:</strong> ${format(new Date(classDetails.date), 'MMMM do, yyyy')}</p>
          <p><strong>Time:</strong> ${classDetails.startTime} - ${classDetails.endTime}</p>
          <p><strong>Location:</strong> ${classDetails.location}</p>
          <p><strong>Organization:</strong> ${classDetails.organization}</p>
          <p><strong>Course Type:</strong> ${classDetails.courseType}</p>
          <p><strong>Students:</strong> ${classDetails.students}</p>
        </div>
        <p>Please review these details in your instructor portal.</p>
        <p style="color: #6c757d; font-size: 0.9em;">This is an automated message, please do not reply.</p>
      </div>
    `
  }),

  CLASS_REMINDER: (classDetails: any) => ({
    subject: 'Upcoming Class Reminder',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Upcoming Class Reminder</h2>
        <p>This is a reminder for your upcoming class tomorrow:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Date:</strong> ${format(new Date(classDetails.date), 'MMMM do, yyyy')}</p>
          <p><strong>Time:</strong> ${classDetails.startTime} - ${classDetails.endTime}</p>
          <p><strong>Location:</strong> ${classDetails.location}</p>
          <p><strong>Organization:</strong> ${classDetails.organization}</p>
          <p><strong>Course Type:</strong> ${classDetails.courseType}</p>
          <p><strong>Students:</strong> ${classDetails.students}</p>
        </div>
        <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
          <p style="margin: 0;"><strong>Remember:</strong> Please arrive 15 minutes before the class start time.</p>
        </div>
        <p style="color: #6c757d; font-size: 0.9em;">This is an automated message, please do not reply.</p>
      </div>
    `
  }),

  COURSE_ASSIGNED_INSTRUCTOR: (courseDetails: any) => ({
    subject: 'New Course Assignment',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">New Course Assignment</h2>
        <p>You have been assigned to teach a new course:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Course Type:</strong> ${courseDetails.courseType}</p>
          <p><strong>Date:</strong> ${format(new Date(courseDetails.date), 'MMMM do, yyyy')}</p>
          <p><strong>Time:</strong> ${courseDetails.startTime} - ${courseDetails.endTime}</p>
          <p><strong>Location:</strong> ${courseDetails.location}</p>
          <p><strong>Organization:</strong> ${courseDetails.organization}</p>
          <p><strong>Number of Students:</strong> ${courseDetails.students}</p>
        </div>
        <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
          <p style="margin: 0;"><strong>Important:</strong> Please review these details in your instructor portal and arrive 15 minutes before the class start time.</p>
        </div>
        <p style="color: #6c757d; font-size: 0.9em;">This is an automated message, please do not reply.</p>
      </div>
    `
  }),

  COURSE_SCHEDULED_ORGANIZATION: (courseDetails: any) => ({
    subject: 'Course Request Confirmed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Course Request Confirmed</h2>
        <p>Your course request has been confirmed and an instructor has been assigned:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Course Type:</strong> ${courseDetails.courseType}</p>
          <p><strong>Date:</strong> ${format(new Date(courseDetails.date), 'MMMM do, yyyy')}</p>
          <p><strong>Time:</strong> ${courseDetails.startTime} - ${courseDetails.endTime}</p>
          <p><strong>Location:</strong> ${courseDetails.location}</p>
          <p><strong>Instructor:</strong> ${courseDetails.instructorName}</p>
          <p><strong>Number of Students:</strong> ${courseDetails.students}</p>
        </div>
        <p>You can view the full details and manage your courses through your organization portal.</p>
        <p style="color: #6c757d; font-size: 0.9em;">This is an automated message, please do not reply.</p>
      </div>
    `
  })
};

class EmailService {
  private transporter: nodemailer.Transporter;
  private static instance: EmailService;

  private constructor() {
    // Create reusable transporter object using SMTP transport
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    });
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private async sendEmail(to: string, subject: string, html: string) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || '"CPR Training System" <noreply@cprtraining.com>',
        to,
        subject,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendAvailabilityConfirmation(email: string, date: string) {
    const template = EMAIL_TEMPLATES.AVAILABILITY_CONFIRMATION(date);
    return this.sendEmail(email, template.subject, template.html);
  }

  async sendClassScheduledNotification(email: string, classDetails: any) {
    const template = EMAIL_TEMPLATES.CLASS_SCHEDULED(classDetails);
    return this.sendEmail(email, template.subject, template.html);
  }

  async sendClassReminder(email: string, classDetails: any) {
    const template = EMAIL_TEMPLATES.CLASS_REMINDER(classDetails);
    return this.sendEmail(email, template.subject, template.html);
  }

  async sendCourseAssignedNotification(instructorEmail: string, courseDetails: any) {
    const template = EMAIL_TEMPLATES.COURSE_ASSIGNED_INSTRUCTOR(courseDetails);
    return this.sendEmail(instructorEmail, template.subject, template.html);
  }

  async sendCourseScheduledToOrganization(organizationEmail: string, courseDetails: any) {
    const template = EMAIL_TEMPLATES.COURSE_SCHEDULED_ORGANIZATION(courseDetails);
    return this.sendEmail(organizationEmail, template.subject, template.html);
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service is ready');
      return true;
    } catch (error) {
      console.error('Email service verification failed:', error);
      return false;
    }
  }

  public async sendInvoiceReminder(data: InvoiceReminderData, recipientEmail: string): Promise<boolean> {
    try {
      await this.transporter.verify();
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const subject = `Payment Reminder: Invoice ${data.invoiceNumber} Due in ${data.daysUntilDue} Days`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1976d2; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f5f5f5; padding: 20px; margin-top: 20px; }
            .invoice-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .amount { font-size: 24px; color: #1976d2; font-weight: bold; }
            .due-date { color: #d32f2f; font-weight: bold; }
            .button { display: inline-block; padding: 10px 20px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Reminder</h1>
            </div>
            <div class="content">
              <p>Dear ${data.organizationName},</p>
              
              <p>This is a friendly reminder that your invoice is due soon.</p>
              
              <div class="invoice-details">
                <h3>Invoice Details:</h3>
                <p><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>
                <p><strong>Amount Due:</strong> <span class="amount">$${data.amount.toFixed(2)}</span></p>
                <p><strong>Due Date:</strong> <span class="due-date">${data.dueDate}</span></p>
                <p><strong>Days Until Due:</strong> ${data.daysUntilDue} days</p>
              </div>
              
              <p>Please ensure payment is made by the due date to avoid any late fees or service interruptions.</p>
              
              <p>You can view and pay this invoice by logging into your account portal.</p>
              
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/organization/bills-payable" class="button">
                View Invoice
              </a>
              
              <p>If you have already made payment, please disregard this reminder.</p>
              
              <p>Thank you for your prompt attention to this matter.</p>
            </div>
            <div class="footer">
              <p>This is an automated reminder. Please do not reply to this email.</p>
              <p>For questions, please contact our accounting department.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Payment Reminder

Dear ${data.organizationName},

This is a friendly reminder that your invoice is due soon.

Invoice Details:
- Invoice Number: ${data.invoiceNumber}
- Amount Due: $${data.amount.toFixed(2)}
- Due Date: ${data.dueDate}
- Days Until Due: ${data.daysUntilDue} days

Please ensure payment is made by the due date to avoid any late fees or service interruptions.

You can view and pay this invoice by logging into your account portal at:
${process.env.FRONTEND_URL || 'http://localhost:5173'}/organization/bills-payable

If you have already made payment, please disregard this reminder.

Thank you for your prompt attention to this matter.

This is an automated reminder. For questions, please contact our accounting department.
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || '"CPR Training System" <noreply@cprtraining.com>',
        to: recipientEmail,
        subject: subject,
        text: textContent,
        html: htmlContent
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`📧 [EMAIL] Reminder sent successfully to ${recipientEmail}`);
      console.log(`📧 [EMAIL] Message ID: ${info.messageId}`);
      
      // If using test account, log the preview URL
      if (!process.env.EMAIL_USER) {
        console.log(`📧 [EMAIL] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }

      // Log the email send event
      await this.logEmailSent(data.invoiceId, recipientEmail, data.daysUntilDue);

      return true;
    } catch (error) {
      console.error('❌ [EMAIL] Error sending reminder:', error);
      return false;
    }
  }

  private async logEmailSent(invoiceId: number, recipientEmail: string, daysBeforeDue: number): Promise<void> {
    try {
      // First, ensure the email_reminders table exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS email_reminders (
          id SERIAL PRIMARY KEY,
          invoice_id INTEGER REFERENCES invoices(id),
          recipient_email VARCHAR(255),
          reminder_type VARCHAR(50),
          days_before_due INTEGER,
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(invoice_id, days_before_due)
        )
      `);

      // Log the email
      await pool.query(`
        INSERT INTO email_reminders (invoice_id, recipient_email, reminder_type, days_before_due)
        VALUES ($1, $2, 'invoice_due', $3)
        ON CONFLICT (invoice_id, days_before_due) DO UPDATE
        SET sent_at = CURRENT_TIMESTAMP
      `, [invoiceId, recipientEmail, daysBeforeDue]);
    } catch (error) {
      console.error('❌ [EMAIL] Error logging email:', error);
    }
  }

  public async hasReminderBeenSent(invoiceId: number, daysBeforeDue: number): Promise<boolean> {
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as count
        FROM email_reminders
        WHERE invoice_id = $1 
        AND days_before_due = $2
        AND sent_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
      `, [invoiceId, daysBeforeDue]);

      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('❌ [EMAIL] Error checking reminder status:', error);
      return false;
    }
  }
}

// Export the singleton instance
export const emailService = EmailService.getInstance(); 