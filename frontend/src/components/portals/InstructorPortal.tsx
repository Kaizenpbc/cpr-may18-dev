import React, { Suspense, lazy, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  Container,
  Box,
  Alert,
  Button,
} from '@mui/material';
import { ErrorBoundary } from '../common/ErrorBoundary';
import InstructorLayout from './InstructorLayout';
import { formatDisplayDate } from '../../utils/dateUtils';
import type { User } from '../../types/api';
import type { Student, ScheduledClass } from '../../types/instructor';
import type { CombinedScheduleItem } from '../../types/instructor';

// Lazy load components
const InstructorDashboard = lazy(
  () => import('../instructor/InstructorDashboard')
);
const MyClassesView = lazy(
  () => import('../views/instructor/MyClassesView')
);
const AvailabilityView = lazy(
  () => import('../views/instructor/AvailabilityView')
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
const InstructorProfile = lazy(
  () => import('../views/instructor/InstructorProfile')
);
const TimesheetPage = lazy(
  () => import('../instructor/TimesheetPage')
);

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
  todayClasses?: ScheduledClass[];
  loading: boolean;
  onLogout: () => void;
  onAddAvailability: (date: string) => Promise<void>;
  onRemoveAvailability: (date: string) => Promise<void>;
  onCompleteClass: (courseId: number) => Promise<void>;
  onUpdateAttendance: (courseId: number, students: any[]) => Promise<void>;
  onRefreshData: () => void;
}

const InstructorPortal: React.FC<InstructorPortalProps> = ({
  user,
  availableDates,
  scheduledClasses,
  completedClasses,
  todayClasses = [],
  loading,
  onLogout,
  onAddAvailability,
  onRemoveAvailability,
  onCompleteClass,
  onUpdateAttendance,
  onRefreshData,
}) => {
  // Create combined schedule from scheduled classes and availability dates
  const combinedSchedule: CombinedScheduleItem[] = useMemo(() => {
    console.log('[InstructorPortal] Creating combined schedule:', {
      availableDates: availableDates,
      scheduledClasses: scheduledClasses
    });

    const combined: CombinedScheduleItem[] = [];

    // Add scheduled classes (filter out completed classes)
    scheduledClasses
      .filter((classItem) => {
        // Filter out completed classes
        const isCompleted = classItem.status === 'completed' || 
                          (classItem as any).completed === true ||
                          classItem.status === 'Completed';
        console.log('[InstructorPortal] Filtering class:', {
          course_id: classItem.course_id,
          status: classItem.status,
          completed: (classItem as any).completed,
          isCompleted: isCompleted
        });
        return !isCompleted;
      })
      .forEach((classItem) => {
        console.log('[InstructorPortal] Processing scheduled class:', {
          course_id: classItem.course_id,
          date: classItem.date,
          organization_name: (classItem as any).organizationname || classItem.organization_name,
          course_name: (classItem as any).course_name || classItem.course_type,
          location: classItem.location,
          status: classItem.status
        });
        const dateStr = classItem.date.includes('T') 
          ? classItem.date.split('T')[0] 
          : classItem.date;
        
        combined.push({
          key: `class-${classItem.course_id}`,
          type: 'class',
          displayDate: formatDisplayDate(dateStr),
          organizationname: (classItem as any).organizationname || classItem.organization_name || 'Unassigned',
          location: classItem.location || 'TBD',
          coursenumber: classItem.course_id?.toString() || '',
          coursetypename: (classItem as any).course_name || classItem.course_type || 'CPR Class',
          studentsregistered: (classItem as any).studentcount || classItem.registered_students || 0,
          studentsattendance: (classItem as any).studentsattendance || classItem.students_attended || 0,
          notes: classItem.notes,
          status: classItem.status || 'scheduled',
          course_id: classItem.course_id,
          originalData: classItem as any
        });
      });

    // Add availability dates
    availableDates.forEach((availability) => {
      console.log('[InstructorPortal] Processing availability:', {
        id: availability.id,
        date: availability.date,
        status: availability.status
      });
      const dateStr = availability.date.includes('T') 
        ? availability.date.split('T')[0] 
        : availability.date;
      
      console.log('[InstructorPortal] Date processing:', {
        originalDate: availability.date,
        dateStr: dateStr,
        formattedDate: formatDisplayDate(dateStr)
      });
      
      // Include all availability dates (don't filter by date)
      const entry = {
        key: `availability-${availability.id}`,
        type: 'availability',
        displayDate: formatDisplayDate(dateStr),
        organizationname: 'Available',
        location: 'Available',
        coursenumber: '',
        coursetypename: 'Available',
        studentsregistered: 0,
        studentsattendance: 0,
        status: 'available',
        originalData: availability
      };
      
      console.log('[InstructorPortal] Created availability entry:', entry);
      combined.push(entry);
    });

    // Sort by date
    combined.sort((a, b) => new Date(a.displayDate).getTime() - new Date(b.displayDate).getTime());
    
    console.log('[InstructorPortal] Final combined schedule:', combined.map(item => ({
      key: item.key,
      type: item.type,
      displayDate: item.displayDate,
      organizationname: item.organizationname,
      status: item.status
    })));
    return combined;
  }, [availableDates, scheduledClasses]);

  // Handle error boundary errors
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Instructor Portal Error:', error, errorInfo);
  };

  // Get current view from URL
  const getCurrentView = () => {
    const pathSegments = window.location.pathname.split('/');
    return pathSegments[pathSegments.length - 1] || 'dashboard';
  };

  const currentView = getCurrentView();

  if (loading) {
    return (
      <InstructorLayout currentView={currentView}>
        <Container maxWidth='lg'>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <div>Loading...</div>
          </Box>
        </Container>
      </InstructorLayout>
    );
  }

  return (
    <ErrorBoundary onError={handleError}>
      <InstructorLayout currentView={currentView} onRefresh={onRefreshData}>
        <Container maxWidth='lg'>
          {/* Success and Error Messages */}
          {/* The original code had successState and onClearMessages, but they are not defined in the props.
              Assuming they are meant to be removed or handled differently if they were intended to be used.
              For now, removing them as they are not in the new_code's context. */}
          
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
                    />
                  </ErrorBoundary>
                }
              />
              <Route
                path='/classes'
                element={
                  <ErrorBoundary onError={handleError}>
                    <MyClassesView
                      combinedSchedule={combinedSchedule}
                      onCompleteClass={(item) => {
                        if (item.course_id) {
                          onCompleteClass(item.course_id);
                        }
                      }}
                      onRemoveAvailability={async (date: string) => {
                        try {
                          await onRemoveAvailability(date);
                          return { success: true };
                        } catch (error) {
                          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
                        }
                      }}
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
                    />
                  </ErrorBoundary>
                }
              />
              <Route
                path='/attendance'
                element={
                  <ErrorBoundary onError={handleError}>
                    <AttendanceView
                      onAttendanceUpdate={() => {
                        // This will trigger a refresh of the data
                        console.log('[InstructorPortal] Attendance updated, should refresh data');
                      }}
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
                path='/timesheet'
                element={
                  <ErrorBoundary onError={handleError}>
                    <TimesheetPage />
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
