import express, { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { AppError, errorCodes } from '../../utils/errorHandler.js';
import { pool } from '../../config/database.js';

const router = express.Router();

// Middleware to ensure HR or instructor role
const requireTimesheetAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!['hr', 'instructor'].includes(req.user?.role || '')) {
    throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Access denied. HR or instructor role required.');
  }
  next();
};

// Get Timesheet Statistics (HR only)
router.get('/stats', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  if (req.user?.role !== 'hr') {
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
router.get('/', authenticateToken, requireTimesheetAccess, asyncHandler(async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { page = 1, limit = 10, status = '', instructor_id = '', month = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereClause = "WHERE 1=1";
    let params: unknown[] = [];
    let paramIndex = 1;
    
    // HR can see all timesheets, instructors can only see their own
    if (req.user!.role === 'instructor') {
      whereClause += ` AND t.instructor_id = $${paramIndex}`;
      params.push(req.user!.id);
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
router.get('/:timesheetId', authenticateToken, requireTimesheetAccess, asyncHandler(async (req: Request, res: Response) => {
  const { timesheetId } = req.params;
  const client = await pool.connect();
  
  try {
    let whereClause = "WHERE t.id = $1";
    const params: (string | number)[] = [timesheetId];

    // Instructors can only view their own timesheets
    if (req.user!.role === 'instructor') {
      whereClause += " AND t.instructor_id = $2";
      params.push(req.user!.id);
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
router.post('/', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  if (req.user!.role !== 'instructor') {
    throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Only instructors can submit timesheets.');
  }

  const {
    week_start_date,
    weekStartDate,
    total_hours,
    totalHours,
    courses_taught,
    coursesTaught,
    notes,
    travel_time,
    travelTime,
    prep_time,
    prepTime,
    teaching_hours,
    teachingHours,
    is_late,
    isLate
  } = req.body;

  // Support both snake_case and camelCase
  const weekStart = week_start_date || weekStartDate;
  const totalHrs = total_hours ?? totalHours ?? 0;
  const courseCount = courses_taught ?? coursesTaught ?? 0;
  const travelHrs = travel_time ?? travelTime ?? 0;
  const prepHrs = prep_time ?? prepTime ?? 0;
  const teachHrs = teaching_hours ?? teachingHours ?? 0;
  const lateFlag = is_late ?? isLate ?? false;

  if (!weekStart) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Week start date is required.');
  }

  // Validate that week_start_date is a Monday
  const [year, month, day] = weekStart.split('-').map(Number);
  const startDate = new Date(year, month - 1, day); // month is 0-indexed
  const dayOfWeek = startDate.getDay();
  if (dayOfWeek !== 1) { // 1 = Monday
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Week start date must be a Monday.');
  }

  // Validate that the week has ended (can't submit for future or current week)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(startDate);
  weekEnd.setDate(startDate.getDate() + 6);

  if (today <= weekEnd) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Cannot submit timesheet until the week has ended.');
  }

  const client = await pool.connect();

  try {
    // Check if timesheet already exists for this week
    const existingResult = await client.query(`
      SELECT id FROM timesheets
      WHERE instructor_id = $1 AND week_start_date = $2
    `, [req.user!.id, weekStart]);

    if (existingResult.rows.length > 0) {
      throw new AppError(400, errorCodes.RESOURCE_ALREADY_EXISTS, 'Timesheet already exists for this week.');
    }

    // Get courses for the week to include in timesheet
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // Add 6 days to get to Sunday

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
    `, [req.user!.id, weekStart, endDate.toISOString().split('T')[0]]);

    const courseDetails = coursesResult.rows;

    // Insert new timesheet with course details and new fields
    const insertResult = await client.query(`
      INSERT INTO timesheets (
        instructor_id, week_start_date, total_hours,
        courses_taught, notes, status, course_details,
        travel_time, prep_time, teaching_hours, is_late,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `, [
      req.user!.id,
      weekStart,
      totalHrs,
      courseCount,
      notes || '',
      JSON.stringify(courseDetails),
      travelHrs,
      prepHrs,
      teachHrs,
      lateFlag
    ]);

    res.json({
      success: true,
      message: lateFlag ? 'Late timesheet submitted successfully. HR will review.' : 'Timesheet submitted successfully.',
      data: {
        ...insertResult.rows[0],
        course_details: courseDetails
      }
    });
  } finally {
    client.release();
  }
}));

// Update Timesheet (Instructors only)
router.put('/:timesheetId', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  if (req.user!.role !== 'instructor') {
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
    `, [timesheetId, req.user!.id]);
    
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
    `, [total_hours, courses_taught || 0, notes || '', timesheetId, req.user!.id]);
    
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
router.post('/:timesheetId/approve', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  if (req.user!.role !== 'hr') {
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
    
    // Get the timesheet with course details
    const timesheetResult = await client.query(`
      SELECT t.*, u.username as instructor_name, u.email as instructor_email
      FROM timesheets t
      JOIN users u ON t.instructor_id = u.id
      WHERE t.id = $1 AND t.status = 'pending'
    `, [timesheetId]);
    
    if (timesheetResult.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Timesheet not found or already processed.');
    }
    
    const timesheet = timesheetResult.rows[0];
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
    // Update the timesheet status
    await client.query(`
      UPDATE timesheets 
      SET status = $1, hr_comment = $2, updated_at = NOW()
      WHERE id = $3
    `, [newStatus, comment, timesheetId]);
    
    // If approved, automatically create payment request
    let paymentRequest = null;
    if (action === 'approve') {
      try {
        // Import the service dynamically to avoid circular dependencies
        const { PaymentRequestService } = await import('../../services/paymentRequestService.js');
        paymentRequest = await PaymentRequestService.createPaymentRequest(Number(timesheetId));
      } catch (paymentError) {
        console.error('Error creating payment request:', paymentError);
        // Don't fail the timesheet approval if payment request creation fails
        // Just log the error and continue
      }
    }
    
    await client.query('COMMIT');
    
    const response: { success: boolean; message: string; data: { timesheet: typeof timesheet & { status: string; course_details: unknown[] }; paymentRequest?: typeof paymentRequest } } = {
      success: true,
      message: `Timesheet ${action}d successfully.`,
      data: {
        timesheet: {
          ...timesheet,
          status: newStatus,
          course_details: timesheet.course_details || []
        }
      }
    };

    if (paymentRequest) {
      response.data.paymentRequest = paymentRequest;
      response.message = `Timesheet approved and payment request created for $${paymentRequest.amount}.`;
    }
    
    res.json(response);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

// Get Instructor Timesheet Summary
router.get('/instructor/:instructorId/summary', authenticateToken, requireTimesheetAccess, asyncHandler(async (req: Request, res: Response) => {
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
router.get('/week/:weekStartDate/courses', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  if (req.user!.role !== 'instructor') {
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
        cr.confirmed_start_time::text as "startTime",
        cr.confirmed_end_time::text as "endTime",
        cr.status,
        cr.location,
        ct.name as "courseType",
        o.name as "organizationName",
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as "studentCount"
      FROM course_requests cr
      JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN organizations o ON cr.organization_id = o.id
      WHERE cr.instructor_id = $1
      AND cr.confirmed_date >= $2::date
      AND cr.confirmed_date <= $3::date
      AND cr.status IN ('confirmed', 'completed')
      ORDER BY cr.confirmed_date, cr.confirmed_start_time
    `, [req.user!.id, weekStartDate, endDate.toISOString().split('T')[0]]);

    res.json({
      success: true,
      data: {
        weekStartDate: weekStartDate,
        weekEndDate: endDate.toISOString().split('T')[0],
        courses: coursesResult.rows,
        totalCourses: coursesResult.rows.length
      }
    });
  } finally {
    client.release();
  }
}));

// Add Note to Timesheet
router.post('/:timesheetId/notes', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const { timesheetId } = req.params;
  const { note_text, note_type = 'general' } = req.body;
  
  if (!note_text || note_text.trim() === '') {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Note text is required.');
  }

  // Validate note type
  if (!['instructor', 'hr', 'accounting', 'general'].includes(note_type)) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Invalid note type.');
  }

  // Determine user role for note
  let userRole = req.user!.role;
  if (note_type === 'instructor' && req.user!.role !== 'instructor') {
    throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Only instructors can add instructor notes.');
  }
  if (note_type === 'hr' && req.user!.role !== 'hr') {
    throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Only HR can add HR notes.');
  }
  if (note_type === 'accounting' && req.user!.role !== 'accountant') {
    throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Only accountants can add accounting notes.');
  }

  const client = await pool.connect();
  
  try {
    // Check if timesheet exists and user has access
    let whereClause = "WHERE t.id = $1";
    const params: (string | number)[] = [timesheetId];

    // Instructors can only add notes to their own timesheets
    if (req.user!.role === 'instructor') {
      whereClause += " AND t.instructor_id = $2";
      params.push(req.user!.id);
    }
    
    const timesheetResult = await client.query(`
      SELECT t.id FROM timesheets t ${whereClause}
    `, params);
    
    if (timesheetResult.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Timesheet not found or access denied.');
    }

    // Insert the note
    const noteResult = await client.query(`
      INSERT INTO timesheet_notes (timesheet_id, user_id, user_role, note_text, note_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [timesheetId, req.user!.id, userRole, note_text.trim(), note_type]);

    // Get the note with user info
    const noteWithUserResult = await client.query(`
      SELECT 
        tn.*,
        u.username as added_by,
        u.email as added_by_email
      FROM timesheet_notes tn
      JOIN users u ON tn.user_id = u.id
      WHERE tn.id = $1
    `, [noteResult.rows[0].id]);

    res.json({
      success: true,
      message: 'Note added successfully.',
      data: noteWithUserResult.rows[0]
    });
  } finally {
    client.release();
  }
}));

// Get Timesheet Notes
router.get('/:timesheetId/notes', authenticateToken, requireTimesheetAccess, asyncHandler(async (req: Request, res: Response) => {
  const { timesheetId } = req.params;
  const client = await pool.connect();
  
  try {
    const notesResult = await client.query(`
      SELECT 
        tn.*,
        u.username as added_by,
        u.email as added_by_email
      FROM timesheet_notes tn
      JOIN users u ON tn.user_id = u.id
      WHERE tn.timesheet_id = $1
      ORDER BY tn.created_at ASC
    `, [timesheetId]);
    
    res.json({
      success: true,
      data: notesResult.rows
    });
  } finally {
    client.release();
  }
}));

// Delete Note (only by the user who created it or HR/Admin)
router.delete('/:timesheetId/notes/:noteId', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const { timesheetId, noteId } = req.params;
  const client = await pool.connect();
  
  try {
    // Get the note to check permissions
    const noteResult = await client.query(`
      SELECT tn.*, u.username as added_by
      FROM timesheet_notes tn
      JOIN users u ON tn.user_id = u.id
      WHERE tn.id = $1 AND tn.timesheet_id = $2
    `, [noteId, timesheetId]);
    
    if (noteResult.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Note not found.');
    }
    
    const note = noteResult.rows[0];
    
    // Check permissions: user can delete their own notes, HR can delete any note
    if (note.user_id !== req.user!.id && req.user!.role !== 'hr') {
      throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Cannot delete this note.');
    }
    
    await client.query(`
      DELETE FROM timesheet_notes WHERE id = $1
    `, [noteId]);
    
    res.json({
      success: true,
      message: 'Note deleted successfully.'
    });
  } finally {
    client.release();
  }
}));

// Get instructors who haven't submitted timesheets for the previous week (HR only)
router.get('/reminders/pending', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  if (req.user!.role !== 'hr') {
    throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Access denied. HR role required.');
  }

  const client = await pool.connect();

  try {
    // Calculate previous week's Monday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - daysToSubtract);
    const previousMonday = new Date(thisMonday);
    previousMonday.setDate(thisMonday.getDate() - 7);
    const previousMondayStr = previousMonday.toISOString().split('T')[0];

    // Get all instructors who don't have a timesheet for the previous week
    const result = await client.query(`
      SELECT
        u.id,
        u.username,
        u.email,
        (SELECT COUNT(*) FROM course_requests cr
         WHERE cr.instructor_id = u.id
         AND cr.confirmed_date >= $1::date
         AND cr.confirmed_date <= ($1::date + INTERVAL '6 days')
         AND cr.status = 'completed') as completed_courses
      FROM users u
      WHERE u.role = 'instructor'
      AND u.id NOT IN (
        SELECT instructor_id FROM timesheets
        WHERE week_start_date = $1::date
      )
      ORDER BY u.username
    `, [previousMondayStr]);

    res.json({
      success: true,
      data: {
        weekStartDate: previousMondayStr,
        instructorsWithoutTimesheet: result.rows
      }
    });
  } finally {
    client.release();
  }
}));

// Send reminder notifications to instructors (HR only)
router.post('/reminders/send', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  if (req.user!.role !== 'hr') {
    throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Access denied. HR role required.');
  }

  const { instructorIds } = req.body;

  if (!instructorIds || !Array.isArray(instructorIds) || instructorIds.length === 0) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Instructor IDs are required.');
  }

  const client = await pool.connect();

  try {
    // Calculate previous week's Monday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - daysToSubtract);
    const previousMonday = new Date(thisMonday);
    previousMonday.setDate(thisMonday.getDate() - 7);
    const previousMondayStr = previousMonday.toISOString().split('T')[0];

    // Create notifications for each instructor
    let sentCount = 0;
    for (const instructorId of instructorIds) {
      // Check if notification table exists, if not skip
      try {
        await client.query(`
          INSERT INTO notifications (user_id, type, title, message, created_at)
          VALUES ($1, 'timesheet_reminder', 'Timesheet Reminder',
                  $2, NOW())
          ON CONFLICT DO NOTHING
        `, [
          instructorId,
          `Please submit your timesheet for the week of ${previousMondayStr}. Timesheets are due by end of week.`
        ]);
        sentCount++;
      } catch (notifError) {
        // If notifications table doesn't exist, just log
        console.log('Notification table may not exist, skipping notification creation');
      }
    }

    res.json({
      success: true,
      message: `Reminders sent to ${sentCount} instructor(s).`,
      data: {
        sentCount,
        weekStartDate: previousMondayStr
      }
    });
  } finally {
    client.release();
  }
}));

export default router; 