const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Format integer Rupiah amount consistently (e.g., "Rp 1.299.000").
 */
export function formatIDR(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
  return idrFormatter.format(safeAmount).replace(/\u00A0/g, ' ');
}

/**
 * Format ISO-8601 timestamp into readable Indonesian date & time.
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) {
    return '-';
  }

  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return dateTimeFormatter.format(parsed);
}

/**
 * Join conditional CSS class names cleanly.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
