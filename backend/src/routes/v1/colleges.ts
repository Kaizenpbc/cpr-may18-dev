import express from 'express';
import pool from '../../config/database.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';

const router = express.Router();

// Get all active colleges (for dropdown)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name FROM colleges WHERE is_active = true ORDER BY name ASC'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching colleges:', error);
    res.status(500).json({ error: 'Failed to fetch colleges' });
  }
});

// Get all colleges including inactive (admin only)
router.get('/all', authenticateToken, requireRole(['admin', 'sysadmin']), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, is_active, created_at, updated_at FROM colleges ORDER BY name ASC'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching all colleges:', error);
    res.status(500).json({ error: 'Failed to fetch colleges' });
  }
});

// Add a new college (admin only)
router.post('/', authenticateToken, requireRole(['admin', 'sysadmin']), async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'College name is required' });
    }

    const result = await pool.query(
      'INSERT INTO colleges (name) VALUES ($1) RETURNING id, name, is_active, created_at',
      [name.trim()]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'College with this name already exists' });
    }
    console.error('Error adding college:', error);
    res.status(500).json({ error: 'Failed to add college' });
  }
});

// Update a college (admin only)
router.put('/:id', authenticateToken, requireRole(['admin', 'sysadmin']), async (req, res) => {
  try {
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
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE colleges SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, name, is_active, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'College not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'College with this name already exists' });
    }
    console.error('Error updating college:', error);
    res.status(500).json({ error: 'Failed to update college' });
  }
});

// Delete a college (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin', 'sysadmin']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM colleges WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'College not found' });
    }

    res.json({ success: true, message: 'College deleted successfully' });
  } catch (error) {
    console.error('Error deleting college:', error);
    res.status(500).json({ error: 'Failed to delete college' });
  }
});

export default router;
