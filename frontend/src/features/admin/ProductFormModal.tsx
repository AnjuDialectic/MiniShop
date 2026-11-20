import { useId, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  Save,
} from 'lucide-react';
import { isApiError } from '../../api/client';
import { createProduct, updateProduct } from '../../api/products';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ProductImage } from '../../components/ui/ProductImage';
import { useDebounce } from '../../hooks/useDebounce';
import { useToastStore } from '../../stores/toastStore';
import type { Product, ProductMutationPayload } from '../../types/product';
import { cn, formatIDR } from '../../utils/format';

export interface ProductFormModalProps {
  isOpen: boolean;
  editingProduct: Product | null;
  categories: string[];
  onClose: () => void;
  onSaved: (product: Product, mode: 'create' | 'edit') => void;
}

type ProductFieldKey =
  | 'name'
  | 'category'
  | 'price'
  | 'stock'
  | 'description'
  | 'image_url';

type ProductFieldErrors = Partial<Record<ProductFieldKey, string>>;

const MAX_SAFE_STOCK = 2_147_483_647;

function parseStrictInteger(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function isValidHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '' || /\s/.test(trimmed)) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    const hasValidScheme =
      parsed.protocol === 'http:' || parsed.protocol === 'https:';
    const hasValidHost =
      parsed.hostname === 'localhost' || parsed.hostname.includes('.');
    return hasValidScheme && hasValidHost;
  } catch {
    return false;
  }
}

interface ProductFormModalContentProps {
  editingProduct: Product | null;
  categories: string[];
  onClose: () => void;
  onSaved: (product: Product, mode: 'create' | 'edit') => void;
}

