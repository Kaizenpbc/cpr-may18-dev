import express from 'express';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware';
import { pool } from '../../config/database';

const router = express.Router();

// Get organization details
router.get('/', authenticateToken, requireRole(['admin', 'organization']), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM organizations WHERE id = $1',
      [req.user.organizationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update organization details
router.put('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, address, phone, email } = req.body;
    const result = await pool.query(
      `UPDATE organizations 
       SET name = $1, address = $2, phone = $3, email = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, address, phone, email, req.user.organizationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get organization profile for the logged-in user
router.get('/profile', authenticateToken, requireRole(['admin', 'organization']), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM organizations WHERE id = $1',
      [req.user.organizationId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching organization profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
