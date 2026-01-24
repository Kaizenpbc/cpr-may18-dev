import express, { Request, Response } from 'express';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware.js';
import { pool } from '../../config/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ocrService } from '../../services/ocrService.js';
import { vendorDetectionService } from '../../services/vendorDetectionService.js';
import pdfGenerationService from '../../services/pdfGenerationService.js';
import { asyncHandler, AppError, errorCodes } from '../../utils/errorHandler.js';
import { ApiResponseBuilder } from '../../utils/apiResponse.js';
import { keysToCamel } from '../../utils/caseConverter.js';
import { devLog } from '../../utils/devLog.js';

const router = express.Router();

// Get all vendors for dropdown selection
router.get('/vendors', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT id, name as vendor_name, vendor_type FROM vendors WHERE is_active = true ORDER BY name'
  );
  res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
}));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/vendor-invoices';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'invoice-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype === 'text/html') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get vendor profile
router.get('/profile', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }

  // Get user email from database using user ID
  const userResult = await pool.query(
    'SELECT email FROM users WHERE id = $1',
    [req.user.id]
  );

  if (userResult.rows.length === 0) {
    throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'User not found');
  }

  const userEmail = userResult.rows[0].email;

  const result = await pool.query(
    'SELECT * FROM vendors WHERE contact_email = $1',
    [userEmail]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Vendor not found');
  }

  res.json(ApiResponseBuilder.success(keysToCamel(result.rows[0])));
}));

// Update vendor profile
router.put('/profile', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }

  const {
    vendor_name,
    contact_first_name,
    contact_last_name,
    phone,
    address_street,
    address_city,
    address_province,
    address_postal_code,
    vendor_type
  } = req.body;

  // Get user email from database using user ID
  const userResult = await pool.query(
    'SELECT email FROM users WHERE id = $1',
    [req.user.id]
  );

  if (userResult.rows.length === 0) {
    throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'User not found');
  }

  const userEmail = userResult.rows[0].email;

  const result = await pool.query(
    'SELECT id FROM vendors WHERE contact_email = $1',
    [userEmail]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Vendor not found');
  }

  await pool.query(
    `UPDATE vendors
     SET vendor_name = $1,
         contact_first_name = $2,
         contact_last_name = $3,
         phone = $4,
         address_street = $5,
         address_city = $6,
         address_province = $7,
         address_postal_code = $8,
         vendor_type = $9,
         updated_at = NOW()
     WHERE contact_email = $10`,
    [
      vendor_name,
      contact_first_name,
      contact_last_name,
      phone,
      address_street,
      address_city,
      address_province,
      address_postal_code,
      vendor_type,
      userEmail
    ]
  );

  res.json({ message: 'Profile updated successfully' });
}));

