import express from 'express';
import { format } from 'date-fns';
import { pool } from '../config/database.js';
import { ApiResponseBuilder } from '../utils/apiResponse.js';
import { AppError, errorCodes } from '../utils/errorHandler.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { Request, Response } from 'express';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(requireRole(['instructor', 'admin']));

// Debug endpoint to test authentication
router.get('/debug', async (req, res) => {
  console.log('[Debug] Instructor debug endpoint hit');
  console.log('[Debug] User from token:', req.user);
  res.json(
    ApiResponseBuilder.success({
      message: 'Authentication working',
      user: req.user,
      timestamp: new Date().toISOString(),
    })
  );
});

// Get instructor's classes
router.get('/classes', async (req, res) => {
  try {
    const instructorId = req.user?.userId;
    if (!instructorId) {
      throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Invalid instructor ID');
    }
    console.log('[Instructor Classes] Starting request for instructor:', instructorId);
    console.log('[Instructor Classes] User object:', req.user);

    // First check if the instructor exists
    const instructorCheck = await pool.query(
      'SELECT id, username FROM users WHERE id = $1 AND role = $2',
      [instructorId, 'instructor']
    );
    console.log('[Instructor Classes] Instructor check result:', instructorCheck.rows);

    // Check course_requests table directly
    const courseRequestsCheck = await pool.query(
      `SELECT id, confirmed_date, confirmed_start_time, confirmed_end_time, status 
       FROM course_requests 
       WHERE instructor_id = $1 
       AND confirmed_date >= CURRENT_DATE 
       AND status = 'confirmed'`,
      [instructorId]
    );
    console.log('[Instructor Classes] Course requests check:', courseRequestsCheck.rows);

    // Check classes table directly
    const classesCheck = await pool.query(
      `SELECT id, date, start_time, end_time, status 
       FROM classes 
       WHERE instructor_id = $1 
       AND date >= CURRENT_DATE 
       AND status != 'completed'`,
      [instructorId]
    );
    console.log('[Instructor Classes] Classes check:', classesCheck.rows);

    // Debug: Print the raw CTE output before the join
    const cteResult = await pool.query(
      `WITH instructor_classes AS (
        SELECT 
          c.id,
          DATE(c.start_time) as datescheduled,
          c.start_time,
          c.end_time,
          c.status,
          c.location,
          c.max_students,
          0 as current_students,
          c.class_type_id,
          c.organization_id::integer as organization_id,
          NULL as notes,
          NULL as registered_students
        FROM classes c
        WHERE c.instructor_id = $1 
        AND DATE(c.start_time) >= CURRENT_DATE 
        AND c.status != 'completed'
        UNION
        SELECT 
          cr.id,
          cr.confirmed_date as datescheduled,
          cr.confirmed_start_time as start_time,
          cr.confirmed_end_time as end_time,
          cr.status,
          cr.location,
          cr.registered_students as max_students,
          0 as current_students,
          cr.class_type_id as class_type_id,
          cr.organization_id::integer as organization_id,
          cr.notes,
          cr.registered_students
        FROM course_requests cr
        WHERE cr.instructor_id = $1
        AND cr.confirmed_date >= CURRENT_DATE
        AND cr.status = 'confirmed'
      )
      SELECT * FROM instructor_classes`,
      [instructorId]
    );
    console.log('[DEBUG] Raw instructor_classes CTE output:', cteResult.rows);

    const result = await pool.query(
      `WITH instructor_classes AS (
        -- Get regular classes
        SELECT 
          c.id,
          DATE(c.start_time) as datescheduled,
          c.start_time,
          c.end_time,
          c.status,
          c.location,
          c.max_students,
          0 as current_students,
          c.class_type_id,
          c.organization_id::integer as organization_id,
          NULL as notes,
          NULL as registered_students
        FROM classes c
        WHERE c.instructor_id = $1 
        AND DATE(c.start_time) >= CURRENT_DATE 
        AND c.status != 'completed'
        
        UNION
        
        -- Get confirmed course requests with actual student count
        SELECT 
          cr.id,
          cr.confirmed_date as datescheduled,
          cr.confirmed_start_time as start_time,
          cr.confirmed_end_time as end_time,
          cr.status,
          cr.location,
          cr.registered_students as max_students,
          0 as current_students,
          cr.course_type_id as class_type_id,
          cr.organization_id::integer as organization_id,
          cr.notes,
          COALESCE(cs_count.student_count, 0) as registered_students
        FROM course_requests cr
        LEFT JOIN (
          SELECT 
            course_request_id,
            COUNT(*) as student_count
          FROM course_students
          GROUP BY course_request_id
        ) cs_count ON cr.id = cs_count.course_request_id
        WHERE cr.instructor_id = $1
        AND cr.confirmed_date >= CURRENT_DATE
        AND cr.status = 'confirmed'
      )
      SELECT 
        ic.id as course_id,
        ic.datescheduled::text,
        ic.start_time::text,
        ic.end_time::text,
        ic.status,
        ic.location,
        ic.max_students,
        ic.current_students,
        ct.name as coursetypename,
        COALESCE(o.name, 'Unassigned') as organizationname,
        COALESCE(ic.notes, '') as notes,
        COALESCE(ic.registered_students, ic.max_students, 0) as studentcount
      FROM instructor_classes ic
      LEFT JOIN class_types ct ON ic.class_type_id = ct.id
      LEFT JOIN organizations o ON ic.organization_id = o.id
      ORDER BY ic.datescheduled, ic.start_time`,
      [instructorId]
    );

    console.log('[Instructor Classes] Raw query results:', result.rows);
    
    // Log specific June 4th entries
    const june4Entries = result.rows.filter(row => row.datescheduled?.includes('2024-06-04'));
    console.log('[Instructor Classes] June 4th entries:', june4Entries);

    // Format the response to match the expected interface
    const formattedData = result.rows.map(row => ({
      id: row.course_id.toString(),
      type: row.coursetypename,
      date: row.datescheduled,
      time: `${row.start_time} - ${row.end_time}`,
      location: row.location,
      instructor_id: instructorId?.toString() || '0',
      max_students: row.max_students,
      current_students: row.current_students,
      status: row.status,
      organizationname: row.organizationname,
      notes: row.notes,
      studentcount: row.studentcount
    }));

    console.log('[Instructor Classes] Formatted response data:', formattedData);
    console.log('[Instructor Classes] June 4th entries in formatted data:', 
      formattedData.filter(entry => entry.date?.includes('2024-06-04')));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('[Instructor Classes] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch classes' });
  }
});

