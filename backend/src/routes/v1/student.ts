import express from 'express';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware';
import { pool } from '../../config/database';

const router = express.Router();

// Get student's classes
router.get('/classes', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM classes WHERE student_id = $1',
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
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM classes WHERE student_id = $1 AND start_time > NOW() ORDER BY start_time ASC',
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
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM classes WHERE student_id = $1 AND end_time < NOW() ORDER BY end_time DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching completed classes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
