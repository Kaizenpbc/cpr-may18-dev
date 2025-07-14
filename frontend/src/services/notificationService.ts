import { api } from './api';

export interface Notification {
  id: number;
  recipient_id: number;
  sender_id?: number;
  sender_name?: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Array<{
    type: string;
    count: number;
  }>;
  recentActivity: Array<{
    date: string;
    count: number;
  }>;
}

export interface SystemNotifications {
  pendingTimesheets: number;
  pendingProfileChanges: number;
  pendingPayments: number;
  recentActivities: Array<{
    type: string;
    message: string;
    timestamp: string;
    user_id: number;
  }>;
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  unread_only?: boolean;
}

export interface NotificationCreation {
  recipient_id: number;
  type: string;
  title: string;
  message: string;
  data?: any;
  sender_id?: number;
}

export interface BulkNotificationCreation {
  recipient_ids: number[];
  type: string;
  title: string;
  message: string;
  data?: any;
}

class NotificationService {
  // Get notifications for current user
  async getNotifications(filters: NotificationFilters = {}): Promise<{
    notifications: Notification[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    unreadCount: number;
  }> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.unread_only) params.append('unread_only', filters.unread_only.toString());

    const response = await api.get(`/notifications?${params.toString()}`);
    return response.data.data;
  }

  // Mark notification as read
  async markAsRead(notificationId: number): Promise<void> {
    await api.put(`/notifications/${notificationId}/read`);
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    await api.put('/notifications/read-all');
  }

  // Delete notification
  async deleteNotification(notificationId: number): Promise<void> {
    await api.delete(`/notifications/${notificationId}`);
  }

  // Create notification (internal use)
  async createNotification(data: NotificationCreation): Promise<Notification> {
    const response = await api.post('/notifications', data);
    return response.data.data;
  }

  // Get system notifications (HR only)
  async getSystemNotifications(): Promise<SystemNotifications> {
    const response = await api.get('/notifications/system');
    return response.data.data;
  }

  // Send bulk notifications (HR only)
  async sendBulkNotifications(data: BulkNotificationCreation): Promise<Notification[]> {
    const response = await api.post('/notifications/bulk', data);
    return response.data.data;
  }

  // Get notification statistics
  async getStats(): Promise<NotificationStats> {
    const response = await api.get('/notifications/stats');
    return response.data.data;
  }

  // Helper method to create timesheet notification
  async notifyTimesheetSubmitted(instructorId: number, timesheetId: number): Promise<void> {
    // Find HR users to notify
    const hrUsers = await this.getHRUsers();
    
    for (const hrUser of hrUsers) {
      await this.createNotification({
        recipient_id: hrUser.id,
        type: 'timesheet_submitted',
        title: 'New Timesheet Submitted',
        message: `A new timesheet has been submitted and requires your approval.`,
        data: {
          timesheet_id: timesheetId,
          instructor_id: instructorId
        }
      });
    }
  }

  // Helper method to create profile change notification
  async notifyProfileChangeSubmitted(userId: number, changeId: number): Promise<void> {
    // Find HR users to notify
    const hrUsers = await this.getHRUsers();
    
    for (const hrUser of hrUsers) {
      await this.createNotification({
        recipient_id: hrUser.id,
        type: 'profile_change_submitted',
        title: 'Profile Change Request',
        message: `A profile change request has been submitted and requires your approval.`,
        data: {
          change_id: changeId,
          user_id: userId
        }
      });
    }
  }

  // Helper method to create payment notification
  async notifyPaymentCreated(instructorId: number, paymentId: number): Promise<void> {
    // Find HR users to notify
    const hrUsers = await this.getHRUsers();
    
    for (const hrUser of hrUsers) {
      await this.createNotification({
        recipient_id: hrUser.id,
        type: 'payment_created',
        title: 'New Payment Created',
        message: `A new payment has been created and requires processing.`,
        data: {
          payment_id: paymentId,
          instructor_id: instructorId
        }
      });
    }
  }

  // Helper method to notify instructor of timesheet approval/rejection
  async notifyTimesheetProcessed(
    instructorId: number, 
    timesheetId: number, 
    action: 'approved' | 'rejected',
    comment?: string
  ): Promise<void> {
    await this.createNotification({
      recipient_id: instructorId,
      type: `timesheet_${action}`,
      title: `Timesheet ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      message: `Your timesheet has been ${action}.${comment ? ` Comment: ${comment}` : ''}`,
      data: {
        timesheet_id: timesheetId,
        action,
        comment
      }
    });
  }

  // Helper method to notify instructor of payment processing
  async notifyPaymentProcessed(
    instructorId: number, 
    paymentId: number, 
    action: 'completed' | 'rejected',
    transactionId?: string
  ): Promise<void> {
    await this.createNotification({
      recipient_id: instructorId,
      type: `payment_${action}`,
      title: `Payment ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      message: `Your payment has been ${action}.${transactionId ? ` Transaction ID: ${transactionId}` : ''}`,
      data: {
        payment_id: paymentId,
        action,
        transaction_id: transactionId
      }
    });
  }

  // Helper method to get HR users (this would need to be implemented based on your user management)
  private async getHRUsers(): Promise<Array<{ id: number; username: string }>> {
    // This is a placeholder - you would need to implement this based on your user management system
    // For now, we'll return an empty array and handle this in the backend
    return [];
  }
}

export const notificationService = new NotificationService(); 