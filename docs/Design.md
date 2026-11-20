# Design System & UI/UX Specification — MiniShop

**Aesthetic Direction:** *Editorial Warm Minimalism* — terinspirasi dari toko ritel kurasi modern (bersih, taktil, fotografi produk menjadi pusat perhatian, kontras tipografi tajam, nol dekorasi generik).  
**Surface Modes:**
- **Customer Storefront (`/`):** *Operate + Subtle Persuade* — cepat dipindai, tenang, fokus pada foto produk, harga, stok, dan CTA yang jelas.
- **Admin Dashboard (`/admin`):** *Pure Operate* — kerapatan tabel proporsional, status stok terbaca dalam satu lirikan, aksi CRUD aman dan deterministik.

---

## 1. Color Tokens

Menolak tema "generic AI purple-blue gradient". MiniShop memakai kanvas kertas hangat (*warm alabaster*) dengan tinta arang pekat dan satu warna aksen *vermilion-terracotta* yang terinspirasi energi ritel modern dan identitas visual Roketin tanpa terasa agresif.

| Token | Hex | Kegunaan |
|---|---|---|
| `--bg-canvas` | `#FAF9F6` | Latar utama halaman storefront & admin |
| `--bg-surface` | `#FFFFFF` | Kartu produk, modal, drawer, tabel admin |
| `--bg-subtle` | `#F3F1EC` | Latar gambar produk, input search, header tabel |
| `--border-hairline` | `#E6E2DA` | Garis tepi kartu, divider, border tabel |
| `--border-strong` | `#CFC9BD` | Border hover & focus sekunder |
| `--text-primary` | `#161614` | Judul, nama produk, angka harga utama |
| `--text-secondary` | `#57534E` | Deskripsi singkat, metadata, label sekunder |
| `--text-muted` | `#8A847C` | Placeholder, caption, teks disabled |
| `--accent-primary` | `#D94436` | **Satu-satunya** aksen focal CTA utama (Add to Cart fokus / Checkout / Simpan) |
| `--accent-primary-hover` | `#BD3326` | Hover state tombol primer |
| `--accent-soft` | `#FDF0EE` | Background highlight pill aktif / badge lembut |
| `--status-success` | `#16794F` | Badge stok tersedia & status konfirmasi Order Berhasil |
| `--status-success-bg` | `#EBF7F1` | Latar badge sukses |
| `--status-warning` | `#A65E00` | Badge stok menipis (`1 <= stock <= 3`) |
| `--status-warning-bg` | `#FEF5E6` | Latar badge stok menipis |
| `--status-danger` | `#B91C1C` | Badge "Stok Habis", validasi error, tombol hapus konfirmasi |
| `--status-danger-bg` | `#FEECEC` | Latar badge stok habis / error banner |

> **Kontras WCAG 2.2 AA:** Semua teks primer (`#161614` di `#FFFFFF` = 17.9:1, di `#FAF9F6` = 17.0:1), teks sekunder (`#57534E` di `#FFFFFF` = 7.6:1), serta tombol aksen (`#FFFFFF` di `#D94436` = 4.65:1) memenuhi standar kontras minimum `>= 4.5:1`.

---

## 2. Typography

| Role | Font Family | Weight | Scale & Tracking | Penggunaan |
|---|---|---|---|---|
| **Display / Headings** | `Plus Jakarta Sans` | 600, 700 | `24px–32px`, `-0.025em` | Judul halaman, judul modal, headline konfirmasi order |
| **UI / Body** | `Inter` | 400, 500, 600 | `14px–16px`, `line-height: 1.5` | Nama produk, deskripsi, form label, tombol, tabel |
| **Numeric / Code** | `JetBrains Mono` (atau `tabular-nums` pada `Plus Jakarta Sans`) | 500, 600 | `13px–18px`, `font-variant-numeric: tabular-nums` | Semua harga IDR (`Rp 1.299.000`), jumlah stok, qty stepper, dan `ORD-20261120-0001` agar kolom angka sejajar presisi |

---

## 3. Spacing, Radius & Motion Tokens

- **Spacing Scale (4px base grid):**
  - Inner component gap (Proximity tight): `4px` (`gap-1`), `8px` (`gap-2`), `12px` (`gap-3`).
  - Card padding: `16px` (`p-4`) mobile, `20px` (`p-5`) desktop.
  - Outer functional section gap (Proximity separation): `24px` (`gap-6`), `32px` (`gap-8`), `40px` (`gap-10`).
- **Border Radius:**
  - Inputs, buttons, stepper: `10px` (`rounded-[10px]`).
  - Product cards, modals, tables: `14px` (`rounded-[14px]`).
  - Category pills & status badges: `9999px` (`rounded-full`).
- **Elevation:** Utamakan `1px solid var(--border-hairline)` + shadow super halus (`0 1px 2px rgba(22,22,20,0.04)`); hover kartu produk mengangkat halus (`0 8px 24px rgba(22,22,20,0.06)`).
- **Motion:**
  - Kurva: `cubic-bezier(0.22, 1, 0.36, 1)` durasi `180ms–240ms`.
  - Slide-over Cart Drawer & Modal backdrop memakai transisi `transform` dan `opacity` saja (GPU-accelerated, nol layout thrashing).
  - Hormati `@media (prefers-reduced-motion: reduce)`.

