import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/errorHandler.js';
import { ApiResponseBuilder } from '../../utils/apiResponse.js';
import { keysToCamel } from '../../utils/caseConverter.js';
import { AppError, errorCodes } from '../../utils/errorHandler.js';
import { pool } from '../../config/database.js';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware.js';
import { PDFService } from '../../services/pdfService.js';
import { cacheService } from '../../services/cacheService.js';
import { devLog } from '../../utils/devLog.js';

const router = Router();

// Get accounting dashboard data
router.get(
  '/accounting/dashboard',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Total Billed (Total Invoiced Amount)
      const totalBilled = await pool.query(`
        SELECT COALESCE(SUM(i.base_cost + i.tax_amount), 0) as total_billed
        FROM invoice_with_breakdown i
        WHERE i.posted_to_org = TRUE
      `);

      // Total Paid (Verified Payments)
      const totalPaid = await pool.query(`
        SELECT COALESCE(SUM(p.amount), 0) as total_paid
        FROM payments p
        WHERE p.status = 'verified'
      `);

      // Outstanding Amount (Total Billed - Total Paid)
      const outstandingAmount = await pool.query(`
        SELECT
          COUNT(*) as count,
          COALESCE(SUM(i.base_cost + i.tax_amount - COALESCE(payments.total_paid, 0)), 0) as total_outstanding
        FROM invoice_with_breakdown i
        LEFT JOIN (
          SELECT invoice_id, SUM(amount) as total_paid
          FROM payments
          WHERE status = 'verified'
          GROUP BY invoice_id
        ) payments ON payments.invoice_id = i.id
        WHERE i.posted_to_org = TRUE
        AND (i.base_cost + i.tax_amount - COALESCE(payments.total_paid, 0)) > 0
      `);

      // Payments This Month
      const paymentsThisMonth = await pool.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
        FROM payments
        WHERE status = 'verified'
        AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      `);

      // Completed Courses This Month (for instructor payments)
      const completedCoursesThisMonth = await pool.query(`
        SELECT COUNT(*) as completed_courses
        FROM course_requests
        WHERE status = 'completed'
        AND EXTRACT(MONTH FROM completed_at) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM completed_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      `);

      const dashboardData = {
        totalBilled: Number(totalBilled.rows[0]?.total_billed || 0),
        totalPaid: Number(totalPaid.rows[0]?.total_paid || 0),
        outstandingInvoices: {
          count: parseInt(outstandingAmount.rows[0]?.count || 0),
          amount: Number(outstandingAmount.rows[0]?.total_outstanding || 0),
        },
        paymentsThisMonth: {
          count: parseInt(paymentsThisMonth.rows[0]?.count || 0),
          amount: Number(paymentsThisMonth.rows[0]?.total_amount || 0),
        },
        completedCoursesThisMonth: parseInt(
          completedCoursesThisMonth.rows[0]?.completed_courses || 0
        ),
      };

      res.json({
        success: true,
        data: dashboardData,
      });
    } catch (error) {
      console.error('Error fetching accounting dashboard:', error);
      throw error;
    }
  })
);

// Get course pricing for all organizations
router.get(
  '/accounting/course-pricing',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    devLog('[Debug] Getting course pricing with cache');
    // Note: handler has conditional logic — accountants see all, org users see theirs

    try {
      const user = req.user!;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (user.role === 'accountant' || user.role === 'admin' || user.role === 'sysadmin') {
        // For accountants/admins/sysadmin, get all pricing
        const pricing = await cacheService.getAllCoursePricing();

        res.json({
          success: true,
          data: pricing,
          cached: true,
        });
      } else if (user.organizationId) {
        // For organization users, get only their pricing
        const pricing = await cacheService.getCoursePricing(
          user.organizationId
        );

        res.json({
          success: true,
          data: pricing,
          cached: true,
        });
      } else {
        res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }
    } catch (error) {
      console.error('Error fetching course pricing:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch course pricing',
      });
    }
  })
);

// Update course pricing
router.put(
  '/accounting/course-pricing/:id',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { price_per_student } = req.body;

      if (!price_per_student || price_per_student <= 0) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Valid price per student is required'
        );
      }

      const result = await pool.query(
        `
      UPDATE course_pricing
      SET price_per_student = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_active = true
      RETURNING *
    `,
        [price_per_student, id]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Course pricing record not found'
        );
      }

      res.json({
        success: true,
        message: 'Course pricing updated successfully',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error updating course pricing:', error);
      throw error;
    }
  })
);

// Get organizations list for pricing setup
router.get(
  '/accounting/organizations',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    devLog('[Debug] Getting organizations with cache');

    try {
      // Use cached organizations
      const organizations = await cacheService.getOrganizations();

      res.json({
        success: true,
        data: organizations,
        cached: true,
      });
    } catch (error) {
      console.error('Error fetching organizations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch organizations',
      });
    }
  })
);

// Get course types for pricing setup
router.get(
  '/accounting/course-types',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
      SELECT id, name, description, duration_minutes
      FROM class_types
      ORDER BY name
    `);

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('Error fetching course types:', error);
      throw error;
    }
  })
);

// Create new course pricing
router.post(
  '/accounting/course-pricing',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const {
        organization_id,
        course_type_id,
        price_per_student,
        organizationId,
        classTypeId,
        pricePerStudent
      } = req.body;

      // Handle both camelCase and snake_case field names
      const orgId = organization_id || organizationId;
      const courseTypeId = course_type_id || classTypeId;
      const price = price_per_student || pricePerStudent;

      if (
        !orgId ||
        !courseTypeId ||
        !price ||
        price <= 0
      ) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'All fields are required and price must be greater than 0'
        );
      }

      // Check if pricing already exists for this combination
      const existingResult = await pool.query(
        `
      SELECT id FROM course_pricing
      WHERE organization_id = $1 AND course_type_id = $2 AND is_active = true
    `,
        [orgId, courseTypeId]
      );

      let result;
      if (existingResult.rows.length > 0) {
        // Update existing pricing
        result = await pool.query(
          `
        UPDATE course_pricing
        SET price_per_student = $3, effective_date = CURRENT_DATE
        WHERE organization_id = $1 AND course_type_id = $2 AND is_active = true
        RETURNING *
      `,
          [orgId, courseTypeId, price]
        );
      } else {
        // Create new pricing
        result = await pool.query(
          `
        INSERT INTO course_pricing (organization_id, course_type_id, price_per_student, effective_date, is_active)
        VALUES ($1, $2, $3, CURRENT_DATE, true)
        RETURNING *
      `,
          [orgId, courseTypeId, price]
        );
      }

      res.json({
        success: true,
        message: existingResult.rows.length > 0
          ? 'Course pricing updated successfully'
          : 'Course pricing created successfully',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error creating course pricing:', error);
      throw error;
    }
  })
);

