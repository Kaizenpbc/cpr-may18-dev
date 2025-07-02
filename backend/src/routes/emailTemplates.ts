import express from 'express';
import { EmailTemplateService, EmailTemplateInput } from '../models/EmailTemplate.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { emailService } from '../services/emailService.js';
import { Request, Response } from 'express';

const router = express.Router();

// Get all email templates
router.get(
  '/',
  authenticateToken,
  authorizeRoles(['admin', 'superadmin']),
  async (req, res) => {
    try {
      const { category, active, search } = req.query;

      const templates = await EmailTemplateService.getAll(
        category as string,
        active === 'true',
        search as string
      );

      res.json(templates);
    } catch (error) {
      console.error('Error fetching email templates:', error);
      res.status(500).json({ error: 'Failed to fetch email templates' });
    }
  }
);

// Get single email template
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles(['admin', 'superadmin']),
  async (req, res) => {
    try {
      const template = await EmailTemplateService.getById(parseInt(req.params.id));

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      res.json(template);
    } catch (error) {
      console.error('Error fetching email template:', error);
      res.status(500).json({ error: 'Failed to fetch email template' });
    }
  }
);

// Create new email template
router.post(
  '/',
  authenticateToken,
  authorizeRoles(['admin', 'superadmin']),
  async (req: Request, res: Response) => {
    try {
      const templateData: EmailTemplateInput = {
        name: req.body.name,
        key: req.body.key,
        category: req.body.category,
        subCategory: req.body.subCategory,
        subject: req.body.subject,
        body: req.body.body,
        isActive: req.body.isActive ?? true,
        isSystem: req.body.isSystem ?? false,
        createdBy: req.user?.userId ? parseInt(req.user.userId) : undefined,
        lastModifiedBy: req.user?.userId ? parseInt(req.user.userId) : undefined,
      };

      const template = await EmailTemplateService.create(templateData);
      res.status(201).json({
        success: true,
        message: 'Email template created successfully',
        data: template,
      });
    } catch (error) {
      console.error('Error creating email template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create email template',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Update email template
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles(['admin', 'superadmin']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const templateId = parseInt(id);

      if (isNaN(templateId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid template ID',
        });
      }

      // Check if template exists and is system template
      const existingTemplate = await EmailTemplateService.getById(templateId);
      if (!existingTemplate) {
        return res.status(404).json({
          success: false,
          message: 'Template not found',
        });
      }

      if (existingTemplate.isSystem && req.user?.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'System templates can only be modified by superadmin',
        });
      }

      const updateData: Partial<EmailTemplateInput> = {
        name: req.body.name,
        key: req.body.key,
        category: req.body.category,
        subCategory: req.body.subCategory,
        subject: req.body.subject,
        body: req.body.body,
        isActive: req.body.isActive,
        lastModifiedBy: req.user?.userId ? parseInt(req.user.userId) : undefined,
      };

      const updatedTemplate = await EmailTemplateService.update(templateId, updateData);
      res.json({
        success: true,
        message: 'Email template updated successfully',
        data: updatedTemplate,
      });
    } catch (error) {
      console.error('Error updating email template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update email template',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Delete email template
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles(['admin', 'superadmin']),
  async (req, res) => {
    try {
      const template = await EmailTemplateService.getById(parseInt(req.params.id));

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      if (template.isSystem) {
        return res.status(403).json({
          error: 'System templates cannot be deleted',
        });
      }

      await EmailTemplateService.delete(parseInt(req.params.id));

      res.json({ message: 'Email template deleted successfully' });
    } catch (error) {
      console.error('Error deleting email template:', error);
      res.status(500).json({ error: 'Failed to delete email template' });
    }
  }
);

// Preview email template
router.post(
  '/:id/preview',
  authenticateToken,
  authorizeRoles(['admin', 'superadmin']),
  async (req, res) => {
    try {
      const template = await EmailTemplateService.getById(parseInt(req.params.id));

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const { variables = {} } = req.body;

      const rendered = await EmailTemplateService.renderTemplate(template, variables);

      res.json({
        preview: {
          subject: template.subject,
          body: rendered,
        },
        variables: [], // TODO: Add available variables
      });
    } catch (error) {
      console.error('Error previewing email template:', error);
      res.status(500).json({ error: 'Failed to preview email template' });
    }
  }
);

// Send test email
router.post(
  '/:id/send-test',
  authenticateToken,
  authorizeRoles(['admin', 'superadmin']),
  async (req, res) => {
    try {
      const template = await EmailTemplateService.getById(parseInt(req.params.id));

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const { to, variables = {} } = req.body;

      if (!to) {
        return res.status(400).json({ error: 'Recipient email is required' });
      }

      const rendered = await EmailTemplateService.renderTemplate(template, variables);

      // Use a public method from emailService
      const success = await emailService.sendCourseScheduledToOrganization(to, {
        courseName: 'Test Course',
        date: new Date().toISOString(),
        startTime: '9:00 AM',
        endTime: '5:00 PM',
        location: 'Test Location',
        instructorName: 'Test Instructor',
        students: 10,
      });

      if (success) {
        res.json({ message: 'Test email sent successfully' });
      } else {
        res.status(500).json({ error: 'Failed to send test email' });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).json({ error: 'Failed to send test email' });
    }
  }
);

export default router; 