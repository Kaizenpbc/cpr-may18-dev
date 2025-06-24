import React, { Suspense, lazy, useEffect, useState } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import {
  Box,
  Container,
  CircularProgress,
  Alert,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TableCell,
  TableRow,
  Chip,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useInstructorData } from '../../hooks/useInstructorData';
import InstructorLayout from './InstructorLayout';
import AvailabilityView from '../views/instructor/AvailabilityView';
import ErrorBoundary from '../common/ErrorBoundary';
import ToastDemo from '../common/ToastDemo';
import InstructorProfile from '../views/instructor/InstructorProfile';
import analytics from '../../services/analytics';
import { useToast } from '../../contexts/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { tokenService } from '../../services/tokenService';
import { useMutation, useQuery } from '@tanstack/react-query';
import { formatDateWithoutTimezone } from '../../utils/dateUtils';
import { Student } from '../../types/student';
import { ScheduledClass } from '../../types/instructor';
import api from '../../services/api';

// Lazy load components for better performance (using TypeScript files)
const InstructorDashboard = lazy(
  () => import('./instructor/InstructorDashboardContainer')
);
const MyClassesView = lazy(
  () => import('../views/instructor/MyClassesView')
);
const AttendanceView = lazy(
  () => import('../views/instructor/AttendanceView')
);
const ClassAttendanceView = lazy(
  () => import('../views/instructor/ClassAttendanceView')
);
const InstructorArchiveTable = lazy(
  () => import('../tables/InstructorArchiveTable')
);

// Loading component
const LoadingFallback = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '60vh',
    }}
  >
    <CircularProgress />
  </Box>
);

interface CombinedScheduleItem {
  type: 'class' | 'availability';
  displayDate: string;
  status: string;
  key: string;
  organizationname?: string;
  location?: string;
  coursetypename?: string;
  studentsregistered: number;
  studentsattendance: number;
  notes?: string;
  start_time?: string;
  end_time?: string;
  course_id?: number;
  max_students: number;
  current_students: number;
  originalData: any;
}

interface InstructorArchiveTableProps {
  courses: ScheduledClass[];
}

const formatScheduleItem = (item: any): CombinedScheduleItem => {
  return {
    type: 'class',
    displayDate: formatDateWithoutTimezone(item.date),
    status: item.status || 'scheduled',
    key: `${item.course_id}-${item.date}`,
    organizationname: item.organizationname || 'Unassigned',
    location: item.location || 'TBD',
    coursetypename: item.coursetypename || 'CPR Class',
    studentsregistered: Number(item.studentsregistered) || 0,
    studentsattendance: Number(item.studentsattendance) || 0,
    notes: item.notes || '',
    start_time: item.start_time ? item.start_time.slice(0, 5) : '09:00',
    end_time: item.end_time ? item.end_time.slice(0, 5) : '12:00',
    course_id: item.course_id,
    max_students: Number(item.max_students) || 10,
    current_students: Number(item.current_students) || 0,
    originalData: item
  };
};

