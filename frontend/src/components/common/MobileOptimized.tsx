import React, { ReactNode } from 'react';
import { Box, useMediaQuery, useTheme, SxProps, Theme } from '@mui/material';
import { useResponsive } from '../../hooks/useResponsive';

interface ResponsiveProps {
  sx?: SxProps<Theme>;
  [key: string]: any;
}

interface MobileOptimizedProps {
  children: ReactNode;
  mobileProps?: ResponsiveProps;
  desktopProps?: ResponsiveProps;
  tabletProps?: ResponsiveProps;
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
    
    return { sx: {} };
  };

  const responsiveProps = getResponsiveProps();
  const responsiveSx = responsiveProps.sx || {};

  return (
    <Box
      className={className}
      sx={{
        // Base responsive styles
        width: '100%',
        minHeight: isMobile ? '100vh' : 'auto',
        ...(typeof responsiveSx === 'object' && !Array.isArray(responsiveSx) ? responsiveSx : {}),
      }}
    >
      {children}
    </Box>
  );
};

export default MobileOptimized;
