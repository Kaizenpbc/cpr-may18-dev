import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { CustomThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import ToastContainer from './components/common/ToastContainer';
import TokenValidationProvider from './components/TokenValidationProvider';
import App from './App';
import './index.css';

// Global error handlers (dev only)
if (import.meta.env.DEV) {
  window.onerror = (msg, url, line, col, error) => {
    console.error('[Global Error]', { msg, url, line, col, error });
    return false;
  };
  window.addEventListener('unhandledrejection', event => {
    console.error('[Unhandled Promise]', event.reason);
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const handleRootError = (error: Error, errorInfo: React.ErrorInfo) => {
  console.error('[Root Error Boundary] Critical application error:', error, errorInfo);
};

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary context="root_application" onError={handleRootError} showDetails={true}>
        <QueryClientProvider client={queryClient}>
          <CustomThemeProvider>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <AuthProvider>
                  <NetworkProvider>
                    <ToastProvider>
                      <TokenValidationProvider>
                        <App />
                      </TokenValidationProvider>
                      <ToastContainer />
                    </ToastProvider>
                  </NetworkProvider>
                </AuthProvider>
              </BrowserRouter>
            </LocalizationProvider>
          </CustomThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error('[main.tsx] Fatal Error', error);
  document.body.innerHTML = `
    <div style="color: red; padding: 20px;">
      <h1>Error</h1>
      <pre>${error instanceof Error ? error.message : 'Unknown error'}</pre>
    </div>
  `;
}
