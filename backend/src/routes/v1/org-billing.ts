import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/errorHandler.js';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware.js';
import { PDFService } from '../../services/pdfService.js';
import { notificationService } from '../../services/NotificationService.js';
import { pool } from '../../config/database.js';
import { AppError, errorCodes } from '../../utils/errorHandler.js';
import { devLog } from '../../utils/devLog.js';

const router = Router();

// Helper to format date-only fields as YYYY-MM-DD
const formatDateOnly = (dt: Date | string | null | undefined): string | null => dt ? new Date(dt).toISOString().slice(0, 10) : null;

const formatCourseRow = (row: Record<string, any>): Record<string, any> => ({
  ...row,
  scheduled_date: row.scheduled_date ? formatDateOnly(row.scheduled_date) : null,
  date_requested: row.date_requested ? formatDateOnly(row.date_requested) : null,
  confirmed_date: row.confirmed_date ? formatDateOnly(row.confirmed_date) : null,
  request_submitted_date: row.request_submitted_date ? formatDateOnly(row.request_submitted_date) : null,
});

// Organization Bills Payable - View invoices for organization
router.get(
  '/organization/invoices',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      if (user.role !== 'organization') {
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Organization role required.'
        );
      }

      const {
        status,
        page = 1,
        limit = 10,
        sort_by = 'created_at',
        sort_order = 'desc',
      } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let whereClause =
        'WHERE i.organization_id = $1 AND i.posted_to_org = TRUE';
      const queryParams: any[] = [user.organizationId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        whereClause += ` AND i.status = $${paramCount}`;
        queryParams.push(status);
      }

      // Exclude fully paid invoices from AR
      whereClause += ' AND (i.status != \'paid\' AND (i.base_cost + i.tax_amount - COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id AND status = \'verified\'), 0)) > 0)';

      const orderClause = `ORDER BY i.${sort_by} ${sort_order.toString().toUpperCase()}`;

      devLog(`[DEBUG] Organization invoices query params:`, queryParams);
      devLog(`[DEBUG] Organization invoices whereClause:`, whereClause);

      const result = await pool.query(
        `
      SELECT
        i.id,
        i.invoice_number,
        i.created_at as invoice_date,
        i.due_date,
        i.amount,
        i.status,
        i.students_billed,
        i.paid_date,
        cr.location,
        ct.name as course_type_name,
        cr.completed_at as course_date,
        cr.id as course_request_id,
        COALESCE(SUM(CASE WHEN p.status = 'verified' THEN p.amount ELSE 0 END), 0) as amount_paid,
        GREATEST(0, (i.base_cost + i.tax_amount) - COALESCE(SUM(CASE WHEN p.status = 'verified' THEN p.amount ELSE 0 END), 0)) as balance_due,
        cp.price_per_student as rate_per_student,
        i.base_cost,
        i.tax_amount,
        CASE
          WHEN COALESCE(SUM(CASE WHEN p.status = 'verified' THEN p.amount ELSE 0 END), 0) >= (i.base_cost + i.tax_amount) THEN 'paid'
          WHEN CURRENT_DATE > i.due_date THEN 'overdue'
          ELSE 'pending'
        END as payment_status
      FROM invoice_with_breakdown i
      LEFT JOIN course_requests cr ON i.course_request_id = cr.id
      LEFT JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN course_pricing cp ON cr.organization_id = cp.organization_id AND cr.course_type_id = cp.course_type_id AND cp.is_active = true
      LEFT JOIN payments p ON i.id = p.invoice_id
      ${whereClause}
      GROUP BY i.id, i.invoice_number, i.created_at, i.due_date, i.amount, i.status, i.students_billed, i.paid_date, i.base_cost, i.tax_amount, cr.id, ct.id, cp.price_per_student
      ${orderClause}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `,
        [...queryParams, Number(limit), offset]
      );

      devLog(`[DEBUG] Organization invoices result rows:`, result.rows.length);
      if (result.rows.length > 0) {
        devLog(`[DEBUG] First invoice data:`, {
          id: result.rows[0].id,
          invoice_number: result.rows[0].invoice_number,
          course_request_id: result.rows[0].course_request_id,
          course_type_name: result.rows[0].course_type_name,
          rate_per_student: result.rows[0].rate_per_student,
          amount: result.rows[0].amount
        });
      }

      // Transform rate_per_student to ensure it's a number
      const transformedRows = result.rows.map(row => ({
        ...row,
        rate_per_student: row.rate_per_student ? parseFloat(row.rate_per_student) : null
      }));

      // Get total count for pagination
      const countResult = await pool.query(
        `
      SELECT COUNT(DISTINCT i.id) as total
      FROM invoice_with_breakdown i
      LEFT JOIN course_requests cr ON i.course_request_id = cr.id
      ${whereClause}
    `,
        queryParams
      );

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / Number(limit));

      res.json({
        success: true,
        data: {
          invoices: transformedRows,
          pagination: {
            current_page: Number(page),
            total_pages: totalPages,
            total_records: total,
            per_page: Number(limit),
          },
        },
      });
    } catch (error) {
      console.error('[Organization Invoices] Error:', error);
      throw error;
    }
  })
);

