import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'agent' | 'ghost' | 'outline';
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
  let variantStyles = 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm';

  switch (variant) {
    case 'secondary':
      variantStyles = 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm';
      break;
    case 'danger':
      variantStyles = 'bg-red-600 text-white hover:bg-red-700 shadow-sm';
      break;
    case 'agent':
      variantStyles = 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm';
      break;
    case 'ghost':
      variantStyles = 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';
      break;
    case 'outline':
      variantStyles = 'border border-slate-300 text-slate-700 hover:bg-slate-50';
      break;
  }

  let sizeStyles = 'px-3.5 py-2 text-sm gap-2';
  if (size === 'sm') sizeStyles = 'px-2.5 py-1.5 text-xs gap-1.5';
  if (size === 'lg') sizeStyles = 'px-5 py-2.5 text-base gap-2.5';

  const disabledState = disabled || isLoading;

  return (
    <button
      disabled={disabledState}
      className={`inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
};
