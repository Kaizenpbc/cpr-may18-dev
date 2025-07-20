console.log('Initializing tokenService');

const ACCESS_TOKEN_KEY = 'accessToken';
const LAST_LOCATION_KEY = 'lastLocation';
const SESSION_SYNC_KEY = 'sessionSync';
const TOKEN_EXPIRY_KEY = 'tokenExpiry';

// In-memory token storage for better security
let inMemoryToken: string | null = null;
let tokenExpiry: number | null = null;
let refreshTimer: NodeJS.Timeout | null = null;
let sessionSyncTimer: NodeJS.Timeout | null = null;

/**
 * Enhanced token service that handles access token storage and retrieval.
 * Implements best practices: in-memory tokens, silent refresh, multi-tab sync.
 */
class TokenService {
  constructor() {
    this.initializeSessionSync();
    this.initializeTokenRefresh();
  }

  /**
   * Gets the current access token from in-memory storage.
   * @returns The current access token or null if not found
   */
  getAccessToken(): string | null {
    // First check in-memory storage
    if (inMemoryToken) {
      // Check if token is expired
      if (tokenExpiry && Date.now() > tokenExpiry) {
        console.log('[TRACE] Token service - Token expired, clearing');
        this.clearTokens();
        return null;
      }
      return inMemoryToken;
    }

    // If not in memory, try to restore from sessionStorage
    try {
      const storedToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
      const storedExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
      
      if (storedToken && storedExpiry) {
        const expiryTime = parseInt(storedExpiry);
        
        // Check if token is expired
        if (Date.now() > expiryTime) {
          console.log('[TRACE] Token service - Stored token expired, clearing');
          this.clearTokens();
          return null;
        }
        
        // Restore token to memory
        inMemoryToken = storedToken;
        tokenExpiry = expiryTime;
        
        // Schedule refresh
        this.scheduleTokenRefresh();
        
        console.log('[TRACE] Token service - Token restored from storage');
        return inMemoryToken;
      }
    } catch (error) {
      console.error('[TRACE] Token service - Error restoring token from storage:', error);
    }
    
    return null;
  }

  /**
   * Sets the access token in in-memory storage and sessionStorage.
   * @param token - The access token to store
   * @param expiresIn - Optional expiration time in seconds
   */
  setAccessToken(token: string, expiresIn?: number): void {
    // Ensure token is properly formatted
    const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    inMemoryToken = formattedToken;
    
    // Calculate expiry time (default to 15 minutes if not provided)
    if (expiresIn) {
      tokenExpiry = Date.now() + (expiresIn * 1000);
    } else {
      // Default to 15 minutes from now
      tokenExpiry = Date.now() + (15 * 60 * 1000);
    }

    // Store token in sessionStorage for persistence across page refreshes
    try {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, formattedToken);
      localStorage.setItem(TOKEN_EXPIRY_KEY, tokenExpiry.toString());
    } catch (error) {
      console.error('[TRACE] Token service - Error storing token:', error);
    }
    
    // Schedule token refresh 5 minutes before expiry
    this.scheduleTokenRefresh();
    
