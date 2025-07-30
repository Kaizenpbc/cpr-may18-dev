import React from 'react';
import { useNavigate, NavLink, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import {
  Box,
  Tab,
  Tabs,
  Typography,
  Paper,
  Container,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Alert,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Event as EventIcon,
  Email as EmailIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
  VpnKey as PasswordIcon,
  Store as StoreIcon,
  CheckCircle as PaidIcon,
} from '@mui/icons-material';
import ErrorBoundary from '../../common/ErrorBoundary';
import InstructorManagement from './InstructorManagement';
import CourseScheduling from './CourseScheduling';
import EmailTemplateManager from './EmailTemplateManager';
import DashboardView from './DashboardView';
import CancelledCourses from './CancelledCourses';
import VendorInvoiceApproval from './VendorInvoiceApproval';
import PaidVendorInvoices from './PaidVendorInvoices';
import { User } from '../../../types/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`course-admin-tabpanel-${index}`}
      aria-labelledby={`course-admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const tabRoutes = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: 'dashboard', component: <DashboardView /> },
  { label: 'Instructor Management', icon: <PeopleIcon />, path: 'instructors', component: <InstructorManagement /> },
  { label: 'Course Scheduling', icon: <EventIcon />, path: 'scheduling', component: <CourseScheduling /> },
  { label: 'Email Templates', icon: <EmailIcon />, path: 'email-templates', component: <EmailTemplateManager /> },
  { label: 'Cancelled Courses', icon: <EventIcon />, path: 'cancelled-courses', component: <CancelledCourses /> },
  { label: 'Vendor Invoice Approval', icon: <StoreIcon />, path: 'vendor-invoices', component: <VendorInvoiceApproval /> },
  { label: 'Paid Vendor Invoices', icon: <PaidIcon />, path: 'paid-vendor-invoices', component: <PaidVendorInvoices /> },
];

interface CourseAdminPortalProps {
  user: User | null;
  // selectedTab: number;
  anchorEl: HTMLElement | null;
  error: string | null;
  // onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  onMenuClose: () => void;
  onLogout: () => void;
  onPasswordReset: () => void;
}

const CourseAdminPortal: React.FC<CourseAdminPortalProps> = ({
  user,
  // selectedTab,
  anchorEl,
  error,
  // onTabChange,
  onMenuOpen,
  onMenuClose,
  onLogout,
  onPasswordReset,
}) => {
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop();

  const handleError = (error: Error, errorInfo: any) => {
    console.error('[CourseAdminPortal] Error caught by boundary:', error, errorInfo);
  };

  return (
    <ErrorBoundary context="course_admin_portal" onError={handleError}>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* AppBar with Banner */}
        <AppBar
          position='fixed'
          sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}
        >
          <Toolbar>
            <SettingsIcon sx={{ mr: 2 }} />
            <Typography variant='h6' noWrap component='div' sx={{ flexGrow: 1 }}>
              Course Administration Portal
            </Typography>
            <Typography variant='body1' sx={{ mr: 2 }}>
              Welcome, {user?.first_name || user?.username || 'Admin'}!
            </Typography>
            <IconButton
              size='large'
              edge='end'
              aria-label='account of current user'
              aria-controls='menu-appbar'
              aria-haspopup='true'
              onClick={onMenuOpen}
              color='inherit'
            >
              <AccountIcon />
            </IconButton>
            <Menu
              id='menu-appbar'
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
              onClose={onMenuClose}
            >
              <MenuItem onClick={onPasswordReset}>
                <PasswordIcon sx={{ mr: 1 }} />
                Reset Password
              </MenuItem>
              <Divider />
              <MenuItem onClick={onLogout}>
                <LogoutIcon sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Box component='main' sx={{ flexGrow: 1, mt: 8 }}>
          <Container maxWidth='xl'>
            {/* Error Display */}
            {error && (
              <Alert severity='error' sx={{ mt: 3, mb: 2 }}>
                {error}
              </Alert>
            )}

            <Paper elevation={3} sx={{ mt: 3, mb: 3 }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
                {tabRoutes.map((tab) => (
                  <NavLink
                    key={tab.label}
                    to={`/admin/${tab.path}`}
                    style={({ isActive }) => ({
                      textDecoration: 'none',
                      color: isActive ? '#1976d2' : 'inherit',
                      fontWeight: isActive ? 'bold' : 'normal',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      borderBottom: isActive ? '2px solid #1976d2' : 'none',
                    })}
                  >
                    {tab.icon}
                    <span style={{ marginLeft: 8 }}>{tab.label}</span>
                  </NavLink>
                ))}
              </Box>

              <Box sx={{ p: 3 }}>
                <Routes>
                  {tabRoutes.map((tab) => (
                    <Route key={tab.path} path={tab.path} element={tab.component} />
                  ))}
                  <Route path="" element={<Navigate to="dashboard" replace />} />
                  <Route path="*" element={<Box sx={{ p: 3 }}><Typography variant="h6">View not found</Typography></Box>} />
                </Routes>
              </Box>
            </Paper>
          </Container>
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

export default CourseAdminPortal;
