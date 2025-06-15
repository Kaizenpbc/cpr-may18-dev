import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { format } from 'date-fns';
import pool from '../config/database';

const router = express.Router();

// Get instructor's schedule (alias for /classes)
router.get('/schedule', authenticateToken, async (req, res) => {
    try {
        const instructorId = req.user?.userId;
        const result = await pool.query(
            `SELECT 
                c.id as course_id,
                c.date as datescheduled,
                c.completed,
                o.name as organizationname,
                ct.name as coursetypename,
                c.location,
                COUNT(s.id) as studentcount,
                COUNT(CASE WHEN s.attendance = true THEN 1 END) as studentsattendance
            FROM classes c
            LEFT JOIN organizations o ON c.organization_id = o.id
            LEFT JOIN course_types ct ON c.course_type_id = ct.id
            LEFT JOIN students s ON c.id = s.class_id
            WHERE c.instructor_id = $1 AND c.date >= CURRENT_DATE
            GROUP BY c.id, o.name, ct.name
            ORDER BY c.date, c.start_time`,
            [instructorId]
        );
        
        res.json({
            success: true,
            data: result.rows.map(row => ({
                course_id: row.course_id,
                datescheduled: format(row.datescheduled, 'yyyy-MM-dd'),
                completed: row.completed,
                organizationname: row.organizationname,
                coursetypename: row.coursetypename,
                location: row.location,
                studentcount: parseInt(row.studentcount),
                studentsattendance: parseInt(row.studentsattendance)
            }))
        });
    } catch (error) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch schedule' });
    }
});

// Get instructor's classes
router.get('/classes', authenticateToken, async (req, res) => {
    try {
        const instructorId = req.user?.userId;
        const result = await pool.query(
            `SELECT 
                c.id as course_id,
                c.date as datescheduled,
                c.completed,
                o.name as organizationname,
                ct.name as coursetypename,
                c.location,
                COUNT(s.id) as studentcount,
                COUNT(CASE WHEN s.attendance = true THEN 1 END) as studentsattendance
            FROM classes c
            LEFT JOIN organizations o ON c.organization_id = o.id
            LEFT JOIN course_types ct ON c.course_type_id = ct.id
            LEFT JOIN students s ON c.id = s.class_id
            WHERE c.instructor_id = $1 AND c.date >= CURRENT_DATE
            GROUP BY c.id, o.name, ct.name
            ORDER BY c.date, c.start_time`,
            [instructorId]
        );
        
        res.json({
            success: true,
            data: result.rows.map(row => ({
                course_id: row.course_id,
                datescheduled: format(row.datescheduled, 'yyyy-MM-dd'),
                completed: row.completed,
                organizationname: row.organizationname,
                coursetypename: row.coursetypename,
                location: row.location,
                studentcount: parseInt(row.studentcount),
                studentsattendance: parseInt(row.studentsattendance)
            }))
        });
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch classes' });
    }
});

// Get instructor's completed classes
router.get('/classes/completed', authenticateToken, async (req, res) => {
    try {
        const instructorId = req.user?.userId;
        const result = await pool.query(
            `SELECT 
                c.id as course_id,
                c.date as datescheduled,
                c.completed,
                o.name as organizationname,
                ct.name as coursetypename,
                c.location,
                COUNT(s.id) as studentcount,
                COUNT(CASE WHEN s.attendance = true THEN 1 END) as studentsattendance
            FROM classes c
            LEFT JOIN organizations o ON c.organization_id = o.id
            LEFT JOIN course_types ct ON c.course_type_id = ct.id
            LEFT JOIN students s ON c.id = s.class_id
            WHERE c.instructor_id = $1 AND c.completed = true
            GROUP BY c.id, o.name, ct.name
            ORDER BY c.date DESC, c.start_time`,
            [instructorId]
        );
        
        res.json({
            success: true,
            data: result.rows.map(row => ({
                course_id: row.course_id,
                datescheduled: format(row.datescheduled, 'yyyy-MM-dd'),
                completed: row.completed,
                organizationname: row.organizationname,
                coursetypename: row.coursetypename,
                location: row.location,
                studentcount: parseInt(row.studentcount),
                studentsattendance: parseInt(row.studentsattendance)
            }))
        });
    } catch (error) {
        console.error('Error fetching completed classes:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch completed classes' });
    }
});

