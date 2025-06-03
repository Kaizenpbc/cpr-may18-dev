const express = require('express');
const router = express.Router();
const EmailTemplate = require('../models/EmailTemplate');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const emailService = require('../services/emailService');

// Get all email templates
router.get('/', authenticateToken, authorizeRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const { category, active, search } = req.query;
        
        let query = {};
        if (category) query.category = category;
        if (active !== undefined) query.isActive = active === 'true';
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        const templates = await EmailTemplate.find(query)
            .populate('createdBy', 'firstName lastName')
            .populate('lastModifiedBy', 'firstName lastName')
            .sort({ category: 1, name: 1 });
            
        res.json(templates);
    } catch (error) {
        console.error('Error fetching email templates:', error);
        res.status(500).json({ error: 'Failed to fetch email templates' });
    }
});

// Get single email template
router.get('/:id', authenticateToken, authorizeRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const template = await EmailTemplate.findById(req.params.id)
            .populate('createdBy', 'firstName lastName')
            .populate('lastModifiedBy', 'firstName lastName');
            
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        
        res.json(template);
    } catch (error) {
        console.error('Error fetching email template:', error);
        res.status(500).json({ error: 'Failed to fetch email template' });
    }
});

// Create new email template
router.post('/', authenticateToken, authorizeRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const {
            name,
            key,
            subject,
            htmlContent,
            textContent,
            description,
            category,
            eventTriggers,
            availableVariables,
            isActive
        } = req.body;
        
        // Validate required fields
        if (!name || !subject || !htmlContent) {
            return res.status(400).json({ 
                error: 'Name, subject, and HTML content are required' 
            });
        }
        
        const template = new EmailTemplate({
            name,
            key,
            subject,
            htmlContent,
            textContent,
            description,
            category,
            eventTriggers,
            availableVariables,
            isActive,
            createdBy: req.user.userId,
            lastModifiedBy: req.user.userId
        });
        
        await template.save();
        
        res.status(201).json({
            message: 'Email template created successfully',
            template
        });
    } catch (error) {
        console.error('Error creating email template:', error);
        if (error.code === 11000) {
            return res.status(400).json({ 
                error: 'A template with this name or key already exists' 
            });
        }
        res.status(500).json({ error: 'Failed to create email template' });
    }
});

// Update email template
router.put('/:id', authenticateToken, authorizeRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const template = await EmailTemplate.findById(req.params.id);
        
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        
        if (template.isSystem && req.user.role !== 'superadmin') {
            return res.status(403).json({ 
                error: 'System templates can only be modified by super admins' 
            });
        }
        
        const updates = {
            ...req.body,
            lastModifiedBy: req.user.userId
        };
        
        // Don't allow changing isSystem flag
        delete updates.isSystem;
        
        Object.assign(template, updates);
        await template.save();
        
        res.json({
            message: 'Email template updated successfully',
            template
        });
    } catch (error) {
        console.error('Error updating email template:', error);
        if (error.code === 11000) {
            return res.status(400).json({ 
                error: 'A template with this name or key already exists' 
            });
        }
        res.status(500).json({ error: 'Failed to update email template' });
    }
});

// Delete email template
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const template = await EmailTemplate.findById(req.params.id);
        
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        
        if (template.isSystem) {
            return res.status(403).json({ 
                error: 'System templates cannot be deleted' 
            });
        }
        
        await template.deleteOne();
        
        res.json({ message: 'Email template deleted successfully' });
    } catch (error) {
        console.error('Error deleting email template:', error);
        res.status(500).json({ error: 'Failed to delete email template' });
    }
});

// Preview email template
router.post('/:id/preview', authenticateToken, authorizeRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const template = await EmailTemplate.findById(req.params.id);
        
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        
        const { variables = {} } = req.body;
        
        // Use sample values if no variables provided
        const sampleVariables = {};
        template.availableVariables.forEach(v => {
            sampleVariables[v.name] = variables[v.name] || v.sampleValue || `{{${v.name}}}`;
        });
        
        const rendered = template.renderTemplate({ ...sampleVariables, ...variables });
        
        res.json({
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            variables: sampleVariables
        });
    } catch (error) {
        console.error('Error previewing email template:', error);
        res.status(500).json({ error: 'Failed to preview email template' });
    }
});

// Send test email
router.post('/:id/test', authenticateToken, authorizeRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const template = await EmailTemplate.findById(req.params.id);
        
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        
        const { recipientEmail, variables = {} } = req.body;
        
        if (!recipientEmail) {
            return res.status(400).json({ error: 'Recipient email is required' });
        }
        
        // Use sample values for any missing variables
        const sampleVariables = {};
        template.availableVariables.forEach(v => {
            sampleVariables[v.name] = variables[v.name] || v.sampleValue || `{{${v.name}}}`;
        });
        
        const rendered = template.renderTemplate({ ...sampleVariables, ...variables });
        
        await emailService.sendEmail({
            to: recipientEmail,
            subject: `[TEST] ${rendered.subject}`,
            html: rendered.html,
            text: rendered.text
        });
        
        res.json({ 
            message: 'Test email sent successfully',
            sentTo: recipientEmail
        });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({ error: 'Failed to send test email' });
    }
});

