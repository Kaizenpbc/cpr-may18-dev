import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  IconButton,
  Tooltip,
  BottomNavigation,
  BottomNavigationAction,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  SwipeableDrawer
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CalendarToday as CalendarIcon,
  Class as ClassIcon,
  AssignmentTurnedIn as AttendanceIcon,
  Archive as ArchiveIcon,
  Person as ProfileIcon,
  VpnKey as PasswordIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
  Menu as MenuIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const DRAWER_WIDTH = 240;

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactElement;
  path: string;
  showInBottomNav?: boolean;
}

interface InstructorLayoutProps {
  children: React.ReactNode;
  currentView: string;
  onRefresh?: () => void;
}

const InstructorLayout: React.FC<InstructorLayoutProps> = ({ 
  children, 
  currentView,
  onRefresh 
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreAnchorEl, setMoreAnchorEl] = useState<null | HTMLElement>(null);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, path: '/instructor/dashboard', showInBottomNav: true },
    { id: 'availability', label: 'Availability', icon: <CalendarIcon />, path: '/instructor/availability', showInBottomNav: true },
    { id: 'classes', label: 'Classes', icon: <ClassIcon />, path: '/instructor/classes', showInBottomNav: true },
    { id: 'attendance', label: 'Attendance', icon: <AttendanceIcon />, path: '/instructor/attendance', showInBottomNav: true },
    { id: 'archive', label: 'Archive', icon: <ArchiveIcon />, path: '/instructor/archive' },
    { id: 'profile', label: 'Profile', icon: <ProfileIcon />, path: '/instructor/profile' }
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

  const handlePasswordReset = () => {
    navigate('/reset-password');
  };

  const handleMoreClick = (event: React.MouseEvent<HTMLElement>) => {
    setMoreAnchorEl(event.currentTarget);
  };

  const handleMoreClose = () => {
    setMoreAnchorEl(null);
  };

  const drawer = (
    <Box>
      <Toolbar />
      <List>
        {navItems.map((item) => (
          <ListItem
            key={item.id}
            component="div"
            onClick={() => handleNavigation(item.path)}
            selected={currentView === item.id}
            sx={{
              cursor: 'pointer',
              backgroundColor: currentView === item.id ? 'primary.light' : 'transparent',
              color: currentView === item.id ? 'primary.contrastText' : 'inherit',
              '&:hover': {
                backgroundColor: currentView === item.id ? 'primary.main' : 'action.hover',
              },
              '& .MuiListItemIcon-root': {
                color: currentView === item.id ? 'primary.contrastText' : 'inherit',
              },
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />

      <List>
        <ListItem
          component="div"
          onClick={handlePasswordReset}
          sx={{
            cursor: 'pointer',
            '&:hover': { backgroundColor: 'action.hover' }
          }}
        >
          <ListItemIcon><PasswordIcon /></ListItemIcon>
          <ListItemText primary="Reset Password" />
        </ListItem>

        <ListItem
          component="div"
          onClick={handleLogout}
          sx={{
            cursor: 'pointer',
            '&:hover': { backgroundColor: 'action.hover' }
          }}
        >
          <ListItemIcon><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          ...(isMobile && {
            boxShadow: 'none',
            background: theme.palette.background.default,
            color: theme.palette.text.primary,
          })
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen(!mobileOpen)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            🏥 {isMobile ? currentView.charAt(0).toUpperCase() + currentView.slice(1) : 'Instructor Portal'}
          </Typography>
          {!isMobile && (
            <Typography variant="body1" sx={{ mr: 2 }}>
              Welcome, {user?.username || 'Instructor'}
            </Typography>
          )}
          {onRefresh && (
            <Tooltip title="Refresh data">
              <IconButton color="inherit" onClick={onRefresh} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          )}
          {isMobile && (
            <IconButton color="inherit" onClick={handleMoreClick}>
              <MoreVertIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Menu */}
      <Menu
        anchorEl={moreAnchorEl}
        open={Boolean(moreAnchorEl)}
        onClose={handleMoreClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
          },
        }}
      >
        <MenuItem onClick={handlePasswordReset}>
          <ListItemIcon>
            <PasswordIcon fontSize="small" />
          </ListItemIcon>
          Reset Password
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      {/* Navigation Drawer - Desktop */}
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

      {/* Navigation Drawer - Mobile */}
      {isMobile && (
        <SwipeableDrawer
          variant="temporary"
          anchor="left"
          open={mobileOpen}
          onOpen={() => setMobileOpen(true)}
          onClose={() => setMobileOpen(false)}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawer}
        </SwipeableDrawer>
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
          width: '100%',
          mb: isMobile ? 7 : 0, // Add margin for bottom navigation
          ...(isMobile ? {
            pt: 8, // Reduced padding for mobile
          } : {
            ml: `${DRAWER_WIDTH}px`,
            pt: 8,
          }),
        }}
      >
        {children}
      </Box>

      {/* Bottom Navigation - Mobile Only */}
      {isMobile && (
        <BottomNavigation
          value={currentView}
          onChange={(_, newValue) => {
            const item = navItems.find(item => item.id === newValue);
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
            zIndex: theme.zIndex.appBar,
            bgcolor: 'background.paper',
          }}
        >
          {navItems
            .filter(item => item.showInBottomNav)
            .map((item) => (
              <BottomNavigationAction
                key={item.id}
                label={item.label}
                value={item.id}
                icon={item.icon}
              />
            ))}
        </BottomNavigation>
      )}
    </Box>
  );
};

export default InstructorLayout; 