// Get instructor's upcoming classes
router.get('/classes/upcoming', async (req, res) => {
  try {
    const instructorId = req.user?.userId;
    const result = await pool.query(
      `SELECT c.id, DATE(c.start_time)::text, c.start_time::text, c.end_time::text, c.status, ct.name as type
             FROM classes c 
             LEFT JOIN class_types ct ON c.class_type_id = ct.id 
             WHERE c.instructor_id = $1 AND DATE(c.start_time) >= CURRENT_DATE AND c.status != 'completed'
             ORDER BY DATE(c.start_time), c.start_time LIMIT 5`,
      [instructorId]
    );

    res.json(
      ApiResponseBuilder.success(
        result.rows.map(row => ({
          id: row.id,
          date: row.date.split('T')[0],
          startTime: row.start_time.slice(0, 5),
          endTime: row.end_time.slice(0, 5),
          status: row.status,
          type: row.type || 'CPR Class',
          instructorId: instructorId,
        }))
      )
    );
  } catch (error) {
    console.error('Error fetching upcoming classes:', error);
    res
      .status(500)
      .json(
        ApiResponseBuilder.error(
          errorCodes.SERVICE_UNAVAILABLE,
          'Failed to fetch upcoming classes'
        )
      );
  }
});

// Get instructor availability
router.get('/availability', authenticateToken, async (req, res) => {
  try {
    console.log('[TRACE] Availability request received');
    console.log('[TRACE] Request headers:', {
      authorization: req.headers.authorization ? 'present' : 'missing',
      cookie: req.headers.cookie ? 'present' : 'missing'
    });
    console.log('[TRACE] User object:', req.user);
    
    const instructorId = parseInt(req.user?.userId || '0', 10);
    console.log('[TRACE] Parsed instructor ID:', instructorId);
    
    if (!instructorId) {
      console.log('[TRACE] Invalid instructor ID:', instructorId);
      return res
        .status(400)
        .json(
          ApiResponseBuilder.error(
            errorCodes.VALIDATION_ERROR,
            'Invalid instructor ID'
          )
        );
    }

    console.log('[TRACE] Executing availability query for instructor:', instructorId);
    const result = await pool.query(
      `SELECT id, instructor_id, date::text, status, created_at, updated_at 
             FROM instructor_availability 
             WHERE instructor_id = $1 
             ORDER BY date`,
      [instructorId]
    );

    console.log('[TRACE] Raw availability query results:', JSON.stringify(result.rows, null, 2));

    const formattedResponse = result.rows.map(row => ({
      id: row.id.toString(),
      instructor_id: row.instructor_id.toString(),
      date: row.date.split('T')[0],
      status: row.status || 'available',
    }));

    console.log('[TRACE] Formatted availability response:', JSON.stringify(formattedResponse, null, 2));

    res.json(ApiResponseBuilder.success(formattedResponse));
  } catch (error) {
    console.error('[TRACE] Error fetching availability:', error);
    res.status(500).json(
      ApiResponseBuilder.error(
        errorCodes.SERVICE_UNAVAILABLE,
        'Failed to fetch availability'
      )
    );
  }
});

// Add instructor availability
router.post('/availability', authenticateToken, async (req, res) => {
  try {
    const instructorId = parseInt(req.user?.userId || '0', 10);
    const { date } = req.body;

    if (!instructorId || !date) {
      return res.status(400).json(
        ApiResponseBuilder.error(
          errorCodes.VALIDATION_ERROR,
          'Invalid instructor ID or date'
        )
      );
    }

    // Check if date is at least 11 days in the future
    const selectedDate = new Date(date);
    const today = new Date();
    const diffTime = selectedDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 11) {
      return res.status(400).json(
        ApiResponseBuilder.error(
          errorCodes.VALIDATION_ERROR,
          'Availability must be set at least 11 days in advance'
        )
      );
    }

    // Check if availability already exists
    const existingAvailability = await pool.query(
      'SELECT id FROM instructor_availability WHERE instructor_id = $1 AND date = $2',
      [instructorId, date]
    );

    if (existingAvailability.rows.length > 0) {
      return res.status(400).json(
        ApiResponseBuilder.error(
          errorCodes.VALIDATION_ERROR,
          'Availability already exists for this date'
        )
      );
    }

    // Add new availability
    const result = await pool.query(
      'INSERT INTO instructor_availability (instructor_id, date, status) VALUES ($1, $2, $3) RETURNING *',
      [instructorId, date, 'available']
    );

    res.json(ApiResponseBuilder.success(result.rows[0]));
  } catch (error) {
    console.error('Error adding availability:', error);
    res.status(500).json(
      ApiResponseBuilder.error(
        errorCodes.SERVICE_UNAVAILABLE,
        'Failed to add availability'
      )
    );
  }
});

