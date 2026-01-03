import React, { useState, ReactNode } from 'react';
import { IconButton, IconButtonProps, useTheme } from '@mui/material';

interface AnimatedIconProps extends IconButtonProps {
  children: ReactNode;
  animationType?: 'rotate' | 'pulse' | 'bounce' | 'scale' | 'shake' | 'glow';
  hoverEffect?: boolean;
  clickEffect?: boolean;
}

const AnimatedIcon: React.FC<AnimatedIconProps> = ({
  children,
  animationType = 'scale',
  hoverEffect = true,
  clickEffect = true,
  sx,
  onClick,
  ...props
}) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (clickEffect) {
      setIsClicked(true);
      setTimeout(() => setIsClicked(false), 200);
    }
    if (onClick) {
      onClick(event);
    }
  };

  const getAnimationStyles = () => {
    const baseStyles = {
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: 'scale(1) rotate(0deg)',
    };

    if (!hoverEffect && !clickEffect) {
      return baseStyles;
    }

    const hoverStyles = hoverEffect ? {
      '&:hover': {
        ...(animationType === 'rotate' && { transform: 'rotate(180deg)' }),
        ...(animationType === 'pulse' && { 
          animation: 'pulse 1s ease-in-out infinite',
        }),
        ...(animationType === 'bounce' && { 
          animation: 'bounce 0.6s ease-in-out',
        }),
        ...(animationType === 'scale' && { transform: 'scale(1.1)' }),
        ...(animationType === 'shake' && { 
          animation: 'shake 0.5s ease-in-out',
        }),
        ...(animationType === 'glow' && { 
          boxShadow: `0 0 20px ${theme.palette.primary.main}40`,
        }),
      },
    } : {};

    const clickStyles = clickEffect ? {
      '&:active': {
        transform: 'scale(0.95)',
      },
    } : {};

    return {
      ...baseStyles,
      ...hoverStyles,
      ...clickStyles,
    };
  };

  return (
    <IconButton
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      sx={{
        ...getAnimationStyles(),
        ...sx,
        '@keyframes pulse': {
          '0%': {
            transform: 'scale(1)',
          },
          '50%': {
            transform: 'scale(1.1)',
          },
          '100%': {
            transform: 'scale(1)',
          },
        },
        '@keyframes bounce': {
          '0%, 20%, 50%, 80%, 100%': {
            transform: 'translateY(0)',
          },
          '40%': {
            transform: 'translateY(-4px)',
          },
          '60%': {
            transform: 'translateY(-2px)',
          },
        },
        '@keyframes shake': {
          '0%, 100%': {
            transform: 'translateX(0)',
          },
          '10%, 30%, 50%, 70%, 90%': {
            transform: 'translateX(-2px)',
          },
          '20%, 40%, 60%, 80%': {
            transform: 'translateX(2px)',
          },
        },
      }}
      {...props}
    >
      {children}
    </IconButton>
  );
};

export default AnimatedIcon;
