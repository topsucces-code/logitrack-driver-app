import { HTMLAttributes, forwardRef } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      variant = 'text',
      width,
      height,
      animation = 'pulse',
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      text: 'rounded h-4',
      circular: 'rounded-full',
      rectangular: '',
      rounded: 'rounded-xl',
    };

    const animationStyles = {
      pulse: 'animate-pulse',
      wave: 'animate-shimmer',
      none: '',
    };

    return (
      <div
        ref={ref}
        className={`
          bg-gray-200
          ${variantStyles[variant]}
          ${animationStyles[animation]}
          ${className}
        `}
        style={{
          width: width ?? (variant === 'text' ? '100%' : undefined),
          height: height ?? (variant === 'circular' ? width : undefined),
          ...style,
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Preset skeleton for delivery cards
export function DeliveryCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton width={120} height={20} variant="rounded" />
        <Skeleton width={60} height={20} variant="rounded" />
      </div>
      <Skeleton height={16} />
      <Skeleton width="75%" height={16} />
      <div className="flex gap-3 pt-2">
        <Skeleton height={44} variant="rounded" className="flex-1" />
        <Skeleton height={44} variant="rounded" className="flex-1" />
      </div>
    </div>
  );
}

// Preset skeleton for stats cards
export function StatsCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4">
      <Skeleton width={100} height={14} className="mb-4" />
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <Skeleton width={80} height={32} className="mx-auto mb-2" />
          <Skeleton width={40} height={14} className="mx-auto" />
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <Skeleton width={40} height={32} className="mx-auto mb-2" />
          <Skeleton width={50} height={14} className="mx-auto" />
        </div>
      </div>
      <Skeleton height={36} variant="rounded" />
    </div>
  );
}

// Preset skeleton for list items
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1">
        <Skeleton width="60%" height={16} className="mb-2" />
        <Skeleton width="40%" height={14} />
      </div>
      <Skeleton width={60} height={24} variant="rounded" />
    </div>
  );
}

// Preset skeleton for profile header
export function ProfileHeaderSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton variant="circular" width={64} height={64} />
      <div className="flex-1">
        <Skeleton width={150} height={20} className="mb-2" />
        <Skeleton width={100} height={14} />
      </div>
    </div>
  );
}

export default Skeleton;
