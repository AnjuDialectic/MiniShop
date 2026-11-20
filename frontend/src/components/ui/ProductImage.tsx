import { useState } from 'react';
import { Package } from 'lucide-react';
import { cn } from '../../utils/format';

export interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  aspect?: '4/3' | 'square';
  priority?: boolean;
  muted?: boolean;
  compactFallback?: boolean;
  className?: string;
  imgClassName?: string;
  onLoadSuccess?: () => void;
  onLoadError?: () => void;
}

export function ProductImage({
  src,
  alt,
  aspect = '4/3',
  priority = false,
  muted = false,
  compactFallback = false,
  className,
  imgClassName,
  onLoadSuccess,
  onLoadError,
}: ProductImageProps) {
  const normalizedSrc = src?.trim() ?? '';
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const hasError = normalizedSrc === '' || failedSrc === normalizedSrc;

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-subtle',
        aspect === '4/3' ? 'aspect-[4/3]' : 'aspect-square',
        className,
      )}
    >
      {hasError ? (
        <div
          role="img"
          aria-label={alt}
          className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-3 text-center text-ink-secondary"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-surface text-ink-secondary">
            <Package className="h-5 w-5 stroke-[1.75]" aria-hidden="true" />
          </span>
          {!compactFallback && (
            <span className="text-xs font-medium text-ink-secondary">
              Gambar tidak tersedia
            </span>
          )}
        </div>
      ) : (
        <img
          src={normalizedSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : undefined}
          onLoad={() => {
            if (failedSrc !== null) {
              setFailedSrc(null);
            }
            onLoadSuccess?.();
          }}
          onError={() => {
            setFailedSrc(normalizedSrc);
            onLoadError?.();
          }}
          className={cn(
            'h-full w-full object-cover transition-transform duration-300 ease-[var(--ease-editorial)]',
            muted && 'opacity-70 grayscale-[25%]',
            imgClassName,
          )}
        />
      )}
    </div>
  );
}