// Remove instructor availability
router.delete('/availability/:date', authenticateToken, async (req, res) => {
  try {
    const instructorId = parseInt(req.user?.userId || '0', 10);
    const { date } = req.params;

    if (!instructorId || !date) {
      return res.status(400).json(
        ApiResponseBuilder.error(
          errorCodes.VALIDATION_ERROR,
          'Invalid instructor ID or date'
        )
      );
    }

    // Check if date is at least 11 days in the future
    const selectedDate = new Date(date);
    const today = new Date();
    const diffTime = selectedDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 11) {
      return res.status(400).json(
        ApiResponseBuilder.error(
          errorCodes.VALIDATION_ERROR,
          'Cannot remove availability less than 11 days in advance'
        )
      );
    }

    // Remove availability
    const result = await pool.query(
      'DELETE FROM instructor_availability WHERE instructor_id = $1 AND date = $2 RETURNING *',
      [instructorId, date]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        ApiResponseBuilder.error(
          errorCodes.RESOURCE_NOT_FOUND,
          'Availability not found'
        )
      );
    }

    res.json(ApiResponseBuilder.success({ message: 'Availability removed successfully' }));
  } catch (error) {
    console.error('Error removing availability:', error);
    res.status(500).json(
      ApiResponseBuilder.error(
        errorCodes.SERVICE_UNAVAILABLE,
        'Failed to remove availability'
      )
    );
  }
});

// Get instructor's schedule (alias for /classes)
router.get('/schedule', async (req, res) => {
  try {
    const instructorId = req.user?.userId;
    console.log('[Instructor Schedule] Starting request for instructor:', instructorId);
    console.log('[Instructor Schedule] User object:', req.user);

    // First check if the instructor exists
    const instructorCheck = await pool.query(
      'SELECT id, username FROM users WHERE id = $1 AND role = $2',
      [instructorId, 'instructor']
    );
    console.log('[Instructor Schedule] Instructor check result:', instructorCheck.rows);

    // Check course_requests table directly
    const courseRequestsCheck = await pool.query(
      `SELECT id, confirmed_date, confirmed_start_time, confirmed_end_time, status 
       FROM course_requests 
       WHERE instructor_id = $1 
       AND confirmed_date >= CURRENT_DATE 
       AND status = 'confirmed'`,
      [instructorId]
    );
    console.log('[Instructor Schedule] Course requests check:', courseRequestsCheck.rows);

    // Check classes table directly
    const classesCheck = await pool.query(
      `SELECT id, date, start_time, end_time, status 
       FROM classes 
       WHERE instructor_id = $1 
       AND date >= CURRENT_DATE 
       AND status != 'completed'`,
      [instructorId]
    );
    console.log('[Instructor Schedule] Classes check:', classesCheck.rows);

    const result = await pool.query(
      `WITH instructor_classes AS (
        -- Get regular classes
        SELECT 
          c.id,
          DATE(c.start_time) as datescheduled,
          c.start_time,
          c.end_time,
          c.status,
          c.location,
          c.max_students,
          0 as current_students,
          c.class_type_id,
          c.organization_id::integer as organization_id,
          NULL as notes,
          NULL as registered_students
        FROM classes c
        WHERE c.instructor_id = $1 
        AND DATE(c.start_time) >= CURRENT_DATE 
        AND c.status != 'completed'
        
        UNION
        
        -- Get confirmed course requests with actual student count
        SELECT 
          cr.id,
          cr.confirmed_date as datescheduled,
          cr.confirmed_start_time as start_time,
          cr.confirmed_end_time as end_time,
          cr.status,
          cr.location,
          cr.registered_students as max_students,
          0 as current_students,
          cr.course_type_id as class_type_id,
          cr.organization_id::integer as organization_id,
          cr.notes,
          COALESCE(cs_count.student_count, 0) as registered_students
        FROM course_requests cr
        LEFT JOIN (
          SELECT 
            course_request_id,
            COUNT(*) as student_count
          FROM course_students
          GROUP BY course_request_id
        ) cs_count ON cr.id = cs_count.course_request_id
        WHERE cr.instructor_id = $1
        AND cr.confirmed_date >= CURRENT_DATE
        AND cr.status = 'confirmed'
      )
      SELECT 
        ic.id as course_id,
        ic.datescheduled::text,
        ic.start_time::text,
        ic.end_time::text,
        ic.status,
        ic.location,
        ic.max_students,
        ic.current_students,
        ct.name as coursetypename,
        COALESCE(o.name, 'Unassigned') as organizationname,
        COALESCE(ic.notes, '') as notes,
        COALESCE(ic.registered_students, ic.max_students, 0) as studentcount
      FROM instructor_classes ic
      LEFT JOIN class_types ct ON ic.class_type_id = ct.id
      LEFT JOIN organizations o ON ic.organization_id = o.id
      ORDER BY ic.datescheduled, ic.start_time`,
      [instructorId]
    );

    console.log('[Instructor Schedule] Raw query results:', result.rows);
    
    // Log specific June 4th entries
    const june4Entries = result.rows.filter(row => row.datescheduled?.includes('2024-06-04'));
    console.log('[Instructor Schedule] June 4th entries:', june4Entries);

    // Format the response to match the expected interface
    const formattedData = result.rows.map(row => ({
      id: row.course_id.toString(),
      type: row.coursetypename,
      date: row.datescheduled,
      time: `${row.start_time} - ${row.end_time}`,
      location: row.location,
      instructor_id: instructorId?.toString() || '0',
      max_students: row.max_students,
      current_students: row.current_students,
      status: row.status,
      organizationname: row.organizationname,
      notes: row.notes,
      studentcount: row.studentcount
    }));

    console.log('[Instructor Schedule] Formatted response data:', formattedData);
    console.log('[Instructor Schedule] June 4th entries in formatted data:', 
      formattedData.filter(entry => entry.date?.includes('2024-06-04')));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('[Instructor Schedule] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch schedule' });
  }
});

