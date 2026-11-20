# Implementation Task Breakdown — MiniShop (< 2 Hari)

Gunakan daftar ini sebagai panduan eksekusi berurutan agar proyek selesai rapi dalam waktu < 2 hari (~16 jam kerja efektif). Setiap tugas memiliki kriteria verifikasi eksplisit (`verify`).

---

## Hari 1 — Foundation, Database & Backend REST API (~8 Jam)

### Fase 0: Project & Environment Setup (~1 Jam)
- [x] **0.1** Inisialisasi Git repository di root `MiniShop/` + `.gitignore` monorepo + remote origin `https://github.com/AnjuDialectic/MiniShop`.
  - *verify:* `git status` bersih tanpa file `.env`, `vendor/`, `node_modules/`, atau `*.sqlite`.
- [x] **0.2** Konfigurasi database lokal SQLite (tanpa Docker) di `backend/.env` dan tetap siapkan variabel PostgreSQL pada `backend/.env.example` untuk production.
  - *verify:* `php artisan migrate` berjalan bersih pada `database/database.sqlite`.
- [x] **0.3** Scaffold Laravel REST API di `backend/` (`php artisan install:api`), konfigurasi `.env`, `.env.example`, `config/cors.php` (izinkan `FRONTEND_URL`), `ApiResponse`, global JSON exception handler, dan `GET /api/v1/health`.
  - *verify:* `GET /api/v1/health` mengembalikan `200 OK` dengan status koneksi DB `connected` dan header CORS sesuai `FRONTEND_URL`.
- [x] **0.4** Scaffold Frontend React + Vite + TypeScript + Tailwind CSS di `frontend/`, install dependensi inti (`react-router-dom`, `zustand`, `lucide-react`), setup design tokens `docs/Design.md` di `src/index.css`, dan buat `frontend/.env.example`.
  - *verify:* `npm run typecheck`, `npm run lint`, `npm run build`, dan `vite` dev server di `http://localhost:5173` berjalan bersih.

### Fase 1: Database Schema, Models & Seeder (~1.5 Jam)
- [ ] **1.1** Buat migrations PostgreSQL untuk tabel `products` (dengan `softDeletes`, index `category`, `CHECK (price > 0)`, `CHECK (stock >= 0)`), `orders` (`order_code` unique, `total_amount > 0`, `total_quantity > 0`), dan `order_items` (FK `order_id` cascade, FK `product_id` restrict, kolom snapshot `product_name`, `product_image_url`, `unit_price`, `quantity`, `subtotal`).
  - *verify:* `php artisan migrate:fresh` berjalan bersih dan constraint `CHECK` aktif di PostgreSQL.
- [ ] **1.2** Buat Eloquent Models (`Product`, `Order`, `OrderItem`) beserta `$fillable`, `$casts`, `SoftDeletes`, dan relasi `hasMany`/`belongsTo`.
  - *verify:* Tinker / test memverifikasi relasi `Order::with('items')->get()` dan `Product::withTrashed()`.
- [ ] **1.3** Buat `ProductSeeder` (10 produk dummy realistis lintas 4 kategori, termasuk 1 produk `stock = 0` dan 1 produk `stock = 2`), `OrderSeeder` (2 sample orders historis), dan daftarkan di `DatabaseSeeder`.
  - *verify:* `php artisan migrate:fresh --seed` mengisi tepat 10 produk dan 2 order tanpa error.

### Fase 2: Backend REST API & Atomic Checkout (~3.5 Jam)
- [ ] **2.1** Buat `ApiResponse` helper & konversi global exception di `bootstrap/app.php` (`ValidationException` -> `422`, `ModelNotFoundException` -> `404`, `CheckoutConflictException` -> `409`, fallback JSON `500`).
  - *verify:* Endpoint tak dikenal & payload invalid selalu mengembalikan JSON konsisten `{ success: false, message, errors }`.
- [ ] **2.2** Buat API Resources (`ProductResource`, `OrderResource`, `OrderItemResource`) dan `FormRequest` validators (`StoreProductRequest`, `UpdateProductRequest`, `StoreOrderRequest` termasuk `items.*.product_id => distinct`).
  - *verify:* Request dengan `price <= 0`, `stock < 0`, URL invalid, atau `product_id` duplikat ditolak `422`.
- [ ] **2.3** Implementasi `CategoryController` (`GET /api/v1/categories`) dan `ProductController` (`GET`, `GET /{id}`, `POST`, `PUT /{id}`, `DELETE /{id}` + search `ILIKE`, filter `category`, sort, pagination).
  - *verify:* Seluruh CRUD produk & filter/search bekerja via HTTP test/curl.
- [ ] **2.4** Implementasi `CheckoutService` (`DB::transaction`, `orderBy('id', 'asc')->lockForUpdate()`, cek semua produk & stok sebelum mutasi, hitung subtotal/total server-side, simpan `orders` + `order_items` snapshot, decrement stok) dan `OrderController` (`POST /api/v1/orders`, `GET /api/v1/orders`, `GET /api/v1/orders/{id}`).
  - *verify:* Checkout valid mengembalikan `201 Created`, mengurangi stok di DB, dan menolak jika 1 item saja kurang stok dengan rollback total (`409 Conflict`).

### Fase 3: Backend Automated Tests (~2 Jam)
- [ ] **3.1** Tulis `tests/Feature/ProductApiTest.php` (list, search, filter kategori, create, update, soft delete, validation errors `422`, not found `404`).
- [ ] **3.2** Tulis `tests/Feature/CheckoutTest.php` (checkout sukses + verifikasi pengurangan stok + server-side price authority, stok tidak cukup -> `409` & stok item lain tetap utuh/rollback, produk soft-deleted ditolak, duplikasi `product_id` -> `422`, empty items -> `422`).
- [ ] **3.3** Tulis `tests/Feature/OrderAdminTest.php` (list order urut terbaru + `items_count`, detail order mempertahankan snapshot harga lama meski harga produk diubah atau produk dihapus).
  - *verify:* `php artisan test` lulus 100% tanpa warning atau skip.

