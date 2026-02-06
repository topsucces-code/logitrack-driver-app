import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { hapticLight } from '../../hooks/useHapticFeedback';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  haptic?: boolean;
}

const variantStyles = {
  primary: 'bg-primary-500 hover:bg-primary-600 text-white disabled:bg-primary-300',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:bg-gray-50 disabled:text-gray-400',
  outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700 disabled:border-gray-200 disabled:text-gray-400',
  ghost: 'hover:bg-gray-100 text-gray-700 disabled:text-gray-400',
  danger: 'bg-red-500 hover:bg-red-600 text-white disabled:bg-red-300',
};

const sizeStyles = {
  sm: 'px-3 py-2 text-sm rounded-lg min-h-[44px]',
  md: 'px-4 py-3 text-base rounded-xl min-h-[44px]',
  lg: 'px-6 py-4 text-lg rounded-xl min-h-[44px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      disabled,
      className = '',
      haptic = true,
      onClick,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (haptic && !isDisabled) {
        hapticLight();
      }
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        onClick={handleClick}
        className={`
          inline-flex items-center justify-center gap-2 font-medium
          transition-colors active:scale-[0.98]
          disabled:cursor-not-allowed disabled:active:scale-100
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {children}
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && icon}
            {children}
            {icon && iconPosition === 'right' && icon}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