// Delete course pricing
router.delete(
  '/accounting/course-pricing/:id',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
      DELETE FROM course_pricing
      WHERE id = $1
      RETURNING *
    `,
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Course pricing not found'
        );
      }

      res.json({
        success: true,
        message: 'Course pricing deleted successfully',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error deleting course pricing:', error);
      throw error;
    }
  })
);

// Get billing queue (completed courses ready for invoicing)
router.get(
  '/accounting/billing-queue',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
      SELECT
        cr.id as course_id,
        cr.organization_id,
        o.name as organization_name,
        o.contact_email,
        ct.name as course_type_name,
        cr.location,
        cr.completed_at::date as date_completed,
        cr.registered_students,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) as students_attended,
        cp.price_per_student as rate_per_student,
        ((SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) * cp.price_per_student * 1.13) as total_amount,
        COALESCE(
          -- First try to get full name from users table
          NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ''),
          -- Fallback to course_students table
          (SELECT DISTINCT cs.first_name || ' ' || cs.last_name
           FROM course_students cs
           WHERE LOWER(cs.email) = LOWER(u.email)
           AND cs.first_name IS NOT NULL
           AND cs.last_name IS NOT NULL
           LIMIT 1),
          -- Final fallback to username if no full name found
          u.username
        ) as instructor_name,
        u.email as instructor_email,
        cr.ready_for_billing_at
      FROM course_requests cr
      JOIN organizations o ON cr.organization_id = o.id
      JOIN class_types ct ON cr.course_type_id = ct.id
      JOIN course_pricing cp ON cr.organization_id = cp.organization_id AND cr.course_type_id = cp.course_type_id AND cp.is_active = true
      LEFT JOIN users u ON cr.instructor_id = u.id
      WHERE cr.ready_for_billing = true
      AND cr.ready_for_billing_at IS NOT NULL
      AND (cr.invoiced IS NULL OR cr.invoiced = FALSE)
      ORDER BY cr.ready_for_billing_at DESC
    `);

      res.json({
        success: true,
        data: keysToCamel(result.rows),
      });
    } catch (error) {
      console.error('Error fetching billing queue:', error);
      throw error;
    }
  })
);

// Create invoice from completed course
router.post(
  '/accounting/invoices',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { courseId } = req.body;

      if (!courseId) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Course ID is required'
        );
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Get course details
        const courseResult = await client.query(
          `
        SELECT
          cr.id,
          cr.organization_id,
          cr.completed_at,
          cr.location,
          o.name as organization_name,
          o.contact_email,
          ct.name as course_type_name,
          (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) as students_attended,
          cp.price_per_student,
          COALESCE(
            -- First try to get full name from users table
            NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ''),
            -- Fallback to course_students table
            (SELECT DISTINCT cs.first_name || ' ' || cs.last_name
             FROM course_students cs
             WHERE LOWER(cs.email) = LOWER(u.email)
             AND cs.first_name IS NOT NULL
             AND cs.last_name IS NOT NULL
             LIMIT 1),
            -- Final fallback to username if no full name found
            u.username
          ) as instructor_name
        FROM course_requests cr
        JOIN organizations o ON cr.organization_id = o.id
        JOIN class_types ct ON cr.course_type_id = ct.id
        JOIN course_pricing cp ON cr.organization_id = cp.organization_id AND cr.course_type_id = cp.course_type_id AND cp.is_active = true
        LEFT JOIN users u ON cr.instructor_id = u.id
        WHERE cr.id = $1 AND cr.ready_for_billing = true
      `,
          [courseId]
        );

        if (courseResult.rows.length === 0) {
          throw new AppError(
            404,
            errorCodes.RESOURCE_NOT_FOUND,
            'Course not found, not ready for billing, or pricing not configured. Please ensure pricing is set up for this organization and course type.'
          );
        }

        const course = courseResult.rows[0];
        const baseCost = course.students_attended * course.price_per_student;
        const taxAmount = baseCost * 0.13; // 13% HST
        const totalAmount = baseCost + taxAmount;

        devLog(`[DEBUG] Invoice creation calculations:`, {
          students_attended: course.students_attended,
          price_per_student: course.price_per_student,
          base_cost: baseCost,
          tax_amount: taxAmount,
          total_amount: totalAmount
        });

        // Generate invoice number
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

        // Create invoice with pending approval (NOT auto-posted to org)
        const invoiceResult = await client.query(
          `
        INSERT INTO invoices (
          invoice_number,
          organization_id,
          course_request_id,
          invoice_date,
          amount,
          base_cost,
          tax_amount,
          students_billed,
          status,
          due_date,
          posted_to_org,
          posted_to_org_at,
          course_type_name,
          location,
          date_completed,
          rate_per_student,
          approval_status
        )
        VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, 'pending', CURRENT_DATE + INTERVAL '30 days', FALSE, NULL, $8, $9, $10, $11, 'pending')
        RETURNING *
      `,
          [
            invoiceNumber,
            course.organization_id,
            courseId,
            totalAmount,
            baseCost,
            taxAmount,
            course.students_attended,
            course.course_type_name,
            course.location,
            course.completed_at,
            course.price_per_student,
          ]
        );

        // Mark the course as invoiced
        await client.query(
          `
        UPDATE course_requests
        SET invoiced = TRUE, invoiced_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
          [courseId]
        );

        await client.query('COMMIT');

        res.json({
          success: true,
          message: 'Invoice created successfully! The invoice is now pending approval.',
          data: invoiceResult.rows[0],
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  })
);

// Get invoices pending approval — accountant only
router.get(
  '/accounting/invoices/pending-approval',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      devLog('[DEBUG] Fetching invoices pending approval');

      const result = await pool.query(`
        SELECT
          i.id,
          i.invoice_number,
          i.organization_id,
          i.course_request_id,
          i.invoice_date,
          i.amount,
          i.base_cost,
          i.tax_amount,
          i.students_billed as studentsattendance,
          i.rate_per_student,
          i.status,
          i.due_date,
          i.posted_to_org,
          i.posted_to_org_at,
          i.approval_status,
          i.course_type_name,
          i.location,
          i.date_completed,
          i.created_at,
          o.name as organization_name,
          COALESCE(payments.total_paid, 0) as amount_paid,
          GREATEST(0, (i.base_cost + i.tax_amount) - COALESCE(payments.total_paid, 0)) as balancedue
        FROM invoices i
        LEFT JOIN organizations o ON i.organization_id = o.id
        LEFT JOIN (
          SELECT invoice_id, SUM(amount) as total_paid
          FROM payments
          WHERE status = 'completed'
          GROUP BY invoice_id
        ) payments ON i.id = payments.invoice_id
        WHERE i.approval_status = 'pending'
        ORDER BY i.created_at ASC
      `);

      devLog(`[DEBUG] Found ${result.rows.length} invoices pending approval`);

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('Error fetching pending approval invoices:', error);
      throw error;
    }
  })
);

// Approve or reject an invoice
router.put(
  '/accounting/invoices/:id/approval',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { approval_status, notes } = req.body;

      devLog(`[DEBUG] Updating approval status for invoice ${id} to ${approval_status}`);

      if (!['approved', 'rejected'].includes(approval_status)) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Invalid approval status. Must be "approved" or "rejected"'
        );
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Get invoice to verify it exists and is pending
        const invoiceResult = await client.query(
          'SELECT * FROM invoices WHERE id = $1',
          [id]
        );

        if (invoiceResult.rows.length === 0) {
          throw new AppError(
            404,
            errorCodes.RESOURCE_NOT_FOUND,
            'Invoice not found'
          );
        }

        const invoice = invoiceResult.rows[0];

        if (invoice.approval_status !== 'pending') {
          throw new AppError(
            400,
            errorCodes.VALIDATION_ERROR,
            `Invoice is already ${invoice.approval_status}`
          );
        }

        // Update the invoice
        let updateQuery;
        let updateParams;

        if (approval_status === 'approved') {
          // When approved, also post to org
          updateQuery = `
            UPDATE invoices
            SET approval_status = 'approved',
                posted_to_org = TRUE,
                posted_to_org_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
          `;
          updateParams = [id];
        } else {
          // When rejected, require a reason and store rejection details
          if (!notes || notes.trim() === '') {
            throw new AppError(
              400,
              errorCodes.VALIDATION_ERROR,
              'Rejection reason is required'
            );
          }
          updateQuery = `
            UPDATE invoices
            SET approval_status = 'rejected',
                rejection_reason = $2,
                rejected_at = CURRENT_TIMESTAMP,
                rejected_by = $3
            WHERE id = $1
            RETURNING *
          `;
          updateParams = [id, notes, req.user?.id];
        }

        const updateResult = await client.query(updateQuery, updateParams);

        await client.query('COMMIT');

        const statusMessage = approval_status === 'approved'
          ? 'Invoice approved and posted to organization.'
          : 'Invoice rejected.';

        res.json({
          success: true,
          message: statusMessage,
          data: updateResult.rows[0],
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating invoice approval:', error);
      throw error;
    }
  })
);

// Get rejected invoices for accountant to fix
router.get(
  '/accounting/invoices/rejected',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT
          i.*,
          o.name as organization_name,
          ct.name as course_type_name,
          u.username as rejected_by_name
        FROM invoices i
        LEFT JOIN organizations o ON i.organization_id = o.id
        LEFT JOIN course_requests cr ON i.course_request_id = cr.id
        LEFT JOIN class_types ct ON cr.course_type_id = ct.id
        LEFT JOIN users u ON i.rejected_by = u.id
        WHERE i.approval_status = 'rejected'
        ORDER BY i.rejected_at DESC`
      );

      res.json({
        success: true,
        data: keysToCamel(result.rows),
      });
    } catch (error) {
      console.error('Error fetching rejected invoices:', error);
      throw error;
    }
  })
);

