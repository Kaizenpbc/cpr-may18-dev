import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import { errorCodes } from '../../utils/errorHandler.js';
import { pool } from '../../config/database.js';

const router = Router();

// Submit a profile change request
router.post('/', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const { field_name, new_value, change_type, target_user_id } = req.body;
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  if (!userId) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }

  if (!field_name || !new_value || !change_type) {
    throw new AppError(400, errorCodes.INVALID_INPUT, 'Missing required fields: field_name, new_value, change_type');
  }

  if (!['instructor', 'organization'].includes(change_type)) {
    throw new AppError(400, errorCodes.INVALID_INPUT, 'change_type must be "instructor" or "organization"');
  }

  // Determine the target user ID
  let targetUserId = userId;
  if (target_user_id && userRole === 'hr') {
    // HR users can submit changes for other users
    targetUserId = target_user_id;
  } else if (userRole === 'hr' && !target_user_id) {
    // HR users should specify a target user when submitting changes
    throw new AppError(400, errorCodes.INVALID_INPUT, 'HR users must specify target_user_id when submitting profile changes');
  }

  try {
    // For profile change requests, we don't need to query the current value
    // The current value will be determined when the change is approved/implemented
    let currentValue = null;

    // Check if there's already a pending change for this field
    const existingChange = await pool.query(
      `SELECT id FROM profile_changes 
       WHERE user_id = $1 AND field_name = $2 AND status = 'pending'`,
      [targetUserId, field_name]
    );

    if (existingChange.rows.length > 0) {
      throw new AppError(400, errorCodes.INVALID_INPUT, 'A pending change request already exists for this field');
    }

    // Create the profile change request
    const result = await pool.query(
      `INSERT INTO profile_changes (user_id, change_type, field_name, old_value, new_value, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING id, created_at`,
      [targetUserId, change_type, field_name, currentValue, new_value]
    );

    const changeRequest = result.rows[0];

    res.json({
      success: true,
      message: 'Profile change request submitted successfully',
      data: {
        id: changeRequest.id,
        field_name,
        new_value,
        change_type,
        status: 'pending',
        created_at: changeRequest.created_at
      }
    });

  } catch (error) {
    console.error('Profile change submission error:', error);
    throw new AppError(500, errorCodes.DB_QUERY_ERROR, 'Failed to submit profile change request');
  }
}));

// Get user's own profile change requests
router.get('/', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }

  try {
    const result = await pool.query(
      `SELECT id, change_type, field_name, old_value, new_value, status, hr_comment, created_at, updated_at
       FROM profile_changes 
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Profile changes fetch error:', error);
    throw new AppError(500, errorCodes.DB_QUERY_ERROR, 'Failed to fetch profile changes');
  }
}));

export default router; 