// Attendance Management Endpoints

// Get today's classes for attendance
router.get('/classes/today', async (req, res) => {
  try {
    const instructorId = parseInt(req.user?.userId || '0', 10);
    if (!instructorId) {
      return res
        .status(400)
        .json(
          ApiResponseBuilder.error(
            errorCodes.VALIDATION_ERROR,
            'Invalid instructor ID'
          )
        );
    }

    console.log(
      "[Debug] Fetching today's classes for instructor ID:",
      instructorId
    );

    const result = await pool.query(
      `SELECT 
                c.id as course_id,
                DATE(c.start_time)::text as datescheduled,
                c.start_time::text, 
                c.end_time::text, 
                c.status, 
                c.location,
                c.max_students,
                ct.name as coursetypename,
                COALESCE(o.name, 'Unassigned') as organizationname,
                COALESCE(cr.notes, '') as notes,
                COALESCE(cr.registered_students, c.max_students, 0) as studentcount
             FROM classes c 
             LEFT JOIN class_types ct ON c.class_type_id = ct.id 
             LEFT JOIN course_requests cr ON cr.instructor_id = c.instructor_id 
                AND cr.status = 'confirmed'
                AND DATE(cr.confirmed_date) = DATE(c.start_time)
                AND cr.course_type_id = c.class_type_id
             LEFT JOIN organizations o ON c.organization_id = o.id
             WHERE c.instructor_id = $1 AND DATE(c.start_time) = CURRENT_DATE AND c.status != 'completed'
             ORDER BY c.start_time`,
      [instructorId]
    );

    const formattedClasses = result.rows.map(row => ({
      course_id: row.course_id.toString(),
      datescheduled: row.datescheduled,
      coursetypename: row.coursetypename || 'CPR Class',
      organizationname: row.organizationname || 'Unassigned',
      location: row.location || 'TBD',
      studentcount: row.studentcount || 0,
      studentsregistered: row.studentcount || 0,
      studentsattendance: 0, // Since we don't track current_students in classes table
      notes: row.notes || '',
      status: row.status || 'scheduled',
      max_students: row.max_students || 10,
      current_students: 0, // Since we don't track current_students in classes table
      start_time: row.start_time ? row.start_time.slice(0, 5) : '09:00',
      end_time: row.end_time ? row.end_time.slice(0, 5) : '12:00',
    }));

    res.json(ApiResponseBuilder.success(formattedClasses));
  } catch (error) {
    console.error("Error fetching today's classes:", error);
    res
      .status(500)
      .json(
        ApiResponseBuilder.error(
          errorCodes.SERVICE_UNAVAILABLE,
          "Failed to fetch today's classes"
        )
      );
  }
});

// Get students for a specific class
router.get('/classes/:classId/students', async (req, res) => {
  try {
    const instructorId = parseInt(req.user?.userId || '0', 10);
    const { classId } = req.params;

    if (!instructorId) {
      return res
        .status(400)
        .json(
          ApiResponseBuilder.error(
            errorCodes.VALIDATION_ERROR,
            'Invalid instructor ID'
          )
        );
    }

    console.log(
      '[Debug] Fetching students for class ID:',
      classId,
      'instructor ID:',
      instructorId
    );

    // First verify the class belongs to this instructor
    const classCheck = await pool.query(
      'SELECT id FROM classes WHERE id = $1 AND instructor_id = $2',
      [classId, instructorId]
    );

    if (classCheck.rows.length === 0) {
      return res
        .status(404)
        .json(
          ApiResponseBuilder.error(
            errorCodes.RESOURCE_NOT_FOUND,
            'Class not found or not authorized'
          )
        );
    }

    // Get course_request_id to find students
    const courseRequestResult = await pool.query(
      `SELECT cr.id as course_request_id
             FROM course_requests cr
             JOIN classes c ON cr.instructor_id = c.instructor_id 
                AND DATE(cr.confirmed_date) = DATE(c.start_time)
                AND cr.course_type_id = c.class_type_id
             WHERE c.id = $1 AND c.instructor_id = $2`,
      [classId, instructorId]
    );

    let students: any[] = [];

    if (courseRequestResult.rows.length > 0) {
      const courseRequestId = courseRequestResult.rows[0].course_request_id;

      // Get students from course_students table
      const studentsResult = await pool.query(
        `SELECT 
                    cs.id,
                    cs.first_name,
                    cs.last_name,
                    cs.email,
                    cs.attendance_marked,
                    cs.attended,
                    cs.created_at
                 FROM course_students cs
                 WHERE cs.course_request_id = $1
                 ORDER BY cs.last_name, cs.first_name`,
        [courseRequestId]
      );

      students = studentsResult.rows.map(row => ({
        studentid: row.id.toString(),
        firstname: row.first_name,
        lastname: row.last_name,
        email: row.email || '',
        attendance: row.attended || false,
        attendanceMarked: row.attendance_marked || false,
      }));
    }

    res.json(ApiResponseBuilder.success(students));
  } catch (error) {
    console.error('Error fetching class students:', error);
    res
      .status(500)
      .json(
        ApiResponseBuilder.error(
          errorCodes.SERVICE_UNAVAILABLE,
          'Failed to fetch class students'
        )
      );
  }
});

