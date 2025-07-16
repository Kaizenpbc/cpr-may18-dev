import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Menu as MenuIcon,
  Upload as UploadIcon,
  History as HistoryIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import VendorDashboard from './vendor/VendorDashboard';
import InvoiceUpload from './vendor/InvoiceUpload';
import InvoiceHistory from './vendor/InvoiceHistory';
import VendorProfile from './vendor/VendorProfile';

console.log('📦 [VENDOR PORTAL] InvoiceUpload imported:', typeof InvoiceUpload);

interface VendorPortalProps {}

const VendorPortal: React.FC<VendorPortalProps> = () => {
  console.log('🏢 [VENDOR PORTAL] Component rendered');
  
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  console.log('🏢 [VENDOR PORTAL] Current location:', location.pathname);

  // Monitor location changes
  useEffect(() => {
    console.log('📍 [VENDOR PORTAL] Location changed to:', location.pathname);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
  };

  // Component wrapper for InvoiceUpload to add logging
  const InvoiceUploadWrapper = () => {
    console.log('📤 [VENDOR PORTAL] Rendering InvoiceUpload component');
    try {
      console.log('📤 [VENDOR PORTAL] About to render InvoiceUpload component');
      const result = <InvoiceUpload />;
      console.log('📤 [VENDOR PORTAL] InvoiceUpload component rendered successfully');
      return result;
    } catch (error) {
      console.error('❌ [VENDOR PORTAL] Error rendering InvoiceUpload:', error);
      return (
        <div>
          <h2>Error loading upload component</h2>
          <p>Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
          <button onClick={() => console.log('Test button clicked')}>Test Button</button>
        </div>
      );
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, path: '/vendor/dashboard' },
    { id: 'upload', label: 'Upload Invoice', icon: <UploadIcon />, path: '/vendor/upload' },
    { id: 'history', label: 'Invoice History', icon: <HistoryIcon />, path: '/vendor/history' },
    { id: 'profile', label: 'Profile', icon: <AccountIcon />, path: '/vendor/profile' },
  ];

  console.log('📋 [VENDOR PORTAL] Menu items:', menuItems);

  const getCurrentView = () => {
    const path = location.pathname;
    console.log('🔍 [VENDOR PORTAL] getCurrentView - checking path:', path);
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/upload')) return 'upload';
    if (path.includes('/history')) return 'history';
    if (path.includes('/profile')) return 'profile';
    console.log('🔍 [VENDOR PORTAL] getCurrentView - defaulting to dashboard');
    return 'dashboard';
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => {
              console.log('🍔 [VENDOR PORTAL] Menu button clicked, current drawer state:', drawerOpen);
              setDrawerOpen(!drawerOpen);
              console.log('🍔 [VENDOR PORTAL] Drawer state will be:', !drawerOpen);
            }}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Vendor Portal
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            Welcome, {user?.username}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={() => {
          console.log('❌ [VENDOR PORTAL] Drawer close triggered');
          setDrawerOpen(false);
        }}
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => {
              console.log('📋 [VENDOR PORTAL] Rendering menu item:', item);
              return (
                <ListItem key={item.id} disablePadding>
                  <ListItemButton
                    onClick={() => {
                      console.log('🧭 [VENDOR PORTAL] Navigation clicked for item:', item);
                      console.log('🧭 [VENDOR PORTAL] Current location before navigation:', location.pathname);
                      console.log('🧭 [VENDOR PORTAL] Navigating to:', item.path);
                      navigate(item.path);
                      console.log('🧭 [VENDOR PORTAL] Navigation called, drawer will close');
                      setDrawerOpen(false);
                    }}
                    selected={getCurrentView() === item.id}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Container maxWidth="lg">
          {/* Test navigation button */}
          <Button 
            variant="contained" 
            onClick={() => {
              console.log('🧪 [VENDOR PORTAL] Test navigation button clicked');
              console.log('🧪 [VENDOR PORTAL] Navigating to /vendor/upload');
              navigate('/vendor/upload');
            }}
            sx={{ mb: 2 }}
          >
            🧪 Test: Go to Upload Page
          </Button>
          
          <Routes>
            <Route path="dashboard" element={<VendorDashboard />} />
            <Route path="upload" element={<InvoiceUploadWrapper />} />
            <Route path="history" element={<InvoiceHistory />} />
            <Route path="profile" element={<VendorProfile />} />
            <Route path="" element={<Navigate to="dashboard" replace />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </Container>
      </Box>
    </Box>
  );
};

export default VendorPortal; 