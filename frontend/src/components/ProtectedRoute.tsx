import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

/**
 * Props interface for the ProtectedRoute component.
 */
interface ProtectedRouteProps {
  /** The child components to render if the user is authenticated */
  children: React.ReactNode;
}

/**
 * A component that protects routes from unauthorized access.
 * Redirects to the login page if the user is not authenticated,
 * while preserving the attempted URL for post-login redirection.
 *
 * @example
 * ```tsx
 * <Route
 *   path="/dashboard"
 *   element={
 *     <ProtectedRoute>
 *       <Dashboard />
 *     </ProtectedRoute>
 *   }
 * />
 * ```
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Wait for auth check to complete before making redirect decision
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page but save the attempted url
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
