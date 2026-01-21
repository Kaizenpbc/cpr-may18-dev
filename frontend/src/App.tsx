import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import PrivateRoute from './components/PrivateRoute';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import RoleBasedRouter from './components/RoleBasedRouter';
import InstructorPortal from './components/portals/InstructorPortalContainer';
import OrganizationPortal from './components/portals/organization/OrganizationPortalContainer';
import CourseAdminPortal from './components/portals/courseAdmin/CourseAdminPortalContainer';
import SuperAdminPortal from './components/portals/SuperAdminPortal';
import AccountingPortal from './components/portals/AccountingPortal.tsx';
import SystemAdminPortal from './components/portals/SystemAdminPortal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import RecoverPassword from './pages/RecoverPassword';
import TestCSV from './pages/TestCSV';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import { CustomThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import HRPortal from './components/portals/HRPortal';
import VendorPortal from './components/portals/VendorPortal';
import SessionWarning from './components/common/SessionWarning';
import LocationTracker from './components/LocationTracker';
import TransitionWrapper from './components/common/TransitionWrapper';

console.log('[DEEP TRACE] App.tsx - Starting to load dependencies');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  console.log('[DEEP TRACE] App.tsx - Rendering App component');

  useEffect(() => {
    console.log('[DEEP TRACE] App component mounted');
    return () => {
      console.log('[DEEP TRACE] App component unmounted');
    };
  }, []);

  try {
    console.log('[DEEP TRACE] App.tsx - Starting to render providers and router');
    return (
      <CustomThemeProvider>
        <QueryClientProvider client={queryClient}>
          <SnackbarProvider>
            <RealtimeProvider>
              <NotificationProvider>
              <ErrorBoundary>
                {/* Session Warning Component */}
                <SessionWarning showAtMinutes={5} />
                
                {/* Location Tracker for preserving user location */}
                <LocationTracker />
              
              <TransitionWrapper>
                <Routes>
                  {/* Public routes */}
                  <Route path='/login' element={<Login />} />
                  <Route path='/recover-password' element={<RecoverPassword />} />
                  <Route path='/forgot-password' element={<ForgotPassword />} />
                  <Route path='/reset-password' element={<ResetPassword />} />
                  <Route path='/test-csv' element={<TestCSV />} />
                  <Route path='/' element={<RoleBasedRouter />} />

                {/* Protected routes */}
                <Route
                  path='/instructor/*'
                  element={
                    <PrivateRoute role='instructor'>
                      <InstructorPortal />
                    </PrivateRoute>
                  }
                />

                <Route
                  path='/organization/*'
                  element={
                    <PrivateRoute role='organization'>
                      <OrganizationPortal />
                    </PrivateRoute>
                  }
                />

                <Route
                  path='/admin/*'
                  element={
                    <PrivateRoute role='admin'>
                      <CourseAdminPortal />
                    </PrivateRoute>
                  }
                />

                <Route
                  path='/accounting/*'
                  element={
                    <PrivateRoute role='accountant'>
                      <AccountingPortal />
                    </PrivateRoute>
                  }
                />

                <Route
                  path='/superadmin/*'
                  element={
                    <PrivateRoute role='superadmin'>
                      <SuperAdminPortal />
                    </PrivateRoute>
                  }
                />

                <Route
                  path='/sysadmin/*'
                  element={
                    <PrivateRoute role='sysadmin'>
                      <SystemAdminPortal />
                    </PrivateRoute>
                  }
                />

                {/* HR Portal Route */}
                <Route 
                  path="/hr" 
                  element={
                    <PrivateRoute role="hr">
                      <HRPortal />
                    </PrivateRoute>
                  } 
                />

                {/* Vendor Portal Route */}
                <Route 
                  path="/vendor/*" 
                  element={
                    <PrivateRoute role="vendor">
                      <VendorPortal />
                    </PrivateRoute>
                  } 
                />

                {/* Legacy routes for backward compatibility */}
                <Route
                  path='/dashboard'
                  element={
                    <PrivateRoute>
                      <RoleBasedRouter />
                    </PrivateRoute>
                  }
                />

                  {/* Fallback for unknown routes */}
                  <Route path='*' element={<NotFound />} />
                </Routes>
              </TransitionWrapper>
              </ErrorBoundary>
              </NotificationProvider>
            </RealtimeProvider>
          </SnackbarProvider>
        </QueryClientProvider>
      </CustomThemeProvider>
    );
  } catch (error) {
    console.error('[DEEP TRACE] App.tsx - Error during render:', error);
    throw error;
  }
}

console.log('[DEEP TRACE] App.tsx - Exporting App component');
export default App;