const InstructorPortal: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, checkAuth, logout } = useAuth();
  const { error: toastError } = useToast();
  const queryClient = useQueryClient();
  const {
    availableDates,
    scheduledClasses,
    completedClasses,
    loading,
    error,
    addAvailability,
    removeAvailability,
    isAddingAvailability,
    isRemovingAvailability,
    fetchClassStudents,
    updateAttendance,
    completeClass,
    loadData,
    getClassDetails,
  } = useInstructorData();

  const [errorState, setErrorState] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<string | null>(null);
  const [completeDialog, setCompleteDialog] = useState<{
    open: boolean;
    item: CombinedScheduleItem | null;
  }>({
    open: false,
    item: null,
  });

  // Temporary logout function for testing
  const handleTestLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const { data: classes = [], refetch: refetchClasses } = useQuery({
    queryKey: ['instructor-classes'],
    queryFn: async () => {
      const response = await api.get('/instructor/classes');
      return response.data.data.map(formatScheduleItem);
    }
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ courseId, students }: { courseId: number; students: Student[] }) => {
      const response = await api.put(`/instructor/classes/${courseId}/attendance`, { students });
      return response.data;
    },
    onSuccess: () => {
      refetchClasses();
      setSuccessState('Attendance updated successfully');
    },
    onError: (error: any) => {
      setErrorState(error.response?.data?.message || 'Failed to update attendance');
    }
  });

  const handleAttendanceUpdate = async (courseId: number, students: Student[]) => {
    await updateAttendanceMutation.mutateAsync({ courseId, students });
  };

  const fetchStudents = async (courseId: number): Promise<Student[]> => {
    const response = await api.get(`/instructor/classes/${courseId}/students`);
    return response.data.data;
  };

  // Handle class details error - only refresh if it's a 404 and we haven't already tried
  const [hasRefreshed, setHasRefreshed] = React.useState(false);
  useEffect(() => {
    if (getClassDetails.error && !hasRefreshed) {
      const error = getClassDetails.error as EnhancedError;
      if (error.code === 'RES_3001') {  // RESOURCE_NOT_FOUND
        setHasRefreshed(true);
        loadData();
      }
    }
  }, [getClassDetails.error, loadData, hasRefreshed]);

  // Reset refresh flag when class details changes
  useEffect(() => {
    if (getClassDetails.data) {
      setHasRefreshed(false);
    }
  }, [getClassDetails.data]);

  // Combine scheduled classes and availability data
  const combinedItems = React.useMemo<CombinedScheduleItem[]>(() => {
    const items: CombinedScheduleItem[] = [];

    // Add class items
    if (scheduledClasses && Array.isArray(scheduledClasses)) {
      scheduledClasses.forEach((classItem: any) => {
        items.push({
          type: 'class' as const,
          displayDate: classItem.date,
          status: classItem.status || 'scheduled',
          key: `class-${classItem.course_id}`,
          organizationname: classItem.organizationname,
          location: classItem.location,
          coursetypename: classItem.coursetypename,
          studentsregistered: Number(classItem.studentsregistered) || 0,
          studentsattendance: Number(classItem.studentsattendance) || 0,
          notes: classItem.notes || '',
          start_time: classItem.start_time,
          end_time: classItem.end_time,
          course_id: classItem.course_id,
          max_students: Number(classItem.max_students) || 10,
          current_students: Number(classItem.current_students) || 0,
          originalData: classItem
        });
      });
    }

    // Add availability items
    if (availableDates && Array.isArray(availableDates)) {
      availableDates.forEach((availability) => {
        if (availability && availability.date) {
          items.push({
            type: 'availability' as const,
            displayDate: availability.date,
            status: availability.status || 'Available',
            key: `availability-${availability.date}`,
            originalData: availability
          });
        }
      });
    }

    // Sort by date
    return items.sort((a: CombinedScheduleItem, b: CombinedScheduleItem) => {
      const dateA = new Date(a.displayDate);
      const dateB = new Date(b.displayDate);
      return dateA.getTime() - dateB.getTime();
    });
  }, [scheduledClasses, availableDates]);

  // Check authentication and load user data if needed
  useEffect(() => {
    const token = tokenService.getAccessToken();
    if (token && !user && !authLoading) {
      checkAuth();
    }
  }, [user, authLoading, checkAuth]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user && !authLoading && !tokenService.getAccessToken()) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Analytics: Track user and page views
  useEffect(() => {
    if (user) {
      analytics.setUser(user.id || user.username, {
        role: user.role,
        portal: 'instructor',
      });
    }
  }, [user]);

  useEffect(() => {
    const currentView = getCurrentView();
    analytics.trackPageView(`instructor_${currentView}`, {
      portal: 'instructor',
      view: currentView,
    });
  }, [location.pathname]);

  // Error handler for error boundaries
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    analytics.trackError(error, 'instructor_portal', {
      componentStack: errorInfo.componentStack,
      view: getCurrentView(),
    });
  };

  // Get current view from URL
  const getCurrentView = () => {
    const pathSegments = location.pathname.split('/');
    return pathSegments[pathSegments.length - 1] || 'dashboard';
  };

  const handleCompleteClass = async (item: CombinedScheduleItem) => {
    if (!item.course_id) {
      console.error('No course ID found for item:', item);
      return;
    }

    // Show confirmation dialog
    setCompleteDialog({
      open: true,
      item: item,
    });
  };

  const handleCompleteConfirm = async () => {
    if (!completeDialog.item?.course_id) {
      console.error('No course ID found for item:', completeDialog.item);
      return;
    }

    try {
      console.log('[handleCompleteConfirm] Completing class:', completeDialog.item.course_id);
      await completeClass(completeDialog.item.course_id);
      
      // Show success message
      setSuccessState('Course completed successfully! It has been moved to your archive.');
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessState(null), 5000);
      
      // Close dialog
      setCompleteDialog({ open: false, item: null });
      
    } catch (error: any) {
      console.error('[handleCompleteConfirm] Error:', error);
      setErrorState(error.response?.data?.message || 'Failed to complete course');
      
      // Clear error message after 5 seconds
      setTimeout(() => setErrorState(null), 5000);
    }
  };

  const handleCompleteCancel = () => {
    setCompleteDialog({ open: false, item: null });
  };

  if (authLoading || loading) {
    return (
      <InstructorLayout currentView={getCurrentView()} onRefresh={loadData}>
        <LoadingFallback />
      </InstructorLayout>
    );
  }

  if (error) {
    return (
      <InstructorLayout currentView={getCurrentView()} onRefresh={loadData}>
        <Container maxWidth='lg'>
          <Alert severity='error' sx={{ mt: 2 }}>
            <Typography variant='h6'>
              {error.userMessage || 'Error Loading Data'}
            </Typography>
            <Typography>
              {error.suggestion ||
                error.message ||
                'An unexpected error occurred'}
            </Typography>
          </Alert>
        </Container>
      </InstructorLayout>
    );
  }

  return (
    <ErrorBoundary onError={handleError}>
      <InstructorLayout currentView={getCurrentView()} onRefresh={loadData}>
        <Container maxWidth='lg'>
          {/* Success and Error Messages */}
          {successState && (
            <Alert severity='success' sx={{ mb: 2, mt: 2 }}>
              {successState}
            </Alert>
          )}
          
          {errorState && (
            <Alert severity='error' sx={{ mb: 2, mt: 2 }}>
              {errorState}
            </Alert>
          )}

          {/* Temporary logout button for testing */}
          <Box sx={{ mb: 2, mt: 2, textAlign: 'center' }}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleTestLogout}
              sx={{ mb: 2 }}
            >
              🚪 Test Logout (Go to Login Page)
            </Button>
          </Box>
          
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route
                path='/'
                element={<Navigate to='/instructor/dashboard' replace />}
              />
              <Route
                path='/dashboard'
                element={
                  <ErrorBoundary onError={handleError}>
                    <InstructorDashboard />
                  </ErrorBoundary>
                }
              />
              <Route
                path='/availability'
                element={
                  <ErrorBoundary onError={handleError}>
                    <AvailabilityView
                      availableDates={availableDates}
                      onAddAvailability={addAvailability}
                      onRemoveAvailability={removeAvailability}
                      isLoading={isAddingAvailability || isRemovingAvailability}
                    />
                  </ErrorBoundary>
                }
              />
              <Route
                path='/classes'
                element={
                  <ErrorBoundary onError={handleError}>
                    <MyClassesView
                      combinedSchedule={combinedItems}
                      onCompleteClass={handleCompleteClass}
                      onRemoveAvailability={removeAvailability}
                    />
                  </ErrorBoundary>
                }
              />
              <Route
                path='/attendance'
                element={
                  <ErrorBoundary onError={handleError}>
                    <AttendanceView
                      classes={scheduledClasses}
                      onFetchStudents={fetchClassStudents}
                      onUpdateAttendance={updateAttendance}
                    />
                  </ErrorBoundary>
                }
              />
              <Route
                path='/class-attendance'
                element={
                  <ErrorBoundary onError={handleError}>
                    <ClassAttendanceView />
                  </ErrorBoundary>
                }
              />
              <Route
                path='/archive'
                element={
                  <ErrorBoundary onError={handleError}>
                    <InstructorArchiveTable
                      courses={completedClasses}
                    />
                  </ErrorBoundary>
                }
              />
              <Route
                path='/profile'
                element={
                  <ErrorBoundary onError={handleError}>
                    <InstructorProfile user={user} />
                  </ErrorBoundary>
                }
              />
            </Routes>
          </Suspense>
        </Container>
      </InstructorLayout>

      {/* Complete Course Confirmation Dialog */}
      <Dialog
        open={completeDialog.open}
        onClose={handleCompleteCancel}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Complete Course</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to mark this course as completed?
            <br /><br />
            <strong>Course Details:</strong><br />
            Date: {completeDialog.item?.displayDate}<br />
            Organization: {completeDialog.item?.organizationname}<br />
            Location: {completeDialog.item?.location}<br />
            Course: {completeDialog.item?.coursetypename}<br />
            Students Registered: {completeDialog.item?.studentsregistered}<br />
            Students Attended: {completeDialog.item?.studentsattendance}
            <br /><br />
            <strong>This action will:</strong>
            <ul>
              <li>Mark the course as completed</li>
              <li>Move it to your archive</li>
              <li>Update the organization and admin portals</li>
              <li>Lock the final attendance count</li>
            </ul>
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCompleteCancel}>Cancel</Button>
          <Button 
            onClick={handleCompleteConfirm} 
            color="success"
            variant="contained"
          >
            Complete Course
          </Button>
        </DialogActions>
      </Dialog>
    </ErrorBoundary>
  );
};

export default InstructorPortal;
