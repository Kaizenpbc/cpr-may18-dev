import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/errorHandler.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { pool } from '../../config/database.js';
import { AppError, errorCodes } from '../../utils/errorHandler.js';
import path from 'path';
import fs from 'fs';

const router = Router();

// ========================================
// ADMIN VENDOR INVOICE MANAGEMENT
// ========================================

// Get all vendor invoices for admin approval
router.get(
  '/admin/vendor-invoices',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { role } = (req as any).user;

      if (role !== 'admin' && role !== 'sysadmin' && role !== 'courseadmin') {
        throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Access denied. Admin, sysadmin, or courseadmin role required.');
      }

      const result = await pool.query(`
        SELECT
          vi.*,
          v.name as vendor_name,
          v.contact_email as vendor_email,
          u_approved.username as approved_by,
          u_rejected.username as rejected_by
        FROM vendor_invoices vi
        LEFT JOIN vendors v ON vi.vendor_id = v.id
        LEFT JOIN users u_approved ON vi.approved_by = u_approved.id
        LEFT JOIN users u_rejected ON vi.rejected_by = u_rejected.id
        ORDER BY vi.created_at DESC
      `);

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('Error fetching vendor invoices:', error);
      throw error;
    }
  })
);

// Update vendor invoice notes
router.put(
  '/admin/vendor-invoices/:id/notes',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { role } = (req as any).user;
      const { id } = req.params;
      const { notes } = req.body;

      if (role !== 'admin' && role !== 'sysadmin' && role !== 'courseadmin') {
        throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Access denied. Admin, sysadmin, or courseadmin role required.');
      }

      const result = await pool.query(`
        UPDATE vendor_invoices
        SET admin_notes = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [notes, id]);

      if (result.rows.length === 0) {
        throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Vendor invoice not found');
      }

      // Emit real-time update to all connected clients
      if (req.app.get('io')) {
        req.app.get('io').emit('vendor_invoice_notes_updated', {
          invoiceId: id,
          notes: notes,
          updatedBy: (req as any).user.username,
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        message: 'Notes updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating vendor invoice notes:', error);
      throw error;
    }
  })
);

// Approve or reject vendor invoice
router.post(
  '/admin/vendor-invoices/:id/approve',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { role } = (req as any).user;
      const { id } = req.params;
      const { action, notes } = req.body; // action: 'approve' or 'reject'

      if (role !== 'admin' && role !== 'sysadmin' && role !== 'courseadmin') {
        throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Access denied. Admin, sysadmin, or courseadmin role required.');
      }

      if (!['approve', 'reject'].includes(action)) {
        throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Invalid action. Must be "approve" or "reject".');
      }

      if (action === 'reject' && !notes?.trim()) {
        throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Notes are required when rejecting an invoice.');
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Get the invoice - checking for submitted_to_admin status
        const invoiceResult = await client.query(`
          SELECT vi.*, v.contact_email as vendor_email, v.name as vendor_name
          FROM vendor_invoices vi
          LEFT JOIN vendors v ON vi.vendor_id = v.id
          WHERE vi.id = $1 AND vi.status = 'submitted_to_admin'
        `, [id]);

        if (invoiceResult.rows.length === 0) {
          throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Invoice not found or not ready for processing.');
        }

        const invoice = invoiceResult.rows[0];
        const userId = (req as any).user.id;

        // Update the invoice status based on the detailed workflow
        if (action === 'approve') {
          // Send to accounting for payment processing
          await client.query(`
            UPDATE vendor_invoices
            SET status = 'submitted_to_accounting',
                approved_by = $1,
                admin_notes = $2,
                sent_to_accounting_at = NOW(),
                updated_at = NOW()
            WHERE id = $3
          `, [userId, notes || '', id]);
        } else {
          // Reject the invoice
          await client.query(`
            UPDATE vendor_invoices
            SET status = 'rejected_by_admin',
                admin_notes = $1,
                rejection_reason = $1,
                rejected_at = NOW(),
                rejected_by = $2,
                updated_at = NOW()
            WHERE id = $3
          `, [notes, userId, id]);
        }

        await client.query('COMMIT');

        // Emit real-time update to all connected clients
        if (req.app.get('io')) {
          req.app.get('io').emit('vendor_invoice_status_updated', {
            invoiceId: id,
            newStatus: action === 'approve' ? 'submitted_to_accounting' : 'rejected_by_admin',
            action: action,
            updatedBy: (req as any).user.username,
            timestamp: new Date().toISOString()
          });
        }

        // TODO: Send email notification to vendor
        // await sendVendorInvoiceNotification(invoice.vendor_email, action, invoice.invoice_number, notes);

        res.json({
          success: true,
          message: `Invoice ${action}d successfully.`,
          data: {
            invoiceId: id,
            action: action,
            status: action === 'approve' ? 'submitted_to_accounting' : 'rejected_by_admin'
          }
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error processing vendor invoice approval:', error);
      throw error;
    }
  })
);

// Get vendor invoices ready for processing (admin view)
router.get(
  '/admin/vendor-invoices/ready-for-processing',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { role } = (req as any).user;

      if (role !== 'admin' && role !== 'sysadmin' && role !== 'courseadmin') {
        throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Access denied. Admin, sysadmin, or courseadmin role required.');
      }

      const result = await pool.query(`
        SELECT
          vi.*,
          v.name as vendor_name,
          v.contact_email as vendor_email,
          v.contact_name as vendor_contact,
          v.address as vendor_address,
          v.city as vendor_city,
          v.state as vendor_state,
          v.zip_code as vendor_zip
        FROM vendor_invoices vi
        LEFT JOIN vendors v ON vi.vendor_id = v.id
        WHERE vi.status = 'submitted_to_admin'
        ORDER BY vi.created_at ASC
      `);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching vendor invoices ready for processing:', error);
      throw error;
    }
  })
);

// Download vendor invoice PDF
router.get(
  '/admin/vendor-invoices/:id/download',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { role } = (req as any).user;
      const { id } = req.params;

      if (role !== 'admin' && role !== 'sysadmin' && role !== 'courseadmin') {
        throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Access denied. Admin, sysadmin, or courseadmin role required.');
      }

      const result = await pool.query(
        'SELECT * FROM vendor_invoices WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Invoice not found.');
      }

      const invoice = result.rows[0];

      if (!invoice.pdf_filename) {
        throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'PDF file not found.');
      }

      const filePath = path.join(process.cwd(), 'uploads/vendor-invoices', invoice.pdf_filename);

      if (!fs.existsSync(filePath)) {
        throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'PDF file not found on server.');
      }

      res.download(filePath, `invoice-${invoice.invoice_number}.pdf`);
    } catch (error) {
      console.error('Error downloading vendor invoice:', error);
      throw error;
    }
  })
);

// ========================================
// ACCOUNTING VENDOR INVOICE MANAGEMENT
// ========================================

// Get vendor invoices sent to accounting for payment processing
router.get(
  '/accounting/vendor-invoices',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { role } = (req as any).user;

      if (role !== 'accountant' && role !== 'admin') {
        throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Access denied. Accountant or admin role required.');
      }

      const result = await pool.query(`
        SELECT
          vi.*,
          v.name as vendor_name,
          v.contact_email as vendor_email,
          v.name as vendor_contact,
          'check' as vendor_payment_method,
          v.address as vendor_address,
          u_approved.username as approved_by_name,
          u_approved.email as approved_by_email,
          COALESCE(payments.total_paid, 0) as total_paid,
          (vi.total - COALESCE(payments.total_paid, 0)) as balance_due,
          vi.status as display_status
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
        ORDER BY vi.created_at DESC
      `);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching vendor invoices for accounting:', error);
      throw error;
    }
  })
);

// Get vendor invoice details with payment history
router.get(
  '/accounting/vendor-invoices/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { role } = (req as any).user;
      const { id } = req.params;

      if (role !== 'accountant' && role !== 'admin') {
        throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Access denied. Accountant or admin role required.');
      }

      // Get invoice details
      const invoiceResult = await pool.query(`
        SELECT
          vi.*,
          v.name as vendor_name,
          v.contact_email as vendor_email,
          v.name as vendor_contact,
          'check' as vendor_payment_method,
          NULL as bank_name,
          NULL as account_number,
          NULL as routing_number,
          v.address as vendor_address,
          NULL as vendor_city,
          NULL as vendor_state,
          NULL as vendor_zip,
          NULL as vendor_tax_id,
          u_approved.username as approved_by_name,
          u_approved.email as approved_by_email,
          COALESCE(payments.total_paid, 0) as total_paid,
          (vi.total - COALESCE(payments.total_paid, 0)) as balance_due
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
      `, [id]);

      if (invoiceResult.rows.length === 0) {
        throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Vendor invoice not found.');
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
      `, [id]);

      res.json({
        success: true,
        data: {
          invoice: invoiceResult.rows[0],
          payments: paymentsResult.rows
        }
      });
    } catch (error) {
      console.error('Error fetching vendor invoice details:', error);
      throw error;
    }
  })
);