// Organization Bills Payable - Get invoice details
router.get(
  '/organization/invoices/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      if (user.role !== 'organization') {
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Organization role required.'
        );
      }

      const result = await pool.query(
        `
      SELECT
        i.id,
        i.invoice_number,
        i.created_at as invoice_date,
        i.due_date,
        i.amount,
        i.status,
        i.students_billed,
        i.paid_date,
        o.name as organization_name,
        o.contact_email,
        o.contact_phone,
        o.address,
        cr.location,
        ct.name as course_type_name,
        cr.completed_at as course_date,
        cr.id as course_request_id,
        COALESCE(SUM(CASE WHEN p.status = 'verified' THEN p.amount ELSE 0 END), 0) as amount_paid,
        GREATEST(0, (i.base_cost + i.tax_amount) - COALESCE(SUM(CASE WHEN p.status = 'verified' THEN p.amount ELSE 0 END), 0)) as balance_due,
        cp.price_per_student as rate_per_student,
        i.base_cost,
        i.tax_amount,
        CASE
          WHEN COALESCE(SUM(CASE WHEN p.status = 'verified' THEN p.amount ELSE 0 END), 0) >= (i.base_cost + i.tax_amount) THEN 'paid'
          WHEN CURRENT_DATE > i.due_date THEN 'overdue'
          ELSE 'pending'
        END as payment_status
      FROM invoice_with_breakdown i
      JOIN organizations o ON i.organization_id = o.id
      LEFT JOIN course_requests cr ON i.course_request_id = cr.id
      LEFT JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN course_pricing cp ON cr.organization_id = cp.organization_id AND cr.course_type_id = cp.course_type_id AND cp.is_active = true
      LEFT JOIN payments p ON i.id = p.invoice_id
      WHERE i.id = $1 AND i.organization_id = $2
      GROUP BY i.id, i.invoice_number, i.due_date, i.amount, i.status, i.students_billed, i.paid_date, i.base_cost, i.tax_amount, o.id, cr.id, ct.id, cp.price_per_student
    `,
        [id, user.organizationId]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Invoice not found'
        );
      }

      // Get payment history
      const paymentsResult = await pool.query(
        `
      SELECT
        p.id,
        p.invoice_id,
        p.amount as amount_paid,
        p.payment_date,
        p.payment_method,
        p.reference_number,
        p.notes,
        p.status,
        p.created_at,
        p.submitted_by_org_at,
        p.verified_by_accounting_at,
        p.reversed_at,
        p.reversed_by
      FROM payments p
      WHERE p.invoice_id = $1
      ORDER BY p.payment_date DESC
    `,
        [id]
      );

      const invoice = result.rows[0];
      invoice.payments = paymentsResult.rows;

      // Transform rate_per_student to ensure it's a number
      invoice.rate_per_student = invoice.rate_per_student ? parseFloat(invoice.rate_per_student) : null;

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      console.error('[Organization Invoice Details] Error:', error);
      throw error;
    }
  })
);

// Organization Bills Payable - Download invoice PDF
router.get(
  '/organization/invoices/:id/pdf',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      if (user.role !== 'organization') {
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Organization role required.'
        );
      }

      devLog(`[PDF] Organization ${user.organizationId} requesting PDF for invoice ${id}`);

      // Get invoice details - verify it belongs to this organization
      const result = await pool.query(
        `
        SELECT
          i.id as invoice_id,
          i.invoice_number,
          i.organization_id,
          i.course_request_id,
          i.created_at as invoice_date,
          i.due_date,
          i.amount,
          i.status,
          i.students_billed,
          i.paid_date,
          i.base_cost,
          i.tax_amount,
          i.rate_per_student,
          o.name as organization_name,
          o.contact_email,
          cr.location,
          ct.name as course_type_name,
          cr.completed_at as date_completed,
          COALESCE(
            json_agg(
              json_build_object(
                'first_name', cs.first_name,
                'last_name', cs.last_name,
                'email', cs.email,
                'attended', cs.attended
              ) ORDER BY cs.last_name, cs.first_name
            ) FILTER (WHERE cs.id IS NOT NULL),
            '[]'::json
          ) as attendance_list
        FROM invoices i
        JOIN organizations o ON i.organization_id = o.id
        LEFT JOIN course_requests cr ON i.course_request_id = cr.id
        LEFT JOIN class_types ct ON cr.course_type_id = ct.id
        LEFT JOIN course_students cs ON cr.id = cs.course_request_id
        WHERE i.id = $1 AND i.organization_id = $2
        GROUP BY i.id, i.invoice_number, i.organization_id, i.course_request_id, i.created_at, i.due_date, i.amount, i.status, i.students_billed, i.paid_date, i.base_cost, i.tax_amount, i.rate_per_student, o.name, o.contact_email, cr.location, ct.name, cr.completed_at
        `,
        [id, user.organizationId]
      );

      if (result.rows.length === 0) {
        devLog(`[PDF] Invoice ${id} not found for organization ${user.organizationId}`);
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Invoice not found'
        );
      }

      const invoice = result.rows[0];
      devLog(`[PDF] Generating PDF for invoice ${invoice.invoice_number}`);

      // Generate PDF using PDFService
      const pdfBuffer = await PDFService.generateInvoicePDF(invoice);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Invoice-${invoice.invoice_number}.pdf"`
      );

      // Send the PDF
      res.send(pdfBuffer);
    } catch (error) {
      console.error('[Organization Invoice PDF] Error:', error);
      throw error;
    }
  })
);

// Organization Bills Payable - Get invoice payment history
router.get(
  '/organization/invoices/:id/payments',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      if (user.role !== 'organization') {
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Organization role required.'
        );
      }

      // Verify invoice belongs to organization
      const invoiceCheck = await pool.query(
        `
      SELECT id FROM invoices
      WHERE id = $1 AND organization_id = $2
    `,
        [id, user.organizationId]
      );

      if (invoiceCheck.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Invoice not found'
        );
      }

      const result = await pool.query(
        `
      SELECT
        p.id,
        p.invoice_id,
        p.amount as amount_paid,
        p.payment_date,
        p.payment_method,
        p.reference_number,
        p.notes,
        p.status,
        p.created_at,
        p.submitted_by_org_at,
        p.verified_by_accounting_at,
        p.reversed_at,
        p.reversed_by
      FROM payments p
      WHERE p.invoice_id = $1
      ORDER BY p.payment_date DESC
    `,
        [id]
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('[Organization Invoice Payments] Error:', error);
      throw error;
    }
  })
);

