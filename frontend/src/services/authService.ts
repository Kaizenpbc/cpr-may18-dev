import { api } from './api';
import { tokenService } from './tokenService';
import { AxiosError } from 'axios';

interface LoginResponse {
  user: {
    id: number;
    username: string;
    role: string;
    organizationId?: number;
    organizationName?: string;
  };
  accessToken: string;
  sessionId?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Add request deduplication for auth checks
let authCheckPromise: Promise<any> | null = null;

/**
 * Authentication service that handles user authentication operations.
 * Includes methods for login, registration, logout, and token verification.
 */
export const authService = {
  /**
   * Authenticates a user with username and password.
   * @param username - The user's username
   * @param password - The user's password
   * @returns Promise with the authentication response
   * @throws Error if authentication fails
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    console.log('🔐 [AUTH] Frontend login attempt:', {
      username,
      timestamp: new Date().toISOString()
    });

    try {
      const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', {
        username: username.trim(),
        password
      });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Login failed');
      }

      const { user, accessToken, sessionId } = response.data.data;

      if (!accessToken) {
        throw new Error('No access token received from server');
      }

      console.log('✅ [AUTH] Frontend login response:', {
        status: response.status,
        hasAccessToken: true,
        hasSessionId: !!sessionId,
        user,
        timestamp: new Date().toISOString()
      });

      // Store access token and set in API headers
      tokenService.setAccessToken(accessToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      return response.data.data;
    } catch (error) {
      console.error('❌ [AUTH] Frontend login error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        response: error instanceof AxiosError ? {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        } : undefined,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  },

  /**
   * Registers a new user.
   * @param username - The new user's username
   * @param email - The new user's email
   * @param password - The new user's password
   * @returns Promise with the registration response
   * @throws Error if registration fails
   */
  async register(username: string, email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await api.post<ApiResponse<LoginResponse>>('/auth/register', {
        username,
        email,
        password,
      });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Registration failed');
      }

      const { user, accessToken } = response.data.data;

      // Store the tokens
      if (accessToken) {
        tokenService.setAccessToken(accessToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      }

      return response.data.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Logs out the current user.
   * @returns Promise that resolves when logout is complete
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      tokenService.clearTokens();
      delete api.defaults.headers.common['Authorization'];
    }
  },

  /**
   * Verifies the current authentication status.
   * @returns Promise with the verification response or false if not authenticated
   */
  async checkAuth() {
    // Return existing promise if one is already in progress
    if (authCheckPromise) {
      console.log('[TRACE] Auth service - Returning existing auth check promise');
      return authCheckPromise;
    }

    try {
      const token = tokenService.getAccessToken();
      console.log('[TRACE] Auth service - Token present:', !!token);
      
      if (!token) {
        console.log('[TRACE] Auth service - No access token found, returning null');
        return null;
      }

      // Ensure token is set in headers
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('[TRACE] Auth service - Token set in headers');

      console.log('[TRACE] Auth service - Checking authentication with backend');
      // Create and cache the promise
      authCheckPromise = api
        .get<ApiResponse<{ user: any }>>('/auth/me')
        .then(response => {
          if (!response.data.success || !response.data.data) {
            throw new Error(response.data.error?.message || 'Auth check failed');
          }
          const userData = response.data.data.user;
          console.log('[TRACE] Auth service - Authentication check successful for user:', userData.username);
          authCheckPromise = null; // Clear the promise cache
          return userData;
        })
        .catch(error => {
          console.error('[TRACE] Auth service - Authentication check failed:', {
            status: error.response?.status,
            message: error.message
          });

          // Only clear tokens if we get a 401 (unauthorized) or 403 (forbidden)
          if (error.response?.status === 401 || error.response?.status === 403) {
            console.log('[TRACE] Auth service - Clearing tokens due to authentication failure');
            tokenService.clearTokens();
            delete api.defaults.headers.common['Authorization'];
          }

          authCheckPromise = null; // Clear the promise cache
          throw error;
        });

      return authCheckPromise;
    } catch (error) {
      console.error('[TRACE] Auth service - Unexpected error:', error);
      throw error;
    }
  },

  /**
   * Gets the current access token.
   * @returns The current access token or null if not authenticated
   */
  getAccessToken() {
    return tokenService.getAccessToken();
  },

  /**
   * Checks if the user is currently authenticated.
   * @returns True if the user is authenticated, false otherwise
   */
  isAuthenticated() {
    return !!this.getAccessToken();
  },

  async recoverPassword(email: string): Promise<void> {
    console.log('[DEBUG] Attempting to recover password for:', email);
    try {
      const response = await api.post('/auth/recover-password', { email });
      console.log('[DEBUG] Password recovery response:', response.status);
      return response.data;
    } catch (error: any) {
      console.error('[DEBUG] Password recovery error:', error);
      throw new Error(error.response?.data?.message || 'Failed to send recovery email');
    }
  },
};