// Resubmit a rejected invoice for approval
router.put(
  '/accounting/invoices/:id/resubmit',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Verify invoice exists and is rejected
      const invoiceResult = await pool.query(
        'SELECT * FROM invoices WHERE id = $1',
        [id]
      );

      if (invoiceResult.rows.length === 0) {
        throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Invoice not found');
      }

      const invoice = invoiceResult.rows[0];

      if (invoice.approval_status !== 'rejected') {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          `Cannot resubmit invoice with status '${invoice.approval_status}'. Only rejected invoices can be resubmitted.`
        );
      }

      // Update invoice to pending approval
      const result = await pool.query(
        `UPDATE invoices
        SET approval_status = 'pending',
            rejection_reason = NULL,
            rejected_at = NULL,
            rejected_by = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *`,
        [id]
      );

      res.json({
        success: true,
        message: 'Invoice resubmitted for approval',
        data: keysToCamel(result.rows[0]),
      });
    } catch (error) {
      console.error('Error resubmitting invoice:', error);
      throw error;
    }
  })
);

// Fix existing invoice calculations
router.put(
  '/accounting/invoices/:id/fix-calculations',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      devLog(`[DEBUG] Fixing calculations for invoice ID: ${id}`);

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Get invoice details with pricing
        const invoiceResult = await client.query(
          `
        SELECT
          i.id,
          i.students_billed,
          i.amount,
          cp.price_per_student
        FROM invoices i
        LEFT JOIN course_requests cr ON i.course_request_id = cr.id
        LEFT JOIN course_pricing cp ON cr.organization_id = cp.organization_id AND cr.course_type_id = cp.course_type_id AND cp.is_active = true
        WHERE i.id = $1
      `,
          [id]
        );

        if (invoiceResult.rows.length === 0) {
          throw new AppError(
            404,
            errorCodes.RESOURCE_NOT_FOUND,
            'Invoice not found'
          );
        }

        const invoice = invoiceResult.rows[0];

        if (!invoice.price_per_student) {
          throw new AppError(
            400,
            errorCodes.VALIDATION_ERROR,
            'Pricing not found for this invoice'
          );
        }

        // Calculate correct values
        const baseCost = invoice.students_billed * invoice.price_per_student;
        const taxAmount = baseCost * 0.13; // 13% HST
        const totalAmount = baseCost + taxAmount;

        devLog(`[DEBUG] Fixing invoice calculations:`, {
          invoice_id: invoice.id,
          students_billed: invoice.students_billed,
          price_per_student: invoice.price_per_student,
          old_amount: invoice.amount,
          new_base_cost: baseCost,
          new_tax_amount: taxAmount,
          new_total_amount: totalAmount
        });

        // Update invoice with correct calculations
        const updateResult = await client.query(
          `
        UPDATE invoices
        SET amount = $1,
            rate_per_student = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `,
          [totalAmount, invoice.price_per_student, id]
        );

        await client.query('COMMIT');

        res.json({
          success: true,
          message: 'Invoice calculations fixed successfully',
          data: {
            invoice_id: id,
            old_amount: invoice.amount,
            new_base_cost: baseCost,
            new_tax_amount: taxAmount,
            new_total_amount: totalAmount
          },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fixing invoice calculations:', error);
      throw error;
    }
  })
);

