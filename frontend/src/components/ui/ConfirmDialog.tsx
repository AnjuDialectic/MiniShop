import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Lanjutkan',
  cancelLabel = 'Batal',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      disableClose={isLoading}
      footer={
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-3.5">
        <span
          className={
            variant === 'danger'
              ? 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-bg text-danger'
              : 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent'
          }
        >
          <AlertTriangle className="h-5 w-5 stroke-[1.75]" aria-hidden="true" />
        </span>
        <p className="pt-1 text-sm leading-relaxed text-ink-secondary">{description}</p>
      </div>
    </Modal>
  );
}
