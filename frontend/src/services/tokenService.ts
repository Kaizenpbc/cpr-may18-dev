console.log('Initializing tokenService');

const ACCESS_TOKEN_KEY = 'accessToken';
const LAST_LOCATION_KEY = 'lastLocation';

/**
 * Token service that handles access token storage and retrieval.
 * This is kept separate from authService to avoid circular dependencies.
 */
class TokenService {
  /**
   * Gets the current access token from sessionStorage.
   * @returns The current access token or null if not found
   */
  getAccessToken(): string | null {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    console.log('[TRACE] Token service - Getting access token:', !!token);
    return token;
  }

  /**
   * Sets the access token in sessionStorage.
   * @param token - The access token to store
   */
  setAccessToken(token: string): void {
    console.log('[TRACE] Token service - Setting access token');
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  /**
   * Gets the current refresh token from cookies.
   * Note: This is handled by the browser automatically.
   * @returns Always returns null as the refresh token is in an HTTP-only cookie
   */
  getRefreshToken(): null {
    console.log('[TRACE] Token service - Getting refresh token (HTTP-only cookie)');
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
    console.log('[TRACE] Token service - Clearing tokens');
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  /**
   * Checks if both access and refresh tokens exist in sessionStorage.
   * @returns true if both tokens exist, false otherwise
   */
  hasTokens(): boolean {
    const hasToken = !!this.getAccessToken();
    console.log('[TRACE] Token service - Checking if tokens exist:', hasToken);
    return hasToken;
  }

  /**
   * Gets the authorization header with the current access token
   */
  getAuthHeader() {
    const token = this.getAccessToken();
    console.log('[TRACE] Token service - Getting auth header - Token exists:', !!token);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Force clear all authentication and redirect to login
   * Can be called from browser console: tokenService.forceLogout()
   * This is the only method that should force navigation
   */
  forceLogout(): void {
    console.log('[TRACE] Token service - Force logout');
    // Save current location before clearing
    this.saveCurrentLocation(window.location.pathname);

    // Clear tokens
    this.clearTokens();

    // Clear all sessionStorage
    sessionStorage.clear();

    // Force a hard refresh to login
    window.location.href = '/login';
  }
}

export const tokenService = new TokenService();

console.log('TokenService initialized');

// Make tokenService globally available for debugging
(window as any).tokenService = tokenService;
