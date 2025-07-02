import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box,
  Container,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  AppBar,
  Toolbar,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  School as CourseIcon,
  People as UsersIcon,
  Business as BusinessIcon,
  Store as StoreIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  AttachMoney as PricingIcon,
} from '@mui/icons-material';
import ErrorBoundary from '../common/ErrorBoundary';
import SystemAdminDashboard from '../sysadmin/SystemAdminDashboard';
import CourseManagement from '../sysadmin/CourseManagement';
import UserManagement from '../sysadmin/UserManagement';
import VendorManagement from '../sysadmin/VendorManagement';
import OrganizationManagement from '../sysadmin/OrganizationManagement';
import OrganizationPricingManager from '../admin/OrganizationPricingManager';

const drawerWidth = 240;

const SystemAdminPortal = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleLogout = () => {
    const firstName = user?.first_name || 'System Admin';
    const logoutMessage = `Goodbye ${firstName}, System Secured!`;
    showSnackbar(logoutMessage, 'info');

    setTimeout(() => {
      logout();
      navigate('/');
    }, 1500);
  };

  const handleError = (error: Error, errorInfo: any) => {
    console.error('[SystemAdminPortal] Error caught by boundary:', error, errorInfo);
  };

  const menuItems = [
    {
      key: 'dashboard',
      label: 'System Dashboard',
      icon: <DashboardIcon />,
      path: '/sysadmin',
    },
    {
      key: 'courses',
      label: 'Course Management',
      icon: <CourseIcon />,
      path: '/sysadmin/courses',
    },
    {
      key: 'organizations',
      label: 'Organization Management',
      icon: <BusinessIcon />,
      path: '/sysadmin/organizations',
    },
    {
      key: 'pricing',
      label: 'Organization Pricing',
      icon: <PricingIcon />,
      path: '/sysadmin/pricing',
    },
    {
      key: 'users',
      label: 'User Management',
      icon: <UsersIcon />,
      path: '/sysadmin/users',
    },
    {
      key: 'vendors',
      label: 'Vendor Management',
      icon: <StoreIcon />,
      path: '/sysadmin/vendors',
    },
  ];

  return (
    <ErrorBoundary context="system_admin_portal" onError={handleError}>
      <Box sx={{ display: 'flex' }}>
        <AppBar
          position='fixed'
          sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}
        >
          <Toolbar>
            <SettingsIcon sx={{ mr: 2 }} />
            <Typography variant='h6' noWrap component='div' sx={{ flexGrow: 1 }}>
              System Administration Portal
            </Typography>
            <Typography variant='body1' noWrap sx={{ mr: 2 }}>
              Welcome {user?.username || 'System Administrator'}!
            </Typography>
          </Toolbar>
        </AppBar>

        <Drawer
          variant='permanent'
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
        >
          <Toolbar />
          <Box sx={{ overflow: 'auto' }}>
            <List>
              {menuItems.map(item => (
                <ListItem
                  key={item.key}
                  component='div'
                  selected={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                  sx={{
                    cursor: 'pointer',
                    py: 1.5,
                    backgroundColor:
                      location.pathname === item.path
                        ? 'primary.light'
                        : 'transparent',
                    color:
                      location.pathname === item.path
                        ? 'primary.contrastText'
                        : 'inherit',
                    '& .MuiListItemIcon-root': {
                      color:
                        location.pathname === item.path
                          ? 'primary.contrastText'
                          : 'inherit',
                    },
                    '&:hover': {
                      backgroundColor:
                        location.pathname === item.path
                          ? 'primary.main'
                          : 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItem>
              ))}
              <Divider sx={{ my: 1 }} />
              <ListItem
                component='div'
                onClick={handleLogout}
                sx={{
                  cursor: 'pointer',
                  py: 1.5,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary='Logout' />
              </ListItem>
            </List>
          </Box>
        </Drawer>

        <Box component='main' sx={{ flexGrow: 1, p: 3 }}>
          <Toolbar />
          <Container maxWidth='xl'>
            <Routes>
              <Route
                path='/'
                element={
                  <ErrorBoundary context="system_admin_dashboard" onError={handleError}>
                    <SystemAdminDashboard />
                  </ErrorBoundary>
                }
              />
              <Route
                path='/courses'
                element={
                  <ErrorBoundary context="system_admin_courses" onError={handleError}>
                    <CourseManagement />
                  </ErrorBoundary>
                }
              />
              <Route
                path='/organizations'
                element={
                  <ErrorBoundary context="system_admin_organizations" onError={handleError}>
                    <OrganizationManagement />
                  </ErrorBoundary>
                }
              />
              <Route
                path='/pricing'
                element={
                  <ErrorBoundary context="system_admin_pricing" onError={handleError}>
                    <OrganizationPricingManager />
                  </ErrorBoundary>
                }
              />
              <Route
                path='/users'
                element={
                  <ErrorBoundary context="system_admin_users" onError={handleError}>
                    <UserManagement />
                  </ErrorBoundary>
                }
              />
              <Route
                path='/vendors'
                element={
                  <ErrorBoundary context="system_admin_vendors" onError={handleError}>
                    <VendorManagement />
                  </ErrorBoundary>
                }
              />
            </Routes>
          </Container>
        </Box>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            variant='filled'
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ErrorBoundary>
  );
};

export default SystemAdminPortal;
