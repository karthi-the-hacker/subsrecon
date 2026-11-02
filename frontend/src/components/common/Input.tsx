import { forwardRef, InputHTMLAttributes, useId } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, id, className = '', disabled, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full flex flex-col space-y-1.5 font-mono">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-dark-text tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="text-primary text-[10px]">&gt;</span>
              {label}
            </span>
            {props.required && <span className="text-danger text-[10px] uppercase">[REQUIRED]</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-dark-muted">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`w-full rounded-lg bg-dark-bg/80 border text-xs sm:text-sm text-dark-text placeholder:text-dark-muted/50 px-3 py-2.5 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary focus:shadow-[0_0_15px_rgba(0,255,136,0.25)] backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed ${
              leftIcon ? 'pl-9' : ''
            } ${rightIcon ? 'pr-10' : ''} ${
              error ? 'border-danger focus:ring-danger focus:border-danger' : 'border-dark-border/80 hover:border-dark-border-bright'
            } ${className}`}
            {...props}
          />
          {rightIcon && <div className="absolute right-3 flex items-center">{rightIcon}</div>}
        </div>
        {error && (
          <p id={errorId} className="text-xs text-danger font-medium flex items-center gap-1" role="alert">
            <span>[!]</span> {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-[11px] text-dark-muted/80">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
