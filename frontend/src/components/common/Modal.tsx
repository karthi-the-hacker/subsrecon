import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
        previouslyFocusedElement.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        className={`w-full ${maxWidthStyles[maxWidth]} bg-dark-card/95 backdrop-blur-2xl border border-primary/30 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_20px_rgba(0,255,136,0.15)] p-6 flex flex-col focus:outline-none relative cyber-corners`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-dark-border/80 mb-4 font-mono">
          <div>
            {title && (
              <h2 id="modal-title" className="text-sm sm:text-base font-bold text-dark-text tracking-wide flex items-center gap-2">
                <span className="text-primary">&gt;</span>
                {title}
              </h2>
            )}
            {description && (
              <p id="modal-description" className="text-xs text-dark-muted mt-1 font-sans">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-dark-muted hover:text-primary p-1.5 rounded-lg hover:bg-primary/10 transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 font-sans">{children}</div>
      </div>
    </div>
  );
};