// Get vendor dashboard stats
router.get('/dashboard', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }

  devLog('[VENDOR DEBUG] User object:', req.user);

  // Get user email and role from database using user ID
  const userResult = await pool.query(
    'SELECT email, role FROM users WHERE id = $1',
    [req.user.id]
  );

  if (userResult.rows.length === 0) {
    devLog('[VENDOR DEBUG] User not found in database');
    throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'User not found');
  }

  const userEmail = userResult.rows[0].email;
  const userRole = userResult.rows[0].role;

  devLog('[VENDOR DEBUG] User email from database:', userEmail);
  devLog('[VENDOR DEBUG] User role from database:', userRole);

  // Check if user has vendor role
  if (userRole !== 'vendor') {
    devLog('[VENDOR DEBUG] Access denied - user role is not vendor:', userRole);
    throw new AppError(403, errorCodes.ACCESS_DENIED, 'Access denied. Vendor role required.');
  }

  const vendorResult = await pool.query(
    'SELECT id FROM vendors WHERE contact_email = $1',
    [userEmail]
  );

  devLog('[VENDOR DEBUG] Vendor query result:', vendorResult.rows);

  if (vendorResult.rows.length === 0) {
    devLog('[VENDOR DEBUG] No vendor found for email:', userEmail);
    throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Vendor not found');
  }

  const vendorId = vendorResult.rows[0].id;

  const [pendingResult, totalResult, paidResult, avgResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) as count FROM vendor_invoices
       WHERE vendor_id = $1 AND status = 'submitted'`,
      [vendorId]
    ),
    pool.query(
      'SELECT COUNT(*) as count FROM vendor_invoices WHERE vendor_id = $1',
      [vendorId]
    ),
    pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM vendor_invoices WHERE vendor_id = $1 AND status = $2',
      [vendorId, 'paid']
    ),
    pool.query(
      `SELECT COALESCE(AVG(EXTRACT(DAY FROM (payment_date - created_at))), 0) as avg_days
       FROM vendor_invoices
       WHERE vendor_id = $1 AND status = $2 AND payment_date IS NOT NULL`,
      [vendorId, 'paid']
    )
  ]);

  res.json({
    pendingInvoices: parseInt(pendingResult.rows[0].count) || 0,
    totalInvoices: parseInt(totalResult.rows[0].count) || 0,
    totalPaid: parseFloat(paidResult.rows[0].total) || 0,
    averagePaymentTime: Math.round(parseFloat(avgResult.rows[0].avg_days) || 0)
  });
}));

// Get vendor invoices
router.get('/invoices', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }

  // Get user email and role from database using user ID
  const userResult = await pool.query(
    'SELECT email, role FROM users WHERE id = $1',
    [req.user.id]
  );

  if (userResult.rows.length === 0) {
    throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'User not found');
  }

  const userEmail = userResult.rows[0].email;
  const userRole = userResult.rows[0].role;

  devLog('🔍 [VENDOR INVOICES] User info:', {
    id: req.user.id,
    email: userEmail,
    role: userRole
  });

  // Check if user has vendor role
  if (userRole !== 'vendor') {
    devLog('🔍 [VENDOR INVOICES] Access denied - user role is not vendor:', userRole);
    throw new AppError(403, errorCodes.ACCESS_DENIED, 'Access denied. Vendor role required.');
  }

  // Check if this is a vendor user (GTACPR employee who manages all vendor invoices)
  const isVendorUser = userRole === 'vendor';

  devLog('🔍 [VENDOR INVOICES] isVendorUser:', isVendorUser);

  let vendorId = null;
  const params: (string | number)[] = [];
  let paramIndex = 1;

  if (!isVendorUser) {
    // For regular vendors, get their specific vendor ID
    const vendorResult = await pool.query(
      'SELECT id FROM vendors WHERE contact_email = $1',
      [userEmail]
    );

    if (vendorResult.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Vendor not found');
    }

    vendorId = vendorResult.rows[0].id;
  }

  const { status, search } = req.query;

  // Build query to get invoices
  let query = `
    SELECT
      vi.*,
      v.name as company,
      v.name as billing_company,
      COALESCE(vi.rate, 0) as rate,
      COALESCE(vi.amount, 0) as amount,
      COALESCE(vi.subtotal, vi.amount) as subtotal,
      COALESCE(vi.hst, 0) as hst,
      COALESCE(vi.total, vi.amount) as total
    FROM vendor_invoices vi
    LEFT JOIN vendors v ON vi.vendor_id = v.id
  `;

  // Add WHERE clause based on user type
  if (isVendorUser) {
    // Vendor user (GTACPR employee) can see ALL vendor invoices
    query += ' WHERE 1=1';
  } else {
    // Regular vendor can only see their own invoices
    query += ` WHERE vi.vendor_id = $${paramIndex}`;
    params.push(vendorId);
    paramIndex++;
  }

  if (status) {
    query += ` AND vi.status = $${paramIndex}`;
    params.push(status as string);
    paramIndex++;
  }

  if (search) {
    query += ` AND (vi.invoice_number ILIKE $${paramIndex} OR vi.description ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  query += ' ORDER BY vi.created_at DESC';

  devLog('🔍 [VENDOR INVOICES] Query:', query);
  devLog('🔍 [VENDOR INVOICES] Params:', params);
  devLog('🔍 [VENDOR INVOICES] isVendorUser:', isVendorUser);

  const result = await pool.query(query, params);
  devLog('🔍 [VENDOR INVOICES] Result rows:', result.rows.length);

  res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
}));

