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
    console.log('[DEBUG] Availability query result for user', userId, ':', JSON.stringify(result.rows, null, 2));
    
    // Format dates to YYYY-MM-DD for frontend compatibility
    const formattedData = result.rows.map(row => ({
      ...row,
      date: row.date ? new Date(row.date).toISOString().split('T')[0] : null
    }));
    
    console.log('[DEBUG] Formatted availability data:', JSON.stringify(formattedData, null, 2));
    res.json({ success: true, data: formattedData });
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

// Get instructor's classes (all confirmed course_requests)
router.get('/classes', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  
  // Get confirmed course requests from course_requests table
  const courseRequestsDbResult = await pool.query(
    `SELECT 
      cr.id,
      cr.id as course_id,
      cr.instructor_id,
      cr.confirmed_date as start_time,
      cr.confirmed_date as end_time,
      cr.status,
      cr.location,
      cr.registered_students as max_students,
      CASE WHEN cr.status = 'completed' THEN true ELSE false END as completed,
      cr.created_at,
      cr.updated_at,
      ct.name as course_name,
      ct.name as coursetypename,
      COALESCE(o.name, 'Unassigned') as organizationname,
      COALESCE(cr.location, '') as notes,
      (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as studentcount,
      (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) as studentsattendance
     FROM course_requests cr
     JOIN class_types ct ON cr.course_type_id = ct.id
     LEFT JOIN organizations o ON cr.organization_id = o.id
     WHERE cr.instructor_id = $1 AND cr.status = 'confirmed'
     ORDER BY cr.confirmed_date DESC`,
    [userId]
  );
  
  const allData = courseRequestsDbResult.rows;
  const result = allData.map(row => {
    const date = row.start_time ? new Date(row.start_time).toISOString().split('T')[0] : null;
    return {
      ...row,
      date: date
    };
  });
  res.json({ success: true, data: result });
});

// Get instructor's active classes (confirmed course_requests)
router.get('/classes/active', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  
  const dbResult = await pool.query(
    `SELECT 
      cr.id,
      cr.id as course_id,
      cr.instructor_id,
      cr.confirmed_date as start_time,
      cr.confirmed_date as end_time,
      cr.status,
      cr.location,
      cr.registered_students as max_students,
      CASE WHEN cr.status = 'completed' THEN true ELSE false END as completed,
      cr.created_at,
      cr.updated_at,
      ct.name as course_name,
      ct.name as coursetypename,
      COALESCE(o.name, 'Unassigned') as organizationname,
      COALESCE(cr.location, '') as notes,
      (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as studentcount,
      (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) as studentsattendance
     FROM course_requests cr
     JOIN class_types ct ON cr.course_type_id = ct.id
     LEFT JOIN organizations o ON cr.organization_id = o.id
     WHERE cr.instructor_id = $1 AND cr.status = 'confirmed' AND cr.status != 'completed'
     ORDER BY cr.confirmed_date ASC`,
    [userId]
  );
  
  const result = dbResult.rows.map(row => {
    const date = row.start_time ? new Date(row.start_time).toISOString().split('T')[0] : null;
    return {
      ...row,
      date: date
    };
  });
  res.json({ success: true, data: result });
});

// Get instructor's completed classes (completed course_requests)
router.get('/classes/completed', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  
  const dbResult2 = await pool.query(
    `SELECT 
      cr.id,
      cr.id as course_id,
      cr.instructor_id,
      cr.confirmed_date as start_time,
      cr.confirmed_date as end_time,
      cr.status,
      cr.location,
      cr.registered_students as max_students,
      CASE WHEN cr.status = 'completed' THEN true ELSE false END as completed,
      cr.created_at,
      cr.updated_at,
      ct.name as course_name,
      ct.name as coursetypename,
      COALESCE(o.name, 'Unassigned') as organizationname,
      COALESCE(cr.location, '') as notes,
      (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as studentcount,
      (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) as studentsattendance
     FROM course_requests cr
     JOIN class_types ct ON cr.course_type_id = ct.id
     LEFT JOIN organizations o ON cr.organization_id = o.id
     WHERE cr.instructor_id = $1 AND cr.status = 'completed'
     ORDER BY cr.confirmed_date DESC`,
    [userId]
  );
  
  const result2 = dbResult2.rows.map(row => {
    const date = row.start_time ? new Date(row.start_time).toISOString().split('T')[0] : null;
    return {
      ...row,
      date: date
    };
  });
  res.json({ success: true, data: result2 });
});

