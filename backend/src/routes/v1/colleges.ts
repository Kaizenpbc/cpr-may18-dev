import express, { Request, Response } from 'express';
import { pool } from '../../config/database.js';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware.js';
import { asyncHandler, AppError } from '../../utils/errorHandler.js';
import { ApiResponseBuilder } from '../../utils/apiResponse.js';
import { keysToCamel } from '../../utils/caseConverter.js';
import { isDatabaseError } from '../../types/index.js';

const router = express.Router();

// Get all active colleges (for dropdown)
router.get('/', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT id, name FROM colleges WHERE is_active = true ORDER BY name ASC'
  );
  res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
}));

// Get all colleges including inactive (admin only)
router.get('/all', authenticateToken, requireRole(['admin', 'sysadmin']), asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT id, name, is_active, created_at, updated_at FROM colleges ORDER BY name ASC'
  );
  res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
}));

// Add a new college (admin only)
router.post('/', authenticateToken, requireRole(['admin', 'sysadmin']), asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    throw new AppError(400, 'VALIDATION_ERROR', 'College name is required');
  }

  try {
    const result = await pool.query(
      'INSERT INTO colleges (name) VALUES ($1) RETURNING id, name, is_active, created_at',
      [name.trim()]
    );

    res.json(ApiResponseBuilder.success(keysToCamel(result.rows[0])));
  } catch (error) {
    if (isDatabaseError(error) && error.code === '23505') { // Unique violation
      throw new AppError(400, 'VALIDATION_ERROR', 'College with this name already exists');
    }
    throw error;
  }
}));

// Update a college (admin only)
router.put('/:id', authenticateToken, requireRole(['admin', 'sysadmin']), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  // Accept both camelCase and snake_case for backwards compatibility
  const { name, is_active, isActive } = req.body;
  const activeValue = isActive !== undefined ? isActive : is_active;

  const updates: string[] = [];
  const values: (string | number | boolean | null)[] = [];
  let paramCount = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(name.trim());
  }
  if (activeValue !== undefined) {
    updates.push(`is_active = $${paramCount++}`);
    values.push(activeValue);
  }

  if (updates.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'No fields to update');
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE colleges SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, name, is_active, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'College not found');
    }

    res.json(ApiResponseBuilder.success(keysToCamel(result.rows[0])));
  } catch (error) {
    if (isDatabaseError(error) && error.code === '23505') {
      throw new AppError(400, 'VALIDATION_ERROR', 'College with this name already exists');
    }
    throw error;
  }
}));

// Delete a college (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin', 'sysadmin']), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await pool.query(
    'DELETE FROM colleges WHERE id = $1 RETURNING id',
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'College not found');
  }

  res.json(ApiResponseBuilder.success({ deleted: true, id: parseInt(id) }));
}));

export default router;