// Submit new invoice
router.post('/invoices', authenticateToken, upload.single('invoice_pdf'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }

  const {
    invoice_number,
    amount,
    description,
    date, // Frontend sends 'date', not 'invoice_date'
    due_date,
    manual_type,
    quantity,
    detected_vendor_id // New field for vendor detection
  } = req.body;

  // Map 'date' to 'invoice_date' for database
  const invoice_date = date;

  if (!req.file) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Invoice PDF is required');
  }

  // Get user email from database using user ID
  const userResult = await pool.query(
    'SELECT email FROM users WHERE id = $1',
    [req.user.id]
  );

  if (userResult.rows.length === 0) {
    throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'User not found');
  }

  const userEmail = userResult.rows[0].email;

  // 🔍 PHASE 2: Vendor Detection Integration
  let vendor_id;

  if (detected_vendor_id && detected_vendor_id !== '') {
    // Use detected vendor ID if provided and valid
    devLog('🔍 [VENDOR DETECTION] Using detected vendor ID:', detected_vendor_id);

    const detectedVendorResult = await pool.query(
      'SELECT id FROM vendors WHERE id = $1 AND is_active = true',
      [detected_vendor_id]
    );

    if (detectedVendorResult.rows.length > 0) {
      vendor_id = detectedVendorResult.rows[0].id;
      devLog('✅ [VENDOR DETECTION] Using detected vendor ID:', vendor_id);
    } else {
      devLog('⚠️ [VENDOR DETECTION] Detected vendor ID not found, falling back to authenticated user');
      // Fall back to authenticated user's vendor ID
      const vendorResult = await pool.query(
        'SELECT id FROM vendors WHERE contact_email = $1 AND is_active = true',
        [userEmail]
      );

      if (vendorResult.rows.length === 0) {
        throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Vendor not found or inactive');
      }
      vendor_id = vendorResult.rows[0].id;
    }
  } else {
    // Use authenticated user's vendor ID (fallback)
    devLog('🔍 [VENDOR DETECTION] No detected vendor ID, using authenticated user');
    const vendorResult = await pool.query(
      'SELECT id FROM vendors WHERE contact_email = $1 AND is_active = true',
      [userEmail]
    );

    if (vendorResult.rows.length === 0) {
      throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Vendor not found or inactive');
    }
    vendor_id = vendorResult.rows[0].id;
  }

  const result = await pool.query(
    `INSERT INTO vendor_invoices (
      vendor_id, invoice_number, amount, description, invoice_date, due_date,
      manual_type, quantity, pdf_filename, status, rate, subtotal, hst, total,
      submitted_by, submitted_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
    RETURNING id`,
    [
      vendor_id, // Use authenticated user's vendor ID
      invoice_number,
      parseFloat(amount),
      description,
      invoice_date,
      due_date,
      manual_type,
      quantity ? parseInt(quantity) : null,
      req.file.filename,
      'pending_submission', // Vendor uploads, can review before submitting to admin
      parseFloat(req.body.rate) || 0,
      parseFloat(req.body.subtotal) || parseFloat(amount),
      parseFloat(req.body.hst) || 0,
      parseFloat(req.body.total) || parseFloat(amount),
      req.user.id // submitted_by - user ID who submitted the invoice
    ]
  );

  res.status(201).json({
    success: true,
    message: 'Invoice submitted successfully',
    invoice_id: result.rows[0].id
  });
}));

