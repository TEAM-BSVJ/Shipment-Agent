import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'agent' | 'mint' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  let variantStyles = 'bg-cyan-400 text-navy-950 font-semibold hover:bg-cyan-300 shadow-sm hover:shadow-glow-cyan active:scale-[0.98]';

  switch (variant) {
    case 'secondary':
      variantStyles =
        'bg-navy-850 text-slateText-primary border border-navy-700 hover:bg-navy-800 hover:border-cyan-400/40 hover:text-white shadow-sm active:scale-[0.98]';
      break;
    case 'danger':
      variantStyles =
        'bg-coral-400 text-white font-semibold hover:bg-coral-500 shadow-sm hover:shadow-glow-coral active:scale-[0.98]';
      break;
    case 'agent':
      variantStyles =
        'bg-violet-400 text-navy-950 font-semibold hover:bg-violet-300 shadow-sm hover:shadow-glow-violet active:scale-[0.98]';
      break;
    case 'mint':
      variantStyles =
        'bg-mint-400 text-navy-950 font-semibold hover:bg-mint-300 shadow-sm hover:shadow-glow-mint active:scale-[0.98]';
      break;
    case 'ghost':
      variantStyles =
        'text-slateText-secondary hover:text-slateText-primary hover:bg-navy-800 active:scale-[0.98]';
      break;
    case 'outline':
      variantStyles =
        'border border-navy-700 text-slateText-secondary hover:border-cyan-400/40 hover:text-slateText-primary hover:bg-navy-850 active:scale-[0.98]';
      break;
  }

  let sizeStyles = 'px-3.5 py-2 text-sm gap-2';
  if (size === 'sm') sizeStyles = 'px-2.5 py-1.5 text-xs gap-1.5';
  if (size === 'lg') sizeStyles = 'px-5 py-2.5 text-base gap-2.5';

  const disabledState = disabled || isLoading;

  return (
    <button
      disabled={disabledState}
      className={`inline-flex items-center justify-center font-medium rounded-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100 ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
};
