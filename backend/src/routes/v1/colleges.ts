import express from 'express';
import { pool } from '../../config/database.js';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware.js';
import { asyncHandler, AppError } from '../../utils/errorHandler.js';

const router = express.Router();

// Get all active colleges (for dropdown)
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT id, name FROM colleges WHERE is_active = true ORDER BY name ASC'
  );
  res.json({ success: true, data: result.rows });
}));

// Get all colleges including inactive (admin only)
router.get('/all', authenticateToken, requireRole(['admin', 'sysadmin']), asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT id, name, is_active, created_at, updated_at FROM colleges ORDER BY name ASC'
  );
  res.json({ success: true, data: result.rows });
}));

// Add a new college (admin only)
router.post('/', authenticateToken, requireRole(['admin', 'sysadmin']), asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    throw new AppError(400, 'VALIDATION_ERROR', 'College name is required');
  }

  try {
    const result = await pool.query(
      'INSERT INTO colleges (name) VALUES ($1) RETURNING id, name, is_active, created_at',
      [name.trim()]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      throw new AppError(400, 'VALIDATION_ERROR', 'College with this name already exists');
    }
    throw error;
  }
}));

// Update a college (admin only)
router.put('/:id', authenticateToken, requireRole(['admin', 'sysadmin']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, is_active } = req.body;

  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(name.trim());
  }
  if (is_active !== undefined) {
    updates.push(`is_active = $${paramCount++}`);
    values.push(is_active);
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

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      throw new AppError(400, 'VALIDATION_ERROR', 'College with this name already exists');
    }
    throw error;
  }
}));

// Delete a college (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin', 'sysadmin']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    'DELETE FROM colleges WHERE id = $1 RETURNING id',
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'College not found');
  }

  res.json({ success: true, message: 'College deleted successfully' });
}));

export default router;
