import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../../utils/errorHandler.js';
import { ApiResponseBuilder } from '../../utils/apiResponse.js';
import { keysToCamel } from '../../utils/caseConverter.js';
import { AuthenticatedRequest, isDatabaseError, getErrorMessage } from '../../types/index.js';
import { AppError, errorCodes } from '../../utils/errorHandler.js';
import { pool } from '../../config/database.js';
import { generateTokens } from '../../utils/jwtUtils.js';
import { authenticateToken, requireRole, authorizeRoles } from '../../middleware/authMiddleware.js';
import { authenticateSession } from '../../middleware/sessionAuth.js';
import { PDFService } from '../../services/pdfService.js';
import { emailService } from '../../services/emailService.js';
import { notificationService } from '../../services/NotificationService.js';
import emailTemplatesRouter from './emailTemplates.js';
import { cacheService } from '../../services/cacheService.js';
import healthRouter from './health.js';
import cacheRouter from './cache.js';
import organizationRouter from './organization.js';
import organizationPricingRouter from './organizationPricing.js';
import sysadminRouter from './sysadmin.js';
import profileChangesRouter from './profile-changes.js';
import hrDashboardRouter from './hr-dashboard.js';
import timesheetRouter from './timesheet.js';
import payrollRouter from './payroll.js';
import payRatesRouter from './payRates.js';
import notificationsRouter from './notifications.js';
import vendorRouter from './vendor.js';
import authRouter from './auth.js';
import holidaysRouter from '../holidays.js';
import { roleBasedPasswordValidation, validatePasswordPolicy, getPasswordPolicyForRole } from '../../middleware/passwordPolicy.js';
import { Server } from 'socket.io';
import { createServer } from 'http';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { devLog } from '../../utils/devLog.js';

const router = Router();

// Mount health routes
router.use('/health', healthRouter);

// Mount cache routes
router.use('/cache', cacheRouter);

// Mount organization routes
router.use('/organization', organizationRouter);

// Mount organization pricing routes
router.use('/organization-pricing', organizationPricingRouter);
devLog('✅ Organization pricing routes mounted');

// Mount sysadmin routes
router.use('/sysadmin', sysadminRouter);
devLog('✅ Sysadmin routes mounted');

// Mount profile changes routes
router.use('/profile-changes', profileChangesRouter);
devLog('✅ Profile changes routes mounted');

// Mount HR dashboard routes
router.use('/hr-dashboard', hrDashboardRouter);
devLog('✅ HR dashboard routes mounted');

// Mount timesheet routes
router.use('/timesheet', timesheetRouter);
devLog('✅ Timesheet routes mounted');

// Mount payroll routes
router.use('/payroll', payrollRouter);
devLog('✅ Payroll routes mounted');

// Mount pay rates routes
router.use('/pay-rates', payRatesRouter);
devLog('✅ Pay rates routes mounted');

// Mount notifications routes
router.use('/notifications', notificationsRouter);
devLog('✅ Notifications routes mounted');

// Mount vendor routes
router.use('/vendor', vendorRouter);
devLog('✅ Vendor routes mounted');

// Mount auth routes
router.use('/auth', authRouter);
devLog('✅ Auth routes mounted');

// Mount holidays routes
router.use('/holidays', holidaysRouter);
devLog('✅ Holidays routes mounted');

// Get available instructors for a specific date (needs to be before auth middleware)
router.get(
  '/instructors/available/:date',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { date } = req.params;

      if (!date) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Date parameter is required'
        );
      }

      devLog('[Available Instructors] Checking for date:', date);

      // Simple query: Get all instructors who have marked themselves available for this date
      const result = await pool.query(
        `SELECT DISTINCT
        u.id, 
        u.username as instructor_name, 
        u.email,
        'Available' as availability_status
       FROM users u
       INNER JOIN instructor_availability ia ON u.id = ia.instructor_id 
         AND ia.date::date = $1::date
         AND ia.status = 'available'
       WHERE u.role = 'instructor' 
       ORDER BY u.username`,
        [date]
      );

      devLog(
        '[Available Instructors] Found:',
        result.rows.length,
        'instructors for date:',
        date
      );
      devLog('[Available Instructors] Results:', result.rows);

      return res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
    } catch (error) {
      console.error('Error fetching available instructors:', error);
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to fetch available instructors'
      );
    }
  })
);

// Protected routes
router.use('/dashboard', authenticateToken);
router.use('/courses', authenticateToken);

// Example route with error handling
router.get(
  '/users',
  asyncHandler(async (_req: Request, res: Response) => {
    // TODO: Implement actual user fetching
    res.json({
      success: true,
      data: {
        users: [{ id: 1, username: 'testuser' }],
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  })
);

// Example route with error throwing
router.get(
  '/users/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Example of throwing a custom error
    if (!id) {
      throw new AppError(
        400,
        errorCodes.VALIDATION_ERROR,
        'User ID is required'
      );
    }

    // Example of using the standardized response
    const user = { id: 1, name: 'John Doe' };

    return res.json(
      ApiResponseBuilder.success(keysToCamel(user), {
        version: '1.0.0',
      })
    );
  })
);

// Certifications routes
router.get(
  '/certifications',
  asyncHandler(async (req: Request, res: Response) => {
    devLog('[Debug] Getting certifications with cache');

    try {
      // Use cached certifications
      const certifications = await cacheService.getCertifications();

      res.json({
        success: true,
        data: certifications,
        cached: true,
      });
    } catch (error) {
      console.error('Error fetching certifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch certifications',
      });
    }
  })
);

router.get(
  '/certifications/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      // Get all certifications from cache, then filter
      const certifications = await cacheService.getCertifications();
      const certification = certifications.find(
        cert => cert.id.toString() === id
      );

      if (!certification) {
        return res.status(404).json({
          success: false,
          message: 'Certification not found',
        });
      }

      res.json({
        success: true,
        data: certification,
        cached: true,
      });
    } catch (error) {
      console.error('Error fetching certification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch certification',
      });
    }
  })
);

// Dashboard route
router.get(
  '/dashboard',
  asyncHandler(async (req: Request, res: Response) => {
    devLog('[Debug] Getting dashboard data with cache');

    try {
      const user = req.user!;

      // Use cached dashboard stats
      const dashboardStats = await cacheService.getDashboardStats(
        user.role,
        user.role === 'instructor' ? user.id : user.organizationId
      );

      res.json({
        success: true,
        data: { instructorStats: dashboardStats },
        cached: true,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard data',
      });
    }
  })
);

// Schedule route
router.get(
  '/schedule',
  authenticateToken,
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(`
      SELECT 
        c.id,
        c.date,
        c.start_time,
        c.end_time,
        c.location,
        c.status,
        c.max_students,
        c.current_students,
        ct.name as type,
        u.username as instructor_name,
        COUNT(e.student_id) as enrolled_students
      FROM classes c
      JOIN class_types ct ON c.type_id = ct.id
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN enrollments e ON c.id = e.class_id
      WHERE c.date >= CURRENT_DATE
      GROUP BY c.id, ct.name, u.username
      ORDER BY c.date ASC, c.start_time ASC
    `);

      const schedule = result.rows.map(row => ({
        id: row.id,
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        location: row.location,
        status: row.status,
        maxStudents: row.max_students,
        currentStudents: parseInt(row.enrolled_students),
        type: row.type,
        instructorName: row.instructor_name,
      }));

      return res.json(ApiResponseBuilder.success(keysToCamel(schedule)));
    } catch (error) {
      console.error('Error fetching schedule:', error);
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to fetch schedule'
      );
    }
  })
);

// Course types endpoint - Use caching
router.get(
  '/course-types',
  asyncHandler(async (req: Request, res: Response) => {
    devLog('[Debug] Getting course types with cache');

    try {
      // Use cached course types
      const courseTypes = await cacheService.getCourseTypes();
      // Transform the response to match frontend expectations
      const transformedCourseTypes = courseTypes.map(type => ({
        id: type.id,
        name: type.name,
        description: type.description,
        duration_minutes: type.duration_minutes
      }));

      res.json({
        success: true,
        data: transformedCourseTypes,
        cached: true,
      });
    } catch (error) {
      console.error('Error fetching course types:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch course types',
      });
    }
  })
);

// Organization course request endpoints
router.post(
  '/organization/course-request',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const {
        scheduledDate,
        location,
        courseTypeId,
        registeredStudents,
        notes,
      } = req.body;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'User must be associated with an organization'
        );
      }

      if (
        !scheduledDate ||
        !location ||
        !courseTypeId ||
        registeredStudents === undefined
      ) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Missing required fields'
        );
      }

      // Check for duplicate: same organization, same location, same date (non-cancelled)
      const duplicateCheck = await pool.query(
        `SELECT id, status FROM course_requests
         WHERE organization_id = $1
         AND location = $2
         AND scheduled_date = $3
         AND status NOT IN ('cancelled', 'completed')
         AND COALESCE(is_cancelled, false) = false`,
        [organizationId, location, scheduledDate]
      );

      if (duplicateCheck.rows.length > 0) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          `You already have a course request for this location on this date (Status: ${duplicateCheck.rows[0].status}). Please choose a different date or location.`
        );
      }

      const result = await pool.query(
        `INSERT INTO course_requests 
       (organization_id, course_type_id, date_requested, scheduled_date, location, registered_students, notes, status) 
       VALUES ($1, $2, (NOW() AT TIME ZONE 'America/Toronto')::date, $3, $4, $5, $6, 'pending') 
       RETURNING *, date_requested as request_submitted_date`,
        [
          organizationId,
          courseTypeId,
          scheduledDate,
          location,
          registeredStudents,
          notes,
        ]
      );

      const newCourse = result.rows[0];

      // Emit event for new course request
      const io = req.app.get('io');
      if (io) {
        io.emit('newCourseRequest', {
          type: 'new_course_request',
          data: newCourse
        });
      }

      // Create in-app notifications for admins asynchronously
      (async () => {
        try {
          // Get course type name and organization name
          const detailsResult = await pool.query(
            `SELECT ct.name as course_type_name, o.name as organization_name
             FROM class_types ct, organizations o
             WHERE ct.id = $1 AND o.id = $2`,
            [courseTypeId, organizationId]
          );

          if (detailsResult.rows.length > 0) {
            const { course_type_name, organization_name } = detailsResult.rows[0];
            const { notificationService } = await import('../../services/NotificationService.js');

            await notificationService.notifyNewCourseRequest(
              organization_name,
              course_type_name,
              new Date(scheduledDate).toLocaleDateString(),
              newCourse.id
            );

            devLog('✅ [NOTIFICATION] In-app notifications created for new course request');
          }
        } catch (notifError) {
          console.error('❌ [NOTIFICATION] Error creating new course request notifications:', notifError);
        }
      })();

      return res.json({
        success: true,
        message: 'Course request submitted successfully! Status: Pending',
        course: newCourse,
      });
    } catch (error) {
      console.error('Error creating course request:', error);
      const errorMsg = getErrorMessage(error);
      if (isDatabaseError(error)) {
        console.error('Error details:', {
          message: errorMsg,
          code: error.code,
          detail: error.detail,
          organizationId: req.user?.organizationId,
          body: req.body
        });
      }
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        `Failed to create course request: ${errorMsg}`
      );
    }
  })
);

// Organization courses endpoint moved to organization.ts to avoid duplicate routes

// Organization archive endpoint moved to organization.ts to avoid duplicate routes

// Organization Analytics Endpoints

// Course Request Analytics
router.get(
  '/organization/analytics/course-requests',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const organizationId = req.user?.organizationId;
      const { timeframe = '12' } = req.query; // Default to 12 months

      if (!organizationId) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'User must be associated with an organization'
        );
      }

      // Simplified analytics that work with any data
      const basicStats = await pool.query(
        `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_requests,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_requests
        FROM course_requests 
        WHERE organization_id = $1
          AND created_at >= CURRENT_DATE - INTERVAL '${timeframe} months'
      `,
        [organizationId]
      );

      const courseTypeStats = await pool.query(
        `
        SELECT 
          ct.name as course_type,
          COUNT(cr.id) as request_count
        FROM course_requests cr
        JOIN class_types ct ON cr.course_type_id = ct.id
        WHERE cr.organization_id = $1
          AND cr.created_at >= CURRENT_DATE - INTERVAL '${timeframe} months'
        GROUP BY ct.name
        ORDER BY request_count DESC
      `,
        [organizationId]
      );

      return res.json(
        ApiResponseBuilder.success(keysToCamel({
          summary: basicStats.rows[0],
          courseTypes: courseTypeStats.rows,
          timeframe: `${timeframe} months`,
        }))
      );
    } catch (error) {
      console.error('Error fetching course request analytics:', error);
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
        console.error('Error message:', error.message);
      }
      if (isDatabaseError(error) && error.detail) {
        console.error('DB error detail:', error.detail);
      }
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to fetch course request analytics'
      );
    }
  })
);

