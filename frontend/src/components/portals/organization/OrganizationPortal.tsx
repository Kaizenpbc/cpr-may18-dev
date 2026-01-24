import React, { useState } from 'react';
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
  Event as EventIcon,
  School as CoursesIconAlt,
  Archive as ArchiveIcon,
  AttachMoney as PricingIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';
import OrganizationLayout from './OrganizationLayout';
import OrganizationDashboard from './views/OrganizationDashboard';
import OrganizationCourses from './views/OrganizationCourses';
import OrganizationBilling from './views/OrganizationBilling';
import OrganizationProfile from './views/OrganizationProfile';
import OrganizationAnalytics from './views/OrganizationAnalytics';
import ScheduleCourseForm from '../../forms/ScheduleCourseForm';
import CSVUploadDialog from '../../dialogs/CSVUploadDialog';
import OrganizationArchive from './views/OrganizationArchive';
import OrganizationPricing from './views/OrganizationPricing';
import OrganizationPaidInvoices from './views/OrganizationPaidInvoices';
import { Routes, Route, Navigate } from 'react-router-dom';

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
  requestSubmittedDate: string; // When organization submitted the request
  scheduledDate: string; // Organization's preferred date
  courseTypeName: string;
  location: string;
  registeredStudents: number;
  status: string;
  instructor: string;
  notes?: string;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  createdAt: string;
  dueDate: string;
  amount: number;
  status: string;
  studentsBilled: number;
  paidDate?: string;
  location: string;
  courseTypeName: string;
  courseDate: string;
  courseRequestId: number;
  amountPaid: number;
  balanceDue: number;
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
  archivedCourses: Course[];
  invoices: Invoice[];
  paidInvoices: Invoice[];
  paidInvoicesSummary: { total_paid: number; total_amount: number; invoices_count: number } | undefined;
  billingSummary: BillingSummary | undefined;
  loading: boolean;
  error: string | null;
  // currentView: string;
  // onViewChange: (view: string) => void;
  onLogout: () => void;
}

const drawerWidth = 240;

