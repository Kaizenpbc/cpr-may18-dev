import React from 'react';
import { Routes, Route } from 'react-router-dom';
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
import PrivacyPolicy from './pages/PrivacyPolicy';
import TestCSV from './pages/TestCSV';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import { NotificationProvider } from './contexts/NotificationContext';
import HRPortal from './components/portals/HRPortal';
import VendorPortal from './components/portals/VendorPortal';
import SessionWarning from './components/common/SessionWarning';
import LocationTracker from './components/LocationTracker';
import TransitionWrapper from './components/common/TransitionWrapper';

// QueryClient and ThemeProvider are provided by main.tsx — not duplicated here.

function App() {
  return (
    <SnackbarProvider>
      <RealtimeProvider>
        <NotificationProvider>
          <ErrorBoundary>
            <SessionWarning showAtMinutes={5} />
            <LocationTracker />
            <TransitionWrapper>
              <Routes>
                {/* Public routes */}
                <Route path='/login' element={<Login />} />
                <Route path='/recover-password' element={<RecoverPassword />} />
                <Route path='/forgot-password' element={<ForgotPassword />} />
                <Route path='/reset-password' element={<ResetPassword />} />
                <Route path='/test-csv' element={<TestCSV />} />
                <Route path='/privacy' element={<PrivacyPolicy />} />
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

                <Route
                  path="/hr"
                  element={
                    <PrivateRoute role="hr">
                      <HRPortal />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="/vendor/*"
                  element={
                    <PrivateRoute role="vendor">
                      <VendorPortal />
                    </PrivateRoute>
                  }
                />

                {/* Legacy route for backward compatibility */}
                <Route
                  path='/dashboard'
                  element={
                    <PrivateRoute>
                      <RoleBasedRouter />
                    </PrivateRoute>
                  }
                />

                <Route path='*' element={<NotFound />} />
              </Routes>
            </TransitionWrapper>
          </ErrorBoundary>
        </NotificationProvider>
      </RealtimeProvider>
    </SnackbarProvider>
  );
}

export default App;
