import React from 'react';
import { Box, CircularProgress, Typography, Chip } from '@mui/material';
import {
  Cached as CachedIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

type ChipColorType = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
type CircularProgressColorType = 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'inherit';

interface LoadingIndicatorProps {
  isLoading?: boolean;
  isFetching?: boolean;
  isStale?: boolean;
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  isLoading = false,
  isFetching = false,
  isStale = false,
  message = 'Loading...',
  size = 'medium',
}) => {
  const getSize = () => {
    switch (size) {
      case 'small':
        return 20;
      case 'large':
        return 60;
      default:
        return 40;
    }
  };

  const getStatus = (): { text: string; color: ChipColorType; icon: React.ReactElement } | null => {
    if (isLoading)
      return {
        text: 'Loading fresh data...',
        color: 'primary',
        icon: <RefreshIcon />,
      };
    if (isFetching)
      return { text: 'Updating...', color: 'secondary', icon: <CachedIcon /> };
    if (isStale)
      return {
        text: 'Data may be outdated',
        color: 'warning',
        icon: <CachedIcon />,
      };
    return null;
  };

  const status = getStatus();

  if (!isLoading && !isFetching && !isStale) {
    return null;
  }

  // Map chip color to valid CircularProgress color
  const getProgressColor = (): CircularProgressColorType => {
    if (!status?.color || status.color === 'default') return 'primary';
    return status.color as CircularProgressColorType;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        p: 2,
      }}
    >
      {(isLoading || isFetching) && (
        <CircularProgress
          size={getSize()}
          color={getProgressColor()}
        />
      )}

      {status && (
        <Chip
          icon={status.icon}
          label={status.text}
          color={status.color}
          variant={isStale ? 'outlined' : 'filled'}
          size='small'
        />
      )}

      {message && (
        <Typography variant='body2' color='text.secondary' align='center'>
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingIndicator;
