import { Pool } from 'pg';
import { pool } from '../config/database.js';

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  category: string;
  link: string | null;
  is_read: boolean;
  read_at: Date | null;
  created_at: Date;
}

export interface CreateNotificationData {
  user_id: number;
  title: string;
  message: string;
  type?: string;  // 'info' | 'success' | 'warning' | 'error'
  category?: string;  // 'course' | 'billing' | 'system' | etc.
  link?: string;
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
    const {
      user_id,
      title,
      message,
      type = 'info',
      category = 'system',
      link = null
    } = data;

    const query = `
      INSERT INTO notifications (user_id, title, message, type, category, link)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      user_id,
      title,
      message,
      type,
      category,
      link
    ]);

    console.log(`📬 [NOTIFICATION] Created for user ${user_id}: ${title}`);
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
      query += ' AND is_read = false';
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
      WHERE user_id = $1 AND is_read = false
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
      SET is_read = true, read_at = NOW()
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
      SET is_read = true, read_at = NOW()
      WHERE user_id = $1 AND is_read = false
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

  // ============================================
  // Course-related notification methods
  // ============================================

  /**
   * Notify instructor when assigned to a course
   */
  async notifyCourseAssignedToInstructor(
    instructorId: number,
    courseName: string,
    courseDate: string,
    organizationName: string,
    location: string,
    courseId: number
  ): Promise<Notification> {
    return this.createNotification({
      user_id: instructorId,
      title: 'New Course Assignment',
      message: `You have been assigned to teach "${courseName}" for ${organizationName} on ${courseDate} at ${location}.`,
      type: 'success',
      category: 'course',
      link: `/instructor/classes`
    });
  }

  /**
   * Notify organization when their course is confirmed
   */
  async notifyCourseConfirmedToOrganization(
    organizationId: number,
    courseName: string,
    courseDate: string,
    instructorName: string,
    courseId: number
  ): Promise<Notification[]> {
    // Get all users belonging to this organization
    const usersResult = await this.pool.query(
      `SELECT id FROM users WHERE organization_id = $1`,
      [organizationId]
    );

    const notifications: Notification[] = [];
    for (const user of usersResult.rows) {
      const notification = await this.createNotification({
        user_id: user.id,
        title: 'Course Confirmed',
        message: `Your "${courseName}" course has been confirmed for ${courseDate}. Instructor: ${instructorName}`,
        type: 'success',
        category: 'course',
        link: `/organization/courses`
      });
      notifications.push(notification);
    }
    return notifications;
  }

  /**
   * Notify instructor when course is completed
   */
  async notifyCourseCompleted(
    instructorId: number,
    courseName: string,
    courseDate: string,
    courseId: number
  ): Promise<Notification> {
    return this.createNotification({
      user_id: instructorId,
      title: 'Course Completed',
      message: `You have successfully completed "${courseName}" on ${courseDate}.`,
      type: 'success',
      category: 'course',
      link: `/instructor/classes`
    });
  }

  /**
   * Notify organization when course is completed
   */
  async notifyCourseCompletedToOrganization(
    organizationId: number,
    courseName: string,
    courseDate: string,
    courseId: number
  ): Promise<Notification[]> {
    const usersResult = await this.pool.query(
      `SELECT id FROM users WHERE organization_id = $1`,
      [organizationId]
    );

    const notifications: Notification[] = [];
    for (const user of usersResult.rows) {
      const notification = await this.createNotification({
        user_id: user.id,
        title: 'Course Completed',
        message: `Your "${courseName}" course on ${courseDate} has been completed. Certificates will be available soon.`,
        type: 'success',
        category: 'course',
        link: `/organization/courses`
      });
      notifications.push(notification);
    }
    return notifications;
  }

  /**
   * Notify instructor when course is cancelled
   */
  async notifyCourseCancelledToInstructor(
    instructorId: number,
    courseName: string,
    courseDate: string,
    reason: string,
    courseId: number
  ): Promise<Notification> {
    return this.createNotification({
      user_id: instructorId,
      title: 'Course Cancelled',
      message: `The "${courseName}" course scheduled for ${courseDate} has been cancelled. Reason: ${reason}`,
      type: 'warning',
      category: 'course',
      link: `/instructor/classes`
    });
  }

  /**
   * Notify organization when course is cancelled
   */
  async notifyCourseCancelledToOrganization(
    organizationId: number,
    courseName: string,
    courseDate: string,
    reason: string,
    courseId: number
  ): Promise<Notification[]> {
    const usersResult = await this.pool.query(
      `SELECT id FROM users WHERE organization_id = $1`,
      [organizationId]
    );

    const notifications: Notification[] = [];
    for (const user of usersResult.rows) {
      const notification = await this.createNotification({
        user_id: user.id,
        title: 'Course Cancelled',
        message: `Your "${courseName}" course scheduled for ${courseDate} has been cancelled. Reason: ${reason}`,
        type: 'warning',
        category: 'course',
        link: `/organization/courses`
      });
      notifications.push(notification);
    }
    return notifications;
  }

  /**
   * Notify admins/courseadmins when new course request is submitted
   */
  async notifyNewCourseRequest(
    organizationName: string,
    courseName: string,
    requestedDate: string,
    courseId: number
  ): Promise<Notification[]> {
    // Get all admin and courseadmin users
    const adminsResult = await this.pool.query(
      `SELECT id FROM users WHERE role IN ('admin', 'courseadmin', 'sysadmin')`
    );

    const notifications: Notification[] = [];
    for (const admin of adminsResult.rows) {
      const notification = await this.createNotification({
        user_id: admin.id,
        title: 'New Course Request',
        message: `${organizationName} has requested a "${courseName}" course for ${requestedDate}.`,
        type: 'info',
        category: 'course',
        link: `/admin/courses`
      });
      notifications.push(notification);
    }
    return notifications;
  }

  // ============================================
  // Payment-related notification methods
  // ============================================

  /**
   * Notify organization when payment is verified
   */
  async notifyPaymentVerified(
    organizationId: number,
    invoiceNumber: string,
    amount: number
  ): Promise<Notification[]> {
    const usersResult = await this.pool.query(
      `SELECT id FROM users WHERE organization_id = $1`,
      [organizationId]
    );

    const notifications: Notification[] = [];
    for (const user of usersResult.rows) {
      const notification = await this.createNotification({
        user_id: user.id,
        title: 'Payment Verified',
        message: `Your payment of $${amount.toFixed(2)} for invoice ${invoiceNumber} has been verified. Thank you!`,
        type: 'success',
        category: 'billing',
        link: `/organization/billing`
      });
      notifications.push(notification);
    }
    return notifications;
  }

  /**
   * Notify organization when invoice is posted
   */
  async notifyInvoicePosted(
    organizationId: number,
    invoiceNumber: string,
    amount: number,
    dueDate: string
  ): Promise<Notification[]> {
    const usersResult = await this.pool.query(
      `SELECT id FROM users WHERE organization_id = $1`,
      [organizationId]
    );

    const notifications: Notification[] = [];
    for (const user of usersResult.rows) {
      const notification = await this.createNotification({
        user_id: user.id,
        title: 'New Invoice',
        message: `Invoice ${invoiceNumber} for $${amount.toFixed(2)} has been posted. Due date: ${dueDate}`,
        type: 'info',
        category: 'billing',
        link: `/organization/billing`
      });
      notifications.push(notification);
    }
    return notifications;
  }
}

export const notificationService = new NotificationService();
