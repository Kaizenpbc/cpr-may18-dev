import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';
import { createTransport } from 'nodemailer';
import { format } from 'date-fns';
import { pool } from '../config/database.js';

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

interface ClassDetails {
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  organization?: string;
  courseName?: string;
  courseType?: string;
  students: number | string;
}

interface CourseDetails {
  courseName?: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  organization?: string;
  students: number | string;
  instructorName?: string;
}

interface InvoiceData {
  invoiceNumber: string;
  organizationName: string;
  amount: number;
  invoiceDate?: string;
  courseDate?: string;
  courseName?: string;
  courseType?: string;
  location?: string;
  studentsAttended?: number;
  studentsBilled?: number;
  totalStudents?: number;
  dueDate?: string;
  portalUrl?: string;
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
    `,
  }),

  CLASS_SCHEDULED: (classDetails: ClassDetails) => ({
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
          <p><strong>Course Name:</strong> ${classDetails.courseName}</p>
          <p><strong>Students:</strong> ${classDetails.students}</p>
        </div>
        <p>Please review these details in your instructor portal.</p>
        <p style="color: #6c757d; font-size: 0.9em;">This is an automated message, please do not reply.</p>
      </div>
    `,
  }),

  CLASS_REMINDER: (classDetails: ClassDetails) => ({
    subject: 'Class Reminder',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Class Reminder</h2>
        <p>This is a reminder for your upcoming class:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Date:</strong> ${format(new Date(classDetails.date), 'MMMM do, yyyy')}</p>
          <p><strong>Time:</strong> ${classDetails.startTime} - ${classDetails.endTime}</p>
          <p><strong>Location:</strong> ${classDetails.location}</p>
          <p><strong>Organization:</strong> ${classDetails.organization}</p>
          <p><strong>Course Name:</strong> ${classDetails.courseName}</p>
          <p><strong>Students:</strong> ${classDetails.students}</p>
        </div>
        <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
          <p style="margin: 0;"><strong>Important:</strong> Please arrive 15 minutes before the class start time.</p>
        </div>
        <p style="color: #6c757d; font-size: 0.9em;">This is an automated message, please do not reply.</p>
      </div>
    `,
  }),

  COURSE_ASSIGNED_INSTRUCTOR: (courseDetails: CourseDetails) => ({
    subject: 'New Course Assignment',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">New Course Assignment</h2>
        <p>You have been assigned to teach a new course:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Course Name:</strong> ${courseDetails.courseName}</p>
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
    `,
  }),

  COURSE_SCHEDULED_ORGANIZATION: (courseDetails: CourseDetails) => ({
    subject: 'Course Request Confirmed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Course Request Confirmed</h2>
        <p>Your course request has been confirmed and an instructor has been assigned:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Course Name:</strong> ${courseDetails.courseName}</p>
          <p><strong>Date:</strong> ${format(new Date(courseDetails.date), 'MMMM do, yyyy')}</p>
          <p><strong>Time:</strong> ${courseDetails.startTime} - ${courseDetails.endTime}</p>
          <p><strong>Location:</strong> ${courseDetails.location}</p>
          <p><strong>Instructor:</strong> ${courseDetails.instructorName}</p>
          <p><strong>Number of Students:</strong> ${courseDetails.students}</p>
        </div>
        <p>You can view the full details and manage your courses through your organization portal.</p>
        <p style="color: #6c757d; font-size: 0.9em;">This is an automated message, please do not reply.</p>
      </div>
    `,
  }),

  INVOICE_POSTED: (invoiceData: InvoiceData) => ({
    subject: `Invoice ${invoiceData.invoiceNumber} - Complete with Attendance`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Invoice Delivered</h2>
        <p>Dear ${invoiceData.organizationName},</p>
        
        <p>Your invoice has been generated and is attached to this email. This invoice includes the complete attendance list for your records.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #007bff; margin-top: 0;">Invoice Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Invoice Number:</td>
              <td style="padding: 8px 0;">${invoiceData.invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Invoice Date:</td>
              <td style="padding: 8px 0;">${invoiceData.invoiceDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Due Date:</td>
              <td style="padding: 8px 0; color: #d32f2f;">${invoiceData.dueDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Amount Due:</td>
              <td style="padding: 8px 0; font-size: 18px; color: #007bff; font-weight: bold;">$${invoiceData.amount.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h4 style="margin-top: 0; color: #1976d2;">Service Details</h4>
          <p><strong>Course Type:</strong> ${invoiceData.courseType}</p>
          <p><strong>Location:</strong> ${invoiceData.location}</p>
          <p><strong>Course Date:</strong> ${invoiceData.courseDate}</p>
          <p><strong>Students Billed:</strong> ${invoiceData.studentsBilled}</p>
        </div>

        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745;">
          <h4 style="margin-top: 0; color: #155724;">📎 What's Included</h4>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li><strong>Complete Invoice:</strong> Detailed breakdown of charges</li>
            <li><strong>Attendance List:</strong> All students with attendance status</li>
            <li><strong>Payment Instructions:</strong> Multiple payment options</li>
            <li><strong>Course Details:</strong> Date, location, and instructor information</li>
          </ul>
        </div>

        <div style="margin: 25px 0; text-align: center;">
          <a href="${invoiceData.portalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View in Portal & Pay
          </a>
        </div>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0;"><strong>Payment Information:</strong></p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Payment is due within 30 days of invoice date</li>
            <li>You can submit payment through your organization portal</li>
            <li>A 1.5% monthly service charge may be applied to overdue accounts</li>
            <li>Please reference the invoice number when making payment</li>
          </ul>
        </div>

        <p>If you have any questions about this invoice or need to verify attendance records, please contact our accounting department.</p>
        
        <p style="color: #6c757d; font-size: 0.9em; margin-top: 30px;">
          This invoice has been automatically generated and delivered. Please do not reply to this email.<br>
          For questions, contact: billing@gtacpr.com or (416) 555-0123
        </p>
      </div>
    `,
  }),
};

