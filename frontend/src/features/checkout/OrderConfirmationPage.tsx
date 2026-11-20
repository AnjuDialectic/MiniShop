import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Mail,
  Printer,
  ShoppingBag,
  User,
} from 'lucide-react';
import { isAbortError, isApiError } from '../../api/client';
import { fetchOrderById } from '../../api/orders';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProductImage } from '../../components/ui/ProductImage';
import { useToastStore } from '../../stores/toastStore';
import type { Order } from '../../types/order';
import { formatDateTime, formatIDR } from '../../utils/format';

interface ConfirmationLocationState {
  order?: Order;
}

type OrderLoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; order: Order }
  | { kind: 'not_found'; message: string }
  | { kind: 'error'; message: string };

interface FetchSnapshot {
  key: string;
  state: Exclude<OrderLoadState, { kind: 'loading' }>;
}

export function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const showToast = useToastStore((state) => state.showToast);

  const parsedId = Number(id);
  const isValidId = Number.isInteger(parsedId) && parsedId > 0;
  const locationState = location.state as ConfirmationLocationState | null;
  const initialOrder =
    locationState?.order && locationState.order.id === parsedId
      ? locationState.order
      : null;

  const [copied, setCopied] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [snapshot, setSnapshot] = useState<FetchSnapshot | null>(null);

  const requestKey = `${parsedId}:${retryCount}`;

  useEffect(() => {
    if (initialOrder || !isValidId) {
      return;
    }

    const controller = new AbortController();

    fetchOrderById(parsedId, controller.signal)
      .then((order) => {
        setSnapshot({ key: requestKey, state: { kind: 'ready', order } });
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          return;
        }
        if (isApiError(error) && error.isNotFound) {
          setSnapshot({
            key: requestKey,
            state: {
              kind: 'not_found',
              message: 'Pesanan tidak ditemukan di sistem.',
            },
          });
          return;
        }
        setSnapshot({
          key: requestKey,
          state: {
            kind: 'error',
            message: isApiError(error)
              ? error.message
              : 'Gagal memuat ringkasan pesanan.',
          },
        });
      });

    return () => controller.abort();
  }, [initialOrder, isValidId, parsedId, requestKey]);

  const state: OrderLoadState = initialOrder
    ? { kind: 'ready', order: initialOrder }
    : !isValidId
      ? {
          kind: 'not_found',
          message: 'Nomor pesanan tidak valid atau tidak ditemukan.',
        }
      : snapshot?.key === requestKey
        ? snapshot.state
        : { kind: 'loading' };

  const handleCopyCode = async (orderCode: string) => {
    try {
      await navigator.clipboard.writeText(orderCode);
      setCopied(true);
      showToast(`Kode ${orderCode} disalin.`, 'success', 2400);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Tidak dapat menyalin kode secara otomatis.', 'warning');
    }
  };

  if (state.kind === 'loading') {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="h-44 animate-pulse rounded-[14px] border border-hairline bg-surface" />
        <div className="h-64 animate-pulse rounded-[14px] border border-hairline bg-surface" />
      </div>
    );
  }

  if (state.kind === 'not_found') {
    return (
      <div className="mx-auto max-w-xl py-8">
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6 stroke-[1.75]" aria-hidden="true" />}
          title="Pesanan tidak ditemukan"
          description={state.message}
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
              Kembali ke Katalog
            </Button>
          }
        />
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="mx-auto max-w-xl py-8">
        <EmptyState
          icon={<AlertCircle className="h-6 w-6 stroke-[1.75] text-danger" aria-hidden="true" />}
          title="Gagal memuat detail pesanan"
          description={state.message}
          action={
            <div className="flex flex-wrap justify-center gap-2.5">
              <Button
                variant="primary"
                onClick={() => setRetryCount((count) => count + 1)}
              >
                Coba Lagi
              </Button>
              <Button variant="secondary" onClick={() => navigate('/')}>
                Kembali ke Katalog
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  const { order } = state;
  const orderItems = order.items ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Success Hero Banner */}
      <section className="overflow-hidden rounded-[14px] border border-hairline bg-surface shadow-[var(--shadow-card)]">
        <div className="border-b border-hairline bg-success-bg/70 px-6 py-7 text-center sm:px-8 sm:py-9">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-success text-surface shadow-[0_6px_20px_rgba(22,121,79,0.22)] animate-pop">
            <CheckCircle2 className="h-7 w-7 stroke-[2]" aria-hidden="true" />
          </span>

          <div className="mt-4">
            <Badge variant="success">Order Berhasil</Badge>
          </div>

          <h1 className="mt-3 font-display text-2xl font-bold text-ink sm:text-3xl">
            Terima kasih, {order.customer_name}!
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-secondary">
            Pesanan Anda telah dicatat dan stok produk berhasil diamankan. Simpan kode pesanan berikut sebagai bukti transaksi.
          </p>

          <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-[12px] border border-[#C6E8D8] bg-surface px-4 py-2">
            <span className="text-xs font-medium text-ink-secondary">Kode Order:</span>
            <span className="font-mono text-sm font-semibold text-ink tabular-nums sm:text-base">
              {order.order_code}
            </span>
            <button
              type="button"
              onClick={() => void handleCopyCode(order.order_code)}
              aria-label={`Salin kode pesanan ${order.order_code}`}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-[8px] px-2.5 text-xs font-semibold text-success transition-colors hover:bg-success-bg"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 stroke-[2]" aria-hidden="true" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden="true" />
                  <span>Salin</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Order Metadata Grid */}
        <div className="grid grid-cols-1 gap-4 border-b border-hairline px-6 py-5 sm:grid-cols-2 sm:px-8">
          <div className="flex items-start gap-3">
            <User className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.75] text-ink-secondary" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium text-ink-secondary">Nama Pembeli</p>
              <p className="mt-0.5 text-sm font-semibold text-ink">
                {order.customer_name}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.75] text-ink-secondary" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium text-ink-secondary">Waktu Transaksi</p>
              <p className="mt-0.5 text-sm font-semibold text-ink tabular-nums">
                {formatDateTime(order.created_at)}
              </p>
            </div>
          </div>

          {order.customer_email && (
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.75] text-ink-secondary" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-secondary">Email</p>
                <p className="mt-0.5 truncate text-sm font-medium text-ink">
                  {order.customer_email}
                </p>
              </div>
            </div>
          )}

          {order.notes && (
            <div className="flex items-start gap-3 sm:col-span-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.75] text-ink-secondary" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-secondary">Catatan Pesanan</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink">{order.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Item Breakdown */}
        <div className="px-6 py-5 sm:px-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold tracking-tight text-ink uppercase">
              Rincian Produk
            </h2>
            <span className="font-mono text-xs text-ink-secondary tabular-nums">
              {order.items_count} produk · {order.total_quantity} unit
            </span>
          </div>

          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-[12px] border border-hairline sm:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-hairline bg-subtle text-xs font-semibold text-ink-secondary">
                  <th className="px-4 py-3">Produk</th>
                  <th className="px-4 py-3 text-right">Harga Satuan</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
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
                    <td className="px-4 py-3 text-right font-mono text-ink-secondary tabular-nums">
                      {formatIDR(item.unit_price)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-medium text-ink tabular-nums">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-ink tabular-nums">
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
                  <p className="text-sm font-medium text-ink">{item.product_name}</p>
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

          {/* Grand Total */}
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 rounded-[12px] border border-hairline bg-canvas px-4 py-3.5">
            <span className="text-sm font-semibold text-ink">Total Pembayaran</span>
            <span className="font-mono text-xl font-bold text-ink tabular-nums">
              {formatIDR(order.total_amount)}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse gap-2.5 border-t border-hairline bg-canvas/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 print:hidden">
          <Button
            variant="secondary"
            onClick={() => window.print()}
            leftIcon={<Printer className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />}
          >
            Cetak Ringkasan
          </Button>

          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/')}
            leftIcon={<ArrowLeft className="h-4 w-4 stroke-[2]" aria-hidden="true" />}
            className="w-full sm:w-auto"
          >
            Kembali Belanja
          </Button>
        </div>
      </section>
    </div>
  );
}
