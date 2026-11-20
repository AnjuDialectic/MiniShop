# AI Usage Transparency — MiniShop

Dokumen ini mencatat secara jujur dan terstruktur bagaimana AI coding assistant digunakan selama pengembangan **MiniShop**, pembagian tanggung jawab antara developer dan AI di setiap fase, contoh prompt krusial yang membentuk kualitas sistem, serta verifikasi dan koreksi aktif yang dilakukan terhadap output AI.

---

## 1. AI Tools, Model & Metodologi Kerja

| Aspek | Detail |
|---|---|
| **Code Editor & AI IDE** | **Visual Studio Code (VS Code)** sebagai code editor utama, dipadukan dengan **Google Antigravity IDE** sebagai bantuan AI (*agentic workspace* dengan akses terminal, editor file, dan inspeksi browser terintegrasi) |
| **Model yang Digunakan** | **Orchestrator (Neon)** (penyusunan **PRD**, orkestrasi alur kerja per fase, perancangan prompt, review progres, dan panduan *debugging*), **Gemini 4 Neon Extra** (perencanaan arsitektur, penyusunan dokumen teknis, implementasi fitur, audit akhir, dan dokumentasi), serta **Claude Opus 5.5 High** (implementasi iteratif dan verifikasi kode) |
| **Pendekatan Kerja** | **Document-Driven Phased Execution** — sebelum menulis satu baris kode aplikasi, developer bersama AI menyusun spesifikasi lengkap di folder `docs/` (`PRD.md`, `Architecture.md`, `Design.md`, `USER-FLOW.md`, `Rules.md`, `TASK.md`, `ENV.md`, `CHANGELOG.md`), lalu mengeksekusi proyek secara bertahap dari **Fase 0 hingga Fase 7** dengan *quality gate* di akhir tiap fase. |


Pendekatan bertahap ini dipilih agar kontrak antara backend Laravel dan frontend React/TypeScript (nama field JSON, status HTTP `200`/`201`/`404`/`409`/`422`, batas validasi, dan perilaku edge-case) tetap konsisten lintas sesi tanpa terjadi *drift* arsitektur.

---

## 2. Pembagian Peran AI vs Developer per Fase

| Fase | Peran AI Assistant | Peran Developer (Kontrol, Review & Keputusan) |
|---|---|---|
| **Fase 0 — Planning & Monorepo Setup** | Menyusun **PRD** (`PRD.md`) bersama **Orchestrator (Neon)** serta draf 7 dokumen spesifikasi lainnya di `docs/`, *scaffolding* monorepo `backend/` (Laravel REST API) dan `frontend/` (React + Vite + TS + Tailwind), konfigurasi CORS, `ApiResponse`, dan *design tokens* awal. | Menentukan batasan *scope* < 2 hari, memilih arsitektur SPA + REST API terpisah, memutuskan penggunaan **SQLite lokal (zero-setup)** dengan paritas PostgreSQL di production, serta meninjau ERD dan kontrak 10 endpoint sebelum coding dimulai. |
| **Fase 1–3 — Backend DB, Atomic Checkout & Tests** | Mengimplementasikan migrations, Eloquent Models (`SoftDeletes`), `ProductSeeder` & `OrderSeeder`, `FormRequest` validators, API Resources, `CheckoutService`, `CheckoutConflictException`, serta suite Feature Tests (`ProductApiTest`, `CheckoutTest`, `OrderAdminTest`). | Memverifikasi kebenaran mekanisme anti-deadlock & rollback transaksi, memastikan harga selalu dihitung server-side, meninjau cakupan edge-case test (termasuk simulasi race condition), dan mewajibkan lulus `php artisan test` + `vendor/bin/pint --test`. |
| **Fase 4–5 — Frontend Storefront, Cart & Checkout** | Membangun typed API client + `ApiError` parser, Zustand `cartStore` (`localStorage` key `minishop-cart-v1`), shared UI primitives aksesibel, `CatalogPage`, `ProductDetailModal`/`Page`, `CartDrawer`, `CheckoutModal` (panel recovery `409`), dan `OrderConfirmationPage`. | Menjaga keselarasan kontrak `409 Conflict` dengan backend, mengecek responsivitas desktop/mobile serta persistensi cart saat browser di-refresh, dan memvalidasi UX interaksi (toast, focus trap modal, anti double-submit). |
| **Fase 6 — Admin Dashboard (`/admin`)** | Membangun `AdminLayout`, metrik operasional, `ProductsTable`, `ProductFormModal` (live preview gambar + inline error `422`), `ConfirmDialog` soft delete, `OrdersTable`, dan `OrderDetailModal` (tampilan snapshot item). | Menginspeksi visual UI secara langsung di browser pada viewport `1440px` dan `375px`, mengidentifikasi clipping tabel dan posisi toast yang kurang ideal, serta memverifikasi sinkronisasi real-time antara mutasi Admin dan Storefront. |
| **Fase 7 — Debugging, E2E Audit & Deployment Prep** | Menyusun konfigurasi deploy (`Dockerfile`, `vercel.json`, `_redirects`), mengaudit `.env.example`/`cors.php`/`database.php`/`.gitignore`, melengkapi `README.md`, `AI_USAGE.md`, dan memperbarui `docs/TASK.md` & `docs/CHANGELOG.md`. | Menjalankan verifikasi akhir menyeluruh (backend test, Pint, typecheck, lint, production build, `git ls-files`, `git status`), mengevaluasi *Known Limitations*, serta mengontrol commit dan push akhir ke GitHub. |

