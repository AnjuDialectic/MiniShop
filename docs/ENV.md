# Environment Variables Specification — MiniShop

Dokumen ini mendefinisikan seluruh variabel lingkungan yang dibutuhkan untuk menjalankan MiniShop secara lokal maupun saat deployment ke cloud. **Jangan pernah melakukan commit file `.env` aktual ke repository.**

---

## 1. Local Database (SQLite Default — Tanpa Docker)

Secara default di environment lokal, backend menggunakan **SQLite** agar nol setup server eksternal. Laravel otomatis memakai file `backend/database/database.sqlite` saat `DB_CONNECTION=sqlite` dan `DB_DATABASE` dikosongkan/dikomentari.

---

## 2. Backend (`backend/.env.example`)

Salin menjadi `backend/.env`, lalu jalankan `php artisan key:generate`.

```env
APP_NAME=MiniShop
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000
APP_TIMEZONE=Asia/Jakarta

LOG_CHANNEL=stack
LOG_LEVEL=debug

# Local Database (SQLite — zero setup; Laravel uses database/database.sqlite automatically)
DB_CONNECTION=sqlite
# DB_DATABASE=

# Production / PostgreSQL (uncomment for PostgreSQL on Railway / Render / Neon / local)
# DB_CONNECTION=pgsql
# DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_DATABASE=minishop
# DB_USERNAME=minishop
# DB_PASSWORD=minishop_secret

# CORS — daftar origin frontend yang diizinkan (pisahkan koma jika lebih dari satu)
FRONTEND_URL=http://localhost:5173

# Cache & Session (stateless API — gunakan file/array agar minim dependensi eksternal)
CACHE_STORE=file
SESSION_DRIVER=array
QUEUE_CONNECTION=sync
```

### Variabel Wajib Backend di Production (Railway / Render)
| Variable | Contoh Production | Keterangan |
|---|---|---|
| `APP_ENV` | `production` | Menonaktifkan mode lokal |
| `APP_DEBUG` | `false` | Wajib `false` agar stack trace tidak bocor di response `500` |
| `APP_KEY` | `base64:...` | Hasil `php artisan key:generate --show` |
| `APP_URL` | `https://minishop-api.up.railway.app` | Base URL backend |
| `DB_CONNECTION` | `pgsql` | Driver PostgreSQL |
| `DATABASE_URL` | `postgresql://...` | Connection string otomatis dari Railway/Render/Neon |
| `FRONTEND_URL` | `https://minishop.vercel.app` | Origin frontend untuk kebijakan CORS |

---

## 3. Frontend (`frontend/.env.example`)

Salin menjadi `frontend/.env`.

```env
# Base URL Backend REST API (tanpa trailing slash)
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Variabel Wajib Frontend di Production (Vercel / Netlify)
| Variable | Contoh Production | Keterangan |
|---|---|---|
| `VITE_API_BASE_URL` | `https://minishop-api.up.railway.app/api/v1` | Endpoint REST API produksi |

---

## 4. Database Testing (`backend/phpunit.xml`)

Untuk menjaga database development (`backend/database/database.sqlite`) tidak terhapus saat menjalankan `php artisan test`:
- `backend/phpunit.xml` secara default memakai SQLite `:memory:` (`DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`) sehingga seluruh Feature Tests berjalan terisolasi dan cepat.
- Untuk pengujian paritas PostgreSQL sebelum deploy produksi, siapkan database `minishop_test` terpisah dan jalankan test dengan override env `DB_CONNECTION=pgsql`.