// Process payment for vendor invoice
router.post(
  '/accounting/vendor-invoices/:id/payments',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { role } = (req as any).user;
      const { id } = req.params;
      const invoiceId = parseInt(id, 10);

      if (isNaN(invoiceId)) {
        throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Invalid invoice ID.');
      }

      const {
        amount,
        payment_date,
        payment_method,
        reference_number,
        notes
      } = req.body;

      if (role !== 'accountant' && role !== 'admin') {
        throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Access denied. Accountant or admin role required.');
      }

      if (!amount || amount <= 0) {
        throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Valid payment amount is required.');
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Get invoice details and current balance
        const invoiceResult = await client.query(`
          SELECT
            vi.*,
            COALESCE(payments.total_paid, 0) as total_paid,
            (vi.total - COALESCE(payments.total_paid, 0)) as balance_due
          FROM vendor_invoices vi
          LEFT JOIN (
            SELECT
              vendor_invoice_id,
              SUM(amount) as total_paid
            FROM vendor_payments
            WHERE status = 'processed'
            GROUP BY vendor_invoice_id
          ) payments ON payments.vendor_invoice_id = vi.id
          WHERE vi.id = $1 AND vi.status = 'submitted_to_accounting'
        `, [invoiceId]);

        if (invoiceResult.rows.length === 0) {
          throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Vendor invoice not found or not ready for payment processing.');
        }

        const invoice = invoiceResult.rows[0];
        const balanceDue = parseFloat(invoice.balance_due);
        const paymentAmount = parseFloat(amount);

        if (paymentAmount > balanceDue) {
          throw new AppError(400, errorCodes.VALIDATION_ERROR, `Payment amount ($${paymentAmount.toFixed(2)}) exceeds balance due ($${balanceDue.toFixed(2)}).`);
        }

        // Record the payment
        const paymentResult = await client.query(`
          INSERT INTO vendor_payments (
            vendor_invoice_id,
            amount,
            payment_date,
            payment_method,
            reference_number,
            notes,
            status,
            processed_by,
            processed_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'processed', $7, NOW())
          RETURNING *
        `, [
          invoiceId,
          paymentAmount,
          payment_date || new Date(),
          payment_method,
          reference_number,
          notes,
          (req as any).user.id
        ]);

        // Update invoice status based on total payments vs invoice total
        const invoiceTotal = parseFloat(invoice.total) || parseFloat(invoice.amount) || 0;
        const totalPaidAfterThisPayment = parseFloat(invoice.total_paid) + paymentAmount;
        const newStatus = totalPaidAfterThisPayment >= invoiceTotal ? 'paid' : 'submitted_to_accounting';

        await client.query(`
          UPDATE vendor_invoices
          SET status = $1::vendor_invoice_status_detailed,
              paid_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE paid_at END,
              updated_at = NOW()
          WHERE id = $2
        `, [newStatus, invoiceId]);

        await client.query('COMMIT');

        res.json({
          success: true,
          message: `Payment of $${paymentAmount.toFixed(2)} processed successfully.`,
          data: {
            payment: paymentResult.rows[0],
            invoiceStatus: newStatus,
            remainingBalance: Math.max(0, invoiceTotal - paymentAmount)
          }
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error processing vendor payment:', error);
      throw error;
    }
  })
);

