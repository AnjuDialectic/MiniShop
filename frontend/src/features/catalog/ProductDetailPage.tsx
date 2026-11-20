import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Package } from 'lucide-react';
import { isAbortError, isApiError } from '../../api/client';
import { fetchProductById } from '../../api/products';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useCartStore } from '../../stores/cartStore';
import { useUiStore } from '../../stores/uiStore';
import type { Product } from '../../types/product';
import { ProductDetailContent } from './ProductDetailContent';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; product: Product }
  | { kind: 'not_found'; message: string }
  | { kind: 'error'; message: string };

interface FetchSnapshot {
  key: string;
  state: Exclude<LoadState, { kind: 'loading' }>;
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const syncWithCatalog = useCartStore((state) => state.syncWithCatalog);
  const catalogRefreshKey = useUiStore((state) => state.catalogRefreshKey);

  const parsedId = Number(id);
  const isValidId = Number.isInteger(parsedId) && parsedId > 0;
  const [retryCount, setRetryCount] = useState(0);
  const [snapshot, setSnapshot] = useState<FetchSnapshot | null>(null);

  const requestKey = `${parsedId}:${catalogRefreshKey}:${retryCount}`;

  useEffect(() => {
    if (!isValidId) {
      return;
    }

    const controller = new AbortController();

    fetchProductById(parsedId, controller.signal)
      .then((product) => {
        syncWithCatalog([product], false);
        setSnapshot({ key: requestKey, state: { kind: 'ready', product } });
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
              message: 'Produk yang Anda cari sudah tidak tersedia di katalog.',
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
              : 'Gagal memuat detail produk.',
          },
        });
      });

    return () => controller.abort();
  }, [isValidId, parsedId, requestKey, syncWithCatalog]);

  const state: LoadState = !isValidId
    ? {
        kind: 'not_found',
        message: 'Produk tidak valid atau tidak ditemukan.',
      }
    : snapshot?.key === requestKey
      ? snapshot.state
      : { kind: 'loading' };

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb">
        <Link
          to="/"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] pr-3 text-sm font-medium text-ink-secondary transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
          <span>Kembali ke Katalog</span>
        </Link>
      </nav>

      {state.kind === 'loading' && (
        <div className="grid grid-cols-1 gap-6 rounded-[14px] border border-hairline bg-surface p-5 sm:p-8 md:grid-cols-2 md:gap-8">
          <div className="aspect-[4/3] w-full animate-pulse rounded-[12px] bg-subtle" />
          <div className="space-y-4">
            <div className="h-6 w-32 animate-pulse rounded-full bg-subtle" />
            <div className="h-8 w-3/4 animate-pulse rounded-[8px] bg-subtle" />
            <div className="h-8 w-44 animate-pulse rounded-[8px] bg-subtle" />
            <div className="h-24 w-full animate-pulse rounded-[8px] bg-subtle" />
            <div className="h-12 w-full animate-pulse rounded-[10px] bg-subtle" />
          </div>
        </div>
      )}

      {state.kind === 'not_found' && (
        <EmptyState
          icon={<Package className="h-6 w-6 stroke-[1.75]" aria-hidden="true" />}
          title="Produk tidak ditemukan"
          description={state.message}
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
              Jelajahi Katalog
            </Button>
          }
        />
      )}

      {state.kind === 'error' && (
        <EmptyState
          icon={
            <AlertCircle
              className="h-6 w-6 stroke-[1.75] text-danger"
              aria-hidden="true"
            />
          }
          title="Gagal memuat detail produk"
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
      )}

      {state.kind === 'ready' && (
        <section className="rounded-[14px] border border-hairline bg-surface p-5 shadow-[var(--shadow-card)] sm:p-8">
          <ProductDetailContent product={state.product} />
        </section>
      )}
    </div>
  );
}
