import express, { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { asyncHandler, AppError, errorCodes } from '../../utils/errorHandler.js';
import { pool } from '../../config/database.js';

const router = express.Router();

// Middleware to ensure HR role
const requireHRRole = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'hr') {
    throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Access denied. HR role required.');
  }
  next();
};

// Get Payroll Statistics
router.get('/stats', authenticateToken, requireHRRole, asyncHandler(async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    // Get total payroll this month
    const totalPayrollResult = await client.query(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payroll_payments 
      WHERE EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    `);
    
    // Get pending payments count
    const pendingPaymentsResult = await client.query(`
      SELECT COUNT(*) as count FROM payroll_payments WHERE status = 'pending'
    `);
    
    // Get instructors with pending payments
    const instructorsWithPendingResult = await client.query(`
      SELECT COUNT(DISTINCT instructor_id) as count FROM payroll_payments WHERE status = 'pending'
    `);
    
    // Get average payment amount
    const avgPaymentResult = await client.query(`
      SELECT COALESCE(AVG(amount), 0) as average FROM payroll_payments WHERE status = 'completed'
    `);

    const stats = {
      totalPayrollThisMonth: totalPayrollResult.rows[0].total,
      pendingPayments: pendingPaymentsResult.rows[0].count,
      instructorsWithPending: instructorsWithPendingResult.rows[0].count,
      averagePayment: avgPaymentResult.rows[0].average
    };

    res.json({
      success: true,
      data: stats
    });
  } finally {
    client.release();
  }
}));

// Get Payroll Payments (with filtering)
router.get('/payments', authenticateToken, requireHRRole, asyncHandler(async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { page = 1, limit = 10, status = '', instructor_id = '', month = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereClause = "WHERE 1=1";
    let params: unknown[] = [];
    let paramIndex = 1;
    
    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (instructor_id) {
      whereClause += ` AND p.instructor_id = $${paramIndex}`;
      params.push(instructor_id);
      paramIndex++;
    }
    
    if (month) {
      whereClause += ` AND EXTRACT(MONTH FROM p.payment_date) = $${paramIndex}`;
      params.push(month);
      paramIndex++;
    }
    
    // Get payments with instructor info
    const paymentsResult = await client.query(`
      SELECT 
        p.*,
        u.username as instructor_name,
        u.email as instructor_email
      FROM payroll_payments p
      JOIN users u ON p.instructor_id = u.id
      ${whereClause}
      ORDER BY p.payment_date DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);
    
    // Get total count for pagination
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM payroll_payments p
      ${whereClause}
    `, params);
    
    res.json({
      success: true,
      data: {
        payments: paymentsResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult.rows[0].total,
          pages: Math.ceil(countResult.rows[0].total / Number(limit))
        }
      }
    });
  } finally {
    client.release();
  }
}));

// Get Payment Details
router.get('/payments/:paymentId', authenticateToken, requireHRRole, asyncHandler(async (req: Request, res: Response) => {
  const { paymentId } = req.params;
  const client = await pool.connect();
  
  try {
    const paymentResult = await client.query(`
      SELECT 
        p.*,
        u.username as instructor_name,
        u.email as instructor_email
      FROM payroll_payments p
      JOIN users u ON p.instructor_id = u.id
      WHERE p.id = $1
    `, [paymentId]);
    
    if (paymentResult.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Payment not found.');
    }
    
    res.json({
      success: true,
      data: paymentResult.rows[0]
    });
  } finally {
    client.release();
  }
}));

// Calculate Payroll for Instructor
router.post('/calculate/:instructorId', authenticateToken, requireHRRole, asyncHandler(async (req: Request, res: Response) => {
  const { instructorId } = req.params;
  const { start_date, end_date, hourly_rate } = req.body;
  
  if (!start_date || !end_date) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Start date and end date are required.');
  }
  
  const client = await pool.connect();
  
  try {
    // Get approved timesheets for the period
    const timesheetsResult = await client.query(`
      SELECT 
        SUM(total_hours) as total_hours,
        SUM(courses_taught) as total_courses,
        COUNT(*) as timesheet_count
      FROM timesheets 
      WHERE instructor_id = $1 
      AND status = 'approved'
      AND week_start_date >= $2 
      AND week_start_date <= $3
    `, [instructorId, start_date, end_date]);
    
    const timesheetData = timesheetsResult.rows[0];
    const totalHours = parseFloat(timesheetData.total_hours) || 0;
    const totalCourses = parseInt(timesheetData.total_courses) || 0;
    const timesheetCount = parseInt(timesheetData.timesheet_count) || 0;
    
    // Get instructor's pay rate for the period
    let payRate = parseFloat(hourly_rate) || 25.00; // Default rate
    let courseBonusRate = 50.00; // Default bonus
    let tierName = 'Default';
    let isDefaultRate = true;
    
    if (!hourly_rate) {
      // Get the instructor's stored pay rate for the start date
      const payRateResult = await client.query(`
        SELECT 
          ipr.hourly_rate,
          ipr.course_bonus,
          prt.name as tier_name
        FROM instructor_pay_rates ipr
        LEFT JOIN pay_rate_tiers prt ON ipr.tier_id = prt.id
        WHERE ipr.instructor_id = $1 
        AND ipr.is_active = true
        AND ipr.effective_date <= $2
        AND (ipr.end_date IS NULL OR ipr.end_date >= $2)
        ORDER BY ipr.effective_date DESC
        LIMIT 1
      `, [instructorId, start_date]);
      
      if (payRateResult.rows.length > 0) {
        payRate = parseFloat(payRateResult.rows[0].hourly_rate);
        courseBonusRate = parseFloat(payRateResult.rows[0].course_bonus);
        tierName = payRateResult.rows[0].tier_name || 'Custom';
        isDefaultRate = false;
      }
    }
    
    // Calculate payment
    const baseAmount = totalHours * payRate;
    const courseBonus = totalCourses * courseBonusRate;
    const totalAmount = baseAmount + courseBonus;
    
    // Get instructor info
    const instructorResult = await client.query(`
      SELECT username, email FROM users WHERE id = $1
    `, [instructorId]);
    
    if (instructorResult.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Instructor not found.');
    }
    
    const calculation = {
      instructor: instructorResult.rows[0],
      period: { start_date, end_date },
      timesheets: {
        count: timesheetCount,
        totalHours,
        totalCourses
      },
      rates: {
        hourlyRate: payRate,
        courseBonus: courseBonusRate,
        tierName,
        isDefaultRate
      },
      calculation: {
        baseAmount,
        courseBonus,
        totalAmount
      }
    };
    
    res.json({
      success: true,
      data: calculation
    });
  } finally {
    client.release();
  }
}));

// Create Payment
router.post('/payments', authenticateToken, requireHRRole, asyncHandler(async (req: Request, res: Response) => {
  const { instructor_id, amount, payment_date, payment_method, notes } = req.body;
  
  if (!instructor_id || !amount || !payment_date) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Instructor ID, amount, and payment date are required.');
  }
  
  const client = await pool.connect();
  
  try {
    // Check if instructor exists
    const instructorResult = await client.query(`
      SELECT id FROM users WHERE id = $1 AND role = 'instructor'
    `, [instructor_id]);
    
    if (instructorResult.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Instructor not found.');
    }
    
    // Create payment
    const paymentResult = await client.query(`
      INSERT INTO payroll_payments (
        instructor_id, amount, payment_date, payment_method, 
        notes, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
      RETURNING *
    `, [instructor_id, amount, payment_date, payment_method || 'direct_deposit', notes || '']);
    
    res.json({
      success: true,
      message: 'Payment created successfully.',
      data: paymentResult.rows[0]
    });
  } finally {
    client.release();
  }
}));

// Process Payment
router.post('/payments/:paymentId/process', authenticateToken, requireHRRole, asyncHandler(async (req: Request, res: Response) => {
  const { paymentId } = req.params;
  const { action, transaction_id, notes } = req.body; // action: 'approve' or 'reject'
  
  if (!['approve', 'reject'].includes(action)) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Invalid action. Must be "approve" or "reject".');
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get the payment
    const paymentResult = await client.query(`
      SELECT * FROM payroll_payments WHERE id = $1 AND status = 'pending'
    `, [paymentId]);
    
    if (paymentResult.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Payment not found or already processed.');
    }
    
    const newStatus = action === 'approve' ? 'completed' : 'rejected';
    
    // Update the payment status
    await client.query(`
      UPDATE payroll_payments 
      SET status = $1, transaction_id = $2, hr_notes = $3, updated_at = NOW()
      WHERE id = $4
    `, [newStatus, transaction_id || null, notes || '', paymentId]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: `Payment ${action}d successfully.`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

// Get Payroll Report
router.get('/report', authenticateToken, requireHRRole, asyncHandler(async (req: Request, res: Response) => {
  const { start_date, end_date, instructor_id } = req.query;
  const client = await pool.connect();
  
  try {
    let whereClause = "WHERE 1=1";
    let params: unknown[] = [];
    let paramIndex = 1;
    
    if (start_date) {
      whereClause += ` AND p.payment_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      whereClause += ` AND p.payment_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }
    
    if (instructor_id) {
      whereClause += ` AND p.instructor_id = $${paramIndex}`;
      params.push(instructor_id);
      paramIndex++;
    }
    
    // Get payroll summary
    const summaryResult = await client.query(`
      SELECT 
        COUNT(*) as total_payments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_payments,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount END), 0) as total_paid,
        COALESCE(AVG(CASE WHEN status = 'completed' THEN amount END), 0) as average_payment
      FROM payroll_payments p
      ${whereClause}
    `, params);
    
    // Get payments by instructor
    const byInstructorResult = await client.query(`
      SELECT 
        p.instructor_id,
        u.username as instructor_name,
        COUNT(*) as payment_count,
        COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as total_paid,
        COALESCE(AVG(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as average_payment
      FROM payroll_payments p
      JOIN users u ON p.instructor_id = u.id
      ${whereClause}
      GROUP BY p.instructor_id, u.username
      ORDER BY total_paid DESC
    `, params);
    
    // Get payments by month
    const byMonthResult = await client.query(`
      SELECT 
        EXTRACT(YEAR FROM payment_date) as year,
        EXTRACT(MONTH FROM payment_date) as month,
        COUNT(*) as payment_count,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount END), 0) as total_paid
      FROM payroll_payments p
      ${whereClause}
      GROUP BY EXTRACT(YEAR FROM payment_date), EXTRACT(MONTH FROM payment_date)
      ORDER BY year DESC, month DESC
    `, params);
    
    res.json({
      success: true,
      data: {
        summary: summaryResult.rows[0],
        byInstructor: byInstructorResult.rows,
        byMonth: byMonthResult.rows
      }
    });
  } finally {
    client.release();
  }
}));

// Get Instructor Payroll Summary
router.get('/instructor/:instructorId/summary', authenticateToken, requireHRRole, asyncHandler(async (req: Request, res: Response) => {
  const { instructorId } = req.params;
  const client = await pool.connect();
  
  try {
    // Get instructor info
    const instructorResult = await client.query(`
      SELECT username, email FROM users WHERE id = $1
    `, [instructorId]);
    
    if (instructorResult.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Instructor not found.');
    }
    
    // Get payroll summary for the instructor
    const summaryResult = await client.query(`
      SELECT 
        COUNT(*) as total_payments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount END), 0) as total_paid,
        COALESCE(AVG(CASE WHEN status = 'completed' THEN amount END), 0) as average_payment,
        MAX(payment_date) as last_payment_date
      FROM payroll_payments 
      WHERE instructor_id = $1
    `, [instructorId]);
    
    // Get recent payments
    const recentPaymentsResult = await client.query(`
      SELECT * FROM payroll_payments 
      WHERE instructor_id = $1 
      ORDER BY payment_date DESC 
      LIMIT 5
    `, [instructorId]);
    
    res.json({
      success: true,
      data: {
        instructor: instructorResult.rows[0],
        summary: summaryResult.rows[0],
        recentPayments: recentPaymentsResult.rows
      }
    });
  } finally {
    client.release();
  }
}));

export default router; 