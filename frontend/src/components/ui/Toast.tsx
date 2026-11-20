import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useToastStore, type ToastVariant } from '../../stores/toastStore';
import { cn } from '../../utils/format';

const VARIANT_CONFIG: Record<
  ToastVariant,
  { container: string; iconColor: string; Icon: typeof Info }
> = {
  success: {
    container: 'border-[#C6E8D8] bg-surface text-ink',
    iconColor: 'text-success',
    Icon: CheckCircle2,
  },
  info: {
    container: 'border-hairline bg-surface text-ink',
    iconColor: 'text-ink',
    Icon: Info,
  },
  warning: {
    container: 'border-[#F5DCB2] bg-surface text-ink',
    iconColor: 'text-warning',
    Icon: AlertTriangle,
  },
  danger: {
    container: 'border-[#F7CACA] bg-surface text-ink',
    iconColor: 'text-danger',
    Icon: AlertCircle,
  },
};

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-4 top-[72px] z-[60] flex flex-col items-center gap-2.5 sm:inset-x-auto sm:top-20 sm:right-6 sm:w-full sm:max-w-sm sm:items-end"
    >
      {toasts.map((toast) => {
        const config = VARIANT_CONFIG[toast.variant];
        const Icon = config.Icon;

        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'pointer-events-auto flex w-full items-center gap-3 rounded-[12px] border py-2.5 pr-1.5 pl-3.5 shadow-[var(--shadow-lift)] animate-toast-in',
              config.container,
            )}
          >
            <Icon
              className={cn('h-5 w-5 shrink-0 stroke-[1.75]', config.iconColor)}
              aria-hidden="true"
            />
            <p className="flex-1 text-sm font-medium leading-snug text-ink">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Tutup notifikasi"
              className="inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-ink-secondary transition-colors hover:bg-subtle hover:text-ink"
            >
              <X className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
