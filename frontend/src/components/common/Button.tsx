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
    'inline-flex items-center justify-center font-mono font-bold rounded-[3px] transition-colors duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none tracking-wider uppercase';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-xs sm:text-sm px-4 py-2 gap-2',
    lg: 'text-sm sm:text-base px-5 py-2.5 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-primary text-[#111111] border border-[#111111] hover:bg-primary-hover hover:border-[#111111] active:bg-[#CC6100]',
    secondary:
      'bg-white text-[#111111] border border-[#111111] hover:text-primary hover:border-primary hover:bg-[#FFF7ED] active:bg-[#FFEDD5]',
    danger:
      'bg-danger text-white border border-[#111111] hover:bg-danger-hover active:bg-[#991B1B]',
    outline:
      'bg-transparent text-[#111111] border border-[#111111] hover:text-primary hover:border-primary hover:bg-[#FFF7ED]',
    ghost:
      'bg-transparent text-[#111111] border border-transparent hover:text-primary hover:bg-[#FFF7ED]',
    cyber:
      'bg-[#FFF7ED] text-[#111111] border border-primary hover:bg-primary hover:text-[#111111]',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" aria-hidden="true" />
      ) : (
        leftIcon
      )}
      {children && <span>{children}</span>}
      {!isLoading && rightIcon}
    </button>
  );
};

export default Button;
