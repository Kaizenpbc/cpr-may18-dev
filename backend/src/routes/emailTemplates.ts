import express from 'express';
import { EmailTemplateService } from '../models/EmailTemplate.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { emailService } from '../services/emailService.js';

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
  async (req, res) => {
    try {
      const {
        name,
        key,
        subject,
        body,
        description,
        category,
        subCategory,
        isActive,
      } = req.body;

      // Validate required fields
      if (!name || !subject || !body) {
        return res.status(400).json({
          error: 'Name, subject, and body are required',
        });
      }

      const template = await EmailTemplateService.create({
        name,
        key: key || name.toUpperCase().replace(/\s+/g, '_'),
        subject,
        body,
        category: category || 'Other',
        subCategory: subCategory || '',
        isActive: isActive !== undefined ? isActive : true,
        isSystem: false,
        createdBy: req.user.userId,
        lastModifiedBy: req.user.userId,
      });

      res.status(201).json({
        message: 'Email template created successfully',
        template,
      });
    } catch (error) {
      console.error('Error creating email template:', error);
      res.status(500).json({ error: 'Failed to create email template' });
    }
  }
);

// Update email template
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles(['admin', 'superadmin']),
  async (req, res) => {
    try {
      const template = await EmailTemplateService.getById(parseInt(req.params.id));

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      if (template.isSystem && req.user.role !== 'superadmin') {
        return res.status(403).json({
          error: 'System templates can only be modified by super admins',
        });
      }

      const updates = {
        ...req.body,
        lastModifiedBy: req.user.userId,
      };

      // Don't allow changing isSystem flag
      delete updates.isSystem;

      const updatedTemplate = await EmailTemplateService.update(
        parseInt(req.params.id),
        updates
      );

      res.json({
        message: 'Email template updated successfully',
        template: updatedTemplate,
      });
    } catch (error) {
      console.error('Error updating email template:', error);
      res.status(500).json({ error: 'Failed to update email template' });
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