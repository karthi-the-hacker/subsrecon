import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { ShieldAlert } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Abort',
  variant = 'danger',
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-4 font-mono">
        <div className="flex items-start gap-3 p-3.5 rounded-[3px] bg-[#FAFAFA] border border-[#DCDCDC]">
          <div
            className={`p-2 rounded-[3px] shrink-0 ${
              variant === 'danger'
                ? 'bg-danger/10 text-danger border border-danger/30'
                : 'bg-primary/10 text-primary border border-primary/30'
            }`}
          >
            <ShieldAlert className="w-5 h-5" />
          </div>
          <p className="text-xs text-[#666666] font-sans leading-relaxed pt-0.5">{message}</p>
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} size="sm" onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