// Calculate balance for real-time payment validation
router.get(
  '/invoices/:id/calculate-balance',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const proposedAmount = parseFloat(req.query.amount as string) || 0;

      // Get invoice with payment totals — scope by org for organization role
      const isOrgUser = user.role === 'organization';
      const invoiceResult = await pool.query(
        `
        SELECT
          i.id,
          i.amount,
          i.status,
          i.organization_id,
          COALESCE(SUM(CASE WHEN p.status = 'verified' THEN p.amount ELSE 0 END), 0) as verified_payments,
          COALESCE(SUM(CASE WHEN p.status = 'pending_verification' THEN p.amount ELSE 0 END), 0) as pending_payments
        FROM invoices i
        LEFT JOIN payments p ON i.id = p.invoice_id
        WHERE i.id = $1
          AND ($2::int IS NULL OR i.organization_id = $2)
        GROUP BY i.id, i.amount, i.status, i.organization_id
        `,
        [id, isOrgUser ? user.organizationId : null]
      );

      if (invoiceResult.rows.length === 0) {
        throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Invoice not found');
      }

      const invoice = invoiceResult.rows[0];

      const totalInvoiceAmount = parseFloat(invoice.amount) || 0;
      const verifiedPayments = parseFloat(invoice.verified_payments) || 0;
      const pendingPayments = parseFloat(invoice.pending_payments) || 0;

      // Outstanding balance includes pending payments
      const currentOutstandingBalance = totalInvoiceAmount - verifiedPayments - pendingPayments;
      const remainingAfterPayment = currentOutstandingBalance - proposedAmount;

      const isOverpayment = proposedAmount > currentOutstandingBalance + 0.01;
      const isFullPayment = Math.abs(remainingAfterPayment) < 0.01;
      const isValidPayment = proposedAmount > 0 && !isOverpayment;

      res.json({
        success: true,
        data: {
          invoice_total: totalInvoiceAmount,
          verified_payments: verifiedPayments,
          pending_payments: pendingPayments,
          current_outstanding_balance: Math.max(0, currentOutstandingBalance),
          proposed_payment: proposedAmount,
          remaining_balance_after_payment: Math.max(0, remainingAfterPayment),
          is_valid_payment: isValidPayment,
          is_overpayment: isOverpayment,
          is_full_payment: isFullPayment,
          can_submit_payment: isValidPayment && invoice.status !== 'paid',
        },
      });
    } catch (error) {
      console.error('[Calculate Balance] Error:', error);
      throw error;
    }
  })
);

// Organization Bills Payable - Submit payment information
router.post(
  '/organization/invoices/:id/payment-submission',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      const {
        payment_method,
        reference_number,
        payment_date,
        amount,
        notes,
        payment_proof_url,
      } = req.body;

      devLog('[PAYMENT SUBMISSION] Request details:', {
        invoiceId: id,
        userRole: user.role,
        userOrgId: user.organizationId,
        amount,
        paymentMethod: payment_method
      });

      if (user.role !== 'organization') {
        devLog('[PAYMENT SUBMISSION] Wrong role:', user.role);
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Organization role required.'
        );
      }

      if (!amount || amount <= 0) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Valid payment amount is required'
        );
      }

      if (!payment_method || payment_method.trim() === '') {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Payment method is required'
        );
      }

      // Verify invoice belongs to organization and get current balance
      const invoiceResult = await pool.query(
        `
        SELECT
          i.id,
          i.amount,
          i.status,
          i.organization_id,
          COALESCE(SUM(CASE WHEN p.status = 'verified' THEN p.amount ELSE 0 END), 0) as verified_payments,
          COALESCE(SUM(CASE WHEN p.status = 'pending_verification' THEN p.amount ELSE 0 END), 0) as pending_payments
        FROM invoices i
        LEFT JOIN payments p ON i.id = p.invoice_id
        WHERE i.id = $1 AND i.organization_id = $2
        GROUP BY i.id, i.amount, i.status, i.organization_id
        `,
        [id, user.organizationId]
      );

      if (invoiceResult.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Invoice not found'
        );
      }

      const invoice = invoiceResult.rows[0];
      const totalInvoiceAmount = parseFloat(invoice.amount) || 0;
      const verifiedPayments = parseFloat(invoice.verified_payments) || 0;
      const pendingPayments = parseFloat(invoice.pending_payments) || 0;
      const proposedPayment = parseFloat(amount) || 0;

      // Calculate current outstanding balance (INCLUDING pending payments to prevent overpayment)
      const currentOutstandingBalance = totalInvoiceAmount - verifiedPayments - pendingPayments;

      // Validate payment amount against outstanding balance
      if (proposedPayment > currentOutstandingBalance + 0.01) { // Small tolerance for rounding
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          `Payment amount ($${proposedPayment.toFixed(2)}) exceeds outstanding balance ($${currentOutstandingBalance.toFixed(2)}). You already have pending payments of $${pendingPayments.toFixed(2)} awaiting verification.`
        );
      }

      // Check if invoice is already paid
      if (invoice.status === 'paid') {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Invoice is already marked as paid. Cannot submit additional payments.'
        );
      }

      // IDEMPOTENCY CHECK: Prevent duplicate submissions within 60 seconds
      const duplicateCheck = await pool.query(
        `
        SELECT id, amount, created_at
        FROM payments
        WHERE invoice_id = $1
          AND amount = $2
          AND status = 'pending_verification'
          AND created_at > NOW() - INTERVAL '60 seconds'
        LIMIT 1
        `,
        [id, amount]
      );

      if (duplicateCheck.rows.length > 0) {
        devLog('[PAYMENT SUBMISSION] Duplicate payment detected:', duplicateCheck.rows[0]);
        throw new AppError(
          409,
          errorCodes.VALIDATION_ERROR,
          'A payment with this amount was already submitted within the last minute. Please wait for it to be processed or refresh the page.'
        );
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Record payment submission (pending verification)
        const paymentResult = await client.query(
          `
        INSERT INTO payments (
          invoice_id,
          amount,
          payment_date,
          payment_method,
          reference_number,
          notes,
          status,
          submitted_by_org_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'pending_verification', NOW())
        RETURNING *
      `,
          [
            id,
            amount,
            payment_date || new Date(),
            payment_method,
            reference_number,
            notes,
          ]
        );

        // Calculate if this payment completes the invoice
        const totalPaymentsAfterSubmission = verifiedPayments + pendingPayments + proposedPayment;
        const isFullPayment = totalPaymentsAfterSubmission >= totalInvoiceAmount - 0.01; // Small tolerance

        // Update invoice status based on payment completion
        const newStatus = isFullPayment ? 'payment_submitted' : 'partial_payment';
        await client.query(
          `
          UPDATE invoices
          SET status = $2, updated_at = NOW()
          WHERE id = $1
          `,
          [id, newStatus]
        );

        await client.query('COMMIT');

        const paymentType = isFullPayment ? 'full payment' : 'partial payment';
        const remainingBalance = Math.max(0, totalInvoiceAmount - totalPaymentsAfterSubmission);

        // Get organization name for notification
        const orgResult = await pool.query(
          'SELECT name FROM organizations WHERE id = $1',
          [user.organizationId]
        );
        const organizationName = orgResult.rows[0]?.name || 'Unknown Organization';

        // Get invoice number for notification
        const invoiceNumberResult = await pool.query(
          'SELECT invoice_number FROM invoices WHERE id = $1',
          [id]
        );
        const invoiceNumber = invoiceNumberResult.rows[0]?.invoice_number || 'Unknown Invoice';

        // Send notification to all accountants asynchronously
        notificationService.notifyPaymentSubmitted(
          parseInt(id),
          invoiceNumber,
          organizationName,
          proposedPayment
        ).catch((error: unknown) => {
          console.error('[NOTIFICATION] Error sending payment notification:', error);
        });

        res.json({
          success: true,
          message: `Payment submission recorded successfully. This is a ${paymentType}. It will be verified by accounting.`,
          data: {
            ...paymentResult.rows[0],
            payment_type: paymentType,
            remaining_balance: remainingBalance,
            is_full_payment: isFullPayment,
            can_submit_additional_payments: !isFullPayment
          },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[Organization Payment Submission] Error:', error);
      throw error;
    }
  })
);

