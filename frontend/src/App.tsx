import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import PrivateRoute from './components/PrivateRoute';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import RoleBasedRouter from './components/RoleBasedRouter';
import InstructorPortal from './components/portals/InstructorPortal';
import OrganizationPortal from './components/portals/OrganizationPortal';
import CourseAdminPortal from './components/portals/courseAdmin/CourseAdminPortal';
import SuperAdminPortal from './components/portals/SuperAdminPortal';
import AccountingPortal from './components/portals/AccountingPortal';
import SystemAdminPortal from './components/portals/SystemAdminPortal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import RecoverPassword from './pages/RecoverPassword';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RealtimeProvider } from './contexts/RealtimeContext';

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
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          <ErrorBoundary>
            <Routes>
              {/* Public routes */}
              <Route path='/login' element={<Login />} />
              <Route path='/recover-password' element={<RecoverPassword />} />
              <Route path='/forgot-password' element={<ForgotPassword />} />
              <Route path='/reset-password' element={<ResetPassword />} />
              <Route path='/' element={<Navigate to="/login" replace />} />

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
          </ErrorBoundary>
        </RealtimeProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error('[DEEP TRACE] App.tsx - Error during render:', error);
    throw error;
  }
}

console.log('[DEEP TRACE] App.tsx - Exporting App component');
export default App;
