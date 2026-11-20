# Changelog — MiniShop

Seluruh perubahan penting dan pencapaian milestone proyek MiniShop dicatat secara kronologis di file ini.

---

## [Unreleased]

### Completed (Fase 0)
- **Git & Monorepo:** Inisialisasi repo `main`, `.gitignore` root (abaikan `.env`, `node_modules`, `vendor`, `*.sqlite`, `dist`), dan remote origin `https://github.com/AnjuDialectic/MiniShop`.
- **Backend (`backend/`):** Scaffold Laravel v13.11.0 (framework v13.43.0) + PHP 8.5.12 (`herd-lite`), aktifkan API routes (`install:api`), konfigurasi SQLite lokal (kompatibel PostgreSQL via `.env.example`), CORS untuk `FRONTEND_URL`, `ApiResponse` envelope, global JSON error handler (`bootstrap/app.php`), dan endpoint `GET /api/v1/health`.
- **Frontend (`frontend/`):** Scaffold React 19 + Vite 8 + TypeScript (`strict: true`) + Tailwind CSS v4 + Zustand + React Router + `lucide-react`, terapkan design tokens *Editorial Warm Minimalism* di `src/index.css`, dan halaman bootstrap koneksi `/api/v1/health`.

### Completed (Fase 1–3: Backend Database, REST API & Tests)
- **Database Schema & Models (`backend/database/`, `backend/app/Models/`):**
  - Migrations kompatibel SQLite & PostgreSQL untuk `products` (`BIGINT` harga, `SoftDeletes`, indeks kategori & nama, `CHECK` constraints PostgreSQL), `orders` (`order_code` unik, indeks `created_at`), dan `order_items` (FK `cascade`/`restrict`, kolom snapshot `product_name`, `product_image_url`, `unit_price`, `quantity`, `subtotal`).
  - Eloquent Models (`Product`, `Order`, `OrderItem`) dengan `strict_types`, `$fillable`, `casts()`, `SoftDeletes`, dan relasi lengkap + `ProductFactory`.
  - Seeders idempotent: `ProductSeeder` (10 produk lintas 4 kategori termasuk `stock = 0` & `stock = 2`) dan `OrderSeeder` (2 sample orders historis beserta `order_items`).
- **REST API & Atomic Checkout (`backend/app/Http/`, `backend/app/Services/`):**
  - `CheckoutConflictException` + handler JSON global `409 Conflict` di `bootstrap/app.php`.
  - API Resources (`ProductResource`, `OrderResource`, `OrderItemResource`) dan FormRequest validators (`StoreProductRequest`, `UpdateProductRequest`, `StoreOrderRequest` termasuk `url:http,https` & `distinct` product IDs).
  - Endpoints `/api/v1/categories`, `/api/v1/products` (search case-insensitive SQLite/`ILIKE` PostgreSQL, filter kategori, sort, pagination, CRUD Admin + soft delete), dan `/api/v1/orders` (checkout atomik, daftar order `withCount('items')`, detail order dengan snapshot).
  - `CheckoutService`: `DB::transaction` dengan pengurutan `product_id ASC`, `lockForUpdate()` saat driver `pgsql`, validasi seluruh item sebelum mutasi, conditional atomic decrement (`WHERE id = ? AND deleted_at IS NULL AND stock >= ?`), kalkulasi harga server-side, dan rollback penuh `409 Conflict` beserta `available_stock` per item.
- **Automated Feature Tests (`backend/tests/Feature/`):**
  - `ProductApiTest`, `CheckoutTest`, dan `OrderAdminTest` lulus 100% via `php artisan test` serta lolos pemeriksaan style Laravel Pint.

### Completed (Fase 4–5: Frontend Customer Storefront, Cart & Checkout)
- **Design System, Types & API Client (`frontend/src/index.css`, `src/types/`, `src/api/`, `src/utils/`):**
  - Finalisasi design tokens *Editorial Warm Minimalism*, animasi GPU-accelerated (`prefers-reduced-motion` aware), tipografi (`Plus Jakarta Sans`, `Inter`, `JetBrains Mono` + `tabular-nums`), dan utilitas `formatIDR` & `formatDateTime`.
  - Kontrak TypeScript ketat 100% selaras dengan Laravel API Resources (`Product`, `Order`, `OrderItem`) serta `ApiError` parser untuk validasi `422` dan `409 Conflict` (`errors.items` berisi `product_id`, `product_name`, `requested_quantity`, `available_stock`, `reason`).
