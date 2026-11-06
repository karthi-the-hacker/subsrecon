import React from 'react';
import { Radar } from 'lucide-react';

export interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({ size = 'md', text, className = '' }) => {
  const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center p-6 text-[#666666] font-mono ${className}`}
    >
      <div className="relative flex items-center justify-center">
        <div className="rounded-[3px] bg-white border border-[#111111] p-3 shadow-sm">
          <Radar className={`${sizeStyles[size]} text-primary animate-radar-sweep`} />
        </div>
      </div>
      {text && (
        <p className="text-xs font-mono font-bold mt-3 text-[#111111] tracking-widest uppercase flex items-center gap-1.5">
          <span className="text-primary">&gt;</span> {text}
        </p>
      )}
      <span className="sr-only">Loading cyber reconnaissance data...</span>
    </div>
  );
};

export default Loader;
