import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PackageSearch,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { isAbortError, isApiError } from '../../api/client';
import { fetchCategories, fetchProducts } from '../../api/products';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useDebounce } from '../../hooks/useDebounce';
import { useCartStore } from '../../stores/cartStore';
import { useUiStore } from '../../stores/uiStore';
import type { ApiMeta } from '../../types/api';
import type { Product, ProductSortOption } from '../../types/product';
import { CategoryFilter } from './CategoryFilter';
import { ProductCard } from './ProductCard';
import { ProductDetailModal } from './ProductDetailModal';

const SORT_OPTIONS: Array<{ value: ProductSortOption; label: string }> = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'price_asc', label: 'Harga Terendah' },
  { value: 'price_desc', label: 'Harga Tertinggi' },
  { value: 'name_asc', label: 'Nama A–Z' },
];

const SKELETON_COUNT = 8;

interface ProductsSnapshot {
  key: string;
  products: Product[];
  meta: ApiMeta | null;
  errorMessage: string | null;
}

interface CategoriesSnapshot {
  key: string;
  items: string[];
}

function ProductCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full flex-col overflow-hidden rounded-[14px] border border-hairline bg-surface"
    >
      <div className="aspect-[4/3] w-full animate-pulse bg-subtle" />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="h-4 w-20 animate-pulse rounded bg-subtle" />
          <div className="h-4 w-16 animate-pulse rounded bg-subtle" />
        </div>
        <div className="mt-2 h-5 w-4/5 animate-pulse rounded bg-subtle" />
        <div className="mt-2 h-4 w-full animate-pulse rounded bg-subtle" />
        <div className="mt-1 h-4 w-2/3 animate-pulse rounded bg-subtle" />
        <div className="mt-4 border-t border-hairline pt-3.5">
          <div className="h-5 w-28 animate-pulse rounded bg-subtle" />
          <div className="mt-3 h-[44px] w-full animate-pulse rounded-[10px] bg-subtle" />
        </div>
      </div>
    </div>
  );
}