// Student Participation Analytics
router.get(
  '/organization/analytics/student-participation',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const organizationId = req.user?.organizationId;
      const { timeframe = '12' } = req.query; // Default to 12 months

      if (!organizationId) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'User must be associated with an organization'
        );
      }

      // Simplified student participation analytics
      const studentStats = await pool.query(
        `
        SELECT 
          COUNT(DISTINCT cr.id) as total_courses,
          COUNT(cs.id) as total_students,
          COUNT(CASE WHEN cs.attended = true THEN 1 END) as students_attended,
          CASE 
            WHEN COUNT(cs.id) > 0 THEN 
              ROUND((COUNT(CASE WHEN cs.attended = true THEN 1 END) * 100.0 / COUNT(cs.id)), 1)
            ELSE 0 
          END as attendance_rate
        FROM course_requests cr
        LEFT JOIN course_students cs ON cr.id = cs.course_request_id
        WHERE cr.organization_id = $1
          AND cr.created_at >= CURRENT_DATE - INTERVAL '${timeframe} months'
      `,
        [organizationId]
      );

      return res.json(
        ApiResponseBuilder.success(keysToCamel({
          summary: studentStats.rows[0],
          timeframe: `${timeframe} months`,
        }))
      );
    } catch (error) {
      console.error('Error fetching student participation analytics:', error);
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
        console.error('Error message:', error.message);
      }
      if (isDatabaseError(error) && error.detail) {
        console.error('DB error detail:', error.detail);
      }
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to fetch student participation analytics'
      );
    }
  })
);

// Billing Analytics (new endpoint)
router.get(
  '/organization/analytics/billing',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const organizationId = req.user?.organizationId;
      const { timeframe = '12' } = req.query; // Default to 12 months

      if (!organizationId) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'User must be associated with an organization'
        );
      }

      // Simplified billing analytics
      const billingStats = await pool.query(
        `
        SELECT 
          COUNT(*) as total_invoices,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invoices,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount
        FROM invoices 
        WHERE organization_id = $1
          AND invoice_date >= CURRENT_DATE - INTERVAL '${timeframe} months'
      `,
        [organizationId]
      );

      return res.json(
        ApiResponseBuilder.success(keysToCamel({
          summary: billingStats.rows[0],
          timeframe: `${timeframe} months`,
        }))
      );
    } catch (error) {
      console.error('Error fetching billing analytics:', error);
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to fetch billing analytics'
      );
    }
  })
);

// Get pending courses
router.get(
  '/courses/pending',
  authenticateToken,
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT cr.*, cr.date_requested as request_submitted_date, ct.name as course_type_name, o.name as organization_name, (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) AS students_attended
        FROM course_requests cr
        LEFT JOIN class_types ct ON cr.course_type_id = ct.id
        LEFT JOIN organizations o ON cr.organization_id = o.id
        WHERE cr.status IN ('pending', 'past_due')
        ORDER BY 
          CASE 
            WHEN cr.status = 'past_due' THEN 0
            ELSE 1
          END,
          cr.scheduled_date ASC
      `);
      return res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
    } catch (error) {
      console.error('Error fetching pending courses:', error);
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to fetch pending courses'
      );
    }
  })
);

// Update reminder timestamp endpoint
router.post(
  '/courses/:id/update-reminder',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        `UPDATE course_requests 
         SET last_reminder_at = CURRENT_TIMESTAMP 
         WHERE id = $1 
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Course request not found'
        );
      }

      return res.json(ApiResponseBuilder.success(keysToCamel(result.rows[0])));
    } catch (error) {
      console.error('Error updating reminder timestamp:', error);
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to update reminder timestamp'
      );
    }
  })
);

// Get confirmed courses
router.get(
  '/courses/confirmed',
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT cr.*, cr.date_requested as request_submitted_date, ct.name as course_type_name, o.name as organization_name, u.username as instructor_name, (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) AS students_attended
         FROM course_requests cr
         LEFT JOIN class_types ct ON cr.course_type_id = ct.id
         LEFT JOIN organizations o ON cr.organization_id = o.id
         LEFT JOIN users u ON cr.instructor_id = u.id
         WHERE cr.status = 'confirmed' 
         ORDER BY cr.confirmed_date ASC, cr.confirmed_start_time ASC`
      );

      return res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
    } catch (error) {
      console.error('Error fetching confirmed courses:', error);
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to fetch confirmed courses'
      );
    }
  })
);

// Get completed courses
router.get(
  '/courses/completed',
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT cr.*, cr.date_requested as request_submitted_date, ct.name as course_type_name, o.name as organization_name, u.username as instructor_name, (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) AS students_attended
         FROM course_requests cr
         LEFT JOIN class_types ct ON cr.course_type_id = ct.id
         LEFT JOIN organizations o ON cr.organization_id = o.id
         LEFT JOIN users u ON cr.instructor_id = u.id
         WHERE cr.status = 'completed' 
         ORDER BY cr.completed_at DESC`
      );

      return res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
    } catch (error) {
      console.error('Error fetching completed courses:', error);
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to fetch completed courses'
      );
    }
  })
);

