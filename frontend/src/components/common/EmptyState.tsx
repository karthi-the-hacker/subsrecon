import React from 'react';
import { LucideIcon, Radar } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Radar,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-dark-card/40 border border-dashed border-dark-border/80 rounded-xl relative overflow-hidden backdrop-blur-md cyber-corners ${className}`}
    >
      <div className="w-14 h-14 rounded-xl bg-dark-bg/80 border border-primary/30 flex items-center justify-center text-primary mb-3 shadow-[0_0_20px_rgba(0,255,136,0.15)]">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-sm sm:text-base font-bold font-mono text-dark-text tracking-wide uppercase">
        {title}
      </h3>
      {description && <p className="text-xs text-dark-muted mt-1 max-w-sm font-sans">{description}</p>}
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
