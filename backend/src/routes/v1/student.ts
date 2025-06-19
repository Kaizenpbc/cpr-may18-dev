import express from 'express';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware';
import { pool } from '../../config/database';

const router = express.Router();

// Get student's classes
router.get('/classes', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;
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

export default router;