// Get cancelled courses
router.get(
  '/courses/cancelled',
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT cr.*, cr.date_requested as request_submitted_date, ct.name as course_type_name, o.name as organization_name, u.username as instructor_name, (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) AS students_attended
         FROM course_requests cr
         LEFT JOIN class_types ct ON cr.course_type_id = ct.id
         LEFT JOIN organizations o ON cr.organization_id = o.id
         LEFT JOIN users u ON cr.instructor_id = u.id
         WHERE cr.status = 'cancelled' 
         ORDER BY cr.updated_at DESC`
      );

      return res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
    } catch (error) {
      console.error('Error fetching cancelled courses:', error);
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to fetch cancelled courses'
      );
    }
  })
);

// Cancel a course request
router.put(
  '/courses/:id/cancel',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason?.trim()) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Cancellation reason is required'
        );
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Update course request status to cancelled and add reason to notes
        const courseUpdateResult = await client.query(
          `UPDATE course_requests 
         SET status = CASE 
           WHEN scheduled_date < CURRENT_DATE THEN 'past_due'
           ELSE 'cancelled'
         END, 
         notes = CASE 
           WHEN notes IS NULL OR notes = '' THEN $2
           ELSE notes || E'\n\n[CANCELLED] ' || $2
         END,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 
         RETURNING *`,
          [id, reason]
        );

        if (courseUpdateResult.rows.length === 0) {
          throw new AppError(
            404,
            errorCodes.RESOURCE_NOT_FOUND,
            'Course request not found'
          );
        }

        const courseRequest = courseUpdateResult.rows[0];

        // If instructor was assigned, remove the corresponding class and restore availability
        if (courseRequest.instructor_id && courseRequest.confirmed_date) {
          // Format confirmed_date as YYYY-MM-DD string for consistent comparison
          const confirmedDateStr = new Date(courseRequest.confirmed_date).toISOString().split('T')[0];

          // Remove the class from instructor's schedule (compare start_time date portion)
          await client.query(
            `DELETE FROM classes
             WHERE instructor_id = $1 AND DATE(start_time) = $2`,
            [courseRequest.instructor_id, confirmedDateStr]
          );

          // Restore instructor availability for that date
          await client.query(
            `INSERT INTO instructor_availability (instructor_id, date, status)
             VALUES ($1, $2, 'available')
             ON CONFLICT (instructor_id, date) DO UPDATE SET status = 'available'`,
            [courseRequest.instructor_id, confirmedDateStr]
          );
        }

        await client.query('COMMIT');

        // Emit real-time update event
        const io = req.app.get('io');
        if (io) {
          io.emit('courseStatusChanged', {
            type: 'course_cancelled',
            courseId: id,
            status: 'cancelled',
            reason: reason,
            timestamp: new Date().toISOString()
          });
          devLog('📡 [WEBSOCKET] Emitted course cancellation event for course:', id);
        }

        // Create in-app notifications asynchronously
        (async () => {
          try {
            // Get course details for notification
            const courseDetails = await pool.query(
              `SELECT cr.*, ct.name as course_type_name, o.name as organization_name
               FROM course_requests cr
               JOIN class_types ct ON cr.course_type_id = ct.id
               LEFT JOIN organizations o ON cr.organization_id = o.id
               WHERE cr.id = $1`,
              [id]
            );

            if (courseDetails.rows.length > 0) {
              const course = courseDetails.rows[0];
              const { notificationService } = await import('../../services/NotificationService.js');
              const courseDate = course.confirmed_date
                ? new Date(course.confirmed_date).toLocaleDateString()
                : course.scheduled_date
                  ? new Date(course.scheduled_date).toLocaleDateString()
                  : 'N/A';

              // Notify instructor if assigned
              if (courseRequest.instructor_id) {
                await notificationService.notifyCourseCancelledToInstructor(
                  courseRequest.instructor_id,
                  course.course_type_name,
                  courseDate,
                  reason,
                  parseInt(id)
                );
              }

              // Notify organization
              if (courseRequest.organization_id) {
                await notificationService.notifyCourseCancelledToOrganization(
                  courseRequest.organization_id,
                  course.course_type_name,
                  courseDate,
                  reason,
                  parseInt(id)
                );
              }

              devLog('✅ [NOTIFICATION] In-app notifications created for course cancellation');
            }
          } catch (notifError) {
            console.error('❌ [NOTIFICATION] Error creating cancellation notifications:', notifError);
          }
        })();

        return res.json({
          success: true,
          message: 'Course cancelled successfully',
          course: courseRequest,
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error cancelling course:', error);
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to cancel course'
      );
    }
  })
);

// Update course schedule (reschedule)
router.put(
  '/courses/:id/schedule',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { scheduledDate, startTime, endTime, instructorId } = req.body;

      if (!scheduledDate) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Scheduled date is required'
        );
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Get current course data
        const currentCourseResult = await client.query(
          'SELECT *, date_requested as request_submitted_date FROM course_requests WHERE id = $1',
          [id]
        );

        if (currentCourseResult.rows.length === 0) {
          throw new AppError(
            404,
            errorCodes.RESOURCE_NOT_FOUND,
            'Course request not found'
          );
        }

        const currentCourse = currentCourseResult.rows[0];

        // Update course request with new schedule and optionally new instructor
        const updateFields = [
          'confirmed_date = $2',
          'updated_at = CURRENT_TIMESTAMP',
        ];
        const updateValues = [id, scheduledDate];
        let paramIndex = 3;

        if (startTime) {
          updateFields.push(`confirmed_start_time = $${paramIndex}`);
          updateValues.push(startTime);
          paramIndex++;
        }

        if (endTime) {
          updateFields.push(`confirmed_end_time = $${paramIndex}`);
          updateValues.push(endTime);
          paramIndex++;
        }

        if (instructorId && instructorId !== currentCourse.instructor_id) {
          updateFields.push(`instructor_id = $${paramIndex}`);
          updateValues.push(instructorId);
          paramIndex++;
        }

        const courseUpdateResult = await client.query(
          `UPDATE course_requests 
         SET ${updateFields.join(', ')}
         WHERE id = $1 
         RETURNING *`,
          updateValues
        );

        const updatedCourse = courseUpdateResult.rows[0];

        // If instructor changed or schedule changed, update classes table
        if (currentCourse.instructor_id && currentCourse.confirmed_date) {
          // Format old confirmed_date as YYYY-MM-DD string
          const oldConfirmedDateStr = new Date(currentCourse.confirmed_date).toISOString().split('T')[0];

          // Remove old class entry
          await client.query(
            `DELETE FROM classes
             WHERE instructor_id = $1 AND DATE(start_time) = $2`,
            [currentCourse.instructor_id, oldConfirmedDateStr]
          );

          // Restore old instructor's availability
          await client.query(
            `INSERT INTO instructor_availability (instructor_id, date, status)
             VALUES ($1, $2, 'available')
             ON CONFLICT (instructor_id, date) DO UPDATE SET status = 'available'`,
            [currentCourse.instructor_id, oldConfirmedDateStr]
          );
        }

        // Create new class entry for the updated course
        if (updatedCourse.instructor_id) {
          await client.query(
            `INSERT INTO classes (
            instructor_id, 
            class_type_id, 
            organization_id,
            start_time, 
            end_time, 
            location, 
            max_students, 
            status,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *`,
            [
              updatedCourse.instructor_id,
              updatedCourse.course_type_id,
              updatedCourse.organization_id,
              updatedCourse.confirmed_start_time || startTime,
              updatedCourse.confirmed_end_time || endTime,
              updatedCourse.location,
              updatedCourse.registered_students,
            ]
          );

          // Remove instructor's availability for the new scheduled date
          const newConfirmedDateStr = new Date(updatedCourse.confirmed_date).toISOString().split('T')[0];
          await client.query(
            `DELETE FROM instructor_availability
             WHERE instructor_id = $1 AND date = $2`,
            [updatedCourse.instructor_id, newConfirmedDateStr]
          );
        }

        await client.query('COMMIT');

        // Emit real-time update event
        const io = req.app.get('io');
        if (io) {
          io.emit('courseStatusChanged', {
            type: 'course_rescheduled',
            courseId: id,
            status: 'confirmed',
            scheduledDate: scheduledDate,
            instructorId: updatedCourse.instructor_id,
            timestamp: new Date().toISOString()
          });
          devLog('📡 [WEBSOCKET] Emitted course reschedule event for course:', id);
        }

        return res.json({
          success: true,
          message: 'Course schedule updated successfully',
          course: updatedCourse,
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating course schedule:', error);
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to update course schedule'
      );
    }
  })
);

// Assign instructor to course request
router.put(
  '/courses/:id/assign-instructor',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { instructorId, startTime, endTime } = req.body;

      if (!instructorId) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Instructor ID is required'
        );
      }

      // Start a transaction to ensure both operations succeed or fail together
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // First, get the course request details to get the scheduled date
        const courseRequestCheck = await client.query(
          'SELECT scheduled_date FROM course_requests WHERE id = $1',
          [id]
        );

        if (courseRequestCheck.rows.length === 0) {
          throw new AppError(
            404,
            errorCodes.RESOURCE_NOT_FOUND,
            'Course request not found'
          );
        }

        const scheduledDate = courseRequestCheck.rows[0].scheduled_date;
        if (!scheduledDate) {
          throw new AppError(
            400,
            errorCodes.VALIDATION_ERROR,
            'Course request must have a scheduled date before assigning instructor'
          );
        }

        // Format time strings
        const dateString = scheduledDate.toISOString().split('T')[0]; // YYYY-MM-DD
        // For course_requests (time columns), use only HH:MM:SS
        const formattedStartTimeTime = `${startTime}:00`;
        const formattedEndTimeTime = `${endTime}:00`;
        // For classes (timestamp columns), use full timestamp
        const formattedStartTimeTimestamp = `${dateString}T${startTime}:00`;
        const formattedEndTimeTimestamp = `${dateString}T${endTime}:00`;

        // Check if instructor is already assigned to another course at the same time on the scheduled date
        const existingAssignmentCheck = await client.query(
          `SELECT id FROM course_requests 
           WHERE instructor_id = $1 
           AND confirmed_date = $2
           AND status = 'confirmed'
           AND id != $3
           AND (
             (confirmed_start_time <= $4 AND confirmed_end_time > $4)
             OR (confirmed_start_time < $5 AND confirmed_end_time >= $5)
             OR (confirmed_start_time >= $4 AND confirmed_end_time <= $5)
           )`,
          [instructorId, scheduledDate, id, formattedStartTimeTime, formattedEndTimeTime]
        );

        if (existingAssignmentCheck.rows.length > 0) {
          throw new AppError(
            400,
            errorCodes.VALIDATION_ERROR,
            'Instructor is already assigned to another course during this time slot'
          );
        }

        // Get instructor details
        const instructorResult = await client.query(
          'SELECT email, username as instructor_name FROM users WHERE id = $1',
          [instructorId]
        );

        if (instructorResult.rows.length === 0) {
          throw new AppError(
            404,
            errorCodes.RESOURCE_NOT_FOUND,
            'Instructor not found'
          );
        }

        const instructor = instructorResult.rows[0];

        // Update course request with instructor and mark as confirmed
        const courseUpdateResult = await client.query(
          `UPDATE course_requests 
           SET instructor_id = $1, 
               status = 'confirmed', 
               confirmed_date = $2,
               confirmed_start_time = $3,
               confirmed_end_time = $4,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $5 
           RETURNING *, 
             (SELECT name FROM organizations WHERE id = organization_id) as organization_name,
             (SELECT name FROM class_types WHERE id = course_type_id) as course_type_name`,
          [instructorId, scheduledDate, formattedStartTimeTime, formattedEndTimeTime, id]
        );

        if (courseUpdateResult.rows.length === 0) {
          throw new AppError(
            404,
            errorCodes.RESOURCE_NOT_FOUND,
            'Course request not found'
          );
        }

        const courseRequest = courseUpdateResult.rows[0];

        // Remove instructor's availability for the scheduled date (use dateString for consistent format)
        await client.query(
          'DELETE FROM instructor_availability WHERE instructor_id = $1 AND date = $2',
          [instructorId, dateString]
        );

        // Create a new class entry
        const classInsertResult = await client.query(
          `INSERT INTO classes (
            instructor_id, 
            class_type_id, 
            organization_id,
            start_time, 
            end_time, 
            location, 
            max_students, 
            status,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *`,
          [
            instructorId,
            courseRequest.course_type_id,
            courseRequest.organization_id,
            formattedStartTimeTimestamp,
            formattedEndTimeTimestamp,
            courseRequest.location,
            courseRequest.registered_students,
          ]
        );

        await client.query('COMMIT');

        // Emit real-time update event
        const io = req.app.get('io');
        if (io) {
          io.emit('courseStatusChanged', {
            type: 'course_assigned',
            courseId: id,
            status: 'confirmed',
            instructorId: instructorId,
            scheduledDate: scheduledDate,
            timestamp: new Date().toISOString()
          });
          devLog('📡 [WEBSOCKET] Emitted course assignment event for course:', id);
        }

        // Send email notifications asynchronously (don't block the response)
        devLog('📧 [EMAIL] Sending email notifications asynchronously...');
        
        // Fire and forget - don't await the emails
        (async () => {
          try {
            // Get organization contact email
            const orgResult = await pool.query(
              'SELECT contact_email FROM organizations WHERE id = $1',
              [courseRequest.organization_id]
            );
            
            const organizationEmail = orgResult.rows[0]?.contact_email;
            
            // Send instructor email
            if (instructor.email) {
              const { emailService } = await import('../../services/emailService.js');
              const emailSent = await emailService.sendCourseAssignedNotification(
                instructor.email,
                {
                  courseName: courseRequest.course_type_name,
                  date: scheduledDate,
                  startTime: startTime,
                  endTime: endTime,
                  location: courseRequest.location,
                  organization: courseRequest.organization_name,
                  students: courseRequest.registered_students || 0,
                }
              );
              devLog('✅ [EMAIL] Instructor notification sent:', emailSent);
            }
            
            // Send organization email
            if (organizationEmail) {
              const { emailService } = await import('../../services/emailService.js');
              const emailSent = await emailService.sendCourseScheduledToOrganization(
                organizationEmail,
                {
                  courseName: courseRequest.course_type_name,
                  date: scheduledDate,
                  startTime: startTime,
                  endTime: endTime,
                  location: courseRequest.location,
                  instructorName: instructor.instructor_name,
                  students: courseRequest.registered_students || 0,
                }
              );
              devLog('✅ [EMAIL] Organization notification sent:', emailSent);
            }
            
            devLog('✅ [EMAIL] All email notifications sent successfully');
          } catch (emailError) {
            console.error('❌ [EMAIL] Error sending email notifications:', emailError);
            // Don't fail the entire operation if email fails
          }

          // Create in-app notifications
          try {
            const { notificationService } = await import('../../services/NotificationService.js');

            // Notify instructor
            await notificationService.notifyCourseAssignedToInstructor(
              instructorId,
              courseRequest.course_type_name,
              dateString,
              courseRequest.organization_name,
              courseRequest.location || 'TBD',
              parseInt(id)
            );

            // Notify organization users
            await notificationService.notifyCourseConfirmedToOrganization(
              courseRequest.organization_id,
              courseRequest.course_type_name,
              dateString,
              instructor.instructor_name,
              parseInt(id)
            );

            devLog('✅ [NOTIFICATION] In-app notifications created for course assignment');
          } catch (notifError) {
            console.error('❌ [NOTIFICATION] Error creating in-app notifications:', notifError);
          }
        })();

        return res.json({
          success: true,
          message:
            'Instructor assigned successfully! Course status updated to Confirmed and added to instructor schedule. Email notifications are being sent.',
          course: courseRequest,
          class: classInsertResult.rows[0],
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error assigning instructor:', error);
      throw error;
    }
  })
);

// Get email queue status
router.get(
  '/email-queue/status',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { emailQueueService } = await import('../../services/emailQueue.js');
      const status = await emailQueueService.getQueueLength();
      res.json(ApiResponseBuilder.success(keysToCamel(status), 'Email queue status retrieved'));
    } catch (error) {
      console.error('❌ [EMAIL QUEUE] Error getting queue status:', error);
      res.json(ApiResponseBuilder.success(keysToCamel({
        pendingJobs: 0,
        failedJobs: 0,
        isProcessing: false,
        error: 'Queue service unavailable'
      }), 'Email queue status (fallback)'));
    }
  })
);

// Get all instructors for assignment
router.get(
  '/instructors',
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT 
        u.id, 
        u.username as instructor_name, 
        u.email,
        COALESCE(ia.date::text, 'No availability set') as availability_date,
        COALESCE(ia.status, 'no_availability') as availability_status,
        COALESCE(cr.notes, '') as notes,
        CASE 
          WHEN cr.id IS NOT NULL AND cr.confirmed_date::date = ia.date::date AND cr.status = 'confirmed' THEN 'Confirmed'
          WHEN cr.id IS NOT NULL AND cr.confirmed_date::date = ia.date::date AND cr.status = 'completed' THEN 'Completed'
          WHEN ia.status = 'completed' THEN 'Completed'
          WHEN ia.status = 'available' THEN 'Available'
          WHEN ia.date IS NOT NULL THEN 'Available'
          ELSE 'No availability'
        END as assignment_status,
        COALESCE(o.name, '') as assigned_organization,
        COALESCE(cr.location, '') as assigned_location,
        COALESCE(ct.name, '') as assigned_course_type
       FROM users u
       LEFT JOIN instructor_availability ia ON u.id = ia.instructor_id 
         AND ia.date >= CURRENT_DATE
       LEFT JOIN course_requests cr ON u.id = cr.instructor_id 
         AND cr.confirmed_date::date = ia.date::date
         AND cr.status IN ('confirmed', 'completed')
       LEFT JOIN organizations o ON cr.organization_id = o.id
       LEFT JOIN class_types ct ON cr.course_type_id = ct.id
       WHERE u.role = 'instructor' 
       ORDER BY u.username, ia.date`
      );
      return res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
    } catch (error) {
      console.error('Error fetching instructors:', error);
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to fetch instructors'
      );
    }
  })
);

// Student Management Endpoints

// Get students for a specific course (for organizations)
router.get(
  '/organization/courses/:courseId/students',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      const organizationId = req.user?.organizationId;

      devLog('[ORG STUDENTS] Request details:', {
        courseId,
        organizationId,
        userId: req.user?.id,
        username: req.user?.username
      });

      if (!organizationId) {
        devLog('[ORG STUDENTS] No organizationId in user token');
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'User must be associated with an organization'
        );
      }

      // Verify the course belongs to this organization
      const courseCheck = await pool.query(
        'SELECT id, organization_id FROM course_requests WHERE id = $1',
        [courseId]
      );

      devLog('[ORG STUDENTS] Course check result:', courseCheck.rows);

      if (courseCheck.rows.length === 0) {
        devLog('[ORG STUDENTS] Course not found');
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Course not found'
        );
      }

      if (courseCheck.rows[0].organization_id !== organizationId) {
        devLog('[ORG STUDENTS] Course does not belong to organization:', {
          courseOrgId: courseCheck.rows[0].organization_id,
          userOrgId: organizationId
        });
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Course not found or not authorized'
        );
      }

      // Get students for this course with attendance information
      const result = await pool.query(
        `SELECT 
        s.id,
        s.course_request_id,
        s.first_name,
        s.last_name,
        s.email,
        s.attended,
        s.attendance_marked,
        s.created_at
       FROM course_students s
       WHERE s.course_request_id = $1
       ORDER BY s.last_name, s.first_name`,
        [courseId]
      );

      devLog('[ORG STUDENTS] Students found:', result.rows.length);
      return res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
    } catch (error) {
      console.error('[ORG STUDENTS] Error fetching course students:', error);
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to fetch course students'
      );
    }
  })
);

