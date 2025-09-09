import React, { ReactNode } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { useResponsive } from '../../hooks/useResponsive';

interface MobileOptimizedProps {
  children: ReactNode;
  mobileProps?: Record<string, any>;
  desktopProps?: Record<string, any>;
  tabletProps?: Record<string, any>;
  className?: string;
}

const MobileOptimized: React.FC<MobileOptimizedProps> = ({
  children,
  mobileProps = {},
  desktopProps = {},
  tabletProps = {},
  className,
}) => {
  const theme = useTheme();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  const isMobileBreakpoint = useMediaQuery(theme.breakpoints.down('sm'));
  const isTabletBreakpoint = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktopBreakpoint = useMediaQuery(theme.breakpoints.up('md'));

  // Determine which props to use based on screen size
  const getResponsiveProps = () => {
    if (isMobile || isMobileBreakpoint) {
      return {
        ...mobileProps,
        sx: {
          ...mobileProps.sx,
          // Mobile-specific optimizations
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        },
      };
    }
    
    if (isTablet || isTabletBreakpoint) {
      return {
        ...tabletProps,
        sx: {
          ...tabletProps.sx,
          // Tablet-specific optimizations
          touchAction: 'manipulation',
        },
      };
    }
    
    if (isDesktop || isDesktopBreakpoint) {
      return {
        ...desktopProps,
        sx: {
          ...desktopProps.sx,
          // Desktop-specific optimizations
          cursor: 'pointer',
        },
      };
    }
    
    return {};
  };

  return (
    <Box
      className={className}
      {...getResponsiveProps()}
      sx={{
        // Base responsive styles
        width: '100%',
        minHeight: isMobile ? '100vh' : 'auto',
        ...getResponsiveProps().sx,
      }}
    >
      {children}
    </Box>
  );
};

export default MobileOptimized;
