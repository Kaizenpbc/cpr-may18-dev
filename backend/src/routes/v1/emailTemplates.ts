import express, { Request, Response } from 'express';
import { pool } from '../../config/database';
import { ApiResponseBuilder } from '../../utils/apiResponse';
import { AppError, errorCodes } from '../../utils/errorHandler';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = express.Router();

// Get all email templates
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const result = await pool.query(
        `SELECT id, name, subject, html, description, last_modified 
         FROM email_templates 
         ORDER BY name`
    );
    
    return res.json(ApiResponseBuilder.success(result.rows));
}));

// Get a specific template
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const result = await pool.query(
        `SELECT id, name, subject, html, description, last_modified 
         FROM email_templates 
         WHERE id = $1`,
        [id]
    );
    
    if (result.rows.length === 0) {
        throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Template not found');
    }
    
    return res.json(ApiResponseBuilder.success(result.rows[0]));
}));

// Update a template
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, subject, html, description } = req.body;
    
    if (!name || !subject || !html) {
        throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Name, subject, and HTML content are required');
    }
    
    const result = await pool.query(
        `UPDATE email_templates 
         SET name = $1, 
             subject = $2, 
             html = $3, 
             description = $4,
             last_modified = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [name, subject, html, description, id]
    );
    
    if (result.rows.length === 0) {
        throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Template not found');
    }
    
    return res.json(ApiResponseBuilder.success(result.rows[0]));
}));

// Reset a template to default
router.post('/:id/reset', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    // Get default template content
    const defaultTemplate = await pool.query(
        `SELECT default_html, default_subject 
         FROM email_templates 
         WHERE id = $1`,
        [id]
    );
    
    if (defaultTemplate.rows.length === 0) {
        throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Template not found');
    }
    
    // Reset to default
    const result = await pool.query(
        `UPDATE email_templates 
         SET html = default_html,
             subject = default_subject,
             last_modified = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [id]
    );
    
    return res.json(ApiResponseBuilder.success(result.rows[0]));
}));

export default router; 