// Upload students for a specific course (for organizations)
router.post(
  '/organization/courses/:courseId/students',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      const { students } = req.body;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'User must be associated with an organization'
        );
      }

      if (!students || !Array.isArray(students) || students.length === 0) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Students array is required and must not be empty'
        );
      }

      // Verify the course belongs to this organization
      const courseCheck = await pool.query(
        'SELECT id FROM course_requests WHERE id = $1 AND organization_id = $2',
        [courseId, organizationId]
      );

      if (courseCheck.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Course not found or not authorized'
        );
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // First, delete existing students for this course (replace operation)
        await client.query(
          'DELETE FROM course_students WHERE course_request_id = $1',
          [courseId]
        );

        // Insert new students
        let insertedCount = 0;
        for (const student of students) {
          const { firstName, lastName, email } = student;

          if (!firstName || !lastName) {
            continue; // Skip invalid entries
          }

          await client.query(
            `INSERT INTO course_students (course_request_id, first_name, last_name, email)
           VALUES ($1, $2, $3, $4)`,
            [courseId, firstName.trim(), lastName.trim(), email?.trim() || null]
          );
          insertedCount++;
        }

        await client.query('COMMIT');

        return res.json({
          success: true,
          message: `Successfully uploaded ${insertedCount} students to the course.`,
          data: { studentsUploaded: insertedCount },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error uploading course students:', error);
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to upload course students'
      );
    }
  })
);

// Upload students for a course (alternative endpoint for CSV upload)
router.post(
  '/organization/upload-students',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { courseRequestId, students } = req.body;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'User must be associated with an organization'
        );
      }

      if (!courseRequestId) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Course request ID is required'
        );
      }

      if (!students || !Array.isArray(students) || students.length === 0) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Students array is required and must not be empty'
        );
      }

      // Verify the course belongs to this organization
      const courseCheck = await pool.query(
        'SELECT id FROM course_requests WHERE id = $1 AND organization_id = $2',
        [courseRequestId, organizationId]
      );

      if (courseCheck.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Course not found or not authorized'
        );
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // First, delete existing students for this course (replace operation)
        await client.query(
          'DELETE FROM course_students WHERE course_request_id = $1',
          [courseRequestId]
        );

        // Insert new students
        let insertedCount = 0;
        for (const student of students) {
          const { firstName, lastName, email } = student;

          if (!firstName || !lastName) {
            continue; // Skip invalid entries
          }

          await client.query(
            `INSERT INTO course_students (course_request_id, first_name, last_name, email)
           VALUES ($1, $2, $3, $4)`,
            [courseRequestId, firstName.trim(), lastName.trim(), email?.trim() || null]
          );
          insertedCount++;
        }

        // Update the registered_students count in course_requests table
        await client.query(
          'UPDATE course_requests SET registered_students = $1 WHERE id = $2',
          [insertedCount, courseRequestId]
        );

        await client.query('COMMIT');

        return res.json({
          success: true,
          message: `Successfully uploaded ${insertedCount} students to the course.`,
          data: { studentsUploaded: insertedCount },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error uploading course students:', error);
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to upload course students'
      );
    }
  })
);

// Admin endpoints to view specific instructor data
router.get(
  '/instructors/:id/schedule',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT c.id, c.date::text, c.start_time::text, c.end_time::text, c.status, c.location, 
              ct.name as type, c.max_students, c.current_students 
       FROM classes c 
       LEFT JOIN class_types ct ON c.type_id = ct.id 
       WHERE c.instructor_id = $1 AND c.date >= CURRENT_DATE 
       ORDER BY c.date, c.start_time`,
        [id]
      );

      const schedule = result.rows.map(row => ({
        id: row.id.toString(),
        type: row.type || 'CPR Class',
        date: row.date.split('T')[0],
        time: row.start_time ? row.start_time.slice(0, 5) : '09:00',
        location: row.location || 'TBD',
        max_students: row.max_students || 10,
        current_students: row.current_students || 0,
        status: row.status || 'scheduled',
      }));

      return res.json(ApiResponseBuilder.success(keysToCamel(schedule)));
    } catch (error) {
      console.error('Error fetching instructor schedule:', error);
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to fetch instructor schedule'
      );
    }
  })
);

router.get(
  '/instructors/:id/availability',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT id, instructor_id, date::text, status, created_at, updated_at 
         FROM instructor_availability 
         WHERE instructor_id = $1 
         ORDER BY date`,
        [id]
      );

      const availability = result.rows.map(row => ({
        id: row.id.toString(),
        instructor_id: row.instructor_id.toString(),
        date: row.date.split('T')[0],
        status: row.status || 'available',
      }));

      return res.json(ApiResponseBuilder.success(keysToCamel(availability)));
    } catch (error) {
      console.error('Error fetching instructor availability:', error);
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to fetch instructor availability'
      );
    }
  })
);

// Get instructor statistics for dashboard
router.get(
  '/admin/instructor-stats',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { month } = req.query;
    const instructorId = req.user?.userId;

    devLog('[Instructor Stats] Request params:', { month, instructorId });

    if (!instructorId) {
      throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Instructor ID is required');
    }

    if (!month) {
      throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Month parameter is required (format: YYYY-MM)');
    }

    try {
      // Parse the month to get start and end dates
      const monthStr = String(month);
      const startDate = `${monthStr}-01`;
      // Get the last day of the month using UTC to avoid timezone issues
      const year = parseInt(monthStr.split('-')[0]);
      const monthNum = parseInt(monthStr.split('-')[1]) - 1; // 0-based month
      const endDate = new Date(Date.UTC(year, monthNum + 1, 0));
      const endDateStr = endDate.toISOString().slice(0, 10);

      devLog('[Instructor Stats] Executing query with params:', [instructorId, startDate, endDateStr]);
      const result = await pool.query(`
        SELECT 
          COUNT(DISTINCT cr.id) as total_courses,
          COUNT(DISTINCT CASE WHEN cr.status = 'completed' THEN cr.id END) as completed_courses,
          COUNT(DISTINCT CASE WHEN cr.status = 'confirmed' THEN cr.id END) as scheduled_courses,
          COUNT(DISTINCT CASE WHEN cr.status = 'cancelled' THEN cr.id END) as cancelled_courses,
          COALESCE(SUM(cs.student_count), 0) as total_students,
          COALESCE(SUM(cs.attended_count), 0) as students_attended
        FROM course_requests cr
        LEFT JOIN (
          SELECT 
            course_request_id,
            COUNT(*) as student_count,
            COUNT(CASE WHEN attended = true THEN 1 END) as attended_count
          FROM course_students
          GROUP BY course_request_id
        ) cs ON cr.id = cs.course_request_id
        WHERE cr.instructor_id = $1
        AND (
          (cr.scheduled_date >= $2 AND cr.scheduled_date <= $3)
          OR (cr.confirmed_date >= $2 AND cr.confirmed_date <= $3)
        )
      `, [instructorId, startDate, endDateStr]);

      devLog('[Instructor Stats] Query result:', result.rows[0]);
      return res.json(ApiResponseBuilder.success(keysToCamel(result.rows[0])));
    } catch (error) {
      console.error('[Instructor Stats] Detailed error:', error);
      throw new AppError(500, errorCodes.DB_QUERY_ERROR, 'Failed to fetch instructor stats');
    }
  })
);

// Dashboard summary endpoint
router.get(
  '/admin/dashboard-summary',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { month } = req.query;
    const user = req.user;

    devLog('[Dashboard Summary] Request params:', { month, userId: user?.userId, role: user?.role });

    if (!month) {
      throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Month parameter is required (format: YYYY-MM)');
    }

    try {
      // Parse the month to get start and end dates
      const monthStr = String(month);
      const startDate = `${monthStr}-01`;
      // Get the last day of the month using UTC to avoid timezone issues
      const year = parseInt(monthStr.split('-')[0]);
      const monthNum = parseInt(monthStr.split('-')[1]) - 1; // 0-based month
      const endDate = new Date(Date.UTC(year, monthNum + 1, 0));
      const endDateStr = endDate.toISOString().slice(0, 10);

      let result;
      
      if (user?.role === 'instructor') {
        // Instructor-specific stats
        if (!user.userId) {
          throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Instructor ID is required');
        }

        devLog('[Dashboard Summary] Executing instructor query with params:', [user.userId, startDate, endDateStr]);
        result = await pool.query(`
          SELECT 
            COUNT(DISTINCT cr.id) as total_courses,
            COUNT(DISTINCT CASE WHEN cr.status = 'completed' THEN cr.id END) as completed_courses,
            COUNT(DISTINCT CASE WHEN cr.status = 'confirmed' THEN cr.id END) as scheduled_courses,
            COUNT(DISTINCT CASE WHEN cr.status = 'cancelled' THEN cr.id END) as cancelled_courses,
            COALESCE(SUM(cs.student_count), 0) as total_students,
            COALESCE(SUM(cs.attended_count), 0) as students_attended,
            CASE 
              WHEN COUNT(DISTINCT cr.id) > 0 THEN 
                ROUND((COUNT(DISTINCT CASE WHEN cr.status = 'completed' THEN cr.id END) * 100.0 / COUNT(DISTINCT cr.id)), 1)
              ELSE 0 
            END as completion_rate,
            CASE 
              WHEN COALESCE(SUM(cs.student_count), 0) > 0 THEN 
                ROUND((COALESCE(SUM(cs.attended_count), 0) * 100.0 / COALESCE(SUM(cs.student_count), 0)), 1)
              ELSE 0 
            END as attendance_rate
          FROM course_requests cr
          LEFT JOIN (
            SELECT 
              course_request_id,
              COUNT(*) as student_count,
              COUNT(CASE WHEN attended = true THEN 1 END) as attended_count
            FROM course_students
            GROUP BY course_request_id
          ) cs ON cr.id = cs.course_request_id
          WHERE cr.instructor_id = $1
          AND (
            (cr.scheduled_date >= $2 AND cr.scheduled_date <= $3)
            OR (cr.confirmed_date >= $2 AND cr.confirmed_date <= $3)
          )
        `, [user.userId, startDate, endDateStr]);
      } else if (user?.role === 'admin') {
        // Admin overview stats
        devLog('[Dashboard Summary] Executing admin query with params:', [startDate, endDateStr]);
        result = await pool.query(`
          SELECT 
            COUNT(DISTINCT u.id) as total_instructors,
            COUNT(cr.id) as total_courses_this_month,
            COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) as total_completed_this_month,
            CASE 
              WHEN COUNT(DISTINCT u.id) > 0 THEN 
                ROUND(COUNT(cr.id)::DECIMAL / COUNT(DISTINCT u.id), 1)
              ELSE 0 
            END as avg_courses_per_instructor,
            COALESCE(SUM(cs.student_count), 0) as total_students_this_month,
            COALESCE(SUM(cs.attended_count), 0) as total_attended_this_month,
            CASE 
              WHEN COALESCE(SUM(cs.student_count), 0) > 0 THEN 
                ROUND((COALESCE(SUM(cs.attended_count), 0) * 100.0 / COALESCE(SUM(cs.student_count), 0)), 1)
              ELSE 0 
            END as overall_attendance_rate
          FROM users u
          LEFT JOIN course_requests cr ON u.id = cr.instructor_id 
            AND (
              (cr.scheduled_date >= $1 AND cr.scheduled_date <= $2)
              OR (cr.confirmed_date >= $1 AND cr.confirmed_date <= $2)
            )
          LEFT JOIN (
            SELECT 
              course_request_id,
              COUNT(*) as student_count,
              COUNT(CASE WHEN attended = true THEN 1 END) as attended_count
            FROM course_students
            GROUP BY course_request_id
          ) cs ON cr.id = cs.course_request_id
          WHERE u.role = 'instructor'
        `, [startDate, endDateStr]);
      } else {
        throw new AppError(403, errorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'Access denied. Admin or instructor role required.');
      }

      devLog('[Dashboard Summary] Query result:', result.rows[0]);
      return res.json(ApiResponseBuilder.success(keysToCamel(result.rows[0])));
    } catch (error) {
      console.error('[Dashboard Summary] Detailed error:', error);
      throw new AppError(500, errorCodes.DB_QUERY_ERROR, 'Failed to fetch dashboard summary');
    }
  })
);

