import { useState } from 'react';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ProductImage } from '../../components/ui/ProductImage';
import { useCartStore } from '../../stores/cartStore';
import { useToastStore } from '../../stores/toastStore';
import { useUiStore } from '../../stores/uiStore';
import type { Product } from '../../types/product';
import { formatIDR } from '../../utils/format';

export interface ProductDetailContentProps {
  product: Product;
  onAddedToCart?: () => void;
}

export function ProductDetailContent({
  product,
  onAddedToCart,
}: ProductDetailContentProps) {
  const cartQty = useCartStore(
    (state) =>
      state.items.find((item) => item.productId === product.id)?.quantity ?? 0,
  );
  const addItem = useCartStore((state) => state.addItem);
  const showToast = useToastStore((state) => state.showToast);
  const openCart = useUiStore((state) => state.openCart);

  const isOutOfStock = product.stock <= 0;
  const remainingQuota = Math.max(0, product.stock - cartQty);
  const isMaxInCart = !isOutOfStock && remainingQuota === 0;

  const [selectionState, setSelectionState] = useState<{
    productId: number;
    quantity: number;
    draftQty: string | null;
    hint: string | null;
  }>({
    productId: product.id,
    quantity: 1,
    draftQty: null,
    hint: null,
  });

  const isCurrentProduct = selectionState.productId === product.id;
  const rawQuantity = isCurrentProduct ? selectionState.quantity : 1;
  const effectiveQuantity =
    remainingQuota > 0 ? Math.max(1, Math.min(rawQuantity, remainingQuota)) : 1;
  const inputDisplayValue =
    isCurrentProduct && selectionState.draftQty !== null
      ? selectionState.draftQty
      : String(effectiveQuantity);
  const qtyHint = isCurrentProduct ? selectionState.hint : null;

  const setLocalSelection = (next: {
    quantity: number;
    draftQty: string | null;
    hint: string | null;
  }) => {
    setSelectionState({
      productId: product.id,
      ...next,
    });
  };

  const handleDecrement = () => {
    const next = Math.max(1, effectiveQuantity - 1);
    setLocalSelection({ quantity: next, draftQty: null, hint: null });
  };

  const handleIncrement = () => {
    if (effectiveQuantity >= remainingQuota) {
      setLocalSelection({
        quantity: effectiveQuantity,
        draftQty: null,
        hint: `Maksimal tambahan ${remainingQuota} unit sesuai stok.`,
      });
      return;
    }

    const next = Math.min(remainingQuota, effectiveQuantity + 1);
    setLocalSelection({ quantity: next, draftQty: null, hint: null });
  };

  const handleInputChange = (rawValue: string) => {
    const digitsOnly = rawValue.replace(/[^\d]/g, '');

    if (digitsOnly === '') {
      setLocalSelection({
        quantity: effectiveQuantity,
        draftQty: '',
        hint: null,
      });
      return;
    }

    const parsed = Number.parseInt(digitsOnly, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setLocalSelection({
        quantity: effectiveQuantity,
        draftQty: digitsOnly,
        hint: 'Minimal pembelian 1 unit.',
      });
      return;
    }

    if (parsed > remainingQuota) {
      setLocalSelection({
        quantity: remainingQuota,
        draftQty: digitsOnly,
        hint: `Maksimal dapat menambah ${remainingQuota} unit.`,
      });
      return;
    }

    setLocalSelection({
      quantity: parsed,
      draftQty: digitsOnly,
      hint: null,
    });
  };

  const handleInputBlur = () => {
    if (!isCurrentProduct || selectionState.draftQty === null) {
      return;
    }

    const parsed = Number.parseInt(selectionState.draftQty, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setLocalSelection({
        quantity: 1,
        draftQty: null,
        hint: 'Jumlah disesuaikan ke minimal 1 unit.',
      });
      return;
    }

    const clamped = Math.max(1, Math.min(parsed, Math.max(1, remainingQuota)));
    setLocalSelection({
      quantity: clamped,
      draftQty: null,
      hint:
        clamped !== parsed
          ? `Disesuaikan ke batas tersedia (${clamped} unit).`
          : null,
    });
  };

  const handleAddToCart = () => {
    const result = addItem(product, effectiveQuantity);

    if (result.status === 'out_of_stock') {
      showToast(`${product.name} sedang habis.`, 'danger');
      return;
    }

    if (result.status === 'max_reached') {
      showToast(
        `Jumlah di keranjang sudah mencapai batas stok tersedia (${result.maxStock}).`,
        'warning',
      );
      return;
    }

    if (result.status === 'capped') {
      showToast(
        `${result.addedQuantity} unit ditambahkan (mencapai batas stok ${result.maxStock}).`,
        'info',
      );
    } else {
      showToast(
        `${result.addedQuantity}× ${product.name} ditambahkan ke keranjang.`,
        'success',
      );
    }

    setLocalSelection({ quantity: 1, draftQty: null, hint: null });
    onAddedToCart?.();
  };

  const handleOpenCart = () => {
    onAddedToCart?.();
    openCart();
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
      {/* Product Photo */}
      <div className="self-start overflow-hidden rounded-[12px] border border-hairline bg-subtle">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          aspect="4/3"
          priority
          muted={isOutOfStock}
        />
      </div>

      {/* Product Information & Controls */}
      <div className="flex flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">{product.category}</Badge>

          {isOutOfStock ? (
            <Badge variant="danger">Stok Habis</Badge>
          ) : product.stock <= 3 ? (
            <Badge variant="warning" className="tabular-nums">
              Sisa {product.stock} unit
            </Badge>
          ) : (
            <Badge variant="success" className="tabular-nums">
              Stok tersedia: {product.stock}
            </Badge>
          )}
        </div>

        <h1 className="mt-3 font-display text-xl font-bold leading-snug text-ink sm:text-2xl">
          {product.name}
        </h1>

        <p className="mt-2 font-mono text-2xl font-bold text-ink tabular-nums">
          {formatIDR(product.price)}
        </p>

        <div className="mt-4 border-t border-hairline pt-4">
          <h2 className="text-xs font-semibold tracking-wide text-ink-secondary uppercase">
            Deskripsi Produk
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-secondary">
            {product.description}
          </p>
        </div>

        {cartQty > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-hairline bg-subtle/80 px-3.5 py-2.5 text-xs">
            <span className="font-medium text-ink tabular-nums">
              Sudah ada <strong>{cartQty}</strong> unit di keranjang Anda.
            </span>
            <button
              type="button"
              onClick={handleOpenCart}
              className="cursor-pointer font-semibold text-accent underline-offset-4 hover:underline"
            >
              Lihat Keranjang
            </button>
          </div>
        )}

        {/* Quantity Stepper & Focal CTA */}
        <div className="mt-6 space-y-3 border-t border-hairline pt-5">
          {!isOutOfStock && !isMaxInCart && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-ink">Jumlah</span>
                <div className="inline-flex items-center rounded-[10px] border border-hairline bg-canvas">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={effectiveQuantity <= 1}
                    aria-label="Kurangi jumlah pembelian"
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
                    onBlur={handleInputBlur}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.currentTarget.blur();
                      }
                    }}
                    aria-label="Jumlah pembelian"
                    className="min-h-[44px] w-14 border-x border-hairline bg-surface text-center font-mono text-sm font-semibold text-ink tabular-nums focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={effectiveQuantity >= remainingQuota}
                    aria-label="Tambah jumlah pembelian"
                    className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-r-[10px] text-ink transition-colors hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {qtyHint && (
                <p role="status" className="mt-1.5 text-right text-xs font-medium text-warning">
                  {qtyHint}
                </p>
              )}
            </div>
          )}

          {isOutOfStock ? (
            <Button variant="secondary" size="lg" fullWidth disabled>
              Stok Habis
            </Button>
          ) : isMaxInCart ? (
            <div className="space-y-2.5">
              <Button variant="secondary" size="lg" fullWidth disabled>
                Maksimal di Keranjang ({product.stock} unit)
              </Button>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleOpenCart}
                leftIcon={
                  <ShoppingBag className="h-4 w-4 stroke-[2]" aria-hidden="true" />
                }
              >
                Buka Keranjang Belanja
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleAddToCart}
              leftIcon={
                <ShoppingBag className="h-4 w-4 stroke-[2]" aria-hidden="true" />
              }
            >
              Tambah ke Keranjang · {formatIDR(product.price * effectiveQuantity)}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
