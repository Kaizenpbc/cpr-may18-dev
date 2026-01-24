import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Tooltip,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
} from '@mui/icons-material';
import { useNotifications } from '../../contexts/NotificationContext';
import NotificationPanel from './NotificationPanel';

interface NotificationBellProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'default' | 'inherit';
}

const NotificationBell: React.FC<NotificationBellProps> = ({ 
  size = 'medium', 
  color = 'primary' 
}) => {
  const { unreadCount, isLoading } = useNotifications();
  const [panelOpen, setPanelOpen] = useState(false);

  const handleClick = () => {
    setPanelOpen(true);
  };

  const handleClose = () => {
    setPanelOpen(false);
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 20;
      case 'large': return 28;
      default: return 24;
    }
  };

  const getBadgeSize = () => {
    switch (size) {
      case 'small': return 'small';
      case 'large': return 'large';
      default: return 'medium';
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Tooltip title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'No new notifications'}>
        <IconButton
          onClick={handleClick}
          color={color}
          size={size}
          sx={{
            position: 'relative',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.04)',
            },
          }}
        >
          {isLoading ? (
            <CircularProgress size={getIconSize()} />
          ) : unreadCount > 0 ? (
            <Badge
              badgeContent={unreadCount > 99 ? '99+' : unreadCount}
              color="error"
              max={99}
            >
              <NotificationsIcon sx={{ fontSize: getIconSize() }} />
            </Badge>
          ) : (
            <NotificationsNoneIcon sx={{ fontSize: getIconSize() }} />
          )}
        </IconButton>
      </Tooltip>

      <NotificationPanel
        open={panelOpen}
        onClose={handleClose}
      />
    </Box>
  );
};

export default NotificationBell; 