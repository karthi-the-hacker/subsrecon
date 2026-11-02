import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'System Anomaly Detected',
  message,
  onRetry,
  retryLabel = 'Retry Transmission',
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-8 text-center bg-white border border-danger/40 rounded-[3px] relative overflow-hidden ${className}`}
    >
      <div className="w-12 h-12 rounded-[3px] bg-danger/10 border border-danger/30 text-danger flex items-center justify-center mb-3">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h3 className="text-sm sm:text-base font-bold font-mono text-[#111111] uppercase tracking-wider">
        {title}
      </h3>
      <p className="text-xs text-[#666666] mt-1 max-w-md font-mono">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="danger" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ErrorState;
