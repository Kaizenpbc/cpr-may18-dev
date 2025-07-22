import { Pool } from 'pg';
import { pool } from '../config/database.js';

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  read_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationPreference {
  id: number;
  user_id: number;
  type: NotificationType;
  email_enabled: boolean;
  push_enabled: boolean;
  sound_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export type NotificationType = 
  | 'payment_submitted'
  | 'timesheet_submitted'
  | 'invoice_status_change'
  | 'payment_verification_needed'
  | 'payment_verified'
  | 'timesheet_approved'
  | 'invoice_overdue'
  | 'system_alert';

export interface CreateNotificationData {
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export class NotificationService {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationData): Promise<Notification> {
    const { user_id, type, title, message, data: notificationData = {} } = data;
    
    const query = `
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [
      user_id,
      type,
      title,
      message,
      JSON.stringify(notificationData)
    ]);
    
    return result.rows[0];
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: number, 
    limit: number = 50, 
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    let query = `
      SELECT * FROM notifications 
      WHERE user_id = $1
    `;
    
    const params: any[] = [userId];
    
    if (unreadOnly) {
      query += ' AND read_at IS NULL';
    }
    
    query += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    params.push(limit, offset);
    
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: number): Promise<number> {
    const query = `
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE user_id = $1 AND read_at IS NULL
    `;
    
    const result = await this.pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number, userId: number): Promise<boolean> {
    const query = `
      UPDATE notifications 
      SET read_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND user_id = $2
    `;
    
    const result = await this.pool.query(query, [notificationId, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: number): Promise<number> {
    const query = `
      UPDATE notifications 
      SET read_at = NOW(), updated_at = NOW()
      WHERE user_id = $1 AND read_at IS NULL
    `;
    
    const result = await this.pool.query(query, [userId]);
    return result.rowCount ?? 0;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: number, userId: number): Promise<boolean> {
    const query = `
      DELETE FROM notifications 
      WHERE id = $1 AND user_id = $2
    `;
    
    const result = await this.pool.query(query, [notificationId, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get notification preferences for a user
   */
  async getPreferences(userId: number): Promise<NotificationPreference[]> {
    const query = `
      SELECT * FROM notification_preferences 
      WHERE user_id = $1
      ORDER BY type
    `;
    
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: number, 
    type: NotificationType, 
    preferences: Partial<Pick<NotificationPreference, 'email_enabled' | 'push_enabled' | 'sound_enabled'>>
  ): Promise<NotificationPreference> {
    const query = `
      INSERT INTO notification_preferences (user_id, type, email_enabled, push_enabled, sound_enabled)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, type) 
      DO UPDATE SET 
        email_enabled = EXCLUDED.email_enabled,
        push_enabled = EXCLUDED.push_enabled,
        sound_enabled = EXCLUDED.sound_enabled,
        updated_at = NOW()
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [
      userId,
      type,
      preferences.email_enabled ?? true,
      preferences.push_enabled ?? true,
      preferences.sound_enabled ?? true
    ]);
    
    return result.rows[0];
  }

  /**
   * Get all accountant users for bulk notifications
   */
  async getAccountantUsers(): Promise<{ id: number; username: string; email: string }[]> {
    const query = `
      SELECT id, username, email 
      FROM users 
      WHERE role = 'accountant' AND active = true
    `;
    
    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Create notification for all accountants
   */
  async notifyAllAccountants(
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<Notification[]> {
    const accountants = await this.getAccountantUsers();
    const notifications: Notification[] = [];
    
    for (const accountant of accountants) {
      const notification = await this.createNotification({
        user_id: accountant.id,
        type,
        title,
        message,
        data
      });
      notifications.push(notification);
    }
    
    return notifications;
  }

  /**
   * Create payment submitted notification
   */
  async notifyPaymentSubmitted(
    invoiceId: number,
    invoiceNumber: string,
    organizationName: string,
    amount: number
  ): Promise<Notification[]> {
    return this.notifyAllAccountants(
      'payment_submitted',
      'New Payment Submitted',
      `Payment of $${amount.toFixed(2)} submitted for invoice ${invoiceNumber} by ${organizationName}`,
      {
        invoice_id: invoiceId,
        invoice_number: invoiceNumber,
        organization_name: organizationName,
        amount: amount
      }
    );
  }

  /**
   * Create timesheet submitted notification
   */
  async notifyTimesheetSubmitted(
    timesheetId: number,
    instructorName: string,
    courseDate: string
  ): Promise<Notification[]> {
    return this.notifyAllAccountants(
      'timesheet_submitted',
      'New Timesheet Submitted',
      `Timesheet submitted by ${instructorName} for course on ${courseDate}`,
      {
        timesheet_id: timesheetId,
        instructor_name: instructorName,
        course_date: courseDate
      }
    );
  }

  /**
   * Create invoice status change notification
   */
  async notifyInvoiceStatusChange(
    invoiceId: number,
    invoiceNumber: string,
    oldStatus: string,
    newStatus: string
  ): Promise<Notification[]> {
    return this.notifyAllAccountants(
      'invoice_status_change',
      'Invoice Status Updated',
      `Invoice ${invoiceNumber} status changed from ${oldStatus} to ${newStatus}`,
      {
        invoice_id: invoiceId,
        invoice_number: invoiceNumber,
        old_status: oldStatus,
        new_status: newStatus
      }
    );
  }
}

export const notificationService = new NotificationService(); 