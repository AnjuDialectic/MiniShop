import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/format';

export type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const BADGE_STYLES: Record<BadgeVariant, string> = {
  neutral: 'bg-subtle text-ink-secondary border border-hairline',
  accent: 'bg-accent-soft text-accent border border-[#F5CFCB]',
  success: 'bg-success-bg text-success border border-[#C6E8D8]',
  warning: 'bg-warning-bg text-warning border border-[#F5DCB2]',
  danger: 'bg-danger-bg text-danger border border-[#F7CACA]',
};

export function Badge({
  variant = 'neutral',
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 whitespace-nowrap',
        BADGE_STYLES[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
