import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
  PackageSearch,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { isAbortError, isApiError } from '../../api/client';
import { deleteProduct, fetchProducts } from '../../api/products';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProductImage } from '../../components/ui/ProductImage';
import { useDebounce } from '../../hooks/useDebounce';
import { useToastStore } from '../../stores/toastStore';
import { useUiStore } from '../../stores/uiStore';
import type { ApiMeta } from '../../types/api';
import type { Product, ProductSortOption } from '../../types/product';
import { formatDateTime, formatIDR } from '../../utils/format';
import { CategoryFilter } from '../catalog/CategoryFilter';
import { useAdminContext } from './adminContext';
import { ProductFormModal } from './ProductFormModal';

const SORT_OPTIONS: Array<{ value: ProductSortOption; label: string }> = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'name_asc', label: 'Nama A–Z' },
  { value: 'price_asc', label: 'Harga Terendah' },
  { value: 'price_desc', label: 'Harga Tertinggi' },
];

const SKELETON_ROWS = 6;

interface ProductsSnapshot {
  key: string;
  products: Product[];
  meta: ApiMeta | null;
  errorMessage: string | null;
}

function StockStatusCell({ stock }: { stock: number }) {
  if (stock <= 0) {
    return <Badge variant="danger">Stok Habis</Badge>;
  }

  if (stock <= 3) {
    return (
      <Badge variant="warning" className="tabular-nums">
        Sisa {stock}
      </Badge>
    );
  }

  return (
    <div className="inline-flex flex-nowrap items-center gap-2 whitespace-nowrap">
      <Badge variant="success">Tersedia</Badge>
      <span className="font-mono text-xs font-medium text-ink-secondary tabular-nums">
        {stock} unit
      </span>
    </div>
  );
}

