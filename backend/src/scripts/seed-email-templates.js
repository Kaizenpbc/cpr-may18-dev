const { Pool } = require('pg');
const chalk = require('chalk');
require('dotenv').config();

const defaultTemplates = [
    {
        name: 'Instructor Course Assignment',
        key: 'INSTRUCTOR_COURSE_ASSIGNMENT',
        subject: 'New Course Assignment - {{courseType}}',
        body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #007bff;">New Course Assignment</h2>
                <p>Dear {{instructorName}},</p>
                <p>You have been assigned to teach a new course:</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p><strong>Course Type:</strong> {{courseType}}</p>
                    <p><strong>Date:</strong> {{courseDate}}</p>
                    <p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
                    <p><strong>Location:</strong> {{location}}</p>
                    <p><strong>Organization:</strong> {{organization}}</p>
                    <p><strong>Number of Students:</strong> {{students}}</p>
                </div>
                <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
                    <p style="margin: 0;"><strong>Important:</strong> Please review these details in your instructor portal and arrive 15 minutes before the class start time.</p>
                </div>
                <p>Best regards,<br>{{appName}} Team</p>
                <hr style="margin: 20px 0;">
                <p style="color: #6c757d; font-size: 0.9em;">This is an automated message from {{appName}}. Please do not reply to this email.</p>
            </div>
        `,
        category: 'course',
        is_active: true,
        is_system: true
    },
    {
        name: 'Organization Course Confirmation',
        key: 'ORGANIZATION_COURSE_CONFIRMATION',
        subject: 'Course Request Confirmed - {{courseType}}',
        body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #007bff;">Course Request Confirmed</h2>
                <p>Dear {{organizationContact}},</p>
                <p>Your course request has been confirmed and an instructor has been assigned:</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p><strong>Course Type:</strong> {{courseType}}</p>
                    <p><strong>Date:</strong> {{courseDate}}</p>
                    <p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
                    <p><strong>Location:</strong> {{location}}</p>
                    <p><strong>Instructor:</strong> {{instructorName}}</p>
                    <p><strong>Number of Students:</strong> {{students}}</p>
                </div>
                <p>You can view the full details and manage your courses through your organization portal.</p>
                <p>If you need to make any changes, please contact us as soon as possible.</p>
                <p>Best regards,<br>{{appName}} Team</p>
                <hr style="margin: 20px 0;">
                <p style="color: #6c757d; font-size: 0.9em;">This is an automated message from {{appName}}. For support, contact {{supportEmail}}.</p>
            </div>
        `,
        category: 'course',
        is_active: true,
        is_system: true
    },
    {
        name: 'Course Reminder - Instructor',
        key: 'COURSE_REMINDER_INSTRUCTOR',
        subject: 'Reminder: {{courseType}} Tomorrow',
        body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #007bff;">Course Reminder</h2>
                <p>Dear {{instructorName}},</p>
                <p>This is a reminder that you have a course scheduled for tomorrow:</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p><strong>Course Type:</strong> {{courseType}}</p>
                    <p><strong>Date:</strong> {{courseDate}}</p>
                    <p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
                    <p><strong>Location:</strong> {{location}}</p>
                    <p><strong>Organization:</strong> {{organization}}</p>
                    <p><strong>Number of Students:</strong> {{students}}</p>
                </div>
                <div style="margin: 20px 0; padding: 15px; background-color: #d4edda; border-radius: 5px;">
                    <p style="margin: 0;"><strong>Checklist:</strong></p>
                    <ul style="margin: 10px 0;">
                        <li>Review course materials</li>
                        <li>Confirm equipment availability</li>
                        <li>Arrive 15 minutes early</li>
                        <li>Bring instructor certification</li>
                    </ul>
                </div>
                <p>Good luck with your class!</p>
                <p>Best regards,<br>{{appName}} Team</p>
            </div>
        `,
        category: 'reminder',
        is_active: true,
        is_system: true
    },
    {
        name: 'Password Reset Request',
        key: 'PASSWORD_RESET',
        subject: 'Password Reset Request - {{appName}}',
        body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #007bff;">Password Reset Request</h2>
                <p>Dear {{firstName}},</p>
                <p>We received a request to reset your password for your {{appName}} account.</p>
                <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px; text-align: center;">
                    <p>Click the button below to reset your password:</p>
                    <a href="{{resetLink}}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #007bff;">{{resetLink}}</p>
                <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
                    <p style="margin: 0;"><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
                </div>
                <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
                <p>Best regards,<br>{{appName}} Team</p>
            </div>
        `,
        category: 'system',
        is_active: true,
        is_system: true
    },
    {
        name: 'Welcome Email',
        key: 'WELCOME_EMAIL',
        subject: 'Welcome to {{appName}}!',
        body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #007bff;">Welcome to {{appName}}!</h2>
                <p>Dear {{firstName}},</p>
                <p>Thank you for joining {{appName}}. Your account has been successfully created.</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p><strong>Account Details:</strong></p>
                    <p>Email: {{email}}</p>
                    <p>Role: {{role}}</p>
                </div>
                <div style="margin: 20px 0;">
                    <h3>Getting Started:</h3>
                    <ol>
                        <li>Log in to your account at <a href="{{appUrl}}">{{appUrl}}</a></li>
                        <li>Complete your profile information</li>
                        <li>Explore the features available in your portal</li>
                        <li>Contact support if you need any assistance</li>
                    </ol>
                </div>
                <p>If you have any questions, don't hesitate to reach out to our support team at {{supportEmail}}.</p>
                <p>We're excited to have you on board!</p>
                <p>Best regards,<br>{{appName}} Team</p>
            </div>
        `,
        category: 'notification',
        is_active: true,
        is_system: false
    }
];

async function seedEmailTemplates(forceUpdate = false) {
    const pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'gtacpr',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'cpr_may18'
    });

    const client = await pool.connect();

    try {
        // Start transaction
        await client.query('BEGIN');

        console.log(chalk.blue('🔄 Starting email templates seeding process...'));

        // Track progress
        let created = 0;
        let updated = 0;
        let skipped = 0;
        const total = defaultTemplates.length;

        // Insert or update each template
        for (const [index, template] of defaultTemplates.entries()) {
            process.stdout.write(chalk.yellow(`\r🔄 Processing template ${index + 1}/${total}: ${template.name}`));

            const result = await client.query(
                'SELECT id FROM email_templates WHERE key = $1',
                [template.key]
            );

            if (result.rows.length === 0) {
                // Insert new template
                try {
                    await client.query(`
                        INSERT INTO email_templates (
                            name, key, subject, body, category,
                            is_active, is_system
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    `, [
                        template.name,
                        template.key,
                        template.subject,
                        template.body,
                        template.category,
                        template.is_active,
                        template.is_system
                    ]);
                    created++;
                } catch (insertError) {
                    console.error('\nError inserting template:', template.name);
                    console.error('Error details:', insertError);
                    throw insertError;
                }
            } else if (forceUpdate) {
                // Update existing template if force update is enabled
                await client.query(`
                    UPDATE email_templates 
                    SET name = $1, subject = $2, body = $3, 
                        category = $4, is_active = $5, is_system = $6,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE key = $7
                `, [
                    template.name,
                    template.subject,
                    template.body,
                    template.category,
                    template.is_active,
                    template.is_system,
                    template.key
                ]);
                updated++;
            } else {
                skipped++;
            }
        }

        // Commit transaction
        await client.query('COMMIT');

        // Clear progress line
        process.stdout.write('\r' + ' '.repeat(100) + '\r');

        // Print summary
        console.log(chalk.green('\n✅ Email templates seeding completed successfully!'));
        console.log(chalk.blue('📊 Summary:'));
        console.log(chalk.white(`   • Created: ${created}`));
        console.log(chalk.white(`   • Updated: ${updated}`));
        console.log(chalk.white(`   • Skipped: ${skipped}`));
        console.log(chalk.white(`   • Total processed: ${total}`));

    } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        console.error(chalk.red('\n❌ Error seeding email templates:'));
        console.error(chalk.red(error.message));
        console.error(chalk.gray(error.stack));
        process.exit(1);
    } finally {
        // Release client back to pool
        client.release();
        await pool.end();
        process.exit(0);
    }
}

// Check if --force flag is provided
const forceUpdate = process.argv.includes('--force');
if (forceUpdate) {
    console.log(chalk.yellow('⚠️  Force update mode enabled - existing templates will be updated'));
}

seedEmailTemplates(forceUpdate); 