// OCR endpoint for scanning invoices
router.post('/invoices/scan', authenticateToken, upload.single('invoice_pdf'), asyncHandler(async (req: Request, res: Response) => {
  devLog('🔍 [VENDOR OCR] Starting invoice scan request');

  if (!req.file) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Invoice PDF is required');
  }

  // Extract text from PDF or HTML
  const extractedText = await ocrService.extractTextFromFile(req.file.path);

  // Extract structured data from text
  const extractedData = await ocrService.extractInvoiceData(extractedText);

  // 🔍 PHASE 1: Enhanced OCR with Vendor Detection
  devLog('🔍 [VENDOR DETECTION] Starting vendor auto-detection...');

  // Detect vendor from extracted vendor name
  const vendorDetection = await vendorDetectionService.detectVendor(extractedData.vendorName);

  // Add vendor detection results to the response
  const enhancedData = {
    ...extractedData,
    vendorDetection: {
      detectedVendorId: vendorDetection.vendorId,
      detectedVendorName: vendorDetection.vendorName,
      confidence: vendorDetection.confidence,
      detectedName: vendorDetection.detectedName,
      allMatches: vendorDetection.allMatches
    }
  };

  devLog('✅ [VENDOR OCR] Invoice scan completed with vendor detection');
  devLog('📊 [VENDOR DETECTION] Results:', {
    extractedVendorName: extractedData.vendorName,
    detectedVendor: vendorDetection.vendorName,
    confidence: `${(vendorDetection.confidence * 100).toFixed(1)}%`
  });

  res.json({
    success: true,
    data: enhancedData,
    message: 'Invoice scanned successfully with vendor detection'
  });
}));

// Get specific invoice
router.get('/invoices/:id', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }

  // Get user email from database using user ID
  const userResult = await pool.query(
    'SELECT email FROM users WHERE id = $1',
    [req.user.id]
  );

  if (userResult.rows.length === 0) {
    throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'User not found');
  }

  // 🔍 PHASE 3: Allow GTACPR staff to view any invoice (not just their own vendor's invoices)
  // This allows GTACPR staff to see all invoices they uploaded on behalf of any vendor
  const result = await pool.query(`
    SELECT
      vi.*,
      v.name as company,
      v.name as billing_company,
      COALESCE(vi.rate, 0) as rate,
      COALESCE(vi.amount, 0) as amount,
      COALESCE(vi.subtotal, vi.amount) as subtotal,
      COALESCE(vi.hst, 0) as hst,
      COALESCE(vi.total, vi.amount) as total,
      u_approved.username as approved_by_name,
      u_approved.email as approved_by_email,
      COALESCE(payments.total_paid, 0) as total_paid,
      (COALESCE(vi.total, vi.amount) - COALESCE(payments.total_paid, 0)) as balance_due
    FROM vendor_invoices vi
    LEFT JOIN vendors v ON vi.vendor_id = v.id
    LEFT JOIN users u_approved ON vi.approved_by = u_approved.id
    LEFT JOIN (
      SELECT
        vendor_invoice_id,
        SUM(amount) as total_paid
      FROM vendor_payments
      WHERE status = 'processed'
      GROUP BY vendor_invoice_id
    ) payments ON payments.vendor_invoice_id = vi.id
    WHERE vi.id = $1
  `, [req.params.id]);

  if (result.rows.length === 0) {
    throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Invoice not found');
  }

  res.json(ApiResponseBuilder.success(keysToCamel(result.rows[0])));
}));