// Instructor Workload Report endpoint
router.get(
  '/admin/instructor-workload-report',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    devLog('[Instructor Workload Report] Request params:', { startDate, endDate });

    if (!startDate || !endDate) {
      throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Start date and end date parameters are required (format: YYYY-MM-DD)');
    }

    try {
      devLog('[Instructor Workload Report] Executing query with params:', [startDate, endDate]);
      
      const result = await pool.query(`
        SELECT 
          u.id as instructorId,
          u.username as name,
          u.email,
          COUNT(DISTINCT CASE WHEN cr.status = 'completed' THEN cr.id END) as completedCount,
          COUNT(DISTINCT CASE WHEN cr.status = 'confirmed' THEN cr.id END) as scheduledCount,
          COUNT(DISTINCT cr.id) as totalCount,
          COALESCE(SUM(cs.student_count), 0) as totalStudents,
          COALESCE(SUM(cs.attended_count), 0) as attendedStudents,
          CASE 
            WHEN COUNT(DISTINCT cr.id) > 0 THEN 
              ROUND((COUNT(DISTINCT CASE WHEN cr.status = 'completed' THEN cr.id END) * 100.0 / COUNT(DISTINCT cr.id)), 1)
            ELSE 0 
          END as completionRate,
          CASE 
            WHEN COALESCE(SUM(cs.student_count), 0) > 0 THEN 
              ROUND((COALESCE(SUM(cs.attended_count), 0) * 100.0 / COALESCE(SUM(cs.student_count), 0)), 1)
            ELSE 0 
          END as attendanceRate,
          MAX(cr.confirmed_date) as lastCourseDate
        FROM users u
        LEFT JOIN course_requests cr ON u.id = cr.instructor_id 
          AND (
            (cr.scheduled_date >= $1 AND cr.scheduled_date <= $2)
            OR (cr.confirmed_date >= $1 AND cr.confirmed_date <= $2)
          )
        LEFT JOIN (
          SELECT 
            course_request_id,
            COUNT(*) as student_count,
            COUNT(CASE WHEN attended = true THEN 1 END) as attended_count
          FROM course_students
          GROUP BY course_request_id
        ) cs ON cr.id = cs.course_request_id
        WHERE u.role = 'instructor'
        GROUP BY u.id, u.username, u.email
        ORDER BY totalCount DESC, completionRate DESC
      `, [startDate, endDate]);

      devLog('[Instructor Workload Report] Query result:', result.rows);
      return res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
    } catch (error) {
      console.error('[Instructor Workload Report] Detailed error:', error);
      throw new AppError(500, errorCodes.DB_QUERY_ERROR, 'Failed to fetch instructor workload report');
    }
  })
);

// Generate weekly schedule PDF for instructor
router.post(
  '/instructor/schedule/weekly-pdf',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.body;
      const instructorId = req.user?.userId;

      if (!instructorId) {
        throw new AppError(
          401,
          errorCodes.AUTH_TOKEN_INVALID,
          'Instructor ID not found'
        );
      }

      if (!startDate || !endDate) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Start date and end date are required'
        );
      }

      // Fetch instructor's classes for the week
      const classesResult = await pool.query(
        `SELECT 
        cr.id,
        cr.confirmed_date::text as date,
        cr.confirmed_start_time::text as start_time,
        cr.confirmed_end_time::text as end_time,
        cr.location,
        cr.registered_students,
        ct.name as course_type,
        o.name as organization_name,
        o.contact_phone as organization_phone
      FROM course_requests cr
      JOIN class_types ct ON cr.course_type_id = ct.id
      JOIN organizations o ON cr.organization_id = o.id
      WHERE cr.instructor_id = $1
      AND cr.confirmed_date >= $2::date
      AND cr.confirmed_date <= $3::date
      AND cr.status IN ('confirmed', 'completed')
      ORDER BY cr.confirmed_date, cr.confirmed_start_time`,
        [instructorId, startDate, endDate]
      );

      // Get instructor details
      const instructorResult = await pool.query(
        'SELECT username, email FROM users WHERE id = $1',
        [instructorId]
      );

      const instructor = instructorResult.rows[0];
      const classes = classesResult.rows;

      // Generate HTML for PDF
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Weekly Schedule</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #007bff;
            margin: 0;
          }
          .header p {
            margin: 5px 0;
            color: #666;
          }
          .schedule-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          .schedule-table th {
            background-color: #007bff;
            color: white;
            padding: 12px;
            text-align: left;
            border: 1px solid #ddd;
          }
          .schedule-table td {
            padding: 10px;
            border: 1px solid #ddd;
          }
          .schedule-table tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .day-header {
            background-color: #e9ecef !important;
            font-weight: bold;
            color: #495057;
          }
          .no-classes {
            text-align: center;
            padding: 40px;
            color: #666;
            font-style: italic;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Weekly Schedule</h1>
          <p><strong>Instructor:</strong> ${instructor.username}</p>
          <p><strong>Week:</strong> ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>

        ${
          classes.length > 0
            ? `
          <table class="schedule-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Course Type</th>
                <th>Organization</th>
                <th>Location</th>
                <th>Students</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              ${classes
                .map(cls => {
                  const date = new Date(cls.date);
                  const dayName = date.toLocaleDateString('en-US', {
                    weekday: 'long',
                  });
                  const formattedDate = date.toLocaleDateString();
                  const startTime = cls.start_time
                    ? cls.start_time.slice(0, 5)
                    : 'TBD';
                  const endTime = cls.end_time
                    ? cls.end_time.slice(0, 5)
                    : 'TBD';

                  return `
                  <tr>
                    <td><strong>${dayName}</strong><br>${formattedDate}</td>
                    <td>${startTime} - ${endTime}</td>
                    <td>${cls.course_type}</td>
                    <td>${cls.organization_name}</td>
                    <td>${cls.location}</td>
                    <td>${cls.registered_students || 0}</td>
                    <td>${cls.organization_phone || 'N/A'}</td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        `
            : `
          <div class="no-classes">
            <p>No classes scheduled for this week.</p>
          </div>
        `
        }

        <div class="footer">
          <p>CPR Training System - Instructor Portal</p>
          <p>This is a confidential document. Please do not share.</p>
        </div>
      </body>
      </html>
    `;

      // Use puppeteer to generate PDF
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html);
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });
      await browser.close();

      // Send PDF as response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="weekly-schedule-${startDate}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating weekly schedule PDF:', error);
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to generate PDF'
      );
    }
  })
);

// Delete instructor availability for a specific date (admin only)
router.delete(
  '/instructors/:instructorId/availability/:date',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { instructorId, date } = req.params;

      if (!instructorId || !date) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Instructor ID and date are required'
        );
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // First, check if there are any confirmed courses for this instructor on this date
        const confirmedCoursesCheck = await client.query(
          `SELECT id FROM course_requests 
         WHERE instructor_id = $1 
         AND confirmed_date::date = $2::date 
         AND status = 'confirmed'`,
          [instructorId, date]
        );

        if (confirmedCoursesCheck.rows.length > 0) {
          throw new AppError(
            400,
            errorCodes.VALIDATION_ERROR,
            'Cannot remove availability: Instructor has confirmed courses on this date. Please reassign or cancel the courses first.'
          );
        }

        // Delete from instructor_availability
        const deleteAvailabilityResult = await client.query(
          'DELETE FROM instructor_availability WHERE instructor_id = $1 AND date::date = $2::date RETURNING *',
          [instructorId, date]
        );

        // Also delete any scheduled (not confirmed) classes for this date
        const deleteClassesResult = await client.query(
          `DELETE FROM classes 
         WHERE instructor_id = $1 
         AND date::date = $2::date 
         AND status = 'scheduled'
         RETURNING *`,
          [instructorId, date]
        );

        await client.query('COMMIT');

        return res.json(
          ApiResponseBuilder.success(keysToCamel({
            message: 'Availability removed successfully',
            deletedAvailability: deleteAvailabilityResult.rows.length,
            deletedClasses: deleteClassesResult.rows.length,
          }))
        );
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error removing instructor availability:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to remove instructor availability'
      );
    }
  })
);



router.get(
  '/admin/logs',
  asyncHandler(async (req: Request, res: Response) => {
    // Implementation of getting logs
    // This is a placeholder and should be replaced with the actual implementation
    res.json({
      success: true,
      data: [],
    });
  })
);

// Accounting Portal Endpoints

// Get accounting dashboard data
router.get(
  '/accounting/dashboard',
  authenticateToken,
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
      WHERE cr.status = 'completed'
      AND cr.ready_for_billing_at IS NOT NULL
      AND (cr.invoiced IS NULL OR cr.invoiced = FALSE)
      ORDER BY cr.ready_for_billing_at DESC
    `);

      res.json({
        success: true,
        data: result.rows,
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
        WHERE cr.id = $1 AND cr.status = 'completed'
      `,
          [courseId]
        );

        if (courseResult.rows.length === 0) {
          throw new AppError(
            404,
            errorCodes.RESOURCE_NOT_FOUND,
            'Course not found, not completed, or pricing not configured. Please ensure pricing is set up for this organization and course type.'
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

        // Create invoice with proper breakdown
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
          course_type_name,
          location,
          date_completed,
          rate_per_student
        )
        VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, 'pending', CURRENT_DATE + INTERVAL '30 days', FALSE, $8, $9, $10, $11)
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
          message: 'Invoice created successfully! The course has been removed from the billing queue and moved to the Organizational Receivables Queue.',
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

// Fix existing invoice calculations
router.put(
  '/accounting/invoices/:id/fix-calculations',
  authenticateToken,
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
        i.students_billed,
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
        (i.amount - COALESCE(payments.total_paid, 0)) as balancedue,
        i.base_cost,
        i.tax_amount,
        cp.price_per_student as rate_per_student,
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
      res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Expose-Headers',
        'Content-Disposition, Content-Length, Content-Type'
      );
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
              ELSE EXTRACT(DAY FROM ($1::date - i.due_date::date))
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

// Manual trigger for overdue invoices update (for testing/admin use)
router.post(
  '/accounting/trigger-overdue-update',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      // Only allow accountant or admin roles
      if (user.role !== 'accountant' && user.role !== 'admin') {
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Accountant or admin role required.'
        );
      }

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
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      // Only allow accountant or admin roles
      if (user.role !== 'accountant' && user.role !== 'admin') {
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Accountant or admin role required.'
        );
      }

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

// ===========================
// SYSTEM ADMINISTRATION ENDPOINTS
// ===========================

// Course Definition Management
router.get(
  '/sysadmin/courses',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          name,
          description,
          duration_minutes,
          course_code,
          COALESCE(is_active, true) as is_active,
          created_at,
          updated_at
        FROM class_types
        ORDER BY name
      `);

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
  })
);

router.post(
  '/sysadmin/courses',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        duration_minutes,
        course_code,
        is_active = true,
      } = req.body;

      if (!name) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Course name is required'
        );
      }

      const result = await pool.query(
        `
        INSERT INTO class_types (
          name, description, duration_minutes, course_code, is_active
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [
          name,
          description,
          duration_minutes,
          course_code || null,
          is_active,
        ]
      );

      res.json({
        success: true,
        message: 'Course created successfully',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  })
);

router.put(
  '/sysadmin/courses/:id',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        duration_minutes,
        course_code,
        is_active,
      } = req.body;

      const result = await pool.query(
        `
        UPDATE class_types
        SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          duration_minutes = COALESCE($3, duration_minutes),
          course_code = COALESCE($4, course_code),
          is_active = COALESCE($5, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
        `,
        [
          name,
          description,
          duration_minutes,
          course_code,
          is_active,
          id,
        ]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Course not found'
        );
      }

      res.json({
        success: true,
        message: 'Course updated successfully',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error updating course:', error);
      throw error;
    }
  })
);

// Toggle course active/inactive status
router.put(
  '/sysadmin/courses/:id/toggle-active',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        UPDATE class_types
        SET
          is_active = NOT COALESCE(is_active, true),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
        `,
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Course not found'
        );
      }

      const course = result.rows[0];
      const statusText = course.is_active ? 'activated' : 'deactivated';

      res.json({
        success: true,
        message: `Course ${statusText} successfully`,
        data: course,
      });
    } catch (error) {
      console.error('Error toggling course status:', error);
      throw error;
    }
  })
);

// Soft delete course (set is_active to false)
router.delete(
  '/sysadmin/courses/:id',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if course has any associated course requests
      const usageCheck = await pool.query(
        'SELECT COUNT(*) as count FROM course_requests WHERE course_type_id = $1',
        [id]
      );

      const usageCount = parseInt(usageCheck.rows[0].count);

      if (usageCount > 0) {
        // Soft delete - set is_active to false
        const result = await pool.query(
          `
          UPDATE class_types
          SET is_active = false, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
          `,
          [id]
        );

        if (result.rows.length === 0) {
          throw new AppError(
            404,
            errorCodes.RESOURCE_NOT_FOUND,
            'Course not found'
          );
        }

        res.json({
          success: true,
          message: `Course deactivated (${usageCount} course requests exist). Use toggle to reactivate.`,
          data: result.rows[0],
          softDeleted: true,
        });
      } else {
        // Hard delete - no course requests reference this course
        const result = await pool.query(
          `DELETE FROM class_types WHERE id = $1 RETURNING *`,
          [id]
        );

        if (result.rows.length === 0) {
          throw new AppError(
            404,
            errorCodes.RESOURCE_NOT_FOUND,
            'Course not found'
          );
        }

        res.json({
          success: true,
          message: 'Course deleted permanently',
          data: result.rows[0],
          softDeleted: false,
        });
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      throw error;
    }
  })
);

// User Management
router.get(
  '/sysadmin/users',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.phone,
        u.organization_id,
        o.name as organization_name,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      ORDER BY u.created_at DESC
    `);

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  })
);