---

## 3. Contoh Prompt Krusial Aktual

Berikut dua contoh prompt utama yang secara langsung menentukan ketahanan transaksi backend serta kualitas sinkronisasi error recovery di frontend.

### Prompt 1 — Arsitektur & Implementasi Backend Atomic Checkout (SQLite/PostgreSQL) + Feature Tests

> **Prompt Aktual (Fase 1–3):**
> *"Implementasikan Fase 1 sampai Fase 3 Backend sesuai `docs/PRD.md`, `docs/Architecture.md`, dan `docs/Rules.md`. Pastikan seluruh migration, query pencarian, dan `CheckoutService` berjalan mulus di SQLite lokal maupun PostgreSQL production:*
> *1. Tabel `products` menggunakan `BIGINT` untuk harga IDR, `SoftDeletes`, indeks kategori & nama, serta `CHECK (price > 0)` dan `CHECK (stock >= 0)` saat driver `pgsql`. Tabel `order_items` menyimpan snapshot permanen (`product_name`, `product_image_url`, `unit_price`, `quantity`, `subtotal`) dengan FK `product_id` `restrictOnDelete` agar histori order tidak rusak saat produk diubah atau di-soft-delete.*
> *2. Di `CheckoutService::execute()`, bungkus seluruh proses dalam `DB::transaction`, urutkan `product_id` secara ascending sebelum query untuk mencegah deadlock, aktifkan `lockForUpdate()` saat driver `pgsql`, validasi seluruh item sebelum mutasi, dan lakukan conditional atomic stock decrement (`WHERE id = ? AND deleted_at IS NULL AND stock >= ?`). Hitung semua harga dan total murni di server.*
> *3. Jika ada item stok kurang atau tidak tersedia/soft-deleted, rollback penuh dan lempar `CheckoutConflictException` yang dirender menjadi HTTP `409 Conflict` berisi `errors.items[]` dengan field `product_id`, `product_name`, `requested_quantity`, `available_stock`, dan `reason`.*
> *4. Lengkapi `ProductSeeder` (10 produk lintas 4 kategori, termasuk 1 produk `stock = 0` dan 1 produk `stock = 2`), `OrderSeeder` (2 sample orders), dan tulis Feature Tests (`ProductApiTest`, `CheckoutTest`, `OrderAdminTest`) termasuk pengujian rollback penuh saat race condition terjadi di tengah transaksi. Verifikasi dengan `php artisan migrate:fresh --seed`, `php artisan test`, dan `vendor/bin/pint --test`."*

**Dampak terhadap kualitas sistem:**
Prompt ini memastikan logika checkout tidak berhenti pada sekadar *happy path* Eloquent `decrement()`. Hasilnya adalah [`CheckoutService.php`](./backend/app/Services/CheckoutService.php) dengan *defense in depth* lintas driver, kontrak error terstruktur di [`CheckoutConflictException.php`](./backend/app/Exceptions/CheckoutConflictException.php), serta pengujian otomatis di [`CheckoutTest.php`](./backend/tests/Feature/CheckoutTest.php) yang benar-benar mensimulasikan penurunan stok di tengah transaksi menggunakan `DB::listen()` untuk membuktikan rollback total.

