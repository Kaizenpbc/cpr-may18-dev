import React from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/icons-material';
import ErrorBoundary from '../../common/ErrorBoundary';
import InstructorManagement from './InstructorManagement';
import CourseScheduling from './CourseScheduling';
import EmailTemplateManager from './EmailTemplateManager';
import DashboardView from './DashboardView';
import CancelledCourses from './CancelledCourses';
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

const tabs = [
  {
    label: 'Dashboard',
    icon: <DashboardIcon />,
    component: <DashboardView />,
  },
  {
    label: 'Instructor Management',
    icon: <PeopleIcon />,
    component: <InstructorManagement />,
  },
  {
    label: 'Course Scheduling',
    icon: <EventIcon />,
    component: <CourseScheduling />,
  },
  {
    label: 'Email Templates',
    icon: <EmailIcon />,
    component: <EmailTemplateManager />,
  },
  {
    label: 'Cancelled Courses',
    icon: <EventIcon />,
    component: <CancelledCourses />,
  },
];

interface CourseAdminPortalProps {
  user: User | null;
  selectedTab: number;
  anchorEl: HTMLElement | null;
  error: string | null;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  onMenuClose: () => void;
  onLogout: () => void;
  onPasswordReset: () => void;
}

const CourseAdminPortal: React.FC<CourseAdminPortalProps> = ({
  user,
  selectedTab,
  anchorEl,
  error,
  onTabChange,
  onMenuOpen,
  onMenuClose,
  onLogout,
  onPasswordReset,
}) => {
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
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={selectedTab}
                  onChange={onTabChange}
                  variant='scrollable'
                  scrollButtons='auto'
                  aria-label='course admin tabs'
                >
                  {tabs.map((tab, index) => (
                    <Tab
                      key={tab.label}
                      icon={tab.icon}
                      label={tab.label}
                      id={`course-admin-tab-${index}`}
                      aria-controls={`course-admin-tabpanel-${index}`}
                    />
                  ))}
                </Tabs>
              </Box>

              {tabs.map((tab, index) => (
                <TabPanel key={tab.label} value={selectedTab} index={index}>
                  <ErrorBoundary context={`course_admin_${tab.label.toLowerCase().replace(' ', '_')}`} onError={handleError}>
                    {tab.component}
                  </ErrorBoundary>
                </TabPanel>
              ))}
            </Paper>
          </Container>
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

export default CourseAdminPortal;
