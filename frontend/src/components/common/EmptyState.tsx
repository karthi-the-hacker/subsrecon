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
      className={`flex flex-col items-center justify-center p-8 text-center bg-white border border-dashed border-[#DCDCDC] rounded-[3px] relative overflow-hidden ${className}`}
    >
      <div className="w-12 h-12 rounded-[3px] bg-[#FAFAFA] border border-[#DCDCDC] flex items-center justify-center text-primary mb-3">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-sm sm:text-base font-bold font-mono text-[#111111] tracking-wider uppercase">
        {title}
      </h3>
      {description && <p className="text-xs text-[#666666] mt-1 max-w-sm font-sans">{description}</p>}
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

export default EmptyState;