router.post(
  '/sysadmin/users',
  [
    body('username')
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Must be a valid email address'),
    body('role')
      .isIn(['admin', 'instructor', 'organization', 'accountant', 'hr', 'courseadmin', 'vendor', 'sysadmin'])
      .withMessage('Role must be one of: admin, instructor, organization, accountant, hr, courseadmin, vendor, sysadmin'),
    body('first_name')
      .optional()
      .isLength({ max: 100 })
      .withMessage('First name must be less than 100 characters'),
    body('last_name')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Last name must be less than 100 characters'),
    body('mobile')
      .optional()
      .isMobilePhone('any')
      .withMessage('Mobile must be a valid phone number'),
    body('organization_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Organization ID must be a positive integer')
  ],
  // Add role-based password validation middleware
  (req: Request, res: Response, next: NextFunction) => {
    const { role } = req.body;
    const passwordValidation = roleBasedPasswordValidation(role || 'user');
    return passwordValidation.run(req).then(() => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Password validation failed',
          errors: errors.array().map(e => e.msg)
        });
      }
      next();
    });
  },
  // Add password policy validation
  validatePasswordPolicy(),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          `Validation failed: ${errors.array().map(e => e.msg).join(', ')}`
        );
      }

      const {
        username,
        email,
        password,
        first_name,
        last_name,
        full_name,
        role,
        mobile,
        organization_id,
        date_onboarded,
        user_comments,
      } = req.body;

      // Check if username already exists
      const existingUsername = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );
      if (existingUsername.rows.length > 0) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Username already exists. Please choose a different username.'
        );
      }

      // Check if email already exists
      const existingEmail = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      if (existingEmail.rows.length > 0) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Email address already exists. Please use a different email address.'
        );
      }

      const passwordHash = bcrypt.hashSync(password, 10);

      const result = await pool.query(
        `
      INSERT INTO users (
        username, email, password_hash, role, organization_id
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, role, organization_id
    `,
        [
          username,
          email,
          passwordHash,
          role,
          organization_id,
        ]
      );

      res.json({
        success: true,
        message: 'User created successfully',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error creating user:', error);

      // Handle specific database constraint violations
      if (isDatabaseError(error) && error.code === '23505') {
        // Unique constraint violation
        if (error.constraint === 'users_email_key') {
          throw new AppError(
            400,
            errorCodes.VALIDATION_ERROR,
            'Email address already exists. Please use a different email address.'
          );
        } else if (error.constraint === 'users_username_key') {
          throw new AppError(
            400,
            errorCodes.VALIDATION_ERROR,
            'Username already exists. Please choose a different username.'
          );
        }
      }

      // Re-throw AppErrors as-is
      if (error instanceof AppError) {
        throw error;
      }

      // Generic error for unexpected issues
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to create user'
      );
    }
  })
);

router.put(
  '/sysadmin/users/:id',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        username,
        email,
        password,
        first_name,
        last_name,
        full_name,
        role,
        mobile,
        organization_id,
        date_onboarded,
        date_offboarded,
        user_comments,
        status,
      } = req.body;

      let passwordHash = undefined;
      if (password) {
        passwordHash = bcrypt.hashSync(password, 10);
      }

      const result = await pool.query(
        `
      UPDATE users
      SET 
        username = COALESCE($1, username),
        email = COALESCE($2, email),
        password_hash = COALESCE($3, password_hash),
        role = COALESCE($4, role),
        organization_id = COALESCE($5, organization_id)
      WHERE id = $6
      RETURNING id, username, email, role, organization_id
    `,
        [
          username,
          email,
          passwordHash,
          role,
          organization_id,
          id,
        ]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'User not found'
        );
      }

      res.json({
        success: true,
        message: 'User updated successfully',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  })
);

router.delete(
  '/sysadmin/users/:id',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
      DELETE FROM users
      WHERE id = $1
      RETURNING id, username, email, role
    `,
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'User not found'
        );
      }

      res.json({
        success: true,
        message: 'User deactivated successfully',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  })
);

// Vendor Management
router.get(
  '/sysadmin/vendors',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
      SELECT 
        id,
        name as vendor_name,
        contact_email as email,
        contact_phone as phone,
        address,
        vendor_type,
        is_active,
        created_at,
        updated_at
      FROM vendors
      ORDER BY name
    `);

      // Transform the data to match frontend expectations
      const transformedVendors = result.rows.map(vendor => {
        // Parse address into separate fields if it contains commas
        let address_street = '';
        let address_city = '';
        let address_province = '';
        let address_postal_code = '';
        
        if (vendor.address) {
          const addressParts = vendor.address.split(',').map((part: string) => part.trim());
          address_street = addressParts[0] || '';
          address_city = addressParts[1] || '';
          address_province = addressParts[2] || '';
          address_postal_code = addressParts[3] || '';
        }

        return {
          ...vendor,
          address_street,
          address_city,
          address_province,
          address_postal_code,
          // Add default values for fields that don't exist in database
          contact_first_name: '',
          contact_last_name: '',
          mobile: '',
          services: [],
          contract_start_date: null,
          contract_end_date: null,
          performance_rating: 0,
          insurance_expiry: null,
          certification_status: '',
          billing_contact_email: '',
          comments: '',
          status: vendor.is_active ? 'active' : 'inactive'
        };
      });

      res.json({
        success: true,
        data: transformedVendors,
      });
    } catch (error) {
      console.error('Error fetching vendors:', error);
      throw error;
    }
  })
);

router.post(
  '/sysadmin/vendors',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const {
        vendor_name, // Frontend sends this, map to 'name'
        contact_first_name,
        contact_last_name,
        email, // Frontend sends this, map to 'contact_email'
        mobile,
        phone, // Frontend sends this, map to 'contact_phone'
        address_street,
        address_city,
        address_province,
        address_postal_code,
        vendor_type,
        services,
        contract_start_date,
        contract_end_date,
        performance_rating,
        insurance_expiry,
        certification_status,
        billing_contact_email,
        comments,
        status,
        // Also accept the original field names for backward compatibility
        name,
        contact_email,
        contact_phone,
        address,
        is_active,
      } = req.body;

      // Use vendor_name if provided, otherwise fall back to name
      const vendorName = vendor_name || name;
      if (!vendorName) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Vendor name is required'
        );
      }

      // Build address from separate fields if provided
      let fullAddress = address;
      if (address_street || address_city || address_province || address_postal_code) {
        const addressParts = [address_street, address_city, address_province, address_postal_code].filter(Boolean);
        fullAddress = addressParts.join(', ');
      }

      // Use email if provided, otherwise fall back to contact_email
      const contactEmail = email || contact_email;
      
      // Use phone if provided, otherwise fall back to contact_phone
      const contactPhone = phone || contact_phone;

      const result = await pool.query(
        `
      INSERT INTO vendors (
        name, contact_email, contact_phone, address, vendor_type, is_active
      )
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, true))
      RETURNING *
    `,
        [
          vendorName,
          contactEmail,
          contactPhone,
          fullAddress,
          vendor_type,
          is_active !== undefined ? is_active : true,
        ]
      );

      res.json({
        success: true,
        message: 'Vendor created successfully',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error creating vendor:', error);
      throw error;
    }
  })
);

router.put(
  '/sysadmin/vendors/:id',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        vendor_name, // Frontend sends this, map to 'name'
        contact_first_name,
        contact_last_name,
        email, // Frontend sends this, map to 'contact_email'
        mobile,
        phone, // Frontend sends this, map to 'contact_phone'
        address_street,
        address_city,
        address_province,
        address_postal_code,
        vendor_type,
        services,
        contract_start_date,
        contract_end_date,
        performance_rating,
        insurance_expiry,
        certification_status,
        billing_contact_email,
        comments,
        status,
        // Also accept the original field names for backward compatibility
        name,
        contact_email,
        contact_phone,
        address,
        is_active,
      } = req.body;

      // Use vendor_name if provided, otherwise fall back to name
      const vendorName = vendor_name || name;
      
      // Build address from separate fields if provided
      let fullAddress = address;
      if (address_street || address_city || address_province || address_postal_code) {
        const addressParts = [address_street, address_city, address_province, address_postal_code].filter(Boolean);
        fullAddress = addressParts.join(', ');
      }

      // Use email if provided, otherwise fall back to contact_email
      const contactEmail = email || contact_email;
      
      // Use phone if provided, otherwise fall back to contact_phone
      const contactPhone = phone || contact_phone;

      const result = await pool.query(
        `
      UPDATE vendors
      SET 
        name = COALESCE($1, name),
        contact_email = COALESCE($2, contact_email),
        contact_phone = COALESCE($3, contact_phone),
        address = COALESCE($4, address),
        vendor_type = COALESCE($5, vendor_type),
        is_active = COALESCE($6, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `,
        [
          vendorName,
          contactEmail,
          contactPhone,
          fullAddress,
          vendor_type,
          is_active,
          id,
        ]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Vendor not found'
        );
      }

      res.json({
        success: true,
        message: 'Vendor updated successfully',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error updating vendor:', error);
      throw error;
    }
  })
);

router.delete(
  '/sysadmin/vendors/:id',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
      UPDATE vendors
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `,
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Vendor not found'
        );
      }

      res.json({
        success: true,
        message: 'Vendor deactivated successfully',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error deactivating vendor:', error);
      throw error;
    }
  })
);

// System Administration Dashboard
router.get(
  '/sysadmin/dashboard',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Get total counts
      const userCount = await pool.query(
        "SELECT COUNT(*) as count FROM users"
      );
      const organizationCount = await pool.query(
        'SELECT COUNT(*) as count FROM organizations'
      );
      const courseCount = await pool.query(
        'SELECT COUNT(*) as count FROM class_types WHERE is_active = true'
      );
      const vendorCount = await pool.query(
        "SELECT COUNT(*) as count FROM vendors WHERE is_active = true"
      );

      // Get recent activity
      const recentUsers = await pool.query(`
      SELECT username, role, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

      const recentCourses = await pool.query(`
      SELECT name, course_code, created_at 
      FROM class_types 
      WHERE is_active = true 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

      const dashboardData = {
        summary: {
          totalUsers: parseInt(userCount.rows[0].count),
          totalOrganizations: parseInt(organizationCount.rows[0].count),
          totalCourses: parseInt(courseCount.rows[0].count),
          totalVendors: parseInt(vendorCount.rows[0].count),
        },
        recentActivity: {
          users: recentUsers.rows,
          courses: recentCourses.rows,
        },
      };

      res.json({
        success: true,
        data: dashboardData,
      });
    } catch (error) {
      console.error('Error fetching system admin dashboard:', error);
      throw error;
    }
  })
);

// Organization Management
router.get(
  '/sysadmin/organizations',
  asyncHandler(async (req: Request, res: Response) => {
    devLog('[Debug] Getting all organizations for sysadmin');

    const query = `
    SELECT 
      o.id,
      o.name as organization_name,
      o.address,
      o.created_at,
      o.contact_email,
      o.contact_phone,
      COUNT(DISTINCT u.id) as user_count,
      COUNT(DISTINCT cr.id) as course_count
    FROM organizations o
    LEFT JOIN users u ON u.organization_id = o.id
    LEFT JOIN course_requests cr ON cr.organization_id = o.id
    GROUP BY o.id, o.name, o.address, o.contact_email, o.contact_phone
    ORDER BY o.name
  `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows,
    });
  })
);

router.post(
  '/sysadmin/organizations',
  asyncHandler(async (req: Request, res: Response) => {
    devLog('[Debug] Creating new organization:', req.body);

    const {
      name,
      address,
      contact_email,
      contact_phone,
    } = req.body;

    const query = `
    INSERT INTO organizations (
      name,
      address,
      contact_email,
      contact_phone,
      created_at
    ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    RETURNING *
  `;

    const values = [
      name,
      address || '',
      contact_email,
      contact_phone,
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Organization created successfully',
    });
  })
);

router.put(
  '/sysadmin/organizations/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    devLog('[Debug] Updating organization:', id, req.body);

    const {
      name,
      address,
      contact_email,
      contact_phone,
    } = req.body;

    const query = `
    UPDATE organizations
    SET 
      name = $1,
      address = $2,
      contact_email = $3,
      contact_phone = $4
    WHERE id = $5
    RETURNING *
  `;

    const values = [
      name,
      address || '',
      contact_email,
      contact_phone,
      id,
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Organization not found' },
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Organization updated successfully',
    });
  })
);

router.delete(
  '/sysadmin/organizations/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    devLog('[Debug] Deleting organization:', id);

    // Check for dependencies
    const checkQuery = `
    SELECT 
      COUNT(DISTINCT u.id) as user_count,
      COUNT(DISTINCT cr.id) as course_count
    FROM organizations o
    LEFT JOIN users u ON u.organization_id = o.id
    LEFT JOIN course_requests cr ON cr.organization_id = o.id
    WHERE o.id = $1
  `;

    const checkResult = await pool.query(checkQuery, [id]);
    const { user_count, course_count } = checkResult.rows[0];

    if (parseInt(user_count) > 0 || parseInt(course_count) > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'Cannot delete organization with associated users or courses',
          details: `${user_count} users and ${course_count} courses are linked to this organization`,
        },
      });
    }

    const deleteQuery = 'DELETE FROM organizations WHERE id = $1 RETURNING *';
    const result = await pool.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Organization not found' },
      });
    }

    res.json({
      success: true,
      message: 'Organization deleted successfully',
    });
  })
);

// Get single organization by ID (for OrganizationDetailPage)
router.get(
  '/sysadmin/organizations/:id',
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'accountant']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    devLog('[Debug] Getting organization details for ID:', id);

    const query = `
      SELECT
        o.id as organizationid,
        o.name as organizationname,
        o.address as addressstreet,
        o.contact_name as contactname,
        o.contact_email as contactemail,
        o.contact_phone as contactphone,
        o.city as addresscity,
        o.province as addressprovince,
        o.postal_code as addresspostalcode,
        o.created_at,
        o.updated_at
      FROM organizations o
      WHERE o.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Organization not found');
    }

    res.json(ApiResponseBuilder.success(keysToCamel(result.rows[0])));
  })
);