// Reject vendor invoice (accounting)
router.post(
  '/accounting/vendor-invoices/:id/reject',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { role } = (req as any).user;
      const { id } = req.params;
      const invoiceId = parseInt(id, 10);

      if (isNaN(invoiceId)) {
        throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Invalid invoice ID.');
      }

      const { notes } = req.body;

      if (role !== 'accountant' && role !== 'admin') {
        throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Access denied. Accountant or admin role required.');
      }

      if (!notes?.trim()) {
        throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Notes are required when rejecting an invoice.');
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Get the invoice - checking for submitted_to_accounting status
        const invoiceResult = await client.query(`
          SELECT vi.*, v.contact_email as vendor_email, v.name as vendor_name
          FROM vendor_invoices vi
          LEFT JOIN vendors v ON vi.vendor_id = v.id
          WHERE vi.id = $1 AND vi.status = 'submitted_to_accounting'
        `, [invoiceId]);

        if (invoiceResult.rows.length === 0) {
          throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Invoice not found or not ready for processing.');
        }

        const invoice = invoiceResult.rows[0];
        const userId = (req as any).user.id;

        // Reject the invoice
        await client.query(`
          UPDATE vendor_invoices
          SET status = 'rejected_by_accountant'::vendor_invoice_status_detailed,
              admin_notes = $1,
              rejection_reason = $1,
              rejected_at = NOW(),
              rejected_by = $2,
              updated_at = NOW()
          WHERE id = $3
        `, [notes, userId, invoiceId]);

        await client.query('COMMIT');

        res.json({
          success: true,
          message: 'Invoice rejected successfully.',
          data: {
            invoiceId: invoiceId,
            status: 'rejected_by_accountant'
          }
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error rejecting vendor invoice:', error);
      throw error;
    }
  })
);

// Get vendor payment history
router.get(
  '/accounting/vendor-payments',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { role } = (req as any).user;

      if (role !== 'accountant' && role !== 'admin') {
        throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Access denied. Accountant or admin role required.');
      }

      const result = await pool.query(`
        SELECT
          vp.*,
          vi.invoice_number,
          vi.amount as invoice_amount,
          v.name as vendor_name,
          u_processed.username as processed_by_name
        FROM vendor_payments vp
        JOIN vendor_invoices vi ON vp.vendor_invoice_id = vi.id
        JOIN vendors v ON vi.vendor_id = v.id
        LEFT JOIN users u_processed ON vp.processed_by = u_processed.id
        ORDER BY vp.payment_date DESC, vp.created_at DESC
      `);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching vendor payment history:', error);
      throw error;
    }
  })
);

export default router;
