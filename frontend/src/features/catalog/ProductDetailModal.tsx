import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import type { Product } from '../../types/product';
import { ProductDetailContent } from './ProductDetailContent';

export interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  return (
    <Modal
      isOpen={product !== null}
      onClose={onClose}
      title={product ? product.name : 'Detail Produk'}
      subtitle={product ? `Kategori ${product.category}` : undefined}
      size="xl"
      footer={
        product ? (
          <div className="flex items-center justify-between gap-3">
            <Link
              to={`/products/${product.id}`}
              onClick={onClose}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] px-2 text-xs font-medium text-ink-secondary transition-colors hover:text-ink sm:text-sm"
            >
              <ExternalLink className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
              <span>Buka halaman penuh</span>
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] cursor-pointer items-center rounded-[10px] border border-hairline bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-border-strong hover:bg-subtle"
            >
              Tutup
            </button>
          </div>
        ) : undefined
      }
    >
      {product && (
        <ProductDetailContent product={product} onAddedToCart={onClose} />
      )}
    </Modal>
  );
}