const OrganizationPortal: React.FC<OrganizationPortalProps> = ({
  user,
  organizationData,
  courses,
  archivedCourses,
  invoices,
  paidInvoices,
  paidInvoicesSummary,
  billingSummary,
  loading,
  error,
  // currentView,
  // onViewChange,
  onLogout,
}) => {
  const queryClient = useQueryClient();
  
  // State for CSV upload dialog
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | number | null>(null);
  // State for success message
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Navigation items
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'courses', label: 'My Courses', icon: <CoursesIconAlt /> },
    { id: 'archive', label: 'Archive', icon: <ArchiveIcon /> },
    { id: 'schedule', label: 'Schedule a Course', icon: <EventIcon /> },
    { id: 'billing', label: 'Bills Payable', icon: <BillingIcon /> },
    { id: 'paid-invoices', label: 'Paid Invoices', icon: <CheckCircleIcon /> },
    { id: 'pricing', label: 'Pricing', icon: <PricingIcon /> },
    { id: 'profile', label: 'Profile', icon: <ProfileIcon /> },
    { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
  ];

  // Handle course scheduled
  const handleCourseScheduled = () => {
    // Show success message
    setSuccessMessage('Course scheduled successfully! Your course request has been submitted.');
    
    // Refresh courses data using React Query instead of page reload
    queryClient.invalidateQueries({ queryKey: ['organization-courses', user?.organizationId] });
    queryClient.invalidateQueries({ queryKey: ['organization-data', user?.organizationId] });
    
    // Clear success message after 5 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
    
    // Switch to courses view to show the updated list
    // onViewChange('courses'); // This line is removed as per the edit hint
  };

  // Handle view students click
  const handleViewStudentsClick = (courseId: string | number) => {
    console.log('View students for course:', courseId);
    // TODO: Implement view students functionality
    // This could open a dialog or navigate to a student list view
  };

  // Handle upload students click
  const handleUploadStudentsClick = (courseId: string | number) => {
    console.log('[TRACE] OrganizationPortal - handleUploadStudentsClick called');
    console.log('[TRACE] OrganizationPortal - Course ID:', courseId);
    console.log('[TRACE] OrganizationPortal - Setting selected course ID and opening dialog');
    setSelectedCourseId(courseId);
    setCsvDialogOpen(true);
    console.log('[TRACE] OrganizationPortal - Dialog should now be open');
  };

  // Handle CSV upload success
  const handleCSVUploadSuccess = (data: { success: boolean; message?: string }) => {
    console.log('[TRACE] OrganizationPortal - handleCSVUploadSuccess called');
    console.log('[TRACE] OrganizationPortal - Selected course ID:', selectedCourseId);
    console.log('[TRACE] OrganizationPortal - Upload data:', data);
    console.log('[TRACE] OrganizationPortal - CSV upload successful for course:', selectedCourseId, data);
    
    // Refresh the courses data to show updated student count
    queryClient.invalidateQueries({ queryKey: ['organization-courses', user?.organizationId] });
    
    console.log('[TRACE] OrganizationPortal - Closing dialog and resetting state');
    setCsvDialogOpen(false);
    setSelectedCourseId(null);
    console.log('[TRACE] OrganizationPortal - Upload process completed');
  };

  // Render current view
  // const renderCurrentView = () => {
  //   if (loading) {
  //     return (
  //       <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
  //         <CircularProgress />
  //       </Box>
  //     );
  //   }

  //   if (error) {
  //     return (
  //       <Box sx={{ p: 3 }}>
  //         <Alert severity="error" sx={{ mb: 3 }}>
  //           {error}
  //         </Alert>
  //       </Box>
  //     );
  //   }

  //   switch (currentView) {
  //     case 'dashboard':
  //       return (
  //         <OrganizationDashboard
  //           organizationData={organizationData}
  //           courses={courses}
  //           billingSummary={billingSummary}
  //         />
  //       );
  //     case 'courses':
  //       return (
  //         <OrganizationCourses
  //           courses={courses}
  //           onViewStudentsClick={handleViewStudentsClick}
  //           onUploadStudentsClick={handleUploadStudentsClick}
  //         />
  //       );
  //     case 'archive':
  //       return (
  //         <OrganizationArchive
  //           courses={archivedCourses}
  //           onViewStudentsClick={handleViewStudentsClick}
  //         />
  //       );
  //     case 'schedule':
  //       return (
  //         <ScheduleCourseForm onCourseScheduled={handleCourseScheduled} />
  //       );
  //     case 'billing':
  //       return (
  //         <OrganizationBilling
  //           invoices={invoices}
  //           billingSummary={billingSummary}
  //         />
  //       );
  //     case 'profile':
  //       return (
  //         <OrganizationProfile
  //           organizationData={organizationData}
  //         />
  //       );
  //     case 'pricing':
  //       return (
  //         <OrganizationPricing
  //           organizationId={user?.organizationId || 0}
  //         />
  //       );
  //     case 'analytics':
  //       return (
  //         <OrganizationAnalytics
  //           courses={courses}
  //           invoices={invoices}
  //           organizationData={organizationData}
  //         />
  //       );
  //     default:
  //       return (
  //         <Box sx={{ p: 3 }}>
  //           <Typography variant="h6">View not found</Typography>
  //         </Box>
  //       );
  //   }
  // };

  return (
    <>
      <OrganizationLayout
        user={user}
        // currentView={currentView}
        // onViewChange={onViewChange}
        onLogout={onLogout}
        navigationItems={navigationItems}
        drawerWidth={drawerWidth}
      >
        <Box sx={{ flexGrow: 1, p: 3 }}>
          {/* Success Message */}
          {successMessage && (
            <Alert 
              severity="success" 
              sx={{ mb: 3 }}
              onClose={() => setSuccessMessage(null)}
            >
              {successMessage}
            </Alert>
          )}

          {/* Route-based rendering */}
          <Routes>
            <Route path="dashboard" element={
              loading ? <CircularProgress /> :
              error ? <Alert severity="error">{error}</Alert> :
              <OrganizationDashboard organizationData={organizationData} courses={courses} archivedCourses={archivedCourses} billingSummary={billingSummary} />
            } />
            <Route path="courses" element={
              loading ? <CircularProgress /> :
              error ? <Alert severity="error">{error}</Alert> :
              <OrganizationCourses courses={courses} onViewStudentsClick={handleViewStudentsClick} onUploadStudentsClick={handleUploadStudentsClick} />
            } />
            <Route path="archive" element={
              loading ? <CircularProgress /> :
              error ? <Alert severity="error">{error}</Alert> :
              <OrganizationArchive courses={archivedCourses} onViewStudentsClick={handleViewStudentsClick} />
            } />
            <Route path="schedule" element={<ScheduleCourseForm onCourseScheduled={handleCourseScheduled} />} />
            <Route path="billing" element={
              loading ? <CircularProgress /> :
              error ? <Alert severity="error">{error}</Alert> :
              <OrganizationBilling invoices={invoices} billingSummary={billingSummary} />
            } />
            <Route path="paid-invoices" element={
              loading ? <CircularProgress /> :
              error ? <Alert severity="error">{error}</Alert> :
              <OrganizationPaidInvoices invoices={paidInvoices} paidInvoicesSummary={paidInvoicesSummary} />
            } />
            <Route path="profile" element={<OrganizationProfile organizationData={organizationData} />} />
            <Route path="pricing" element={<OrganizationPricing organizationId={user?.organizationId || 0} />} />
            <Route path="analytics" element={<OrganizationAnalytics courses={courses} archivedCourses={archivedCourses} invoices={invoices} billingSummary={billingSummary} organizationData={organizationData} />} />
            <Route path="" element={<Navigate to="dashboard" replace />} />
            <Route path="*" element={<Box sx={{ p: 3 }}><Typography variant="h6">View not found</Typography></Box>} />
          </Routes>
        </Box>
      </OrganizationLayout>

      <CSVUploadDialog
        open={csvDialogOpen}
        onClose={() => {
          setCsvDialogOpen(false);
          setSelectedCourseId(null);
        }}
        onUploadSuccess={handleCSVUploadSuccess}
        title={`Upload Students for Course ${selectedCourseId}`}
        description="Select a CSV file containing student information (first_name, last_name, email)"
        courseRequestId={selectedCourseId ? Number(selectedCourseId) : undefined}
        organizationId={user?.organizationId}
      />
    </>
  );
};

export default OrganizationPortal; 