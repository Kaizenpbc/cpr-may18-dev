import React from 'react';
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
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ListAlt as CoursesIcon,
  Receipt as BillingIcon,
  Person as ProfileIcon,
  Analytics as AnalyticsIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import OrganizationLayout from './OrganizationLayout';
import OrganizationDashboard from './views/OrganizationDashboard';
import OrganizationCourses from './views/OrganizationCourses';
import OrganizationBilling from './views/OrganizationBilling';
import OrganizationProfile from './views/OrganizationProfile';
import OrganizationAnalytics from './views/OrganizationAnalytics';

// TypeScript interfaces
interface User {
  id: number;
  username: string;
  role: string;
  organizationId: number;
  organizationName: string;
}

interface OrganizationData {
  id: number;
  name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  total_courses: number;
  total_students: number;
  active_instructors: number;
}

interface Course {
  id: string | number;
  date_requested: string;
  course_type_name: string;
  location: string;
  students_registered: number;
  status: string;
  instructor: string;
  notes?: string;
}

interface Invoice {
  id: number;
  invoice_number: string;
  created_at: string;
  due_date: string;
  amount: number;
  status: string;
  students_billed: number;
  paid_date?: string;
  location: string;
  course_type_name: string;
  course_date: string;
  course_request_id: number;
  amount_paid: number;
  balance_due: number;
}

interface BillingSummary {
  total_invoices: number;
  pending_invoices: number;
  overdue_invoices: number;
  paid_invoices: number;
  payment_submitted: number;
  total_amount: number;
  pending_amount: number;
  overdue_amount: number;
  paid_amount: number;
  recent_invoices: Invoice[];
}

interface OrganizationPortalProps {
  user: User | null;
  organizationData: OrganizationData | undefined;
  courses: Course[];
  invoices: Invoice[];
  billingSummary: BillingSummary | undefined;
  loading: boolean;
  error: string | null;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

const drawerWidth = 240;

const OrganizationPortal: React.FC<OrganizationPortalProps> = ({
  user,
  organizationData,
  courses,
  invoices,
  billingSummary,
  loading,
  error,
  currentView,
  onViewChange,
  onLogout,
}) => {
  // Navigation items
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'courses', label: 'My Courses', icon: <CoursesIcon /> },
    { id: 'billing', label: 'Bills Payable', icon: <BillingIcon /> },
    { id: 'profile', label: 'Profile', icon: <ProfileIcon /> },
    { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
  ];

  // Render current view
  const renderCurrentView = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        </Box>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <OrganizationDashboard
            organizationData={organizationData}
            courses={courses}
            billingSummary={billingSummary}
          />
        );
      case 'courses':
        return (
          <OrganizationCourses
            courses={courses}
          />
        );
      case 'billing':
        return (
          <OrganizationBilling
            invoices={invoices}
            billingSummary={billingSummary}
          />
        );
      case 'profile':
        return (
          <OrganizationProfile
            organizationData={organizationData}
          />
        );
      case 'analytics':
        return (
          <OrganizationAnalytics
            courses={courses}
            invoices={invoices}
            organizationData={organizationData}
          />
        );
      default:
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6">View not found</Typography>
          </Box>
        );
    }
  };

  return (
    <OrganizationLayout
      user={user}
      currentView={currentView}
      onViewChange={onViewChange}
      onLogout={onLogout}
      navigationItems={navigationItems}
      drawerWidth={drawerWidth}
    >
      <Box sx={{ flexGrow: 1, p: 3 }}>
        {renderCurrentView()}
      </Box>
    </OrganizationLayout>
  );
};

export default OrganizationPortal; 