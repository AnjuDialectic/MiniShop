import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Minus, Plus, Trash2 } from 'lucide-react';
import { ProductImage } from '../../components/ui/ProductImage';
import { isCartItemConflicted, useCartStore } from '../../stores/cartStore';
import type { CartItem } from '../../types/cart';
import { cn, formatIDR } from '../../utils/format';

export interface CartItemRowProps {
  item: CartItem;
  onNavigate?: () => void;
}

export function CartItemRow({ item, onNavigate }: CartItemRowProps) {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const resolveConflictForItem = useCartStore((state) => state.resolveConflictForItem);

  const [draftQty, setDraftQty] = useState<string | null>(null);
  const [limitHint, setLimitHint] = useState<string | null>(null);

  const inputDisplayValue = draftQty ?? String(item.quantity);
  const hasConflict = isCartItemConflicted(item);
  const isUnavailable = Boolean(item.unavailable) || item.maxStock <= 0;
  const lineTotal = item.price * item.quantity;

  const handleDecrement = () => {
    setDraftQty(null);
    setLimitHint(null);
    updateQuantity(item.productId, item.quantity - 1);
  };

  const handleIncrement = () => {
    setDraftQty(null);
    setLimitHint(null);
    if (item.quantity >= item.maxStock) {
      setLimitHint(`Maksimal ${item.maxStock} unit tersedia.`);
      return;
    }
    updateQuantity(item.productId, item.quantity + 1);
  };

  const handleInputChange = (rawValue: string) => {
    const digitsOnly = rawValue.replace(/[^\d]/g, '');
    setDraftQty(digitsOnly);

    if (digitsOnly === '') {
      setLimitHint(null);
      return;
    }

    const parsed = Number.parseInt(digitsOnly, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setLimitHint('Minimal pembelian 1 unit.');
      return;
    }

    if (parsed > item.maxStock) {
      setLimitHint(`Stok maksimal ${item.maxStock} unit.`);
      updateQuantity(item.productId, item.maxStock);
      return;
    }

    setLimitHint(null);
    updateQuantity(item.productId, parsed);
  };

  const handleInputCommit = () => {
    if (isUnavailable) {
      setDraftQty(null);
      return;
    }

    if (draftQty === null) {
      return;
    }

    const parsed = Number.parseInt(draftQty, 10);
    setDraftQty(null);

    if (!Number.isFinite(parsed) || parsed < 1) {
      updateQuantity(item.productId, 1);
      setLimitHint('Jumlah disesuaikan ke minimal 1 unit.');
      return;
    }

    const result = updateQuantity(item.productId, parsed);
    if (result) {
      if (result.clamped) {
        setLimitHint(`Jumlah disesuaikan ke stok maksimal (${result.maxStock}).`);
      } else {
        setLimitHint(null);
      }
    }
  };

  const conflictMessage = (() => {
    if (!hasConflict) {
      return null;
    }

    if (item.conflict?.reason === 'PRODUCT_UNAVAILABLE') {
      return 'Produk ini sudah tidak tersedia di katalog.';
    }

    if (isUnavailable) {
      return 'Stok produk saat ini habis (tersisa 0).';
    }

    return `Stok tersisa ${item.maxStock} unit (di keranjang ${item.quantity}).`;
  })();

  return (
    <li
      className={cn(
        'rounded-[12px] border p-3.5 transition-colors duration-200',
        hasConflict
          ? 'border-[#F5CACA] bg-danger-bg/45'
          : 'border-hairline bg-surface',
      )}
    >
      <div className="flex gap-3.5">
        <Link
          to={`/products/${item.productId}`}
          onClick={onNavigate}
          className="w-20 shrink-0 self-start overflow-hidden rounded-[10px] border border-hairline"
          aria-label={`Lihat detail ${item.name}`}
        >
          <ProductImage
            src={item.imageUrl}
            alt={item.name}
            aspect="square"
            muted={isUnavailable}
            compactFallback
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {item.category && (
                <p className="text-[11px] font-medium tracking-wide text-ink-secondary uppercase">
                  {item.category}
                </p>
              )}
              <Link
                to={`/products/${item.productId}`}
                onClick={onNavigate}
                className="line-clamp-2 text-sm font-semibold leading-snug text-ink transition-colors hover:text-accent"
              >
                {item.name}
              </Link>
              <p className="mt-1 font-mono text-xs text-ink-secondary tabular-nums">
                {formatIDR(item.price)} / unit
              </p>
            </div>

            <button
              type="button"
              onClick={() => removeItem(item.productId)}
              aria-label={`Hapus ${item.name} dari keranjang`}
              className="-mt-1.5 -mr-1.5 inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-ink-secondary transition-colors hover:bg-danger-bg hover:text-danger"
            >
              <Trash2 className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
            </button>
          </div>

          {/* Quantity Controls + Line Subtotal */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {!isUnavailable ? (
              <div className="inline-flex items-center rounded-[10px] border border-hairline bg-canvas">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={item.quantity <= 1}
                  aria-label={`Kurangi jumlah ${item.name}`}
                  className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-l-[10px] text-ink transition-colors hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
                </button>

                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={inputDisplayValue}
                  onChange={(event) => handleInputChange(event.target.value)}
                  onBlur={handleInputCommit}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.currentTarget.blur();
                    }
                  }}
                  aria-label={`Jumlah ${item.name}`}
                  className="min-h-[44px] w-12 border-x border-hairline bg-surface text-center font-mono text-sm font-semibold text-ink tabular-nums focus:outline-none"
                />

                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={item.quantity >= item.maxStock}
                  aria-label={`Tambah jumlah ${item.name}`}
                  className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-r-[10px] text-ink transition-colors hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <span className="inline-flex items-center rounded-full bg-danger-bg px-2.5 py-1 text-xs font-semibold text-danger">
                Tidak tersedia
              </span>
            )}

            <div className="text-right">
              <p className="font-mono text-sm font-semibold text-ink tabular-nums">
                {formatIDR(lineTotal)}
              </p>
              {!isUnavailable && (
                <p className="text-[11px] text-ink-secondary tabular-nums">
                  Maks. {item.maxStock}
                </p>
              )}
            </div>
          </div>

          {limitHint && !hasConflict && (
            <p role="status" className="mt-2 text-xs font-medium text-warning">
              {limitHint}
            </p>
          )}

          {conflictMessage && (
            <div
              role="alert"
              className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[#F5CACA] bg-surface px-3 py-2"
            >
              <p className="flex items-start gap-1.5 text-xs font-medium text-danger">
                <AlertCircle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 stroke-[2]"
                  aria-hidden="true"
                />
                <span>{conflictMessage}</span>
              </p>

              <button
                type="button"
                onClick={() => resolveConflictForItem(item.productId)}
                className="inline-flex min-h-[44px] cursor-pointer items-center rounded-[8px] bg-danger-bg px-3 py-1 text-xs font-semibold text-danger transition-colors hover:bg-[#FBDADA]"
              >
                {isUnavailable ? 'Hapus item' : `Sesuaikan ke ${item.maxStock}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
