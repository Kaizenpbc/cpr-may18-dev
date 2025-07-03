import React, { Suspense, lazy } from 'react';
import {
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import {
  Box,
  Container,
  Alert,
  Button,
} from '@mui/material';
import InstructorLayout from './InstructorLayout';
import ErrorBoundary from '../common/ErrorBoundary';
import { User } from '../../types/api';
import { Student } from '../../types/student';
import { ScheduledClass } from '../../types/instructor';

// Lazy load components for better performance
const InstructorDashboard = lazy(
  () => import('../instructor/InstructorDashboard')
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
const AvailabilityView = lazy(
  () => import('../views/instructor/AvailabilityView')
);
const InstructorProfile = lazy(
  () => import('../views/instructor/InstructorProfile')
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
    <div>Loading...</div>
  </Box>
);

interface InstructorPortalProps {
  user: User | null;
  availableDates: any[];
  scheduledClasses: ScheduledClass[];
  completedClasses: ScheduledClass[];
  loading: boolean;
  error: string | null;
  successState: string | null;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  onAttendanceUpdate: (courseId: number, students: Student[]) => Promise<void>;
  onAddAvailability: (date: string) => Promise<void>;
  onRemoveAvailability: (date: string) => Promise<void>;
  onCompleteClass: (courseId: number) => Promise<void>;
  onFetchStudents: (courseId: number) => Promise<Student[]>;
  onClearMessages: () => void;
  isAddingAvailability: boolean;
  isRemovingAvailability: boolean;
  isUpdatingAttendance: boolean;
  isCompletingClass: boolean;
}

const InstructorPortal: React.FC<InstructorPortalProps> = ({
  user,
  availableDates,
  scheduledClasses,
  completedClasses,
  loading,
  error,
  successState,
  currentView,
  onViewChange,
  onLogout,
  onAttendanceUpdate,
  onAddAvailability,
  onRemoveAvailability,
  onCompleteClass,
  onFetchStudents,
  onClearMessages,
  isAddingAvailability,
  isRemovingAvailability,
  isUpdatingAttendance,
  isCompletingClass,
}) => {
  // Handle error boundary errors
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Instructor Portal Error:', error, errorInfo);
  };

  if (error) {
    return (
      <InstructorLayout currentView={currentView} onRefresh={onClearMessages}>
        <Container maxWidth='lg'>
          <Alert severity='error' sx={{ mt: 2 }}>
            {error}
          </Alert>
        </Container>
      </InstructorLayout>
    );
  }

  return (
    <ErrorBoundary onError={handleError}>
      <InstructorLayout currentView={currentView} onRefresh={onClearMessages}>
        <Container maxWidth='lg'>
          {/* Success and Error Messages */}
          {successState && (
            <Alert severity='success' sx={{ mb: 2, mt: 2 }}>
              {successState}
            </Alert>
          )}
          
          {error && (
            <Alert severity='error' sx={{ mb: 2, mt: 2 }}>
              {error}
            </Alert>
          )}

          {/* Temporary logout button for testing */}
          <Box sx={{ mb: 2, mt: 2, textAlign: 'center' }}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={onLogout}
              sx={{ mb: 2 }}
            >
              🚪 Test Logout (Go to Login Page)
            </Button>
          </Box>

          {/* Routes */}
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route
                path='/'
                element={<Navigate to='/dashboard' replace />}
              />
              <Route
                path='/dashboard'
                element={
                  <ErrorBoundary onError={handleError}>
                    <InstructorDashboard
                      availableDates={availableDates}
                      scheduledClasses={scheduledClasses}
                      completedClasses={completedClasses}
                      onViewChange={onViewChange}
                    />
                  </ErrorBoundary>
                }
              />
              <Route
                path='/classes'
                element={
                  <ErrorBoundary onError={handleError}>
                    <MyClassesView
                      scheduledClasses={scheduledClasses}
                      onAttendanceUpdate={onAttendanceUpdate}
                      onCompleteClass={onCompleteClass}
                      onFetchStudents={onFetchStudents}
                      isUpdatingAttendance={isUpdatingAttendance}
                      isCompletingClass={isCompletingClass}
                    />
                  </ErrorBoundary>
                }
              />
              <Route
                path='/availability'
                element={
                  <ErrorBoundary onError={handleError}>
                    <AvailabilityView
                      availableDates={availableDates}
                      onAddAvailability={onAddAvailability}
                      onRemoveAvailability={onRemoveAvailability}
                      isAddingAvailability={isAddingAvailability}
                      isRemovingAvailability={isRemovingAvailability}
                    />
                  </ErrorBoundary>
                }
              />
              <Route
                path='/attendance'
                element={
                  <ErrorBoundary onError={handleError}>
                    <AttendanceView
                      scheduledClasses={scheduledClasses}
                      onAttendanceUpdate={onAttendanceUpdate}
                      onFetchStudents={onFetchStudents}
                      isUpdatingAttendance={isUpdatingAttendance}
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
    </ErrorBoundary>
  );
};

export default InstructorPortal;
