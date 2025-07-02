import express from 'express';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware.js';
import { pool } from '../../config/database.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import { errorCodes } from '../../utils/errorHandler.js';

const router = express.Router();

// Test endpoint to check database connection
router.get('/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT 1 as test');
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Database test error:', error);
    res.status(500).json({ error: 'Database connection failed', details: error.message });
  }
});

// Test endpoint for classes
router.get('/test-classes', async (req, res) => {
  try {
    const dbResult = await pool.query(
      `SELECT 
        c.id,
        c.instructor_id,
        c.start_time,
        c.end_time,
        c.status,
        ct.name as course_name
       FROM classes c
       JOIN class_types ct ON c.class_type_id = ct.id
       WHERE c.instructor_id = 2
       LIMIT 3`
    );
    res.json({ success: true, data: dbResult.rows });
  } catch (error: any) {
    console.error('Classes test error:', error);
    res.status(500).json({ error: 'Classes query failed', details: error.message });
  }
});

// Get instructor's availability
router.get('/availability', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT id, instructor_id, date, status, created_at, updated_at
       FROM instructor_availability
       WHERE instructor_id = $1
       ORDER BY date ASC`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching instructor availability:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add availability
router.post('/availability', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  try {
    const { date } = req.body;

    // Validate date format
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Check if availability already exists
    const existingResult = await pool.query(
      'SELECT id FROM instructor_availability WHERE instructor_id = $1 AND date = $2',
      [userId, date]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Availability already exists for this date' });
    }

    // Insert new availability
    const result = await pool.query(
      `INSERT INTO instructor_availability (instructor_id, date, status)
       VALUES ($1, $2, 'available')
       RETURNING id, instructor_id, date, status, created_at, updated_at`,
      [userId, date]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error adding instructor availability:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove availability
router.delete('/availability/:date', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  try {
    const { date } = req.params;

    // Validate date format
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Delete availability
    const result = await pool.query(
      'DELETE FROM instructor_availability WHERE instructor_id = $1 AND date = $2 RETURNING id',
      [userId, date]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Availability not found' });
    }

    res.json({ success: true, message: 'Availability removed successfully' });
  } catch (error) {
    console.error('Error removing instructor availability:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get instructor's classes
router.get('/classes', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  console.log('[DEBUG] Checking data for instructor:', userId);
  
  // Check course_students table
  const courseStudentsResult = await pool.query(
    `SELECT cs.* FROM course_students cs
     JOIN course_requests cr ON cs.course_request_id = cr.id
     WHERE cr.instructor_id = $1 LIMIT 5`,
    [userId]
  );
  console.log('[DEBUG] course_students sample:', courseStudentsResult.rows);
  
  // Check course_requests table
  const courseRequestsResult = await pool.query('SELECT * FROM course_requests WHERE instructor_id = $1 LIMIT 5', [userId]);
  console.log('[DEBUG] course_requests for instructor:', courseRequestsResult.rows);
  
  // Check classes table
  const classesResult = await pool.query('SELECT * FROM classes WHERE instructor_id = $1 LIMIT 5', [userId]);
  console.log('[DEBUG] classes for instructor:', classesResult.rows);
  
  const dbResult = await pool.query(
    `SELECT 
      c.id,
      c.id as course_id,
      c.instructor_id,
      c.start_time,
      c.end_time,
      c.status,
      c.location,
      c.max_students,
      CASE WHEN c.status = 'completed' THEN true ELSE false END as completed,
      c.created_at,
      c.updated_at,
      ct.name as course_name,
      ct.name as coursetypename,
      COALESCE(o.name, 'Unassigned') as organizationname,
      COALESCE(c.location, '') as notes,
      0 as studentcount,
      0 as studentsattendance
     FROM classes c
     JOIN class_types ct ON c.class_type_id = ct.id
     LEFT JOIN organizations o ON o.id = 1
     WHERE c.instructor_id = $1
     ORDER BY c.start_time DESC, c.end_time DESC`,
    [userId]
  );
  console.log('[TRACE] Raw DB result:', JSON.stringify(dbResult.rows, null, 2));
  const result = dbResult.rows.map(row => {
    // Extract date from start_time for compatibility
    const date = row.start_time ? new Date(row.start_time).toISOString().split('T')[0] : null;
    return {
      ...row,
      date: date
    };
  });
  console.log('[TRACE] API response data:', JSON.stringify(result, null, 2));
  res.json({ success: true, data: result });
});

// Get instructor's active classes (non-completed)
router.get('/classes/active', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  console.log('[DEBUG] Fetching active classes for instructor:', userId);
  
  const dbResult = await pool.query(
    `SELECT 
      c.id,
      c.id as course_id,
      c.instructor_id,
      c.start_time,
      c.end_time,
      c.status,
      c.location,
      c.max_students,
      CASE WHEN c.status = 'completed' THEN true ELSE false END as completed,
      c.created_at,
      c.updated_at,
      ct.name as course_name,
      ct.name as coursetypename,
      COALESCE(o.name, 'Unassigned') as organizationname,
      COALESCE(c.location, '') as notes,
      0 as studentcount,
      0 as studentsattendance
     FROM classes c
     JOIN class_types ct ON c.class_type_id = ct.id
     LEFT JOIN organizations o ON o.id = 1
     WHERE c.instructor_id = $1 AND c.status != 'completed'
     ORDER BY c.start_time ASC, c.end_time ASC`,
    [userId]
  );
  console.log('[TRACE] Raw DB result (active):', JSON.stringify(dbResult.rows, null, 2));
  const result = dbResult.rows.map(row => {
    // Extract date from start_time for compatibility
    const date = row.start_time ? new Date(row.start_time).toISOString().split('T')[0] : null;
    return {
      ...row,
      date: date
    };
  });
  console.log('[TRACE] API response data (active):', JSON.stringify(result, null, 2));
  res.json({ success: true, data: result });
});

// Get instructor's completed classes
router.get('/classes/completed', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  const dbResult2 = await pool.query(
    `SELECT 
      c.id,
      c.id as course_id,
      c.instructor_id,
      c.start_time,
      c.end_time,
      c.status,
      c.location,
      c.max_students,
      CASE WHEN c.status = 'completed' THEN true ELSE false END as completed,
      c.created_at,
      c.updated_at,
      ct.name as course_name,
      ct.name as coursetypename,
      COALESCE(o.name, 'Unassigned') as organizationname,
      COALESCE(c.location, '') as notes,
      0 as studentcount,
      0 as studentsattendance
     FROM classes c
     JOIN class_types ct ON c.class_type_id = ct.id
     LEFT JOIN organizations o ON o.id = 1
     WHERE c.instructor_id = $1 AND c.status = 'completed'
     ORDER BY c.start_time DESC, c.end_time DESC`,
    [userId]
  );
  console.log('[TRACE] Raw DB result (completed):', JSON.stringify(dbResult2.rows, null, 2));
  const result2 = dbResult2.rows.map(row => {
    // Extract date from start_time for compatibility
    const date = row.start_time ? new Date(row.start_time).toISOString().split('T')[0] : null;
    return {
      ...row,
      date: date
    };
  });
  console.log('[TRACE] API response data (completed):', JSON.stringify(result2, null, 2));
  res.json({ success: true, data: result2 });
});

// Get instructor's classes for today
router.get('/classes/today', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

  const dbResult3 = await pool.query(
    `SELECT 
      c.id,
      c.id as course_id,
      c.instructor_id,
      c.start_time,
      c.end_time,
      c.status,
      c.location,
      c.max_students,
      CASE WHEN c.status = 'completed' THEN true ELSE false END as completed,
      c.created_at,
      c.updated_at,
      ct.name as course_name,
      ct.name as coursetypename,
      COALESCE(o.name, 'Unassigned') as organizationname,
      COALESCE(c.location, '') as notes,
      0 as studentcount,
      0 as studentsattendance
     FROM classes c
     JOIN class_types ct ON c.class_type_id = ct.id
     LEFT JOIN organizations o ON o.id = 1
     WHERE c.instructor_id = $1 AND DATE(c.start_time) = $2
     ORDER BY c.start_time ASC`,
    [userId, todayStr]
  );
  console.log('[TRACE] Raw DB result (today):', JSON.stringify(dbResult3.rows, null, 2));
  const result3 = dbResult3.rows.map(row => {
    // Extract date from start_time for compatibility
    const date = row.start_time ? new Date(row.start_time).toISOString().split('T')[0] : null;
    return {
      ...row,
      date: date
    };
  });
  console.log('[TRACE] API response data (today):', JSON.stringify(result3, null, 2));
  res.json({ success: true, data: result3 });
});

// Get students for a specific class
router.get('/classes/:classId/students', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  try {
    const { classId } = req.params;
    const result = await pool.query(
      `SELECT u.id as student_id, u.username, u.email, 
              cs.attendance
       FROM class_students cs
       JOIN users u ON cs.student_id = u.id
       WHERE cs.class_id = $1`,
      [classId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching class students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific class details
router.get('/classes/:classId', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  const { classId } = req.params;

  const result = await pool.query(
    `SELECT 
      c.id,
      c.class_type_id,
      c.instructor_id,
      c.start_time,
      c.end_time,
      c.status,
      c.location,
      c.max_students,
      CASE WHEN c.status = 'completed' THEN true ELSE false END as completed,
      c.created_at,
      c.updated_at,
      ct.name as course_name,
      ct.name as coursetypename,
      COALESCE(o.name, 'Unassigned') as organizationname,
      COALESCE(c.location, '') as notes
     FROM classes c
     JOIN class_types ct ON c.class_type_id = ct.id
     LEFT JOIN organizations o ON c.organization_id = o.id
     WHERE c.id = $1 AND c.instructor_id = $2`,
    [classId, userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Class not found or not authorized' });
  }

  res.json({ success: true, data: result.rows[0] });
});

// Update student attendance
router.put('/classes/:classId/students/:studentId/attendance', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const instructorId = req.user.id;
  const { classId, studentId } = req.params;
  const { attended } = req.body;

  if (!instructorId) {
    return res.status(400).json({ error: 'Invalid instructor ID' });
  }

  if (typeof attended !== 'boolean') {
    return res.status(400).json({ error: 'Attended status must be a boolean' });
  }

  console.log('[Debug] Updating attendance for student ID:', studentId, 'class ID:', classId, 'attended:', attended);

  // First verify the class belongs to this instructor
  const classCheck = await pool.query(
    'SELECT id FROM classes WHERE id = $1 AND instructor_id = $2',
    [classId, instructorId]
  );

  if (classCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Class not found or not authorized' });
  }

  // Get course_request_id to update attendance count
  const courseRequestResult = await pool.query(
    `SELECT cr.id as course_request_id
         FROM course_requests cr
         WHERE cr.instructor_id = $1 
           AND DATE(cr.confirmed_date) = (
             SELECT DATE(c.start_time) 
             FROM classes c 
             WHERE c.id = $2 AND c.instructor_id = $1
           )
         LIMIT 1`,
    [instructorId, classId]
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
    return res.status(404).json({ error: 'Student not found' });
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

    const attendedCount = parseInt(attendanceCountResult.rows[0].attended_count);

    console.log('[Debug] Attendance count for course request:', courseRequestId, 'is:', attendedCount);
  }

  const updatedStudent = {
    studentid: result.rows[0].id.toString(),
    firstname: result.rows[0].first_name,
    lastname: result.rows[0].last_name,
    email: result.rows[0].email || '',
    attendance: result.rows[0].attended || false,
    attendanceMarked: result.rows[0].attendance_marked || false,
  };

  res.json({ success: true, data: updatedStudent, message: 'Attendance updated successfully' });
});

// Add students to a class
router.post('/classes/:classId/students', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  const { classId } = req.params;
  const { students } = req.body;

  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: 'Students array is required' });
  }

  // Validate instructor owns the class
  const classResult = await pool.query(
    'SELECT * FROM classes WHERE id = $1 AND instructor_id = $2',
    [classId, userId]
  );
  if (classResult.rows.length === 0) {
    return res.status(403).json({ error: 'Not authorized or class not found' });
  }

  // Find the related course_request (if any)
  const courseRequestResult = await pool.query(
    'SELECT id FROM course_requests WHERE instructor_id = $1 AND confirmed_date::date = (SELECT DATE(start_time) FROM classes WHERE id = $2)',
    [userId, classId]
  );
  const courseRequestId = courseRequestResult.rows[0]?.id;
  if (!courseRequestId) {
    return res.status(400).json({ error: 'No related course request found for this class' });
  }

  // Insert students
  const addedStudents = [];
  for (const student of students) {
    // Check for required fields
    if (!student.first_name || !student.last_name || !student.email) {
      continue; // skip invalid
    }
    // Check if student already exists for this course_request
    const exists = await pool.query(
      'SELECT id FROM course_students WHERE course_request_id = $1 AND email = $2',
      [courseRequestId, student.email]
    );
    if (exists.rows.length > 0) {
      continue; // skip duplicates
    }
    // Insert student
    const insertResult = await pool.query(
      `INSERT INTO course_students (course_request_id, first_name, last_name, email, status, enrolled_at)
       VALUES ($1, $2, $3, $4, 'enrolled', NOW())
       RETURNING id, first_name, last_name, email, status, enrolled_at` ,
      [courseRequestId, student.first_name, student.last_name, student.email]
    );
    addedStudents.push(insertResult.rows[0]);
  }
  res.json({ success: true, data: addedStudents });
});

// Get instructor's schedule
router.get('/schedule', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  const result = await pool.query(
    `SELECT 
      c.id,
      c.id as course_id,
      c.instructor_id,
      c.start_time,
      c.end_time,
      c.status,
      c.location,
      c.max_students,
      CASE WHEN c.status = 'completed' THEN true ELSE false END as completed,
      c.created_at,
      c.updated_at,
      ct.name as course_name,
      ct.name as coursetypename,
      COALESCE(o.name, 'Unassigned') as organizationname,
      COALESCE(c.location, '') as notes,
      0 as studentcount,
      0 as studentsattendance
     FROM classes c
     JOIN class_types ct ON c.class_type_id = ct.id
     LEFT JOIN organizations o ON o.id = 1
     WHERE c.instructor_id = $1
     ORDER BY c.start_time ASC`,
    [userId]
  );
  
  const formattedData = result.rows.map(row => {
    const date = row.start_time ? new Date(row.start_time).toISOString().split('T')[0] : null;
    return {
      ...row,
      date: date
    };
  });
  
  res.json({ success: true, data: formattedData });
});

// Update instructor availability (PUT method)
router.put('/availability', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  const { availability } = req.body;

  if (!Array.isArray(availability)) {
    return res.status(400).json({ error: 'Availability array is required' });
  }

  // Start a transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear existing availability for this instructor
    await client.query(
      'DELETE FROM instructor_availability WHERE instructor_id = $1',
      [userId]
    );

    // Insert new availability
    for (const item of availability) {
      if (item.date && item.status) {
        const dateObj = new Date(item.date);
        if (!isNaN(dateObj.getTime())) {
          await client.query(
            `INSERT INTO instructor_availability (instructor_id, date, status)
             VALUES ($1, $2, $3)`,
            [userId, item.date, item.status]
          );
        }
      }
    }

    await client.query('COMMIT');

    // Return updated availability
    const result = await pool.query(
      `SELECT id, instructor_id, date, status, created_at, updated_at
       FROM instructor_availability
       WHERE instructor_id = $1
       ORDER BY date ASC`,
      [userId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// Update instructor profile
router.put('/profile', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  const { username, email, phone } = req.body;

  const result = await pool.query(
    `UPDATE users 
     SET username = COALESCE($1, username), 
         email = COALESCE($2, email),
         phone = COALESCE($3, phone),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING id, username, email, phone`,
    [username, email, phone, userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ success: true, data: result.rows[0] });
});

// Mark class as completed
router.post('/classes/:classId/complete', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  const { classId } = req.params;
  const { instructor_comments } = req.body;

  // Verify the class belongs to this instructor
  const classCheck = await pool.query(
    'SELECT id, status FROM classes WHERE id = $1 AND instructor_id = $2',
    [classId, userId]
  );

  if (classCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Class not found or not authorized' });
  }

  if (classCheck.rows[0].status === 'completed') {
    return res.status(400).json({ error: 'Class is already completed' });
  }

  // Update class status to completed
  const result = await pool.query(
    `UPDATE classes 
     SET status = 'completed', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND instructor_id = $2
     RETURNING id, status, updated_at`,
    [classId, userId]
  );

  // Update course request if exists
  await pool.query(
    `UPDATE course_requests 
     SET status = 'completed', instructor_comments = COALESCE($1, instructor_comments), updated_at = CURRENT_TIMESTAMP
     WHERE instructor_id = $2 AND confirmed_date::date = (SELECT DATE(start_time) FROM classes WHERE id = $3)`,
    [instructor_comments, userId, classId]
  );

  res.json({ success: true, data: result.rows[0], message: 'Class marked as completed' });
});

// Submit attendance for a class
router.post('/classes/:classId/attendance', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  const { classId } = req.params;
  const { students } = req.body;

  if (!Array.isArray(students)) {
    return res.status(400).json({ error: 'Students array is required' });
  }

  // Verify the class belongs to this instructor
  const classCheck = await pool.query(
    'SELECT id FROM classes WHERE id = $1 AND instructor_id = $2',
    [classId, userId]
  );

  if (classCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Class not found or not authorized' });
  }

  // Get course request ID
  const courseRequestResult = await pool.query(
    'SELECT id FROM course_requests WHERE instructor_id = $1 AND confirmed_date::date = (SELECT DATE(start_time) FROM classes WHERE id = $2)',
    [userId, classId]
  );

  if (courseRequestResult.rows.length === 0) {
    return res.status(400).json({ error: 'No related course request found' });
  }

  const courseRequestId = courseRequestResult.rows[0].id;
  const updatedStudents = [];

  // Update attendance for each student
  for (const student of students) {
    if (student.id && typeof student.attended === 'boolean') {
      const result = await pool.query(
        `UPDATE course_students 
         SET attended = $1, attendance_marked = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND course_request_id = $3
         RETURNING id, first_name, last_name, email, attended, attendance_marked`,
        [student.attended, student.id, courseRequestId]
      );

      if (result.rows.length > 0) {
        updatedStudents.push(result.rows[0]);
      }
    }
  }

  res.json({ success: true, data: updatedStudents, message: 'Attendance submitted successfully' });
});

// Get attendance data
router.get('/attendance', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  const result = await pool.query(
    `SELECT 
      c.id as class_id,
      c.start_time,
      c.end_time,
      c.status,
      ct.name as course_name,
      COUNT(cs.id) as total_students,
      COUNT(CASE WHEN cs.attended = true THEN 1 END) as attended_students,
      COUNT(CASE WHEN cs.attended = false THEN 1 END) as absent_students
     FROM classes c
     JOIN class_types ct ON c.class_type_id = ct.id
     LEFT JOIN course_requests cr ON cr.instructor_id = c.instructor_id 
       AND DATE(cr.confirmed_date) = DATE(c.start_time)
     LEFT JOIN course_students cs ON cs.course_request_id = cr.id
     WHERE c.instructor_id = $1
     GROUP BY c.id, c.start_time, c.end_time, c.status, ct.name
     ORDER BY c.start_time DESC`,
    [userId]
  );

  res.json({ success: true, data: result.rows });
});

// Add notes to classes
router.post('/classes/notes', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  const { classId, notes } = req.body;

  if (!classId || !notes) {
    return res.status(400).json({ error: 'Class ID and notes are required' });
  }

  // Verify the class belongs to this instructor
  const classCheck = await pool.query(
    'SELECT id FROM classes WHERE id = $1 AND instructor_id = $2',
    [classId, userId]
  );

  if (classCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Class not found or not authorized' });
  }

  // Update class with notes
  const result = await pool.query(
    `UPDATE classes 
     SET location = COALESCE(location, '') || ' | Notes: ' || $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND instructor_id = $3
     RETURNING id, location`,
    [notes, classId, userId]
  );

  res.json({ success: true, data: result.rows[0], message: 'Notes added successfully' });
});

export default router;