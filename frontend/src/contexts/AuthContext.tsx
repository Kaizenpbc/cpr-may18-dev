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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
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
        return;
      }

      console.log('[TRACE] Auth check - Verifying token with backend');
      const userData = await authService.checkAuth();
      console.log('[TRACE] Auth check - User data received:', userData);
      setUser(userData);
    } catch (err) {
      console.error('[TRACE] Auth check - Error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setUser(null);
      tokenService.clearTokens();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[TRACE] Auth context - Initial check');
    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.login(username, password);
      setUser(response.user);

      // Navigate based on user role
      const roleRoutes = {
        instructor: '/instructor/dashboard',
        organization: '/organization/dashboard',
        admin: '/admin/dashboard',
        accountant: '/accounting/dashboard',
        superadmin: '/superadmin/dashboard',
        sysadmin: '/sysadmin/dashboard',
      };

      const targetRoute = roleRoutes[response.user.role as keyof typeof roleRoutes] || '/';
      navigate(targetRoute);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
      setUser(null);
      tokenService.clearTokens();
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  const isAuthenticated = !!user && !!tokenService.getAccessToken();

  return (
    <AuthContext.Provider value={{ user, loading, error, isAuthenticated, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