// Get instructor's classes for today (use only course_requests)
router.get('/classes/today', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  
  // Use database current date to avoid timezone issues
  const currentDateResult = await pool.query('SELECT CURRENT_DATE as current_date');
  const todayStr = currentDateResult.rows[0].current_date.toISOString().split('T')[0]; // YYYY-MM-DD format

  // Get confirmed course requests from course_requests table for today with actual student counts
  const courseRequestsDbResult = await pool.query(
    `SELECT 
      cr.id,
      cr.id as course_id,
      cr.instructor_id,
      cr.confirmed_date as start_time,
      cr.confirmed_date as end_time,
      cr.status,
      cr.location,
      cr.registered_students as max_students,
      CASE WHEN cr.status = 'completed' THEN true ELSE false END as completed,
      cr.created_at,
      cr.updated_at,
      ct.name as course_name,
      ct.name as coursetypename,
      COALESCE(o.name, 'Unassigned') as organizationname,
      COALESCE(cr.location, '') as notes,
      (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as studentcount,
      (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) as studentsattendance
     FROM course_requests cr
     JOIN class_types ct ON cr.course_type_id = ct.id
     LEFT JOIN organizations o ON cr.organization_id = o.id
     WHERE cr.instructor_id = $1 AND cr.status = 'confirmed' AND cr.confirmed_date::date = $2::date
     ORDER BY cr.confirmed_date ASC`,
    [userId, todayStr]
  );
  
  // Use only course_requests data
  const allData = courseRequestsDbResult.rows;
  
  console.log('[TRACE] Raw DB result (today):', JSON.stringify(allData, null, 2));
  const result3 = allData.map(row => {
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

// Get instructor's schedule (all confirmed course_requests)
router.get('/schedule', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  const courseRequestsDbResult = await pool.query(
    `SELECT 
      cr.id,
      cr.id as course_id,
      cr.instructor_id,
      cr.confirmed_date as start_time,
      cr.confirmed_date as end_time,
      cr.status,
      cr.location,
      cr.registered_students as max_students,
      CASE WHEN cr.status = 'completed' THEN true ELSE false END as completed,
      cr.created_at,
      cr.updated_at,
      ct.name as course_name,
      ct.name as coursetypename,
      COALESCE(o.name, 'Unassigned') as organizationname,
      COALESCE(cr.location, '') as notes,
      (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as studentcount,
      (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) as studentsattendance
     FROM course_requests cr
     JOIN class_types ct ON cr.course_type_id = ct.id
     LEFT JOIN organizations o ON cr.organization_id = o.id
     WHERE cr.instructor_id = $1 AND cr.status = 'confirmed'
     ORDER BY cr.confirmed_date ASC`,
    [userId]
  );
  const allData = courseRequestsDbResult.rows;
  const formattedData = allData.map(row => {
    const date = row.start_time ? new Date(row.start_time).toISOString().split('T')[0] : null;
    return {
      ...row,
      date: date
    };
  });
  res.json({ success: true, data: formattedData });
});

// Get students for a specific class
router.get('/classes/:classId/students', authenticateToken, requireRole(['instructor']), async (req, res) => {
  if (!req.user) {
    throw new AppError(401, errorCodes.AUTH_TOKEN_INVALID, 'User not authenticated');
  }
  const userId = req.user.id;
  try {
    const { classId } = req.params;
    
    // The frontend is sending course_request_id as classId, so use it directly
    const courseRequestId = classId;
    
    // Verify this course request belongs to the instructor
    const courseRequestCheck = await pool.query(
      `SELECT id FROM course_requests 
       WHERE id = $1 AND instructor_id = $2`,
      [courseRequestId, userId]
    );

    if (courseRequestCheck.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Now get students from course_students table
    const result = await pool.query(
      `SELECT 
         cs.id,
         cs.first_name,
         cs.last_name,
         cs.email,
         cs.attended,
         cs.attendance_marked
       FROM course_students cs
       WHERE cs.course_request_id = $1
       ORDER BY cs.first_name, cs.last_name`,
      [courseRequestId]
    );

    // Transform the data to match frontend expectations
    const students = result.rows.map(row => ({
      studentid: row.id.toString(),
      firstname: row.first_name,
      lastname: row.last_name,
      email: row.email || '',
      attendance: row.attended || false,
      attendanceMarked: row.attendance_marked || false,
    }));

    console.log('[Debug] Students loaded for course_request:', courseRequestId, 'count:', students.length);
    res.json({ success: true, data: students });
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

  console.log('[Debug] Updating attendance for student ID:', studentId, 'course_request ID:', classId, 'attended:', attended);

  // The frontend is sending course_request_id as classId, so verify it belongs to this instructor
  const courseRequestCheck = await pool.query(
    'SELECT id FROM course_requests WHERE id = $1 AND instructor_id = $2',
    [classId, instructorId]
  );

  if (courseRequestCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Course request not found or not authorized' });
  }

  // Update student attendance directly in course_students table
  const result = await pool.query(
    `UPDATE course_students 
         SET attended = $1, attendance_marked = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND course_request_id = $3
         RETURNING id, first_name, last_name, email, attendance_marked, attended`,
    [attended, studentId, classId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Student not found' });
  }

  // Count the number of students who attended for this course request
  const attendanceCountResult = await pool.query(
    `SELECT COUNT(*) as attended_count
         FROM course_students
         WHERE course_request_id = $1 AND attended = true`,
    [classId]
  );

  const attendedCount = parseInt(attendanceCountResult.rows[0].attended_count);
  console.log('[Debug] Attendance count for course request:', classId, 'is:', attendedCount);

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
  const { firstName, lastName, email } = req.body; // Frontend sends single student object

  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'First name and last name are required' });
  }

  // The frontend is sending course_request_id as classId, so use it directly
  const courseRequestId = classId;
  
  // Verify this course request belongs to the instructor
  const courseRequestCheck = await pool.query(
    'SELECT id FROM course_requests WHERE id = $1 AND instructor_id = $2',
    [courseRequestId, userId]
  );
  
  if (courseRequestCheck.rows.length === 0) {
    return res.status(403).json({ error: 'Not authorized or course request not found' });
  }

  try {
    // Check if student already exists for this course_request
    const exists = await pool.query(
      'SELECT id FROM course_students WHERE course_request_id = $1 AND email = $2',
      [courseRequestId, email]
    );
    
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Student with this email already exists for this course' });
    }
    
    // Insert student
    const insertResult = await pool.query(
      `INSERT INTO course_students (course_request_id, first_name, last_name, email, status, enrolled_at)
       VALUES ($1, $2, $3, $4, 'enrolled', NOW())
       RETURNING id, first_name, last_name, email, status, enrolled_at`,
      [courseRequestId, firstName, lastName, email || null]
    );
    
    // Transform the response to match frontend expectations
    const addedStudent = {
      studentid: insertResult.rows[0].id.toString(),
      firstname: insertResult.rows[0].first_name,
      lastname: insertResult.rows[0].last_name,
      email: insertResult.rows[0].email || '',
      attendance: false,
      attendanceMarked: false,
    };
    
    console.log('[Debug] Student added to course_request:', courseRequestId, 'student:', addedStudent);
    res.json({ success: true, data: addedStudent });
  } catch (error) {
    console.error('Error adding student:', error);
    res.status(500).json({ error: 'Failed to add student' });
  }
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

  // The frontend is sending course_request_id as classId, so use it directly
  const courseRequestId = classId;
  
  // Verify this course request belongs to the instructor
  const courseRequestCheck = await pool.query(
    'SELECT id, status FROM course_requests WHERE id = $1 AND instructor_id = $2',
    [courseRequestId, userId]
  );

  if (courseRequestCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Course request not found or not authorized' });
  }

  if (courseRequestCheck.rows[0].status === 'completed') {
    return res.status(400).json({ error: 'Class is already completed' });
  }

  // Update course request status to completed
  const result = await pool.query(
    `UPDATE course_requests 
     SET status = 'completed', 
         instructor_comments = COALESCE($1, instructor_comments), 
         completed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND instructor_id = $3
     RETURNING id, status, completed_at, updated_at`,
    [instructor_comments, courseRequestId, userId]
  );

  // Also update the corresponding class if it exists
  await pool.query(
    `UPDATE classes 
     SET status = 'completed', updated_at = CURRENT_TIMESTAMP
     WHERE instructor_id = $1 AND DATE(start_time) = (SELECT DATE(confirmed_date) FROM course_requests WHERE id = $2)`,
    [userId, courseRequestId]
  );

  // Emit real-time update event
  const io = req.app.get('io');
  if (io) {
    io.emit('courseStatusChanged', {
      type: 'course_completed',
      courseId: courseRequestId,
      instructorId: userId,
      status: 'completed',
      timestamp: new Date().toISOString()
    });
    console.log('📡 [WEBSOCKET] Emitted course completion event for course:', courseRequestId);
  }

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