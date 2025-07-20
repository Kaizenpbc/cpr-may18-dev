import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { tokenService } from '../services/tokenService';
import api from '../services/api';

interface User {
  id: number;
  username: string;
  role: string;
  organizationId?: number;
  organizationName?: string;
}

interface SessionStatus {
  hasToken: boolean;
  expiresAt: Date | null;
  timeUntilExpiry: number | null;
  isExpired: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  sessionStatus: SessionStatus | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const navigate = useNavigate();

  const checkAuth = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = tokenService.getAccessToken();
      console.log('[TRACE] Auth check - Token present:', !!token);
      
      if (!token) {
        console.log('[TRACE] Auth check - No token found, skipping auth check');
        setUser(null);
        setSessionStatus(null);
        return;
      }

      console.log('[TRACE] Auth check - Verifying token with backend');
      const userData = await authService.checkAuth();
      console.log('[TRACE] Auth check - User data received:', userData);
      setUser(userData);
      
      // Update session status
      const status = authService.getSessionStatus();
      setSessionStatus(status);
      
      console.log('[TRACE] Auth check - Authentication successful');
    } catch (err) {
      console.error('[TRACE] Auth check - Error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setUser(null);
      setSessionStatus(null);
      
      // Only clear tokens on actual auth failures, not network issues
      if (err instanceof Error && err.message.includes('401')) {
        tokenService.clearTokens();
        // Clear any saved location and restoration flags on auth failure
        tokenService.clearSavedLocation();
        sessionStorage.removeItem('location_restoration_attempted');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      console.log('[TRACE] Auth context - Refreshing session');
      await authService.refreshToken();
      
      // Update session status
      const status = authService.getSessionStatus();
      setSessionStatus(status);
      
      console.log('[TRACE] Auth context - Session refreshed successfully');
    } catch (err) {
      console.error('[TRACE] Auth context - Session refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Session refresh failed');
      // Don't clear user here, let the next API call handle it
    }
  };

  // Monitor session status
  useEffect(() => {
    const updateSessionStatus = () => {
      if (user) {
        const status = authService.getSessionStatus();
        setSessionStatus(status);
        
        // Show warning if session is expiring soon
        if (status.timeUntilExpiry && status.timeUntilExpiry < 300000 && status.timeUntilExpiry > 0) {
          console.log('[TRACE] Auth context - Session expiring soon, showing warning');
          // You could show a notification here
        }
      }
    };

    const interval = setInterval(updateSessionStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    console.log('[TRACE] Auth context - Initial check');
    checkAuth();
  }, []);

  // Handle location restoration after successful authentication
  useEffect(() => {
    if (user && !loading) {
      const currentFullPath = window.location.pathname + window.location.search + window.location.hash;
      const savedLocation = tokenService.getSavedLocation();
      
      // Add a flag to prevent infinite loops
      const restorationAttempted = sessionStorage.getItem('location_restoration_attempted');
      
      if (savedLocation && savedLocation !== currentFullPath && !restorationAttempted) {
        // Check if we're on a default dashboard route
        const isDefaultRoute = currentFullPath.match(/\/\w+\/dashboard$/);
        
        // Only restore if the saved location is appropriate for the current user's role
        const isSavedLocationAppropriate = () => {
          // Don't restore if saved location is for a different role
          const roleRoutes = {
            instructor: '/instructor',
            organization: '/organization',
            admin: '/admin',
            accountant: '/accounting',
            superadmin: '/superadmin',
            sysadmin: '/sysadmin',
            hr: '/hr',
            vendor: '/vendor',
          };
          
          const userRolePrefix = roleRoutes[user.role as keyof typeof roleRoutes];
          if (userRolePrefix && !savedLocation.startsWith(userRolePrefix)) {
            console.log('[TRACE] Auth context - Saved location not appropriate for user role:', {
              userRole: user.role,
              savedLocation,
              userRolePrefix
            });
            return false;
          }
          
          return true;
        };
        
        if (isDefaultRoute && isSavedLocationAppropriate()) {
          console.log('[TRACE] Auth context - Restoring saved location:', savedLocation);
          // Mark that we've attempted restoration to prevent loops
          sessionStorage.setItem('location_restoration_attempted', 'true');
          tokenService.clearSavedLocation();
          // Use setTimeout to ensure navigation happens after state updates
          setTimeout(() => {
            navigate(savedLocation, { replace: true });
          }, 100);
        } else {
          // Clear saved location if we're already on a specific page or location is inappropriate
          console.log('[TRACE] Auth context - Clearing saved location (not default route or inappropriate)');
          tokenService.clearSavedLocation();
        }
      } else if (restorationAttempted) {
        // Clear the flag if we're not attempting restoration
        sessionStorage.removeItem('location_restoration_attempted');
      }
    }
  }, [user, loading, navigate]);

  const login = async (username: string, password: string) => {
    console.log('[DEEP TRACE] AuthContext.login - Starting login process:', {
      username,
      timestamp: new Date().toISOString()
    });
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('[DEEP TRACE] AuthContext.login - Calling authService.login');
      const response = await authService.login(username, password);
      console.log('[DEEP TRACE] AuthContext.login - Login response received:', {
        user: response.user,
        timestamp: new Date().toISOString()
      });
      
      setUser(response.user);
      
      // Update session status
      const status = authService.getSessionStatus();
      setSessionStatus(status);
      
      console.log('[DEEP TRACE] AuthContext.login - User state updated');

      // Navigate based on user role
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

      const targetRoute = roleRoutes[response.user.role as keyof typeof roleRoutes] || '/';
      console.log('[DEEP TRACE] AuthContext.login - Navigating to:', {
        role: response.user.role,
        targetRoute,
        timestamp: new Date().toISOString()
      });
      
      navigate(targetRoute);
      console.log('[DEEP TRACE] AuthContext.login - Navigation completed');
    } catch (err) {
      console.error('[DEEP TRACE] AuthContext.login - Error occurred:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
      console.log('[DEEP TRACE] AuthContext.login - Login process completed');
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
      setUser(null);
      setSessionStatus(null);
      tokenService.clearTokens();
      // Clear any saved location and restoration flags
      tokenService.clearSavedLocation();
      sessionStorage.removeItem('location_restoration_attempted');
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  const isAuthenticated = !!user && !!tokenService.getAccessToken();

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      isAuthenticated, 
      sessionStatus,
      login, 
      logout, 
      checkAuth,
      refreshSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};