// Organization Bills Payable - Dashboard summary
router.get(
  '/organization/billing-summary',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      if (user.role !== 'organization') {
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Organization role required.'
        );
      }

      const result = await pool.query(
        `
      SELECT
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN
          CASE
            WHEN COALESCE(payments.total_paid, 0) >= (i.base_cost + i.tax_amount) THEN 'paid'
            WHEN CURRENT_DATE > i.due_date THEN 'overdue'
            ELSE 'pending'
          END = 'pending' THEN 1 END) as pending_invoices,
        COUNT(CASE WHEN
          CASE
            WHEN COALESCE(payments.total_paid, 0) >= (i.base_cost + i.tax_amount) THEN 'paid'
            WHEN CURRENT_DATE > i.due_date THEN 'overdue'
            ELSE 'pending'
          END = 'overdue' THEN 1 END) as overdue_invoices,
        COUNT(CASE WHEN
          CASE
            WHEN COALESCE(payments.total_paid, 0) >= (i.base_cost + i.tax_amount) THEN 'paid'
            WHEN CURRENT_DATE > i.due_date THEN 'overdue'
            ELSE 'pending'
          END = 'paid' THEN 1 END) as paid_invoices,
        COUNT(CASE WHEN i.status = 'payment_submitted' THEN 1 END) as payment_submitted,
        COALESCE(SUM(i.base_cost + i.tax_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN
          CASE
            WHEN COALESCE(payments.total_paid, 0) >= (i.base_cost + i.tax_amount) THEN 'paid'
            WHEN CURRENT_DATE > i.due_date THEN 'overdue'
            ELSE 'pending'
          END = 'pending' THEN (i.base_cost + i.tax_amount) ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN
          CASE
            WHEN COALESCE(payments.total_paid, 0) >= (i.base_cost + i.tax_amount) THEN 'paid'
            WHEN CURRENT_DATE > i.due_date THEN 'overdue'
            ELSE 'pending'
          END = 'overdue' THEN (i.base_cost + i.tax_amount) ELSE 0 END), 0) as overdue_amount,
        COALESCE(SUM(COALESCE(payments.total_paid, 0)), 0) as paid_amount
      FROM invoice_with_breakdown i
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) as total_paid
        FROM payments
        WHERE status = 'verified'
        GROUP BY invoice_id
      ) payments ON payments.invoice_id = i.id
      WHERE i.organization_id = $1
        AND i.posted_to_org = TRUE
    `,
        [user.organizationId]
      );

      // Get recent invoices
      const recentResult = await pool.query(
        `
      SELECT
        i.id as invoice_id,
        i.invoice_number,
        i.created_at as invoice_date,
        i.due_date,
        i.base_cost + i.tax_amount as amount,
        i.status,
        ct.name as course_type_name,
        cr.location
      FROM invoice_with_breakdown i
      LEFT JOIN course_requests cr ON i.course_request_id = cr.id
      LEFT JOIN class_types ct ON cr.course_type_id = ct.id
      WHERE i.organization_id = $1 AND i.posted_to_org = TRUE
      ORDER BY i.created_at DESC
      LIMIT 5
    `,
        [user.organizationId]
      );

      const summary = result.rows[0];
      summary.recent_invoices = recentResult.rows;

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('[Organization Billing Summary] Error:', error);
      throw error;
    }
  })
);

// Accounting - Get pending payment verifications
router.get(
  '/accounting/payment-verifications',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      if (user.role !== 'accountant' && user.role !== 'admin') {
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Accountant role required.'
        );
      }

      const result = await pool.query(`
          SELECT
            p.id as "paymentId",
            p.amount,
            p.payment_date as "paymentDate",
            p.payment_method as "paymentMethod",
            p.reference_number as "referenceNumber",
            p.notes,
            p.status,
            p.submitted_by_org_at as "submittedByOrgAt",
            p.verified_by_accounting_at as "verifiedByAccountingAt",
            i.id as "invoiceId",
            i.invoice_number as "invoiceNumber",
            i.course_request_id as "courseRequestId",
            o.name as "organizationName",
            o.contact_email as "contactEmail"
          FROM payments p
          JOIN invoices i ON p.invoice_id = i.id
          JOIN organizations o ON i.organization_id = o.id
          WHERE p.status = 'pending_verification'
          ORDER BY p.submitted_by_org_at DESC
        `);

      res.json({
        success: true,
        data: {
          payments: result.rows,
        },
      });
    } catch (error) {
      console.error('[Payment Verifications] Error:', error);
      throw error;
    }
  })
);

