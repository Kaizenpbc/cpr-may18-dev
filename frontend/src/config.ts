// API configuration
export const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
export const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

// Cookie configuration
export const COOKIE_CONFIG = {
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const config = {
  apiUrl: API_URL,
  wsUrl: WS_URL,
};

export default config;
