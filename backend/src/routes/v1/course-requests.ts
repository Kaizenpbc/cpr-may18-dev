import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/errorHandler.js';
import { ApiResponseBuilder } from '../../utils/apiResponse.js';
import { keysToCamel } from '../../utils/caseConverter.js';
import { isDatabaseError, getErrorMessage } from '../../types/index.js';
import { AppError, errorCodes } from '../../utils/errorHandler.js';
import { query, getClient } from '../../config/database.js';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware.js';
import { cacheService } from '../../services/cacheService.js';
import { devLog } from '../../utils/devLog.js';

const router = Router();

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

// Schedule route
router.get(
  '/schedule',
  authenticateToken,
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const result = await query(`
      SELECT
        c.id,
        DATE(c.start_time) as date,
        c.start_time,
        c.end_time,
        c.location,
        c.status,
        c.max_students,
        ct.name as type,
        u.username as instructor_name,
        COUNT(cs.student_id) as enrolled_students
      FROM classes c
      JOIN class_types ct ON c.class_type_id = ct.id
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN class_students cs ON c.id = cs.class_id
      WHERE DATE(c.start_time) >= CURRENT_DATE
      GROUP BY c.id, ct.name, u.username
      ORDER BY c.start_time ASC
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
        locationId,
      } = req.body;
      const organizationId = req.user?.organizationId;
      // Use locationId from request body, or fall back to user's locationId
      const effectiveLocationId = locationId || req.user?.locationId || null;

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
      const duplicateCheck = await query(
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

      const result = await query(
        `INSERT INTO course_requests
       (organization_id, course_type_id, date_requested, scheduled_date, location, registered_students, notes, status, location_id)
       VALUES ($1, $2, CURDATE(), $3, $4, $5, $6, 'pending', $7)
       RETURNING id, organization_id, course_type_id, scheduled_date, location, registered_students, notes, status`,
        [
          organizationId,
          courseTypeId,
          scheduledDate,
          location,
          registeredStudents,
          notes,
          effectiveLocationId,
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
          const detailsResult = await query(
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
      const basicStats = await query(
        `
        SELECT
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_requests,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_requests
        FROM course_requests
        WHERE organization_id = $1
          AND created_at >= CURRENT_DATE - INTERVAL ${timeframe} MONTH
      `,
        [organizationId]
      );

      const courseTypeStats = await query(
        `
        SELECT
          ct.name as course_type,
          COUNT(cr.id) as request_count
        FROM course_requests cr
        JOIN class_types ct ON cr.course_type_id = ct.id
        WHERE cr.organization_id = $1
          AND cr.created_at >= CURRENT_DATE - INTERVAL ${timeframe} MONTH
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
      const studentStats = await query(
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
          AND cr.created_at >= CURRENT_DATE - INTERVAL ${timeframe} MONTH
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
      const billingStats = await query(
        `
        SELECT
          COUNT(*) as total_invoices,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invoices,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount
        FROM invoices
        WHERE organization_id = $1
          AND invoice_date >= CURRENT_DATE - INTERVAL ${timeframe} MONTH
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
  requireRole(['admin', 'sysadmin', 'superadmin']),
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const result = await query(`
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
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'superadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await query(
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
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'superadmin']),
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const result = await query(
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
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'superadmin']),
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const result = await query(
        `SELECT cr.*, cr.date_requested as request_submitted_date, ct.name as course_type_name, o.name as organization_name, u.username as instructor_name, (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) AS students_attended
         FROM course_requests cr
         LEFT JOIN class_types ct ON cr.course_type_id = ct.id
         LEFT JOIN organizations o ON cr.organization_id = o.id
         LEFT JOIN users u ON cr.instructor_id = u.id
         WHERE cr.status IN ('completed', 'invoiced')
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
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'superadmin']),
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const result = await query(
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
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'superadmin']),
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

      const client = await getClient();

      try {
        await client.query('BEGIN');

        // Update course request status to cancelled and add reason to notes
        const courseUpdateResult = await client.query(
          `UPDATE course_requests
         SET status = CASE
           WHEN scheduled_date < CURRENT_DATE THEN 'past_due'
           ELSE 'cancelled'
         END,
         is_cancelled = 1,
         cancelled_at = CURRENT_TIMESTAMP,
         cancellation_reason = $2,
         notes = CASE
           WHEN notes IS NULL OR notes = '' THEN $2
           ELSE CONCAT(notes, '\n\n[CANCELLED] ', $2)
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
             ON DUPLICATE KEY UPDATE status = 'available'`,
            [courseRequest.instructor_id, confirmedDateStr]
          );
        }

        // Void any outstanding invoices tied to this course request (3.3)
        await client.query(
          `UPDATE invoices
           SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
           WHERE course_request_id = $1
           AND status IN ('pending', 'overdue')
           AND deleted_at IS NULL`,
          [id]
        );

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
            const courseDetails = await query(
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
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'superadmin']),
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

      const client = await getClient();

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
             ON DUPLICATE KEY UPDATE status = 'available'`,
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
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'superadmin']),
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

      if (!startTime || !endTime) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Start time and end time are required'
        );
      }

      // Start a transaction to ensure both operations succeed or fail together
      const client = await getClient();

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
            const orgResult = await query(
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
      const queueLength = await emailQueueService.getQueueLength();
      res.json(ApiResponseBuilder.success({ pendingJobs: queueLength, failedJobs: 0, isProcessing: false }, 'Email queue status retrieved'));
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
      const courseCheck = await query(
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
      const result = await query(
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
      const courseCheck = await query(
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

      const client = await getClient();

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
      const courseCheck = await query(
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

      const client = await getClient();

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

// Admin endpoint to get students for a specific course
router.get(
  '/admin/courses/:courseId/students',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      const userRole = req.user?.role;

      // Only admin and courseadmin users can access this endpoint
      if (userRole !== 'admin' && userRole !== 'sysadmin' && userRole !== 'courseadmin') {
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied. Admin or courseadmin role required.'
        );
      }

      // Verify the course exists — courseadmin is org-scoped, admin/sysadmin can see all orgs
      const isSuperAdmin = userRole === 'admin' || userRole === 'sysadmin';
      const courseCheck = isSuperAdmin
        ? await query(
            'SELECT id, organization_id FROM course_requests WHERE id = $1',
            [courseId]
          )
        : await query(
            'SELECT id, organization_id FROM course_requests WHERE id = $1 AND organization_id = $2',
            [courseId, req.user?.organizationId]
          );

      if (courseCheck.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Course not found'
        );
      }

      // Get students for this course with attendance information
      const result = await query(
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

// Validate course readiness for billing (pre-flight check)
router.get(
  '/courses/:courseId/validate-billing-readiness',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      const userRole = req.user?.role;
      const isSuperUser = userRole === 'admin' || userRole === 'sysadmin' || userRole === 'accountant';

      devLog(`[VALIDATION] Checking billing readiness for course ${courseId}`);

      // Get course details with all required information
      const courseResult = await query(
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

      // Org scoping: non-admin users may only check their own org's courses
      if (!isSuperUser && course.organization_id !== req.user?.organizationId) {
        throw new AppError(
          403,
          errorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          'Access denied'
        );
      }
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
      const validationResult = await query(
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

      const result = await query(
        `
        UPDATE course_requests
        SET ready_for_billing = true,
            ready_for_billing_at = CURRENT_TIMESTAMP,
            status = 'invoiced',
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
      const courseCheck = await query(
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
      const result = await query(
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

// Schedule a course (assign instructor and date) - courseadmin endpoint
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
    const courseCheck = await query(
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
    const instructorCheck = await query(
      "SELECT id FROM users WHERE id = $1 AND role = 'instructor'",
      [instructorId]
    );

    if (instructorCheck.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Instructor not found');
    }

    // Update the course request
    const result = await query(
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

// Get all instructors (for course scheduling dropdown) - courseadmin endpoint
router.get(
  '/courseadmin/instructors',
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'courseadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    devLog('[Debug] Getting all instructors for course admin');

    const instructorsSql = `
      SELECT
        u.id as instructorid,
        u.first_name as firstname,
        u.last_name as lastname,
        u.email,
        u.phone,
        (u.status = 'active') as isactive
      FROM users u
      WHERE u.role = 'instructor'
        AND (u.status = 'active' OR u.status IS NULL)
      ORDER BY u.last_name, u.first_name
    `;

    const result = await query(instructorsSql);

    res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
  })
);

export default router;
