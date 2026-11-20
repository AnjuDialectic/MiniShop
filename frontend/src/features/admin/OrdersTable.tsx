import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  ReceiptText,
  RefreshCw,
} from 'lucide-react';
import { isAbortError, isApiError } from '../../api/client';
import { fetchOrders } from '../../api/orders';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useUiStore } from '../../stores/uiStore';
import type { ApiMeta } from '../../types/api';
import type { Order } from '../../types/order';
import { formatDateTime, formatIDR } from '../../utils/format';
import { useAdminContext } from './adminContext';
import { OrderDetailModal } from './OrderDetailModal';

const SKELETON_ROWS = 5;

interface OrdersSnapshot {
  key: string;
  orders: Order[];
  meta: ApiMeta | null;
  errorMessage: string | null;
}

function formatOrderStatus(status: string): string {
  if (status === 'completed') {
    return 'Selesai';
  }
  return status;
}

function OrdersSkeleton() {
  return (
    <div aria-label="Memuat daftar pesanan">
      {/* Desktop Table Skeleton */}
      <div className="hidden overflow-hidden rounded-[14px] border border-hairline bg-surface shadow-[var(--shadow-card)] md:block">
        <div className="border-b border-hairline bg-subtle px-4 py-3">
          <div className="h-4 w-44 animate-pulse rounded bg-hairline/70" />
        </div>
        <div className="divide-y divide-hairline">
          {Array.from({ length: SKELETON_ROWS }, (_, idx) => (
            <div key={idx} className="flex items-center gap-4 px-4 py-4">
              <div className="h-4 w-36 animate-pulse rounded bg-subtle" />
              <div className="h-4 w-36 animate-pulse rounded bg-subtle" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-4 w-32 animate-pulse rounded bg-subtle" />
                <div className="h-3 w-44 animate-pulse rounded bg-subtle" />
              </div>
              <div className="h-4 w-28 animate-pulse rounded bg-subtle" />
              <div className="h-4 w-24 animate-pulse rounded bg-subtle" />
              <div className="h-[44px] w-28 animate-pulse rounded-[10px] bg-subtle" />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Cards Skeleton */}
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 3 }, (_, idx) => (
          <div
            key={idx}
            className="rounded-[14px] border border-hairline bg-surface p-4 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="h-4 w-36 animate-pulse rounded bg-subtle" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-subtle" />
            </div>
            <div className="mt-2 h-3.5 w-40 animate-pulse rounded bg-subtle" />
            <div className="mt-3 h-4 w-32 animate-pulse rounded bg-subtle" />
            <div className="mt-3.5 flex items-center justify-between border-t border-hairline pt-3">
              <div className="h-5 w-28 animate-pulse rounded bg-subtle" />
              <div className="h-[44px] w-28 animate-pulse rounded-[10px] bg-subtle" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrdersTable() {
  const navigate = useNavigate();
  const { adminRefreshKey, refreshAdminData } = useAdminContext();
  const catalogRefreshKey = useUiStore((state) => state.catalogRefreshKey);

  const [page, setPage] = useState(1);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const [snapshot, setSnapshot] = useState<OrdersSnapshot | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const requestKey = `${page}|${adminRefreshKey}|${catalogRefreshKey}|${localRefreshKey}`;

  useEffect(() => {
    const controller = new AbortController();

    fetchOrders({ page, per_page: 20 }, controller.signal)
      .then((response) => {
        setSnapshot({
          key: requestKey,
          orders: response.data,
          meta: response.meta,
          errorMessage: null,
        });
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          return;
        }
        setSnapshot({
          key: requestKey,
          orders: [],
          meta: null,
          errorMessage: isApiError(error)
            ? error.message
            : 'Gagal memuat daftar pesanan. Silakan coba lagi.',
        });
      });

    return () => controller.abort();
  }, [page, requestKey]);

  const isLoading = snapshot?.key !== requestKey;
  const orders = snapshot?.key === requestKey ? snapshot.orders : [];
  const meta = snapshot?.key === requestKey ? snapshot.meta : null;
  const errorMessage =
    snapshot?.key === requestKey ? snapshot.errorMessage : null;

  const handleRefresh = () => {
    setLocalRefreshKey((key) => key + 1);
    refreshAdminData();
  };

  return (
    <section aria-label="Daftar pesanan masuk" className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold tracking-[-0.025em] text-ink sm:text-xl">
            Daftar Pesanan
          </h2>
          {!isLoading && meta && !errorMessage ? (
            <p
              aria-live="polite"
              className="mt-0.5 font-mono text-xs text-ink-secondary tabular-nums"
            >
              Menampilkan {orders.length} dari {meta.total} pesanan · Urut terbaru
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-ink-secondary">
              Seluruh riwayat transaksi lengkap dengan snapshot harga dan jumlah item.
            </p>
          )}
        </div>

        <Button
          variant="secondary"
          onClick={handleRefresh}
          disabled={isLoading}
          leftIcon={
            <RefreshCw className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
          }
          className="w-full shrink-0 sm:w-auto"
        >
          Muat Ulang
        </Button>
      </div>

      {/* States */}
      {errorMessage ? (
        <EmptyState
          icon={
            <AlertCircle
              className="h-6 w-6 stroke-[1.75] text-danger"
              aria-hidden="true"
            />
          }
          title="Gagal memuat daftar pesanan"
          description={errorMessage}
          action={
            <Button
              variant="primary"
              onClick={handleRefresh}
              leftIcon={
                <RefreshCw className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
              }
            >
              Coba Lagi
            </Button>
          }
        />
      ) : isLoading ? (
        <OrdersSkeleton />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={
            <ReceiptText className="h-6 w-6 stroke-[1.75]" aria-hidden="true" />
          }
          title="Belum ada pesanan masuk"
          description="Pesanan yang diselesaikan pembeli melalui Storefront akan langsung tampil di sini beserta rincian itemnya."
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
              Buka Storefront
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-[14px] border border-hairline bg-surface shadow-[var(--shadow-card)] md:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-subtle text-xs font-semibold text-ink-secondary">
                    <th scope="col" className="px-4 py-3.5">
                      Kode Order
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Tanggal &amp; Waktu
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Pembeli
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Jumlah Item
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-right">
                      Total Nominal
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline bg-surface">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="transition-colors duration-150 hover:bg-canvas/70"
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-ink tabular-nums">
                            {order.order_code}
                          </span>
                          <Badge variant="success">
                            {formatOrderStatus(order.status)}
                          </Badge>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-sm text-ink-secondary tabular-nums whitespace-nowrap">
                        {formatDateTime(order.created_at)}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="max-w-[220px]">
                          <p className="truncate font-medium text-ink">
                            {order.customer_name}
                          </p>
                          {order.customer_email && (
                            <p className="truncate text-xs text-ink-secondary">
                              {order.customer_email}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-xs font-medium text-ink-secondary tabular-nums whitespace-nowrap">
                        {order.items_count} produk · {order.total_quantity} unit
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono text-sm font-bold text-ink tabular-nums whitespace-nowrap">
                        {formatIDR(order.total_amount)}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <Button
                          variant="secondary"
                          onClick={() => setSelectedOrderId(order.id)}
                          aria-label={`Lihat detail pesanan ${order.order_code}`}
                          leftIcon={
                            <Eye
                              className="h-4 w-4 stroke-[1.75]"
                              aria-hidden="true"
                            />
                          }
                          className="px-3.5 text-xs font-semibold"
                        >
                          Lihat Detail
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Responsive Cards (0 horizontal overflow at 375px) */}
          <ul aria-label="Daftar pesanan" className="space-y-3 md:hidden">
            {orders.map((order) => (
              <li
                key={order.id}
                className="rounded-[14px] border border-hairline bg-surface p-4 shadow-[var(--shadow-card)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-ink tabular-nums">
                    {order.order_code}
                  </span>
                  <Badge variant="success">
                    {formatOrderStatus(order.status)}
                  </Badge>
                </div>

                <p className="mt-1 text-xs text-ink-secondary tabular-nums">
                  {formatDateTime(order.created_at)}
                </p>

                <div className="mt-2.5">
                  <p className="text-sm font-semibold text-ink">
                    {order.customer_name}
                  </p>
                  {order.customer_email && (
                    <p className="truncate text-xs text-ink-secondary">
                      {order.customer_email}
                    </p>
                  )}
                </div>

                <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-hairline pt-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-ink-secondary tabular-nums">
                      {order.items_count} produk · {order.total_quantity} unit
                    </p>
                    <p className="mt-0.5 font-mono text-base font-bold text-ink tabular-nums">
                      {formatIDR(order.total_amount)}
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() => setSelectedOrderId(order.id)}
                    aria-label={`Lihat detail pesanan ${order.order_code}`}
                    leftIcon={
                      <Eye
                        className="h-4 w-4 stroke-[1.75]"
                        aria-hidden="true"
                      />
                    }
                    className="shrink-0 px-3.5 text-xs font-semibold"
                  >
                    Lihat Detail
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <nav
              aria-label="Navigasi halaman pesanan admin"
              className="flex items-center justify-center gap-3 pt-2"
            >
              <Button
                variant="secondary"
                disabled={meta.current_page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                leftIcon={
                  <ChevronLeft
                    className="h-4 w-4 stroke-[1.75]"
                    aria-hidden="true"
                  />
                }
              >
                Sebelumnya
              </Button>

              <span className="font-mono text-sm font-medium text-ink-secondary tabular-nums">
                Halaman {meta.current_page} / {meta.last_page}
              </span>

              <Button
                variant="secondary"
                disabled={meta.current_page >= meta.last_page}
                onClick={() =>
                  setPage((current) => Math.min(meta.last_page, current + 1))
                }
                rightIcon={
                  <ChevronRight
                    className="h-4 w-4 stroke-[1.75]"
                    aria-hidden="true"
                  />
                }
              >
                Berikutnya
              </Button>
            </nav>
          )}
        </>
      )}

      {/* Order Detail Modal */}
      <OrderDetailModal
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </section>
  );
}
