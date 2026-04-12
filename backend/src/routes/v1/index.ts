import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../../utils/errorHandler.js';
import { ApiResponseBuilder } from '../../utils/apiResponse.js';
import { keysToCamel } from '../../utils/caseConverter.js';
import { AuthenticatedRequest, isDatabaseError, getErrorMessage } from '../../types/index.js';
import { AppError, errorCodes } from '../../utils/errorHandler.js';
import { query, getClient } from '../../config/database.js';
import { generateTokens } from '../../utils/jwtUtils.js';
import { authenticateToken, requireRole, authorizeRoles } from '../../middleware/authMiddleware.js';
import { authenticateSession } from '../../middleware/sessionAuth.js';
import { PDFService } from '../../services/pdfService.js';
import { emailService } from '../../services/emailService.js';
import { notificationService } from '../../services/NotificationService.js';
import emailTemplatesRouter from './emailTemplates.js';
import { cacheService } from '../../services/cacheService.js';
import courseRequestsRouter from './course-requests.js';
import healthRouter from './health.js';
import cacheRouter from './cache.js';
import organizationRouter from './organization.js';
import organizationPricingRouter from './organizationPricing.js';
import sysadminRouter from './sysadmin.js';
import sysadminEntitiesRouter from './sysadmin-entities.js';
import profileChangesRouter from './profile-changes.js';
import hrDashboardRouter from './hr-dashboard.js';
import timesheetRouter from './timesheet.js';
import payrollRouter from './payroll.js';
import payRatesRouter from './payRates.js';
import notificationsRouter from './notifications.js';
import vendorRouter from './vendor.js';
import instructorRouter from './instructor.js';
import accountingRouter from './accounting.js';
import orgBillingRouter from './org-billing.js';
import vendorInvoiceAdminRouter from './vendor-invoice-admin.js';
import paymentRequestsRouter from './paymentRequests.js';
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
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

// Mount health routes
router.use('/health', healthRouter);

// Mount cache routes
router.use('/cache', cacheRouter);

// Mount organization routes
router.use('/organization', organizationRouter);

// Mount organization pricing routes
router.use('/organization-pricing', organizationPricingRouter);

// Mount sysadmin routes
router.use('/sysadmin', sysadminRouter);
router.use('/sysadmin', sysadminEntitiesRouter);

// Mount profile changes routes
router.use('/profile-changes', profileChangesRouter);

// Mount HR dashboard routes
router.use('/hr-dashboard', hrDashboardRouter);

// Mount timesheet routes
router.use('/timesheet', timesheetRouter);

// Mount payroll routes
router.use('/payroll', payrollRouter);

// Mount pay rates routes
router.use('/pay-rates', payRatesRouter);

// Mount notifications routes
router.use('/notifications', notificationsRouter);

// Mount vendor routes
router.use('/vendor', vendorRouter);

// Mount instructor routes
router.use('/instructor', instructorRouter);

// Mount accounting routes
router.use('/', accountingRouter);

// Mount auth routes
router.use('/auth', authRouter);

// Mount holidays routes
router.use('/holidays', holidaysRouter);

