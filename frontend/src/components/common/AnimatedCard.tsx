import React, { useState, ReactNode } from 'react';
import { Card, CardProps, useTheme } from '@mui/material';

interface AnimatedCardProps extends CardProps {
  children: ReactNode;
  animationType?: 'lift' | 'glow' | 'scale' | 'tilt' | 'shadow';
  hoverEffect?: boolean;
  clickable?: boolean;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  animationType = 'lift',
  hoverEffect = true,
  clickable = false,
  sx,
  onClick,
  ...props
}) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const getAnimationStyles = () => {
    const baseStyles = {
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: 'translateY(0) rotateX(0) rotateY(0)',
      boxShadow: theme.shadows[2],
      cursor: clickable ? 'pointer' : 'default',
    };

    if (!hoverEffect) {
      return baseStyles;
    }

    switch (animationType) {
      case 'lift':
        return {
          ...baseStyles,
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: theme.shadows[12],
          },
        };

      case 'glow':
        return {
          ...baseStyles,
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 32px ${theme.palette.primary.main}20`,
            border: `1px solid ${theme.palette.primary.main}30`,
          },
        };

      case 'scale':
        return {
          ...baseStyles,
          '&:hover': {
            transform: 'scale(1.02)',
            boxShadow: theme.shadows[8],
          },
        };

      case 'tilt':
        return {
          ...baseStyles,
          '&:hover': {
            transform: 'translateY(-4px) rotateX(5deg) rotateY(5deg)',
            boxShadow: theme.shadows[10],
          },
        };

      case 'shadow':
        return {
          ...baseStyles,
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[16],
          },
        };

      default:
        return baseStyles;
    }
  };

  return (
    <Card
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      sx={{
        ...getAnimationStyles(),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Card>
  );
};

export default AnimatedCard;