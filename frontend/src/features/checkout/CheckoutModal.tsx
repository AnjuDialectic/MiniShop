import { useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { isApiError } from '../../api/client';
import { createOrder } from '../../api/orders';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { ProductImage } from '../../components/ui/ProductImage';
import {
  isCartItemConflicted,
  selectGrandTotal,
  selectHasCartConflicts,
  selectTotalItems,
  useCartStore,
} from '../../stores/cartStore';
import { useToastStore } from '../../stores/toastStore';
import { useUiStore } from '../../stores/uiStore';
import type { CheckoutConflictItem } from '../../types/api';
import { cn, formatIDR } from '../../utils/format';

interface FormFieldErrors {
  customer_name?: string;
  customer_email?: string;
  notes?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CheckoutModal() {
  const isOpen = useUiStore((state) => state.isCheckoutOpen);
  const closeCheckout = useUiStore((state) => state.closeCheckout);
  const openCart = useUiStore((state) => state.openCart);
  const triggerCatalogRefresh = useUiStore((state) => state.triggerCatalogRefresh);

  const items = useCartStore((state) => state.items);
  const totalItems = useCartStore(selectTotalItems);
  const grandTotal = useCartStore(selectGrandTotal);
  const hasCartConflicts = useCartStore(selectHasCartConflicts);
  const clearCart = useCartStore((state) => state.clearCart);
  const applyStockConflicts = useCartStore((state) => state.applyStockConflicts);
  const resolveConflictForItem = useCartStore((state) => state.resolveConflictForItem);
  const resolveAllConflicts = useCartStore((state) => state.resolveAllConflicts);
  const removeItem = useCartStore((state) => state.removeItem);

  const showToast = useToastStore((state) => state.showToast);
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [conflictHeadline, setConflictHeadline] = useState<string | null>(null);
  const [serverConflicts, setServerConflicts] = useState<CheckoutConflictItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputId = useId();
  const emailInputId = useId();
  const notesInputId = useId();

  // Keep serverConflicts synced with active cart items so resolved/removed conflicts disappear live
  const activeConflicts: CheckoutConflictItem[] = (() => {
    if (serverConflicts.length > 0) {
      return serverConflicts.filter((conflict) => {
        const cartItem = items.find((item) => item.productId === conflict.product_id);
        if (!cartItem) {
          return false;
        }
        return isCartItemConflicted(cartItem);
      });
    }

    return items
      .filter(isCartItemConflicted)
      .map((item) => ({
        product_id: item.productId,
        product_name: item.name,
        requested_quantity: item.conflict?.requestedQuantity ?? item.quantity,
        available_stock: item.conflict?.availableStock ?? item.maxStock,
        reason:
          item.conflict?.reason ??
          (item.unavailable ? 'PRODUCT_UNAVAILABLE' : 'INSUFFICIENT_STOCK'),
      }));
  })();

  const hasBlockingConflicts = activeConflicts.length > 0 || hasCartConflicts;

  const handleCloseModal = () => {
    if (isSubmitting) {
      return;
    }
    setGeneralError(null);
    setFieldErrors({});
    if (!hasCartConflicts) {
      setServerConflicts([]);
      setConflictHeadline(null);
    }
    closeCheckout();
  };

  const handleBackToCart = () => {
    if (isSubmitting) {
      return;
    }
    setGeneralError(null);
    setFieldErrors({});
    closeCheckout();
    openCart();
  };

  const handleResolveSingleConflict = (conflict: CheckoutConflictItem) => {
    if (conflict.reason === 'PRODUCT_UNAVAILABLE' || conflict.available_stock <= 0) {
      removeItem(conflict.product_id);
      showToast(
        `${conflict.product_name ?? 'Produk'} dihapus dari keranjang.`,
        'info',
      );
    } else {
      resolveConflictForItem(conflict.product_id);
      showToast(
        `Jumlah ${conflict.product_name ?? 'produk'} disesuaikan menjadi ${conflict.available_stock} unit.`,
        'success',
      );
    }

    setServerConflicts((prev) =>
      prev.filter((entry) => entry.product_id !== conflict.product_id),
    );
    setGeneralError(null);
  };

  const handleResolveAllConflicts = () => {
    const { adjustedCount, removedCount } = resolveAllConflicts();
    setServerConflicts([]);
    setConflictHeadline(null);
    setGeneralError(null);

    const summary: string[] = [];
    if (adjustedCount > 0) {
      summary.push(`${adjustedCount} item disesuaikan`);
    }
    if (removedCount > 0) {
      summary.push(`${removedCount} item tidak tersedia dihapus`);
    }

    showToast(
      summary.length > 0
        ? `Pesanan diperbarui: ${summary.join(', ')}. Silakan lanjutkan checkout.`
        : 'Konflik stok berhasil diselesaikan.',
      'success',
    );
  };

  const validateForm = (): FormFieldErrors => {
    const nextErrors: FormFieldErrors = {};
    const trimmedName = customerName.trim();
    const trimmedEmail = customerEmail.trim();
    const trimmedNotes = notes.trim();

    if (trimmedName.length === 0) {
      nextErrors.customer_name = 'Nama pembeli wajib diisi.';
    } else if (trimmedName.length < 2) {
      nextErrors.customer_name = 'Nama pembeli minimal 2 karakter.';
    } else if (trimmedName.length > 120) {
      nextErrors.customer_name = 'Nama pembeli maksimal 120 karakter.';
    }

    if (trimmedEmail.length > 0) {
      if (trimmedEmail.length > 150) {
        nextErrors.customer_email = 'Email pembeli maksimal 150 karakter.';
      } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
        nextErrors.customer_email = 'Format email pembeli tidak valid.';
      }
    }

    if (trimmedNotes.length > 500) {
      nextErrors.notes = 'Catatan pesanan maksimal 500 karakter.';
    }

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting || items.length === 0 || hasBlockingConflicts) {
      return;
    }

    const clientErrors = validateForm();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setFieldErrors({});
    setGeneralError(null);
    setConflictHeadline(null);
    setIsSubmitting(true);

    try {
      const trimmedName = customerName.trim();
      const trimmedEmail = customerEmail.trim();
      const trimmedNotes = notes.trim();

      const order = await createOrder({
        customer_name: trimmedName,
        customer_email: trimmedEmail !== '' ? trimmedEmail : null,
        notes: trimmedNotes !== '' ? trimmedNotes : null,
        items: items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
        })),
      });

      clearCart();
      triggerCatalogRefresh();
      setCustomerName('');
      setCustomerEmail('');
      setNotes('');
      setServerConflicts([]);
      setConflictHeadline(null);
      closeCheckout();
      showToast(`Pesanan ${order.order_code} berhasil dibuat!`, 'success');
      navigate(`/orders/${order.id}/confirmation`, {
        state: { order },
      });
    } catch (error) {
      if (isApiError(error)) {
        if (error.isConflictError) {
          applyStockConflicts(error.conflicts);
          triggerCatalogRefresh();
          setServerConflicts(error.conflicts);
          setConflictHeadline(error.message);
          showToast(
            'Stok beberapa produk berubah. Sesuaikan jumlah untuk melanjutkan.',
            'warning',
            4500,
          );
          return;
        }

        if (error.isValidationError) {
          const nextFieldErrors: FormFieldErrors = {};
          const otherMessages: string[] = [];

          for (const [field, messages] of Object.entries(error.validationErrors)) {
            const firstMessage = messages[0];
            if (!firstMessage) {
              continue;
            }

            if (field === 'customer_name') {
              nextFieldErrors.customer_name = firstMessage;
            } else if (field === 'customer_email') {
              nextFieldErrors.customer_email = firstMessage;
            } else if (field === 'notes') {
              nextFieldErrors.notes = firstMessage;
            } else {
              otherMessages.push(firstMessage);
            }
          }

          setFieldErrors(nextFieldErrors);
          if (otherMessages.length > 0) {
            setGeneralError(otherMessages.join(' '));
          } else if (Object.keys(nextFieldErrors).length === 0) {
            setGeneralError(error.message);
          }
          return;
        }

        setGeneralError(error.message);
      } else {
        setGeneralError('Terjadi kesalahan tak terduga. Silakan coba lagi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCloseModal}
      title="Checkout Pesanan"
      subtitle="Lengkapi informasi pembeli untuk menyelesaikan pesanan secara instan."
      size="lg"
      disableClose={isSubmitting}
      footer={
        items.length > 0 ? (
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="secondary"
              onClick={handleBackToCart}
              disabled={isSubmitting}
              leftIcon={<ArrowLeft className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />}
            >
              Kembali ke Keranjang
            </Button>

            <Button
              type="submit"
              form="minishop-checkout-form"
              variant="primary"
              size="lg"
              disabled={hasBlockingConflicts || items.length === 0}
              isLoading={isSubmitting}
              loadingText="Memproses Pesanan..."
              leftIcon={
                <CheckCircle2 className="h-4 w-4 stroke-[2]" aria-hidden="true" />
              }
            >
              Buat Pesanan · {formatIDR(grandTotal)}
            </Button>
          </div>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6 stroke-[1.75]" aria-hidden="true" />}
          title="Keranjang belanja kosong"
          description="Tambahkan minimal 1 produk tersedia sebelum melakukan checkout."
          action={
            <Button
              variant="primary"
              onClick={() => {
                closeCheckout();
                navigate('/');
              }}
            >
              Kembali ke Katalog
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* 409 Stock Conflict Recovery Panel */}
          {activeConflicts.length > 0 && (
            <section
              role="alert"
              aria-live="assertive"
              className="rounded-[12px] border border-[#F5CACA] bg-danger-bg p-4"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-danger">
                  <AlertTriangle className="h-5 w-5 stroke-[1.75]" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-sm font-bold text-danger sm:text-base">
                    Stok Produk Berubah (Konflik Ketersediaan)
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-secondary sm:text-sm">
                    {conflictHeadline ??
                      'Sebagian produk di keranjang melebihi stok terbaru di server. Sesuaikan jumlah atau hapus produk bermasalah untuk melanjutkan.'}
                  </p>
                </div>
              </div>

              <ul className="mt-3.5 space-y-2.5">
                {activeConflicts.map((conflict) => {
                  const cartItem = items.find(
                    (item) => item.productId === conflict.product_id,
                  );
                  const displayName =
                    conflict.product_name ??
                    cartItem?.name ??
                    `Produk #${conflict.product_id}`;
                  const isUnavailable =
                    conflict.reason === 'PRODUCT_UNAVAILABLE' ||
                    conflict.available_stock <= 0;

                  const detailText =
                    conflict.reason === 'PRODUCT_UNAVAILABLE'
                      ? 'Produk sudah tidak tersedia lagi di katalog.'
                      : conflict.available_stock <= 0
                        ? `Stok saat ini habis (tersisa 0 unit, diminta ${conflict.requested_quantity}).`
                        : `Stok tersisa ${conflict.available_stock} unit (Anda meminta ${conflict.requested_quantity} unit).`;

                  return (
                    <li
                      key={conflict.product_id}
                      className="flex flex-col gap-2.5 rounded-[10px] border border-[#F5CACA] bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">
                          {displayName}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-danger tabular-nums">
                          {detailText}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {!isUnavailable && (
                          <Button
                            variant="secondary"
                            onClick={() => handleResolveSingleConflict(conflict)}
                            className="min-h-[44px] px-3 text-xs font-semibold"
                          >
                            Sesuaikan ke {conflict.available_stock}
                          </Button>
                        )}
                        <Button
                          variant="danger-soft"
                          onClick={() => {
                            removeItem(conflict.product_id);
                            setServerConflicts((prev) =>
                              prev.filter(
                                (entry) => entry.product_id !== conflict.product_id,
                              ),
                            );
                            showToast(`${displayName} dihapus dari keranjang.`, 'info');
                          }}
                          leftIcon={
                            <Trash2 className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden="true" />
                          }
                          className="min-h-[44px] px-3 text-xs font-semibold"
                        >
                          Hapus
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border-t border-[#F5CACA] pt-3">
                <Button
                  variant="danger"
                  onClick={handleResolveAllConflicts}
                  className="text-xs font-semibold sm:text-sm"
                >
                  Sesuaikan Semua ke Stok Tersedia
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleBackToCart}
                  className="text-xs font-semibold sm:text-sm"
                >
                  Atur Manual di Keranjang
                </Button>
              </div>
            </section>
          )}

          {/* General Non-Conflict Error Banner */}
          {generalError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-[10px] border border-[#F5CACA] bg-danger-bg px-3.5 py-3 text-sm text-danger"
            >
              <AlertCircle
                className="mt-0.5 h-4.5 w-4.5 shrink-0 stroke-[1.75]"
                aria-hidden="true"
              />
              <span>{generalError}</span>
            </div>
          )}

          {/* Order Summary */}
          <section aria-label="Ringkasan item pesanan">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold tracking-tight text-ink uppercase">
                Ringkasan Pesanan ({totalItems} unit)
              </h3>
              <span className="text-xs text-ink-secondary">
                {items.length} jenis produk
              </span>
            </div>

            <div className="mt-2.5 overflow-hidden rounded-[12px] border border-hairline bg-canvas/70">
              <ul className="max-h-52 divide-y divide-hairline overflow-y-auto">
                {items.map((item) => {
                  const conflicted = isCartItemConflicted(item);
                  return (
                    <li
                      key={item.productId}
                      className={cn(
                        'flex items-center gap-3 px-3.5 py-2.5',
                        conflicted && 'bg-danger-bg/50',
                      )}
                    >
                      <div className="w-12 shrink-0 overflow-hidden rounded-[8px] border border-hairline">
                        <ProductImage
                          src={item.imageUrl}
                          alt={item.name}
                          aspect="square"
                          muted={Boolean(item.unavailable)}
                          compactFallback
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {item.name}
                        </p>
                        <p className="font-mono text-xs text-ink-secondary tabular-nums">
                          {item.quantity} × {formatIDR(item.price)}
                        </p>
                      </div>

                      <p className="shrink-0 font-mono text-sm font-semibold text-ink tabular-nums">
                        {formatIDR(item.price * item.quantity)}
                      </p>
                    </li>
                  );
                })}
              </ul>

              <div className="flex items-center justify-between border-t border-hairline bg-surface px-4 py-3">
                <span className="text-sm font-semibold text-ink">Total Pembayaran</span>
                <span className="font-mono text-base font-bold text-ink tabular-nums sm:text-lg">
                  {formatIDR(grandTotal)}
                </span>
              </div>
            </div>
          </section>

          {/* Customer Info Form */}
          <form
            id="minishop-checkout-form"
            onSubmit={(event) => void handleSubmit(event)}
            noValidate
            className="space-y-4"
          >
            <h3 className="font-display text-sm font-bold tracking-tight text-ink uppercase">
              Informasi Pembeli
            </h3>

            <div>
              <label
                htmlFor={nameInputId}
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Nama Pembeli <span className="text-danger">*</span>
              </label>
              <input
                id={nameInputId}
                type="text"
                name="customer_name"
                autoComplete="name"
                required
                maxLength={120}
                value={customerName}
                onChange={(event) => {
                  setCustomerName(event.target.value);
                  if (fieldErrors.customer_name) {
                    setFieldErrors((prev) => ({ ...prev, customer_name: undefined }));
                  }
                }}
                placeholder="Contoh: Budi Santoso"
                aria-invalid={Boolean(fieldErrors.customer_name)}
                aria-describedby={
                  fieldErrors.customer_name ? `${nameInputId}-error` : undefined
                }
                disabled={isSubmitting}
                className={cn(
                  'min-h-[44px] w-full rounded-[10px] border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-secondary/75 transition-colors',
                  fieldErrors.customer_name
                    ? 'border-danger bg-danger-bg/20'
                    : 'border-hairline hover:border-border-strong focus:border-accent',
                )}
              />
              {fieldErrors.customer_name && (
                <p
                  id={`${nameInputId}-error`}
                  role="alert"
                  className="mt-1.5 text-xs font-medium text-danger"
                >
                  {fieldErrors.customer_name}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={emailInputId}
                className="mb-1.5 flex items-center justify-between text-sm font-medium text-ink"
              >
                <span>Email Pembeli</span>
                <span className="text-xs font-normal text-ink-secondary">Opsional</span>
              </label>
              <input
                id={emailInputId}
                type="email"
                name="customer_email"
                autoComplete="email"
                maxLength={150}
                value={customerEmail}
                onChange={(event) => {
                  setCustomerEmail(event.target.value);
                  if (fieldErrors.customer_email) {
                    setFieldErrors((prev) => ({ ...prev, customer_email: undefined }));
                  }
                }}
                placeholder="nama@email.com (untuk catatan nota)"
                aria-invalid={Boolean(fieldErrors.customer_email)}
                aria-describedby={
                  fieldErrors.customer_email ? `${emailInputId}-error` : undefined
                }
                disabled={isSubmitting}
                className={cn(
                  'min-h-[44px] w-full rounded-[10px] border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-secondary/75 transition-colors',
                  fieldErrors.customer_email
                    ? 'border-danger bg-danger-bg/20'
                    : 'border-hairline hover:border-border-strong focus:border-accent',
                )}
              />
              {fieldErrors.customer_email && (
                <p
                  id={`${emailInputId}-error`}
                  role="alert"
                  className="mt-1.5 text-xs font-medium text-danger"
                >
                  {fieldErrors.customer_email}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={notesInputId}
                className="mb-1.5 flex items-center justify-between text-sm font-medium text-ink"
              >
                <span>Catatan Pesanan</span>
                <span className="font-mono text-xs font-normal text-ink-secondary tabular-nums">
                  {notes.length}/500
                </span>
              </label>
              <textarea
                id={notesInputId}
                name="notes"
                rows={3}
                maxLength={500}
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  if (fieldErrors.notes) {
                    setFieldErrors((prev) => ({ ...prev, notes: undefined }));
                  }
                }}
                placeholder="Contoh: Packing bubble wrap tebal, kirim hari kerja..."
                aria-invalid={Boolean(fieldErrors.notes)}
                aria-describedby={fieldErrors.notes ? `${notesInputId}-error` : undefined}
                disabled={isSubmitting}
                className={cn(
                  'w-full resize-none rounded-[10px] border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-secondary/75 transition-colors',
                  fieldErrors.notes
                    ? 'border-danger bg-danger-bg/20'
                    : 'border-hairline hover:border-border-strong focus:border-accent',
                )}
              />
              {fieldErrors.notes && (
                <p
                  id={`${notesInputId}-error`}
                  role="alert"
                  className="mt-1.5 text-xs font-medium text-danger"
                >
                  {fieldErrors.notes}
                </p>
              )}
            </div>

            <div className="flex items-start gap-2.5 rounded-[10px] border border-hairline bg-subtle/70 px-3.5 py-2.5 text-xs text-ink-secondary">
              <ShieldCheck
                className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.75] text-success"
                aria-hidden="true"
              />
              <span>
                Checkout diproses langsung tanpa payment gateway. Harga dan ketersediaan stok diverifikasi otomatis secara atomik di server.
              </span>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}
