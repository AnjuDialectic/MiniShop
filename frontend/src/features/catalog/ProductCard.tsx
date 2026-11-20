import { ShoppingBag } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ProductImage } from '../../components/ui/ProductImage';
import { useCartStore } from '../../stores/cartStore';
import { useToastStore } from '../../stores/toastStore';
import type { Product } from '../../types/product';
import { cn, formatIDR } from '../../utils/format';

export interface ProductCardProps {
  product: Product;
  priority?: boolean;
  onSelect: (product: Product) => void;
}

export function ProductCard({
  product,
  priority = false,
  onSelect,
}: ProductCardProps) {
  const cartQty = useCartStore(
    (state) =>
      state.items.find((item) => item.productId === product.id)?.quantity ?? 0,
  );
  const addItem = useCartStore((state) => state.addItem);
  const showToast = useToastStore((state) => state.showToast);

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 3;
  const isMaxInCart = !isOutOfStock && cartQty >= product.stock;

  const handleQuickAdd = () => {
    const result = addItem(product, 1);

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
        `Ditambahkan ke keranjang (maksimal stok ${result.maxStock} unit).`,
        'info',
      );
      return;
    }

    showToast(`"${product.name}" ditambahkan ke keranjang.`, 'success');
  };

  return (
    <article
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-[14px] border border-hairline bg-surface shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-editorial)]',
        isOutOfStock
          ? 'opacity-90'
          : 'hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-lift)]',
      )}
    >
      {/* Clickable Photo Trigger */}
      <button
        type="button"
        onClick={() => onSelect(product)}
        aria-label={`Lihat detail ${product.name}`}
        className="relative block w-full cursor-pointer overflow-hidden text-left focus-visible:outline-offset-[-2px]"
      >
        <ProductImage
          src={product.image_url}
          alt={product.name}
          aspect="4/3"
          priority={priority}
          muted={isOutOfStock}
          imgClassName={!isOutOfStock ? 'group-hover:scale-[1.03]' : undefined}
        />

        {isOutOfStock && (
          <div className="pointer-events-none absolute top-3 left-3">
            <Badge variant="danger" className="shadow-[var(--shadow-card)]">
              Stok Habis
            </Badge>
          </div>
        )}

        {isLowStock && (
          <div className="pointer-events-none absolute top-3 left-3">
            <Badge
              variant="warning"
              className="tabular-nums shadow-[var(--shadow-card)]"
            >
              Sisa {product.stock}
            </Badge>
          </div>
        )}
      </button>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Tight Proximity Group: Category + Stock + Name + Description */}
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-medium tracking-wide text-ink-secondary">
              {product.category}
            </span>

            {isOutOfStock ? (
              <span className="shrink-0 font-mono text-xs font-semibold text-danger tabular-nums">
                Stok: 0
              </span>
            ) : isLowStock ? (
              <span className="shrink-0 font-mono text-xs font-semibold text-warning tabular-nums">
                Sisa {product.stock}
              </span>
            ) : (
              <span className="shrink-0 font-mono text-xs font-medium text-success tabular-nums">
                Stok: {product.stock}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onSelect(product)}
            className="cursor-pointer text-left"
          >
            <h3 className="line-clamp-2 font-display text-base font-bold leading-snug text-ink transition-colors group-hover:text-accent">
              {product.name}
            </h3>
          </button>

          <p className="line-clamp-2 text-sm leading-relaxed text-ink-secondary">
            {product.description}
          </p>
        </div>

        {/* Separated Action Zone (Law of Proximity) */}
        <div className="mt-4 border-t border-hairline pt-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-mono text-base font-bold text-ink tabular-nums sm:text-[17px]">
              {formatIDR(product.price)}
            </p>
            {cartQty > 0 && (
              <span className="font-mono text-xs font-medium text-ink-secondary tabular-nums">
                {cartQty} di keranjang
              </span>
            )}
          </div>

          <Button
            variant={isOutOfStock || isMaxInCart ? 'secondary' : 'dark'}
            fullWidth
            disabled={isOutOfStock || isMaxInCart}
            onClick={handleQuickAdd}
            leftIcon={
              !isOutOfStock && !isMaxInCart ? (
                <ShoppingBag className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
              ) : undefined
            }
            className="mt-3"
          >
            {isOutOfStock
              ? 'Stok Habis'
              : isMaxInCart
                ? 'Maksimal di Keranjang'
                : 'Tambah ke Keranjang'}
          </Button>
        </div>
      </div>
    </article>
  );
}
