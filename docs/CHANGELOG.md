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

### Planned
- Fase 4–6: React + Vite + Tailwind + Zustand Storefront, Cart Drawer (`localStorage`), Checkout & Confirmation, serta Admin Dashboard (`/admin`).
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