function ProductsSkeleton() {
  return (
    <div aria-label="Memuat daftar produk">
      {/* Desktop Table Skeleton */}
      <div className="hidden overflow-hidden rounded-[14px] border border-hairline bg-surface shadow-[var(--shadow-card)] md:block">
        <div className="border-b border-hairline bg-subtle px-4 py-3">
          <div className="h-4 w-40 animate-pulse rounded bg-hairline/70" />
        </div>
        <div className="divide-y divide-hairline">
          {Array.from({ length: SKELETON_ROWS }, (_, idx) => (
            <div key={idx} className="flex items-center gap-4 px-4 py-3.5">
              <div className="h-12 w-16 shrink-0 animate-pulse rounded-[8px] bg-subtle" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-48 animate-pulse rounded bg-subtle" />
                <div className="h-3 w-72 animate-pulse rounded bg-subtle" />
              </div>
              <div className="h-6 w-20 animate-pulse rounded-full bg-subtle" />
              <div className="h-4 w-24 animate-pulse rounded bg-subtle" />
              <div className="h-6 w-24 animate-pulse rounded-full bg-subtle" />
              <div className="flex gap-2">
                <div className="h-[44px] w-16 animate-pulse rounded-[10px] bg-subtle" />
                <div className="h-[44px] w-16 animate-pulse rounded-[10px] bg-subtle" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Cards Skeleton */}
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 4 }, (_, idx) => (
          <div
            key={idx}
            className="rounded-[14px] border border-hairline bg-surface p-4 shadow-[var(--shadow-card)]"
          >
            <div className="flex gap-3">
              <div className="h-16 w-20 shrink-0 animate-pulse rounded-[10px] bg-subtle" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-5 w-28 animate-pulse rounded-full bg-subtle" />
                <div className="h-4 w-full animate-pulse rounded bg-subtle" />
                <div className="h-4 w-24 animate-pulse rounded bg-subtle" />
              </div>
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-hairline pt-3">
              <div className="h-[44px] animate-pulse rounded-[10px] bg-subtle" />
              <div className="h-[44px] animate-pulse rounded-[10px] bg-subtle" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductsTable() {
  const {
    adminRefreshKey,
    categories,
    categoriesLoading,
    refreshAdminData,
  } = useAdminContext();
  const triggerCatalogRefresh = useUiStore(
    (state) => state.triggerCatalogRefresh,
  );
  const showToast = useToastStore((state) => state.showToast);

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput.trim(), 300);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sort, setSort] = useState<ProductSortOption>('newest');
  const [page, setPage] = useState(1);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);

  const [snapshot, setSnapshot] = useState<ProductsSnapshot | null>(null);

  // Modal & Delete Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const requestKey = `${debouncedSearch}|${selectedCategory}|${sort}|${page}|${adminRefreshKey}|${localRefreshKey}`;

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
        setSnapshot({
          key: requestKey,
          products: response.data,
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
          products: [],
          meta: null,
          errorMessage: isApiError(error)
            ? error.message
            : 'Gagal memuat daftar produk. Silakan coba lagi.',
        });
      });

    return () => controller.abort();
  }, [debouncedSearch, selectedCategory, sort, page, requestKey]);

  const isLoading = snapshot?.key !== requestKey;
  const products = snapshot?.key === requestKey ? snapshot.products : [];
  const meta = snapshot?.key === requestKey ? snapshot.meta : null;
  const errorMessage =
    snapshot?.key === requestKey ? snapshot.errorMessage : null;

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

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const handleProductSaved = (_savedProduct: Product, mode: 'create' | 'edit') => {
    setIsFormOpen(false);
    setEditingProduct(null);
    if (mode === 'create') {
      setPage(1);
    }
    setLocalRefreshKey((key) => key + 1);
    refreshAdminData();
    triggerCatalogRefresh();
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete || isDeleting) {
      return;
    }

    const target = productToDelete;
    setIsDeleting(true);

    try {
      await deleteProduct(target.id);
      setProductToDelete(null);
      showToast(`Produk "${target.name}" berhasil dihapus.`, 'success');

      if (products.length === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      } else {
        setLocalRefreshKey((key) => key + 1);
      }

      refreshAdminData();
      triggerCatalogRefresh();
    } catch (error) {
      if (isApiError(error) && error.isNotFound) {
        setProductToDelete(null);
        showToast('Produk tersebut sudah tidak ditemukan di server.', 'info');
        setLocalRefreshKey((key) => key + 1);
        refreshAdminData();
        triggerCatalogRefresh();
      } else {
        showToast(
          isApiError(error)
            ? error.message
            : 'Gagal menghapus produk. Silakan coba lagi.',
          'danger',
        );
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section aria-label="Manajemen produk" className="space-y-5">
      {/* Section Header + Primary CTA (Von Restorff Effect: sole #D94436 CTA on page) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold tracking-[-0.025em] text-ink sm:text-xl">
            Kelola Produk
          </h2>
          {!isLoading && meta && !errorMessage ? (
            <p
              aria-live="polite"
              className="mt-0.5 font-mono text-xs text-ink-secondary tabular-nums"
            >
              Menampilkan {products.length} dari {meta.total} produk aktif
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-ink-secondary">
              Tambah, perbarui harga atau stok, dan hapus produk dari katalog aktif.
            </p>
          )}
        </div>

        <Button
          variant="primary"
          onClick={handleOpenCreateModal}
          leftIcon={<Plus className="h-4 w-4 stroke-[2.2]" aria-hidden="true" />}
          className="w-full shrink-0 sm:w-auto"
        >
          Tambah Produk
        </Button>
      </div>

      {/* Search, Sort & Category Filter Toolbar */}
      <div className="space-y-3.5 rounded-[14px] border border-hairline bg-surface p-3.5 shadow-[var(--shadow-card)] sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
              aria-label="Cari produk di admin"
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
              aria-label="Urutkan daftar produk"
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

      {/* Table / Card States */}
      {errorMessage ? (
        <EmptyState
          icon={
            <AlertCircle
              className="h-6 w-6 stroke-[1.75] text-danger"
              aria-hidden="true"
            />
          }
          title="Gagal memuat daftar produk"
          description={errorMessage}
          action={
            <Button
              variant="primary"
              onClick={() => setLocalRefreshKey((key) => key + 1)}
              leftIcon={
                <RefreshCw className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
              }
            >
              Coba Lagi
            </Button>
          }
        />
      ) : isLoading ? (
        <ProductsSkeleton />
      ) : products.length === 0 ? (
        <EmptyState
          icon={
            hasActiveFilters ? (
              <PackageSearch className="h-6 w-6 stroke-[1.75]" aria-hidden="true" />
            ) : (
              <Package className="h-6 w-6 stroke-[1.75]" aria-hidden="true" />
            )
          }
          title={
            hasActiveFilters
              ? 'Produk tidak ditemukan'
              : 'Belum ada produk di katalog'
          }
          description={
            hasActiveFilters
              ? 'Tidak ada produk yang cocok dengan pencarian atau kategori yang dipilih. Coba kata kunci lain atau reset filter.'
              : 'Mulai dengan menambahkan produk pertama agar langsung tampil di Storefront.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="secondary" onClick={handleResetFilters}>
                Reset Pencarian &amp; Filter
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleOpenCreateModal}
                leftIcon={
                  <Plus className="h-4 w-4 stroke-[2.2]" aria-hidden="true" />
                }
              >
                Tambah Produk Pertama
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Desktop Data Table */}
          <div className="hidden overflow-hidden rounded-[14px] border border-hairline bg-surface shadow-[var(--shadow-card)] md:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-subtle text-xs font-semibold text-ink-secondary">
                    <th scope="col" className="px-4 py-3.5">
                      Produk
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Kategori
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-right">
                      Harga
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Stok
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-3.5 xl:table-cell"
                    >
                      Diperbarui
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline bg-surface">
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="transition-colors duration-150 hover:bg-canvas/70"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex max-w-[260px] items-center gap-3 lg:max-w-[300px] xl:max-w-[320px]">
                          <div className="w-14 shrink-0 overflow-hidden rounded-[8px] border border-hairline">
                            <ProductImage
                              src={product.image_url}
                              alt={product.name}
                              aspect="4/3"
                              muted={product.stock <= 0}
                              compactFallback
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-ink">
                              {product.name}
                            </p>
                            <p className="mt-0.5 line-clamp-1 text-xs text-ink-secondary">
                              {product.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Badge variant="neutral">{product.category}</Badge>
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-ink tabular-nums whitespace-nowrap">
                        {formatIDR(product.price)}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StockStatusCell stock={product.stock} />
                      </td>

                      <td className="hidden px-4 py-3.5 text-xs text-ink-secondary tabular-nums whitespace-nowrap xl:table-cell">
                        {formatDateTime(product.updated_at)}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => handleOpenEditModal(product)}
                            aria-label={`Edit ${product.name}`}
                            leftIcon={
                              <Pencil
                                className="h-3.5 w-3.5 stroke-[1.75]"
                                aria-hidden="true"
                              />
                            }
                            className="px-3 text-xs font-semibold"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger-soft"
                            onClick={() => setProductToDelete(product)}
                            aria-label={`Hapus ${product.name}`}
                            leftIcon={
                              <Trash2
                                className="h-3.5 w-3.5 stroke-[1.75]"
                                aria-hidden="true"
                              />
                            }
                            className="px-3 text-xs font-semibold"
                          >
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Responsive Cards (0 horizontal overflow at 375px) */}
          <ul aria-label="Daftar produk" className="space-y-3 md:hidden">
            {products.map((product) => (
              <li
                key={product.id}
                className="rounded-[14px] border border-hairline bg-surface p-4 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-20 shrink-0 overflow-hidden rounded-[10px] border border-hairline">
                    <ProductImage
                      src={product.image_url}
                      alt={product.name}
                      aspect="4/3"
                      muted={product.stock <= 0}
                      compactFallback
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="neutral">{product.category}</Badge>
                      <StockStatusCell stock={product.stock} />
                    </div>

                    <h3 className="mt-1.5 line-clamp-2 font-display text-sm font-bold leading-snug text-ink">
                      {product.name}
                    </h3>

                    <p className="mt-1 font-mono text-base font-bold text-ink tabular-nums">
                      {formatIDR(product.price)}
                    </p>
                  </div>
                </div>

                <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-ink-secondary">
                  {product.description}
                </p>

                <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-hairline pt-3">
                  <Button
                    variant="secondary"
                    onClick={() => handleOpenEditModal(product)}
                    aria-label={`Edit ${product.name}`}
                    leftIcon={
                      <Pencil
                        className="h-4 w-4 stroke-[1.75]"
                        aria-hidden="true"
                      />
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger-soft"
                    onClick={() => setProductToDelete(product)}
                    aria-label={`Hapus ${product.name}`}
                    leftIcon={
                      <Trash2
                        className="h-4 w-4 stroke-[1.75]"
                        aria-hidden="true"
                      />
                    }
                  >
                    Hapus
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <nav
              aria-label="Navigasi halaman produk admin"
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

      {/* Create / Edit Product Modal */}
      <ProductFormModal
        isOpen={isFormOpen}
        editingProduct={editingProduct}
        categories={categories}
        onClose={handleCloseFormModal}
        onSaved={handleProductSaved}
      />

      {/* Soft Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={productToDelete !== null}
        onClose={() => {
          if (!isDeleting) {
            setProductToDelete(null);
          }
        }}
        onConfirm={() => void handleConfirmDelete()}
        title="Hapus produk ini?"
        description={
          productToDelete
            ? `Produk "${productToDelete.name}" akan dihapus dari katalog aktif dan tidak lagi tampil di Storefront. Riwayat pesanan lama yang memuat produk ini tetap tersimpan utuh.`
            : ''
        }
        confirmLabel="Hapus Produk"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isDeleting}
      />
    </section>
  );
}
