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
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountIcon,
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
  navigationItems: NavigationItem[];
  drawerWidth: number;
}

const OrganizationLayout: React.FC<OrganizationLayoutProps> = ({
  children,
  user,
  currentView,
  onViewChange,
  onLogout,
  navigationItems,
  drawerWidth,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    onLogout();
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
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {navigationItems.find(item => item.id === currentView)?.label || 'Organization Portal'}
          </Typography>
          
          {/* Theme toggle, Notifications, and User menu */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ThemeToggle size="small" />
            <NotificationBell size="small" color="inherit" />
            <Typography variant="body2" sx={{ mr: 1, ml: 1 }}>
              {user?.username}
            </Typography>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="user-menu"
              aria-haspopup="true"
              onClick={handleMenuOpen}
              color="inherit"
            >
              <AccountIcon />
            </IconButton>
            <Menu
              id="user-menu"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
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