    console.log('[TRACE] Token service - Access token set, expires at:', new Date(tokenExpiry));
  }

  /**
   * Gets the current refresh token from cookies.
   * Note: This is handled by the browser automatically.
   * @returns Always returns null as the refresh token is in an HTTP-only cookie
   */
  getRefreshToken(): null {
    return null; // Refresh token is managed by HTTP-only cookies
  }

  /**
   * Sets the refresh token.
   * Note: This is handled by the backend via HTTP-only cookies.
   */
  setRefreshToken(): void {
    console.log('[TRACE] Token service - Setting refresh token (HTTP-only cookie)');
    // No-op: refresh token is managed by HTTP-only cookies
  }

  /**
   * Schedules automatic token refresh 5 minutes before expiry
   */
  private scheduleTokenRefresh(): void {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }

    if (!tokenExpiry) return;

    const timeUntilRefresh = tokenExpiry - Date.now() - (5 * 60 * 1000); // 5 minutes before expiry
    
    if (timeUntilRefresh > 0) {
      refreshTimer = setTimeout(() => {
        this.refreshTokenSilently();
      }, timeUntilRefresh);
      
      console.log('[TRACE] Token service - Token refresh scheduled in', Math.round(timeUntilRefresh / 1000), 'seconds');
    } else {
      // Token expires in less than 5 minutes, refresh immediately
      this.refreshTokenSilently();
    }
  }

  /**
   * Attempts to refresh the token silently
   */
  private async refreshTokenSilently(): Promise<void> {
    try {
      console.log('[TRACE] Token service - Attempting silent token refresh');
      
      // Import authService dynamically to avoid circular dependencies
      const { authService } = await import('./authService');
      
      // Call the refresh endpoint
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.accessToken) {
          // Update the token
          this.setAccessToken(data.data.accessToken);
          console.log('[TRACE] Token service - Silent refresh successful');
          
          // Notify other tabs
          this.broadcastSessionUpdate('tokenRefreshed');
        }
      } else {
        console.warn('[TRACE] Token service - Silent refresh failed, will retry on next request');
      }
    } catch (error) {
      console.error('[TRACE] Token service - Silent refresh error:', error);
      // Don't clear tokens here, let the next API call handle it
    }
  }

  /**
   * Saves the current location for restoration after login
   * @param location - The current pathname to save
   */
  saveCurrentLocation(location: string): void {
    // Don't save login/auth pages
    if (
      !location.includes('/login') &&
      !location.includes('/forgot-password') &&
      !location.includes('/reset-password')
    ) {
      console.log('[TRACE] Token service - Saving current location:', location);
      sessionStorage.setItem(LAST_LOCATION_KEY, location);
    }
  }

  /**
   * Saves the current full URL for restoration after login
   * This includes pathname, search params, and hash
   */
  saveCurrentFullLocation(): void {
    const fullLocation = window.location.pathname + window.location.search + window.location.hash;
    
    // Don't save login/auth pages
    if (
      !fullLocation.includes('/login') &&
      !fullLocation.includes('/forgot-password') &&
      !fullLocation.includes('/reset-password')
    ) {
      console.log('[TRACE] Token service - Saving full location:', fullLocation);
      sessionStorage.setItem(LAST_LOCATION_KEY, fullLocation);
    }
  }

  /**
   * Gets the saved location for restoration after login
   * @returns The saved location or null
   */
  getSavedLocation(): string | null {
    const location = sessionStorage.getItem(LAST_LOCATION_KEY);
    console.log('[TRACE] Token service - Getting saved location:', location);
    return location;
  }

  /**
   * Clears the saved location
   */
  clearSavedLocation(): void {
    console.log('[TRACE] Token service - Clearing saved location');
    sessionStorage.removeItem(LAST_LOCATION_KEY);
  }

  /**
   * Clears all tokens from storage.
   */
  clearTokens(): void {
    inMemoryToken = null;
    tokenExpiry = null;
    
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    
    // Clear from all storage locations
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    
    console.log('[TRACE] Token service - All tokens cleared');
  }

  /**
   * Checks if both access and refresh tokens exist.
   * @returns true if access token exists and is not expired, false otherwise
   */
  hasTokens(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Gets the authorization header with the current access token
   */
  getAuthHeader() {
    const token = this.getAccessToken();
    return token ? { Authorization: token } : {};
  }

  /**
   * Initializes multi-tab session synchronization
   */
  private initializeSessionSync(): void {
    // Listen for storage events from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === SESSION_SYNC_KEY) {
        try {
          const data = JSON.parse(event.newValue || '{}');
          this.handleSessionSync(data);
        } catch (error) {
          console.error('[TRACE] Token service - Session sync parse error:', error);
        }
      }
    });

    // Listen for custom events for same-tab communication
    window.addEventListener('sessionSync', ((event: CustomEvent) => {
      this.handleSessionSync(event.detail);
    }) as EventListener);

    // Broadcast session status every 30 seconds
    sessionSyncTimer = setInterval(() => {
      this.broadcastSessionUpdate('heartbeat');
    }, 30000);
  }

  /**
   * Handles session synchronization events
   */
  private handleSessionSync(data: any): void {
    console.log('[TRACE] Token service - Session sync received:', data);
    
    switch (data.type) {
      case 'tokenRefreshed':
        // Another tab refreshed the token, update our local state
        if (data.token && data.expiry) {
          inMemoryToken = data.token;
          tokenExpiry = data.expiry;
          this.scheduleTokenRefresh();
        }
        break;
        
      case 'logout':
        // Another tab logged out, clear our tokens
        this.clearTokens();
        break;
        
      case 'heartbeat':
        // Another tab is active, extend our session
        if (data.token && data.expiry) {
          inMemoryToken = data.token;
          tokenExpiry = data.expiry;
          this.scheduleTokenRefresh();
        }
        break;
    }
  }

  /**
   * Broadcasts session updates to other tabs
   */
  private broadcastSessionUpdate(type: string, additionalData: any = {}): void {
    const data = {
      type,
      timestamp: Date.now(),
      token: inMemoryToken,
      expiry: tokenExpiry,
      ...additionalData
    };

    // Broadcast to other tabs via localStorage
    localStorage.setItem(SESSION_SYNC_KEY, JSON.stringify(data));
    
    // Broadcast to same tab via custom event
    window.dispatchEvent(new CustomEvent('sessionSync', { detail: data }));
    
    // Clear the storage event after a short delay
    setTimeout(() => {
      localStorage.removeItem(SESSION_SYNC_KEY);
    }, 100);
  }

  /**
   * Initializes token refresh monitoring
   */
  private initializeTokenRefresh(): void {
    // Check for existing token on page load
    const storedExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (storedExpiry) {
      const expiry = parseInt(storedExpiry);
      if (expiry > Date.now()) {
        // Token is still valid, schedule refresh
        tokenExpiry = expiry;
        this.scheduleTokenRefresh();
      } else {
        // Token is expired, clear it
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
      }
    }

    // Monitor page visibility for activity-based session extension
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.hasTokens()) {
        // Page became visible, check if we need to refresh
        this.scheduleTokenRefresh();
      }
    });

    // Monitor user activity for session extension
    let activityTimer: NodeJS.Timeout | null = null;
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const resetActivityTimer = () => {
      if (activityTimer) {
        clearTimeout(activityTimer);
      }
      
      activityTimer = setTimeout(() => {
        if (this.hasTokens()) {
          // User is active, extend session if needed
          this.scheduleTokenRefresh();
        }
      }, 60000); // Check every minute of activity
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, resetActivityTimer, { passive: true });
    });
  }

  /**
   * Force clear all authentication and redirect to login
   * Can be called from browser console: tokenService.forceLogout()
   * This is the only method that should force navigation
   */
  forceLogout(): void {
    console.log('[TRACE] Token service - Force logout');
    
    // Save current location before clearing
    this.saveCurrentFullLocation();

    // Clear tokens
    this.clearTokens();

    // Clear all sessionStorage
    sessionStorage.clear();

    // Broadcast logout to other tabs
    this.broadcastSessionUpdate('logout');

    // Clear timers
    if (sessionSyncTimer) {
      clearInterval(sessionSyncTimer);
      sessionSyncTimer = null;
    }

    // Force a hard refresh to login
    window.location.href = '/login';
  }

  /**
   * Debug method to test location saving/restoration
   * Can be called from browser console: tokenService.debugLocation()
   */
  debugLocation(): void {
    console.log('[DEBUG] Token service - Current location:', window.location.href);
    console.log('[DEBUG] Token service - Saved location:', this.getSavedLocation());
    console.log('[DEBUG] Token service - Has token:', !!this.getAccessToken());
  }

  /**
   * Gets session status information
   */
  getSessionStatus(): {
    hasToken: boolean;
    expiresAt: Date | null;
    timeUntilExpiry: number | null;
    isExpired: boolean;
  } {
    const hasToken = !!this.getAccessToken();
    const expiresAt = tokenExpiry ? new Date(tokenExpiry) : null;
    const timeUntilExpiry = tokenExpiry ? tokenExpiry - Date.now() : null;
    const isExpired = tokenExpiry ? tokenExpiry <= Date.now() : true;

    return {
      hasToken,
      expiresAt,
      timeUntilExpiry,
      isExpired
    };
  }
}

export const tokenService = new TokenService();

console.log('TokenService initialized');

// Make tokenService globally available for debugging
(window as any).tokenService = tokenService;
