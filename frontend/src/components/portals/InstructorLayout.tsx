import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
  BottomNavigation,
  BottomNavigationAction,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  CalendarToday as CalendarIcon,
  Class as ClassIcon,
  Assignment as AssignmentIcon,
  Person as ProfileIcon,
  Archive as ArchiveIcon,
  Refresh as RefreshIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import InstructorPortalHeader from '../headers/InstructorPortalHeader';

const DRAWER_WIDTH = 240;

interface InstructorLayoutProps {
  children: React.ReactNode;
  currentView: string;
  onRefresh?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  showInBottomNav: boolean;
}

const InstructorLayout: React.FC<InstructorLayoutProps> = ({
  children,
  currentView,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/instructor/dashboard',
      showInBottomNav: true,
    },
    {
      id: 'availability',
      label: 'Availability',
      icon: <CalendarIcon />,
      path: '/instructor/availability',
      showInBottomNav: true,
    },
    {
      id: 'classes',
      label: 'My Schedule',
      icon: <ClassIcon />,
      path: '/instructor/classes',
      showInBottomNav: true,
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: <ArchiveIcon />,
      path: '/instructor/archive',
      showInBottomNav: false,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <ProfileIcon />,
      path: '/instructor/profile',
      showInBottomNav: false,
    },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Instructor Portal
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem
            button
            key={item.id}
            onClick={() => handleNavigation(item.path)}
            selected={currentView === item.id}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <InstructorPortalHeader
        onMenuClick={isMobile ? () => setMobileOpen(!mobileOpen) : undefined}
        onRefresh={onRefresh}
        currentView={currentView}
      />
      <Toolbar /> {/* Spacer for fixed AppBar */}

      {/* Drawer */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawer}
        </Drawer>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawer}
        </Drawer>
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
          mt: { xs: '56px', sm: '64px' }, // Adjusted for mobile
          backgroundColor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Box
          sx={{
            maxWidth: '1200px',
            mx: 'auto',
            width: '100%',
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <BottomNavigation
          value={currentView}
          onChange={(_, newValue) => {
            const item = navItems.find((item) => item.id === newValue);
            if (item) {
              handleNavigation(item.path);
            }
          }}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            borderTop: 1,
            borderColor: 'divider',
            backgroundColor: 'background.paper',
          }}
        >
          {navItems
            .filter((item) => item.showInBottomNav)
            .map((item) => (
              <BottomNavigationAction
                key={item.id}
                label={item.label}
                value={item.id}
                icon={item.icon}
                sx={{
                  '& .MuiBottomNavigationAction-label': {
                    fontSize: '0.75rem',
                  },
                }}
              />
            ))}
        </BottomNavigation>
      )}
    </Box>
  );
};

export default InstructorLayout;
