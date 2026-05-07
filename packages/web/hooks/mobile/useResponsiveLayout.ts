'use client';

import { useEffect, useState, useCallback } from 'react';

export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ResponsiveLayout {
  screenSize: ScreenSize;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLarge: boolean;
  width: number;
  height: number;
}

const getScreenSize = (width: number): ScreenSize => {
  if (width < 640) return 'xs';
  if (width < 768) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1280) return 'lg';
  return 'xl';
};

export const useResponsiveLayout = (): ResponsiveLayout => {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  const [height, setHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);

  const handleResize = useCallback(() => {
    setWidth(window.innerWidth);
    setHeight(window.innerHeight);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
      };
    }
  }, [handleResize]);

  const screenSize = getScreenSize(width);

  return {
    screenSize,
    isMobile: screenSize === 'xs' || screenSize === 'sm',
    isTablet: screenSize === 'md',
    isDesktop: screenSize === 'lg' || screenSize === 'xl',
    isLarge: screenSize === 'xl',
    width,
    height,
  };
};

export default useResponsiveLayout;