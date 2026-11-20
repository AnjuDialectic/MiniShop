import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface UseDialogBehaviorOptions {
  isOpen: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLElement | null>;
  disableClose?: boolean;
}

/**
 * Shared accessibility hook for Modals & Drawers:
 * - Closes on Escape (unless disabled during submission)
 * - Locks body scroll while open
 * - Traps keyboard Tab focus inside the dialog and restores focus on close
 */
export function useDialogBehavior({
  isOpen,
  onClose,
  containerRef,
  disableClose = false,
}: UseDialogBehaviorOptions): void {
  const onCloseRef = useRef(onClose);
  const disableCloseRef = useRef(disableClose);
  const didInitialFocusRef = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    disableCloseRef.current = disableClose;
  }, [disableClose]);

  useEffect(() => {
    if (!isOpen) {
      didInitialFocusRef.current = false;
      return;
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let focusTimer: number | null = null;
    if (!didInitialFocusRef.current) {
      focusTimer = window.requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) {
          return;
        }

        didInitialFocusRef.current = true;

        if (!container.contains(document.activeElement)) {
          const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            container.focus();
          }
        }
      });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!disableCloseRef.current) {
          event.stopPropagation();
          onCloseRef.current();
        }
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const container = containerRef.current;
      if (!container) {
        return;
      }

      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null);

      if (focusableElements.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      if (focusTimer !== null) {
        window.cancelAnimationFrame(focusTimer);
      }
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, containerRef]);
}
