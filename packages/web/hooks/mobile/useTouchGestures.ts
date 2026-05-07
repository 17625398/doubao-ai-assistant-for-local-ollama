'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface TouchPoint {
  x: number;
  y: number;
}

interface GestureState {
  type: 'tap' | 'doubleTap' | 'swipe' | 'pinch' | 'pan' | null;
  direction?: 'up' | 'down' | 'left' | 'right';
  scale?: number;
  deltaX?: number;
  deltaY?: number;
}

interface UseTouchGesturesOptions {
  onTap?: (e: TouchEvent) => void;
  onDoubleTap?: (e: TouchEvent) => void;
  onSwipe?: (direction: 'up' | 'down' | 'left' | 'right', e: TouchEvent) => void;
  onPinch?: (scale: number, e: TouchEvent) => void;
  onPan?: (deltaX: number, deltaY: number, e: TouchEvent) => void;
  swipeThreshold?: number;
  doubleTapDelay?: number;
}

export const useTouchGestures = ({
  onTap,
  onDoubleTap,
  onSwipe,
  onPinch,
  onPan,
  swipeThreshold = 50,
  doubleTapDelay = 300,
}: UseTouchGesturesOptions = {}) => {
  const [gesture, setGesture] = useState<GestureState>({ type: null });
  const touchStartRef = useRef<TouchPoint | null>(null);
  const lastTapRef = useRef<number>(0);
  const initialDistanceRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(1);

  const getDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getDirection = (deltaX: number, deltaY: number): 'up' | 'down' | 'left' | 'right' => {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left';
    }
    return deltaY > 0 ? 'down' : 'up';
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    } else if (e.touches.length === 2 && onPinch) {
      initialDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
      initialScaleRef.current = gesture.scale || 1;
    }
  }, [onPinch, gesture.scale]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 1 && touchStartRef.current && onPan) {
      const deltaX = e.touches[0].clientX - touchStartRef.current.x;
      const deltaY = e.touches[0].clientY - touchStartRef.current.y;

      setGesture({
        type: 'pan',
        deltaX,
        deltaY,
      });

      onPan(deltaX, deltaY, e);
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    } else if (e.touches.length === 2 && onPinch) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = initialScaleRef.current * (currentDistance / initialDistanceRef.current);

      setGesture({
        type: 'pinch',
        scale,
      });

      onPinch(scale, e);
    }
  }, [onPan, onPinch]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (touchStartRef.current && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance < swipeThreshold) {
        const now = Date.now();
        if (now - lastTapRef.current < doubleTapDelay && onDoubleTap) {
          onDoubleTap(e);
        } else if (onTap) {
          onTap(e);
        }
        lastTapRef.current = now;
      } else if (onSwipe) {
        const direction = getDirection(deltaX, deltaY);
        setGesture({
          type: 'swipe',
          direction,
        });
        onSwipe(direction, e);
      }
    }

    touchStartRef.current = null;
    setGesture({ type: null });
  }, [swipeThreshold, doubleTapDelay, onTap, onDoubleTap, onSwipe]);

  useEffect(() => {
    const target = window;
    target.addEventListener('touchstart', handleTouchStart, { passive: true });
    target.addEventListener('touchmove', handleTouchMove, { passive: false });
    target.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      target.removeEventListener('touchstart', handleTouchStart);
      target.removeEventListener('touchmove', handleTouchMove);
      target.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return gesture;
};

export default useTouchGestures;