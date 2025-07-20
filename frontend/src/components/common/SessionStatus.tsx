import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';

interface SessionStatusProps {
  showDetails?: boolean;
  compact?: boolean;
}

const SessionStatus: React.FC<SessionStatusProps> = ({ 
  showDetails = false, 
  compact = false 
}) => {
  const { user, logout } = useAuth();
  const [sessionStatus, setSessionStatus] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());

  // Update session status every 30 seconds
  useEffect(() => {
    const updateStatus = () => {
      const status = authService.getSessionStatus();
      setSessionStatus(status);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      setLastActivity(new Date());
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, []);

  const handleRefreshToken = async () => {
    try {
      setRefreshing(true);
      await authService.refreshToken();
      const status = authService.getSessionStatus();
      setSessionStatus(status);
    } catch (error) {
      console.error('Failed to refresh token:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowDialog(false);
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const getSessionColor = () => {
    if (!sessionStatus?.hasToken) return 'error';
    if (sessionStatus?.isExpired) return 'error';
    if (sessionStatus?.timeUntilExpiry && sessionStatus.timeUntilExpiry < 300000) return 'warning'; // 5 minutes
    return 'success';
  };

  const getSessionIcon = () => {
    if (!sessionStatus?.hasToken) return <SecurityIcon />;
    if (sessionStatus?.isExpired) return <WarningIcon />;
    if (sessionStatus?.timeUntilExpiry && sessionStatus.timeUntilExpiry < 300000) return <ScheduleIcon />;
    return <CheckCircleIcon />;
  };

  const getSessionLabel = () => {
    if (!sessionStatus?.hasToken) return 'No Session';
    if (sessionStatus?.isExpired) return 'Session Expired';
    if (sessionStatus?.timeUntilExpiry && sessionStatus.timeUntilExpiry < 300000) return 'Session Expiring Soon';
    return 'Session Active';
  };

  const formatTimeRemaining = () => {
    if (!sessionStatus?.timeUntilExpiry) return 'Unknown';
    
    const minutes = Math.floor(sessionStatus.timeUntilExpiry / 60000);
    const seconds = Math.floor((sessionStatus.timeUntilExpiry % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getProgressValue = () => {
    if (!sessionStatus?.timeUntilExpiry || sessionStatus.timeUntilExpiry <= 0) return 0;
    
    // Assuming 15-minute session (900 seconds)
    const totalSessionTime = 15 * 60 * 1000;
    const remaining = sessionStatus.timeUntilExpiry;
    
    return Math.max(0, Math.min(100, (remaining / totalSessionTime) * 100));
  };

  if (!user) return null;

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={getSessionLabel()}>
          <Chip
            icon={getSessionIcon()}
            label={getSessionLabel()}
            color={getSessionColor()}
            size="small"
            variant="outlined"
          />
        </Tooltip>
        {showDetails && sessionStatus?.timeUntilExpiry && sessionStatus.timeUntilExpiry > 0 && (
          <Typography variant="caption" color="textSecondary">
            {formatTimeRemaining()}
          </Typography>
        )}
        <Tooltip title="Refresh Session">
          <IconButton
            size="small"
            onClick={handleRefreshToken}
            disabled={refreshing}
            color="primary"
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Chip
          icon={getSessionIcon()}
          label={getSessionLabel()}
          color={getSessionColor()}
          variant="outlined"
        />
        
        {sessionStatus?.timeUntilExpiry && sessionStatus.timeUntilExpiry > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
            <Typography variant="body2" color="textSecondary">
              {formatTimeRemaining()}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={getProgressValue()}
              sx={{ width: 60, height: 6, borderRadius: 3 }}
              color={getSessionColor()}
            />
          </Box>
        )}
        
        <Tooltip title="Refresh Session">
          <IconButton
            onClick={handleRefreshToken}
            disabled={refreshing}
            color="primary"
            size="small"
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Session Details">
          <IconButton
            onClick={() => setShowDialog(true)}
            color="primary"
            size="small"
          >
            <SecurityIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Session Information</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              User: {user.username}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Role: {user.role}
            </Typography>
            {user.organizationName && (
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Organization: {user.organizationName}
              </Typography>
            )}
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Session Status
            </Typography>
            
            {sessionStatus?.hasToken ? (
              <Box>
                <Typography variant="body2" gutterBottom>
                  Status: {getSessionLabel()}
                </Typography>
                
                {sessionStatus?.expiresAt && (
                  <Typography variant="body2" gutterBottom>
                    Expires: {sessionStatus.expiresAt.toLocaleString()}
                  </Typography>
                )}
                
                {sessionStatus?.timeUntilExpiry && sessionStatus.timeUntilExpiry > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Time Remaining: {formatTimeRemaining()}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={getProgressValue()}
                      sx={{ height: 8, borderRadius: 4 }}
                      color={getSessionColor()}
                    />
                  </Box>
                )}
                
                <Typography variant="body2" color="textSecondary">
                  Last Activity: {lastActivity.toLocaleString()}
                </Typography>
              </Box>
            ) : (
              <Alert severity="error">
                No active session found. Please log in again.
              </Alert>
            )}
          </Box>

          {sessionStatus?.timeUntilExpiry && sessionStatus.timeUntilExpiry < 300000 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Your session will expire soon. Click "Refresh Session" to extend it.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>Close</Button>
          <Button
            onClick={handleRefreshToken}
            disabled={refreshing}
            variant="outlined"
            startIcon={<RefreshIcon />}
          >
            Refresh Session
          </Button>
          <Button
            onClick={handleLogout}
            color="error"
            variant="outlined"
          >
            Logout
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SessionStatus; 