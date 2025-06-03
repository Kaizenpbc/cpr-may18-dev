import express, { Request, Response } from 'express';
import { ApiResponseBuilder } from '../../utils/apiResponse';
import { AppError, asyncHandler } from '../../utils/errorHandler';
import { EmailTemplateService } from '../../models/EmailTemplate';
import { authorizeRoles } from '../../middleware/authMiddleware';
import { errorCodes } from '../../utils/errorHandler';
import { validateEmailTemplate } from '../../middleware/inputSanitizer';

interface EmailTemplateRequestBody {
  name: string;
  key?: string;
  category: string;
  subCategory?: string;
  subject: string;
  body: string;
  isActive?: boolean;
}

interface EmailTemplateQueryParams {
  category?: string[];
  active?: string;
  search?: string;
}

const router = express.Router();

// Get all email templates
router.get(
  '/',
  asyncHandler(
    async (
      req: Request<{}, {}, {}, EmailTemplateQueryParams>,
      res: Response
    ) => {
      console.log(
        '[EMAIL TEMPLATES] GET /api/v1/email-templates - Request received'
      );
      console.log('[EMAIL TEMPLATES] Query params:', req.query);
      console.log('[EMAIL TEMPLATES] User:', req.user);

      const { category, active, search } = req.query;

      console.log('[EMAIL TEMPLATES] Parsed params:', {
        category,
        active,
        search,
      });

      const templates = await EmailTemplateService.getAll(
        category as string | string[] | undefined, // Pass as-is, the model handles both
        active === 'true',
        search as string
      );

      console.log('[EMAIL TEMPLATES] Templates found:', templates.length);
      console.log(
        '[EMAIL TEMPLATES] Template categories:',
        templates.map(t => `${t.name}: ${t.category}`)
      );

      const response = ApiResponseBuilder.success(templates);
      console.log(
        '[EMAIL TEMPLATES] Sending response with',
        templates.length,
        'templates'
      );

      return res.json(response);
    }
  )
);

// Get single email template
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const template = await EmailTemplateService.getById(
      parseInt(req.params.id)
    );

    if (!template) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Template not found');
    }

    return res.json(ApiResponseBuilder.success(template));
  })
);

// Create email template
router.post(
  '/',
  validateEmailTemplate,
  authorizeRoles(['admin']),
  asyncHandler(
    async (req: Request<{}, {}, EmailTemplateRequestBody>, res: Response) => {
      const { name, category, subCategory, subject, body, isActive } = req.body;

      console.log('Creating email template with data:', req.body);

      const template = await EmailTemplateService.create({
        name,
        category: Array.isArray(category) ? category[0] : category, // Take first item if array, otherwise use as-is
        subCategory,
        subject,
        body,
        isActive: isActive !== undefined ? isActive : true,
        key: req.body.key || name.toUpperCase().replace(/\s+/g, '_'),
        isSystem: false,
        createdBy: parseInt(req.user?.userId || '0'),
        lastModifiedBy: parseInt(req.user?.userId || '0'),
      } as any); // Temporarily bypass type checking to fix the runtime issue

      return res.status(201).json(ApiResponseBuilder.success(template));
    }
  )
);

// Update email template
router.put(
  '/:id',
  validateEmailTemplate,
  authorizeRoles(['admin']),
  asyncHandler(
    async (
      req: Request<{ id: string }, {}, EmailTemplateRequestBody>,
      res: Response
    ) => {
      const template = await EmailTemplateService.getById(
        parseInt(req.params.id)
      );

      if (!template) {
        throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Template not found');
      }

      const { name, category, subCategory, subject, body, isActive } = req.body;

      const updatedTemplate = await EmailTemplateService.update(
        parseInt(req.params.id),
        {
          name,
          category: Array.isArray(category) ? category[0] : category, // Take first item if array, otherwise use as-is
          subCategory,
          subject,
          body,
          isActive: isActive !== undefined ? isActive : template.isActive,
          lastModifiedBy: parseInt(req.user?.userId || '0'),
        } as any
      ); // Temporarily bypass type checking to fix the runtime issue

      return res.json(ApiResponseBuilder.success(updatedTemplate));
    }
  )
);

// Delete email template
router.delete(
  '/:id',
  authorizeRoles(['admin']),
  asyncHandler(async (req: Request, res: Response) => {
    await EmailTemplateService.delete(parseInt(req.params.id));
    return res.json(
      ApiResponseBuilder.success({
        message: 'Email template deleted successfully',
      })
    );
  })
);

// Preview email template
router.post(
  '/:id/preview',
  asyncHandler(async (req: Request, res: Response) => {
    const template = await EmailTemplateService.getById(
      parseInt(req.params.id)
    );

    if (!template) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Template not found');
    }

    const { variables } = req.body;
    const renderedBody = await EmailTemplateService.renderTemplate(
      template,
      variables
    );

    return res.json(
      ApiResponseBuilder.success({
        subject: template.subject,
        body: renderedBody,
      })
    );
  })
);