// Clone email template
router.post('/:id/clone', authenticateToken, authorizeRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const originalTemplate = await EmailTemplate.findById(req.params.id);
        
        if (!originalTemplate) {
            return res.status(404).json({ error: 'Template not found' });
        }
        
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'New template name is required' });
        }
        
        const clonedData = originalTemplate.toObject();
        delete clonedData._id;
        delete clonedData.createdAt;
        delete clonedData.updatedAt;
        delete clonedData.usageCount;
        
        const clonedTemplate = new EmailTemplate({
            ...clonedData,
            name,
            key: null, // Will be auto-generated
            isSystem: false,
            createdBy: req.user.userId,
            lastModifiedBy: req.user.userId
        });
        
        await clonedTemplate.save();
        
        res.status(201).json({
            message: 'Email template cloned successfully',
            template: clonedTemplate
        });
    } catch (error) {
        console.error('Error cloning email template:', error);
        if (error.code === 11000) {
            return res.status(400).json({ 
                error: 'A template with this name already exists' 
            });
        }
        res.status(500).json({ error: 'Failed to clone email template' });
    }
});

// Get available event triggers
router.get('/meta/event-triggers', authenticateToken, authorizeRoles('admin', 'superadmin'), (req, res) => {
    const eventTriggers = [
        { value: 'course_assigned_instructor', label: 'Course Assigned to Instructor', category: 'course' },
        { value: 'course_scheduled_organization', label: 'Course Scheduled for Organization', category: 'course' },
        { value: 'course_reminder_instructor', label: 'Course Reminder - Instructor', category: 'reminder' },
        { value: 'course_reminder_student', label: 'Course Reminder - Student', category: 'reminder' },
        { value: 'course_cancelled', label: 'Course Cancelled', category: 'course' },
        { value: 'course_completed', label: 'Course Completed', category: 'course' },
        { value: 'instructor_approved', label: 'Instructor Application Approved', category: 'notification' },
        { value: 'instructor_rejected', label: 'Instructor Application Rejected', category: 'notification' },
        { value: 'organization_approved', label: 'Organization Application Approved', category: 'notification' },
        { value: 'organization_rejected', label: 'Organization Application Rejected', category: 'notification' },
        { value: 'password_reset', label: 'Password Reset', category: 'system' },
        { value: 'account_created', label: 'Account Created', category: 'system' },
        { value: 'custom', label: 'Custom Event', category: 'custom' }
    ];
    
    res.json(eventTriggers);
});

// Get common template variables
router.get('/meta/variables', authenticateToken, authorizeRoles('admin', 'superadmin'), (req, res) => {
    const commonVariables = [
        // User variables
        { name: 'firstName', description: 'User first name', sampleValue: 'John' },
        { name: 'lastName', description: 'User last name', sampleValue: 'Doe' },
        { name: 'email', description: 'User email address', sampleValue: 'john.doe@example.com' },
        
        // Course variables
        { name: 'courseType', description: 'Type of course', sampleValue: 'Basic CPR Training' },
        { name: 'courseDate', description: 'Course date', sampleValue: 'January 15, 2024' },
        { name: 'courseTime', description: 'Course time', sampleValue: '9:00 AM - 12:00 PM' },
        { name: 'startTime', description: 'Course start time', sampleValue: '9:00 AM' },
        { name: 'endTime', description: 'Course end time', sampleValue: '12:00 PM' },
        { name: 'location', description: 'Course location', sampleValue: 'Main Training Center' },
        { name: 'students', description: 'Number of students', sampleValue: '10' },
        
        // Organization variables
        { name: 'organization', description: 'Organization name', sampleValue: 'Sample Organization' },
        { name: 'organizationContact', description: 'Organization contact person', sampleValue: 'Jane Smith' },
        
        // Instructor variables
        { name: 'instructorName', description: 'Instructor full name', sampleValue: 'Dr. John Smith' },
        { name: 'instructorEmail', description: 'Instructor email', sampleValue: 'instructor@example.com' },
        { name: 'instructorPhone', description: 'Instructor phone', sampleValue: '(555) 123-4567' },
        
        // System variables
        { name: 'appName', description: 'Application name', sampleValue: 'CPR Training System' },
        { name: 'appUrl', description: 'Application URL', sampleValue: 'https://cpr-training.com' },
        { name: 'supportEmail', description: 'Support email', sampleValue: 'support@cpr-training.com' },
        { name: 'currentYear', description: 'Current year', sampleValue: new Date().getFullYear().toString() }
    ];
    
    res.json(commonVariables);
});

module.exports = router; 