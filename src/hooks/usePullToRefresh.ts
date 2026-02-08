import { useState, useRef, useCallback, useEffect } from 'react';

type PullState = 'idle' | 'pulling' | 'refreshing';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
}

interface UsePullToRefreshReturn {
  isRefreshing: boolean;
  pullDistance: number;
  pullState: PullState;
  pullToRefreshProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

export function usePullToRefresh({
  onRefresh,
  threshold = 60,
  maxPull = 120,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pullState, setPullState] = useState<PullState>('idle');
  const [pullDistance, setPullDistance] = useState(0);

  const startY = useRef(0);
  const isPulling = useRef(false);
  const hasReachedThreshold = useRef(false);

  // Apply overscroll-behavior on mount
  useEffect(() => {
    const original = document.body.style.overscrollBehaviorY;
    document.body.style.overscrollBehaviorY = 'contain';
    return () => {
      document.body.style.overscrollBehaviorY = original;
    };
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (pullState === 'refreshing') return;

    const scrollTop = (e.currentTarget as HTMLElement).scrollTop;

    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
      hasReachedThreshold.current = false;
    }
  }, [pullState]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || pullState === 'refreshing') return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);

    if (distance <= 0) return;

    // Apply resistance: diminishing returns as user pulls further
    const resistedDistance = Math.min(
      maxPull,
      distance * 0.5
    );

    setPullDistance(resistedDistance);

    if (resistedDistance > 0) {
      setPullState('pulling');
    }

    // Haptic feedback when threshold is first reached
    if (resistedDistance >= threshold && !hasReachedThreshold.current) {
      hasReachedThreshold.current = true;
      navigator.vibrate?.(10);
    } else if (resistedDistance < threshold) {
      hasReachedThreshold.current = false;
    }
  }, [pullState, threshold, maxPull]);

  const onTouchEnd = useCallback(async () => {
    if (!isPulling.current || pullState === 'refreshing') return;

    isPulling.current = false;

    if (pullDistance >= threshold) {
      setPullState('refreshing');
      setPullDistance(threshold * 0.6); // Keep a small visible indicator during refresh

      try {
        await onRefresh();
      } finally {
        setPullState('idle');
        setPullDistance(0);
      }
    } else {
      setPullState('idle');
      setPullDistance(0);
    }
  }, [pullDistance, threshold, onRefresh, pullState]);

  return {
    isRefreshing: pullState === 'refreshing',
    pullDistance,
    pullState,
    pullToRefreshProps: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}