---

### Prompt 2 — Implementasi Frontend Storefront, Persistent Cart & Recovery `409 Conflict` Selaras Backend

> **Prompt Aktual (Fase 4–5):**
> *"Kerjakan Fase 4 dan Fase 5 Frontend sesuai `docs/Design.md`, `docs/USER-FLOW.md`, dan kontrak aktual backend (cek langsung `CheckoutConflictException.php`, `ProductResource.php`, `OrderResource.php`, dan `bootstrap/app.php` agar 100% sinkron):*
> *1. Buat `src/api/client.ts` dengan `ApiError` parser yang memisahkan `422 Validation Error` per field dan `409 Conflict` (`errors.items[]` berisi `product_id`, `product_name`, `requested_quantity`, `available_stock`, `reason`).*
> *2. Bangun `cartStore.ts` dengan Zustand `persist` ke `localStorage` key `minishop-cart-v1`, sanitasi data saat rehydration, boundary guard ketat `1 <= qty <= maxStock`, `syncWithCatalog()` untuk mendeteksi stale cart, serta `applyStockConflicts()`, `resolveConflictForItem()`, dan `resolveAllConflicts()`.*
> *3. Bangun `CatalogPage`, `ProductDetailModal` + rute `/products/:id`, `CartDrawer`, `CheckoutModal` (anti double-submit + panel recovery `409 Conflict` per item dan tombol 1-klik 'Sesuaikan Semua ke Stok Tersedia'), serta `OrderConfirmationPage` (`/orders/:id/confirmation`) yang tetap utuh saat halaman di-refresh.*
> *4. Verifikasi dengan `npm run typecheck`, `npm run lint`, `npm run build`, lalu uji langsung di browser pada viewport `1440px` dan `375px` termasuk persistensi reload dan simulasi konflik stok `409` antar dua tab."*

**Dampak terhadap kualitas sistem:**
Dengan mewajibkan AI membaca langsung kontrak PHP backend sebelum menulis tipe TypeScript dan UI checkout, seluruh alur konflik stok antara [`CheckoutConflictException.php`](./backend/app/Exceptions/CheckoutConflictException.php), [`client.ts`](./frontend/src/api/client.ts), [`cartStore.ts`](./frontend/src/stores/cartStore.ts), dan [`CheckoutModal.tsx`](./frontend/src/features/checkout/CheckoutModal.tsx) tersambung tanpa mismatch field dan langsung tervalidasi melalui skenario multi-tab di browser nyata.

---

## 4. Verifikasi Aktif & Koreksi Manual terhadap Output AI

Output AI tidak pernah diterima begitu saja tanpa inspeksi kode, eksekusi nyata, dan pengecekan visual. Beberapa koreksi dan penyesuaian konkret yang dilakukan selama pengembangan:

1. **Penyesuaian Database Lokal SQLite vs Production PostgreSQL:**
   - Spesifikasi awal mengasumsikan Docker + PostgreSQL lokal. Developer mengoreksi agar environment lokal memakai SQLite tanpa dependensi Docker demi kecepatan setup reviewer, sambil tetap menjaga kesiapan PostgreSQL di production.
   - Koreksi teknis diterapkan pada tiga titik: pengkondisian `lockForUpdate()` dan `ILIKE` vs `LOWER(...) LIKE` berdasarkan `DB::getDriverName()`, penambahan conditional atomic `UPDATE ... WHERE stock >= ?` agar aman dari race condition di kedua driver, serta penambahan fallback `env('DB_URL', env('DATABASE_URL'))` pada [`backend/config/database.php`](./backend/config/database.php) karena Laravel 13 membaca `DB_URL` sementara platform seperti Railway/Render menginjeksi `DATABASE_URL`.

