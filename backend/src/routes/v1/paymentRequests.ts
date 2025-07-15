import express from 'express';
import { authenticateToken } from '../../middleware/authMiddleware';
import { asyncHandler } from '../../middleware/asyncHandler';
import { AppError, errorCodes } from '../../utils/errorHandler';
import { PaymentRequestService } from '../../services/paymentRequestService';
import { pool } from '../../config/database';

const router = express.Router();

// Middleware to ensure accountant role
const requireAccountantRole = (req: any, res: any, next: any) => {
  if (req.user.role !== 'accountant') {
    throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Access denied. Accountant role required.');
  }
  next();
};

// Get Payment Request Statistics
router.get('/stats', authenticateToken, requireAccountantRole, asyncHandler(async (req, res) => {
  const stats = await PaymentRequestService.getPaymentRequestStats();
  
  res.json({
    success: true,
    data: stats
  });
}));

// Get Payment Requests (with filtering)
router.get('/', authenticateToken, requireAccountantRole, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = '', instructor_id = '' } = req.query;
  
  const filters = {
    status: status as string,
    instructor_id: instructor_id ? parseInt(instructor_id as string) : undefined,
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  };
  
  const result = await PaymentRequestService.getPaymentRequests(filters);
  
  res.json({
    success: true,
    data: result
  });
}));

// Get Payment Request Details
router.get('/:requestId', authenticateToken, requireAccountantRole, asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const client = await pool.connect();
  
  try {
    const requestResult = await client.query(`
      SELECT 
        pr.*,
        u.username as instructor_name,
        u.email as instructor_email,
        t.week_start_date,
        t.total_hours,
        t.courses_taught,
        t.hr_comment as timesheet_comment
      FROM payment_requests pr
      JOIN users u ON pr.instructor_id = u.id
      JOIN timesheets t ON pr.timesheet_id = t.id
      WHERE pr.id = $1
    `, [requestId]);
    
    if (requestResult.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Payment request not found.');
    }
    
    res.json({
      success: true,
      data: requestResult.rows[0]
    });
  } finally {
    client.release();
  }
}));

// Process Payment Request (approve/reject)
router.post('/:requestId/process', authenticateToken, requireAccountantRole, asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { action, notes } = req.body; // action: 'approve' or 'reject'
  
  if (!['approve', 'reject'].includes(action)) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Invalid action. Must be "approve" or "reject".');
  }
  
  await PaymentRequestService.processPaymentRequest(requestId, action, notes);
  
  res.json({
    success: true,
    message: `Payment request ${action}d successfully.`
  });
}));

// Bulk Process Payment Requests
router.post('/bulk-process', authenticateToken, requireAccountantRole, asyncHandler(async (req, res) => {
  const { requestIds, action, notes } = req.body;
  
  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Request IDs array is required.');
  }
  
  if (!['approve', 'reject'].includes(action)) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Invalid action. Must be "approve" or "reject".');
  }
  
  const results = [];
  const errors = [];
  
  for (const requestId of requestIds) {
    try {
      await PaymentRequestService.processPaymentRequest(requestId, action, notes);
      results.push({ requestId, status: 'success' });
    } catch (error) {
      errors.push({ requestId, status: 'error', message: error.message });
    }
  }
  
  res.json({
    success: true,
    message: `Processed ${results.length} payment requests successfully.`,
    data: {
      processed: results,
      errors: errors
    }
  });
}));

// Get Payment Request History for Instructor
router.get('/instructor/:instructorId/history', authenticateToken, requireAccountantRole, asyncHandler(async (req, res) => {
  const { instructorId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  
  const client = await pool.connect();
  
  try {
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // Get payment request history for the instructor
    const historyResult = await client.query(`
      SELECT 
        pr.*,
        t.week_start_date,
        t.total_hours,
        t.courses_taught
      FROM payment_requests pr
      JOIN timesheets t ON pr.timesheet_id = t.id
      WHERE pr.instructor_id = $1
      ORDER BY pr.created_at DESC
      LIMIT $2 OFFSET $3
    `, [instructorId, limit, offset]);
    
    // Get total count for pagination
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM payment_requests pr
      WHERE pr.instructor_id = $1
    `, [instructorId]);
    
    res.json({
      success: true,
      data: {
        history: historyResult.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit as string))
        }
      }
    });
  } finally {
    client.release();
  }
}));

export default router; 