// Get instructor's upcoming classes
router.get('/classes/upcoming', authenticateToken, async (req, res) => {
    try {
        const instructorId = req.user?.userId;
        const result = await pool.query(
            `SELECT 
                c.id as course_id,
                c.date as datescheduled,
                c.completed,
                o.name as organizationname,
                ct.name as coursetypename,
                c.location,
                COUNT(s.id) as studentcount,
                COUNT(CASE WHEN s.attendance = true THEN 1 END) as studentsattendance
            FROM classes c
            LEFT JOIN organizations o ON c.organization_id = o.id
            LEFT JOIN course_types ct ON c.course_type_id = ct.id
            LEFT JOIN students s ON c.id = s.class_id
            WHERE c.instructor_id = $1 AND c.date >= CURRENT_DATE
            GROUP BY c.id, o.name, ct.name
            ORDER BY c.date, c.start_time
            LIMIT 5`,
            [instructorId]
        );
        
        res.json({
            success: true,
            data: result.rows.map(row => ({
                course_id: row.course_id,
                datescheduled: format(row.datescheduled, 'yyyy-MM-dd'),
                completed: row.completed,
                organizationname: row.organizationname,
                coursetypename: row.coursetypename,
                location: row.location,
                studentcount: parseInt(row.studentcount),
                studentsattendance: parseInt(row.studentsattendance)
            }))
        });
    } catch (error) {
        console.error('Error fetching upcoming classes:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch upcoming classes' });
    }
});

// Get instructor's today's classes
router.get('/classes/today', authenticateToken, async (req, res) => {
    try {
        const instructorId = req.user?.userId;
        const result = await pool.query(
            `SELECT 
                c.id as course_id,
                c.date as datescheduled,
                c.completed,
                o.name as organizationname,
                ct.name as coursetypename,
                c.location,
                COUNT(s.id) as studentcount,
                COUNT(CASE WHEN s.attendance = true THEN 1 END) as studentsattendance
            FROM classes c
            LEFT JOIN organizations o ON c.organization_id = o.id
            LEFT JOIN course_types ct ON c.course_type_id = ct.id
            LEFT JOIN students s ON c.id = s.class_id
            WHERE c.instructor_id = $1 AND c.date = CURRENT_DATE
            GROUP BY c.id, o.name, ct.name
            ORDER BY c.start_time`,
            [instructorId]
        );
        
        res.json({
            success: true,
            data: result.rows.map(row => ({
                course_id: row.course_id,
                datescheduled: format(row.datescheduled, 'yyyy-MM-dd'),
                completed: row.completed,
                organizationname: row.organizationname,
                coursetypename: row.coursetypename,
                location: row.location,
                studentcount: parseInt(row.studentcount),
                studentsattendance: parseInt(row.studentsattendance)
            }))
        });
    } catch (error) {
        console.error('Error fetching today\'s classes:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch today\'s classes' });
    }
});

// Get instructor availability
router.get('/availability', authenticateToken, async (req, res) => {
    try {
        const instructorId = req.user?.userId;
        const result = await pool.query(
            'SELECT date FROM instructor_availability WHERE instructor_id = $1 AND date >= CURRENT_DATE ORDER BY date',
            [instructorId]
        );
        
        res.json({
            success: true,
            data: result.rows.map(row => ({
                date: format(row.date, 'yyyy-MM-dd'),
                instructorId: instructorId
            }))
        });
    } catch (error) {
        console.error('Error fetching availability:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch availability' });
    }
});

// Add availability date
router.post('/availability', authenticateToken, async (req, res) => {
    try {
        const instructorId = req.user?.userId;
        const { date } = req.body;

        if (!date) {
            return res.status(400).json({ success: false, message: 'Date is required' });
        }

        await pool.query(
            'INSERT INTO instructor_availability (instructor_id, date) VALUES ($1, $2)',
            [instructorId, date]
        );

        res.json({ success: true, message: 'Availability added successfully' });
    } catch (error) {
        console.error('Error adding availability:', error);
        res.status(500).json({ success: false, message: 'Failed to add availability' });
    }
});

// Remove availability date
router.delete('/availability/:date', authenticateToken, async (req, res) => {
    try {
        const instructorId = req.user?.userId;
        const { date } = req.params;

        await pool.query(
            'DELETE FROM instructor_availability WHERE instructor_id = $1 AND date = $2',
            [instructorId, date]
        );

        res.json({ success: true, message: 'Availability removed successfully' });
    } catch (error) {
        console.error('Error removing availability:', error);
        res.status(500).json({ success: false, message: 'Failed to remove availability' });
    }
});

export default router; 