// Get courses for an organization (admin view)
router.get(
  '/sysadmin/organizations/:id/courses',
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'accountant']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    devLog('[Debug] Getting courses for organization ID:', id);

    const query = `
      SELECT
        cr.id as courseid,
        cr.course_number as coursenumber,
        ct.name as coursetypename,
        cr.status,
        cr.confirmed_date as confirmeddate,
        cr.date_requested as daterequested,
        cr.location,
        cr.registered_students as registeredstudents,
        COALESCE(u.first_name || ' ' || u.last_name, 'Unassigned') as instructorname,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as studentcount,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) as attendedcount,
        cr.created_at,
        cr.updated_at
      FROM course_requests cr
      LEFT JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN users u ON cr.instructor_id = u.id
      WHERE cr.organization_id = $1
      ORDER BY cr.confirmed_date DESC NULLS LAST, cr.created_at DESC
    `;

    const result = await pool.query(query, [id]);

    res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
  })
);

// Get invoices for an organization
router.get(
  '/sysadmin/organizations/:id/invoices',
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'accountant']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    devLog('[Debug] Getting invoices for organization ID:', id);

    const query = `
      SELECT
        i.id as invoiceid,
        i.invoice_number as invoicenumber,
        i.amount,
        i.status,
        i.invoice_date as invoicedate,
        i.due_date as duedate,
        i.paid_date as paiddate,
        i.notes,
        COALESCE(
          (SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id),
          0
        ) as amountpaid,
        i.created_at,
        i.updated_at
      FROM invoices i
      WHERE i.organization_id = $1
      ORDER BY i.invoice_date DESC NULLS LAST, i.created_at DESC
    `;

    const result = await pool.query(query, [id]);

    res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
  })
);

// Get financial summary for an organization
router.get(
  '/sysadmin/organizations/:id/financial-summary',
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'accountant']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    devLog('[Debug] Getting financial summary for organization ID:', id);

    const query = `
      SELECT
        COALESCE(SUM(i.amount), 0) as total_invoiced,
        COALESCE(SUM(
          CASE WHEN i.status IN ('paid', 'partial') THEN
            (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.invoice_id = i.id)
          ELSE 0 END
        ), 0) as total_paid,
        COALESCE(SUM(
          CASE WHEN i.status NOT IN ('paid', 'void', 'cancelled') THEN
            i.amount - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0)
          ELSE 0 END
        ), 0) as balance_due
      FROM invoices i
      WHERE i.organization_id = $1
        AND i.status NOT IN ('void', 'cancelled')
    `;

    const result = await pool.query(query, [id]);
    const row = result.rows[0] || { total_invoiced: 0, total_paid: 0, balance_due: 0 };

    res.json(ApiResponseBuilder.success({
      totalInvoiced: parseFloat(row.total_invoiced) || 0,
      totalPaid: parseFloat(row.total_paid) || 0,
      balanceDue: parseFloat(row.balance_due) || 0,
    }));
  })
);

// Schedule a course (assign instructor and date)
router.post(
  '/courseadmin/courses/:id/schedule',
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'courseadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { instructorId, dateScheduled } = req.body;
    devLog('[Debug] Scheduling course ID:', id, 'with instructor:', instructorId, 'on date:', dateScheduled);

    if (!instructorId || !dateScheduled) {
      throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Instructor ID and date scheduled are required');
    }

    // Verify the course exists and is in a schedulable state
    const courseCheck = await pool.query(
      'SELECT id, status FROM course_requests WHERE id = $1',
      [id]
    );

    if (courseCheck.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Course not found');
    }

    const currentStatus = courseCheck.rows[0].status;
    if (currentStatus === 'completed' || currentStatus === 'cancelled') {
      throw new AppError(400, errorCodes.VALIDATION_ERROR, `Cannot schedule a course with status: ${currentStatus}`);
    }

    // Verify the instructor exists
    const instructorCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'instructor'",
      [instructorId]
    );

    if (instructorCheck.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Instructor not found');
    }

    // Update the course request
    const result = await pool.query(
      `UPDATE course_requests
       SET instructor_id = $1,
           confirmed_date = $2,
           status = 'confirmed',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [instructorId, dateScheduled, id]
    );

    res.json({
      success: true,
      message: 'Course scheduled successfully',
      course: keysToCamel(result.rows[0]),
    });
  })
);

// Get all instructors (for course scheduling dropdown)
router.get(
  '/courseadmin/instructors',
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'courseadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    devLog('[Debug] Getting all instructors for course admin');

    const query = `
      SELECT
        u.id as instructorid,
        u.first_name as firstname,
        u.last_name as lastname,
        u.email,
        u.phone,
        u.is_active as isactive
      FROM users u
      WHERE u.role = 'instructor'
        AND (u.is_active = true OR u.is_active IS NULL)
      ORDER BY u.last_name, u.first_name
    `;

    const result = await pool.query(query);

    res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
  })
);

// Admin endpoint to get students for a specific course
router.get(
  '/admin/courses/:courseId/students',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      const userRole = req.user?.role;

      // Only admin and courseadmin users can access this endpoint
      if (userRole !== 'admin' && userRole !== 'courseadmin') {
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Admin or courseadmin role required.'
        );
      }

      // Verify the course exists
      const courseCheck = await pool.query(
        'SELECT id FROM course_requests WHERE id = $1',
        [courseId]
      );

      if (courseCheck.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Course not found'
        );
      }

      // Get students for this course with attendance information
      const result = await pool.query(
        `SELECT 
        s.id,
        s.course_request_id,
        s.first_name,
        s.last_name,
        s.email,
        s.attended,
        s.attendance_marked,
        s.created_at
       FROM course_students s
       WHERE s.course_request_id = $1
       ORDER BY s.last_name, s.first_name`,
        [courseId]
      );

      return res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
    } catch (error) {
      console.error('Error fetching course students:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to fetch course students'
      );
    }
  })
);

// Mark course as ready for billing
// Validate course readiness for billing (pre-flight check)
router.get(
  '/courses/:courseId/validate-billing-readiness',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;

      devLog(`[VALIDATION] Checking billing readiness for course ${courseId}`);

      // Get course details with all required information
      const courseResult = await pool.query(
        `
        SELECT 
          cr.id,
          cr.status,
          cr.organization_id,
          cr.course_type_id,
          cr.ready_for_billing,
          cr.invoiced,
          o.name as organization_name,
          o.contact_email,
          ct.name as course_type_name,
          (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) as students_attended,
          cp.price_per_student,
          cp.is_active as pricing_active
        FROM course_requests cr
        JOIN organizations o ON cr.organization_id = o.id
        JOIN class_types ct ON cr.course_type_id = ct.id
        LEFT JOIN course_pricing cp ON cr.organization_id = cp.organization_id AND cr.course_type_id = cp.course_type_id AND cp.is_active = true
        WHERE cr.id = $1
      `,
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Course not found'
        );
      }

      const course = courseResult.rows[0];
      const validationErrors = [];
      const warnings = [];

      devLog(`[VALIDATION] Course ${courseId} details:`, {
        status: course.status,
        organization: course.organization_name,
        course_type: course.course_type_name,
        students_attended: course.students_attended,
        price_per_student: course.price_per_student,
        pricing_active: course.pricing_active,
        contact_email: course.contact_email
      });

      // 1. Check if course is completed
      if (course.status !== 'completed') {
        validationErrors.push(`Course must be completed before sending to billing. Current status: ${course.status}`);
      }

      // 2. Check if course is already invoiced
      if (course.invoiced) {
        validationErrors.push('Course has already been invoiced and cannot be sent to billing again');
      }

      // 3. Check if course is already ready for billing
      if (course.ready_for_billing) {
        validationErrors.push('Course is already marked as ready for billing');
      }

      // 4. Check pricing configuration
      if (!course.price_per_student || !course.pricing_active) {
        validationErrors.push(`Pricing not configured for ${course.organization_name} - ${course.course_type_name}. Please contact support to set up pricing, then resubmit.`);
      }

      // 5. Check student attendance
      if (course.students_attended === 0) {
        validationErrors.push('No students marked as attended for this course. Please mark student attendance before sending to billing.');
      }

      // 6. Check organization contact information
      if (!course.contact_email) {
        validationErrors.push(`Organization ${course.organization_name} does not have a contact email address. Please update organization profile before sending to billing.`);
      }

      // 7. Warnings (non-blocking)
      if (course.students_attended < 1) {
        warnings.push('Low student attendance may affect billing amount');
      }

      const isValid = validationErrors.length === 0;

      devLog(`[VALIDATION] Course ${courseId} validation result:`, {
        isValid,
        errors: validationErrors.length,
        warnings: warnings.length
      });

      res.json({
        success: true,
        data: {
          isValid,
          course_id: course.id,
          organization_name: course.organization_name,
          course_type_name: course.course_type_name,
          students_attended: course.students_attended,
          price_per_student: course.price_per_student,
          estimated_amount: course.students_attended * (course.price_per_student || 0),
          validation_errors: validationErrors,
          warnings: warnings,
          can_proceed: isValid
        }
      });
    } catch (error) {
      console.error('Error validating billing readiness:', error);
      throw error;
    }
  })
);

// Mark course as ready for billing (with validation)
router.put(
  '/courses/:courseId/ready-for-billing',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;

      devLog(`[BILLING] Attempting to mark course ${courseId} as ready for billing`);

      // Step 1: Run validation check first
      const validationResult = await pool.query(
        `
        SELECT 
          cr.id,
          cr.status,
          cr.organization_id,
          cr.course_type_id,
          cr.ready_for_billing,
          cr.invoiced,
          o.name as organization_name,
          o.contact_email,
          ct.name as course_type_name,
          (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) as students_attended,
          cp.price_per_student,
          cp.is_active as pricing_active
        FROM course_requests cr
        JOIN organizations o ON cr.organization_id = o.id
        JOIN class_types ct ON cr.course_type_id = ct.id
        LEFT JOIN course_pricing cp ON cr.organization_id = cp.organization_id AND cr.course_type_id = cp.course_type_id AND cp.is_active = true
        WHERE cr.id = $1
      `,
        [courseId]
      );

      if (validationResult.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Course not found'
        );
      }

      const course = validationResult.rows[0];
      const validationErrors = [];

      // Run all validations
      if (course.status !== 'completed') {
        validationErrors.push(`Course must be completed before sending to billing. Current status: ${course.status}`);
      }

      if (course.invoiced) {
        validationErrors.push('Course has already been invoiced and cannot be sent to billing again');
      }

      if (course.ready_for_billing) {
        validationErrors.push('Course is already marked as ready for billing');
      }

      if (!course.price_per_student || !course.pricing_active) {
        validationErrors.push(`Pricing not configured for ${course.organization_name} - ${course.course_type_name}. Please contact support to set up pricing, then resubmit.`);
      }

      if (course.students_attended === 0) {
        validationErrors.push('No students marked as attended for this course. Please mark student attendance before sending to billing.');
      }

      if (!course.contact_email) {
        validationErrors.push(`Organization ${course.organization_name} does not have a contact email address. Please update organization profile before sending to billing.`);
      }

      // If validation fails, return error without modifying the course
      if (validationErrors.length > 0) {
        devLog(`[BILLING] Validation failed for course ${courseId}:`, validationErrors);
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          `Cannot send course to billing: ${validationErrors.join('; ')}`
        );
      }

      // Step 2: If validation passes, proceed with marking as ready for billing
      devLog(`[BILLING] Validation passed for course ${courseId}, marking as ready for billing`);
      
      const result = await pool.query(
        `
        UPDATE course_requests 
        SET ready_for_billing = true,
            ready_for_billing_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `,
        [courseId]
      );

      devLog(`[BILLING] Successfully marked course ${courseId} as ready for billing`);

      res.json({
        success: true,
        message: 'Course sent to billing successfully',
        data: {
          ...result.rows[0],
          estimated_amount: course.students_attended * course.price_per_student,
          students_attended: course.students_attended,
          price_per_student: course.price_per_student
        },
      });
    } catch (error) {
      console.error('Error marking course as ready for billing:', error);
      throw error;
    }
  })
);

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
          invoice_id: result.rows[0].invoice_id,
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
        i.id as invoice_id,
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
      
      // Calculate current outstanding balance (excluding pending payments)
      const currentOutstandingBalance = totalInvoiceAmount - verifiedPayments;
      
      // Validate payment amount against outstanding balance
      if (proposedPayment > currentOutstandingBalance) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          `Payment amount ($${proposedPayment.toFixed(2)}) exceeds outstanding balance ($${currentOutstandingBalance.toFixed(2)}). Cannot submit overpayment.`
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
        const isFullPayment = totalPaymentsAfterSubmission >= totalInvoiceAmount;
        
        // Update invoice status based on payment completion
        if (isFullPayment) {
          await client.query(
            `
            UPDATE invoices 
            SET status = 'payment_submitted', updated_at = NOW()
            WHERE id = $1
            `,
            [id]
          );
        } else {
          await client.query(
            `
            UPDATE invoices 
            SET status = 'payment_submitted', updated_at = NOW()
            WHERE id = $1
            `,
            [id]
          );
        }

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
            p.id as payment_id,
            p.amount,
            p.payment_date,
            p.payment_method,
            p.reference_number,
            p.notes,
            p.submitted_by_org_at,
            i.id as invoice_id,
            i.invoice_number,
            i.course_request_id,
            o.name as organization_name,
            o.contact_email
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

// Helper to format date-only fields as YYYY-MM-DD
const formatDateOnly = (dt: Date | string | null | undefined): string | null => dt ? new Date(dt).toISOString().slice(0, 10) : null;

const formatCourseRow = (row: Record<string, any>): Record<string, any> => ({
  ...row,
  scheduled_date: row.scheduled_date ? formatDateOnly(row.scheduled_date) : null,
  date_requested: row.date_requested ? formatDateOnly(row.date_requested) : null,
  confirmed_date: row.confirmed_date ? formatDateOnly(row.confirmed_date) : null,
  request_submitted_date: row.request_submitted_date ? formatDateOnly(row.request_submitted_date) : null,
});

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
      res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Expose-Headers',
        'Content-Disposition, Content-Length, Content-Type'
      );
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

// Add HR role to existing roles
const VALID_ROLES = ['instructor', 'organization', 'courseadmin', 'accountant', 'sysadmin', 'hr'];

// HR Portal endpoints
router.get('/hr/dashboard', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const { role } = (req as any).user;
  
  if (role !== 'hr' && role !== 'sysadmin') {
    return res.status(403).json({ success: false, message: 'Access denied. HR role required.' });
  }

  try {
    // Get pending profile approvals count
    const pendingApprovalsResult = await pool.query(`
      SELECT COUNT(*) as count FROM profile_changes WHERE status = 'pending'
    `);
    
    // Get active instructors count
    const activeInstructorsResult = await pool.query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'instructor'
    `);
    
    // Get organizations count
    const organizationsResult = await pool.query(`
      SELECT COUNT(*) as count FROM organizations
    `);
    
    // Get expiring certifications count (within 30 days)
    const expiringCertificationsResult = await pool.query(`
      SELECT COUNT(*) as count FROM instructor_certifications 
      WHERE expiration_date <= CURRENT_DATE + INTERVAL '30 days' 
      AND expiration_date > CURRENT_DATE
    `);

    const dashboardData = {
      pendingApprovals: pendingApprovalsResult.rows[0]?.count || 0,
      activeInstructors: activeInstructorsResult.rows[0]?.count || 0,
      organizations: organizationsResult.rows[0]?.count || 0,
      expiringCertifications: expiringCertificationsResult.rows[0]?.count || 0,
    };

    res.json(ApiResponseBuilder.success(keysToCamel(dashboardData)));
  } catch (error) {
    console.error('HR Dashboard Error:', error);
    res.status(500).json(ApiResponseBuilder.error('HR_DASHBOARD_ERROR', 'Failed to load HR dashboard data'));
  }
}));

