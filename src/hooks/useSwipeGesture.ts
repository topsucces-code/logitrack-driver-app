import { useState, useRef, useCallback } from 'react';

interface UseSwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

interface UseSwipeGestureReturn {
  swipeOffset: number;
  isSwiping: boolean;
  isDismissed: boolean;
  swipeProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 80,
}: UseSwipeGestureOptions): UseSwipeGestureReturn {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const isTracking = useRef(false);
  const directionLocked = useRef<'horizontal' | 'vertical' | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (isDismissed) return;
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    isTracking.current = true;
    directionLocked.current = null;
  }, [isDismissed]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTracking.current || isDismissed) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startX.current;
    const deltaY = touch.clientY - startY.current;

    // Lock direction after 10px of movement
    if (directionLocked.current === null && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      directionLocked.current = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
    }

    // If vertical scroll, abandon swipe tracking
    if (directionLocked.current === 'vertical') {
      isTracking.current = false;
      setSwipeOffset(0);
      setIsSwiping(false);
      return;
    }

    if (directionLocked.current === 'horizontal') {
      // Prevent vertical scroll while swiping horizontally
      e.preventDefault();

      // Apply resistance as user swipes further
      const resistance = 0.6;
      const resistedDelta = deltaX * resistance;

      setSwipeOffset(resistedDelta);
      setIsSwiping(true);

      // Haptic on first threshold cross
      if (Math.abs(resistedDelta) >= threshold) {
        navigator.vibrate?.(10);
      }
    }
  }, [isDismissed, threshold]);

  const onTouchEnd = useCallback(() => {
    if (!isTracking.current || isDismissed) return;
    isTracking.current = false;

    if (Math.abs(swipeOffset) >= threshold) {
      // Determine direction and animate out
      const direction = swipeOffset > 0 ? 'right' : 'left';
      const dismissTarget = direction === 'right' ? 400 : -400;

      setSwipeOffset(dismissTarget);
      setIsDismissed(true);

      // Call callback after dismiss animation
      setTimeout(() => {
        if (direction === 'right' && onSwipeRight) {
          onSwipeRight();
        } else if (direction === 'left' && onSwipeLeft) {
          onSwipeLeft();
        }
      }, 250);
    } else {
      // Snap back
      setSwipeOffset(0);
      setIsSwiping(false);
    }
  }, [swipeOffset, threshold, onSwipeLeft, onSwipeRight, isDismissed]);

  return {
    swipeOffset,
    isSwiping,
    isDismissed,
    swipeProps: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}
