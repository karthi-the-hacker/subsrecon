import React from 'react';
import { Radar } from 'lucide-react';

export interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({ size = 'md', text, className = '' }) => {
  const sizeStyles = {
    sm: 'w-5 h-5',
    md: 'w-9 h-9',
    lg: 'w-14 h-14',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center p-6 text-dark-muted font-mono ${className}`}
    >
      <div className="relative flex items-center justify-center">
        {/* Outer pulse ring */}
        <div className="absolute inset-0 rounded-full border border-primary/30 animate-ping" />
        {/* Inner rotating radar */}
        <div className="rounded-full bg-primary/10 border border-primary/50 p-3 shadow-[0_0_20px_rgba(0,255,136,0.3)]">
          <Radar className={`${sizeStyles[size]} text-primary animate-radar-sweep`} />
        </div>
      </div>
      {text && (
        <p className="text-xs font-mono font-semibold mt-4 text-primary/90 tracking-widest uppercase flex items-center gap-1.5">
          <span className="animate-pulse">&gt;</span> {text}
        </p>
      )}
      <span className="sr-only">Loading cyber reconnaissance data...</span>
    </div>
  );
};
