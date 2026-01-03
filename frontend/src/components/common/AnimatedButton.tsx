import React, { useState, ReactNode } from 'react';
import { Button, ButtonProps, useTheme } from '@mui/material';

interface AnimatedButtonProps extends ButtonProps {
  children: ReactNode;
  animationType?: 'lift' | 'glow' | 'scale' | 'bounce' | 'ripple';
  hoverEffect?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  animationType = 'lift',
  hoverEffect = true,
  loading = false,
  loadingText = 'Loading...',
  sx,
  disabled,
  ...props
}) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const getAnimationStyles = () => {
    const baseStyles = {
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: 'translateY(0)',
      boxShadow: theme.shadows[2],
    };

    if (!hoverEffect || disabled || loading) {
      return baseStyles;
    }

    switch (animationType) {
      case 'lift':
        return {
          ...baseStyles,
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[8],
          },
          '&:active': {
            transform: 'translateY(0)',
            boxShadow: theme.shadows[4],
          },
        };

      case 'glow':
        return {
          ...baseStyles,
          '&:hover': {
            boxShadow: `0 0 20px ${theme.palette.primary.main}40`,
            transform: 'translateY(-1px)',
          },
        };

      case 'scale':
        return {
          ...baseStyles,
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: theme.shadows[6],
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        };

      case 'bounce':
        return {
          ...baseStyles,
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: theme.shadows[8],
            animation: 'bounce 0.6s ease-in-out',
          },
        };

      case 'ripple':
        return {
          ...baseStyles,
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: theme.shadows[6],
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 'inherit',
              background: 'rgba(255, 255, 255, 0.1)',
              animation: 'ripple 0.6s ease-out',
            },
          },
        };

      default:
        return baseStyles;
    }
  };

  return (
    <Button
      disabled={disabled || loading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: '44px',
        minWidth: '44px',
        ...getAnimationStyles(),
        ...sx,
        '@keyframes bounce': {
          '0%, 20%, 50%, 80%, 100%': {
            transform: 'translateY(-3px)',
          },
          '40%': {
            transform: 'translateY(-6px)',
          },
          '60%': {
            transform: 'translateY(-4px)',
          },
        },
        '@keyframes ripple': {
          '0%': {
            transform: 'scale(0)',
            opacity: 1,
          },
          '100%': {
            transform: 'scale(4)',
            opacity: 0,
          },
        },
      }}
      {...props}
    >
      {loading ? loadingText : children}
    </Button>
  );
};

export default AnimatedButton;
