import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  Snackbar,
  Box,
  Typography,
  LinearProgress,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface SessionWarningProps {
  showAtMinutes?: number; // Show warning when this many minutes remain
}

const SessionWarning: React.FC<SessionWarningProps> = ({ 
  showAtMinutes = 5 
}) => {
  const { sessionStatus, refreshSession } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!sessionStatus?.hasToken || sessionStatus.isExpired) {
      setShowWarning(false);
      return;
    }

    const checkSessionExpiry = () => {
      if (sessionStatus.timeUntilExpiry) {
        const minutesRemaining = Math.floor(sessionStatus.timeUntilExpiry / 60000);
        
        if (minutesRemaining <= showAtMinutes && minutesRemaining > 0) {
          setShowWarning(true);
          
          // Format time remaining
          const minutes = Math.floor(sessionStatus.timeUntilExpiry / 60000);
          const seconds = Math.floor((sessionStatus.timeUntilExpiry % 60000) / 1000);
          
          if (minutes > 0) {
            setTimeRemaining(`${minutes}m ${seconds}s`);
          } else {
            setTimeRemaining(`${seconds}s`);
          }
        } else {
          setShowWarning(false);
        }
      }
    };

    checkSessionExpiry();
    const interval = setInterval(checkSessionExpiry, 1000); // Check every second

    return () => clearInterval(interval);
  }, [sessionStatus, showAtMinutes]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refreshSession();
      setShowWarning(false);
    } catch (error) {
      console.error('Failed to refresh session:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleClose = () => {
    setShowWarning(false);
  };

  if (!showWarning) return null;

  const getProgressValue = () => {
    if (!sessionStatus?.timeUntilExpiry) return 0;
    
    // Assuming 15-minute session (900 seconds)
    const totalSessionTime = 15 * 60 * 1000;
    const remaining = sessionStatus.timeUntilExpiry;
    
    return Math.max(0, Math.min(100, (remaining / totalSessionTime) * 100));
  };

  const getSeverity = () => {
    if (!sessionStatus?.timeUntilExpiry) return 'warning';
    
    const minutesRemaining = Math.floor(sessionStatus.timeUntilExpiry / 60000);
    
    if (minutesRemaining <= 1) return 'error';
    if (minutesRemaining <= 2) return 'warning';
    return 'info';
  };

  return (
    <Snackbar
      open={showWarning}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ zIndex: 9999 }}
    >
      <Alert
        severity={getSeverity()}
        icon={<ScheduleIcon />}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              color="inherit"
              size="small"
              onClick={handleRefresh}
              disabled={refreshing}
              startIcon={<RefreshIcon />}
            >
              {refreshing ? 'Refreshing...' : 'Extend Session'}
            </Button>
            <Button
              color="inherit"
              size="small"
              onClick={handleClose}
            >
              Dismiss
            </Button>
          </Box>
        }
        sx={{
          minWidth: 400,
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
      >
        <AlertTitle>
          Session Expiring Soon
        </AlertTitle>
        
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" gutterBottom>
            Your session will expire in <strong>{timeRemaining}</strong>.
          </Typography>
          
          <Box sx={{ mt: 1, mb: 1 }}>
            <LinearProgress
              variant="determinate"
              value={getProgressValue()}
              color={getSeverity()}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
          
          <Typography variant="caption" color="textSecondary">
            Click "Extend Session" to continue working without interruption.
          </Typography>
        </Box>
      </Alert>
    </Snackbar>
  );
};

export default SessionWarning; 