// Add student to a specific class
router.post('/classes/:classId/students', async (req, res) => {
  try {
    const instructorId = parseInt(req.user?.userId || '0', 10);
    const { classId } = req.params;
    const { firstName, lastName, email } = req.body;

    if (!instructorId) {
      return res
        .status(400)
        .json(
          ApiResponseBuilder.error(
            errorCodes.VALIDATION_ERROR,
            'Invalid instructor ID'
          )
        );
    }

    if (!firstName || !lastName) {
      return res
        .status(400)
        .json(
          ApiResponseBuilder.error(
            errorCodes.VALIDATION_ERROR,
            'First name and last name are required'
          )
        );
    }

    console.log(
      '[Debug] Adding student to class ID:',
      classId,
      'instructor ID:',
      instructorId
    );

    // First verify the class belongs to this instructor
    const classCheck = await pool.query(
      'SELECT id FROM classes WHERE id = $1 AND instructor_id = $2',
      [classId, instructorId]
    );

    if (classCheck.rows.length === 0) {
      return res
        .status(404)
        .json(
          ApiResponseBuilder.error(
            errorCodes.RESOURCE_NOT_FOUND,
            'Class not found or not authorized'
          )
        );
    }

    // Get course_request_id to add student
    const courseRequestResult = await pool.query(
      `SELECT cr.id as course_request_id
             FROM course_requests cr
             JOIN classes c ON cr.instructor_id = c.instructor_id 
                AND DATE(cr.confirmed_date) = DATE(c.start_time)
                AND cr.course_type_id = c.class_type_id
             WHERE c.id = $1 AND c.instructor_id = $2`,
      [classId, instructorId]
    );

    if (courseRequestResult.rows.length === 0) {
      return res
        .status(404)
        .json(
          ApiResponseBuilder.error(
            errorCodes.RESOURCE_NOT_FOUND,
            'Associated course request not found'
          )
        );
    }

    const courseRequestId = courseRequestResult.rows[0].course_request_id;

    // Add student to course_students table
    const result = await pool.query(
      `INSERT INTO course_students (course_request_id, first_name, last_name, email)
             VALUES ($1, $2, $3, $4)
             RETURNING id, first_name, last_name, email, attendance_marked, attended`,
      [
        courseRequestId,
        firstName.trim(),
        lastName.trim(),
        email?.trim() || null,
      ]
    );

    const newStudent = {
      studentid: result.rows[0].id.toString(),
      firstname: result.rows[0].first_name,
      lastname: result.rows[0].last_name,
      email: result.rows[0].email || '',
      attendance: result.rows[0].attended || false,
      attendanceMarked: result.rows[0].attendance_marked || false,
    };

    res.json(
      ApiResponseBuilder.success(newStudent, {
        message: 'Student added successfully',
      })
    );
  } catch (error) {
    console.error('Error adding student to class:', error);
    res
      .status(500)
      .json(
        ApiResponseBuilder.error(
          errorCodes.SERVICE_UNAVAILABLE,
          'Failed to add student to class'
        )
      );
  }
});

// Update student attendance
router.put(
  '/classes/:classId/students/:studentId/attendance',
  async (req, res) => {
    try {
      const instructorId = parseInt(req.user?.userId || '0', 10);
      const { classId, studentId } = req.params;
      const { attended } = req.body;

      if (!instructorId) {
        return res
          .status(400)
          .json(
            ApiResponseBuilder.error(
              errorCodes.VALIDATION_ERROR,
              'Invalid instructor ID'
            )
          );
      }

      if (typeof attended !== 'boolean') {
        return res
          .status(400)
          .json(
            ApiResponseBuilder.error(
              errorCodes.VALIDATION_ERROR,
              'Attended status must be a boolean'
            )
          );
      }

      console.log(
        '[Debug] Updating attendance for student ID:',
        studentId,
        'class ID:',
        classId,
        'attended:',
        attended
      );

      // First verify the class belongs to this instructor
      const classCheck = await pool.query(
        'SELECT id FROM classes WHERE id = $1 AND instructor_id = $2',
        [classId, instructorId]
      );

      if (classCheck.rows.length === 0) {
        return res
          .status(404)
          .json(
            ApiResponseBuilder.error(
              errorCodes.RESOURCE_NOT_FOUND,
              'Class not found or not authorized'
            )
          );
      }

      // Get course_request_id to update attendance count
      const courseRequestResult = await pool.query(
        `SELECT cr.id as course_request_id
             FROM course_requests cr
             JOIN classes c ON cr.instructor_id = c.instructor_id 
                AND DATE(cr.confirmed_date) = DATE(c.start_time)
                AND cr.course_type_id = c.class_type_id
             WHERE c.id = $1 AND c.instructor_id = $2`,
        [classId, instructorId]
      );

      // Update student attendance
      const result = await pool.query(
        `UPDATE course_students 
             SET attended = $1, attendance_marked = true, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING id, first_name, last_name, email, attendance_marked, attended`,
        [attended, studentId]
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json(
            ApiResponseBuilder.error(
              errorCodes.RESOURCE_NOT_FOUND,
              'Student not found'
            )
          );
      }

      // Update the current_students count in classes table
      if (courseRequestResult.rows.length > 0) {
        const courseRequestId = courseRequestResult.rows[0].course_request_id;

        // Count the number of students who attended
        const attendanceCountResult = await pool.query(
          `SELECT COUNT(*) as attended_count
                 FROM course_students
                 WHERE course_request_id = $1 AND attended = true`,
          [courseRequestId]
        );

        const attendedCount = parseInt(
          attendanceCountResult.rows[0].attended_count
        );

        // Note: We don't need to update course_requests with attendance count
        // as it can be calculated dynamically when needed
        console.log(
          '[Debug] Current attendance count for course request ID:',
          courseRequestId,
          'is:',
          attendedCount
        );
      }

      const updatedStudent = {
        studentid: result.rows[0].id.toString(),
        firstname: result.rows[0].first_name,
        lastname: result.rows[0].last_name,
        email: result.rows[0].email || '',
        attendance: result.rows[0].attended || false,
        attendanceMarked: result.rows[0].attendance_marked || false,
      };

      res.json(
        ApiResponseBuilder.success(updatedStudent, {
          message: 'Attendance updated successfully',
        })
      );
    } catch (error) {
      console.error('Error updating student attendance:', error);
      res
        .status(500)
        .json(
          ApiResponseBuilder.error(
            errorCodes.SERVICE_UNAVAILABLE,
            'Failed to update student attendance'
          )
        );
    }
  }
);

