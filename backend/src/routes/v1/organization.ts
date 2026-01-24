import express, { Request, Response } from 'express';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware.js';
import { pool } from '../../config/database.js';
import { asyncHandler, AppError } from '../../utils/errorHandler.js';
import { errorCodes } from '../../utils/errorHandler.js';
import { ApiResponseBuilder } from '../../utils/apiResponse.js';
import { keysToCamel } from '../../utils/caseConverter.js';
import { devLog } from '../../utils/devLog.js';

const router = express.Router();

// Get organization details
router.get('/', authenticateToken, requireRole(['admin', 'organization']), asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM organizations WHERE id = $1',
    [req.user?.organizationId]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Organization not found');
  }

  res.json(ApiResponseBuilder.success(keysToCamel(result.rows[0])));
}));

// Update organization details
router.put('/', authenticateToken, requireRole(['admin']), asyncHandler(async (req: Request, res: Response) => {
  // Accept both camelCase and snake_case for backwards compatibility
  const { name, address, contact_phone, contactPhone, contact_email, contactEmail } = req.body;
  const phoneValue = contactPhone !== undefined ? contactPhone : contact_phone;
  const emailValue = contactEmail !== undefined ? contactEmail : contact_email;
  const result = await pool.query(
    `UPDATE organizations
     SET name = $1, address = $2, contact_phone = $3, contact_email = $4, updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [name, address, phoneValue, emailValue, req.user?.organizationId]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Organization not found');
  }

  res.json(ApiResponseBuilder.success(keysToCamel(result.rows[0])));
}));

// Get organization profile for the logged-in user
router.get('/profile', authenticateToken, requireRole(['organization']), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const result = await pool.query(
    'SELECT id, name, address, contact_email, contact_phone FROM organizations WHERE id = $1',
    [req.user?.organizationId]
  );
  res.json(ApiResponseBuilder.success(keysToCamel(result.rows[0])));
}));

router.put('/profile', authenticateToken, requireRole(['organization']), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  // Accept both camelCase and snake_case for backwards compatibility
  const { name, address, contact_phone, contactPhone, contact_email, contactEmail } = req.body;
  const phoneValue = contactPhone !== undefined ? contactPhone : contact_phone;
  const emailValue = contactEmail !== undefined ? contactEmail : contact_email;
  const result = await pool.query(
    'UPDATE organizations SET name = $1, address = $2, contact_phone = $3, contact_email = $4 WHERE id = $5 RETURNING *',
    [name, address, phoneValue, emailValue, req.user?.organizationId]
  );
  res.json(ApiResponseBuilder.success(keysToCamel(result.rows[0])));
}));

router.get('/courses', authenticateToken, requireRole(['organization']), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  devLog('🔍 [TRACE] Organization courses endpoint called');
  devLog('🔍 [TRACE] User:', req.user);
  devLog('🔍 [TRACE] Organization ID:', req.user?.organizationId);

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

  devLog('🔍 [TRACE] SQL Query:', query);
  devLog('🔍 [TRACE] Query parameters:', [req.user?.organizationId, limit, offset]);

  const result = await pool.query(query, [req.user?.organizationId, limit, offset]);

  // Get total count for pagination
  const countResult = await pool.query(
    'SELECT COUNT(*) FROM course_requests WHERE organization_id = $1 AND archived = false',
    [req.user?.organizationId]
  );
  const total = parseInt(countResult.rows[0].count);

  devLog('🔍 [TRACE] Query executed successfully');
  devLog('🔍 [TRACE] Number of rows returned:', result.rows.length);
  devLog('🔍 [TRACE] Total count:', total);

  if (result.rows.length > 0) {
    devLog('🔍 [TRACE] First row sample:');
    const firstRow = result.rows[0];
    Object.keys(firstRow).forEach(key => {
      devLog(`  🔍 [TRACE] ${key}: ${firstRow[key]} (type: ${typeof firstRow[key]})`);
    });
  }

  devLog('🔍 [TRACE] Sending response with data length:', result.rows.length);

  // Format date fields to YYYY-MM-DD
  const formatDateOnly = (dt: Date | string | null | undefined): string | null =>
    dt ? new Date(dt).toISOString().slice(0, 10) : null;

  const formatCourseRow = (row: Record<string, any>): Record<string, any> => ({
    ...row,
    scheduledDate: row.scheduledDate ? formatDateOnly(row.scheduledDate) : null,
    dateRequested: row.dateRequested ? formatDateOnly(row.dateRequested) : null,
    confirmedDate: row.confirmedDate ? formatDateOnly(row.confirmedDate) : null,
    requestSubmittedDate: row.requestSubmittedDate ? formatDateOnly(row.requestSubmittedDate) : null,
  });

  // Convert to camelCase first, then format dates
  const camelData = keysToCamel(result.rows);
  res.json(ApiResponseBuilder.paginate(camelData.map(formatCourseRow), page, limit, total));
}));

// Get archived courses for the organization
router.get('/archive', authenticateToken, requireRole(['organization']), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  devLog('🔍 [TRACE] Organization archive endpoint called');
  devLog('🔍 [TRACE] User:', req.user);
  devLog('🔍 [TRACE] Organization ID:', req.user?.organizationId);

  const query = `
    SELECT cr.*, cr.date_requested as request_submitted_date, ct.name as course_type_name, u.username as instructor,
    (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) AS students_attended
    FROM course_requests cr
    LEFT JOIN class_types ct ON cr.course_type_id = ct.id
    LEFT JOIN users u ON cr.instructor_id = u.id
    WHERE cr.organization_id = $1 AND cr.archived = true
    ORDER BY cr.archived_at DESC
  `;

  devLog('🔍 [TRACE] SQL Query:', query);
  devLog('🔍 [TRACE] Query parameters:', [req.user?.organizationId]);

  const result = await pool.query(query, [req.user?.organizationId]);

  devLog('🔍 [TRACE] Query executed successfully');
  devLog('🔍 [TRACE] Number of rows returned:', result.rows.length);

  // Format date fields to YYYY-MM-DD
  const formatDateOnly = (dt: Date | string | null | undefined): string | null =>
    dt ? new Date(dt).toISOString().slice(0, 10) : null;

  const formatArchiveRow = (row: Record<string, any>): Record<string, any> => ({
    ...row,
    scheduledDate: row.scheduledDate ? formatDateOnly(row.scheduledDate) : null,
    dateRequested: row.dateRequested ? formatDateOnly(row.dateRequested) : null,
    confirmedDate: row.confirmedDate ? formatDateOnly(row.confirmedDate) : null,
    requestSubmittedDate: row.requestSubmittedDate ? formatDateOnly(row.requestSubmittedDate) : null,
    archivedAt: row.archivedAt ? formatDateOnly(row.archivedAt) : null,
  });

  // Convert to camelCase first, then format dates
  const camelData = keysToCamel(result.rows);
  res.json(ApiResponseBuilder.success(camelData.map(formatArchiveRow)));
}));

export default router;