- **State Management Cart & UI Primitives (`frontend/src/stores/`, `src/components/`):**
  - Zustand `cartStore` terpersisten otomatis ke `localStorage` (`minishop-cart-v1`) dengan sanitasi rehydration, batas ketat `1 <= qty <= maxStock`, `syncWithCatalog`, `applyStockConflicts`, `resolveConflictForItem`, dan `resolveAllConflicts`, ditambah `toastStore` & `uiStore`.
  - Shared UI primitives aksesibel WCAG 2.2 AA (`Button`, `Badge`, `Modal`, `ConfirmDialog`, `ProductImage` rasio `4:3` + fallback `onError`, `EmptyState`, `ToastContainer`), `useDialogBehavior` (Escape, focus trap, scroll lock), serta `AppShell` + `Navbar` (link Storefront `/`, tombol `/admin`, dan tombol Keranjang ber-badge counter).
- **Catalog, Product Detail, Cart Drawer & Atomic Checkout (`frontend/src/features/`):**
  - `CatalogPage` (`/`): integrasi `GET /api/v1/products` & `GET /api/v1/categories`, search debounced 300ms, filter kategori, sort, skeleton grid, indikator `Stok Habis` (disable CTA) / `Sisa X` / `Stok: X`, serta rute placeholder `/admin` (`AdminPlaceholderPage`).
  - `ProductDetailModal` & rute langsung `/products/:id` (`ProductDetailPage`) dengan qty stepper sesuai batas sisa stok.
  - `CartDrawer` & `CartItemRow`: ubah qty (`-`/input/`+`), hapus item, kosongkan keranjang, kalkulasi live subtotal per item & grand total, serta resolusi item konflik stok.
  - `CheckoutModal` & `OrderConfirmationPage` (`/orders/:id/confirmation`): submit `POST /api/v1/orders` tanpa payment gateway, anti double-submit, panel pemulihan `409 Conflict` per item & 1-klik *"Sesuaikan Semua ke Stok Tersedia"*, pengosongan otomatis cart di Zustand + `localStorage` saat sukses, serta halaman konfirmasi *"Order Berhasil"* yang mendukung refresh via `GET /api/v1/orders/{id}`.
- **Verifikasi:** `npm run typecheck`, `npm run lint` (`0 warnings, 0 errors`), `npm run build` lulus bersih, serta uji E2E live browser (termasuk simulasi 409 Conflict multi-tab, persistensi `localStorage` lintas reload, dan responsivitas `1440px` & `375px`).

### Completed (Fase 6: Admin Dashboard `/admin`)
- **API Client & Types (`frontend/src/api/`, `src/types/`, `src/components/ui/ProductImage.tsx`):**
  - Tambahkan kontrak `ProductMutationPayload`, `OrderListParams`, serta fungsi mutasi `createProduct` (`POST /api/v1/products`), `updateProduct` (`PUT /api/v1/products/{id}`), `deleteProduct` (`DELETE /api/v1/products/{id}`), dan `fetchOrders` (`GET /api/v1/orders`).
  - Tambahkan callback opsional `onLoadSuccess`/`onLoadError` pada `ProductImage` untuk mendukung status pratinjau langsung URL gambar di form Admin.
- **Routing & Admin Shell (`frontend/src/App.tsx`, `src/features/admin/AdminLayout.tsx`, `adminContext.ts`):**
  - Ganti `AdminPlaceholderPage` dengan nested routes `/admin` (redirect otomatis ke `/admin/products`), `/admin/products`, dan `/admin/orders`.
  - Bangun `AdminLayout` bergaya *Editorial Warm Minimalism (Pure Operate)* berisi ringkasan metrik operasional (Produk Aktif, Stok Menipis & Habis, Total Pesanan), sub-navigasi tab **Produk** | **Pesanan** dengan counter live, tombol kembali ke Storefront (`/`), serta sinkronisasi katalog ke `cartStore`.