// Post invoice to organization (make it visible in their Bills Payable)
router.put(
  '/accounting/invoices/:id/post-to-org',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Get invoice details with organization info
        const invoiceResult = await client.query(
          `
        SELECT
          i.*,
          o.name as organization_name,
          o.contact_email,
          o.contact_phone,
          o.address,
          cr.location,
          ct.name as course_type_name,
          cr.completed_at as course_date
        FROM invoices i
        JOIN organizations o ON i.organization_id = o.id
        LEFT JOIN course_requests cr ON i.course_request_id = cr.id
        LEFT JOIN class_types ct ON cr.course_type_id = ct.id
        WHERE i.id = $1 AND i.posted_to_org = FALSE
      `,
          [id]
        );

        if (invoiceResult.rows.length === 0) {
          throw new AppError(
            404,
            errorCodes.RESOURCE_NOT_FOUND,
            'Invoice not found or already posted to organization'
          );
        }

        const invoice = invoiceResult.rows[0];

        // Update invoice to mark it as posted to organization
        const updateResult = await client.query(
          `
        UPDATE invoices
        SET posted_to_org = TRUE,
            posted_to_org_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `,
          [id]
        );

        // Archive the completed course when invoice is posted
        if (invoice.course_request_id) {
          await client.query(
            `
          UPDATE course_requests
          SET archived = TRUE,
              archived_at = CURRENT_TIMESTAMP,
              archived_by = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND status = 'completed'
        `,
            [req.user?.id, invoice.course_request_id]
          );

          devLog(`📁 [POST TO ORG] Course ${invoice.course_request_id} archived after invoice posting`);
        }

        // Send invoice PDF with attendance to organization asynchronously
        if (invoice.contact_email) {
          // Fire and forget - don't await the email
          (async () => {
            try {
              // Get attendance data for the invoice
              const attendanceResult = await pool.query(
                `
              SELECT
                cs.first_name,
                cs.last_name,
                cs.email,
                cs.attended
              FROM course_students cs
              WHERE cs.course_request_id = $1
              ORDER BY cs.last_name, cs.first_name
            `,
                [invoice.course_request_id]
              );

              const attendanceList = attendanceResult.rows.map(row => ({
                first_name: row.first_name,
                last_name: row.last_name,
                email: row.email,
                attended: row.attended
              }));

              // Prepare invoice data for PDF generation
              const invoiceData = {
                invoice_id: invoice.id,
                invoice_number: invoice.invoice_number,
                invoice_date: invoice.invoice_date,
                due_date: invoice.due_date,
                amount: invoice.amount,
                status: invoice.status,
                students_billed: invoice.students_billed,
                organization_name: invoice.organization_name,
                contact_email: invoice.contact_email,
                location: invoice.location,
                course_type_name: invoice.course_type_name,
                date_completed: invoice.course_date,
                organization_id: invoice.organization_id,
                attendance_list: attendanceList,
                rate_per_student: parseFloat(invoice.rate_per_student || '0')
              };

              // Generate PDF
              const { PDFService } = await import('../../services/pdfService.js');
              const pdfBuffer = await PDFService.generateInvoicePDF(invoiceData);

              // Prepare email data
              const emailData = {
                organizationName: invoice.organization_name,
                invoiceNumber: invoice.invoice_number,
                invoiceDate: new Date(invoice.invoice_date).toLocaleDateString(),
                dueDate: new Date(invoice.due_date).toLocaleDateString(),
                amount: parseFloat(invoice.amount),
                courseType: invoice.course_type_name,
                location: invoice.location,
                courseDate: invoice.course_date ? new Date(invoice.course_date).toLocaleDateString() : 'N/A',
                studentsBilled: invoice.students_billed,
                portalUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/organization/bills-payable`
              };

              // Send email with PDF attachment
              const { emailService } = await import('../../services/emailService.js');
              await emailService.sendInvoiceWithPDF(
                invoice.contact_email,
                emailData,
                pdfBuffer,
                `${invoice.invoice_number}.pdf`
              );

              // Log email sent
              await pool.query(
                `
              UPDATE invoices
              SET email_sent_at = CURRENT_TIMESTAMP
              WHERE id = $1
            `,
                [id]
              );

              devLog(`📧 [POST TO ORG] Invoice PDF with attendance sent to ${invoice.contact_email}`);
            } catch (emailError) {
              console.error('❌ [POST TO ORG] Email with PDF failed:', emailError);
              // Don't fail the entire operation if email fails
            }
          })();
        }

        await client.query('COMMIT');

        res.json({
          success: true,
          message: 'Invoice posted to organization successfully',
          data: {
            ...updateResult.rows[0],
            emailSent: !!invoice.contact_email
          },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error posting invoice to organization:', error);
      throw error;
    }
  })
);

// Get all invoices
router.get(
  '/accounting/invoices',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      // Only allow accounting roles to access this endpoint
      if (user.role !== 'accountant') {
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Accounting role required.'
        );
      }

      devLog(`[DEBUG] Fetching all invoices list for accounting user: ${user.username}`);

      const result = await pool.query(`
      SELECT
        i.id as invoiceid,
        i.invoice_number as invoicenumber,
        i.organization_id as organizationid,
        i.course_request_id as coursenumber,
        COALESCE(i.invoice_date, i.created_at) as invoicedate,
        i.due_date as duedate,
        i.amount,
        i.status,
        i.approval_status,
        i.students_billed as studentsattendance,
        i.paid_date,
        i.posted_to_org,
        i.posted_to_org_at,
        NULL as emailsentat,
        o.name as organizationname,
        o.contact_email as contactemail,
        cr.location,
        ct.name as course_type_name,
        cr.completed_at as date_completed,
        COALESCE(payments.total_paid, 0) as paidtodate,
        GREATEST(0, (i.base_cost + i.tax_amount) - COALESCE(payments.total_paid, 0)) as balancedue,
        i.base_cost,
        i.tax_amount,
        i.rate_per_student,
        CASE
          WHEN COALESCE(payments.total_paid, 0) >= (i.base_cost + i.tax_amount) THEN 'paid'
          WHEN CURRENT_DATE > i.due_date THEN 'overdue'
          ELSE 'pending'
        END as paymentstatus,
        CASE
          WHEN CURRENT_DATE <= i.due_date THEN 'current'
          WHEN CURRENT_DATE <= i.due_date + INTERVAL '30 days' THEN '1-30 days'
          WHEN CURRENT_DATE <= i.due_date + INTERVAL '60 days' THEN '31-60 days'
          WHEN CURRENT_DATE <= i.due_date + INTERVAL '90 days' THEN '61-90 days'
          ELSE '90+ days'
        END as agingbucket
      FROM invoice_with_breakdown i
      JOIN organizations o ON i.organization_id = o.id
      LEFT JOIN course_requests cr ON i.course_request_id = cr.id
      LEFT JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN course_pricing cp ON cr.organization_id = cp.organization_id AND cr.course_type_id = cp.course_type_id AND cp.is_active = true
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) as total_paid
        FROM payments
        WHERE status = 'verified'
        GROUP BY invoice_id
      ) payments ON payments.invoice_id = i.id
      ORDER BY i.created_at DESC
    `);

      devLog(`[DEBUG] All invoices result rows:`, result.rows.length);
      if (result.rows.length > 0) {
        devLog(`[DEBUG] First invoice from list:`, {
          invoiceid: result.rows[0].invoiceid,
          invoicenumber: result.rows[0].invoicenumber,
          coursenumber: result.rows[0].coursenumber,
          course_type_name: result.rows[0].course_type_name,
          rate_per_student: result.rows[0].rate_per_student,
          amount: result.rows[0].amount
        });
      }

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  })
);

// Get specific invoice details
router.get(
  '/accounting/invoices/:id',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      devLog(`[DEBUG] Fetching invoice details for ID: ${id}`);

      const result = await pool.query(
        `
      SELECT
        i.id,
        i.invoice_number as invoicenumber,
        COALESCE(ct.name, i.course_type_name, 'N/A') as name,
        cr.scheduled_date as course_date,
        i.students_billed as studentsattendance,
        i.amount,
        COALESCE(payments.total_paid, 0) as amount_paid,
        COALESCE(i.amount - COALESCE(payments.total_paid, 0), i.amount) as balance_due,
        (i.students_billed * COALESCE(cp.price_per_student, i.rate_per_student, 0)) as base_cost,
        ((i.students_billed * COALESCE(cp.price_per_student, i.rate_per_student, 0)) * 0.13) as tax_amount,
        i.due_date as duedate,
        i.status as paymentstatus,
        i.approval_status,
        i.posted_to_org,
        i.notes,
        i.created_at as invoicedate,
        i.updated_at,
        cr.completed_at as datecompleted,
        COALESCE(
          -- First try to get full name from users table
          NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ''),
          -- Fallback to course_students table
          (SELECT DISTINCT cs.first_name || ' ' || cs.last_name
           FROM course_students cs
           WHERE LOWER(cs.email) = LOWER(u.email)
           AND cs.first_name IS NOT NULL
           AND cs.last_name IS NOT NULL
           LIMIT 1),
          -- Final fallback to username if no full name found
          u.username
        ) as instructor_name,
        cr.location,
        i.organization_id,
        o.name as organizationname,
        o.contact_email as contactemail,
        o.address as addressstreet,
        o.contact_phone as contactphone,
        cr.id as coursenumber,
        i.course_request_id,
        cr.course_type_id,
        cp.price_per_student as rate_per_student,
        i.approved_by,
        i.approved_at,
        approver.username as approved_by_username
      FROM invoices i
      JOIN organizations o ON i.organization_id = o.id
      LEFT JOIN course_requests cr ON i.course_request_id = cr.id
      LEFT JOIN users u ON cr.instructor_id = u.id
      LEFT JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN course_pricing cp ON cr.organization_id = cp.organization_id AND cr.course_type_id = cp.course_type_id AND cp.is_active = true
      LEFT JOIN users approver ON i.approved_by = approver.id
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) as total_paid
        FROM payments
        GROUP BY invoice_id
      ) payments ON payments.invoice_id = i.id
      WHERE i.id = $1
    `,
        [id]
      );

      devLog(`[DEBUG] Query result rows:`, result.rows.length);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        devLog(`[DEBUG] Invoice data:`, {
          id: row.id,
          invoice_number: row.invoicenumber,
          organization_id: row.organization_id,
          course_request_id: row.course_request_id,
          course_type_id: row.course_type_id,
          rate_per_student: row.rate_per_student,
          amount: row.amount,
          students_billed: row.studentsattendance
        });
      }

      if (result.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Invoice not found'
        );
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      throw error;
    }
  })
);

// Update invoice
router.put(
  '/accounting/invoices/:id',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { amount, due_date, status, approval_status, notes } = req.body;
      const user = req.user!;

      // If this is an approval action, track the user and timestamp
      let approvedBy = null;
      let approvedAt = null;
      let enhancedNotes = notes;

      if (approval_status === 'approved') {
        approvedBy = user.id;
        approvedAt = new Date();

        // Enhance notes with user attribution
        const userAttribution = `\n\nApproved by: ${user.username} at ${approvedAt.toLocaleString()}`;
        enhancedNotes = notes ? `${notes}${userAttribution}` : `Invoice approved by accounting${userAttribution}`;
      }

      const result = await pool.query(
        `
      UPDATE invoices
      SET amount = COALESCE($1, amount),
          due_date = COALESCE($2, due_date),
          status = COALESCE($3, status),
          approval_status = COALESCE($4, approval_status),
          notes = COALESCE($5, notes),
          approved_by = COALESCE($6, approved_by),
          approved_at = COALESCE($7, approved_at),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `,
        [amount, due_date, status, approval_status, enhancedNotes, approvedBy, approvedAt, id]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Invoice not found'
        );
      }

      res.json({
        success: true,
        message: 'Invoice updated successfully',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  })
);

// Send invoice email (only allowed if posted to organization)
router.post(
  '/accounting/invoices/:id/email',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if invoice is posted to organization first
      const invoiceCheck = await pool.query(
        `SELECT id, posted_to_org, contact_email, organization_name, invoice_number, amount, due_date
         FROM invoices i
         JOIN organizations o ON i.organization_id = o.id
         WHERE i.id = $1`,
        [id]
      );

      if (invoiceCheck.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Invoice not found'
        );
      }

      const invoice = invoiceCheck.rows[0];

      if (!invoice.posted_to_org) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Invoice must be posted to organization before sending email. Please post the invoice first.'
        );
      }

      if (!invoice.contact_email) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Organization does not have a contact email address'
        );
      }

      // Send email notification to organization
      const { emailService } = await import('../../services/emailService.js');

      const emailData = {
        organizationName: invoice.organization_name,
        invoiceNumber: invoice.invoice_number,
        invoiceDate: new Date().toLocaleDateString(),
        dueDate: new Date(invoice.due_date).toLocaleDateString(),
        amount: parseFloat(invoice.amount),
        courseType: 'CPR Training Course', // You might want to get this from course_requests
        location: 'As specified in course', // You might want to get this from course_requests
        courseDate: 'As completed', // You might want to get this from course_requests
        studentsBilled: 1, // You might want to get this from course_requests
        portalUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/organization/bills-payable`
      };

      const emailSent = await emailService.sendInvoicePostedNotification(
        invoice.contact_email,
        emailData
      );

      if (emailSent) {
        // Update email sent timestamp
        await pool.query(
          `UPDATE invoices
           SET email_sent_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [id]
        );

        devLog(`📧 [EMAIL] Invoice notification sent to ${invoice.contact_email}`);

        res.json({
          success: true,
          message: 'Invoice email sent successfully',
          data: {
            emailSent: true,
            sentTo: invoice.contact_email,
            sentAt: new Date().toISOString()
          }
        });
      } else {
        throw new AppError(
          500,
          errorCodes.EMAIL_SEND_ERROR,
          'Failed to send invoice email'
        );
      }
    } catch (error) {
      console.error('Error sending invoice email:', error);
      throw error;
    }
  })
);

// Get invoice payments
router.get(
  '/accounting/invoices/:id/payments',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

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
      console.error('Error fetching invoice payments:', error);
      throw error;
    }
  })
);

// Record payment for invoice
router.post(
  '/accounting/invoices/:id/payments',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        amount_paid,
        payment_date,
        payment_method,
        reference_number,
        notes,
      } = req.body;

      if (!amount_paid || amount_paid <= 0) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Valid payment amount is required'
        );
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Record the payment
        const paymentResult = await client.query(
          `
        INSERT INTO payments (invoice_id, amount, payment_date, payment_method, reference_number, notes, status, submitted_by_org_at, verified_by_accounting_at, reversed_at, reversed_by)
        VALUES ($1, $2, $3, $4, $5, $6, 'verified', $7, $8, $9, $10)
        RETURNING *
      `,
          [
            id,
            amount_paid,
            payment_date || new Date(),
            payment_method,
            reference_number,
            notes,
            new Date(),
            null,
            null,
            null,
            null
          ]
        );

        // Update invoice status if fully paid
        const invoiceResult = await client.query(
          `
        SELECT amount, (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = $1 AND status = 'verified') as total_paid
        FROM invoices WHERE id = $1
      `,
          [id]
        );

        const invoice = invoiceResult.rows[0];
        if (invoice && invoice.total_paid >= invoice.amount) {
          await client.query(
            `
          UPDATE invoices SET status = 'paid', paid_date = NOW(), updated_at = NOW() WHERE id = $1
        `,
            [id]
          );
        } else {
          // Ensure invoice status is 'pending' for partial payments
          await client.query(
            `
          UPDATE invoices SET status = 'pending' WHERE id = $1
        `,
            [id]
          );
        }

        await client.query('COMMIT');

        res.json({
          success: true,
          message: 'Payment recorded successfully',
          data: paymentResult.rows[0],
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  })
);

// Generate PDF for invoice
router.get(
  '/accounting/invoices/:id/pdf',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      devLog(`[PDF] Generating PDF for invoice ${id}`);

      // Get invoice details
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
        o.name as organization_name,
        o.contact_email,
        cr.location,
        ct.name as course_type_name,
        cr.completed_at as date_completed,
        cp.price_per_student as rate_per_student,
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
      LEFT JOIN course_pricing cp ON cr.organization_id = cp.organization_id AND cr.course_type_id = cp.course_type_id AND cp.is_active = true
      LEFT JOIN course_students cs ON cr.id = cs.course_request_id
      WHERE i.id = $1
      GROUP BY i.id, i.invoice_number, i.organization_id, i.course_request_id, i.created_at, i.due_date, i.amount, i.status, i.students_billed, i.paid_date, o.name, o.contact_email, cr.location, ct.name, cr.completed_at, cp.price_per_student
    `,
        [id]
      );

      if (result.rows.length === 0) {
        devLog(`[PDF] Invoice ${id} not found`);
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Invoice not found'
        );
      }

      const invoice = result.rows[0];
      devLog(`[PDF] Generating PDF for invoice ${invoice.invoice_number}`);

      const pdfBuffer = await PDFService.generateInvoicePDF(invoice);
      devLog(
        `[PDF] PDF generated successfully, size: ${pdfBuffer.length} bytes`
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Invoice-${invoice.invoice_number}.pdf"`
      );
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  })
);

