import express from 'express';
import { authenticateToken } from '../../middleware/authMiddleware';
import { asyncHandler } from '../../middleware/asyncHandler';
import { AppError, errorCodes } from '../../utils/errorHandler';
import { pool } from '../../config/database';

const router = express.Router();

// Middleware to ensure HR or instructor role
const requireTimesheetAccess = (req: any, res: any, next: any) => {
  if (!['hr', 'instructor'].includes(req.user.role)) {
    throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Access denied. HR or instructor role required.');
  }
  next();
};

// Get Timesheet Statistics (HR only)
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'hr') {
    throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Access denied. HR role required.');
  }

  const client = await pool.connect();
  
  try {
    // Get pending timesheets count
    const pendingTimesheetsResult = await client.query(`
      SELECT COUNT(*) as count FROM timesheets WHERE status = 'pending'
    `);
    
    // Get approved timesheets this month
    const approvedThisMonthResult = await client.query(`
      SELECT COUNT(*) as count FROM timesheets 
      WHERE status = 'approved' 
      AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    `);
    
    // Get total hours this month
    const totalHoursResult = await client.query(`
      SELECT COALESCE(SUM(total_hours), 0) as total FROM timesheets 
      WHERE status = 'approved' 
      AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    `);
    
    // Get instructors with pending timesheets
    const instructorsWithPendingResult = await client.query(`
      SELECT COUNT(DISTINCT instructor_id) as count FROM timesheets WHERE status = 'pending'
    `);

    const stats = {
      pendingTimesheets: pendingTimesheetsResult.rows[0].count,
      approvedThisMonth: approvedThisMonthResult.rows[0].count,
      totalHoursThisMonth: totalHoursResult.rows[0].total,
      instructorsWithPending: instructorsWithPendingResult.rows[0].count
    };

    res.json({
      success: true,
      data: stats
    });
  } finally {
    client.release();
  }
}));

// Get Timesheets (with filtering)
router.get('/', authenticateToken, requireTimesheetAccess, asyncHandler(async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { page = 1, limit = 10, status = '', instructor_id = '', month = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereClause = "WHERE 1=1";
    let params: any[] = [];
    let paramIndex = 1;
    
    // HR can see all timesheets, instructors can only see their own
    if (req.user.role === 'instructor') {
      whereClause += ` AND t.instructor_id = $${paramIndex}`;
      params.push(req.user.id);
      paramIndex++;
    }
    
    if (status) {
      whereClause += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (instructor_id) {
      whereClause += ` AND t.instructor_id = $${paramIndex}`;
      params.push(instructor_id);
      paramIndex++;
    }
    
    if (month) {
      whereClause += ` AND EXTRACT(MONTH FROM t.week_start_date) = $${paramIndex}`;
      params.push(month);
      paramIndex++;
    }
    
    // Get timesheets with instructor info
    const timesheetsResult = await client.query(`
      SELECT 
        t.*,
        u.username as instructor_name,
        u.email as instructor_email
      FROM timesheets t
      JOIN users u ON t.instructor_id = u.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);
    
    // Get total count for pagination
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM timesheets t
      ${whereClause}
    `, params);
    
    res.json({
      success: true,
      data: {
        timesheets: timesheetsResult.rows,
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

// Get Timesheet Details
router.get('/:timesheetId', authenticateToken, requireTimesheetAccess, asyncHandler(async (req, res) => {
  const { timesheetId } = req.params;
  const client = await pool.connect();
  
  try {
    let whereClause = "WHERE t.id = $1";
    let params = [timesheetId];
    
    // Instructors can only view their own timesheets
    if (req.user.role === 'instructor') {
      whereClause += " AND t.instructor_id = $2";
      params.push(req.user.id);
    }
    
    const timesheetResult = await client.query(`
      SELECT 
        t.*,
        u.username as instructor_name,
        u.email as instructor_email
      FROM timesheets t
      JOIN users u ON t.instructor_id = u.id
      ${whereClause}
    `, params);
    
    if (timesheetResult.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Timesheet not found.');
    }
    
    res.json({
      success: true,
      data: timesheetResult.rows[0]
    });
  } finally {
    client.release();
  }
}));

// Submit Timesheet (Instructors only)
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'instructor') {
    throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Only instructors can submit timesheets.');
  }

  const { week_start_date, total_hours, courses_taught, notes } = req.body;
  
  if (!week_start_date) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Week start date is required.');
  }

  // Validate that week_start_date is a Monday (frontend now auto-populates this correctly)
  const [year, month, day] = week_start_date.split('-').map(Number);
  const startDate = new Date(year, month - 1, day); // month is 0-indexed
  const dayOfWeek = startDate.getDay();
  if (dayOfWeek !== 1) { // 1 = Monday
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Week start date must be a Monday.');
  }

  const client = await pool.connect();
  
  try {
    // Check if timesheet already exists for this week
    const existingResult = await client.query(`
      SELECT id FROM timesheets 
      WHERE instructor_id = $1 AND week_start_date = $2
    `, [req.user.id, week_start_date]);
    
    if (existingResult.rows.length > 0) {
      throw new AppError(400, errorCodes.RESOURCE_ALREADY_EXISTS, 'Timesheet already exists for this week.');
    }
    
    // Insert new timesheet
    const insertResult = await client.query(`
      INSERT INTO timesheets (
        instructor_id, week_start_date, total_hours, 
        courses_taught, notes, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
      RETURNING *
    `, [req.user.id, week_start_date, total_hours || 0, courses_taught || 0, notes || '']);
    
    res.json({
      success: true,
      message: 'Timesheet submitted successfully.',
      data: insertResult.rows[0]
    });
  } finally {
    client.release();
  }
}));

// Update Timesheet (Instructors only)
router.put('/:timesheetId', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'instructor') {
    throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Only instructors can update timesheets.');
  }

  const { timesheetId } = req.params;
  const { total_hours, courses_taught, notes } = req.body;
  
  const client = await pool.connect();
  
  try {
    // Check if timesheet exists and belongs to instructor
    const existingResult = await client.query(`
      SELECT id, status FROM timesheets 
      WHERE id = $1 AND instructor_id = $2
    `, [timesheetId, req.user.id]);
    
    if (existingResult.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Timesheet not found.');
    }
    
    if (existingResult.rows[0].status !== 'pending') {
      throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Cannot update approved or rejected timesheet.');
    }
    
    // Update timesheet
    const updateResult = await client.query(`
      UPDATE timesheets 
      SET total_hours = $1, courses_taught = $2, notes = $3, updated_at = NOW()
      WHERE id = $4 AND instructor_id = $5
      RETURNING *
    `, [total_hours, courses_taught || 0, notes || '', timesheetId, req.user.id]);
    
    res.json({
      success: true,
      message: 'Timesheet updated successfully.',
      data: updateResult.rows[0]
    });
  } finally {
    client.release();
  }
}));