export function CatalogPage() {
  const syncWithCatalog = useCartStore((state) => state.syncWithCatalog);
  const catalogRefreshKey = useUiStore((state) => state.catalogRefreshKey);

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput.trim(), 300);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sort, setSort] = useState<ProductSortOption>('newest');
  const [page, setPage] = useState(1);
  const [retryToken, setRetryToken] = useState(0);

  const [categoriesSnapshot, setCategoriesSnapshot] =
    useState<CategoriesSnapshot | null>(null);
  const [productsSnapshot, setProductsSnapshot] =
    useState<ProductsSnapshot | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const categoriesKey = `${catalogRefreshKey}:${retryToken}`;
  const productsKey = `${debouncedSearch}|${selectedCategory}|${sort}|${page}|${catalogRefreshKey}|${retryToken}`;

  // Load categories from GET /api/v1/categories
  useEffect(() => {
    const controller = new AbortController();

    fetchCategories(controller.signal)
      .then((list) => {
        setCategoriesSnapshot({ key: categoriesKey, items: list });
      })
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          setCategoriesSnapshot((prev) => ({
            key: categoriesKey,
            items: prev?.items ?? [],
          }));
        }
      });

    return () => controller.abort();
  }, [categoriesKey]);

  // Load products from GET /api/v1/products
  useEffect(() => {
    const controller = new AbortController();

    fetchProducts(
      {
        search: debouncedSearch || undefined,
        category: selectedCategory || undefined,
        sort,
        page,
        per_page: 20,
      },
      controller.signal,
    )
      .then((response) => {
        setProductsSnapshot({
          key: productsKey,
          products: response.data,
          meta: response.meta,
          errorMessage: null,
        });

        const isFullCatalog =
          debouncedSearch === '' &&
          selectedCategory === '' &&
          response.meta.current_page === 1 &&
          response.meta.last_page === 1;

        syncWithCatalog(response.data, isFullCatalog);
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          return;
        }
        setProductsSnapshot({
          key: productsKey,
          products: [],
          meta: null,
          errorMessage: isApiError(error)
            ? error.message
            : 'Gagal memuat daftar produk. Silakan coba lagi.',
        });
      });

    return () => controller.abort();
  }, [debouncedSearch, selectedCategory, sort, page, productsKey, syncWithCatalog]);

  const categories = categoriesSnapshot?.items ?? [];
  const categoriesLoading = categoriesSnapshot === null;

  const isLoading = productsSnapshot?.key !== productsKey;
  const products = productsSnapshot?.key === productsKey ? productsSnapshot.products : [];
  const meta = productsSnapshot?.key === productsKey ? productsSnapshot.meta : null;
  const errorMessage =
    productsSnapshot?.key === productsKey ? productsSnapshot.errorMessage : null;

  // Keep modal product synced with latest catalog data whenever catalog refreshes
  const activeModalProduct = selectedProduct
    ? (products.find((item) => item.id === selectedProduct.id) ?? selectedProduct)
    : null;

  const hasActiveFilters = searchInput.trim() !== '' || selectedCategory !== '';

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setPage(1);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setPage(1);
  };

  const handleSortChange = (nextSort: ProductSortOption) => {
    setSort(nextSort);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSelectedCategory('');
    setSort('newest');
    setPage(1);
  };

  return (
    <div>
      {/* Editorial Storefront Header */}
      <section className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-[-0.025em] text-ink sm:text-3xl">
              Katalog Produk
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-secondary sm:text-base">
              Pilihan perangkat kerja, aksesoris, fashion, dan perlengkapan harian dengan ketersediaan stok real-time.
            </p>
          </div>

          {!isLoading && meta && !errorMessage && (
            <p
              aria-live="polite"
              className="shrink-0 font-mono text-xs font-medium text-ink-secondary tabular-nums sm:text-sm"
            >
              Menampilkan {products.length} dari {meta.total} produk
            </p>
          )}
        </div>

        {/* Search, Sort & Category Controls */}
        <div className="mt-5 space-y-3.5 rounded-[14px] border border-hairline bg-surface p-3.5 shadow-[var(--shadow-card)] sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Debounced Search Input */}
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 stroke-[1.75] text-ink-secondary"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Cari nama produk..."
                aria-label="Cari produk berdasarkan nama"
                className="min-h-[44px] w-full rounded-[10px] border border-hairline bg-subtle/60 py-2.5 pr-12 pl-10 text-sm text-ink placeholder:text-ink-secondary/80 transition-colors hover:border-border-strong focus:border-accent focus:bg-surface"
              />
              {searchInput !== '' && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  aria-label="Hapus kata kunci pencarian"
                  className="absolute top-1/2 right-0 inline-flex min-h-[44px] min-w-[44px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-[10px] text-ink-secondary transition-colors hover:bg-subtle hover:text-ink"
                >
                  <X className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Sort Select */}
            <div className="relative shrink-0 sm:w-52">
              <ArrowUpDown
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 stroke-[1.75] text-ink-secondary"
                aria-hidden="true"
              />
              <select
                value={sort}
                onChange={(event) =>
                  handleSortChange(event.target.value as ProductSortOption)
                }
                aria-label="Urutkan produk"
                className="min-h-[44px] w-full cursor-pointer appearance-none [-moz-appearance:none] [-webkit-appearance:none] rounded-[10px] border border-hairline bg-surface bg-none py-2.5 pr-10 pl-10 text-sm font-medium text-ink transition-colors hover:border-border-strong focus:border-accent"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 stroke-[1.75] text-ink-secondary"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3">
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={handleCategoryChange}
              isLoading={categoriesLoading}
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] px-3 text-xs font-semibold text-accent transition-colors hover:bg-accent-soft"
              >
                <X className="h-3.5 w-3.5 stroke-[2]" aria-hidden="true" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Product Grid / States */}
      {errorMessage ? (
        <EmptyState
          icon={
            <AlertCircle
              className="h-6 w-6 stroke-[1.75] text-danger"
              aria-hidden="true"
            />
          }
          title="Gagal memuat katalog produk"
          description={errorMessage}
          action={
            <Button
              variant="primary"
              onClick={() => setRetryToken((token) => token + 1)}
              leftIcon={<RefreshCw className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />}
            >
              Coba Lagi
            </Button>
          }
        />
      ) : isLoading ? (
        <div
          aria-label="Memuat produk"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4"
        >
          {Array.from({ length: SKELETON_COUNT }, (_, idx) => (
            <ProductCardSkeleton key={idx} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<PackageSearch className="h-6 w-6 stroke-[1.75]" aria-hidden="true" />}
          title="Produk tidak ditemukan"
          description={
            hasActiveFilters
              ? 'Tidak ada produk yang cocok dengan pencarian atau kategori yang dipilih. Coba kata kunci lain atau reset filter.'
              : 'Belum ada produk aktif yang tersedia di katalog saat ini.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="primary" onClick={handleResetFilters}>
                Reset Pencarian &amp; Filter
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <section
            aria-label="Daftar produk"
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4"
          >
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={index < 4}
                onSelect={setSelectedProduct}
              />
            ))}
          </section>

          {/* Pagination (rendered automatically when > 1 page) */}
          {meta && meta.last_page > 1 && (
            <nav
              aria-label="Navigasi halaman katalog"
              className="mt-8 flex items-center justify-center gap-3"
            >
              <Button
                variant="secondary"
                disabled={meta.current_page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                leftIcon={<ChevronLeft className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />}
              >
                Sebelumnya
              </Button>

              <span className="font-mono text-sm font-medium text-ink-secondary tabular-nums">
                Halaman {meta.current_page} / {meta.last_page}
              </span>

              <Button
                variant="secondary"
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                rightIcon={<ChevronRight className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />}
              >
                Berikutnya
              </Button>
            </nav>
          )}
        </>
      )}

      <ProductDetailModal
        product={activeModalProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
