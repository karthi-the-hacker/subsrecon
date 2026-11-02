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
      className={`flex flex-col items-center justify-center p-8 text-center bg-danger/5 border border-danger/30 rounded-xl backdrop-blur-md relative overflow-hidden ${className}`}
    >
      <div className="w-14 h-14 rounded-xl bg-danger/10 border border-danger/30 text-danger flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(255,42,95,0.2)]">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <h3 className="text-sm sm:text-base font-bold font-mono text-dark-text uppercase tracking-wider">
        {title}
      </h3>
      <p className="text-xs text-dark-muted mt-1 max-w-md font-mono">{message}</p>
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