---

## Hari 2 — Frontend UI, Admin Dashboard, QA, Docs & Deploy (~8 Jam)

### Fase 4: Frontend Core, Design Tokens & Cart Store (~1.5 Jam)
- [ ] **4.1** Konfigurasi font (`Plus Jakarta Sans`, `Inter`, `JetBrains Mono`) & CSS design tokens di `frontend/src/index.css` sesuai [Design.md](./Design.md).
- [ ] **4.2** Buat TypeScript types (`product.ts`, `cart.ts`, `order.ts`, `api.ts`), helper `formatIDR` & `formatDateTime`, serta API client (`src/api/client.ts`, `products.ts`, `orders.ts`) dengan parsing error `422`/`409`.
- [ ] **4.3** Implementasi `src/stores/cartStore.ts` (Zustand + `persist` ke `localStorage` key `minishop-cart-v1`) dengan `addItem`, `updateQuantity` (clamp `1..maxStock`), `removeItem`, `clearCart`, `syncWithCatalog`, `applyStockConflicts`, serta `toastStore.ts`.
- [ ] **4.4** Bangun shared UI primitives (`Button`, `Badge`, `Modal`, `ConfirmDialog`, `ProductImage` dengan fallback `onError`, `EmptyState`, `Toast`) dan `AppShell` + `Navbar` responsif.
  - *verify:* Cart tetap tersimpan setelah reload browser; `npx tsc --noEmit` lulus bersih.

### Fase 5: Customer Storefront, Cart Drawer & Checkout (~2.5 Jam)
- [ ] **5.1** Bangun `CatalogPage` (`/`) dengan search debounced 300ms, `CategoryFilter` pills, skeleton loading grid, `ProductCard` (badge stok habis / sisa stok, disable CTA saat habis atau maksimal di cart), serta `syncWithCatalog`.
- [ ] **5.2** Bangun `ProductDetailModal` dan rute langsung `/products/:id` (detail penuh, qty stepper `1..stock`, tombol Add to Cart).
- [ ] **5.3** Bangun `CartDrawer` (slide-over kanan, kontrol `-` / input / `+`, batas stok ketat, hapus item, kalkulasi otomatis line total & subtotal, tombol "Lanjut Checkout").
- [ ] **5.4** Bangun `CheckoutModal` (form nama wajib + email/catatan opsional, ringkasan item, anti double-submit, recovery UI untuk `409 Conflict` stok kurang) dan `OrderConfirmationPage` (`/orders/:id/confirmation`) yang menampilkan ringkasan "Order Berhasil" & mengosongkan cart.
  - *verify:* Full flow Browse -> Search -> Filter -> Detail -> Add Cart -> Refresh Browser -> Update Qty -> Checkout -> Order Confirmation -> Stok berkurang di Catalog terverifikasi di desktop & mobile viewport (`375px` & `1440px`).

### Fase 6: Admin Dashboard (`/admin`) (~2 Jam)
- [ ] **6.1** Bangun `AdminLayout` (`/admin/products` & `/admin/orders`) dengan ringkasan metrik singkat (total produk, stok menipis/habis, total order) dan navigasi kembali ke Storefront.
- [ ] **6.2** Bangun `ProductsTable` + search/filter, `ProductFormModal` (Tambah & Edit produk dengan validasi inline `422` & live preview gambar), serta `ConfirmDialog` untuk Hapus produk.
- [ ] **6.3** Bangun `OrdersTable` (kode order, tanggal, nama pembeli, jumlah item, total nominal) dan `OrderDetailModal` (info pembeli, catatan, rincian item beserta snapshot harga satuan & qty).
  - *verify:* Tambah/Edit/Hapus produk di `/admin` langsung tercermin di Storefront; order baru dari checkout langsung muncul di `/admin/orders` lengkap dengan detailnya.

### Fase 7: QA, Deliverables, Documentation & Deploy Prep (~2 Jam)
- [ ] **7.1** Jalankan pengujian edge cases menyeluruh (stok 0, batas stok, stale cart saat produk dihapus/stok diubah admin, broken image URL, input qty ekstrem, mobile responsiveness, keyboard Escape pada modal).
- [ ] **7.2** Buat konfigurasi siap deploy: `frontend/vercel.json`, `frontend/public/_redirects`, `backend/Dockerfile`, dan pastikan `frontend` & `backend` bisa dibuild produksi (`npm run build`).
- [ ] **7.3** Tulis `README.md` di root repo (Overview, Tech Stack & alasan, Langkah instalasi lokal + docker + migrate & seeder, Tabel daftar endpoint API + contoh request/response, Known Limitations).
- [ ] **7.4** Tulis `AI_USAGE.md` di root repo (daftar AI coding tools + 2 contoh prompt krusial untuk logika cart & atomic stock deduction).
- [ ] **7.5** (Opsional / Nilai Plus) Deploy Frontend ke Vercel/Netlify & Backend + PostgreSQL ke Railway/Render, lalu cantumkan live demo URL di `README.md`.
- [ ] **7.6** Final cleanliness check (test fresh clone/setup, push ke GitHub/GitLab, siapkan email pengiriman sesuai ketentuan Roketin).
  - *verify:* Semua deliverables pada Case Study PDF terpenuhi 100%.