class EmailService {
  private transporter: nodemailer.Transporter;
  private static instance: EmailService;

  private constructor() {
    // Check if SMTP is configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.log('🔴 [EMAIL SERVICE] SMTP not configured, using mock transporter');
      console.log('📧 [EMAIL SERVICE] Emails will be logged to console instead of sent');
      
      // Create a mock transporter that logs emails
      this.transporter = {
        sendMail: async (mailOptions: SendMailOptions) => {
          console.log('📧 [EMAIL SERVICE] MOCK EMAIL SENT:');
          console.log('   From:', mailOptions.from);
          console.log('   To:', mailOptions.to);
          console.log('   Subject:', mailOptions.subject);
          const htmlContent = typeof mailOptions.html === 'string' ? mailOptions.html : '';
          console.log('   HTML Preview:', htmlContent.substring(0, 200) + '...');
          console.log('📧 [EMAIL SERVICE] Mock email logged successfully');
          return { messageId: `mock_${Date.now()}` };
        },
        verify: async () => {
          console.log('✅ [EMAIL SERVICE] Mock transporter verified');
          return true;
        }
      } as Transporter;
    } else {
      console.log('✅ [EMAIL SERVICE] SMTP configured, using real transporter');
      // Create reusable transporter object using SMTP transport
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    }
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private async sendEmail(to: string, subject: string, html: string) {
    console.log('📧 [EMAIL SERVICE] Sending email to:', to);
    console.log('📧 [EMAIL SERVICE] Subject:', subject);
    
    try {
      const mailOptions = {
        from:
          process.env.SMTP_FROM ||
          '"CPR Training System" <noreply@cprtraining.com>',
        to,
        subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ [EMAIL SERVICE] Email sent successfully to:', to);
      console.log('✅ [EMAIL SERVICE] Message ID:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ [EMAIL SERVICE] Failed to send email to:', to);
      console.error('❌ [EMAIL SERVICE] Error:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ [EMAIL SERVICE] Full error:', error);
      return false;
    }
  }

  async sendAvailabilityConfirmation(email: string, date: string) {
    const template = EMAIL_TEMPLATES.AVAILABILITY_CONFIRMATION(date);
    return this.sendEmail(email, template.subject, template.html);
  }

  async sendClassScheduledNotification(email: string, classDetails: ClassDetails) {
    const template = EMAIL_TEMPLATES.CLASS_SCHEDULED(classDetails);
    return this.sendEmail(email, template.subject, template.html);
  }

  async sendClassReminder(email: string, classDetails: ClassDetails) {
    const template = EMAIL_TEMPLATES.CLASS_REMINDER(classDetails);
    return this.sendEmail(email, template.subject, template.html);
  }

  async sendCourseAssignedNotification(
    instructorEmail: string,
    courseDetails: CourseDetails
  ) {
    const template = EMAIL_TEMPLATES.COURSE_ASSIGNED_INSTRUCTOR(courseDetails);
    return this.sendEmail(instructorEmail, template.subject, template.html);
  }

  async sendCourseScheduledToOrganization(
    organizationEmail: string,
    courseDetails: CourseDetails
  ) {
    const template =
      EMAIL_TEMPLATES.COURSE_SCHEDULED_ORGANIZATION(courseDetails);
    return this.sendEmail(organizationEmail, template.subject, template.html);
  }

  async sendInvoicePostedNotification(
    organizationEmail: string,
    invoiceData: InvoiceData
  ) {
    const template = EMAIL_TEMPLATES.INVOICE_POSTED(invoiceData);
    return this.sendEmail(organizationEmail, template.subject, template.html);
  }

  async sendInvoiceWithPDF(
    organizationEmail: string,
    invoiceData: InvoiceData,
    pdfBuffer: Buffer,
    filename: string
  ) {
    const template = EMAIL_TEMPLATES.INVOICE_POSTED(invoiceData);
    
    console.log('📧 [EMAIL SERVICE] Sending invoice PDF to:', organizationEmail);
    console.log('📧 [EMAIL SERVICE] Subject:', template.subject);
    console.log('📧 [EMAIL SERVICE] PDF filename:', filename);
    console.log('📧 [EMAIL SERVICE] PDF size:', pdfBuffer.length, 'bytes');
    
    try {
      const mailOptions = {
        from:
          process.env.SMTP_FROM ||
          '"CPR Training System" <noreply@cprtraining.com>',
        to: organizationEmail,
        subject: `Invoice ${invoiceData.invoiceNumber} - Complete with Attendance`,
        html: template.html,
        attachments: [
          {
            filename: filename,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ [EMAIL SERVICE] Invoice PDF sent successfully to:', organizationEmail);
      console.log('✅ [EMAIL SERVICE] Message ID:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ [EMAIL SERVICE] Failed to send invoice PDF to:', organizationEmail);
      console.error('❌ [EMAIL SERVICE] Error:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ [EMAIL SERVICE] Full error:', error);
      return false;
    }
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

  public async sendInvoiceReminder(
    data: InvoiceReminderData,
    recipientEmail: string
  ): Promise<boolean> {
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
        from:
          process.env.EMAIL_FROM ||
          '"CPR Training System" <noreply@cprtraining.com>',
        to: recipientEmail,
        subject: subject,
        text: textContent,
        html: htmlContent,
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log(`📧 [EMAIL] Reminder sent successfully to ${recipientEmail}`);
      console.log(`📧 [EMAIL] Message ID: ${info.messageId}`);

      // If using test account, log the preview URL
      if (!process.env.EMAIL_USER) {
        console.log(
          `📧 [EMAIL] Preview URL: ${nodemailer.getTestMessageUrl(info)}`
        );
      }

      // Log the email send event
      await this.logEmailSent(
        data.invoiceId,
        recipientEmail,
        data.daysUntilDue
      );

      return true;
    } catch (error) {
      console.error('❌ [EMAIL] Error sending reminder:', error);
      return false;
    }
  }

  private async logEmailSent(
    invoiceId: number,
    recipientEmail: string,
    daysBeforeDue: number
  ): Promise<void> {
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
      await pool.query(
        `
        INSERT INTO email_reminders (invoice_id, recipient_email, reminder_type, days_before_due)
        VALUES ($1, $2, 'invoice_due', $3)
        ON CONFLICT (invoice_id, days_before_due) DO UPDATE
        SET sent_at = CURRENT_TIMESTAMP
      `,
        [invoiceId, recipientEmail, daysBeforeDue]
      );
    } catch (error) {
      console.error('❌ [EMAIL] Error logging email:', error);
    }
  }

  public async hasReminderBeenSent(
    invoiceId: number,
    daysBeforeDue: number
  ): Promise<boolean> {
    try {
      const result = await pool.query(
        `
        SELECT COUNT(*) as count
        FROM email_reminders
        WHERE invoice_id = $1 
        AND days_before_due = $2
        AND sent_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
      `,
        [invoiceId, daysBeforeDue]
      );

      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('❌ [EMAIL] Error checking reminder status:', error);
      return false;
    }
  }

  /**
   * Send MFA verification code email
   */
  async sendMFAVerificationCode(
    userEmail: string,
    code: string,
    expiryMinutes: number
  ): Promise<void> {
    const subject = 'CPR Training System - MFA Verification Code';
    const html = `
      <h2>MFA Verification Code</h2>
      <p>Your verification code is: <strong>${code}</strong></p>
      <p>This code will expire in ${expiryMinutes} minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
    `;
    await this.sendEmail(userEmail, subject, html);
  }
}

// Export the singleton instance
export const emailService = EmailService.getInstance();