// Get pending profile changes
router.get('/hr/profile-changes', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const { role } = (req as any).user;
  
  if (role !== 'hr' && role !== 'sysadmin') {
    return res.status(403).json({ success: false, message: 'Access denied. HR role required.' });
  }

  try {
    const result = await pool.query(`
      SELECT 
        pc.id,
        pc.user_id,
        pc.change_type,
        pc.field_name,
        pc.old_value,
        pc.new_value,
        pc.status,
        pc.created_at,
        pc.updated_at,
        u.username,
        u.role,
        CASE
          WHEN u.role = 'instructor' THEN COALESCE(NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ''), u.username)
          WHEN u.role = 'organization' THEN COALESCE(o.name, u.username)
          ELSE u.username
        END as display_name
      FROM profile_changes pc
      JOIN users u ON pc.user_id = u.id
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE pc.status = 'pending'
      ORDER BY pc.created_at ASC
    `);

    res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
  } catch (error) {
    console.error('Profile Changes Error:', error);
    res.status(500).json(ApiResponseBuilder.error('PROFILE_CHANGES_ERROR', 'Failed to load profile changes'));
  }
}));

// Approve/reject profile change
router.post('/hr/profile-changes/:id/approve', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const { role } = (req as any).user;
  const { id } = req.params;
  const { action, comment } = req.body; // action: 'approve' or 'reject'
  
  if (role !== 'hr' && role !== 'sysadmin') {
    return res.status(403).json({ success: false, message: 'Access denied. HR role required.' });
  }

  try {
    // Get the profile change
    const changeResult = await pool.query(`
      SELECT * FROM profile_changes WHERE id = $1
    `, [id]);

    if (changeResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Profile change not found' });
    }

    const change = changeResult.rows[0];

    if (action === 'approve') {
      // Apply the change to the user's profile
      await pool.query(`
        UPDATE profile_changes 
        SET status = 'approved', updated_at = CURRENT_TIMESTAMP, hr_comment = $1
        WHERE id = $2
      `, [comment, id]);

      // Update the actual profile data based on change_type
      if (change.change_type === 'instructor') {
        await pool.query(`
          UPDATE instructors SET ${change.field_name} = $1 WHERE user_id = $2
        `, [change.new_value, change.user_id]);
      } else if (change.change_type === 'organization') {
        await pool.query(`
          UPDATE organizations SET ${change.field_name} = $1 WHERE user_id = $2
        `, [change.new_value, change.user_id]);
      }

      res.json({ success: true, message: 'Profile change approved successfully' });
    } else if (action === 'reject') {
      await pool.query(`
        UPDATE profile_changes 
        SET status = 'rejected', updated_at = CURRENT_TIMESTAMP, hr_comment = $1
        WHERE id = $2
      `, [comment, id]);

      res.json({ success: true, message: 'Profile change rejected' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid action. Use "approve" or "reject"' });
    }
  } catch (error) {
    console.error('Profile Change Approval Error:', error);
    res.status(500).json({ success: false, message: 'Failed to process profile change' });
  }
}));

// Payment Requests Routes
import paymentRequestsRouter from './paymentRequests.js';
router.use('/payment-requests', paymentRequestsRouter);

// Accounting endpoint to get students for a specific course (for billing preview)
router.get(
  '/accounting/courses/:courseId/students',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      const userRole = req.user?.role;
      
      // Debug logging
      devLog('[ACCOUNTING ENDPOINT] User info:', {
        userId: req.user?.id,
        username: req.user?.username,
        role: userRole,
        courseId: courseId
      });

      // Only accounting users can access this endpoint
      if (userRole !== 'accounting' && userRole !== 'accountant') {
        devLog('[ACCOUNTING ENDPOINT] Access denied for role:', userRole);
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Accounting role required.'
        );
      }

      // Verify the course exists and is ready for billing
      const courseCheck = await pool.query(
        `SELECT id, status, ready_for_billing_at 
         FROM course_requests 
         WHERE id = $1 AND status = 'completed' AND ready_for_billing_at IS NOT NULL`,
        [courseId]
      );

      if (courseCheck.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Course not found or not ready for billing'
        );
      }

      // Get students for this course with attendance information
      const result = await pool.query(
        `SELECT 
        s.id,
        s.course_request_id,
        s.first_name,
        s.last_name,
        s.email,
        s.attended,
        s.attendance_marked,
        s.created_at
       FROM course_students s
       WHERE s.course_request_id = $1
       ORDER BY s.last_name, s.first_name`,
        [courseId]
      );

      return res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
    } catch (error) {
      console.error('Error fetching course students for accounting:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to fetch course students'
      );
    }
  })
);

// Validate course readiness for billing (pre-flight check)
router.get(
  '/courses/:courseId/validate-billing-readiness',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;

      devLog(`[VALIDATION] Checking billing readiness for course ${courseId}`);

      // Get course details with all required information
      const courseResult = await pool.query(
        `
        SELECT 
          cr.id,
          cr.status,
          cr.organization_id,
          cr.course_type_id,
          cr.ready_for_billing,
          cr.invoiced,
          o.name as organization_name,
          o.contact_email,
          ct.name as course_type_name,
          (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) as students_attended,
          cp.price_per_student,
          cp.is_active as pricing_active
        FROM course_requests cr
        JOIN organizations o ON cr.organization_id = o.id
        JOIN class_types ct ON cr.course_type_id = ct.id
        LEFT JOIN course_pricing cp ON cr.organization_id = cp.organization_id AND cr.course_type_id = cp.course_type_id AND cp.is_active = true
        WHERE cr.id = $1
      `,
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Course not found'
        );
      }

      const course = courseResult.rows[0];
      const validationErrors = [];
      const warnings = [];

      devLog(`[VALIDATION] Course ${courseId} details:`, {
        status: course.status,
        organization: course.organization_name,
        course_type: course.course_type_name,
        students_attended: course.students_attended,
        price_per_student: course.price_per_student,
        pricing_active: course.pricing_active,
        contact_email: course.contact_email
      });

      // 1. Check if course is completed
      if (course.status !== 'completed') {
        validationErrors.push(`Course must be completed before sending to billing. Current status: ${course.status}`);
      }

      // 2. Check if course is already invoiced
      if (course.invoiced) {
        validationErrors.push('Course has already been invoiced and cannot be sent to billing again');
      }

      // 3. Check if course is already ready for billing
      if (course.ready_for_billing) {
        validationErrors.push('Course is already marked as ready for billing');
      }

      // 4. Check pricing configuration
      if (!course.price_per_student || !course.pricing_active) {
        validationErrors.push(`Pricing not configured for ${course.organization_name} - ${course.course_type_name}. Please contact support to set up pricing, then resubmit.`);
      }

      // 5. Check student attendance
      if (course.students_attended === 0) {
        validationErrors.push('No students marked as attended for this course. Please mark student attendance before sending to billing.');
      }

      // 6. Check organization contact information
      if (!course.contact_email) {
        validationErrors.push(`Organization ${course.organization_name} does not have a contact email address. Please update organization profile before sending to billing.`);
      }

      // 7. Warnings (non-blocking)
      if (course.students_attended < 1) {
        warnings.push('Low student attendance may affect billing amount');
      }

      const isValid = validationErrors.length === 0;

      devLog(`[VALIDATION] Course ${courseId} validation result:`, {
        isValid,
        errors: validationErrors.length,
        warnings: warnings.length
      });

      res.json({
        success: true,
        data: {
          isValid,
          course_id: course.id,
          organization_name: course.organization_name,
          course_type_name: course.course_type_name,
          students_attended: course.students_attended,
          price_per_student: course.price_per_student,
          estimated_amount: course.students_attended * (course.price_per_student || 0),
          validation_errors: validationErrors,
          warnings: warnings,
          can_proceed: isValid
        }
      });
    } catch (error) {
      console.error('Error validating billing readiness:', error);
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

export default router;

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