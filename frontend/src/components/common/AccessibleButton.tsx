import React, { forwardRef } from 'react';
import { Button, ButtonProps, CircularProgress } from '@mui/material';
import { useAccessibility } from '../../hooks/useAccessibility';

interface AccessibleButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  announceOnClick?: boolean;
  announceText?: string;
}

const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ 
    children, 
    loading = false, 
    loadingText = 'Loading...', 
    announceOnClick = false,
    announceText,
    disabled,
    onClick,
    ...props 
  }, ref) => {
    const { announceToScreenReader } = useAccessibility();

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (announceOnClick && announceText) {
        announceToScreenReader(announceText);
      }
      
      if (onClick) {
        onClick(event);
      }
    };

    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        onClick={handleClick}
        aria-label={loading ? loadingText : props['aria-label']}
        aria-disabled={disabled || loading}
        {...props}
        sx={{
          position: 'relative',
          minHeight: '44px', // Minimum touch target size
          minWidth: '44px',
          ...props.sx,
        }}
      >
        {loading && (
          <CircularProgress
            size={20}
            sx={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              marginLeft: '-10px',
              marginTop: '-10px',
            }}
            aria-hidden="true"
          />
        )}
        <span style={{ opacity: loading ? 0 : 1 }}>
          {children}
        </span>
      </Button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';

export default AccessibleButton;
