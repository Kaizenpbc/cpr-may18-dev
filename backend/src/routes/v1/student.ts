import express from 'express';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware.js';
import { pool } from '../../config/database.js';
import { AppError } from '../../utils/errorHandler.js';
import { errorCodes } from '../../utils/errorHandler.js';

const router = express.Router();

// Get student's classes
router.get('/classes', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const userId = req.user?.id;
    const result = await pool.query(
      `SELECT c.*, ct.name as type, ct.description, 
              ct.duration_minutes
       FROM classes c
       JOIN class_types ct ON c.class_type_id = ct.id
       WHERE c.student_id = $1`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching student classes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student's upcoming classes
router.get('/upcoming-classes', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const userId = req.user?.id;
    const result = await pool.query(
      `SELECT c.*, ct.name as type, ct.description, 
              ct.duration_minutes
       FROM classes c
       JOIN class_types ct ON c.class_type_id = ct.id
       WHERE c.student_id = $1 AND c.start_time > NOW() 
       ORDER BY c.start_time ASC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching upcoming classes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student's completed classes
router.get('/completed-classes', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const userId = req.user?.id;
    const result = await pool.query(
      `SELECT c.*, ct.name as type, ct.description, 
              ct.duration_minutes
       FROM classes c
       JOIN class_types ct ON c.class_type_id = ct.id
       WHERE c.student_id = $1 AND c.end_time < NOW() 
       ORDER BY c.end_time DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching completed classes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/profile', authenticateToken, requireRole(['student']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user?.id;
  try {
    const result = await pool.query(
      'SELECT id, username, email, full_name, phone FROM users WHERE id = $1',
      [userId]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/profile', authenticateToken, requireRole(['student']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user?.id;
  try {
    const { username, email, full_name, phone } = req.body;
    const result = await pool.query(
      'UPDATE users SET username = $1, email = $2, full_name = $3, phone = $4 WHERE id = $5 RETURNING *',
      [username, email, full_name, phone, userId]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating student profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/enrollments', authenticateToken, requireRole(['student']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user?.id;
  try {
    const result = await pool.query(
      'SELECT * FROM enrollments WHERE student_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching student enrollments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
