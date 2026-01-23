import express from 'express';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware.js';
import { pool } from '../../config/database.js';
import { asyncHandler, AppError } from '../../utils/errorHandler.js';
import { errorCodes } from '../../utils/errorHandler.js';

const router = express.Router();

// Get organization details
router.get('/', authenticateToken, requireRole(['admin', 'organization']), asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM organizations WHERE id = $1',
    [req.user?.organizationId]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Organization not found');
  }

  res.json(result.rows[0]);
}));

// Update organization details
router.put('/', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  const { name, address, contact_phone, contact_email } = req.body;
  const result = await pool.query(
    `UPDATE organizations
     SET name = $1, address = $2, contact_phone = $3, contact_email = $4, updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [name, address, contact_phone, contact_email, req.user?.organizationId]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Organization not found');
  }

  res.json(result.rows[0]);
}));

// Get organization profile for the logged-in user
router.get('/profile', authenticateToken, requireRole(['organization']), asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const result = await pool.query(
    'SELECT id, name, address, contact_email, contact_phone FROM organizations WHERE id = $1',
    [req.user?.organizationId]
  );
  res.json({ success: true, data: result.rows[0] });
}));

router.put('/profile', authenticateToken, requireRole(['organization']), asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const { name, address, contact_phone, contact_email } = req.body;
  const result = await pool.query(
    'UPDATE organizations SET name = $1, address = $2, contact_phone = $3, contact_email = $4 WHERE id = $5 RETURNING *',
    [name, address, contact_phone, contact_email, req.user?.organizationId]
  );
  res.json({ success: true, data: result.rows[0] });
}));

router.get('/courses', authenticateToken, requireRole(['organization']), asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  console.log('🔍 [TRACE] Organization courses endpoint called');
  console.log('🔍 [TRACE] User:', req.user);
  console.log('🔍 [TRACE] Organization ID:', req.user?.organizationId);

  // Pagination parameters
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const offset = (page - 1) * limit;

  const query = `
    SELECT cr.*, cr.date_requested as request_submitted_date, ct.name as course_type_name, u.username as instructor,
    (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) AS students_attended
    FROM course_requests cr
    LEFT JOIN class_types ct ON cr.course_type_id = ct.id
    LEFT JOIN users u ON cr.instructor_id = u.id
    WHERE cr.organization_id = $1 AND cr.archived = false
    ORDER BY cr.created_at DESC
    LIMIT $2 OFFSET $3
  `;

  console.log('🔍 [TRACE] SQL Query:', query);
  console.log('🔍 [TRACE] Query parameters:', [req.user?.organizationId, limit, offset]);

  const result = await pool.query(query, [req.user?.organizationId, limit, offset]);

  // Get total count for pagination
  const countResult = await pool.query(
    'SELECT COUNT(*) FROM course_requests WHERE organization_id = $1 AND archived = false',
    [req.user?.organizationId]
  );
  const total = parseInt(countResult.rows[0].count);

  console.log('🔍 [TRACE] Query executed successfully');
  console.log('🔍 [TRACE] Number of rows returned:', result.rows.length);
  console.log('🔍 [TRACE] Total count:', total);

  if (result.rows.length > 0) {
    console.log('🔍 [TRACE] First row sample:');
    const firstRow = result.rows[0];
    Object.keys(firstRow).forEach(key => {
      console.log(`  🔍 [TRACE] ${key}: ${firstRow[key]} (type: ${typeof firstRow[key]})`);
    });
  }

  console.log('🔍 [TRACE] Sending response with data length:', result.rows.length);

  // Format date fields to YYYY-MM-DD
  const formatDateOnly = (dt: Date | string | null | undefined): string | null =>
    dt ? new Date(dt).toISOString().slice(0, 10) : null;

  const formatCourseRow = (row: Record<string, any>): Record<string, any> => ({
    ...row,
    scheduled_date: row.scheduled_date ? formatDateOnly(row.scheduled_date) : null,
    date_requested: row.date_requested ? formatDateOnly(row.date_requested) : null,
    confirmed_date: row.confirmed_date ? formatDateOnly(row.confirmed_date) : null,
    request_submitted_date: row.request_submitted_date ? formatDateOnly(row.request_submitted_date) : null,
  });

  res.json({
    success: true,
    data: result.rows.map(formatCourseRow),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get archived courses for the organization
router.get('/archive', authenticateToken, requireRole(['organization']), asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  console.log('🔍 [TRACE] Organization archive endpoint called');
  console.log('🔍 [TRACE] User:', req.user);
  console.log('🔍 [TRACE] Organization ID:', req.user?.organizationId);

  const query = `
    SELECT cr.*, cr.date_requested as request_submitted_date, ct.name as course_type_name, u.username as instructor,
    (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) AS students_attended
    FROM course_requests cr
    LEFT JOIN class_types ct ON cr.course_type_id = ct.id
    LEFT JOIN users u ON cr.instructor_id = u.id
    WHERE cr.organization_id = $1 AND cr.archived = true
    ORDER BY cr.archived_at DESC
  `;

  console.log('🔍 [TRACE] SQL Query:', query);
  console.log('🔍 [TRACE] Query parameters:', [req.user?.organizationId]);

  const result = await pool.query(query, [req.user?.organizationId]);

  console.log('🔍 [TRACE] Query executed successfully');
  console.log('🔍 [TRACE] Number of rows returned:', result.rows.length);

  // Format date fields to YYYY-MM-DD
  const formatDateOnly = (dt: Date | string | null | undefined): string | null =>
    dt ? new Date(dt).toISOString().slice(0, 10) : null;

  const formatCourseRow = (row: Record<string, any>): Record<string, any> => ({
    ...row,
    scheduled_date: row.scheduled_date ? formatDateOnly(row.scheduled_date) : null,
    date_requested: row.date_requested ? formatDateOnly(row.date_requested) : null,
    confirmed_date: row.confirmed_date ? formatDateOnly(row.confirmed_date) : null,
    request_submitted_date: row.request_submitted_date ? formatDateOnly(row.request_submitted_date) : null,
    archived_at: row.archived_at ? formatDateOnly(row.archived_at) : null,
  });

  res.json({ success: true, data: result.rows.map(formatCourseRow) });
}));

export default router;