// Accounting - Get verified payments for reversal
router.get(
  '/accounting/verified-payments',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { status = 'verified' } = req.query;

      if (user.role !== 'accountant' && user.role !== 'admin') {
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Accountant role required.'
        );
      }

      let whereClause = '';
      if (status === 'verified') {
        whereClause = "WHERE p.status = 'verified'";
      } else if (status === 'reversed') {
        whereClause = "WHERE p.status = 'reversed'";
      } else {
        whereClause = "WHERE p.status IN ('verified', 'reversed')";
      }

      const result = await pool.query(`
          SELECT
            p.id as payment_id,
            p.amount,
            p.payment_date,
            p.payment_method,
            p.reference_number,
            p.notes,
            p.status,
            p.verified_by_accounting_at,
            p.reversed_at,
            p.reversed_by,
            i.id as invoice_id,
            i.invoice_number,
            o.name as organization_name,
            o.contact_email
          FROM payments p
          JOIN invoices i ON p.invoice_id = i.id
          JOIN organizations o ON i.organization_id = o.id
          ${whereClause}
          ORDER BY p.verified_by_accounting_at DESC
        `);

      res.json({
        success: true,
        data: {
          payments: result.rows,
        },
      });
    } catch (error) {
      console.error('[Verified Payments] Error:', error);
      throw error;
    }
  })
);

