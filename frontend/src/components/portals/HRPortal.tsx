import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Container,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Assessment as AssessmentIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  Payment as PaymentIcon,
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Import the new components
import HRDashboard from './HRDashboard';
import PersonnelManagement from './PersonnelManagement';
import TestProfileChanges from '../TestProfileChanges';
import TimesheetManagement from '../hr/TimesheetManagement';
import PayrollManagement from '../hr/PayrollManagement';
import PayRateManagement from '../hr/PayRateManagement';
import NotificationsPanel from '../hr/NotificationsPanel';
import ReturnedPaymentRequests from '../hr/ReturnedPaymentRequests';

// Placeholder components for Phase 2
const HRReports = () => (
  <Box>
    <Typography variant="h4" gutterBottom>HR Reports</Typography>
    <Typography>Analytics and compliance reports will be implemented here.</Typography>
  </Box>
);

const HRPortal: React.FC = () => {
  const [selectedView, setSelectedView] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, value: 'dashboard' },
    { text: 'Personnel Management', icon: <PeopleIcon />, value: 'personnel' },
    { text: 'Timesheet Management', icon: <AssignmentIcon />, value: 'timesheet' },
    { text: 'Pay Rate Management', icon: <MoneyIcon />, value: 'payrates' },
    { text: 'Instructor Payroll', icon: <PaymentIcon />, value: 'payroll' },
    { text: 'Returned Payment Requests', icon: <WarningIcon />, value: 'returned-payments' },
    { text: 'Notifications', icon: <NotificationsIcon />, value: 'notifications' },
    { text: 'HR Reports', icon: <AssessmentIcon />, value: 'reports' },
  ];

  const renderView = () => {
    switch (selectedView) {
      case 'dashboard':
        return <HRDashboard onViewChange={setSelectedView} />;
      case 'personnel':
        return <PersonnelManagement onViewChange={setSelectedView} />;
      case 'timesheet':
        return <TimesheetManagement />;
      case 'payrates':
        return <PayRateManagement />;
      case 'payroll':
        return <PayrollManagement />;
      case 'returned-payments':
        return <ReturnedPaymentRequests />;
      case 'notifications':
        return <NotificationsPanel />;
      case 'reports':
        return <HRReports />;
      default:
        return <HRDashboard onViewChange={setSelectedView} />;
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            GTACPR HR Portal
          </Typography>
          <IconButton color="inherit">
            <NotificationsIcon />
          </IconButton>
          <IconButton color="inherit">
            <AccountCircleIcon />
          </IconButton>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
            marginTop: '64px',
          },
        }}
      >
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={selectedView === item.value}
                  onClick={() => setSelectedView(item.value)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
          <List>
            <ListItem>
              <ListItemText 
                primary="Quick Actions" 
                primaryTypographyProps={{ variant: 'subtitle2', color: 'textSecondary' }}
              />
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setSelectedView('personnel')}>
                <ListItemIcon><PersonIcon /></ListItemIcon>
                <ListItemText primary="Instructor Profiles" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setSelectedView('personnel')}>
                <ListItemIcon><BusinessIcon /></ListItemIcon>
                <ListItemText primary="Organization Profiles" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setSelectedView('timesheet')}>
                <ListItemIcon><ScheduleIcon /></ListItemIcon>
                <ListItemText primary="Timesheet Approval" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setSelectedView('payroll')}>
                <ListItemIcon><PaymentIcon /></ListItemIcon>
                <ListItemText primary="Instructor Payroll" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, marginTop: '64px' }}>
        <Container maxWidth="xl">
          {renderView()}
        </Container>
      </Box>
    </Box>
  );
};

export default HRPortal; 