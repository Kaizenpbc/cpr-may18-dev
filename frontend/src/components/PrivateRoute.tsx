import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { tokenService } from '../services/tokenService';
import { CircularProgress, Box } from '@mui/material';

interface PrivateRouteProps {
  children: React.ReactNode;
  role?: string;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  role,
}) => {
  const { user, loading, checkAuth } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const token = tokenService.getAccessToken();
    if (token && !user && !loading) {
      checkAuth();
    }
  }, [user, loading, checkAuth]);

  // Show loading while authentication is being checked
  if (loading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        minHeight='60vh'
      >
        <CircularProgress />
      </Box>
    );
  }

  // If not authenticated and no token exists, redirect to login
  if (!user && !tokenService.getAccessToken()) {
    // Save the current location so we can redirect back after login
    tokenService.saveCurrentLocation(location.pathname);
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

  // If we have a token but no user yet, continue showing loading
  // This handles the case where authentication is still being verified
  if (tokenService.getAccessToken() && !user) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        minHeight='60vh'
      >
        <CircularProgress />
      </Box>
    );
  }

  // If we don't have a user at this point, something went wrong
  if (!user) {
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

      // Check role requirements
    if (role && user.role !== role) {
      // Redirect to their appropriate dashboard based on role
      const roleRoutes = {
        instructor: '/instructor/dashboard',
        organization: '/organization/dashboard',
        admin: '/admin/dashboard',
        accountant: '/accounting/dashboard',
        superadmin: '/superadmin/dashboard',
        sysadmin: '/sysadmin/dashboard',
        hr: '/hr',
        vendor: '/vendor/dashboard',
      };

      const targetRoute = roleRoutes[user.role as keyof typeof roleRoutes] || '/';
      return <Navigate to={targetRoute} replace />;
    }

  return <>{children}</>;
};

export default PrivateRoute;