// Approve/Reject Timesheet (HR only)
router.post('/:timesheetId/approve', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'hr') {
    throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Access denied. HR role required.');
  }

  const { timesheetId } = req.params;
  const { action, comment } = req.body; // action: 'approve' or 'reject'
  
  if (!['approve', 'reject'].includes(action)) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Invalid action. Must be "approve" or "reject".');
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get the timesheet
    const timesheetResult = await client.query(`
      SELECT * FROM timesheets WHERE id = $1 AND status = 'pending'
    `, [timesheetId]);
    
    if (timesheetResult.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Timesheet not found or already processed.');
    }
    
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
    // Update the timesheet status
    await client.query(`
      UPDATE timesheets 
      SET status = $1, hr_comment = $2, updated_at = NOW()
      WHERE id = $3
    `, [newStatus, comment, timesheetId]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: `Timesheet ${action}d successfully.`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

// Get Instructor Timesheet Summary
router.get('/instructor/:instructorId/summary', authenticateToken, requireTimesheetAccess, asyncHandler(async (req, res) => {
  const { instructorId } = req.params;
  const client = await pool.connect();
  
  try {
    // Get timesheet summary for the instructor
    const summaryResult = await client.query(`
      SELECT 
        COUNT(*) as total_timesheets,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_timesheets,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_timesheets,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_timesheets,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN total_hours END), 0) as total_approved_hours,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN courses_taught END), 0) as total_courses_taught,
        MAX(created_at) as last_submission_date
      FROM timesheets 
      WHERE instructor_id = $1
    `, [instructorId]);
    
    // Get recent timesheets
    const recentTimesheetsResult = await client.query(`
      SELECT * FROM timesheets 
      WHERE instructor_id = $1 
      ORDER BY created_at DESC 
      LIMIT 5
    `, [instructorId]);
    
    res.json({
      success: true,
      data: {
        summary: summaryResult.rows[0],
        recentTimesheets: recentTimesheetsResult.rows
      }
    });
  } finally {
    client.release();
  }
}));

// Get courses for a specific week (Monday to Sunday)
router.get('/week/:weekStartDate/courses', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'instructor') {
    throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Only instructors can access this endpoint.');
  }

  const { weekStartDate } = req.params;
  
  // Validate that weekStartDate is a Monday (frontend now auto-populates this correctly)
  const [year, month, day] = weekStartDate.split('-').map(Number);
  const startDate = new Date(year, month - 1, day); // month is 0-indexed
  const dayOfWeek = startDate.getDay();
  if (dayOfWeek !== 1) { // 1 = Monday
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Week start date must be a Monday.');
  }

  // Calculate the end of the week (Sunday)
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6); // Add 6 days to get to Sunday

  const client = await pool.connect();
  
  try {
    // Get courses for the week (Monday to Sunday)
    const coursesResult = await client.query(`
      SELECT 
        cr.id,
        cr.confirmed_date::text as date,
        cr.confirmed_start_time::text as start_time,
        cr.confirmed_end_time::text as end_time,
        cr.status,
        cr.location,
        ct.name as course_type,
        o.name as organization_name,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as student_count
      FROM course_requests cr
      JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN organizations o ON cr.organization_id = o.id
      WHERE cr.instructor_id = $1
      AND cr.confirmed_date >= $2::date
      AND cr.confirmed_date <= $3::date
      AND cr.status IN ('confirmed', 'completed')
      ORDER BY cr.confirmed_date, cr.confirmed_start_time
    `, [req.user.id, weekStartDate, endDate.toISOString().split('T')[0]]);
    
    res.json({
      success: true,
      data: {
        week_start_date: weekStartDate,
        week_end_date: endDate.toISOString().split('T')[0],
        courses: coursesResult.rows,
        total_courses: coursesResult.rows.length
      }
    });
  } finally {
    client.release();
  }
}));

export default router; 