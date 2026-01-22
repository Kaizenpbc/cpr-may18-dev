import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Refresh as RefreshIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import ThemeToggle from '../common/ThemeToggle';
import NotificationBell from '../common/NotificationBell';

interface InstructorPortalHeaderProps {
  onMenuClick?: () => void;
  onRefresh?: () => void;
  currentView?: string;
}

const InstructorPortalHeader: React.FC<InstructorPortalHeaderProps> = ({
  onMenuClick,
  onRefresh,
  currentView,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        color: 'primary.contrastText',
        borderBottom: 1,
        borderColor: 'divider',
        boxShadow: 'none',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: '56px', sm: '64px' } }}>
        {isMobile && onMenuClick && (
          <IconButton
            color="inherit"
            edge="start"
            onClick={onMenuClick}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'primary.contrastText',
          }}
        >
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: 'primary.contrastText',
              color: 'primary.main',
              fontSize: '1.2rem',
            }}
          >
            🏥
          </Box>
          {isMobile && currentView
            ? currentView.charAt(0).toUpperCase() + currentView.slice(1)
            : 'Instructor Portal'}
        </Typography>
        {!isMobile && (
          <Typography
            variant="body1"
            sx={{
              mr: 2,
              color: 'white',
              fontWeight: 500,
            }}
          >
            Welcome, {user?.username || 'Instructor'}
          </Typography>
        )}
        <ThemeToggle size="small" />
        <NotificationBell size="small" color="inherit" />
        {onRefresh && (
          <IconButton 
            color="inherit" 
            onClick={onRefresh} 
            size="small" 
            sx={{ 
              mr: 1,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <RefreshIcon />
          </IconButton>
        )}
        <IconButton
          color="inherit"
          onClick={handleLogout}
          sx={{ 
            ml: 1,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
          aria-label="logout"
        >
          <LogoutIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default InstructorPortalHeader;