- **Manajemen Produk (`frontend/src/features/admin/ProductsTable.tsx`, `ProductFormModal.tsx`):**
  - Tabel responsif (desktop table + mobile card layout `375px` tanpa horizontal overflow) menampilkan gambar 4:3, nama, deskripsi, kategori, harga IDR (`formatIDR`), badge status stok (`Tersedia`, `Sisa X`, `Stok Habis`), tanggal pembaruan, aksi `Edit` & `Hapus`, search debounced 300ms, filter kategori, sort, dan pagination.
  - `ProductFormModal` untuk Tambah & Edit produk dengan validasi client-side ketat (`price > 0`, `stock >= 0`, `http/https` URL, batas panjang karakter), pemetaan inline error `422 Validation Error` per field dari backend, quick-pick kategori + kategori kustom, pratinjau IDR/status stok, live preview gambar 4:3 + fallback, anti double-submit, dan notifikasi toast.
  - Soft delete produk wajib melalui `ConfirmDialog` dengan konfirmasi bahwa riwayat order lama tetap terjaga.
- **Daftar & Detail Pesanan (`frontend/src/features/admin/OrdersTable.tsx`, `OrderDetailModal.tsx`):**
  - `OrdersTable` responsif untuk `GET /api/v1/orders` menampilkan kode order, status, tanggal & waktu (`formatDateTime`), info pembeli, ringkasan jumlah item (`X produk · Y unit`), total nominal IDR, tombol muat ulang, pagination, dan aksi `Lihat Detail`.
  - `OrderDetailModal` memuat `GET /api/v1/orders/{id}` menampilkan metadata pembeli, catatan pesanan, salin kode order, dan rincian snapshot permanen `order_items` (`product_image_url`, `product_name`, `unit_price`, `quantity`, `subtotal`, grand total) yang tetap utuh meskipun produk asli telah di-soft-delete.
- **Verifikasi:** `npm run typecheck`, `npm run lint` (`0 warnings, 0 errors`), `npm run build` lulus bersih; uji E2E live browser desktop (`1440px`) & mobile (`375px`) memverifikasi CRUD produk, validasi error, sinkronisasi Storefront, soft-delete + keutuhan snapshot order, `0 console errors`, `0 horizontal overflow`, dilanjutkan `php artisan migrate:fresh --seed` untuk mengembalikan kondisi awal database lokal (10 produk & 2 sample order).

### Planned
- Fase 7: Edge-case QA, konfigurasi deployment (Vercel/Railway/Render), `README.md`, dan `AI_USAGE.md`.

---

## [0.1.0-docs] — 2026-11-20

### Added
- Menginisialisasi paket 8 dokumen arsitektur & perencanaan proyek di folder `docs/`:
  - [PRD.md](./PRD.md) — Spesifikasi lengkap produk, ERD PostgreSQL, kontrak 10 REST API endpoints, matriks edge cases, deliverables Roketin, dan task breakdown < 2 hari.
  - [Architecture.md](./Architecture.md) — Diagram sistem, struktur folder monorepo, desain atomic checkout + anti-deadlock, dan arsitektur Zustand `cartStore`.
  - [USER-FLOW.md](./USER-FLOW.md) — Peta rute, alur Customer & Admin langkah demi langkah, dan state machine checkout conflict recovery.
  - [Design.md](./Design.md) — Design system (*Editorial Warm Minimalism*), color/typography/spacing tokens, implementasi 5 UX Laws, dan checklist WCAG 2.2 AA.
  - [Rules.md](./Rules.md) — Standar kode Laravel & React TypeScript, konvensi API, dan disiplin testing.
  - [TASK.md](./TASK.md) — Checklist implementasi bertahap Hari 1 & Hari 2 dengan kriteria verifikasi eksplisit.
  - [ENV.md](./ENV.md) — Spesifikasi environment variables lokal, testing, dan production deployment.
  - [CHANGELOG.md](./CHANGELOG.md) — Log riwayat milestone proyek.

### Decisions
- **Frontend:** React + Vite + TypeScript + Tailwind CSS + Zustand (`persist` ke `localStorage`).
- **Backend:** Laravel 11/12 REST API + Eloquent ORM.
- **Database:** PostgreSQL 16 (dengan `SoftDeletes` pada `products`, kolom snapshot pada `order_items`, `BIGINT` IDR, serta `DB::transaction` + `lockForUpdate()` terurut `id ASC`).
- **Admin Access:** Direct `/admin` tanpa autentikasi (sesuai scope 2 hari, dicatat di *Known Limitations*).
