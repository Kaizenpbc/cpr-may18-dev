import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Badge,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsNone as NotificationsNoneIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { notificationService, Notification, SystemNotifications, NotificationFilters } from '../../services/notificationService';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (notificationId: number) => void;
  onDelete: (notificationId: number) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete
}) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'timesheet_submitted':
      case 'timesheet_approved':
      case 'timesheet_rejected':
        return <InfoIcon color="primary" />;
      case 'profile_change_submitted':
        return <WarningIcon color="warning" />;
      case 'payment_created':
      case 'payment_completed':
      case 'payment_rejected':
        return <CheckCircleIcon color="success" />;
      default:
        return <NotificationsIcon color="action" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'timesheet_submitted':
      case 'profile_change_submitted':
      case 'payment_created':
        return 'warning';
      case 'timesheet_approved':
      case 'payment_completed':
        return 'success';
      case 'timesheet_rejected':
      case 'payment_rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <ListItem
      sx={{
        backgroundColor: notification.isRead ? 'transparent' : 'action.hover',
        borderLeft: `4px solid ${
          notification.isRead ? 'transparent' : 'primary.main'
        }`,
        mb: 1
      }}
    >
      <ListItemIcon>
        {getNotificationIcon(notification.type)}
      </ListItemIcon>
      <ListItemText
        primary={
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body1" fontWeight={notification.isRead ? 'normal' : 'bold'}>
              {notification.title}
            </Typography>
            <Chip 
              label={notification.type.replace(/_/g, ' ').toUpperCase()} 
              color={getNotificationColor(notification.type) as any}
              size="small"
            />
          </Box>
        }
        secondary={
          <Box>
            <Typography variant="body2" color="textSecondary">
              {notification.message}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {new Date(notification.createdAt).toLocaleString()}
            </Typography>
            {notification.senderName && (
              <Typography variant="caption" color="textSecondary" display="block">
                From: {notification.senderName}
              </Typography>
            )}
          </Box>
        }
      />
      <Box>
        {!notification.isRead && (
          <Tooltip title="Mark as Read">
            <IconButton
              size="small"
              onClick={() => onMarkAsRead(notification.id)}
            >
              <CheckCircleIcon />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Delete">
          <IconButton
            size="small"
            onClick={() => onDelete(notification.id)}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </ListItem>
  );
};

interface SendNotificationDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (recipientIds: number[], type: string, title: string, message: string) => void;
}

const SendNotificationDialog: React.FC<SendNotificationDialogProps> = ({
  open,
  onClose,
  onSend
}) => {
  const [recipientIds, setRecipientIds] = useState<string>('');
  const [type, setType] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!recipientIds || !type || !title || !message) return;
    
    setLoading(true);
    try {
      const ids = recipientIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      await onSend(ids, type, title, message);
      onClose();
      setRecipientIds('');
      setType('');
      setTitle('');
      setMessage('');
    } catch (error) {
      console.error('Error sending notification:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setRecipientIds('');
    setType('');
    setTitle('');
    setMessage('');
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Send Notification
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Recipient IDs (comma-separated)"
              value={recipientIds}
              onChange={(e) => setRecipientIds(e.target.value)}
              placeholder="1, 2, 3"
              required
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={type}
                onChange={(e) => setType(e.target.value)}
                label="Type"
                required
              >
                <MenuItem value="timesheet_submitted">Timesheet Submitted</MenuItem>
                <MenuItem value="profile_change_submitted">Profile Change Submitted</MenuItem>
                <MenuItem value="payment_created">Payment Created</MenuItem>
                <MenuItem value="timesheet_approved">Timesheet Approved</MenuItem>
                <MenuItem value="timesheet_rejected">Timesheet Rejected</MenuItem>
                <MenuItem value="payment_completed">Payment Completed</MenuItem>
                <MenuItem value="payment_rejected">Payment Rejected</MenuItem>
                <MenuItem value="system">System Notification</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !recipientIds || !type || !title || !message}
          startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
        >
          Send
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const NotificationsPanel: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<SystemNotifications | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [filters, setFilters] = useState<NotificationFilters>({
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [unreadCount, setUnreadCount] = useState(0);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [notificationsData, systemData, statsData] = await Promise.all([
        notificationService.getNotifications(filters),
        notificationService.getSystemNotifications(),
        notificationService.getStats()
      ]);
      
      setNotifications(notificationsData.notifications);
      setPagination(notificationsData.pagination);
      setUnreadCount(notificationsData.unreadCount);
      setSystemNotifications(systemData);
      setStats(statsData);
    } catch (err) {
      setError('Failed to load notification data');
      console.error('Error loading notification data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleFilterChange = (newFilters: Partial<NotificationFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationService.markAsRead(notificationId);
      await loadData(); // Refresh data
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    try {
      await notificationService.deleteNotification(notificationId);
      await loadData(); // Refresh data
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      await loadData(); // Refresh data
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleSendNotification = async (recipientIds: number[], type: string, title: string, message: string) => {
    try {
      await notificationService.sendBulkNotifications({
        recipient_ids: recipientIds,
        type,
        title,
        message
      });
      await loadData(); // Refresh data
    } catch (err) {
      console.error('Error sending notification:', err);
      throw err;
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Notifications
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Notifications
                </Typography>
                <Typography variant="h4">
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Unread Notifications
                </Typography>
                <Typography variant="h4">
                  {stats.unread}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Pending Timesheets
                </Typography>
                <Typography variant="h4">
                  {systemNotifications?.pendingTimesheets || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Pending Payments
                </Typography>
                <Typography variant="h4">
                  {systemNotifications?.pendingPayments || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Action Buttons */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={() => setSendDialogOpen(true)}
          sx={{ mr: 2 }}
        >
          Send Notification
        </Button>
        <Button
          variant="outlined"
          startIcon={<CheckCircleIcon />}
          onClick={handleMarkAllAsRead}
          disabled={unreadCount === 0}
          sx={{ mr: 2 }}
        >
          Mark All as Read
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* System Notifications */}
      {systemNotifications && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">
              System Overview
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">
                  Pending Timesheets
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {systemNotifications.pendingTimesheets}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">
                  Pending Profile Changes
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {systemNotifications.pendingProfileChanges}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">
                  Pending Payments
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {systemNotifications.pendingPayments}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Recent Activities
                </Typography>
                <List dense>
                  {systemNotifications.recentActivities.map((activity, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <InfoIcon color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={activity.message}
                        secondary={new Date(activity.timestamp).toLocaleString()}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Show</InputLabel>
              <Select
                value={filters.unreadOnly ? 'true' : 'false'}
                onChange={(e) => handleFilterChange({ unreadOnly: e.target.value === 'true' })}
                label="Show"
              >
                <MenuItem value="false">All Notifications</MenuItem>
                <MenuItem value="true">Unread Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Notifications List */}
      <Paper>
        <List>
          {notifications.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="No notifications found"
                secondary="You're all caught up!"
              />
            </ListItem>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDeleteNotification}
              />
            ))
          )}
        </List>
      </Paper>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <Box display="flex" justifyContent="center" mt={2}>
          <Pagination
            count={pagination.pages}
            page={pagination.page}
            onChange={(_, page) => handlePageChange(page)}
            color="primary"
          />
        </Box>
      )}

      {/* Send Notification Dialog */}
      <SendNotificationDialog
        open={sendDialogOpen}
        onClose={() => setSendDialogOpen(false)}
        onSend={handleSendNotification}
      />
    </Box>
  );
};

export default NotificationsPanel; 