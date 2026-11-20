import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/format';

export type ButtonVariant =
  | 'primary'
  | 'dark'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'danger-soft';

export type ButtonSize = 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-surface hover:bg-accent-hover active:bg-accent-active shadow-[0_1px_2px_rgba(22,22,20,0.08)]',
  dark:
    'bg-ink text-surface hover:bg-accent active:bg-accent-active shadow-[0_1px_2px_rgba(22,22,20,0.06)]',
  secondary:
    'border border-hairline bg-surface text-ink hover:border-border-strong hover:bg-subtle active:bg-[#EAE6DE]',
  ghost:
    'bg-transparent text-ink-secondary hover:bg-subtle hover:text-ink active:bg-[#EAE6DE]',
  danger:
    'bg-danger text-surface hover:bg-[#991B1B] active:bg-[#7F1D1D] shadow-[0_1px_2px_rgba(22,22,20,0.08)]',
  'danger-soft':
    'border border-[#F5CACA] bg-danger-bg text-danger hover:bg-[#FBDADA] active:bg-[#F7C7C7]',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  md: 'min-h-[44px] px-4 py-2.5 text-sm gap-2',
  lg: 'min-h-[48px] px-5 py-3 text-sm gap-2',
  icon: 'min-h-[44px] min-w-[44px] p-0',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  loadingText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled) || isLoading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded-[10px] font-medium transition-colors duration-200 ease-[var(--ease-editorial)]',
        'disabled:cursor-not-allowed disabled:opacity-55',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          {loadingText ? <span>{loadingText}</span> : children}
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
