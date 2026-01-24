import React from 'react';
import { Alert, Snackbar } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import logger from '../../utils/logger';

const ErrorDisplay = () => {
  const { error } = useAuth();

  // Don't show anything if there's no error
  if (!error) {
    return null;
  }

  // Determine severity based on error content
  const getSeverity = (): 'error' | 'warning' | 'info' => {
    const errorLower = error.toLowerCase();
    if (errorLower.includes('connection') || errorLower.includes('network') || errorLower.includes('server')) {
      return 'error';
    }
    if (errorLower.includes('auth') || errorLower.includes('login') || errorLower.includes('session')) {
      return 'warning';
    }
    return 'info';
  };

  logger.debug('ErrorDisplay rendering:', { error });

  return (
    <Snackbar
      open={true}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ mt: 8 }} // Add margin top to avoid overlapping with app bar
    >
      <Alert
        severity={getSeverity()}
        sx={{ width: '100%' }}
      >
        {error}
      </Alert>
    </Snackbar>
  );
};

export default ErrorDisplay;
