import React, { useState } from 'react';
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
  Divider,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { NavLink } from 'react-router-dom';
import ThemeToggle from '../../common/ThemeToggle';
import NotificationBell from '../../common/NotificationBell';

// TypeScript interfaces
interface User {
  id: number;
  username: string;
  role: string;
  organizationId?: number;
  organizationName?: string;
  locationId?: number;
  locationName?: string;
  [key: string]: unknown;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export interface OrganizationLayoutProps {
  children: React.ReactNode;
  user: User | null;
  currentView?: string;
  onViewChange?: (view: string) => void;
  onLogout: () => void;
  onRefresh?: () => void;
  navigationItems: NavigationItem[];
  drawerWidth: number;
}

const OrganizationLayout: React.FC<OrganizationLayoutProps> = ({
  children,
  user,
  currentView,
  onViewChange,
  onLogout,
  onRefresh,
  navigationItems,
  drawerWidth,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Drawer content
  const drawerContent = (
    <Box>
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" color="primary">
          Organization Portal
        </Typography>
        {user?.organizationName && (
          <Typography variant="body2" color="text.secondary">
            {user.organizationName}
          </Typography>
        )}
        {user?.locationName && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {user.locationName}
          </Typography>
        )}
      </Box>
      <Divider />
      <List>
        {navigationItems.map((item) => (
          <NavLink
            key={item.id}
            to={`/organization/${item.id}`}
            style={({ isActive }) => ({
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
              backgroundColor: isActive ? '#e3f2fd' : undefined,
            })}
          >
            <ListItem
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                  },
                },
              }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItem>
          </NavLink>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          color: 'primary.contrastText',
          borderBottom: 1,
          borderColor: 'divider',
          boxShadow: 'none',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: '56px', sm: '64px' } }}>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {isMobile && currentView
              ? (navigationItems.find(item => item.id === currentView)?.label || 'Organization Portal')
              : 'Organization Portal'}
          </Typography>

          {!isMobile && (
            <Typography variant="body1" sx={{ mr: 2, color: 'white', fontWeight: 500 }}>
              Welcome, {user?.username || 'User'}
            </Typography>
          )}
          <ThemeToggle size="small" />
          <NotificationBell size="small" color="inherit" />
          {onRefresh && (
            <IconButton
              color="inherit"
              onClick={onRefresh}
              size="small"
              sx={{ mr: 1, '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
            >
              <RefreshIcon />
            </IconButton>
          )}
          <IconButton
            color="inherit"
            onClick={onLogout}
            sx={{ ml: 1, '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
            aria-label="logout"
          >
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawerContent}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px', // AppBar height
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default OrganizationLayout; 