// Send test email
router.post(
  '/:id/test',
  asyncHandler(async (req: Request, res: Response) => {
    const template = await EmailTemplateService.getById(
      parseInt(req.params.id)
    );

    if (!template) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Template not found');
    }

    const { recipientEmail, variables = {} } = req.body;

    if (!recipientEmail) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Recipient email is required'
      );
    }

    const renderedBody = await EmailTemplateService.renderTemplate(
      template,
      variables
    );

    // For now, we'll create a custom send method since the emailService is using specific templates
    // In a real implementation, you'd extend the emailService to handle custom templates
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });

    await transporter.sendMail({
      from:
        process.env.SMTP_FROM ||
        '"CPR Training System" <noreply@cprtraining.com>',
      to: recipientEmail,
      subject: `[TEST] ${template.subject}`,
      html: renderedBody,
      text: renderedBody,
    });

    return res.json(
      ApiResponseBuilder.success({
        message: 'Test email sent successfully',
        sentTo: recipientEmail,
      })
    );
  })
);

// Clone email template
router.post(
  '/:id/clone',
  asyncHandler(
    async (req: Request & { user?: { userId: string } }, res: Response) => {
      const originalTemplate = await EmailTemplateService.getById(
        parseInt(req.params.id)
      );

      if (!originalTemplate) {
        throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Template not found');
      }

      const { name } = req.body;

      if (!name) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'New template name is required'
        );
      }

      const clonedTemplate = await EmailTemplateService.create({
        ...originalTemplate,
        name,
        key: name.toLowerCase().replace(/\s+/g, '_'),
        isSystem: false,
        createdBy: parseInt(req.user?.userId || '0'),
        lastModifiedBy: parseInt(req.user?.userId || '0'),
        isActive: originalTemplate.isActive,
      } as any);

      return res.status(201).json(
        ApiResponseBuilder.success({
          message: 'Email template cloned successfully',
          template: clonedTemplate,
        })
      );
    }
  )
);

// Get available event triggers
router.get(
  '/meta/event-triggers',
  asyncHandler(async (_req: Request, res: Response) => {
    const eventTriggers = [
      {
        value: 'course_assigned_instructor',
        label: 'Course Assigned to Instructor',
        category: 'course',
      },
      {
        value: 'course_scheduled_organization',
        label: 'Course Scheduled for Organization',
        category: 'course',
      },
      {
        value: 'course_reminder_instructor',
        label: 'Course Reminder - Instructor',
        category: 'reminder',
      },
      {
        value: 'course_reminder_student',
        label: 'Course Reminder - Student',
        category: 'reminder',
      },
      {
        value: 'course_cancelled',
        label: 'Course Cancelled',
        category: 'course',
      },
      {
        value: 'course_completed',
        label: 'Course Completed',
        category: 'course',
      },
      {
        value: 'instructor_approved',
        label: 'Instructor Application Approved',
        category: 'notification',
      },
      {
        value: 'instructor_rejected',
        label: 'Instructor Application Rejected',
        category: 'notification',
      },
      {
        value: 'organization_approved',
        label: 'Organization Application Approved',
        category: 'notification',
      },
      {
        value: 'organization_rejected',
        label: 'Organization Application Rejected',
        category: 'notification',
      },
      { value: 'password_reset', label: 'Password Reset', category: 'system' },
      {
        value: 'account_created',
        label: 'Account Created',
        category: 'system',
      },
      { value: 'custom', label: 'Custom Event', category: 'custom' },
    ];

    return res.json(ApiResponseBuilder.success(eventTriggers));
  })
);

// Get common template variables
router.get(
  '/meta/variables',
  asyncHandler(async (_req: Request, res: Response) => {
    const commonVariables = [
      // User variables
      {
        name: 'firstName',
        description: 'User first name',
        sampleValue: 'John',
      },
      { name: 'lastName', description: 'User last name', sampleValue: 'Doe' },
      {
        name: 'email',
        description: 'User email address',
        sampleValue: 'john.doe@example.com',
      },

      // Course variables
      {
        name: 'courseType',
        description: 'Type of course',
        sampleValue: 'Basic CPR Training',
      },
      {
        name: 'courseDate',
        description: 'Course date',
        sampleValue: 'January 15, 2024',
      },
      {
        name: 'courseTime',
        description: 'Course time',
        sampleValue: '9:00 AM - 12:00 PM',
      },
      {
        name: 'startTime',
        description: 'Course start time',
        sampleValue: '9:00 AM',
      },
      {
        name: 'endTime',
        description: 'Course end time',
        sampleValue: '12:00 PM',
      },
      {
        name: 'location',
        description: 'Course location',
        sampleValue: 'Main Training Center',
      },
      {
        name: 'students',
        description: 'Number of students',
        sampleValue: '10',
      },

      // Organization variables
      {
        name: 'organization',
        description: 'Organization name',
        sampleValue: 'Sample Organization',
      },
      {
        name: 'organizationContact',
        description: 'Organization contact person',
        sampleValue: 'Jane Smith',
      },

      // Instructor variables
      {
        name: 'instructorName',
        description: 'Instructor full name',
        sampleValue: 'Dr. John Smith',
      },
      {
        name: 'instructorEmail',
        description: 'Instructor email',
        sampleValue: 'instructor@example.com',
      },
      {
        name: 'instructorPhone',
        description: 'Instructor phone',
        sampleValue: '(555) 123-4567',
      },

      // System variables
      {
        name: 'appName',
        description: 'Application name',
        sampleValue: 'CPR Training System',
      },
      {
        name: 'appUrl',
        description: 'Application URL',
        sampleValue: 'https://cpr-training.com',
      },
      {
        name: 'supportEmail',
        description: 'Support email',
        sampleValue: 'support@cpr-training.com',
      },
      {
        name: 'currentYear',
        description: 'Current year',
        sampleValue: new Date().getFullYear().toString(),
      },
    ];

    return res.json(ApiResponseBuilder.success(commonVariables));
  })
);

export default router;