// Accounting - Verify payment (approve/reject)
router.post(
  '/accounting/payments/:id/verify',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { action, notes } = req.body; // action: 'approve' or 'reject'

      devLog('🔍 [PAYMENT VERIFICATION] Request received:', {
        paymentId: id,
        action,
        notes,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });

      if (user.role !== 'accountant' && user.role !== 'admin') {
        devLog('🔍 [PAYMENT VERIFICATION] Access denied for role:', user.role);
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Accountant role required.'
        );
      }

      if (!action || !['approve', 'reject'].includes(action)) {
        devLog('🔍 [PAYMENT VERIFICATION] Invalid action:', action);
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Valid action (approve/reject) is required'
        );
      }

      if (action === 'reject' && !notes?.trim()) {
        devLog('🔍 [PAYMENT VERIFICATION] Reject action requires notes');
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Notes are required when rejecting a payment'
        );
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');
        devLog('🔍 [PAYMENT VERIFICATION] Database transaction started');

        // Get payment and invoice details
        const paymentResult = await client.query(
          `
            SELECT p.*, i.organization_id, i.amount as invoice_amount
            FROM payments p
            JOIN invoices i ON p.invoice_id = i.id
            WHERE p.id = $1 AND p.status = 'pending_verification'
          `,
          [id]
        );

        devLog('🔍 [PAYMENT VERIFICATION] Payment lookup result:', {
          paymentId: id,
          rowsFound: paymentResult.rows.length,
          paymentData: paymentResult.rows[0] || null
        });

        if (paymentResult.rows.length === 0) {
          devLog('🔍 [PAYMENT VERIFICATION] Payment not found or already processed');
          throw new AppError(
            404,
            errorCodes.RESOURCE_NOT_FOUND,
            'Payment not found or already processed'
          );
        }

        const payment = paymentResult.rows[0];
        devLog('🔍 [PAYMENT VERIFICATION] Processing payment:', {
          paymentId: payment.id,
          amount: payment.amount,
          status: payment.status,
          invoiceId: payment.invoice_id,
          invoiceAmount: payment.invoice_amount
        });

        if (action === 'approve') {
          devLog('🔍 [PAYMENT VERIFICATION] Approving payment...');

          // Approve payment
          const updateResult = await client.query(
            `
              UPDATE payments
              SET status = 'verified',
                  verified_by_accounting_at = NOW(),
                  notes = COALESCE(notes, '') || CASE WHEN notes IS NOT NULL AND notes != '' THEN E'\n\n' ELSE '' END || $2
              WHERE id = $1
              RETURNING *
            `,
            [id, `Verified by ${user.username}: ${notes || 'Payment approved'}`]
          );

          devLog('🔍 [PAYMENT VERIFICATION] Payment update result:', {
            rowsAffected: updateResult.rowCount,
            updatedPayment: updateResult.rows[0]
          });

          // Check if invoice is fully paid
          const totalPaidResult = await client.query(
            `
              SELECT COALESCE(SUM(amount), 0) as total_paid
              FROM payments
              WHERE invoice_id = $1 AND status = 'verified'
            `,
            [payment.invoice_id]
          );

          const totalPaid = parseFloat(totalPaidResult.rows[0].total_paid);
          const invoiceAmount = parseFloat(payment.invoice_amount);

          devLog('🔍 [PAYMENT VERIFICATION] Invoice payment calculation:', {
            totalPaid,
            invoiceAmount,
            isFullyPaid: totalPaid >= invoiceAmount
          });

          // Update invoice status based on payment amount
          if (totalPaid >= invoiceAmount) {
            // Fully paid - mark as paid
            const invoiceUpdateResult = await client.query(
              `
                UPDATE invoices
                SET status = 'paid', paid_date = NOW(), updated_at = NOW()
                WHERE id = $1
                RETURNING *
              `,
              [payment.invoice_id]
            );
            devLog('🔍 [PAYMENT VERIFICATION] Invoice marked as paid:', {
              rowsAffected: invoiceUpdateResult.rowCount,
              updatedInvoice: invoiceUpdateResult.rows[0]
            });
          } else {
            // Partial payment - revert to pending status
            const invoiceUpdateResult = await client.query(
              `
                UPDATE invoices
                SET status = 'pending', updated_at = NOW()
                WHERE id = $1
                RETURNING *
              `,
              [payment.invoice_id]
            );
            devLog('🔍 [PAYMENT VERIFICATION] Invoice marked as pending (partial payment):', {
              rowsAffected: invoiceUpdateResult.rowCount,
              updatedInvoice: invoiceUpdateResult.rows[0]
            });
          }
        } else if (action === 'reject') {
          devLog('🔍 [PAYMENT VERIFICATION] Rejecting payment...');

          // Reject payment - mark as rejected
          const updateResult = await client.query(
            `
              UPDATE payments
              SET status = 'rejected',
                  verified_by_accounting_at = NOW(),
                  notes = COALESCE(notes, '') || CASE WHEN notes IS NOT NULL AND notes != '' THEN E'\n\n' ELSE '' END || $2
              WHERE id = $1
              RETURNING *
            `,
            [id, `Rejected by ${user.username}: ${notes}`]
          );

          devLog('🔍 [PAYMENT VERIFICATION] Payment rejection result:', {
            rowsAffected: updateResult.rowCount,
            updatedPayment: updateResult.rows[0]
          });

          // Revert invoice status to pending
          const invoiceUpdateResult = await client.query(
            `
              UPDATE invoices
              SET status = 'pending', updated_at = NOW()
              WHERE id = $1
              RETURNING *
            `,
            [payment.invoice_id]
          );
          devLog('🔍 [PAYMENT VERIFICATION] Invoice reverted to pending:', {
            rowsAffected: invoiceUpdateResult.rowCount,
            updatedInvoice: invoiceUpdateResult.rows[0]
          });
        }

        await client.query('COMMIT');
        devLog('🔍 [PAYMENT VERIFICATION] Database transaction committed successfully');

        // Emit real-time update event for payment verification
        const io = req.app.get('io');
        if (io) {
          io.emit('paymentStatusChanged', {
            type: action === 'approve' ? 'payment_verified' : 'payment_rejected',
            paymentId: id,
            invoiceId: payment.invoice_id,
            organizationId: payment.organization_id,
            action: action,
            amount: payment.amount,
            timestamp: new Date().toISOString()
          });
          devLog(`📡 [WEBSOCKET] Emitted payment ${action} event for payment: ${id}, invoice: ${payment.invoice_id}`);
        }

        // Send success response
        const responseData = {
          success: true,
          message: `Payment ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
          data: {
            paymentId: id,
            action: action,
            invoiceId: payment.invoice_id
          }
        };

        devLog('🔍 [PAYMENT VERIFICATION] Sending success response:', responseData);
        res.json(responseData);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('🔍 [PAYMENT VERIFICATION] Error during transaction, rolling back:', error);
        throw error;
      } finally {
        client.release();
        devLog('🔍 [PAYMENT VERIFICATION] Database client released');
      }
    } catch (error) {
      console.error('🔍 [PAYMENT VERIFICATION] Error in payment verification endpoint:', error);
      throw error;
    }
  })
);

// Organization Paid Invoices - Get paid invoices
router.get(
  '/organization/paid-invoices',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      if (user.role !== 'organization') {
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Organization role required.'
        );
      }

      const {
        page = 1,
        limit = 10,
        sort_by = 'paid_date',
        sort_order = 'desc',
      } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const orderClause = `ORDER BY i.${sort_by} ${sort_order.toString().toUpperCase()}`;

      const result = await pool.query(
        `
      SELECT
        i.id as invoice_id,
        i.invoice_number,
        i.created_at as invoice_date,
        i.due_date,
        i.amount,
        i.status,
        i.students_billed,
        i.paid_date,
        cr.location,
        ct.name as course_type_name,
        cr.completed_at as course_date,
        cr.id as course_request_id,
        COALESCE(payments.total_paid, 0) as amount_paid,
        GREATEST(0, (i.base_cost + i.tax_amount) - COALESCE(payments.total_paid, 0)) as balance_due,
        cp.price_per_student as rate_per_student,
        i.base_cost,
        i.tax_amount,
        CASE
          WHEN COALESCE(payments.total_paid, 0) >= (i.base_cost + i.tax_amount) THEN 'paid'
          WHEN CURRENT_DATE > i.due_date THEN 'overdue'
          ELSE 'pending'
        END as payment_status
      FROM invoice_with_breakdown i
      LEFT JOIN course_requests cr ON i.course_request_id = cr.id
      LEFT JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN course_pricing cp ON cr.organization_id = cp.organization_id AND cr.course_type_id = cp.course_type_id AND cp.is_active = true
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) as total_paid
        FROM payments
        WHERE status = 'verified'
        GROUP BY invoice_id
      ) payments ON payments.invoice_id = i.id
      WHERE i.organization_id = $1
        AND i.posted_to_org = TRUE
        AND COALESCE(payments.total_paid, 0) >= (i.base_cost + i.tax_amount)
      ${orderClause}
      LIMIT $2 OFFSET $3
    `,
        [user.organizationId, Number(limit), offset]
      );

      // Get total count for pagination
      const countResult = await pool.query(
        `
      SELECT COUNT(*) as total
      FROM invoice_with_breakdown i
      LEFT JOIN course_requests cr ON i.course_request_id = cr.id
      LEFT JOIN course_pricing cp ON cr.organization_id = cp.organization_id AND cr.course_type_id = cp.course_type_id AND cp.is_active = true
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) as total_paid
        FROM payments
        WHERE status = 'verified'
        GROUP BY invoice_id
      ) payments ON payments.invoice_id = i.id
      WHERE i.organization_id = $1
        AND i.posted_to_org = TRUE
        AND COALESCE(payments.total_paid, 0) >= (i.base_cost + i.tax_amount)
    `,
        [user.organizationId]
      );

      const total = countResult.rows.length;
      const totalPages = Math.ceil(total / Number(limit));

      // Transform rate_per_student to ensure it's a number
      const transformedRows = result.rows.map(row => ({
        ...row,
        rate_per_student: row.rate_per_student ? parseFloat(row.rate_per_student) : null
      }));

      res.json({
        success: true,
        data: {
          invoices: transformedRows,
          pagination: {
            current_page: Number(page),
            total_pages: totalPages,
            total_records: total,
            per_page: Number(limit),
          },
        },
      });
    } catch (error) {
      console.error('[Organization Paid Invoices] Error:', error);
      throw error;
    }
  })
);

// Organization Paid Invoices - Move invoice to paid when balance = 0
router.post(
  '/organization/invoices/:id/mark-as-paid',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      if (user.role !== 'organization') {
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Organization role required.'
        );
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Get invoice details with payment calculations
        const invoiceResult = await client.query(
          `
        SELECT
          i.id,
          i.invoice_number,
          i.organization_id,
          i.base_cost,
          i.tax_amount,
          COALESCE(SUM(CASE WHEN p.status = 'verified' THEN p.amount ELSE 0 END), 0) as amount_paid,
          ((i.base_cost + i.tax_amount) - COALESCE(SUM(CASE WHEN p.status = 'verified' THEN p.amount ELSE 0 END), 0)) as balance_due
        FROM invoice_with_breakdown i
        LEFT JOIN payments p ON i.id = p.invoice_id
        WHERE i.id = $1 AND i.organization_id = $2
        GROUP BY i.id, i.invoice_number, i.organization_id, i.base_cost, i.tax_amount
      `,
          [id, user.organizationId]
        );

        if (invoiceResult.rows.length === 0) {
          throw new AppError(
            404,
            errorCodes.RESOURCE_NOT_FOUND,
            'Invoice not found'
          );
        }

        const invoice = invoiceResult.rows[0];

        // Check if invoice is already fully paid
        if (invoice.balance_due <= 0) {
          // Update invoice status to paid and set paid date
          await client.query(
            `
          UPDATE invoices
          SET status = 'paid',
              paid_date = CURRENT_DATE,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
            [id]
          );

          await client.query('COMMIT');

          res.json({
            success: true,
            message: 'Invoice marked as paid successfully',
            data: {
              invoice_id: id,
              invoice_number: invoice.invoice_number,
              paid_date: new Date().toISOString().split('T')[0],
              balance_due: 0
            }
          });
        } else {
          throw new AppError(
            400,
            errorCodes.VALIDATION_ERROR,
            `Invoice has outstanding balance of $${invoice.balance_due.toFixed(2)}. Cannot mark as paid until fully paid.`
          );
        }
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[Organization Mark Invoice as Paid] Error:', error);
      throw error;
    }
  })
);

