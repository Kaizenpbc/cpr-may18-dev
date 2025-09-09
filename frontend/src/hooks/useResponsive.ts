import { useState, useEffect } from 'react';

interface BreakpointValues {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

const breakpoints: BreakpointValues = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
};

type Breakpoint = keyof BreakpointValues;

export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCurrentBreakpoint = (): Breakpoint => {
    if (windowSize.width >= breakpoints.xl) return 'xl';
    if (windowSize.width >= breakpoints.lg) return 'lg';
    if (windowSize.width >= breakpoints.md) return 'md';
    if (windowSize.width >= breakpoints.sm) return 'sm';
    return 'xs';
  };

  const isMobile = windowSize.width < breakpoints.sm;
  const isTablet = windowSize.width >= breakpoints.sm && windowSize.width < breakpoints.md;
  const isDesktop = windowSize.width >= breakpoints.md;
  const isLargeScreen = windowSize.width >= breakpoints.lg;

  const isBreakpoint = (breakpoint: Breakpoint): boolean => {
    return windowSize.width >= breakpoints[breakpoint];
  };

  const isBreakpointDown = (breakpoint: Breakpoint): boolean => {
    return windowSize.width < breakpoints[breakpoint];
  };

  const isBreakpointUp = (breakpoint: Breakpoint): boolean => {
    return windowSize.width >= breakpoints[breakpoint];
  };

  const isBreakpointOnly = (breakpoint: Breakpoint): boolean => {
    const currentBreakpoint = getCurrentBreakpoint();
    return currentBreakpoint === breakpoint;
  };

  const isBreakpointBetween = (start: Breakpoint, end: Breakpoint): boolean => {
    return windowSize.width >= breakpoints[start] && windowSize.width < breakpoints[end];
  };

  return {
    windowSize,
    breakpoint: getCurrentBreakpoint(),
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
    isBreakpoint,
    isBreakpointDown,
    isBreakpointUp,
    isBreakpointOnly,
    isBreakpointBetween,
  };
};

export default useResponsive;
