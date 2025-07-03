import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Box, Alert, Snackbar } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtime } from '../../contexts/RealtimeContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { 
  useInstructorClasses, 
  useCompletedClasses, 
  useInstructorAvailability,
  useTodayClasses,
  useAddAvailability,
  useRemoveAvailability,
  useCompleteClass,
  useUpdateAttendance,
  useClassStudents,
  useRefreshInstructorData
} from '../../services/instructorService';
import analytics from '../../services/analytics';
import logger from '../../utils/logger';
import InstructorPortal from './InstructorPortal';
import ErrorBoundary from '../common/ErrorBoundary';

const InstructorPortalContainer: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // Error handling
  const [error, setError] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<string | null>(null);

  // Analytics tracking
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
  const handleError = useCallback((error: Error, errorInfo: any) => {
    logger.error('Instructor Portal Error:', error, errorInfo);
    analytics.trackError(error, 'instructor_portal', {
      componentStack: errorInfo.componentStack,
      view: getCurrentView(),
    });
    setError(error.message);
  }, []);

  // Get current view from URL
  const getCurrentView = () => {
    const pathSegments = location.pathname.split('/');
    return pathSegments[pathSegments.length - 1] || 'dashboard';
  };

  // Use centralized service hooks instead of direct API calls
  const { data: availableDates = [], isLoading: availabilityLoading } = useInstructorAvailability();
  const { data: scheduledClasses = [], isLoading: classesLoading } = useInstructorClasses();
  const { data: completedClasses = [], isLoading: completedLoading } = useCompletedClasses();
  const { data: todayClasses = [], isLoading: todayLoading } = useTodayClasses();

  // Mutations
  const addAvailabilityMutation = useAddAvailability();
  const removeAvailabilityMutation = useRemoveAvailability();
  const completeClassMutation = useCompleteClass();
  const updateAttendanceMutation = useUpdateAttendance();
  const refreshData = useRefreshInstructorData();

  // Loading state
  const loading = availabilityLoading || classesLoading || completedLoading || todayLoading;

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      logger.error('Logout error:', error);
      setError('Failed to logout. Please try again.');
    }
  }, [logout, navigate]);

  // Handle availability actions
  const handleAddAvailability = useCallback(async (date: string) => {
    try {
      await addAvailabilityMutation.mutateAsync(date);
      setSuccessState('Availability added successfully');
    } catch (error) {
      setError('Failed to add availability');
      logger.error('Add availability error:', error);
    }
  }, [addAvailabilityMutation]);

  const handleRemoveAvailability = useCallback(async (date: string) => {
    try {
      await removeAvailabilityMutation.mutateAsync(date);
      setSuccessState('Availability removed successfully');
    } catch (error) {
      setError('Failed to remove availability');
      logger.error('Remove availability error:', error);
    }
  }, [removeAvailabilityMutation]);

  // Handle class actions
  const handleCompleteClass = useCallback(async (courseId: number) => {
    try {
      await completeClassMutation.mutateAsync(courseId);
      setSuccessState('Class completed successfully');
    } catch (error) {
      setError('Failed to complete class');
      logger.error('Complete class error:', error);
    }
  }, [completeClassMutation]);

  const handleUpdateAttendance = useCallback(async (courseId: number, students: any[]) => {
    try {
      await updateAttendanceMutation.mutateAsync({ courseId, students });
      setSuccessState('Attendance updated successfully');
    } catch (error) {
      setError('Failed to update attendance');
      logger.error('Update attendance error:', error);
    }
  }, [updateAttendanceMutation]);

  // Handle data refresh
  const handleRefreshData = useCallback(async () => {
    try {
      refreshData();
      setSuccessState('Data refreshed successfully');
    } catch (error) {
      setError('Failed to refresh data');
      logger.error('Refresh data error:', error);
    }
  }, [refreshData]);

  // Clear success message
  const handleCloseSuccess = () => {
    setSuccessState(null);
  };

  // Clear error message
  const handleCloseError = () => {
    setError(null);
  };

  return (
    <ErrorBoundary onError={handleError}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <InstructorPortal
          user={user}
          availableDates={availableDates}
          scheduledClasses={scheduledClasses}
          completedClasses={completedClasses}
          todayClasses={todayClasses}
          loading={loading}
          onLogout={handleLogout}
          onAddAvailability={handleAddAvailability}
          onRemoveAvailability={handleRemoveAvailability}
          onCompleteClass={handleCompleteClass}
          onUpdateAttendance={handleUpdateAttendance}
          onRefreshData={handleRefreshData}
        />

        {/* Success Snackbar */}
        <Snackbar
          open={!!successState}
          autoHideDuration={6000}
          onClose={handleCloseSuccess}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert onClose={handleCloseSuccess} severity="success" sx={{ width: '100%' }}>
            {successState}
          </Alert>
        </Snackbar>

        {/* Error Snackbar */}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={handleCloseError}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </ErrorBoundary>
  );
};

export default InstructorPortalContainer; 