// Mount course requests routes (flat-mount)
router.use('/', courseRequestsRouter);

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
      const result = await query(
        `SELECT DISTINCT
        u.id, 
        u.username as instructor_name, 
        u.email,
        'Available' as availability_status
       FROM users u
       INNER JOIN instructor_availability ia ON u.id = ia.instructor_id 
         AND DATE(ia.date) = $1
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

// Users routes are handled by sysadmin router for actual user management

// Certifications routes extracted to course-requests.ts

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

// Schedule route extracted to course-requests.ts

// Course types endpoint extracted to course-requests.ts

// Organization course request routes extracted to course-requests.ts

// Organization courses endpoint moved to organization.ts to avoid duplicate routes

// Organization archive endpoint moved to organization.ts to avoid duplicate routes

// Organization Analytics Endpoints extracted to course-requests.ts

// Course lifecycle routes (pending/confirmed/completed/cancelled, cancel, schedule, assign-instructor, update-reminder, email-queue) extracted to course-requests.ts

// Get all instructors for assignment
router.get(
  '/instructors',
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const result = await query(
        `SELECT 
        u.id, 
        u.username as instructor_name, 
        u.email,
        COALESCE(ia.date, 'No availability set') as availability_date,
        COALESCE(ia.status, 'no_availability') as availability_status,
        COALESCE(cr.notes, '') as notes,
        CASE 
          WHEN cr.id IS NOT NULL AND DATE(cr.confirmed_date) = DATE(ia.date) AND cr.status = 'confirmed' THEN 'Confirmed'
          WHEN cr.id IS NOT NULL AND DATE(cr.confirmed_date) = DATE(ia.date) AND cr.status = 'completed' THEN 'Completed'
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
         AND DATE(cr.confirmed_date) = DATE(ia.date)
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

// Student Management Endpoints (org course students, upload-students) extracted to course-requests.ts

// Admin endpoints to view specific instructor data
router.get(
  '/instructors/:id/schedule',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await query(
        `SELECT c.id, c.date, c.start_time, c.end_time, c.status, c.location, 
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
      const result = await query(
        `SELECT id, instructor_id, date, status, created_at, updated_at 
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
      const result = await query(`
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
        result = await query(`
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
        result = await query(`
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
      
      const result = await query(`
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
      const classesResult = await query(
        `SELECT 
        cr.id,
        cr.confirmed_date as date,
        cr.confirmed_start_time as start_time,
        cr.confirmed_end_time as end_time,
        cr.location,
        cr.registered_students,
        ct.name as course_type,
        o.name as organization_name,
        o.contact_phone as organization_phone
      FROM course_requests cr
      JOIN class_types ct ON cr.course_type_id = ct.id
      JOIN organizations o ON cr.organization_id = o.id
      WHERE cr.instructor_id = $1
      AND cr.confirmed_date >= $2
      AND cr.confirmed_date <= $3
      AND cr.status IN ('confirmed', 'completed')
      ORDER BY cr.confirmed_date, cr.confirmed_start_time`,
        [instructorId, startDate, endDate]
      );

      // Get instructor details
      const instructorResult = await query(
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

      const client = await getClient();
      try {
        await client.query('BEGIN');

        // First, check if there are any confirmed courses for this instructor on this date
        const confirmedCoursesCheck = await client.query(
          `SELECT id FROM course_requests 
         WHERE instructor_id = $1 
         AND DATE(confirmed_date) = $2 
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
          'DELETE FROM instructor_availability WHERE instructor_id = $1 AND DATE(date) = $2 RETURNING *',
          [instructorId, date]
        );

        // Also delete any scheduled (not confirmed) classes for this date
        const deleteClassesResult = await client.query(
          `DELETE FROM classes 
         WHERE instructor_id = $1 
         AND DATE(date) = $2 
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

// Accounting routes extracted to accounting.ts


// Sysadmin entity routes (courses, users, vendors, organizations) -> sysadmin-entities.ts

// courseadmin/courses/:id/schedule, courseadmin/instructors, admin/courses/:courseId/students extracted to course-requests.ts

// Billing readiness and ready-for-billing routes extracted to course-requests.ts

// org-billing routes extracted to org-billing.ts


// HR portal routes (hr/dashboard, hr/profile-changes) superseded by hr-dashboard.ts mounted at /hr-dashboard

// Payment Requests Routes
router.use('/payment-requests', paymentRequestsRouter);
router.use('/', orgBillingRouter);
router.use('/', vendorInvoiceAdminRouter);

// accounting/courses/:courseId/students and validate-billing-readiness extracted to course-requests.ts

// org-billing balance-calculation route extracted to org-billing.ts

// vendor-invoice-admin routes extracted to vendor-invoice-admin.ts

export default router;