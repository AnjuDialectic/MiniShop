import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Package,
  ReceiptText,
  RefreshCw,
} from 'lucide-react';
import { isAbortError, isApiError } from '../../api/client';
import { fetchOrders } from '../../api/orders';
import { fetchCategories, fetchProducts } from '../../api/products';
import { Button } from '../../components/ui/Button';
import { useCartStore } from '../../stores/cartStore';
import { useUiStore } from '../../stores/uiStore';
import { cn } from '../../utils/format';
import type { AdminOutletContext, AdminSummaryMetrics } from './adminContext';

interface SummarySnapshot {
  key: string;
  metrics: AdminSummaryMetrics | null;
  categories: string[];
  errorMessage: string | null;
}

export function AdminLayout() {
  const catalogRefreshKey = useUiStore((state) => state.catalogRefreshKey);
  const syncWithCatalog = useCartStore((state) => state.syncWithCatalog);

  const [adminRefreshKey, setAdminRefreshKey] = useState(0);
  const [snapshot, setSnapshot] = useState<SummarySnapshot | null>(null);

  const requestKey = `${adminRefreshKey}:${catalogRefreshKey}`;

  const refreshAdminData = useCallback(() => {
    setAdminRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetchProducts({ per_page: 100 }, controller.signal),
      fetchOrders({ per_page: 1 }, controller.signal),
      fetchCategories(controller.signal),
    ])
      .then(([productsRes, ordersRes, categoriesList]) => {
        const outOfStockCount = productsRes.data.filter(
          (product) => product.stock <= 0,
        ).length;
        const lowStockCount = productsRes.data.filter(
          (product) => product.stock > 0 && product.stock <= 3,
        ).length;

        const isFullCatalog =
          productsRes.meta.current_page === 1 && productsRes.meta.last_page === 1;
        syncWithCatalog(productsRes.data, isFullCatalog);

        setSnapshot({
          key: requestKey,
          metrics: {
            totalProducts: productsRes.meta.total,
            outOfStockCount,
            lowStockCount,
            totalOrders: ordersRes.meta.total,
            categoriesCount: categoriesList.length,
          },
          categories: categoriesList,
          errorMessage: null,
        });
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          return;
        }
        setSnapshot((prev) => ({
          key: requestKey,
          metrics: prev?.metrics ?? null,
          categories: prev?.categories ?? [],
          errorMessage: isApiError(error)
            ? error.message
            : 'Gagal memuat ringkasan data admin.',
        }));
      });

    return () => controller.abort();
  }, [requestKey, syncWithCatalog]);

  const isSummaryLoading = snapshot === null;
  const metrics = snapshot?.metrics ?? null;
  const categories = snapshot?.categories ?? [];
  const summaryError =
    snapshot?.key === requestKey ? snapshot.errorMessage : null;

  const stockAlertCount = metrics
    ? metrics.outOfStockCount + metrics.lowStockCount
    : 0;

  const outletContext: AdminOutletContext = {
    adminRefreshKey,
    categories,
    categoriesLoading: snapshot === null,
    summary: metrics,
    refreshAdminData,
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.025em] text-ink sm:text-3xl">
            Admin Dashboard
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-secondary sm:text-base">
            Kelola katalog produk, pantau ketersediaan stok, dan tinjau rincian pesanan masuk.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-[10px] border border-hairline bg-surface px-4 text-sm font-medium text-ink shadow-[var(--shadow-card)] transition-colors duration-200 hover:border-border-strong hover:bg-subtle sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden="true" />
          <span>Kembali ke Storefront</span>
        </Link>
      </header>

      {/* Compact Editorial Metrics Ledger Strip */}
      <section aria-label="Ringkasan operasional">
        {summaryError && !metrics ? (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-[14px] border border-[#F5CACA] bg-danger-bg px-4 py-3.5 text-sm text-danger sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle
                className="mt-0.5 h-4.5 w-4.5 shrink-0 stroke-[1.75]"
                aria-hidden="true"
              />
              <span>{summaryError}</span>
            </div>
            <Button
              variant="secondary"
              onClick={refreshAdminData}
              leftIcon={<RefreshCw className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />}
              className="shrink-0"
            >
              Muat Ulang
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 divide-y divide-hairline overflow-hidden rounded-[14px] border border-hairline bg-surface shadow-[var(--shadow-card)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {/* Metric 1: Active Products */}
            <div className="px-4 py-3.5 sm:px-5 sm:py-4">
              <p className="text-xs font-medium text-ink-secondary">Produk Aktif</p>
              {isSummaryLoading ? (
                <div className="mt-2 space-y-1.5" aria-hidden="true">
                  <div className="h-7 w-14 animate-pulse rounded bg-subtle" />
                  <div className="h-3.5 w-28 animate-pulse rounded bg-subtle" />
                </div>
              ) : (
                <>
                  <p className="mt-1 font-mono text-2xl font-semibold text-ink tabular-nums">
                    {metrics?.totalProducts ?? 0}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-secondary tabular-nums">
                    {metrics?.categoriesCount ?? 0} kategori aktif di katalog
                  </p>
                </>
              )}
            </div>

            {/* Metric 2: Low / Out of Stock */}
            <div className="px-4 py-3.5 sm:px-5 sm:py-4">
              <p className="text-xs font-medium text-ink-secondary">
                Stok Menipis &amp; Habis
              </p>
              {isSummaryLoading ? (
                <div className="mt-2 space-y-1.5" aria-hidden="true">
                  <div className="h-7 w-14 animate-pulse rounded bg-subtle" />
                  <div className="h-3.5 w-32 animate-pulse rounded bg-subtle" />
                </div>
              ) : (
                <>
                  <p
                    className={cn(
                      'mt-1 font-mono text-2xl font-semibold tabular-nums',
                      (metrics?.outOfStockCount ?? 0) > 0
                        ? 'text-danger'
                        : (metrics?.lowStockCount ?? 0) > 0
                          ? 'text-warning'
                          : 'text-success',
                    )}
                  >
                    {stockAlertCount}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-secondary tabular-nums">
                    {stockAlertCount > 0
                      ? `${metrics?.outOfStockCount ?? 0} stok habis · ${metrics?.lowStockCount ?? 0} stok menipis`
                      : 'Seluruh produk memiliki stok aman'}
                  </p>
                </>
              )}
            </div>

            {/* Metric 3: Total Orders */}
            <div className="px-4 py-3.5 sm:px-5 sm:py-4">
              <p className="text-xs font-medium text-ink-secondary">Total Pesanan</p>
              {isSummaryLoading ? (
                <div className="mt-2 space-y-1.5" aria-hidden="true">
                  <div className="h-7 w-14 animate-pulse rounded bg-subtle" />
                  <div className="h-3.5 w-28 animate-pulse rounded bg-subtle" />
                </div>
              ) : (
                <>
                  <p className="mt-1 font-mono text-2xl font-semibold text-ink tabular-nums">
                    {metrics?.totalOrders ?? 0}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-secondary">
                    Transaksi tercatat di sistem
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Admin Sub-Navigation Tabs */}
      <nav
        aria-label="Navigasi menu admin"
        className="flex items-center gap-1 border-b border-hairline"
      >
        <NavLink
          to="/admin/products"
          className={({ isActive }) =>
            cn(
              '-mb-px inline-flex min-h-[44px] items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors duration-200',
              isActive
                ? 'border-accent text-ink'
                : 'border-transparent text-ink-secondary hover:border-border-strong hover:text-ink',
            )
          }
        >
          <Package className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden="true" />
          <span>Produk</span>
          {metrics !== null && (
            <span className="inline-flex min-w-[24px] items-center justify-center rounded-full bg-subtle px-2 py-0.5 font-mono text-xs font-semibold text-ink-secondary tabular-nums">
              {metrics.totalProducts}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/admin/orders"
          className={({ isActive }) =>
            cn(
              '-mb-px inline-flex min-h-[44px] items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors duration-200',
              isActive
                ? 'border-accent text-ink'
                : 'border-transparent text-ink-secondary hover:border-border-strong hover:text-ink',
            )
          }
        >
          <ReceiptText className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden="true" />
          <span>Pesanan</span>
          {metrics !== null && (
            <span className="inline-flex min-w-[24px] items-center justify-center rounded-full bg-subtle px-2 py-0.5 font-mono text-xs font-semibold text-ink-secondary tabular-nums">
              {metrics.totalOrders}
            </span>
          )}
        </NavLink>
      </nav>

      {/* Active Admin Sub-page */}
      <Outlet context={outletContext} />
    </div>
  );
}
