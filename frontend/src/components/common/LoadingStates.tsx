import React from 'react';
import { 
  Box, 
  Skeleton, 
  LinearProgress, 
  CircularProgress, 
  Typography,
  useTheme 
} from '@mui/material';

interface SkeletonLoaderProps {
  variant?: 'text' | 'rectangular' | 'circular';
  width?: number | string;
  height?: number | string;
  animation?: 'pulse' | 'wave' | false;
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'rectangular',
  width = '100%',
  height = 20,
  animation = 'wave',
  count = 1,
}) => {
  return (
    <Box>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={index}
          variant={variant}
          width={width}
          height={height}
          animation={animation}
          sx={{ mb: 1 }}
        />
      ))}
    </Box>
  );
};

interface ProgressBarProps {
  value?: number;
  variant?: 'determinate' | 'indeterminate' | 'buffer' | 'query';
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  size?: 'small' | 'medium' | 'large';
  label?: string;
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value = 0,
  variant = 'determinate',
  color = 'primary',
  size = 'medium',
  label,
  showPercentage = false,
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ width: '100%' }}>
      {label && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {label}
        </Typography>
      )}
      <LinearProgress
        variant={variant}
        value={value}
        color={color}
        sx={{
          height: size === 'small' ? 4 : size === 'large' ? 8 : 6,
          borderRadius: 2,
          backgroundColor: theme.palette.grey[200],
          '& .MuiLinearProgress-bar': {
            borderRadius: 2,
          },
        }}
      />
      {showPercentage && variant === 'determinate' && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {Math.round(value)}%
        </Typography>
      )}
    </Box>
  );
};

interface CircularLoaderProps {
  size?: number;
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  variant?: 'determinate' | 'indeterminate';
  value?: number;
  label?: string;
  thickness?: number;
}

export const CircularLoader: React.FC<CircularLoaderProps> = ({
  size = 40,
  color = 'primary',
  variant = 'indeterminate',
  value = 0,
  label,
  thickness = 3.6,
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <CircularProgress
        size={size}
        color={color}
        variant={variant}
        value={value}
        thickness={thickness}
      />
      {label && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {label}
        </Typography>
      )}
    </Box>
  );
};

interface CardSkeletonProps {
  showAvatar?: boolean;
  showActions?: boolean;
  lines?: number;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  showAvatar = false,
  showActions = false,
  lines = 3,
}) => {
  return (
    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
      {showAvatar && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={20} />
            <Skeleton variant="text" width="40%" height={16} />
          </Box>
        </Box>
      )}
      
      <SkeletonLoader count={lines} />
      
      {showActions && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
          <Skeleton variant="rectangular" width={80} height={32} />
          <Skeleton variant="rectangular" width={80} height={32} />
        </Box>
      )}
    </Box>
  );
};

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
}) => {
  return (
    <Box>
      {showHeader && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} variant="text" width="100%" height={24} />
          ))}
        </Box>
      )}
      
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <Box key={rowIndex} sx={{ display: 'flex', gap: 2, mb: 1 }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" width="100%" height={20} />
          ))}
        </Box>
      ))}
    </Box>
  );
};

export default {
  SkeletonLoader,
  ProgressBar,
  CircularLoader,
  CardSkeleton,
  TableSkeleton,
};
