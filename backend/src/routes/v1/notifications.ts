import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { notificationService } from '../../services/NotificationService.js';
import { AppError, errorCodes } from '../../utils/errorHandler.js';

const router = Router();

// Get user notifications
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const { limit = 50, offset = 0, unread_only = false } = req.query;
    
    const notifications = await notificationService.getNotifications(
      user.id,
      parseInt(limit as string),
      parseInt(offset as string),
      unread_only === 'true'
    );
    
    res.json({
      success: true,
      data: notifications
    });
  })
);

// Get unread notification count
router.get(
  '/unread-count',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    
    const count = await notificationService.getUnreadCount(user.id);
    
    res.json({
      success: true,
      data: { count }
    });
  })
);

// Mark notification as read
router.post(
  '/:id/read',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const { id } = req.params;
    
    const success = await notificationService.markAsRead(
      parseInt(id),
      user.id
    );
    
    if (!success) {
      throw new AppError(404, errorCodes.NOTIFICATION_NOT_FOUND, 'Notification not found');
    }
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  })
);

// Mark all notifications as read
router.post(
  '/mark-all-read',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    
    const count = await notificationService.markAllAsRead(user.id);
    
    res.json({
      success: true,
      message: `${count} notifications marked as read`,
      data: { count }
    });
  })
);

// Delete notification
router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const { id } = req.params;
    
    const success = await notificationService.deleteNotification(
      parseInt(id),
      user.id
    );
    
    if (!success) {
      throw new AppError(404, errorCodes.NOTIFICATION_NOT_FOUND, 'Notification not found');
    }
    
    res.json({
      success: true,
      message: 'Notification deleted'
    });
  })
);

// Get notification preferences
router.get(
  '/preferences',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    
    const preferences = await notificationService.getPreferences(user.id);
    
    res.json({
      success: true,
      data: preferences
    });
  })
);

// Update notification preferences
router.put(
  '/preferences/:type',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const { type } = req.params;
    const { email_enabled, push_enabled, sound_enabled } = req.body;
    
    // Validate notification type
    const validTypes = [
      'payment_submitted',
      'timesheet_submitted',
      'invoice_status_change',
      'payment_verification_needed',
      'payment_verified',
      'timesheet_approved',
      'invoice_overdue',
      'system_alert'
    ];
    
    if (!validTypes.includes(type)) {
      throw new AppError(400, errorCodes.INVALID_INPUT, 'Invalid notification type');
    }
    
    const preference = await notificationService.updatePreferences(
      user.id,
      type as any,
      {
        email_enabled,
        push_enabled,
        sound_enabled
      }
    );
    
    res.json({
      success: true,
      data: preference
    });
  })
);

export default router; 