function ProductFormModalContent({
  editingProduct,
  categories,
  onClose,
  onSaved,
}: ProductFormModalContentProps) {
  const showToast = useToastStore((state) => state.showToast);
  const mode: 'create' | 'edit' = editingProduct ? 'edit' : 'create';

  const [name, setName] = useState(editingProduct?.name ?? '');
  const [category, setCategory] = useState(editingProduct?.category ?? '');
  const [priceInput, setPriceInput] = useState(
    editingProduct ? String(editingProduct.price) : '',
  );
  const [stockInput, setStockInput] = useState(
    editingProduct ? String(editingProduct.stock) : '',
  );
  const [description, setDescription] = useState(
    editingProduct?.description ?? '',
  );
  const [imageUrl, setImageUrl] = useState(editingProduct?.image_url ?? '');

  const [fieldErrors, setFieldErrors] = useState<ProductFieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewState, setPreviewState] = useState<{
    url: string;
    status: 'loaded' | 'error';
  } | null>(null);

  const formId = useId();
  const nameId = useId();
  const categoryId = useId();
  const priceId = useId();
  const stockId = useId();
  const descriptionId = useId();
  const imageUrlId = useId();

  const debouncedImageUrl = useDebounce(imageUrl.trim(), 250);
  const hasPreviewUrl = debouncedImageUrl.length > 0;
  const previewUrlValid = isValidHttpUrl(debouncedImageUrl);
  const activePreviewStatus =
    previewState?.url === debouncedImageUrl ? previewState.status : null;

  const parsedPricePreview = parseStrictInteger(priceInput);
  const parsedStockPreview = parseStrictInteger(stockInput);

  const clearFieldError = (field: ProductFieldKey) => {
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      return { ...prev, [field]: undefined };
    });
  };

  const validateForm = (): {
    errors: ProductFieldErrors;
    payload: ProductMutationPayload | null;
  } => {
    const errors: ProductFieldErrors = {};

    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    const trimmedDescription = description.trim();
    const trimmedImageUrl = imageUrl.trim();

    if (trimmedName.length === 0) {
      errors.name = 'Nama produk wajib diisi.';
    } else if (trimmedName.length > 150) {
      errors.name = 'Nama produk maksimal 150 karakter.';
    }

    if (trimmedCategory.length === 0) {
      errors.category = 'Kategori produk wajib diisi.';
    } else if (trimmedCategory.length > 60) {
      errors.category = 'Kategori produk maksimal 60 karakter.';
    }

    const parsedPrice = parseStrictInteger(priceInput);
    if (priceInput.trim() === '') {
      errors.price = 'Harga produk wajib diisi.';
    } else if (parsedPrice === null) {
      errors.price = 'Harga produk harus berupa angka bulat.';
    } else if (parsedPrice <= 0) {
      errors.price = 'Harga harus lebih dari 0.';
    }

    const parsedStock = parseStrictInteger(stockInput);
    if (stockInput.trim() === '') {
      errors.stock = 'Stok produk wajib diisi.';
    } else if (parsedStock === null) {
      errors.stock = 'Stok produk harus berupa angka bulat.';
    } else if (parsedStock < 0) {
      errors.stock = 'Stok tidak boleh kurang dari 0.';
    } else if (parsedStock > MAX_SAFE_STOCK) {
      errors.stock = 'Stok melebihi batas maksimum yang diizinkan.';
    }

    if (trimmedDescription.length === 0) {
      errors.description = 'Deskripsi produk wajib diisi.';
    } else if (trimmedDescription.length > 1000) {
      errors.description = 'Deskripsi produk maksimal 1000 karakter.';
    }

    if (trimmedImageUrl.length === 0) {
      errors.image_url = 'URL gambar wajib diisi.';
    } else if (trimmedImageUrl.length > 2048) {
      errors.image_url = 'URL gambar maksimal 2048 karakter.';
    } else if (!isValidHttpUrl(trimmedImageUrl)) {
      errors.image_url =
        'URL gambar harus menggunakan format http:// atau https:// yang valid.';
    }

    if (
      Object.keys(errors).length > 0 ||
      parsedPrice === null ||
      parsedStock === null
    ) {
      return { errors, payload: null };
    }

    return {
      errors: {},
      payload: {
        name: trimmedName,
        category: trimmedCategory,
        price: parsedPrice,
        stock: parsedStock,
        description: trimmedDescription,
        image_url: trimmedImageUrl,
      },
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const { errors, payload } = validateForm();
    if (!payload) {
      setFieldErrors(errors);
      setGeneralError(null);
      return;
    }

    setFieldErrors({});
    setGeneralError(null);
    setIsSubmitting(true);

    try {
      const savedProduct =
        mode === 'edit' && editingProduct
          ? await updateProduct(editingProduct.id, payload)
          : await createProduct(payload);

      showToast(
        mode === 'edit'
          ? `Produk "${savedProduct.name}" berhasil diperbarui.`
          : `Produk "${savedProduct.name}" berhasil ditambahkan.`,
        'success',
      );
      onSaved(savedProduct, mode);
    } catch (error) {
      if (isApiError(error)) {
        if (error.isValidationError) {
          const nextFieldErrors: ProductFieldErrors = {};
          const otherMessages: string[] = [];

          for (const [field, messages] of Object.entries(error.validationErrors)) {
            const firstMessage = messages[0];
            if (!firstMessage) {
              continue;
            }

            if (
              field === 'name' ||
              field === 'category' ||
              field === 'price' ||
              field === 'stock' ||
              field === 'description' ||
              field === 'image_url'
            ) {
              nextFieldErrors[field] = firstMessage;
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
        showToast(error.message, 'danger');
      } else {
        const fallbackMessage =
          'Terjadi kesalahan saat menyimpan produk. Silakan coba lagi.';
        setGeneralError(fallbackMessage);
        showToast(fallbackMessage, 'danger');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={mode === 'edit' ? 'Edit Produk' : 'Tambah Produk Baru'}
      subtitle={
        mode === 'edit'
          ? 'Perbarui detail, harga, atau stok produk di katalog aktif.'
          : 'Isi informasi produk untuk langsung ditampilkan di Storefront.'
      }
      size="lg"
      disableClose={isSubmitting}
      footer={
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            isLoading={isSubmitting}
            loadingText={
              mode === 'edit' ? 'Menyimpan Perubahan...' : 'Menyimpan Produk...'
            }
            leftIcon={<Save className="h-4 w-4 stroke-[1.9]" aria-hidden="true" />}
          >
            {mode === 'edit' ? 'Simpan Perubahan' : 'Simpan Produk'}
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        className="space-y-5"
      >
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

        {/* Nama Produk */}
        <div>
          <label
            htmlFor={nameId}
            className="mb-1.5 flex items-center justify-between text-sm font-medium text-ink"
          >
            <span>
              Nama Produk <span className="text-danger">*</span>
            </span>
            <span className="font-mono text-xs font-normal text-ink-secondary tabular-nums">
              {name.length}/150
            </span>
          </label>
          <input
            id={nameId}
            type="text"
            name="name"
            required
            maxLength={150}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clearFieldError('name');
            }}
            placeholder="Contoh: Mousepad Deskmat Felt 80x30cm"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? `${nameId}-error` : undefined}
            disabled={isSubmitting}
            className={cn(
              'min-h-[44px] w-full rounded-[10px] border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-secondary/75 transition-colors',
              fieldErrors.name
                ? 'border-danger bg-danger-bg/20'
                : 'border-hairline hover:border-border-strong focus:border-accent',
            )}
          />
          {fieldErrors.name && (
            <p
              id={`${nameId}-error`}
              role="alert"
              className="mt-1.5 text-xs font-medium text-danger"
            >
              {fieldErrors.name}
            </p>
          )}
        </div>

        {/* Kategori */}
        <div>
          <label
            htmlFor={categoryId}
            className="mb-1.5 flex items-center justify-between text-sm font-medium text-ink"
          >
            <span>
              Kategori <span className="text-danger">*</span>
            </span>
            <span className="text-xs font-normal text-ink-secondary">
              Pilih atau ketik kategori baru
            </span>
          </label>
          <input
            id={categoryId}
            type="text"
            name="category"
            required
            maxLength={60}
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              clearFieldError('category');
            }}
            placeholder="Contoh: Elektronik, Aksesoris, Fashion"
            aria-invalid={Boolean(fieldErrors.category)}
            aria-describedby={
              fieldErrors.category ? `${categoryId}-error` : undefined
            }
            disabled={isSubmitting}
            className={cn(
              'min-h-[44px] w-full rounded-[10px] border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-secondary/75 transition-colors',
              fieldErrors.category
                ? 'border-danger bg-danger-bg/20'
                : 'border-hairline hover:border-border-strong focus:border-accent',
            )}
          />
          {categories.length > 0 && (
            <div
              role="group"
              aria-label="Pilih cepat kategori tersedia"
              className="mt-2 flex flex-wrap gap-1.5"
            >
              {categories.map((cat) => {
                const isSelected =
                  category.trim().toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setCategory(cat);
                      clearFieldError('category');
                    }}
                    className={cn(
                      'inline-flex min-h-[44px] cursor-pointer items-center rounded-full border px-3.5 text-xs font-medium transition-colors',
                      isSelected
                        ? 'border-ink bg-ink text-surface'
                        : 'border-hairline bg-subtle/70 text-ink-secondary hover:border-border-strong hover:text-ink',
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}
          {fieldErrors.category && (
            <p
              id={`${categoryId}-error`}
              role="alert"
              className="mt-1.5 text-xs font-medium text-danger"
            >
              {fieldErrors.category}
            </p>
          )}
        </div>

        {/* Harga & Stok */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor={priceId}
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Harga (IDR) <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-sm font-medium text-ink-secondary"
              >
                Rp
              </span>
              <input
                id={priceId}
                type="number"
                name="price"
                inputMode="numeric"
                step="1"
                required
                value={priceInput}
                onChange={(event) => {
                  setPriceInput(event.target.value);
                  clearFieldError('price');
                }}
                placeholder="249000"
                aria-invalid={Boolean(fieldErrors.price)}
                aria-describedby={
                  fieldErrors.price ? `${priceId}-error` : `${priceId}-hint`
                }
                disabled={isSubmitting}
                className={cn(
                  'min-h-[44px] w-full rounded-[10px] border bg-surface py-2.5 pr-3.5 pl-11 font-mono text-sm text-ink tabular-nums placeholder:text-ink-secondary/75 transition-colors',
                  fieldErrors.price
                    ? 'border-danger bg-danger-bg/20'
                    : 'border-hairline hover:border-border-strong focus:border-accent',
                )}
              />
            </div>
            {fieldErrors.price ? (
              <p
                id={`${priceId}-error`}
                role="alert"
                className="mt-1.5 text-xs font-medium text-danger"
              >
                {fieldErrors.price}
              </p>
            ) : (
              <p
                id={`${priceId}-hint`}
                className="mt-1.5 font-mono text-xs text-ink-secondary tabular-nums"
              >
                {parsedPricePreview !== null && parsedPricePreview > 0
                  ? `Tampilan: ${formatIDR(parsedPricePreview)}`
                  : 'Masukkan angka bulat Rupiah (> 0)'}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor={stockId}
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Stok Tersedia <span className="text-danger">*</span>
            </label>
            <input
              id={stockId}
              type="number"
              name="stock"
              inputMode="numeric"
              step="1"
              required
              value={stockInput}
              onChange={(event) => {
                setStockInput(event.target.value);
                clearFieldError('stock');
              }}
              placeholder="10"
              aria-invalid={Boolean(fieldErrors.stock)}
              aria-describedby={
                fieldErrors.stock ? `${stockId}-error` : `${stockId}-hint`
              }
              disabled={isSubmitting}
              className={cn(
                'min-h-[44px] w-full rounded-[10px] border bg-surface px-3.5 py-2.5 font-mono text-sm text-ink tabular-nums placeholder:text-ink-secondary/75 transition-colors',
                fieldErrors.stock
                  ? 'border-danger bg-danger-bg/20'
                  : 'border-hairline hover:border-border-strong focus:border-accent',
              )}
            />
            {fieldErrors.stock ? (
              <p
                id={`${stockId}-error`}
                role="alert"
                className="mt-1.5 text-xs font-medium text-danger"
              >
                {fieldErrors.stock}
              </p>
            ) : (
              <p id={`${stockId}-hint`} className="mt-1.5 text-xs text-ink-secondary">
                {parsedStockPreview === null
                  ? 'Masukkan jumlah stok unit (>= 0)'
                  : parsedStockPreview === 0
                    ? 'Status di Storefront: Stok Habis'
                    : parsedStockPreview <= 3
                      ? `Status di Storefront: Sisa ${parsedStockPreview} (menipis)`
                      : `Status di Storefront: Tersedia (${parsedStockPreview} unit)`}
              </p>
            )}
          </div>
        </div>

        {/* Deskripsi */}
        <div>
          <label
            htmlFor={descriptionId}
            className="mb-1.5 flex items-center justify-between text-sm font-medium text-ink"
          >
            <span>
              Deskripsi Singkat <span className="text-danger">*</span>
            </span>
            <span className="font-mono text-xs font-normal text-ink-secondary tabular-nums">
              {description.length}/1000
            </span>
          </label>
          <textarea
            id={descriptionId}
            name="description"
            rows={3}
            required
            maxLength={1000}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              clearFieldError('description');
            }}
            placeholder="Jelaskan spesifikasi utama, bahan, atau keunggulan produk..."
            aria-invalid={Boolean(fieldErrors.description)}
            aria-describedby={
              fieldErrors.description ? `${descriptionId}-error` : undefined
            }
            disabled={isSubmitting}
            className={cn(
              'w-full resize-none rounded-[10px] border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-secondary/75 transition-colors',
              fieldErrors.description
                ? 'border-danger bg-danger-bg/20'
                : 'border-hairline hover:border-border-strong focus:border-accent',
            )}
          />
          {fieldErrors.description && (
            <p
              id={`${descriptionId}-error`}
              role="alert"
              className="mt-1.5 text-xs font-medium text-danger"
            >
              {fieldErrors.description}
            </p>
          )}
        </div>

        {/* URL Gambar + Live Preview */}
        <div>
          <label
            htmlFor={imageUrlId}
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            URL Gambar Produk <span className="text-danger">*</span>
          </label>
          <input
            id={imageUrlId}
            type="url"
            name="image_url"
            required
            maxLength={2048}
            value={imageUrl}
            onChange={(event) => {
              setImageUrl(event.target.value);
              clearFieldError('image_url');
            }}
            placeholder="https://images.unsplash.com/photo-..."
            aria-invalid={Boolean(fieldErrors.image_url)}
            aria-describedby={
              fieldErrors.image_url ? `${imageUrlId}-error` : undefined
            }
            disabled={isSubmitting}
            className={cn(
              'min-h-[44px] w-full rounded-[10px] border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-secondary/75 transition-colors',
              fieldErrors.image_url
                ? 'border-danger bg-danger-bg/20'
                : 'border-hairline hover:border-border-strong focus:border-accent',
            )}
          />
          {fieldErrors.image_url && (
            <p
              id={`${imageUrlId}-error`}
              role="alert"
              className="mt-1.5 text-xs font-medium text-danger"
            >
              {fieldErrors.image_url}
            </p>
          )}

          {/* Live Image Preview */}
          <div className="mt-3 flex flex-col gap-3 rounded-[12px] border border-hairline bg-canvas/80 p-3 sm:flex-row sm:items-center">
            <div className="w-full shrink-0 overflow-hidden rounded-[10px] border border-hairline sm:w-40">
              {hasPreviewUrl && previewUrlValid ? (
                <ProductImage
                  src={debouncedImageUrl}
                  alt={name.trim() || 'Pratinjau gambar produk'}
                  aspect="4/3"
                  priority
                  onLoadSuccess={() =>
                    setPreviewState({ url: debouncedImageUrl, status: 'loaded' })
                  }
                  onLoadError={() =>
                    setPreviewState({ url: debouncedImageUrl, status: 'error' })
                  }
                />
              ) : (
                <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 bg-subtle px-3 text-center text-ink-secondary">
                  <ImageIcon
                    className="h-5 w-5 stroke-[1.75]"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-medium">Pratinjau 4:3</span>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-semibold text-ink">
                Pratinjau Langsung Gambar
              </p>

              {!hasPreviewUrl ? (
                <p className="text-xs leading-relaxed text-ink-secondary">
                  Tempel URL gambar berawalan <code className="font-mono">http://</code> atau{' '}
                  <code className="font-mono">https://</code> untuk memeriksa tampilan rasio 4:3 sebelum disimpan.
                </p>
              ) : !previewUrlValid ? (
                <p className="flex items-start gap-1.5 text-xs font-medium text-warning">
                  <AlertTriangle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 stroke-[1.75]"
                    aria-hidden="true"
                  />
                  <span>
                    URL belum valid. Pastikan diawali http:// atau https:// dengan domain yang benar.
                  </span>
                </p>
              ) : activePreviewStatus === 'loaded' ? (
                <p className="flex items-start gap-1.5 text-xs font-medium text-success">
                  <CheckCircle2
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 stroke-[1.75]"
                    aria-hidden="true"
                  />
                  <span>Gambar berhasil dimuat dan siap tampil di Storefront.</span>
                </p>
              ) : activePreviewStatus === 'error' ? (
                <p className="flex items-start gap-1.5 text-xs font-medium text-danger">
                  <AlertTriangle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 stroke-[1.75]"
                    aria-hidden="true"
                  />
                  <span>
                    URL gambar tidak dapat dimuat. Placeholder fallback akan ditampilkan bila tetap disimpan.
                  </span>
                </p>
              ) : (
                <p className="text-xs text-ink-secondary">
                  Memeriksa pratinjau gambar...
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function ProductFormModal({
  isOpen,
  editingProduct,
  categories,
  onClose,
  onSaved,
}: ProductFormModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <ProductFormModalContent
      key={
        editingProduct
          ? `edit-${editingProduct.id}-${editingProduct.updated_at ?? ''}`
          : 'create-product'
      }
      editingProduct={editingProduct}
      categories={categories}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
