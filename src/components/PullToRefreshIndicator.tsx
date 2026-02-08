import { memo } from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';

type PullState = 'idle' | 'pulling' | 'refreshing';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  pullState: PullState;
  threshold?: number;
}

export const PullToRefreshIndicator = memo(function PullToRefreshIndicator({
  pullDistance,
  pullState,
  threshold = 60,
}: PullToRefreshIndicatorProps) {
  if (pullState === 'idle' && pullDistance === 0) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const pastThreshold = pullDistance >= threshold;

  const getText = () => {
    if (pullState === 'refreshing') return 'Actualisation...';
    if (pastThreshold) return 'Relâchez pour actualiser';
    return 'Tirez pour actualiser';
  };

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
      style={{
        height: pullDistance > 0 ? `${pullDistance}px` : 0,
      }}
    >
      <div className="flex flex-col items-center gap-1">
        {pullState === 'refreshing' ? (
          <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
        ) : (
          <div
            className="transition-transform duration-150 ease-out"
            style={{
              transform: `rotate(${pastThreshold ? 180 : 0}deg)`,
              opacity: Math.max(0.3, progress),
            }}
          >
            <ArrowDown className="w-5 h-5 text-primary-500" />
          </div>
        )}
        <span
          className="text-xs text-gray-500 font-medium transition-opacity duration-150"
          style={{ opacity: Math.max(0.4, progress) }}
        >
          {getText()}
        </span>
      </div>
    </div>
  );
});