2. **Inspeksi Screenshot Browser & Perbaikan Clipping Tabel `/admin/products` pada 1440px:**
   - Saat verifikasi visual di live browser desktop `1440px`, kolom nama/deskripsi panjang di tabel produk Admin sempat menekan kolom sebelah kanan (`Diperbarui` dan tombol aksi `Edit`/`Hapus`).
   - Diperbaiki di [`ProductsTable.tsx`](./frontend/src/features/admin/ProductsTable.tsx) dengan membatasi lebar fleksibel kolom produk (`max-w-[260px] lg:max-w-[300px] xl:max-w-[320px]`), menerapkan `whitespace-nowrap` pada kolom kategori/harga/stok/aksi, menyembunyikan kolom `Diperbarui` di bawah breakpoint `xl` (`hidden xl:table-cell`), dan menyediakan tampilan kartu khusus mobile (`< md`) sehingga tercapai `0 horizontal overflow` di `1440px` maupun `375px`.

3. **Pemindahan Posisi Toast Notification:**
   - Posisi awal toast di area layar berpotensi mengganggu visibilitas elemen interaktif. Posisi container toast pada [`Toast.tsx`](./frontend/src/components/ui/Toast.tsx) disesuaikan ke `top-[72px]` (mobile) dan `sm:top-20 sm:right-6` dengan `pointer-events-none` dan `z-[60]` agar selalu tampil rapi tepat di bawah sticky navbar tanpa menghalangi tombol utama atau area form.

4. **Audit Dependensi Produksi (`Dockerfile` & `cors.php`):**
   - Audit terhadap `backend/composer.lock` menemukan bahwa dependensi `symfony/* v8.1` dari Laravel 13 mensyaratkan `php >= 8.4.1`; base image pada [`backend/Dockerfile`](./backend/Dockerfile) langsung ditetapkan ke `php:8.4-cli-alpine` (bukan 8.3) dan `php artisan route:cache` dihindari karena default `routes/web.php` masih menggunakan closure route.
   - Pada [`backend/config/cors.php`](./backend/config/cors.php), parsing `FRONTEND_URL` diperketat dengan `rtrim(trim($origin), '/')` agar trailing slash pada konfigurasi origin production tidak memicu kegagalan CORS.

5. **Temuan QA Manual & Perbaikan Bug Focus-Jump pada Modal Form (`useDialogBehavior.ts`):**
   - Saat uji manual di browser pada `CheckoutModal` (*"Checkout Pesanan"*), setiap pengetikan 1 karakter di input `Nama Pembeli`, `Email Pembeli`, atau `Catatan Pesanan` menyebabkan fokus langsung melompat ke tombol tutup `"X"` di pojok kanan atas modal.
   - **Akar masalah:** Pada [`useDialogBehavior.ts`](./frontend/src/hooks/useDialogBehavior.ts), `onClose` dan `disableClose` dimasukkan ke dependency array `useEffect` untuk focus management & scroll lock. Karena komponen modal meneruskan callback inline `onClose` yang berganti referensi setiap re-render saat user mengetik, cleanup `useEffect` memanggil `previouslyFocused?.focus()` (mengeluarkan fokus dari dialog) lalu re-run `requestAnimationFrame` yang memaksa fokus kembali ke elemen fokus pertama di [`Modal.tsx`](./frontend/src/components/ui/Modal.tsx) — yaitu tombol `"X"`.
   - **Perbaikan & verifikasi:** Menyimpan `onClose` dan `disableClose` menggunakan `useRef` sehingga `useEffect` utama hanya bergantung pada `[isOpen, containerRef]`, menjaga `didInitialFocusRef` agar initial focus hanya dijalankan sekali saat modal baru dibuka (tetap kompatibel dengan React `StrictMode`), serta memastikan fokus tidak pernah dipindahkan bila sudah berada di dalam dialog (`container.contains(document.activeElement)`). Diverifikasi ulang via `npm run typecheck`, `npm run lint`, `npm run build`, dan uji ketik karakter-demi-karakter di browser pada seluruh field `CheckoutModal` dan `ProductFormModal` (`/admin/products` mode Tambah & Edit).

6. **Quality Gate Wajib di Setiap Akhir Fase:**
   - **Backend:** `php artisan migrate:fresh --seed`, `php artisan test`, dan `vendor/bin/pint --test`.
   - **Frontend:** `npm run typecheck`, `npm run lint` (`0 errors, 0 warnings`), dan `npm run build`.
   - **Repository Hygiene:** Audit `git ls-files` dan `git status` untuk memastikan tidak ada file `.env`, `database.sqlite`, `vendor/`, `node_modules/`, `dist/`, atau file sementara yang masuk ke repository.
