import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useDialogBehavior } from '../../hooks/useDialogBehavior';
import { cn } from '../../utils/format';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: ModalSize;
  disableClose?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  hideHeader?: boolean;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-3xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'lg',
  disableClose = false,
  children,
  footer,
  hideHeader = false,
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialogBehavior({
    isOpen,
    onClose,
    containerRef: dialogRef,
    disableClose,
  });

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/45 backdrop-blur-[2px] animate-fade-in"
        aria-hidden="true"
        onClick={() => {
          if (!disableClose) {
            onClose();
          }
        }}
      />

      {/* Dialog panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden border border-hairline bg-surface shadow-[var(--shadow-overlay)]',
          'rounded-t-[18px] sm:rounded-[14px]',
          'max-sm:animate-sheet-in sm:animate-dialog-in',
          SIZE_CLASSES[size],
        )}
      >
        {hideHeader ? (
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
        ) : (
          <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2
                id={titleId}
                className="font-display text-lg font-bold tracking-[-0.025em] text-ink sm:text-xl"
              >
                {title}
              </h2>
              {subtitle && (
                <p className="mt-0.5 text-sm text-ink-secondary">{subtitle}</p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={disableClose}
              aria-label="Tutup dialog"
              className="inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-ink-secondary transition-colors hover:bg-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-45"
            >
              <X className="h-5 w-5 stroke-[1.75]" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer && (
          <div className="border-t border-hairline bg-canvas/80 px-5 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
