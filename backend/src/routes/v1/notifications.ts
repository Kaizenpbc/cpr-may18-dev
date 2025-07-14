import express from 'express';
import { authenticateToken } from '../../middleware/authMiddleware';
import { asyncHandler } from '../../middleware/asyncHandler';
import { AppError } from '../../utils/errorHandler';
import { pool } from '../../config/database';

const router = express.Router();

// Get Notifications for User
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { page = 1, limit = 20, unread_only = false } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereClause = "WHERE recipient_id = $1";
    let params = [req.user.id];
    let paramIndex = 2;
    
    if (unread_only === 'true') {
      whereClause += ` AND is_read = false`;
    }
    
    // Get notifications
    const notificationsResult = await client.query(`
      SELECT 
        n.*,
        u.username as sender_name
      FROM notifications n
      LEFT JOIN users u ON n.sender_id = u.id
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);
    
    // Get total count for pagination
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM notifications n
      ${whereClause}
    `, params);
    
    // Get unread count
    const unreadCountResult = await client.query(`
      SELECT COUNT(*) as count
      FROM notifications 
      WHERE recipient_id = $1 AND is_read = false
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: {
        notifications: notificationsResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult.rows[0].total,
          pages: Math.ceil(countResult.rows[0].total / Number(limit))
        },
        unreadCount: unreadCountResult.rows[0].count
      }
    });
  } finally {
    client.release();
  }
}));

// Mark Notification as Read
router.put('/:notificationId/read', authenticateToken, asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const client = await pool.connect();
  
  try {
    const updateResult = await client.query(`
      UPDATE notifications 
      SET is_read = true, read_at = NOW()
      WHERE id = $1 AND recipient_id = $2
      RETURNING *
    `, [notificationId, req.user.id]);
    
    if (updateResult.rows.length === 0) {
      throw new AppError('Notification not found.', 404);
    }
    
    res.json({
      success: true,
      message: 'Notification marked as read.'
    });
  } finally {
    client.release();
  }
}));

// Mark All Notifications as Read
router.put('/read-all', authenticateToken, asyncHandler(async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query(`
      UPDATE notifications 
      SET is_read = true, read_at = NOW()
      WHERE recipient_id = $1 AND is_read = false
    `, [req.user.id]);
    
    res.json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } finally {
    client.release();
  }
}));

// Delete Notification
router.delete('/:notificationId', authenticateToken, asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const client = await pool.connect();
  
  try {
    const deleteResult = await client.query(`
      DELETE FROM notifications 
      WHERE id = $1 AND recipient_id = $2
      RETURNING id
    `, [notificationId, req.user.id]);
    
    if (deleteResult.rows.length === 0) {
      throw new AppError('Notification not found.', 404);
    }
    
    res.json({
      success: true,
      message: 'Notification deleted successfully.'
    });
  } finally {
    client.release();
  }
}));

// Create Notification (Internal use)
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const { recipient_id, type, title, message, data, sender_id } = req.body;
  
  if (!recipient_id || !type || !title || !message) {
    throw new AppError('Recipient ID, type, title, and message are required.', 400);
  }
  
  const client = await pool.connect();
  
  try {
    // Check if recipient exists
    const recipientResult = await client.query(`
      SELECT id FROM users WHERE id = $1
    `, [recipient_id]);
    
    if (recipientResult.rows.length === 0) {
      throw new AppError('Recipient not found.', 404);
    }
    
    // Create notification
    const notificationResult = await client.query(`
      INSERT INTO notifications (
        recipient_id, sender_id, type, title, message, 
        data, is_read, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
      RETURNING *
    `, [recipient_id, sender_id || null, type, title, message, data ? JSON.stringify(data) : null]);
    
    res.json({
      success: true,
      message: 'Notification created successfully.',
      data: notificationResult.rows[0]
    });
  } finally {
    client.release();
  }
}));

// Get System Notifications (HR only)
router.get('/system', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'hr') {
    throw new AppError('Access denied. HR role required.', 403);
  }
  
  const client = await pool.connect();
  
  try {
    // Get pending timesheets count
    const pendingTimesheetsResult = await client.query(`
      SELECT COUNT(*) as count FROM timesheets WHERE status = 'pending'
    `);
    
    // Get pending profile changes count
    const pendingProfileChangesResult = await client.query(`
      SELECT COUNT(*) as count FROM profile_changes WHERE status = 'pending'
    `);
    
    // Get pending payments count
    const pendingPaymentsResult = await client.query(`
      SELECT COUNT(*) as count FROM payroll_payments WHERE status = 'pending'
    `);
    
    // Get recent system activities
    const recentActivitiesResult = await client.query(`
      SELECT 
        'timesheet' as type,
        'New timesheet submitted' as message,
        created_at as timestamp,
        instructor_id as user_id
      FROM timesheets 
      WHERE status = 'pending' AND created_at >= NOW() - INTERVAL '7 days'
      UNION ALL
      SELECT 
        'profile_change' as type,
        'Profile change request submitted' as message,
        created_at as timestamp,
        user_id
      FROM profile_changes 
      WHERE status = 'pending' AND created_at >= NOW() - INTERVAL '7 days'
      UNION ALL
      SELECT 
        'payment' as type,
        'New payment created' as message,
        created_at as timestamp,
        instructor_id as user_id
      FROM payroll_payments 
      WHERE status = 'pending' AND created_at >= NOW() - INTERVAL '7 days'
      ORDER BY timestamp DESC
      LIMIT 10
    `);
    
    const systemNotifications = {
      pendingTimesheets: pendingTimesheetsResult.rows[0].count,
      pendingProfileChanges: pendingProfileChangesResult.rows[0].count,
      pendingPayments: pendingPaymentsResult.rows[0].count,
      recentActivities: recentActivitiesResult.rows
    };
    
    res.json({
      success: true,
      data: systemNotifications
    });
  } finally {
    client.release();
  }
}));

// Send Bulk Notifications (HR only)
router.post('/bulk', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'hr') {
    throw new AppError('Access denied. HR role required.', 403);
  }
  
  const { recipient_ids, type, title, message, data } = req.body;
  
  if (!recipient_ids || !Array.isArray(recipient_ids) || !type || !title || !message) {
    throw new AppError('Recipient IDs array, type, title, and message are required.', 400);
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if all recipients exist
    const recipientsResult = await client.query(`
      SELECT id FROM users WHERE id = ANY($1)
    `, [recipient_ids]);
    
    if (recipientsResult.rows.length !== recipient_ids.length) {
      throw new AppError('Some recipients not found.', 400);
    }
    
    // Create notifications for all recipients
    const notifications = [];
    for (const recipientId of recipient_ids) {
      const notificationResult = await client.query(`
        INSERT INTO notifications (
          recipient_id, sender_id, type, title, message, 
          data, is_read, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
        RETURNING *
      `, [recipientId, req.user.id, type, title, message, data ? JSON.stringify(data) : null]);
      
      notifications.push(notificationResult.rows[0]);
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: `Notifications sent to ${notifications.length} recipients.`,
      data: notifications
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

// Get Notification Statistics
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Get total notifications for user
    const totalResult = await client.query(`
      SELECT COUNT(*) as count FROM notifications WHERE recipient_id = $1
    `, [req.user.id]);
    
    // Get unread notifications count
    const unreadResult = await client.query(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE recipient_id = $1 AND is_read = false
    `, [req.user.id]);
    
    // Get notifications by type
    const byTypeResult = await client.query(`
      SELECT type, COUNT(*) as count 
      FROM notifications 
      WHERE recipient_id = $1 
      GROUP BY type
    `, [req.user.id]);
    
    // Get recent notification activity
    const recentResult = await client.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM notifications 
      WHERE recipient_id = $1 
      AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 7
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: {
        total: totalResult.rows[0].count,
        unread: unreadResult.rows[0].count,
        byType: byTypeResult.rows,
        recentActivity: recentResult.rows
      }
    });
  } finally {
    client.release();
  }
}));

export default router; 