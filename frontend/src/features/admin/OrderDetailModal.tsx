import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  Copy,
  FileText,
  Mail,
  ReceiptText,
  RefreshCw,
  User,
} from 'lucide-react';
import { isAbortError, isApiError } from '../../api/client';
import { fetchOrderById } from '../../api/orders';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { ProductImage } from '../../components/ui/ProductImage';
import { useToastStore } from '../../stores/toastStore';
import type { Order } from '../../types/order';
import { formatDateTime, formatIDR } from '../../utils/format';

export interface OrderDetailModalProps {
  orderId: number | null;
  onClose: () => void;
}

type OrderDetailState =
  | { kind: 'loading' }
  | { kind: 'ready'; order: Order }
  | { kind: 'error'; message: string };

interface OrderDetailSnapshot {
  key: string;
  state: Exclude<OrderDetailState, { kind: 'loading' }>;
}

function formatOrderStatus(status: string): string {
  if (status === 'completed') {
    return 'Selesai';
  }
  return status;
}

function OrderDetailSkeleton() {
  return (
    <div aria-label="Memuat detail pesanan" className="space-y-5">
      <div className="grid grid-cols-1 gap-3 rounded-[12px] border border-hairline bg-canvas/70 p-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="h-3 w-24 animate-pulse rounded bg-subtle" />
            <div className="h-4 w-40 animate-pulse rounded bg-subtle" />
          </div>
        ))}
      </div>

      <div className="space-y-2.5">
        <div className="h-4 w-36 animate-pulse rounded bg-subtle" />
        <div className="divide-y divide-hairline overflow-hidden rounded-[12px] border border-hairline bg-surface">
          {Array.from({ length: 3 }, (_, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3.5">
              <div className="h-12 w-12 shrink-0 animate-pulse rounded-[8px] bg-subtle" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-4 w-44 animate-pulse rounded bg-subtle" />
                <div className="h-3 w-28 animate-pulse rounded bg-subtle" />
              </div>
              <div className="h-4 w-24 animate-pulse rounded bg-subtle" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OrderDetailModal({ orderId, onClose }: OrderDetailModalProps) {
  const showToast = useToastStore((state) => state.showToast);

  const [retryCount, setRetryCount] = useState(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<OrderDetailSnapshot | null>(null);

  const requestKey = orderId !== null ? `${orderId}:${retryCount}` : '';

  useEffect(() => {
    if (orderId === null) {
      return;
    }

    const controller = new AbortController();

    fetchOrderById(orderId, controller.signal)
      .then((order) => {
        setSnapshot({
          key: requestKey,
          state: { kind: 'ready', order },
        });
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          return;
        }
        setSnapshot({
          key: requestKey,
          state: {
            kind: 'error',
            message: isApiError(error)
              ? error.message
              : 'Gagal memuat detail pesanan.',
          },
        });
      });

    return () => controller.abort();
  }, [orderId, requestKey]);

  const state: OrderDetailState =
    orderId !== null && snapshot?.key === requestKey
      ? snapshot.state
      : { kind: 'loading' };

  const activeOrder = state.kind === 'ready' ? state.order : null;
  const orderItems = activeOrder?.items ?? [];

  const handleCopyCode = async (orderCode: string) => {
    try {
      await navigator.clipboard.writeText(orderCode);
      setCopiedCode(orderCode);
      showToast(`Kode pesanan ${orderCode} disalin.`, 'success', 2400);
      window.setTimeout(() => {
        setCopiedCode((current) => (current === orderCode ? null : current));
      }, 2000);
    } catch {
      showToast('Tidak dapat menyalin kode secara otomatis.', 'warning');
    }
  };

  return (
    <Modal
      isOpen={orderId !== null}
      onClose={onClose}
      title={activeOrder ? `Detail Pesanan ${activeOrder.order_code}` : 'Detail Pesanan'}
      subtitle={
        activeOrder
          ? `Dibuat pada ${formatDateTime(activeOrder.created_at)}`
          : 'Memuat rincian transaksi dan snapshot produk...'
      }
      size="lg"
      footer={
        <div className="flex items-center justify-end">
          <Button variant="secondary" onClick={onClose}>
            Tutup
          </Button>
        </div>
      }
    >
      {state.kind === 'loading' ? (
        <OrderDetailSkeleton />
      ) : state.kind === 'error' ? (
        <EmptyState
          icon={
            <AlertCircle
              className="h-6 w-6 stroke-[1.75] text-danger"
              aria-hidden="true"
            />
          }
          title="Gagal memuat detail pesanan"
          description={state.message}
          action={
            <Button
              variant="primary"
              onClick={() => setRetryCount((count) => count + 1)}
              leftIcon={
                <RefreshCw className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
              }
            >
              Coba Lagi
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Status & Order Code Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-hairline bg-canvas/80 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="success">
                {formatOrderStatus(state.order.status)}
              </Badge>
              <span className="font-mono text-sm font-bold text-ink tabular-nums">
                {state.order.order_code}
              </span>
            </div>

            <button
              type="button"
              onClick={() => void handleCopyCode(state.order.order_code)}
              aria-label={`Salin kode pesanan ${state.order.order_code}`}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-[10px] border border-hairline bg-surface px-3 text-xs font-semibold text-ink transition-colors hover:border-border-strong hover:bg-subtle"
            >
              {copiedCode === state.order.order_code ? (
                <>
                  <Check
                    className="h-3.5 w-3.5 stroke-[2] text-success"
                    aria-hidden="true"
                  />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden="true" />
                  <span>Salin Kode</span>
                </>
              )}
            </button>
          </div>

          {/* Buyer & Transaction Metadata */}
          <div className="grid grid-cols-1 gap-4 rounded-[12px] border border-hairline bg-surface p-4 sm:grid-cols-2">
            <div className="flex items-start gap-2.5">
              <User
                className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.75] text-ink-secondary"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-secondary">
                  Nama Pembeli
                </p>
                <p className="mt-0.5 text-sm font-semibold text-ink">
                  {state.order.customer_name}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Calendar
                className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.75] text-ink-secondary"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-secondary">
                  Tanggal &amp; Waktu
                </p>
                <p className="mt-0.5 text-sm font-semibold text-ink tabular-nums">
                  {formatDateTime(state.order.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Mail
                className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.75] text-ink-secondary"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-secondary">
                  Email Pembeli
                </p>
                <p className="mt-0.5 truncate text-sm font-medium text-ink">
                  {state.order.customer_email || '—'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <ReceiptText
                className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.75] text-ink-secondary"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-secondary">
                  Ringkasan Jumlah
                </p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-ink tabular-nums">
                  {state.order.items_count} produk · {state.order.total_quantity} unit
                </p>
              </div>
            </div>

            {state.order.notes && (
              <div className="flex items-start gap-2.5 border-t border-hairline pt-3 sm:col-span-2">
                <FileText
                  className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.75] text-ink-secondary"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink-secondary">
                    Catatan Pesanan
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink">
                    {state.order.notes}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Immutable Order Items Snapshot */}
          <section aria-label="Rincian item pesanan">
            <div className="mb-2.5 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
              <h3 className="font-display text-sm font-bold tracking-tight text-ink uppercase">
                Rincian Item Pesanan
              </h3>
              <p className="text-xs text-ink-secondary">
                Snapshot nama &amp; harga saat transaksi tercatat
              </p>
            </div>

            {orderItems.length === 0 ? (
              <p className="rounded-[12px] border border-hairline bg-canvas p-4 text-center text-sm text-ink-secondary">
                Tidak ada rincian item pada pesanan ini.
              </p>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden overflow-hidden rounded-[12px] border border-hairline sm:block">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-hairline bg-subtle text-xs font-semibold text-ink-secondary">
                        <th scope="col" className="px-4 py-3">
                          Produk
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          Harga Satuan
                        </th>
                        <th scope="col" className="px-4 py-3 text-center">
                          Qty
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline bg-surface">
                      {orderItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 shrink-0 overflow-hidden rounded-[8px] border border-hairline">
                                <ProductImage
                                  src={item.product_image_url}
                                  alt={item.product_name}
                                  aspect="square"
                                  compactFallback
                                />
                              </div>
                              <span className="font-medium text-ink">
                                {item.product_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-ink-secondary tabular-nums whitespace-nowrap">
                            {formatIDR(item.unit_price)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-medium text-ink tabular-nums">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-ink tabular-nums whitespace-nowrap">
                            {formatIDR(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Stacked List */}
                <ul className="divide-y divide-hairline overflow-hidden rounded-[12px] border border-hairline bg-surface sm:hidden">
                  {orderItems.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 p-3.5">
                      <div className="w-12 shrink-0 overflow-hidden rounded-[8px] border border-hairline">
                        <ProductImage
                          src={item.product_image_url}
                          alt={item.product_name}
                          aspect="square"
                          compactFallback
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">
                          {item.product_name}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-ink-secondary tabular-nums">
                          {item.quantity} × {formatIDR(item.unit_price)}
                        </p>
                      </div>
                      <p className="shrink-0 font-mono text-sm font-semibold text-ink tabular-nums">
                        {formatIDR(item.subtotal)}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Grand Total */}
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 rounded-[12px] border border-hairline bg-canvas px-4 py-3.5">
              <span className="text-sm font-semibold text-ink">
                Total Nominal Pesanan
              </span>
              <span className="font-mono text-lg font-bold text-ink tabular-nums sm:text-xl">
                {formatIDR(state.order.total_amount)}
              </span>
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
}
