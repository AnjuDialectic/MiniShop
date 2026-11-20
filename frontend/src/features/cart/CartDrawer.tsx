import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { useDialogBehavior } from '../../hooks/useDialogBehavior';
import {
  selectGrandTotal,
  selectHasCartConflicts,
  selectTotalItems,
  useCartStore,
} from '../../stores/cartStore';
import { useToastStore } from '../../stores/toastStore';
import { useUiStore } from '../../stores/uiStore';
import { formatIDR } from '../../utils/format';
import { CartItemRow } from './CartItemRow';

export function CartDrawer() {
  const isOpen = useUiStore((state) => state.isCartOpen);
  const closeCart = useUiStore((state) => state.closeCart);
  const openCheckout = useUiStore((state) => state.openCheckout);

  const items = useCartStore((state) => state.items);
  const totalItems = useCartStore(selectTotalItems);
  const grandTotal = useCartStore(selectGrandTotal);
  const hasConflicts = useCartStore(selectHasCartConflicts);
  const clearCart = useCartStore((state) => state.clearCart);
  const resolveAllConflicts = useCartStore((state) => state.resolveAllConflicts);

  const showToast = useToastStore((state) => state.showToast);
  const navigate = useNavigate();

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const titleId = useId();
  const drawerRef = useRef<HTMLDivElement>(null);

  useDialogBehavior({
    isOpen,
    onClose: closeCart,
    containerRef: drawerRef,
    disableClose: confirmClearOpen,
  });

  if (!isOpen) {
    return null;
  }

  const handleResolveAll = () => {
    const { adjustedCount, removedCount } = resolveAllConflicts();
    const parts: string[] = [];
    if (adjustedCount > 0) {
      parts.push(`${adjustedCount} produk disesuaikan`);
    }
    if (removedCount > 0) {
      parts.push(`${removedCount} produk habis dihapus`);
    }
    if (parts.length > 0) {
      showToast(`Keranjang diperbarui: ${parts.join(', ')}.`, 'info');
    }
  };

  const handleClearConfirm = () => {
    clearCart();
    setConfirmClearOpen(false);
    showToast('Keranjang belanja dikosongkan.', 'info');
  };

  const handleStartShopping = () => {
    closeCart();
    navigate('/');
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 flex justify-end" role="presentation">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-ink/45 backdrop-blur-[2px] animate-fade-in"
          aria-hidden="true"
          onClick={closeCart}
        />

        {/* Slide-over drawer */}
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-hairline bg-canvas shadow-[var(--shadow-overlay)] animate-drawer-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-hairline bg-surface px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-subtle text-ink">
                <ShoppingBag className="h-4.5 w-4.5 stroke-[1.75]" aria-hidden="true" />
              </span>
              <div>
                <h2
                  id={titleId}
                  className="font-display text-base font-bold text-ink sm:text-lg"
                >
                  Keranjang Belanja
                </h2>
                <p className="font-mono text-xs text-ink-secondary tabular-nums">
                  {totalItems} unit · {items.length} produk
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(true)}
                  aria-label="Kosongkan keranjang"
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-[10px] px-3 text-xs font-medium text-ink-secondary transition-colors hover:bg-danger-bg hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden="true" />
                  <span>Kosongkan</span>
                </button>
              )}

              <button
                type="button"
                onClick={closeCart}
                aria-label="Tutup keranjang"
                className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-[10px] text-ink-secondary transition-colors hover:bg-subtle hover:text-ink"
              >
                <X className="h-5 w-5 stroke-[1.75]" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {items.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <EmptyState
                  icon={<ShoppingBag className="h-6 w-6 stroke-[1.75]" aria-hidden="true" />}
                  title="Keranjang masih kosong"
                  description="Tambahkan produk pilihan Anda dari katalog untuk mulai berbelanja."
                  action={
                    <Button variant="primary" onClick={handleStartShopping}>
                      Mulai Belanja
                    </Button>
                  }
                  className="w-full"
                />
              </div>
            ) : (
              <div className="space-y-3.5">
                {hasConflicts && (
                  <div
                    role="alert"
                    className="rounded-[12px] border border-[#F5CACA] bg-danger-bg p-3.5"
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle
                        className="mt-0.5 h-4.5 w-4.5 shrink-0 stroke-[1.75] text-danger"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="text-xs font-semibold text-danger">
                          Ada perubahan stok pada item di keranjang Anda
                        </p>
                        <p className="text-xs leading-relaxed text-ink-secondary">
                          Sesuaikan jumlah atau hapus item yang habis sebelum melanjutkan ke checkout.
                        </p>
                        <Button
                          variant="danger-soft"
                          onClick={handleResolveAll}
                          className="min-h-[44px] text-xs font-semibold"
                        >
                          Sesuaikan Semua ke Stok Tersedia
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <ul className="space-y-3" aria-label="Daftar produk dalam keranjang">
                  {items.map((item) => (
                    <CartItemRow
                      key={item.productId}
                      item={item}
                      onNavigate={closeCart}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sticky Footer */}
          {items.length > 0 && (
            <div className="border-t border-hairline bg-surface px-5 py-4 shadow-[0_-4px_16px_rgba(22,22,20,0.04)]">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm text-ink-secondary">
                  <span>Total Barang</span>
                  <span className="font-mono font-medium text-ink tabular-nums">
                    {totalItems} unit
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-sm font-semibold text-ink">
                    Subtotal Keseluruhan
                  </span>
                  <span className="font-mono text-lg font-bold text-ink tabular-nums">
                    {formatIDR(grandTotal)}
                  </span>
                </div>
              </div>

              {hasConflicts && (
                <p className="mt-2 text-xs font-medium text-danger">
                  Selesaikan peringatan stok di atas untuk melanjutkan checkout.
                </p>
              )}

              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={hasConflicts}
                rightIcon={<ArrowRight className="h-4 w-4 stroke-[2]" aria-hidden="true" />}
                onClick={openCheckout}
                className="mt-4"
              >
                Lanjut Checkout
              </Button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={handleClearConfirm}
        title="Kosongkan Keranjang?"
        description={`Semua ${items.length} produk (${totalItems} unit) akan dihapus dari keranjang belanja Anda.`}
        confirmLabel="Ya, Kosongkan"
        cancelLabel="Batal"
        variant="danger"
      />
    </>,
    document.body,
  );
}
