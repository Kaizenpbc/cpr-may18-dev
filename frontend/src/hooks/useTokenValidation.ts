import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tokenService } from '../services/tokenService';

interface UseTokenValidationReturn {
  validateToken: () => Promise<{
    isValid: boolean;
    error?: string;
    requiresReauth: boolean;
  }>;
  validateAndRedirect: () => Promise<boolean>;
  clearTokensAndRedirect: () => void;
}

/**
 * Custom hook for token validation functionality
 * Provides methods to validate tokens and handle authentication issues
 */
export const useTokenValidation = (): UseTokenValidationReturn => {
  const { validateTokenOnPageLoad } = useAuth();

  const validateToken = useCallback(async () => {
    try {
      console.log('[TOKEN VALIDATION HOOK] Starting token validation');
      const result = await validateTokenOnPageLoad();
      
      if (!result.isValid && result.requiresReauth) {
        console.log('[TOKEN VALIDATION HOOK] Token invalid, clearing tokens');
        tokenService.clearTokens();
        tokenService.clearSavedLocation();
        sessionStorage.removeItem('location_restoration_attempted');
      }
      
      return {
        isValid: result.isValid,
        error: result.error,
        requiresReauth: result.requiresReauth
      };
    } catch (error) {
      console.error('[TOKEN VALIDATION HOOK] Validation error:', error);
      return {
        isValid: false,
        error: 'Token validation failed',
        requiresReauth: true
      };
    }
  }, [validateTokenOnPageLoad]);

  const validateAndRedirect = useCallback(async (): Promise<boolean> => {
    const result = await validateToken();
    
    if (!result.isValid && result.requiresReauth) {
      console.log('[TOKEN VALIDATION HOOK] Redirecting to login due to validation failure');
      window.location.href = '/login';
      return false;
    }
    
    return result.isValid;
  }, [validateToken]);

  const clearTokensAndRedirect = useCallback(() => {
    console.log('[TOKEN VALIDATION HOOK] Clearing tokens and redirecting to login');
    tokenService.clearTokens();
    tokenService.clearSavedLocation();
    sessionStorage.removeItem('location_restoration_attempted');
    window.location.href = '/login';
  }, []);

  return {
    validateToken,
    validateAndRedirect,
    clearTokensAndRedirect
  };
}; 