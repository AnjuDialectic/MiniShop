# Project Rules & Coding Conventions — MiniShop

Dokumen ini menetapkan standar kode, batasan arsitektur, dan disiplin rekayasa yang wajib dipatuhi pada seluruh codebase `backend/` dan `frontend/`.

---

## 1. Prinsip Umum
1. **Simplicity First (YAGNI):** Tulis kode paling ringkas dan jernih yang memenuhi spesifikasi. Jangan membuat abstraksi repository berlapis, event bus, atau queue worker yang tidak dibutuhkan oleh scope 2 hari.
2. **Contract Consistency:** Perubahan nama field JSON, HTTP status code, atau validasi harus disinkronkan di `PRD.md`, Laravel `FormRequest`/`Resource`, dan TypeScript `frontend/src/types/`.
3. **Zero Silent Failures:** Semua error backend dan frontend harus ditangani eksplisit dan memberi pesan yang dapat dipahami pengguna.

---

## 2. Backend Rules (`backend/` — Laravel 11/12 + PostgreSQL)

### 2.1 Struktur & Tanggung Jawab
- Gunakan `declare(strict_types=1);` pada semua file PHP yang dibuat di `app/`.
- **Thin Controllers:** Controller di `App\Http\Controllers\Api\V1\*` tidak boleh mengandung query transaksi kompleks. Delegasikan checkout ke `App\Services\CheckoutService`.
- **Validasi Wajib di `FormRequest`:** Jangan menaruh `$request->validate()` tersebar di controller; gunakan `StoreProductRequest`, `UpdateProductRequest`, dan `StoreOrderRequest`.
- **Serialization Wajib via API Resource:** Jangan mengembalikan `Model` Eloquent mentah langsung dari controller; gunakan `ProductResource`, `OrderResource`, `OrderItemResource`, serta helper `ApiResponse` agar format `{ success, message, data, meta/errors }` selalu seragam.

### 2.2 Database & Transaksi
- Semua perubahan skema wajib melalui migration yang memiliki metode `down()` yang valid.
- **Harga dalam integer `BIGINT` (IDR):** Jangan gunakan `float`/`double` untuk nominal uang.
- **Soft Delete pada `products`:** Wajib menggunakan trait `SoftDeletes` pada `App\Models\Product` agar penghapusan produk oleh Admin tidak pernah memutus relasi `order_items`.
- **Atomic Checkout:** `CheckoutService::execute()` wajib:
  1. Berjalan di dalam `DB::transaction()`.
  2. Mengambil produk dengan `whereIn('id', $ids)->orderBy('id', 'asc')->lockForUpdate()->get()`.
  3. Memvalidasi seluruh item sebelum menulis ke tabel `orders`/`order_items` atau mengurangi stok.
  4. Menghitung `unit_price`, `subtotal`, `total_amount`, dan `total_quantity` murni dari data database (abaikan nominal apa pun dari client).
  5. Menolak konflik stok/produk hilang dengan custom `CheckoutConflictException` -> HTTP `409 Conflict` yang memuat detail per item.
- **Prevent N+1 Query:** Selalu gunakan eager loading (`Order::with('items')`, `Order::withCount('items')`) pada endpoint daftar dan detail order.

### 2.3 Testing & Security
- Setiap endpoint utama dan edge case checkout wajib memiliki Feature Test di `tests/Feature/`.
- Jangan pernah commit file `.env`.
- Validasi URL gambar harus mensyaratkan skema `http` atau `https` (menolak `javascript:` atau `data:`).
- Konfigurasi CORS harus membaca origin dari env `FRONTEND_URL`, bukan wildcard bebas di production.

---

## 3. Frontend Rules (`frontend/` — React + Vite + TypeScript + Tailwind)

### 3.1 TypeScript & State Management
- Aktifkan `strict: true` di `tsconfig.json`. Dilarang memakai `any` (gunakan `unknown` + type guard jika perlu).
- **Cart State:** Wajib dikelola melalui `src/stores/cartStore.ts` (Zustand + `persist` ke `localStorage` dengan key `minishop-cart-v1`). Komponen UI tidak boleh mengakses `localStorage` secara langsung.
- **Boundary Guards:** Semua mutasi qty pada `cartStore` wajib menjaga invarian `1 <= quantity <= maxStock` (dan menolak produk dengan `stock <= 0`).
- **Selector Granular:** Gunakan selector Zustand (misal `useCartStore((s) => s.items)`) agar re-render minimal.

### 3.2 API & Error Handling
- Semua panggilan HTTP dipusatkan di `src/api/` dengan typed `ApiError` yang memisahkan:
  - Field validation errors (`422`) untuk ditampilkan inline di form.
  - Stock conflict errors (`409`) untuk memicu sinkronisasi stok & banner recovery di checkout.
  - Network/server errors (`500` / offline) untuk ditampilkan dengan aksi retry.
- Cegah *double submit* pada seluruh tombol mutasi (Checkout, Simpan Produk, Hapus Produk) dengan state `isSubmitting`.

### 3.3 UI/UX & Kualitas Web
- Ikuti seluruh token warna, tipografi, spacing, dan 5 UX Laws di [Design.md](./Design.md).
- Semua angka harga IDR wajib melewati helper tunggal `formatIDR(amount)` (`Intl.NumberFormat('id-ID', ...)` + `tabular-nums`).
- Semua `<img>` produk wajib menggunakan komponen `ProductImage` (rasio `4:3`, fallback `onError`, lazy-loading).
- Seluruh tombol interaktif wajib memenuhi ukuran minimal `44×44px` serta memiliki `aria-label` bila berupa ikon.

---

## 4. Git & Dokumentasi
- Gunakan pesan commit ringkas berformat konvensional: `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- Setelah menyelesaikan satu fase di [TASK.md](./TASK.md), centang progres dan catat pencapaian penting di [CHANGELOG.md](./CHANGELOG.md).
- Sebelum menyerahkan proyek, jalankan verifikasi akhir: `php artisan test`, `npm run typecheck` / `tsc --noEmit`, `npm run build`, serta uji manual seluruh alur Customer & Admin.
