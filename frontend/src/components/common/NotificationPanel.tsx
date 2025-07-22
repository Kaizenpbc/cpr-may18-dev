import React, { useState } from 'react';
import {
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Button,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  DoneAll as DoneAllIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNotifications, Notification, NotificationType } from '../../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  anchorEl?: HTMLElement | null;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ 
  open, 
  onClose, 
  anchorEl 
}) => {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    error,
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    refreshNotifications 
  } = useNotifications();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleMarkAsRead = async (notificationId: number) => {
    await markAsRead(notificationId);
  };

  const handleDelete = async (notificationId: number) => {
    setDeletingId(notificationId);
    try {
      await deleteNotification(notificationId);
    } finally {
      setDeletingId(null);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'payment_submitted':
      case 'payment_verified':
        return <PaymentIcon color="primary" />;
      case 'invoice_status_change':
      case 'invoice_overdue':
        return <ReceiptIcon color="warning" />;
      case 'timesheet_submitted':
      case 'timesheet_approved':
        return <ScheduleIcon color="info" />;
      case 'payment_verification_needed':
        return <CheckCircleIcon color="success" />;
      case 'system_alert':
        return <WarningIcon color="error" />;
      default:
        return <InfoIcon color="action" />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'payment_submitted':
      case 'payment_verified':
        return 'primary';
      case 'invoice_overdue':
      case 'system_alert':
        return 'error';
      case 'payment_verification_needed':
        return 'success';
      case 'timesheet_submitted':
      case 'timesheet_approved':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatNotificationTime = (date: Date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read_at);
  const readNotifications = notifications.filter(n => n.read_at);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      PaperProps={{
        sx: {
          width: 400,
          maxHeight: 600,
          mt: 1,
        },
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="h2">
            Notifications
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh">
              <IconButton 
                size="small" 
                onClick={refreshNotifications}
                disabled={isLoading}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Close">
              <IconButton size="small" onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        {unreadCount > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </Typography>
            <Button
              size="small"
              startIcon={<DoneAllIcon />}
              onClick={markAllAsRead}
              disabled={isLoading}
            >
              Mark all read
            </Button>
          </Box>
        )}
      </Box>

      <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ m: 1 }}>
            {error}
          </Alert>
        )}

        {!isLoading && notifications.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </Box>
        )}

        {!isLoading && unreadNotifications.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ p: 1, px: 2, bgcolor: 'grey.50' }}>
              Unread
            </Typography>
            <List dense>
              {unreadNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  deletingId={deletingId}
                  getNotificationIcon={getNotificationIcon}
                  getNotificationColor={getNotificationColor}
                  formatNotificationTime={formatNotificationTime}
                />
              ))}
            </List>
          </>
        )}

        {!isLoading && readNotifications.length > 0 && (
          <>
            <Divider />
            <Typography variant="subtitle2" sx={{ p: 1, px: 2, bgcolor: 'grey.50' }}>
              Read
            </Typography>
            <List dense>
              {readNotifications.slice(0, 5).map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  deletingId={deletingId}
                  getNotificationIcon={getNotificationIcon}
                  getNotificationColor={getNotificationColor}
                  formatNotificationTime={formatNotificationTime}
                  isRead
                />
              ))}
            </List>
          </>
        )}
      </Box>
    </Popover>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  deletingId: number | null;
  getNotificationIcon: (type: NotificationType) => React.ReactNode;
  getNotificationColor: (type: NotificationType) => string;
  formatNotificationTime: (date: Date) => string;
  isRead?: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  deletingId,
  getNotificationIcon,
  getNotificationColor,
  formatNotificationTime,
  isRead = false,
}) => {
  const isDeleting = deletingId === notification.id;

  return (
    <ListItem
      sx={{
        opacity: isRead ? 0.7 : 1,
        bgcolor: isRead ? 'transparent' : 'action.hover',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 40 }}>
        {getNotificationIcon(notification.type)}
      </ListItemIcon>
      
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="body2" sx={{ fontWeight: isRead ? 'normal' : 'bold' }}>
              {notification.title}
            </Typography>
            <Chip
              label={notification.type.replace('_', ' ')}
              size="small"
              color={getNotificationColor(notification.type) as any}
              sx={{ ml: 1, fontSize: '0.7rem' }}
            />
          </Box>
        }
        secondary={
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {notification.message}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatNotificationTime(notification.created_at)}
            </Typography>
          </Box>
        }
      />
      
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {!isRead && (
          <Tooltip title="Mark as read">
            <IconButton
              size="small"
              onClick={() => onMarkAsRead(notification.id)}
              disabled={isDeleting}
            >
              <CheckCircleIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Delete">
          <IconButton
            size="small"
            onClick={() => onDelete(notification.id)}
            disabled={isDeleting}
            color="error"
          >
            {isDeleting ? (
              <CircularProgress size={16} />
            ) : (
              <DeleteIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </Box>
    </ListItem>
  );
};

export default NotificationPanel; 