// Organization Paid Invoices - Get paid invoices summary
router.get(
  '/organization/paid-invoices-summary',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      if (user.role !== 'organization') {
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Organization role required.'
        );
      }

      const result = await pool.query(
        `
      SELECT
        COUNT(*) as total_paid_invoices,
        COALESCE(SUM(i.amount), 0) as total_paid_amount,
        COALESCE(AVG(i.amount), 0) as average_paid_amount,
        COUNT(CASE WHEN i.paid_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as paid_last_30_days,
        COALESCE(SUM(CASE WHEN i.paid_date >= CURRENT_DATE - INTERVAL '30 days' THEN i.amount ELSE 0 END), 0) as amount_paid_last_30_days
      FROM invoice_with_breakdown i
      LEFT JOIN course_requests cr ON i.course_request_id = cr.id
      LEFT JOIN course_pricing cp ON cr.organization_id = cp.organization_id AND cr.course_type_id = cp.course_type_id AND cp.is_active = true
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) as total_paid
        FROM payments
        WHERE status = 'verified'
        GROUP BY invoice_id
      ) payments ON payments.invoice_id = i.id
      WHERE i.organization_id = $1
        AND i.posted_to_org = TRUE
        AND COALESCE(payments.total_paid, 0) >= (i.base_cost + i.tax_amount)
    `,
        [user.organizationId]
      );

      const summary = result.rows[0] || {
        total_paid_invoices: 0,
        total_paid_amount: 0,
        average_paid_amount: 0,
        paid_last_30_days: 0,
        amount_paid_last_30_days: 0
      };

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('[Organization Paid Invoices Summary] Error:', error);
      throw error;
    }
  })
);

// Generate PDF for payment receipt
router.get(
  '/accounting/payments/:id/receipt',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      devLog(`[PDF] Generating payment receipt for payment ${id}`);

      // Get payment details with invoice and organization info
      const result = await pool.query(
        `
      SELECT
        p.id as payment_id,
        p.amount as payment_amount,
        p.payment_date,
        p.payment_method,
        p.reference_number,
        p.notes as payment_notes,
        p.status as payment_status,
        p.created_at as payment_created_at,
        p.verified_by_accounting_at,
        i.id as invoice_id,
        i.invoice_number,
        i.amount as invoice_amount,
        i.created_at as invoice_date,
        i.due_date,
        o.name as organization_name,
        o.contact_email,
        o.address,
        cr.location,
        ct.name as course_type_name,
        cr.completed_at as course_date
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN organizations o ON i.organization_id = o.id
      LEFT JOIN course_requests cr ON i.course_request_id = cr.id
      LEFT JOIN class_types ct ON cr.course_type_id = ct.id
      WHERE p.id = $1
    `,
        [id]
      );

      if (result.rows.length === 0) {
        devLog(`[PDF] Payment ${id} not found`);
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Payment not found'
        );
      }

      const payment = result.rows[0];
      devLog(`[PDF] Generating receipt for payment ${payment.payment_id}`);

      const pdfBuffer = await PDFService.generatePaymentReceipt(payment);
      devLog(
        `[PDF] Payment receipt generated successfully, size: ${pdfBuffer.length} bytes`
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Payment-Receipt-${payment.payment_id}.pdf"`
      );
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating payment receipt:', error);
      throw error;
    }
  })
);

// Organization Payment Summary
router.get(
  '/organization/payment-summary',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      if (user.role !== 'organization') {
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Organization role required.'
        );
      }

      // Get payment summary statistics
      const summaryResult = await pool.query(
        `
      SELECT
        COUNT(*) as total_payments,
        COALESCE(SUM(amount), 0) as total_amount_paid,
        COUNT(CASE WHEN status = 'verified' THEN 1 END) as verified_payments,
        COUNT(CASE WHEN status = 'pending_verification' THEN 1 END) as pending_payments
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE i.organization_id = $1
    `,
        [user.organizationId]
      );

      // Get recent payments
      const recentPaymentsResult = await pool.query(
        `
      SELECT
        p.id,
        p.invoice_id,
        p.amount as amount_paid,
        p.payment_date,
        p.payment_method,
        p.reference_number,
        p.status,
        i.invoice_number,
        ct.name as course_type_name
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN course_requests cr ON i.course_request_id = cr.id
      LEFT JOIN class_types ct ON cr.course_type_id = ct.id
      WHERE i.organization_id = $1
      ORDER BY p.payment_date DESC
      LIMIT 10
    `,
        [user.organizationId]
      );

      const summary = summaryResult.rows[0];
      summary.recent_payments = recentPaymentsResult.rows;

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('[Organization Payment Summary] Error:', error);
      throw error;
    }
  })
);