// Get vendor invoice details with payment history
router.get('/invoices/:id/details', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }

  // Get user email from database using user ID
  const userResult = await pool.query(
    'SELECT email FROM users WHERE id = $1',
    [req.user.id]
  );

  if (userResult.rows.length === 0) {
    throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'User not found');
  }

  // Get invoice details with payment information
  const invoiceResult = await pool.query(`
    SELECT
      vi.*,
      v.name as company,
      v.name as billing_company,
      COALESCE(vi.rate, 0) as rate,
      COALESCE(vi.amount, 0) as amount,
      COALESCE(vi.subtotal, vi.amount) as subtotal,
      COALESCE(vi.hst, 0) as hst,
      COALESCE(vi.total, vi.amount) as total,
      u_approved.username as approved_by_name,
      u_approved.email as approved_by_email,
      COALESCE(payments.total_paid, 0) as total_paid,
      (COALESCE(vi.total, vi.amount) - COALESCE(payments.total_paid, 0)) as balance_due
    FROM vendor_invoices vi
    LEFT JOIN vendors v ON vi.vendor_id = v.id
    LEFT JOIN users u_approved ON vi.approved_by = u_approved.id
    LEFT JOIN (
      SELECT
        vendor_invoice_id,
        SUM(amount) as total_paid
      FROM vendor_payments
      WHERE status = 'processed'
      GROUP BY vendor_invoice_id
    ) payments ON payments.vendor_invoice_id = vi.id
    WHERE vi.id = $1
  `, [req.params.id]);

  if (invoiceResult.rows.length === 0) {
    throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Invoice not found');
  }

  // Get payment history
  const paymentsResult = await pool.query(`
    SELECT
      vp.*,
      u_processed.username as processed_by_name
    FROM vendor_payments vp
    LEFT JOIN users u_processed ON vp.processed_by = u_processed.id
    WHERE vp.vendor_invoice_id = $1
    ORDER BY vp.payment_date DESC, vp.created_at DESC
  `, [req.params.id]);

  res.json({
    success: true,
    data: {
      ...invoiceResult.rows[0],
      payments: paymentsResult.rows
    }
  });
}));

// Submit invoice to admin
router.post('/invoices/:id/submit-to-admin', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await pool.query(
    `UPDATE vendor_invoices
     SET status = 'submitted_to_admin',
         updated_at = NOW()
     WHERE id = $1 AND status = 'pending_submission'
     RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Invoice not found or not ready to submit to admin');
  }

  res.json({ message: 'Invoice submitted to admin successfully' });
}));

// Resend rejected invoice to admin
router.post('/invoices/:id/resend-to-admin', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body;

  if (!notes || notes.trim() === '') {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Notes are required when resending rejected invoice');
  }

  const result = await pool.query(
    `UPDATE vendor_invoices
     SET status = 'submitted_to_admin',
         admin_notes = $2,
         rejection_reason = NULL,
         rejected_at = NULL,
         rejected_by = NULL,
         updated_at = NOW()
     WHERE id = $1 AND status IN ('rejected_by_admin', 'rejected_by_accountant')
     RETURNING id`,
    [id, notes]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Invoice not found or not in rejected state');
  }

  res.json({ message: 'Invoice resent to admin successfully' });
}));

// Download invoice PDF
router.get('/invoices/:id/download', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const userRole = req.user?.role;
  const userId = req.user?.id;
  const staffRoles = ['admin', 'sysadmin', 'accounting'];

  // Get invoice with vendor info
  const result = await pool.query(`
    SELECT
      vi.*,
      v.name as company,
      v.name as billing_company,
      v.contact_email as vendor_email,
      COALESCE(vi.rate, 0) as rate,
      COALESCE(vi.amount, 0) as amount,
      COALESCE(vi.subtotal, vi.amount) as subtotal,
      COALESCE(vi.hst, 0) as hst,
      COALESCE(vi.total, vi.amount) as total
    FROM vendor_invoices vi
    LEFT JOIN vendors v ON vi.vendor_id = v.id
    WHERE vi.id = $1
  `, [req.params.id]);

  if (result.rows.length === 0) {
    throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Invoice not found');
  }

  const invoice = result.rows[0];

  // Authorization check: staff can access any invoice, vendors only their own
  if (!staffRoles.includes(userRole || '')) {
    // For non-staff, verify they own this invoice
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'User not found');
    }
    const userEmail = userResult.rows[0].email;

    if (invoice.vendor_email !== userEmail) {
      throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'You can only download your own invoices');
    }
  }

  // Generate PDF from database data
  const pdfBuffer = await pdfGenerationService.generateInvoicePDF(invoice);

  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number}.pdf"`);
  res.setHeader('Content-Length', pdfBuffer.length);

  // Send the PDF buffer
  res.send(pdfBuffer);
}));

export default router; 