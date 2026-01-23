import express, { Request, Response } from 'express';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware.js';
import { pool } from '../../config/database.js';
import { asyncHandler, AppError, errorCodes } from '../../utils/errorHandler.js';
import { ApiResponseBuilder } from '../../utils/apiResponse.js';
import { keysToCamel } from '../../utils/caseConverter.js';

const router = express.Router();

// Get student's classes
router.get('/classes', authenticateToken, requireRole(['student']), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result = await pool.query(
    `SELECT c.*, ct.name as type, ct.description,
            ct.duration_minutes
     FROM classes c
     JOIN class_types ct ON c.class_type_id = ct.id
     WHERE c.student_id = $1`,
    [userId]
  );
  res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
}));

// Get student's upcoming classes
router.get('/upcoming-classes', authenticateToken, requireRole(['student']), asyncHandler(async (req: Request, res: Response) => {
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
  res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
}));

// Get student's completed classes
router.get('/completed-classes', authenticateToken, requireRole(['student']), asyncHandler(async (req: Request, res: Response) => {
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
  res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
}));

router.get('/profile', authenticateToken, requireRole(['student']), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user?.id;
  const result = await pool.query(
    'SELECT id, username, email, full_name, phone FROM users WHERE id = $1',
    [userId]
  );
  res.json(ApiResponseBuilder.success(keysToCamel(result.rows[0])));
}));

router.put('/profile', authenticateToken, requireRole(['student']), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user?.id;
  // Accept both camelCase and snake_case for backwards compatibility
  const { username, email, full_name, fullName, phone } = req.body;
  const nameValue = fullName !== undefined ? fullName : full_name;
  const result = await pool.query(
    'UPDATE users SET username = $1, email = $2, full_name = $3, phone = $4 WHERE id = $5 RETURNING *',
    [username, email, nameValue, phone, userId]
  );
  res.json(ApiResponseBuilder.success(keysToCamel(result.rows[0])));
}));

router.get('/enrollments', authenticateToken, requireRole(['student']), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user?.id;
  const result = await pool.query(
    'SELECT * FROM enrollments WHERE student_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
}));

export default router;