// Accounting - Reverse payment
router.post(
  '/accounting/payments/:id/reverse',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { reason } = req.body;

      if (user.role !== 'accountant' && user.role !== 'admin') {
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Accountant role required.'
        );
      }

      if (!reason?.trim()) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Reason for reversal is required'
        );
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Get payment and invoice details
        const paymentResult = await client.query(
          `
            SELECT p.*, i.organization_id, i.amount as invoice_amount, i.invoice_number
            FROM payments p
            JOIN invoices i ON p.invoice_id = i.id
            WHERE p.id = $1 AND p.status = 'verified'
          `,
          [id]
        );

        if (paymentResult.rows.length === 0) {
          throw new AppError(
            404,
            errorCodes.RESOURCE_NOT_FOUND,
            'Payment not found or not verified'
          );
        }

        const payment = paymentResult.rows[0];

        // Check if payment is within reversal time limit (48 hours)
        const paymentDate = new Date(payment.verified_by_accounting_at);
        const now = new Date();
        const hoursSinceVerification = (now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceVerification > 48) {
          throw new AppError(
            400,
            errorCodes.VALIDATION_ERROR,
            'Payment can only be reversed within 48 hours of verification'
          );
        }

        // Reverse the payment
        await client.query(
          `
            UPDATE payments
            SET status = 'reversed',
                notes = COALESCE(notes, '') || CASE WHEN notes IS NOT NULL AND notes != '' THEN E'\n\n' ELSE '' END || $2,
                reversed_at = NOW(),
                reversed_by = $3
            WHERE id = $1
          `,
          [id, `Reversed by ${user.username}: ${reason}`, user.id]
        );

        // Recalculate invoice balance and status
        const totalPaidResult = await client.query(
          `
            SELECT COALESCE(SUM(amount), 0) as total_paid
            FROM payments
            WHERE invoice_id = $1 AND status = 'verified'
          `,
          [payment.invoice_id]
        );

        const totalPaid = parseFloat(totalPaidResult.rows[0].total_paid);
        const invoiceAmount = parseFloat(payment.invoice_amount);

        // Update invoice status based on new balance
        if (totalPaid >= invoiceAmount) {
          // Still fully paid
          await client.query(
            `
              UPDATE invoices
              SET status = 'paid', updated_at = NOW()
              WHERE id = $1
            `,
            [payment.invoice_id]
          );
        } else {
          // No longer fully paid
          await client.query(
            `
              UPDATE invoices
              SET status = 'pending', paid_date = NULL, updated_at = NOW()
              WHERE id = $1
            `,
            [payment.invoice_id]
          );
        }

        await client.query('COMMIT');

        // Send success response
        res.json({
          success: true,
          message: 'Payment reversed successfully',
          data: {
            paymentId: id,
            invoiceId: payment.invoice_id,
            invoiceNumber: payment.invoice_number,
            reversedAmount: payment.amount,
            reason: reason,
            reversedBy: user.username,
            reversedAt: new Date().toISOString()
          }
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error reversing payment:', error);
      throw error;
    }
  })
);

// Organization Bills Payable - Real-time balance calculation
router.get(
  '/organization/invoices/:id/balance-calculation',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { payment_amount = 0 } = req.query;

      devLog('[BALANCE CALCULATION] Request details:', {
        invoiceId: id,
        userRole: user.role,
        userOrgId: user.organizationId,
        paymentAmount: payment_amount
      });

      if (user.role !== 'organization') {
        devLog('[BALANCE CALCULATION] Wrong role:', user.role);
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Organization role required.'
        );
      }

      // Get invoice details with current balance
      const invoiceResult = await pool.query(
        `
        SELECT
          i.id,
          i.invoice_number,
          i.amount,
          i.status,
          i.base_cost,
          i.tax_amount,
          COALESCE(SUM(CASE WHEN p.status = 'verified' THEN p.amount ELSE 0 END), 0) as verified_payments,
          COALESCE(SUM(CASE WHEN p.status = 'pending_verification' THEN p.amount ELSE 0 END), 0) as pending_payments
        FROM invoices i
        LEFT JOIN payments p ON i.id = p.invoice_id
        WHERE i.id = $1 AND i.organization_id = $2
        GROUP BY i.id, i.invoice_number, i.amount, i.status, i.base_cost, i.tax_amount
        `,
        [id, user.organizationId]
      );

      if (invoiceResult.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Invoice not found'
        );
      }

      const invoice = invoiceResult.rows[0];
      const totalInvoiceAmount = parseFloat(invoice.amount) || 0;
      const verifiedPayments = parseFloat(invoice.verified_payments) || 0;
      const pendingPayments = parseFloat(invoice.pending_payments) || 0;
      const proposedPayment = parseFloat(payment_amount as string) || 0;

      // Calculate current outstanding balance (excluding pending payments)
      const currentOutstandingBalance = totalInvoiceAmount - verifiedPayments;

      // Calculate remaining balance after proposed payment
      const remainingBalanceAfterPayment = currentOutstandingBalance - proposedPayment;

      // Determine if payment is valid
      const isValidPayment = proposedPayment > 0 && proposedPayment <= currentOutstandingBalance;
      const isOverpayment = proposedPayment > currentOutstandingBalance;
      const isFullPayment = proposedPayment >= currentOutstandingBalance;

      res.json({
        success: true,
        data: {
          invoice_number: invoice.invoice_number,
          total_invoice_amount: totalInvoiceAmount,
          verified_payments: verifiedPayments,
          pending_payments: pendingPayments,
          current_outstanding_balance: currentOutstandingBalance,
          proposed_payment: proposedPayment,
          remaining_balance_after_payment: Math.max(0, remainingBalanceAfterPayment),
          is_valid_payment: isValidPayment,
          is_overpayment: isOverpayment,
          is_full_payment: isFullPayment,
          can_submit_payment: isValidPayment && invoice.status !== 'paid'
        }
      });
    } catch (error) {
      console.error('[Balance Calculation] Error:', error);
      throw error;
    }
  })
);

export default router;
