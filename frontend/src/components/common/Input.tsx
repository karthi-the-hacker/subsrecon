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
      <div className="w-full flex flex-col space-y-1 font-mono">
        {label && (
          <label htmlFor={inputId} className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="text-primary text-[10px]">&gt;</span>
              {label}
            </span>
            {props.required && <span className="text-danger text-[10px] uppercase font-bold">[REQUIRED]</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-primary">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`w-full rounded-[3px] bg-white border text-xs sm:text-sm text-[#111111] placeholder:text-[#888888] px-3 py-2 transition-colors duration-150 focus:outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed ${
              leftIcon ? 'pl-9' : ''
            } ${rightIcon ? 'pr-10' : ''} ${
              error ? 'border-danger focus:border-danger' : 'border-[#DCDCDC] hover:border-[#111111]'
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
          <p id={helperId} className="text-[11px] text-[#666666]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
