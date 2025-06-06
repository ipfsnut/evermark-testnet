// utils/responsive.ts - Utility functions for responsive design

/**
 * Conditional className utility function
 * Combines classnames conditionally, filtering out falsy values
 */
export function cn(...classes: (string | string[] | undefined | false | null)[]): string {
  return classes
    .flat()
    .filter(Boolean)
    .join(' ');
}

/**
 * Responsive breakpoints (matches Tailwind config)
 */
export const breakpoints = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Hook to detect current screen size
 */
export function useScreenSize() {
  const [screenSize, setScreenSize] = React.useState<keyof typeof breakpoints>('sm');

  React.useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      
      if (width >= breakpoints['2xl']) setScreenSize('2xl');
      else if (width >= breakpoints.xl) setScreenSize('xl');
      else if (width >= breakpoints.lg) setScreenSize('lg');
      else if (width >= breakpoints.md) setScreenSize('md');
      else if (width >= breakpoints.sm) setScreenSize('sm');
      else setScreenSize('xs');
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  return screenSize;
}

/**
 * Hook to detect if screen is mobile size
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth < breakpoints.md);
    };

    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  return isMobile;
}

/**
 * Hook to detect if screen is tablet size
 */
export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState(false);

  React.useEffect(() => {
    const updateIsTablet = () => {
      const width = window.innerWidth;
      setIsTablet(width >= breakpoints.md && width < breakpoints.lg);
    };

    updateIsTablet();
    window.addEventListener('resize', updateIsTablet);
    return () => window.removeEventListener('resize', updateIsTablet);
  }, []);

  return isTablet;
}

/**
 * Responsive grid column classes
 */
export const gridCols = {
  responsive: {
    '1-2-3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    '1-2-4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    '1-3-6': 'grid-cols-1 md:grid-cols-3 lg:grid-cols-6',
    '2-4-6': 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6',
  },
  mobile: {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
  },
  tablet: {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
  },
  desktop: {
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
  },
} as const;

/**
 * Responsive text size classes
 */
export const textSizes = {
  responsive: {
    'sm-base-lg': 'text-sm sm:text-base lg:text-lg',
    'base-lg-xl': 'text-base sm:text-lg lg:text-xl',
    'lg-xl-2xl': 'text-lg sm:text-xl lg:text-2xl',
    'xl-2xl-3xl': 'text-xl sm:text-2xl lg:text-3xl',
  },
} as const;

/**
 * Responsive spacing classes
 */
export const spacing = {
  responsive: {
    'sm-md-lg': 'p-3 sm:p-4 lg:p-6',
    'md-lg-xl': 'p-4 sm:p-6 lg:p-8',
    'lg-xl-2xl': 'p-6 sm:p-8 lg:p-10',
  },
  margin: {
    'sm-md-lg': 'm-3 sm:m-4 lg:m-6',
    'md-lg-xl': 'm-4 sm:m-6 lg:m-8',
  },
  gap: {
    'sm-md-lg': 'gap-3 sm:gap-4 lg:gap-6',
    'md-lg-xl': 'gap-4 sm:gap-6 lg:gap-8',
  },
} as const;

/**
 * Format responsive classes helper
 */
export function responsive(classes: {
  mobile?: string;
  tablet?: string;
  desktop?: string;
  default?: string;
}): string {
  return cn(
    classes.default,
    classes.mobile,
    classes.tablet && `md:${classes.tablet}`,
    classes.desktop && `lg:${classes.desktop}`
  );
}

/**
 * Responsive container classes
 */
export const containers = {
  page: 'w-full max-w-none sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto',
  content: 'w-full max-w-none sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto',
  narrow: 'w-full max-w-none sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto',
  wide: 'w-full max-w-none md:max-w-5xl lg:max-w-7xl xl:max-w-none mx-auto',
} as const;

/**
 * Common responsive button sizes
 */
export const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm sm:text-base',
  lg: 'px-6 py-3 text-base sm:text-lg',
  responsive: 'px-3 py-2 text-sm sm:px-4 sm:py-2.5 sm:text-base',
} as const;

/**
 * Touch-friendly interaction classes
 */
export const touchFriendly = {
  button: 'touch-manipulation active:scale-95 transition-transform',
  card: 'touch-manipulation active:scale-[0.98] transition-transform',
  minimal: 'touch-manipulation',
} as const;

/**
 * Safe area utilities for mobile devices
 */
export const safeArea = {
  top: 'pt-safe-area-inset-top',
  bottom: 'pb-safe-area-inset-bottom',
  left: 'pl-safe-area-inset-left',
  right: 'pr-safe-area-inset-right',
  all: 'safe-area-inset',
} as const;

// Re-export React for hooks
import React from 'react';