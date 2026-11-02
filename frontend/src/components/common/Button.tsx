import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'cyber';
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
  const baseStyles =
    'inline-flex items-center justify-center font-mono font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg disabled:opacity-50 disabled:cursor-not-allowed select-none tracking-wide relative overflow-hidden';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-xs sm:text-sm px-4 py-2 gap-2',
    lg: 'text-sm sm:text-base px-5 py-2.5 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-primary text-dark-bg font-bold hover:bg-primary-hover border border-primary shadow-[0_0_15px_rgba(0,255,136,0.35)] hover:shadow-[0_0_25px_rgba(0,255,136,0.6)] focus:ring-primary',
    secondary:
      'bg-dark-card/90 text-dark-text border border-dark-border hover:border-primary/40 hover:bg-dark-card focus:ring-primary backdrop-blur-md',
    danger:
      'bg-danger text-white hover:bg-danger-hover border border-danger/80 shadow-[0_0_15px_rgba(255,42,95,0.35)] hover:shadow-[0_0_25px_rgba(255,42,95,0.5)] focus:ring-danger',
    outline:
      'border border-primary/50 text-primary hover:bg-primary/10 hover:border-primary shadow-[0_0_10px_rgba(0,255,136,0.15)] focus:ring-primary backdrop-blur-sm',
    ghost:
      'text-dark-muted hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/20 focus:ring-primary',
    cyber:
      'bg-cyber-cyan/15 text-cyber-cyan hover:bg-cyber-cyan/25 border border-cyber-cyan/60 shadow-[0_0_15px_rgba(0,240,255,0.25)] hover:shadow-[0_0_25px_rgba(0,240,255,0.45)] focus:ring-cyber-cyan',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