// Preview invoice HTML
router.get(
  '/accounting/invoices/:id/preview',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get invoice details
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
        o.name as organization_name,
        o.contact_email,
        cr.location,
        ct.name as course_type_name,
        cr.completed_at as date_completed,
        cp.price_per_student as rate_per_student,
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
      LEFT JOIN course_pricing cp ON cr.organization_id = cp.organization_id AND cr.course_type_id = cp.course_type_id AND cp.is_active = true
      LEFT JOIN course_students cs ON cr.id = cs.course_request_id
      WHERE i.id = $1
      GROUP BY i.id, i.invoice_number, i.organization_id, i.course_request_id, i.created_at, i.due_date, i.amount, i.status, i.students_billed, i.paid_date, o.name, o.contact_email, cr.location, ct.name, cr.completed_at, cp.price_per_student
    `,
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Invoice not found'
        );
      }

      const invoice = result.rows[0];
      const html = PDFService.getInvoicePreviewHTML(invoice);

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('Error generating preview:', error);
      throw error;
    }
  })
);

// Revenue report endpoint
router.get(
  '/accounting/reports/revenue',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { year } = req.query;

      if (!year) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Year parameter is required'
        );
      }

      const result = await pool.query(
        `
      WITH monthly_data AS (
        SELECT
          TO_CHAR(DATE_TRUNC('month', generate_series(
            DATE_TRUNC('year', $1::date),
            DATE_TRUNC('year', $1::date) + INTERVAL '11 months',
            '1 month'
          )), 'YYYY-MM') as month,
          0 as default_value
      ),
      invoices_by_month AS (
        SELECT
          TO_CHAR(DATE_TRUNC('month', COALESCE(invoice_date, created_at)), 'YYYY-MM') as month,
          COALESCE(SUM(amount), 0) as total_invoiced
        FROM invoices
        WHERE EXTRACT(YEAR FROM COALESCE(invoice_date, created_at)) = EXTRACT(YEAR FROM $1::date)
        GROUP BY TO_CHAR(DATE_TRUNC('month', COALESCE(invoice_date, created_at)), 'YYYY-MM')
      ),
      payments_by_month AS (
        SELECT
          TO_CHAR(DATE_TRUNC('month', payment_date), 'YYYY-MM') as month,
          COALESCE(SUM(amount), 0) as total_paid_in_month
        FROM payments
        WHERE EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM $1::date)
        GROUP BY TO_CHAR(DATE_TRUNC('month', payment_date), 'YYYY-MM')
      )
      SELECT
        md.month,
        COALESCE(ibm.total_invoiced, 0) as total_invoiced,
        COALESCE(pbm.total_paid_in_month, 0) as total_paid_in_month,
        0 as balance_brought_forward -- Simplified for now
      FROM monthly_data md
      LEFT JOIN invoices_by_month ibm ON md.month = ibm.month
      LEFT JOIN payments_by_month pbm ON md.month = pbm.month
      ORDER BY md.month
    `,
        [year]
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('Error generating revenue report:', error);
      throw error;
    }
  })
);

// AR Aging Report endpoint
router.get(
  '/accounting/reports/ar-aging',
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'accountant']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { organization_id, as_of_date } = req.query;
      const asOfDate = as_of_date ? new Date(as_of_date as string) : new Date();

      devLog('[Debug] Generating AR aging report, org:', organization_id, 'asOfDate:', asOfDate);

      let orgFilter = '';
      const params: (string | number | Date)[] = [asOfDate];

      if (organization_id) {
        orgFilter = 'AND i.organization_id = $2';
        params.push(parseInt(organization_id as string));
      }

      const query = `
        WITH invoice_aging AS (
          SELECT
            i.id as invoice_id,
            i.invoice_number,
            i.organization_id,
            o.name as organization_name,
            i.amount,
            COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0) as paid_amount,
            i.amount - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0) as balance,
            i.invoice_date,
            i.due_date,
            CASE
              WHEN i.due_date IS NULL THEN 0
              ELSE ($1::date - i.due_date::date)
            END as days_overdue,
            i.status
          FROM invoices i
          LEFT JOIN organizations o ON i.organization_id = o.id
          WHERE i.status NOT IN ('paid', 'void', 'cancelled')
            AND (i.amount - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0)) > 0
            ${orgFilter}
        )
        SELECT
          invoice_id,
          invoice_number,
          organization_id,
          organization_name,
          amount,
          paid_amount,
          balance,
          invoice_date,
          due_date,
          days_overdue,
          status,
          CASE
            WHEN days_overdue <= 0 THEN 'current'
            WHEN days_overdue BETWEEN 1 AND 30 THEN '1-30'
            WHEN days_overdue BETWEEN 31 AND 60 THEN '31-60'
            WHEN days_overdue BETWEEN 61 AND 90 THEN '61-90'
            ELSE '90+'
          END as aging_bucket
        FROM invoice_aging
        ORDER BY days_overdue DESC, organization_name, invoice_date
      `;

      const result = await pool.query(query, params);

      // Calculate summary by aging bucket
      const summary = {
        current: 0,
        '1-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0,
        total: 0,
      };

      result.rows.forEach((row: { aging_bucket: string; balance: string | number }) => {
        const balance = parseFloat(row.balance as string) || 0;
        summary[row.aging_bucket as keyof typeof summary] =
          (summary[row.aging_bucket as keyof typeof summary] || 0) + balance;
        summary.total += balance;
      });

      res.json(ApiResponseBuilder.success({
        asOfDate: asOfDate.toISOString().split('T')[0],
        invoices: keysToCamel(result.rows),
        summary,
      }));
    } catch (error) {
      console.error('Error generating AR aging report:', error);
      throw error;
    }
  })
);

// Aging Report endpoint (comprehensive version for AgingReportView)
router.get(
  '/accounting/aging-report',
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'accountant']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { organization_id, as_of_date } = req.query;
      const asOfDate = as_of_date ? new Date(as_of_date as string) : new Date();
      const asOfDateStr = asOfDate.toISOString().split('T')[0];

      let orgFilter = '';
      const params: (string | number | Date)[] = [asOfDateStr];

      if (organization_id) {
        orgFilter = 'AND i.organization_id = $2';
        params.push(parseInt(organization_id as string));
      }

      // Get all unpaid invoices with aging info
      const invoiceQuery = `
        WITH invoice_data AS (
          SELECT
            i.id,
            i.invoice_number,
            i.organization_id,
            o.name as organization_name,
            i.amount,
            COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0) as paid_amount,
            i.amount - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0) as balance_due,
            i.invoice_date,
            i.due_date,
            CASE
              WHEN i.due_date IS NULL THEN 0
              ELSE GREATEST(0, ($1::date - i.due_date::date))
            END as days_outstanding,
            i.status
          FROM invoices i
          LEFT JOIN organizations o ON i.organization_id = o.id
          WHERE i.status NOT IN ('paid', 'void', 'cancelled')
            AND i.posted_to_org = TRUE
            AND (i.amount - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0)) > 0.01
            ${orgFilter}
        )
        SELECT
          id,
          invoice_number,
          organization_id,
          organization_name,
          amount,
          paid_amount,
          balance_due,
          invoice_date,
          due_date,
          days_outstanding,
          status,
          CASE
            WHEN due_date IS NULL OR due_date >= $1::date THEN 'Current'
            WHEN days_outstanding BETWEEN 1 AND 30 THEN '1-30 Days'
            WHEN days_outstanding BETWEEN 31 AND 60 THEN '31-60 Days'
            WHEN days_outstanding BETWEEN 61 AND 90 THEN '61-90 Days'
            ELSE '90+ Days'
          END as aging_bucket
        FROM invoice_data
        ORDER BY days_outstanding DESC, organization_name, invoice_date
      `;

      const invoiceResult = await pool.query(invoiceQuery, params);
      const invoices = invoiceResult.rows;

      // Calculate totals
      let totalOutstanding = 0;
      let totalOverdue = 0;
      const buckets: Record<string, { count: number; total: number; daysSum: number }> = {
        'Current': { count: 0, total: 0, daysSum: 0 },
        '1-30 Days': { count: 0, total: 0, daysSum: 0 },
        '31-60 Days': { count: 0, total: 0, daysSum: 0 },
        '61-90 Days': { count: 0, total: 0, daysSum: 0 },
        '90+ Days': { count: 0, total: 0, daysSum: 0 },
      };

      const orgBreakdown: Record<number, {
        organization_id: number;
        organization_name: string;
        total_balance: number;
        current_balance: number;
        days_1_30: number;
        days_31_60: number;
        days_61_90: number;
        days_90_plus: number;
      }> = {};

      invoices.forEach((inv: {
        organization_id: number;
        organization_name: string;
        balance_due: string | number;
        days_outstanding: number;
        aging_bucket: string;
      }) => {
        const balance = parseFloat(inv.balance_due as string) || 0;
        const days = inv.days_outstanding || 0;
        const bucket = inv.aging_bucket;

        totalOutstanding += balance;
        if (bucket !== 'Current') {
          totalOverdue += balance;
        }

        // Update bucket stats
        if (buckets[bucket]) {
          buckets[bucket].count++;
          buckets[bucket].total += balance;
          buckets[bucket].daysSum += days;
        }

        // Update org breakdown
        if (!orgBreakdown[inv.organization_id]) {
          orgBreakdown[inv.organization_id] = {
            organization_id: inv.organization_id,
            organization_name: inv.organization_name,
            total_balance: 0,
            current_balance: 0,
            days_1_30: 0,
            days_31_60: 0,
            days_61_90: 0,
            days_90_plus: 0,
          };
        }

        orgBreakdown[inv.organization_id].total_balance += balance;
        if (bucket === 'Current') {
          orgBreakdown[inv.organization_id].current_balance += balance;
        } else if (bucket === '1-30 Days') {
          orgBreakdown[inv.organization_id].days_1_30 += balance;
        } else if (bucket === '31-60 Days') {
          orgBreakdown[inv.organization_id].days_31_60 += balance;
        } else if (bucket === '61-90 Days') {
          orgBreakdown[inv.organization_id].days_61_90 += balance;
        } else if (bucket === '90+ Days') {
          orgBreakdown[inv.organization_id].days_90_plus += balance;
        }
      });

      // Calculate collection efficiency (payments received / invoices issued in last 90 days)
      const efficiencyQuery = `
        SELECT
          COALESCE(SUM(i.amount), 0) as total_invoiced,
          COALESCE((
            SELECT SUM(p.amount)
            FROM payments p
            JOIN invoices i2 ON p.invoice_id = i2.id
            WHERE i2.invoice_date >= ($1::date - INTERVAL '90 days')
          ), 0) as total_collected
        FROM invoices i
        WHERE i.invoice_date >= ($1::date - INTERVAL '90 days')
          AND i.posted_to_org = TRUE
      `;
      const efficiencyResult = await pool.query(efficiencyQuery, [asOfDateStr]);
      const totalInvoiced = parseFloat(efficiencyResult.rows[0]?.total_invoiced) || 0;
      const totalCollected = parseFloat(efficiencyResult.rows[0]?.total_collected) || 0;
      const collectionEfficiency = totalInvoiced > 0
        ? Math.round((totalCollected / totalInvoiced) * 100)
        : 100;

      // Build aging summary
      const agingSummary = Object.entries(buckets).map(([bucket, data]) => ({
        aging_bucket: bucket,
        invoice_count: data.count,
        total_balance: Math.round(data.total * 100) / 100,
        percentage_of_total: totalOutstanding > 0
          ? Math.round((data.total / totalOutstanding) * 1000) / 10
          : 0,
        avg_days_outstanding: data.count > 0
          ? Math.round(data.daysSum / data.count)
          : 0,
      }));

      // Build organization breakdown with risk score
      const organizationBreakdown = Object.values(orgBreakdown).map(org => ({
        ...org,
        total_balance: Math.round(org.total_balance * 100) / 100,
        current_balance: Math.round(org.current_balance * 100) / 100,
        days_1_30: Math.round(org.days_1_30 * 100) / 100,
        days_31_60: Math.round(org.days_31_60 * 100) / 100,
        days_61_90: Math.round(org.days_61_90 * 100) / 100,
        days_90_plus: Math.round(org.days_90_plus * 100) / 100,
        // Risk score: weighted by aging (higher weight for older buckets)
        risk_score: org.total_balance > 0 ? Math.min(100, Math.round(
          ((org.days_1_30 * 1) + (org.days_31_60 * 2) + (org.days_61_90 * 3) + (org.days_90_plus * 4))
          / org.total_balance * 25
        )) : 0,
      })).sort((a, b) => b.total_balance - a.total_balance);

      // Format invoice details
      const invoiceDetails = invoices.map((inv: {
        id: number;
        invoice_number: string;
        organization_name: string;
        amount: string | number;
        balance_due: string | number;
        due_date: string;
        days_outstanding: number;
        aging_bucket: string;
      }) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        organization_name: inv.organization_name,
        amount: Math.round((parseFloat(inv.amount as string) || 0) * 100) / 100,
        balance_due: Math.round((parseFloat(inv.balance_due as string) || 0) * 100) / 100,
        due_date: inv.due_date,
        days_outstanding: inv.days_outstanding,
        aging_bucket: inv.aging_bucket,
      }));

      const totalInvoices = invoices.length;
      const overdueInvoices = invoices.filter((i: { aging_bucket: string }) => i.aging_bucket !== 'Current').length;

      res.json(ApiResponseBuilder.success({
        report_metadata: {
          generated_at: new Date().toISOString(),
          as_of_date: asOfDateStr,
        },
        executive_summary: {
          total_outstanding: Math.round(totalOutstanding * 100) / 100,
          total_overdue: Math.round(totalOverdue * 100) / 100,
          collection_efficiency: collectionEfficiency,
          total_invoices: totalInvoices,
          overdue_invoices: overdueInvoices,
          overdue_percentage: totalInvoices > 0
            ? Math.round((overdueInvoices / totalInvoices) * 100)
            : 0,
        },
        aging_summary: agingSummary,
        organization_breakdown: organizationBreakdown,
        invoice_details: invoiceDetails,
      }));
    } catch (error) {
      console.error('Error generating aging report:', error);
      throw error;
    }
  })
);

// Financial Summary endpoint (Money In / Money Out)
router.get(
  '/accounting/financial-summary',
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'accountant']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { start_date, end_date } = req.query;

      // Default to current year if no dates provided
      const now = new Date();
      const defaultStartDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      const defaultEndDate = now.toISOString().split('T')[0];

      const startDate = (start_date as string) || defaultStartDate;
      const endDate = (end_date as string) || defaultEndDate;

      // Money In: Payments received from organizations
      const moneyInQuery = `
        SELECT
          COALESCE(SUM(p.amount), 0) as total,
          COUNT(p.id) as count
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.id
        WHERE p.payment_date >= $1::date
          AND p.payment_date <= $2::date
          AND p.status != 'reversed'
      `;
      const moneyInResult = await pool.query(moneyInQuery, [startDate, endDate]);
      const organizationPayments = parseFloat(moneyInResult.rows[0]?.total) || 0;
      const organizationPaymentCount = parseInt(moneyInResult.rows[0]?.count) || 0;

      // Money Out: Vendor payments
      const vendorPaymentsQuery = `
        SELECT
          COALESCE(SUM(amount), 0) as total,
          COUNT(id) as count
        FROM vendor_invoices
        WHERE status = 'paid'
          AND paid_at >= $1::date
          AND paid_at <= $2::date
      `;
      const vendorResult = await pool.query(vendorPaymentsQuery, [startDate, endDate]);
      const vendorPayments = parseFloat(vendorResult.rows[0]?.total) || 0;
      const vendorPaymentCount = parseInt(vendorResult.rows[0]?.count) || 0;

      // Money Out: Instructor payments (from payment_requests or timesheets)
      const instructorPaymentsQuery = `
        SELECT
          COALESCE(SUM(amount), 0) as total,
          COUNT(id) as count
        FROM payment_requests
        WHERE status = 'paid'
          AND paid_at >= $1::date
          AND paid_at <= $2::date
      `;
      let instructorPayments = 0;
      let instructorPaymentCount = 0;
      try {
        const instructorResult = await pool.query(instructorPaymentsQuery, [startDate, endDate]);
        instructorPayments = parseFloat(instructorResult.rows[0]?.total) || 0;
        instructorPaymentCount = parseInt(instructorResult.rows[0]?.count) || 0;
      } catch (e) {
        // Table might not exist, continue with 0
      }

      // Monthly breakdown for chart
      const monthlyQuery = `
        WITH months AS (
          SELECT generate_series(
            date_trunc('month', $1::date),
            date_trunc('month', $2::date),
            '1 month'::interval
          )::date as month
        ),
        monthly_in AS (
          SELECT
            date_trunc('month', p.payment_date)::date as month,
            COALESCE(SUM(p.amount), 0) as total
          FROM payments p
          JOIN invoices i ON p.invoice_id = i.id
          WHERE p.payment_date >= $1::date
            AND p.payment_date <= $2::date
            AND p.status != 'reversed'
          GROUP BY date_trunc('month', p.payment_date)
        ),
        monthly_vendor AS (
          SELECT
            date_trunc('month', paid_at)::date as month,
            COALESCE(SUM(amount), 0) as total
          FROM vendor_invoices
          WHERE status = 'paid'
            AND paid_at >= $1::date
            AND paid_at <= $2::date
          GROUP BY date_trunc('month', paid_at)
        )
        SELECT
          TO_CHAR(m.month, 'YYYY-MM') as month,
          TO_CHAR(m.month, 'Mon YYYY') as month_label,
          COALESCE(mi.total, 0) as money_in,
          COALESCE(mv.total, 0) as money_out
        FROM months m
        LEFT JOIN monthly_in mi ON m.month = mi.month
        LEFT JOIN monthly_vendor mv ON m.month = mv.month
        ORDER BY m.month
      `;
      const monthlyResult = await pool.query(monthlyQuery, [startDate, endDate]);

      // Fetch individual Money In transactions (organization payments)
      const moneyInTransactionsQuery = `
        SELECT
          p.id,
          p.payment_date,
          p.amount,
          p.payment_method,
          p.reference_number,
          p.status,
          i.invoice_number,
          o.name as organization_name
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.id
        JOIN organizations o ON i.organization_id = o.id
        WHERE p.payment_date >= $1::date
          AND p.payment_date <= $2::date
          AND p.status != 'reversed'
        ORDER BY p.payment_date DESC
      `;
      const moneyInTransactionsResult = await pool.query(moneyInTransactionsQuery, [startDate, endDate]);

      // Fetch individual Money Out transactions - Vendor payments
      const vendorTransactionsQuery = `
        SELECT
          vi.id,
          vi.paid_at as payment_date,
          vi.amount,
          vi.invoice_number,
          vi.description,
          v.company_name as payee_name,
          'vendor' as category
        FROM vendor_invoices vi
        JOIN vendors v ON vi.vendor_id = v.id
        WHERE vi.status = 'paid'
          AND vi.paid_at >= $1::date
          AND vi.paid_at <= $2::date
        ORDER BY vi.paid_at DESC
      `;
      const vendorTransactionsResult = await pool.query(vendorTransactionsQuery, [startDate, endDate]);

      // Fetch individual Money Out transactions - Instructor payments
      let instructorTransactions: any[] = [];
      try {
        const instructorTransactionsQuery = `
          SELECT
            pr.id,
            pr.paid_at as payment_date,
            pr.amount,
            pr.reference_number,
            pr.notes as description,
            u.first_name || ' ' || u.last_name as payee_name,
            'instructor' as category
          FROM payment_requests pr
          JOIN users u ON pr.instructor_id = u.id
          WHERE pr.status = 'paid'
            AND pr.paid_at >= $1::date
            AND pr.paid_at <= $2::date
          ORDER BY pr.paid_at DESC
        `;
        const instructorTransactionsResult = await pool.query(instructorTransactionsQuery, [startDate, endDate]);
        instructorTransactions = instructorTransactionsResult.rows;
      } catch (e) {
        // Table might not exist, continue with empty array
      }

      // Combine money out transactions
      const moneyOutTransactions = [
        ...vendorTransactionsResult.rows,
        ...instructorTransactions
      ].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

      const totalMoneyIn = organizationPayments;
      const totalMoneyOut = vendorPayments + instructorPayments;
      const netCashFlow = totalMoneyIn - totalMoneyOut;

      res.json(ApiResponseBuilder.success({
        period: {
          start_date: startDate,
          end_date: endDate,
        },
        money_in: {
          organization_payments: {
            amount: Math.round(organizationPayments * 100) / 100,
            count: organizationPaymentCount,
          },
          total: Math.round(totalMoneyIn * 100) / 100,
          transactions: moneyInTransactionsResult.rows.map(row => ({
            id: row.id,
            date: row.payment_date,
            organization_name: row.organization_name,
            invoice_number: row.invoice_number,
            payment_method: row.payment_method,
            reference_number: row.reference_number,
            amount: Math.round((parseFloat(row.amount) || 0) * 100) / 100,
            status: row.status,
          })),
        },
        money_out: {
          vendor_payments: {
            amount: Math.round(vendorPayments * 100) / 100,
            count: vendorPaymentCount,
          },
          instructor_payments: {
            amount: Math.round(instructorPayments * 100) / 100,
            count: instructorPaymentCount,
          },
          total: Math.round(totalMoneyOut * 100) / 100,
          transactions: moneyOutTransactions.map(row => ({
            id: row.id,
            date: row.payment_date,
            category: row.category,
            payee_name: row.payee_name,
            invoice_number: row.invoice_number,
            description: row.description,
            reference_number: row.reference_number,
            amount: Math.round((parseFloat(row.amount) || 0) * 100) / 100,
          })),
        },
        net_cash_flow: Math.round(netCashFlow * 100) / 100,
        monthly_breakdown: monthlyResult.rows.map(row => ({
          month: row.month,
          month_label: row.month_label,
          money_in: Math.round((parseFloat(row.money_in) || 0) * 100) / 100,
          money_out: Math.round((parseFloat(row.money_out) || 0) * 100) / 100,
        })),
      }));
    } catch (error) {
      console.error('Error generating financial summary:', error);
      throw error;
    }
  })
);

// Manual trigger for overdue invoices update (for testing/admin use)
router.post(
  '/accounting/trigger-overdue-update',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      // Import and trigger the scheduled job
      const { ScheduledJobsService } = await import(
        '../../services/scheduledJobs.js'
      );
      const scheduledJobs = ScheduledJobsService.getInstance();
      await scheduledJobs.triggerOverdueUpdate();

      res.json({
        success: true,
        message: 'Overdue invoices update triggered successfully',
      });
    } catch (error) {
      console.error('Error triggering overdue update:', error);
      throw error;
    }
  })
);

// Manual trigger for email reminders (for testing/admin use)
router.post(
  '/accounting/trigger-email-reminders',
  authenticateToken,
  requireRole(['accountant', 'admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      // Import and trigger the email reminders
      const { ScheduledJobsService } = await import(
        '../../services/scheduledJobs.js'
      );
      const scheduledJobs = ScheduledJobsService.getInstance();
      await scheduledJobs.triggerEmailReminders();

      res.json({
        success: true,
        message: 'Email reminders triggered successfully',
      });
    } catch (error) {
      console.error('Error triggering email reminders:', error);
      throw error;
    }
  })
);

export default router;
