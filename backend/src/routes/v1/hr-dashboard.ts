import express from 'express';
import { authenticateToken } from '../../middleware/authMiddleware';
import { asyncHandler } from '../../middleware/asyncHandler';
import { AppError, errorCodes } from '../../utils/errorHandler';
import { pool } from '../../config/database';

const router = express.Router();

// Middleware to ensure HR role
const requireHRRole = (req: any, res: any, next: any) => {
  if (req.user.role !== 'hr') {
    throw new AppError(403, errorCodes.ACCESS_DENIED, 'Access denied. HR role required.');
  }
  next();
};

// Get HR Dashboard Statistics
router.get('/stats', authenticateToken, requireHRRole, asyncHandler(async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Get pending profile changes count
    const pendingChangesResult = await client.query(`
      SELECT COUNT(*) as count FROM profile_changes WHERE status = 'pending'
    `);
    
    // Get active instructors count
    const activeInstructorsResult = await client.query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'instructor' AND id IN (
        SELECT DISTINCT instructor_id FROM course_requests 
        WHERE status IN ('confirmed', 'completed') 
        AND created_at >= NOW() - INTERVAL '30 days'
      )
    `);
    
    // Get organizations count
    const organizationsResult = await client.query(`
      SELECT COUNT(*) as count FROM organizations
    `);
    
    // Get expiring certifications (mock data for now)
    const expiringCertificationsResult = await client.query(`
      SELECT COUNT(*) as count FROM certifications 
      WHERE expiration_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
    `);
    
    // Get recent profile changes
    const recentChangesResult = await client.query(`
      SELECT pc.*, u.username, u.email, u.role
      FROM profile_changes pc
      JOIN users u ON pc.user_id = u.id
      ORDER BY pc.created_at DESC
      LIMIT 5
    `);
    
    // Get pending approvals
    const pendingApprovalsResult = await client.query(`
      SELECT pc.*, u.username, u.email, u.role
      FROM profile_changes pc
      JOIN users u ON pc.user_id = u.id
      WHERE pc.status = 'pending'
      ORDER BY pc.created_at ASC
    `);

    const stats = {
      pendingApprovals: pendingChangesResult.rows[0].count,
      activeInstructors: activeInstructorsResult.rows[0].count,
      organizations: organizationsResult.rows[0].count,
      expiringCertifications: expiringCertificationsResult.rows[0].count,
      recentChanges: recentChangesResult.rows,
      pendingApprovalsList: pendingApprovalsResult.rows
    };

    res.json({
      success: true,
      data: stats
    });
  } finally {
    client.release();
  }
}));

// Get Instructor Profiles
router.get('/instructors', authenticateToken, requireHRRole, asyncHandler(async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereClause = "WHERE u.role = 'instructor'";
    let params: any[] = [];
    
    if (search) {
      whereClause += " AND (u.username ILIKE $1 OR u.email ILIKE $1)";
      params.push(`%${search}%`);
    }
    
    // Get instructors with their stats
    const instructorsResult = await client.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.phone,
        u.created_at,
        u.updated_at,
        COUNT(DISTINCT cr.id) as total_courses,
        COUNT(DISTINCT CASE WHEN cr.status = 'completed' THEN cr.id END) as completed_courses,
        COUNT(DISTINCT CASE WHEN cr.status = 'confirmed' THEN cr.id END) as active_courses,
        MAX(cr.completed_at) as last_course_date
      FROM users u
      LEFT JOIN course_requests cr ON u.id = cr.instructor_id
      ${whereClause}
      GROUP BY u.id, u.username, u.email, u.phone, u.created_at, u.updated_at
      ORDER BY u.username
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
    
    // Get total count for pagination
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `, params);
    
    res.json({
      success: true,
      data: {
        instructors: instructorsResult.rows,
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

// Get Organization Profiles
router.get('/organizations', authenticateToken, requireHRRole, asyncHandler(async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereClause = "WHERE 1=1";
    let params: any[] = [];
    
    if (search) {
      whereClause += " AND (o.name ILIKE $1 OR o.contact_email ILIKE $1)";
      params.push(`%${search}%`);
    }
    
    // Get organizations with their stats
    const organizationsResult = await client.query(`
      SELECT 
        o.id,
        o.name,
        o.contact_email,
        o.contact_phone,
        o.address,
        o.created_at,
        o.updated_at,
        COUNT(DISTINCT cr.id) as total_courses,
        COUNT(DISTINCT CASE WHEN cr.status = 'completed' THEN cr.id END) as completed_courses,
        COUNT(DISTINCT CASE WHEN cr.status = 'confirmed' THEN cr.id END) as active_courses,
        COUNT(DISTINCT u.id) as total_users,
        MAX(cr.created_at) as last_course_date
      FROM organizations o
      LEFT JOIN course_requests cr ON o.id = cr.organization_id
      LEFT JOIN users u ON o.id = u.organization_id
      ${whereClause}
      GROUP BY o.id, o.name, o.contact_email, o.contact_phone, o.address, o.created_at, o.updated_at
      ORDER BY o.name
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
    
    // Get total count for pagination
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM organizations o
      ${whereClause}
    `, params);
    
    res.json({
      success: true,
      data: {
        organizations: organizationsResult.rows,
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

// Get Pending Profile Changes
router.get('/pending-changes', authenticateToken, requireHRRole, asyncHandler(async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const pendingChangesResult = await client.query(`
      SELECT 
        pc.*,
        u.username,
        u.email,
        u.role,
        o.name as organization_name
      FROM profile_changes pc
      JOIN users u ON pc.user_id = u.id
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE pc.status = 'pending'
      ORDER BY pc.created_at ASC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    // Get total count for pagination
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM profile_changes pc
      WHERE pc.status = 'pending'
    `);
    
    res.json({
      success: true,
      data: {
        pendingChanges: pendingChangesResult.rows,
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

// Approve/Reject Profile Change
router.post('/approve-change/:changeId', authenticateToken, requireHRRole, asyncHandler(async (req, res) => {
  const { changeId } = req.params;
  const { action, comment } = req.body; // action: 'approve' or 'reject'
  
  if (!['approve', 'reject'].includes(action)) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Invalid action. Must be "approve" or "reject".');
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get the profile change
    const changeResult = await client.query(`
      SELECT * FROM profile_changes WHERE id = $1 AND status = 'pending'
    `, [changeId]);
    
    if (changeResult.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Profile change not found or already processed.');
    }
    
    const change = changeResult.rows[0];
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
    // Update the profile change status
    await client.query(`
      UPDATE profile_changes 
      SET status = $1, hr_comment = $2, updated_at = NOW()
      WHERE id = $3
    `, [newStatus, comment, changeId]);
    
    // If approved, update the user's profile
    if (action === 'approve') {
      await client.query(`
        UPDATE users 
        SET ${change.field_name} = $1, updated_at = NOW()
        WHERE id = $2
      `, [change.new_value, change.user_id]);
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: `Profile change ${action}d successfully.`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

// Get User Profile Details
router.get('/user/:userId', authenticateToken, requireHRRole, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const client = await pool.connect();
  
  try {
    // Get user details
    const userResult = await client.query(`
      SELECT 
        u.*,
        o.name as organization_name
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = $1
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'User not found.');
    }
    
    const user = userResult.rows[0];
    
    // Get user's profile changes history
    const changesResult = await client.query(`
      SELECT * FROM profile_changes 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [userId]);
    
    // Get user's course history (if instructor)
    let courseHistory = [];
    if (user.role === 'instructor') {
      const courseResult = await client.query(`
        SELECT 
          cr.*,
          ct.name as course_type_name,
          o.name as organization_name
        FROM course_requests cr
        LEFT JOIN class_types ct ON cr.course_type_id = ct.id
        LEFT JOIN organizations o ON cr.organization_id = o.id
        WHERE cr.instructor_id = $1
        ORDER BY cr.created_at DESC
        LIMIT 10
      `, [userId]);
      courseHistory = courseResult.rows;
    }
    
    res.json({
      success: true,
      data: {
        user,
        profileChanges: changesResult.rows,
        courseHistory
      }
    });
  } finally {
    client.release();
  }
}));

// Get returned payment requests for HR review
router.get('/returned-payment-requests', authenticateToken, requireHRRole, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  
  const client = await pool.connect();
  
  try {
    // Get returned payment requests with details
    const requestsResult = await client.query(`
      SELECT 
        pr.*,
        u.username as instructor_name,
        u.email as instructor_email,
        t.week_start_date,
        t.total_hours,
        t.courses_taught,
        t.hr_comment as timesheet_comment,
        -- Calculate payment breakdown
        CASE 
          WHEN ipr.hourly_rate IS NOT NULL THEN ipr.hourly_rate 
          ELSE 25.00 
        END as hourly_rate,
        CASE 
          WHEN ipr.course_bonus IS NOT NULL THEN ipr.course_bonus 
          ELSE 50.00 
        END as course_bonus,
        (t.total_hours * COALESCE(ipr.hourly_rate, 25.00)) as base_amount,
        (t.courses_taught * COALESCE(ipr.course_bonus, 50.00)) as bonus_amount,
        COALESCE(prt.name, 'Default') as tier_name
      FROM payment_requests pr
      JOIN users u ON pr.instructor_id = u.id
      JOIN timesheets t ON pr.timesheet_id = t.id
      LEFT JOIN instructor_pay_rates ipr ON ipr.instructor_id = pr.instructor_id 
        AND ipr.is_active = true 
        AND ipr.effective_date <= t.week_start_date
        AND (ipr.end_date IS NULL OR ipr.end_date >= t.week_start_date)
      LEFT JOIN pay_rate_tiers prt ON ipr.tier_id = prt.id
      WHERE pr.status = 'returned_to_hr'
      ORDER BY pr.updated_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    // Get total count for pagination
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM payment_requests 
      WHERE status = 'returned_to_hr'
    `);
    
    res.json({
      success: true,
      data: {
        requests: requestsResult.rows,
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

// HR process returned payment request (override/final reject)
router.post('/returned-payment-requests/:requestId/process', authenticateToken, requireHRRole, asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { action, notes } = req.body; // action: 'override_approve' or 'final_reject'
  
  if (!['override_approve', 'final_reject'].includes(action)) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Invalid action. Must be "override_approve" or "final_reject".');
  }
  
  if (!notes?.trim()) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Notes are required when processing returned payment request.');
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get the payment request
    const requestResult = await client.query(`
      SELECT * FROM payment_requests WHERE id = $1 AND status = 'returned_to_hr'
    `, [requestId]);
    
    if (requestResult.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Returned payment request not found or already processed.');
    }
    
    const newStatus = action === 'override_approve' ? 'approved' : 'rejected';
    const hrNotes = `HR Decision (${action === 'override_approve' ? 'Override' : 'Final Reject'}): ${notes}`;
    
    // Update the payment request status
    await client.query(`
      UPDATE payment_requests 
      SET status = $1, notes = $2, updated_at = NOW()
      WHERE id = $3
    `, [newStatus, hrNotes, requestId]);
    
    // If overriding to approve, also update the corresponding payroll payment
    if (action === 'override_approve') {
      await client.query(`
        UPDATE payroll_payments 
        SET status = 'completed', updated_at = NOW()
        WHERE id = (
          SELECT id FROM payroll_payments 
          WHERE instructor_id = $1 AND amount = $2 AND status = 'pending'
          ORDER BY created_at DESC
          LIMIT 1
        )
      `, [requestResult.rows[0].instructor_id, requestResult.rows[0].amount]);
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: `Payment request ${action === 'override_approve' ? 'approved by HR override' : 'finally rejected by HR'} successfully.`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

export default router; 