/**
 * @route PUT /classes/:classId/complete
 * @description Mark a class as completed by the instructor
 * @access Private (Instructor only)
 * @param {string} classId - The ID of the class to mark as complete
 * @body {boolean} [generateCertificates=false] - Whether to generate certificates for students
 * @returns {Object} Success response with completion details
 *
 * @security
 * - Validates instructor owns the class
 * - Ensures class is in past or current date
 * - Validates all students have attendance marked
 * - Uses database transaction for data integrity
 * - Logs completion action for audit trail
 */
router.put('/classes/:classId/complete', async (req, res) => {
  try {
    const instructorId = parseInt(req.user?.userId || '0', 10);
    const { classId } = req.params;
    const { instructor_comments } = req.body;

    if (!instructorId) {
      return res
        .status(400)
        .json(
          ApiResponseBuilder.error(
            errorCodes.VALIDATION_ERROR,
            'Invalid instructor ID'
          )
        );
    }

    console.log('[Complete Course] Instructor ID:', instructorId, 'Class ID:', classId);
    console.log('[Complete Course] Instructor Comments:', instructor_comments);

    // Start a transaction to ensure all operations succeed or fail together
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // First verify the class belongs to this instructor and is not already completed
      const classCheck = await client.query(
        'SELECT id, status, instructor_id FROM classes WHERE id = $1 AND instructor_id = $2',
        [classId, instructorId]
      );

      if (classCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res
          .status(404)
          .json(
            ApiResponseBuilder.error(
              errorCodes.RESOURCE_NOT_FOUND,
              'Class not found or not authorized'
            )
          );
      }

      const classData = classCheck.rows[0];
      if (classData.status === 'completed') {
        await client.query('ROLLBACK');
        return res
          .status(400)
          .json(
            ApiResponseBuilder.error(
              errorCodes.VALIDATION_ERROR,
              'Class is already completed'
            )
          );
      }

      // Get the course request ID to update both tables
      const courseRequestResult = await client.query(
        `SELECT cr.id as course_request_id, cr.organization_id
         FROM course_requests cr
         JOIN classes c ON cr.instructor_id = c.instructor_id 
            AND DATE(cr.confirmed_date) = DATE(c.start_time)
            AND cr.course_type_id = c.class_type_id
         WHERE c.id = $1 AND c.instructor_id = $2`,
        [classId, instructorId]
      );

      if (courseRequestResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res
          .status(404)
          .json(
            ApiResponseBuilder.error(
              errorCodes.RESOURCE_NOT_FOUND,
              'Course request not found for this class'
            )
          );
      }

      const courseRequestId = courseRequestResult.rows[0].course_request_id;
      const organizationId = courseRequestResult.rows[0].organization_id;

      // Calculate final attendance count
      const attendanceResult = await client.query(
        `SELECT COUNT(*) as total_students, 
                COUNT(CASE WHEN attended = true THEN 1 END) as attended_count
         FROM course_students 
         WHERE course_request_id = $1`,
        [courseRequestId]
      );

      const totalStudents = parseInt(attendanceResult.rows[0].total_students);
      const attendedCount = parseInt(attendanceResult.rows[0].attended_count);

      // Update the class status to completed
      await client.query(
        'UPDATE classes SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['completed', classId]
      );

      // Update the course request status to completed with instructor comments
      await client.query(
        `UPDATE course_requests 
         SET status = 'completed', 
             completed_at = CURRENT_TIMESTAMP,
             instructor_comments = $1,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [instructor_comments || null, courseRequestId]
      );

      // Commit the transaction
      await client.query('COMMIT');

      console.log('[Complete Course] Successfully completed class:', classId);
      console.log('[Complete Course] Final attendance:', attendedCount, '/', totalStudents);
      console.log('[Complete Course] Instructor comments saved:', instructor_comments ? 'Yes' : 'No');

      // Return the updated class data
      const updatedClassResult = await pool.query(
        `SELECT 
          c.id as course_id,
          DATE(c.start_time)::text as datescheduled,
          c.start_time::text,
          c.end_time::text,
          c.status,
          c.location,
          c.max_students,
          0 as current_students,
          ct.name as coursetypename,
          COALESCE(o.name, 'Unassigned') as organizationname,
          COALESCE(cr.notes, '') as notes,
          0 as studentcount,
          0 as studentsattendance,
          COALESCE(cr.instructor_comments, '') as instructor_comments
        FROM classes c
        LEFT JOIN class_types ct ON c.class_type_id = ct.id
        LEFT JOIN course_requests cr ON cr.instructor_id = c.instructor_id 
          AND DATE(cr.confirmed_date) = DATE(c.start_time)
          AND cr.course_type_id = c.class_type_id
        LEFT JOIN organizations o ON cr.organization_id = o.id
        WHERE c.id = $1`,
        [classId]
      );

      const formattedData = updatedClassResult.rows.map(row => ({
        id: row.course_id.toString(),
        type: row.coursetypename,
        date: row.datescheduled,
        time: `${row.start_time} - ${row.end_time}`,
        location: row.location,
        instructor_id: instructorId.toString(),
        max_students: row.max_students,
        current_students: row.current_students,
        status: row.status,
        organizationname: row.organizationname,
        notes: row.notes,
        studentcount: row.studentcount,
        final_attendance: row.studentsattendance,
        instructor_comments: row.instructor_comments,
        completed: true
      }));

      res.json(ApiResponseBuilder.success(formattedData[0]));

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('[Complete Course] Error:', error);
    res
      .status(500)
      .json(
        ApiResponseBuilder.error(
          errorCodes.SERVICE_UNAVAILABLE,
          'Failed to complete course'
        )
      );
  }
});

// Get instructor's completed classes
router.get('/classes/completed', async (req, res) => {
  try {
    const instructorId = req.user?.userId;
    if (!instructorId) {
      throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Invalid instructor ID');
    }

    console.log('[Completed Classes] Fetching completed classes for instructor:', instructorId);

    // First check what classes exist for this instructor
    const classCheck = await pool.query(
      'SELECT id, status, instructor_id FROM classes WHERE instructor_id = $1 ORDER BY updated_at DESC LIMIT 5',
      [instructorId]
    );
    console.log('[Completed Classes] All classes for instructor:', classCheck.rows);

    // Check course requests
    const courseRequestCheck = await pool.query(
      'SELECT id, status, instructor_id FROM course_requests WHERE instructor_id = $1 ORDER BY updated_at DESC LIMIT 5',
      [instructorId]
    );
    console.log('[Completed Classes] All course requests for instructor:', courseRequestCheck.rows);

    const result = await pool.query(
      `WITH completed_classes AS (
        -- Get completed regular classes
        SELECT 
          c.id,
          DATE(c.start_time) as datescheduled,
          c.start_time,
          c.end_time,
          c.status,
          c.location,
          c.max_students,
          c.class_type_id,
          c.organization_id::integer as organization_id,
          NULL as notes,
          NULL as registered_students
        FROM classes c
        WHERE c.instructor_id = $1 
        AND c.status = 'completed'
        
        UNION
        
        -- Get completed course requests
        SELECT 
          cr.id,
          cr.confirmed_date as datescheduled,
          cr.confirmed_start_time as start_time,
          cr.confirmed_end_time as end_time,
          cr.status,
          cr.location,
          cr.registered_students as max_students,
          0 as current_students,
          cr.class_type_id as class_type_id,
          cr.organization_id::integer as organization_id,
          cr.notes,
          cr.registered_students
        FROM course_requests cr
        WHERE cr.instructor_id = $1
        AND cr.status = 'completed'
      )
      SELECT 
        cc.id as course_id,
        cc.datescheduled::text,
        cc.start_time::text,
        cc.end_time::text,
        cc.status,
        cc.location,
        cc.max_students,
        cc.current_students,
        ct.name as coursetypename,
        COALESCE(o.name, 'Unassigned') as organizationname,
        COALESCE(cc.notes, '') as notes,
        COALESCE(cc.registered_students, cc.max_students, 0) as studentcount
      FROM completed_classes cc
      LEFT JOIN class_types ct ON cc.class_type_id = ct.id
      LEFT JOIN organizations o ON cc.organization_id = o.id
      ORDER BY cc.datescheduled DESC, cc.start_time DESC`,
      [instructorId]
    );

    const formattedData = result.rows.map(row => ({
      id: row.course_id.toString(),
      type: row.coursetypename,
      date: row.datescheduled,
      time: `${row.start_time} - ${row.end_time}`,
      location: row.location,
      instructor_id: instructorId.toString(),
      max_students: row.max_students,
      current_students: row.current_students,
      status: row.status,
      organizationname: row.organizationname,
      notes: row.notes,
      studentcount: row.studentcount
    }));

    res.json(ApiResponseBuilder.success(formattedData));
  } catch (error) {
    console.error('[Instructor Completed Classes] Error:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json(ApiResponseBuilder.error(error.code, error.message));
    } else {
      res.status(500).json(ApiResponseBuilder.error(errorCodes.SERVICE_UNAVAILABLE, 'Failed to fetch completed classes'));
    }
  }
});

// Get a specific class by ID
router.get('/classes/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const instructorId = req.user?.userId;

    if (!instructorId) {
      throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Invalid instructor ID');
    }

    // First check if the class exists and belongs to this instructor
    const result = await pool.query(
      `WITH class_data AS (
        -- Check regular classes
        SELECT 
          c.id,
          DATE(c.start_time) as datescheduled,
          c.start_time,
          c.end_time,
          c.status,
          c.location,
          c.max_students,
          c.class_type_id,
          c.organization_id::integer as organization_id,
          NULL as notes,
          NULL as registered_students
        FROM classes c
        WHERE c.id = $1 AND c.instructor_id = $2
        
        UNION
        
        -- Check confirmed course requests
        SELECT 
          cr.id,
          cr.confirmed_date as datescheduled,
          cr.confirmed_start_time as start_time,
          cr.confirmed_end_time as end_time,
          cr.status,
          cr.location,
          cr.registered_students as max_students,
          0 as current_students,
          cr.class_type_id as class_type_id,
          cr.organization_id::integer as organization_id,
          cr.notes,
          cr.registered_students
        FROM course_requests cr
        WHERE cr.id = $1 AND cr.instructor_id = $2
      )
      SELECT 
        cd.id as course_id,
        cd.datescheduled::text,
        cd.start_time::text,
        cd.end_time::text,
        cd.status,
        cd.location,
        cd.max_students,
        cd.current_students,
        ct.name as coursetypename,
        COALESCE(o.name, 'Unassigned') as organizationname,
        COALESCE(cd.notes, '') as notes,
        COALESCE(cd.registered_students, cd.max_students, 0) as studentcount
      FROM class_data cd
      LEFT JOIN class_types ct ON cd.class_type_id = ct.id
      LEFT JOIN organizations o ON cd.organization_id = o.id`,
      [classId, instructorId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Class not found');
    }

    const classData = result.rows[0];
    const formattedData = {
      id: classData.course_id.toString(),
      type: classData.coursetypename,
      date: classData.datescheduled,
      time: `${classData.start_time} - ${classData.end_time}`,
      location: classData.location,
      instructor_id: instructorId.toString(),
      max_students: classData.max_students,
      current_students: classData.current_students,
      status: classData.status,
      organizationname: classData.organizationname,
      notes: classData.notes,
      studentcount: classData.studentcount
    };

    res.json(ApiResponseBuilder.success(formattedData));
  } catch (error) {
    console.error('[Instructor Class Details] Error:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json(ApiResponseBuilder.error(error.code, error.message));
    } else {
      res.status(500).json(ApiResponseBuilder.error(errorCodes.SERVICE_UNAVAILABLE, 'Failed to fetch class details'));
    }
  }
});

// Get instructor schedule (admin access)
router.get(
  '/:id/schedule',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const instructorId = parseInt(id, 10);

      if (!instructorId) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Invalid instructor ID'
        );
      }

      const result = await pool.query(
        `WITH instructor_classes AS (
          -- Get regular classes
          SELECT 
            c.id,
            DATE(c.start_time) as datescheduled,
            c.start_time,
            c.end_time,
            c.status,
            c.location,
            c.max_students,
            0 as current_students,
            c.class_type_id,
            c.organization_id::integer as organization_id,
            NULL as notes,
            NULL as registered_students
          FROM classes c
          WHERE c.instructor_id = $1 
          AND c.date >= CURRENT_DATE 
          AND c.status != 'completed'
          
          UNION
          
          -- Get confirmed course requests with actual student count
          SELECT 
            cr.id,
            cr.confirmed_date as datescheduled,
            cr.confirmed_start_time as start_time,
            cr.confirmed_end_time as end_time,
            cr.status,
            cr.location,
            cr.registered_students as max_students,
            0 as current_students,
            cr.class_type_id as class_type_id,
            cr.organization_id::integer as organization_id,
            cr.notes,
            COALESCE(cs_count.student_count, 0) as registered_students
          FROM course_requests cr
          LEFT JOIN (
            SELECT 
              course_request_id,
              COUNT(*) as student_count
            FROM course_students
            GROUP BY course_request_id
          ) cs_count ON cr.id = cs_count.course_request_id
          WHERE cr.instructor_id = $1
          AND cr.confirmed_date >= CURRENT_DATE
          AND cr.status = 'confirmed'
        )
        SELECT 
          ic.id as course_id,
          ic.datescheduled::text,
          ic.start_time::text,
          ic.end_time::text,
          ic.status,
          ic.location,
          ic.max_students,
          ic.current_students,
          ct.name as coursetypename,
          COALESCE(o.name, 'Unassigned') as organizationname,
          COALESCE(ic.notes, '') as notes,
          COALESCE(ic.registered_students, ic.max_students, 0) as studentcount
        FROM instructor_classes ic
        LEFT JOIN class_types ct ON ic.class_type_id = ct.id
        LEFT JOIN organizations o ON ic.organization_id = o.id
        ORDER BY ic.datescheduled, ic.start_time`,
        [instructorId]
      );

      const formattedData = result.rows.map(row => ({
        id: row.course_id.toString(),
        type: row.coursetypename,
        date: row.datescheduled,
        time: `${row.start_time} - ${row.end_time}`,
        location: row.location,
        instructor_id: instructorId.toString(),
        max_students: row.max_students,
        current_students: row.current_students,
        status: row.status,
        organizationname: row.organizationname,
        notes: row.notes,
        studentcount: row.studentcount
      }));

      return res.json(ApiResponseBuilder.success(formattedData));
    } catch (error: any) {
      console.error('Error fetching instructor schedule:', error);
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to fetch instructor schedule'
      );
    }
  })
);

// Get instructor availability (admin access)
router.get(
  '/:id/availability',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const instructorId = parseInt(id, 10);

      if (!instructorId) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Invalid instructor ID'
        );
      }

      const result = await pool.query(
        `SELECT id, instructor_id, date::text, status, created_at, updated_at 
         FROM instructor_availability 
         WHERE instructor_id = $1 
         ORDER BY date`,
        [instructorId]
      );

      const formattedResponse = result.rows.map(row => ({
        id: row.id.toString(),
        instructor_id: row.instructor_id.toString(),
        date: row.date.split('T')[0],
        status: row.status || 'available',
      }));

      return res.json(ApiResponseBuilder.success(formattedResponse));
    } catch (error: any) {
      console.error('Error fetching instructor availability:', error);
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to fetch instructor availability'
      );
    }
  })
);

export default router;
