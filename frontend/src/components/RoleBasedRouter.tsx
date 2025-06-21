import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box, Typography } from '@mui/material';
import InstructorPortal from '../components/portals/InstructorPortal';
import OrganizationPortalContainer from '../components/portals/organization/OrganizationPortalContainer';
import CourseAdminPortal from '../components/portals/courseAdmin/CourseAdminPortal';
import SuperAdminPortal from '../components/portals/SuperAdminPortal';
import AccountingPortal from '../components/portals/AccountingPortal';
import SystemAdminPortal from '../components/portals/SystemAdminPortal';
import { tokenService } from '../services/tokenService';

const RoleBasedRouter: React.FC = () => {
  const { user, loading, checkAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = tokenService.getAccessToken();
    if (token && !user && !loading) {
      checkAuth();
    }
  }, [user, loading, checkAuth]);

  useEffect(() => {
    // Redirect users to their role-specific URLs for better bookmarking and refresh behavior
    if (user && !loading) {
      const roleRoutes = {
        instructor: '/instructor/dashboard',
        organization: '/organization/dashboard',
        admin: '/admin/dashboard',
        accountant: '/accounting/dashboard',
        superadmin: '/superadmin/dashboard',
        sysadmin: '/sysadmin/dashboard',
      };

      const targetRoute = roleRoutes[user.role as keyof typeof roleRoutes];
      if (targetRoute) {
        console.log(
          `[Debug] RoleBasedRouter - Redirecting ${user.role} to ${targetRoute}`
        );
        navigate(targetRoute, { replace: true });
      }
    }
  }, [user, loading, navigate]);

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

  if (!user) {
    // Redirect to login page instead of just showing a message
    navigate('/login');
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

  // For direct access (when not redirecting), still render the appropriate portal
  // This ensures the component works even if the redirect hasn't happened yet
  switch (user.role) {
    case 'instructor':
      return <InstructorPortal />;
    case 'organization':
      return <OrganizationPortalContainer />;
    case 'admin':
      return <CourseAdminPortal />;
    case 'accountant':
      return <AccountingPortal />;
    case 'superadmin':
      return <SuperAdminPortal />;
    case 'sysadmin':
      return <SystemAdminPortal />;
    default:
      return (
        <Box
          display='flex'
          justifyContent='center'
          alignItems='center'
          minHeight='60vh'
        >
          <Typography variant='h6' color='error'>
            Invalid user role: {user.role}. Please contact support.
          </Typography>
        </Box>
      );
  }
};

export default RoleBasedRouter;