---

## 4. Implementasi Wajib 5 UX Laws

1. **Fitts's Law (Target Size & Reach):**
   - Seluruh tombol interaktif primer, tombol `+`/`-` qty stepper, tombol hapus item, dan pill filter memiliki area sentuh minimal **`44×44px`** (`min-h-[44px] min-w-[44px]`).
   - Pada tampilan mobile, tombol buka Keranjang / Checkout diposisikan mudah dijangkau ibu jari (sticky top header + sticky bottom checkout CTA di dalam drawer).
2. **Hick's Law (Cognitive Load):**
   - Navigasi utama header dibatasi tepat **3 elemen**: Brand/Katalog (`/`), link **Admin** (`/admin`), dan tombol **Keranjang** (dengan badge counter).
   - Filter kategori menampilkan maksimal 4–5 pill kategori bersih (`Semua`, `Elektronik`, `Aksesoris`, `Fashion`, `Rumah Tangga`).
   - Detail lengkap produk, form checkout, dan detail order menggunakan *progressive disclosure* (modal/drawer terfokus) agar halaman utama tetap lapang.
3. **Jakob's Law (Familiar Mental Models):**
   - Storefront menggunakan pola e-commerce yang langsung dikenali: bar pencarian + pill kategori di atas, grid kartu produk `4:3`, Cart Drawer meluncur dari kanan, dan ikon keranjang di kanan atas.
   - Admin menggunakan pola tab bersih (**Produk** | **Order**) dengan tabel data, tombol **"Tambah Produk"** di kanan atas tabel, dan konfirmasi dialog sebelum penghapusan.
4. **Law of Proximity (Spatial Grouping):**
   - Di dalam kartu produk: kategori + nama + deskripsi dikelompokkan rapat (`gap-1.5`), dipisahkan ruang jelas (`mt-4 pt-3 border-t`) dari baris aksi harga + tombol beli.
   - Header filter/search dipisahkan `24px–32px` dari grid produk agar hierarki visual langsung terbaca.
5. **Von Restorff Effect (Visual Isolation):**
   - Pada setiap layar/modal hanya ada **satu tombol primer beraksen `#D94436`**:
     - Di Cart Drawer: hanya tombol **"Lanjut Checkout"**.
     - Di Checkout Modal: hanya tombol **"Buat Pesanan"**.
     - Di Admin Products: hanya tombol **"Tambah Produk"** (atau **"Simpan"** di dalam modal).
   - Tombol **"Tambah"** pada masing-masing kartu produk menggunakan permukaan netral gelap (`#161614` teks putih, hover `#D94436`) agar tidak menciptakan "lautan tombol merah" yang melelahkan mata, sekaligus membuat tombol checkout utama tetap dominan.

---

## 5. Spesifikasi Komponen & States

### Iconography
- Gunakan ikon autentik dari `lucide-react` (konsisten stroke `1.75px`, ukuran `16px–20px`) — hindari menulis path SVG manual generik.

### States Wajib untuk Setiap Permukaan
| Permukaan | Loading State | Empty State | Error State |
|---|---|---|---|
| **Catalog Grid** | 8 *skeleton cards* dengan tinggi identik kartu asli (`CLS = 0`) | Ilustrasi ikon minimalis + teks "Tidak ada produk yang cocok" + tombol **Reset Filter** | Banner error dengan tombol **Coba Lagi** |
| **Cart Drawer** | — (instan dari Zustand) | Ikon keranjang + "Keranjang masih kosong" + tombol **Mulai Belanja** | Banner konflik stok per item (`409`) dengan highlight item bermasalah |
| **Admin Tables** | Skeleton rows sesuai jumlah kolom | "Belum ada produk/order" + CTA relevan | Alert bar + tombol muat ulang |
| **Product Image** | Background `#F3F1EC` aspect `4:3` | Fallback SVG/ikon paket bersih saat URL gambar gagal dimuat (`onError`) | Preview form Admin menampilkan status "URL gambar tidak dapat dimuat" |

### Checklist Aksesibilitas (WCAG 2.2 AA) & Web Quality
- Fokus keyboard terlihat jelas (`focus-visible:ring-2 focus-visible:ring-[#D94436] focus-visible:ring-offset-2`).
- Modal & Drawer mendukung penutupan via tombol `Escape`, `role="dialog"`, `aria-modal="true"`, dan `aria-label` pada seluruh tombol berbasis ikon (`+`, `-`, hapus, tutup drawer).
- Semua `<img>` memiliki `alt` deskriptif, `loading="lazy"` (kecuali 4 kartu pertama *above-the-fold* untuk LCP optimal), dan atribut rasio `aspect-[4/3]` agar **CLS = 0**.
- Tidak ada horizontal overflow pada viewport mobile `375px` maupun desktop `1440px`.
