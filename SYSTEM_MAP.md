# SYSTEM_MAP.md — HiMeal Food Ordering App

## Project Summary

**Tujuan:** Web app pemesanan makanan sehat (HiMeal) di Purwokerto — order online, pembayaran QRIS, tracking pesanan, notifikasi Telegram ke owner.

**Tech Stack:**
- Runtime: Node.js 20 (Docker bookworm-slim)
- Framework: Next.js 16 App Router (TypeScript, Tailwind CSS v4)
- Database: SQLite via better-sqlite3 (WAL mode, file: `data/orders.db`)
- Payment: Atlantic H2H QRIS API (`atlantich2h.com`)
- Maps: Google Maps embed (iframe), OpenRouteService (geocode + routing)
- Notifications: Telegram Bot API (HTML parse_mode)
- QR: qrcode.react (render dari qr_string)
- Toast: sonner
- Deploy: Dokploy (Docker standalone) di `168.144.75.119`, domain `himeal.juhuw.store`

**Arsitektur:** Next.js App Router monolith — client pages + server API routes + SQLite. Tidak ada ORM, query langsung via better-sqlite3 prepared statements. Admin panel password-protected via header `x-admin-key`.

---

## Core Logic Flow (Function-Level)

### Flow 1: Order & Payment (Critical Path)
```
[Client] page.tsx (fetch /api/products → render menu)
  → user pilih item, isi form, checkout
  → POST /api/order/route.ts [POST]
    → getActiveProducts() [db.ts] — validasi produk
    → calculateRoadDistance() [delivery.ts] → OpenRouteService API
    → calculateDeliveryFee() [delivery.ts]
    → createOrder() [db.ts] → INSERT orders + order_items
  → redirect /checkout → user confirm
  → POST /api/payment/create/route.ts [POST]
    → getOrder() [db.ts]
    → createQRIS() [atlantic.ts] → POST atlantich2h.com/deposit/create
    → updateOrderPayment() [db.ts]
    → buildNewOrderMessage() [telegram.ts]
    → sendTelegramNotification() [telegram.ts] → Telegram Bot API
  → redirect /payment/[orderId] → render QR (qrcode.react dari qr_string)
  → polling GET /api/payment/status/[id]/route.ts [GET] (setiap 5 detik)
    → getOrder() [db.ts]
    → checkPaymentStatus() [atlantic.ts] → POST atlantich2h.com/deposit/status
    → updateOrderPaymentStatus() [db.ts]
    → buildPaymentConfirmedMessage() [telegram.ts] → Telegram
  → on success → redirect /order/[orderId] (tracking page)
```

### Flow 2: Order Tracking
```
[Client] /order/[orderId]/page.tsx
  → GET /api/order/[id]/route.ts [GET]
    → getOrder() [db.ts]
  → render OrderTracker (status stepper)
  → polling setiap 10 detik
  → WhatsAppButton → wa.me/6287777527426
```

### Flow 3: Admin Panel
```
[Client] /admin/page.tsx → login (password → sessionStorage)
  → /admin/dashboard/page.tsx
    → GET /api/admin/products [validateAdmin] → getAllProducts() [db.ts]
    → GET /api/admin/orders [validateAdmin] → getAllOrders() [db.ts]
    → PATCH /api/admin/orders/[id] [validateAdmin]
      → updateOrderStatus() [db.ts]
      → buildStatusChangeMessage() [telegram.ts] → Telegram
  → /admin/products/new → POST /api/admin/products → createProduct() [db.ts]
  → /admin/products/[id]/edit → PATCH/DELETE /api/admin/products/[id] → updateProduct()/deleteProduct() [db.ts]
```

### Flow 4: Maps & Delivery
```
[Client] DeliveryMap.tsx
  → opsi 1: Tempel Link Google Maps → POST /api/maps/resolve/route.ts
    → fetch(shortLink, redirect:follow) → extractCoords(finalUrl)
  → opsi 2: GPS (navigator.geolocation, butuh HTTPS)
  → koordinat → calculateRoadDistance() [delivery.ts]
    → GET api.openrouteservice.org/v2/directions/driving-car
  → calculateDeliveryFee() [delivery.ts]
  → Google Maps embed iframe (gratis, no API key)
```

---

## Clean Tree

```
himeal-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx                          # Root layout (Manrope+Inter font, Toaster, Material Symbols)
│   │   ├── page.tsx                            # Landing: menu + form + cart (client component)
│   │   ├── globals.css                         # Stitch "Botanical Vault" dark green theme
│   │   ├── checkout/page.tsx                   # Checkout summary + bayar button
│   │   ├── payment/[orderId]/page.tsx          # QRIS QR code + countdown + polling
│   │   ├── order/[orderId]/page.tsx            # Order tracking + stepper + WhatsApp
│   │   ├── admin/
│   │   │   ├── page.tsx                        # Admin login
│   │   │   ├── dashboard/page.tsx              # Admin dashboard (menu + pesanan tabs)
│   │   │   └── products/
│   │   │       ├── new/page.tsx                # Tambah produk
│   │   │       └── [id]/edit/page.tsx          # Edit produk
│   │   └── api/
│   │       ├── products/route.ts               # GET public products
│   │       ├── order/
│   │       │   ├── route.ts                    # POST create order
│   │       │   └── [id]/
│   │       │       ├── route.ts                # GET order, PATCH update status
│   │       │       └── cancel/route.ts         # POST cancel order
│   │       ├── payment/
│   │       │   ├── create/route.ts             # POST create QRIS
│   │       │   └── status/[id]/route.ts        # GET poll payment status
│   │       ├── maps/resolve/route.ts           # POST resolve short Google Maps link
│   │       └── admin/
│   │           ├── products/
│   │           │   ├── route.ts                # GET all, POST create
│   │           │   └── [id]/route.ts           # PATCH update, DELETE
│   │           └── orders/
│   │               ├── route.ts                # GET all orders
│   │               └── [id]/route.ts           # PATCH update status
│   ├── components/
│   │   ├── MenuCard.tsx                        # Kartu produk (qty +/-, notes)
│   │   ├── AddressSearch.tsx                   # ORS Geocode autocomplete
│   │   ├── DeliveryMap.tsx                     # Toggle maps: paste link / GPS + embed
│   │   ├── LeafletMap.tsx                      # Leaflet interactive map (legacy, masih ada)
│   │   ├── MapInner.tsx                        # Leaflet inner (legacy, masih ada)
│   │   ├── CartSummary.tsx                     # Floating cart bar + checkout
│   │   ├── PaymentQR.tsx                       # QR code render dari qr_string
│   │   ├── CountdownTimer.tsx                  # Countdown 15 menit payment
│   │   ├── OrderTracker.tsx                    # Vertical status stepper
│   │   └── WhatsAppButton.tsx                  # Inline WA button
│   └── lib/
│       ├── constants.ts                        # Config: origin coords, delivery fee, order status, types
│       ├── db.ts                               # SQLite singleton, schema, CRUD (orders, order_items, products)
│       ├── atlantic.ts                         # Atlantic H2H client (createQRIS, checkStatus, cancel)
│       ├── telegram.ts                         # Telegram Bot notification builder + sender
│       ├── delivery.ts                         # OpenRouteService road distance + fee calculation
│       └── admin.ts                            # Admin auth helper (validateAdmin)
├── data/                                       # SQLite DB file (runtime, gitignored)
├── public/                                     # Static assets
├── .env.local                                  # Environment variables (API keys, secrets)
├── Dockerfile                                  # Single-stage bookworm-slim, standalone output
├── next.config.ts                              # output:standalone, serverExternalPackages:better-sqlite3
└── package.json                                # Next.js 16, better-sqlite3, leaflet, qrcode.react, sonner, nanoid
```

---

## Module Map (The Chapters)

### Lib (Server-side Core)

| File | Fungsi Utama | Peran |
|---|---|---|
| `lib/db.ts` | `getDb()`, `createOrder()`, `getOrder()`, `updateOrderPayment()`, `updateOrderPaymentStatus()`, `updateOrderStatus()`, `getActiveProducts()`, `getAllProducts()`, `createProduct()`, `updateProduct()`, `deleteProduct()`, `seedDefaultProducts()`, `getAllOrders()`, `getOrderQueue()` | SQLite singleton + semua CRUD operations |
| `lib/atlantic.ts` | `createQRIS()`, `checkPaymentStatus()`, `cancelPayment()` | Client untuk Atlantic H2H QRIS payment API |
| `lib/telegram.ts` | `sendTelegramNotification()`, `buildNewOrderMessage()`, `buildPaymentConfirmedMessage()`, `buildStatusChangeMessage()` | Builder + sender notifikasi Telegram |
| `lib/delivery.ts` | `calculateRoadDistance()`, `calculateDeliveryFee()` | Hitung jarak jalan (ORS) + ongkir model GoFood |
| `lib/constants.ts` | `HIMEAL_ORIGIN`, `DELIVERY_CONFIG`, `ORDER_STATUS`, `MenuItem`, `OrderType`, `formatCurrency()` | Konstanta, tipe, config |
| `lib/admin.ts` | `validateAdmin()` | Auth middleware admin (cek header x-admin-key) |

### API Routes

| Route | Method | Fungsi |
|---|---|---|
| `/api/products` | GET | List produk aktif (public storefront) |
| `/api/order` | POST | Buat order baru (validasi produk, hitung ongkir) |
| `/api/order/[id]` | GET, PATCH | Ambil detail order / update status |
| `/api/order/[id]/cancel` | POST | Batalkan order + cancel payment di Atlantic |
| `/api/payment/create` | POST | Buat QRIS payment via Atlantic H2H |
| `/api/payment/status/[id]` | GET | Poll status pembayaran |
| `/api/maps/resolve` | POST | Resolve short Google Maps link → koordinat |
| `/api/admin/products` | GET, POST | Admin: list semua / tambah produk |
| `/api/admin/products/[id]` | PATCH, DELETE | Admin: edit / hapus produk |
| `/api/admin/orders` | GET | Admin: list semua order |
| `/api/admin/orders/[id]` | PATCH | Admin: update status order |

### Components (Client-side)

| File | Props Utama | Peran |
|---|---|---|
| `MenuCard.tsx` | item, quantity, notes, onQuantityChange, onNotesChange | Kartu produk dengan qty selector + notes |
| `AddressSearch.tsx` | value, onChange(addr, lat, lng) | ORS Geocode autocomplete input |
| `DeliveryMap.tsx` | onLocationSelect, onLocationClear, selectedLat/Lng | Toggle maps: paste link / GPS + Google Maps embed |
| `CartSummary.tsx` | items, subtotal, deliveryFee, onCheckout, isLoading | Floating cart bar bawah layar |
| `PaymentQR.tsx` | qrString, orderId, expiresAt | Render QR code dari string QRIS |
| `CountdownTimer.tsx` | expiresAt, onExpire | Countdown timer 15 menit |
| `OrderTracker.tsx` | currentStatus, estimatedMinutes | Vertical stepper 4 tahap |
| `WhatsAppButton.tsx` | message | Inline button wa.me |

---

## Data & Config

### Environment Variables (`.env.local`)
| Key | Tujuan |
|---|---|
| `ATLANTIC_API_KEY` | API key Atlantic H2H payment |
| `ATLANTIC_BASE_URL` | Base URL Atlantic H2H (`https://atlantich2h.com`) |
| `TELEGRAM_BOT_TOKEN` | Token bot Telegram untuk notifikasi |
| `TELEGRAM_CHAT_ID` | Chat ID grup Telegram tujuan |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Nomor WA HiMeal (client-side) |
| `NEXT_PUBLIC_HIMEAL_LAT/LNG` | Koordinat HiMeal (client-side) |
| `ORS_API_KEY` | API key OpenRouteService (geocode + routing) |
| `ADMIN_PASSWORD` | Password admin panel (default: `himeal2026`) |

### Database Schema (SQLite — `data/orders.db`)

**Tabel `orders`**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT PK | nanoid(10) |
| customer_name | TEXT | Nama pemesan |
| customer_phone | TEXT | No WA |
| customer_address | TEXT | Alamat lengkap |
| customer_lat/lng | REAL nullable | Koordinat (opsional) |
| address_notes | TEXT nullable | Catatan alamat |
| distance_km | REAL | Jarak via jalan (km) |
| delivery_fee | INTEGER | Ongkir (Rp) |
| subtotal | INTEGER | Subtotal item (Rp) |
| total | INTEGER | Total bayar (Rp) |
| payment_id | TEXT nullable | ID dari Atlantic H2H |
| payment_status | TEXT | pending / success / expired |
| order_status | TEXT | pending_payment / confirmed / preparing / delivering / delivered / cancelled |
| qr_string | TEXT nullable | Raw QRIS string |
| expires_at | TEXT nullable | Waktu expired payment |
| paid_at | TEXT nullable | Waktu bayar |

**Tabel `order_items`**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK AUTO | - |
| order_id | TEXT FK→orders | - |
| product_id | TEXT | ID produk |
| product_name | TEXT | Nama (snapshot saat order) |
| price | INTEGER | Harga satuan (snapshot) |
| quantity | INTEGER | Jumlah |
| notes | TEXT nullable | Catatan per item |

**Tabel `products`**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT PK | nanoid |
| name | TEXT | Nama produk |
| price | INTEGER | Harga (Rp) |
| description | TEXT | Deskripsi |
| image | TEXT | URL foto |
| is_active | INTEGER | 1=aktif, 0=hidden |
| sort_order | INTEGER | Urutan tampil |

**Indexes:** `idx_orders_status`, `idx_orders_payment`, `idx_order_items_order`, `idx_products_active`

**Seed:** `seedDefaultProducts()` auto-insert 2 produk default jika tabel kosong.

**Migration:** Tidak ada migration system — schema di-create via `CREATE TABLE IF NOT EXISTS` di `getDb()`.

### Artifacts Runtime
- `data/orders.db` — SQLite database (WAL mode)
- `data/orders.db-shm`, `data/orders.db-wal` — WAL files

---

## External Integrations

| Service | Base URL | Modul Pemanggil | Tujuan |
|---|---|---|---|
| Atlantic H2H | `https://atlantich2h.com` | `lib/atlantic.ts` | QRIS payment (create, status, cancel) |
| Telegram Bot API | `https://api.telegram.org/bot{token}` | `lib/telegram.ts` | Notifikasi order ke grup |
| OpenRouteService | `https://api.openrouteservice.org` | `lib/delivery.ts`, `components/AddressSearch.tsx` | Road distance + geocode autocomplete |
| Google Maps Embed | `https://maps.google.com/maps?q=...&output=embed` | `components/DeliveryMap.tsx`, `app/page.tsx` | Embed peta (iframe, gratis) |
| Google Maps Redirect | `https://maps.app.goo.gl/*` | `api/maps/resolve/route.ts` | Resolve short link → koordinat |
| Nominatim (legacy) | `https://nominatim.openstreetmap.org` | Tidak dipakai lagi | Diganti ORS Geocode |

---

## Risks / Blind Spots

| Area | Risiko | Catatan |
|---|---|---|
| `LeafletMap.tsx` + `MapInner.tsx` | Dead code | Masih ada di repo tapi tidak dipakai oleh DeliveryMap.tsx saat ini. Bisa dihapus. |
| Admin auth | Weak security | Hanya password di header, tidak ada session/JWT. Cukup untuk MVP. |
| SQLite concurrency | Write contention | WAL mode membantu, tapi high concurrent writes bisa bottleneck. Cukup untuk volume kecil. |
| Atlantic H2H | Tidak ada webhook/callback | Payment status via polling (5 detik). Jika server down saat payment success, status bisa missed. |
| DB migration | Tidak ada versioning | Schema change = hapus DB + redeploy. Tidak ada migration tool. |
| HTTPS requirement | GPS blocked di HTTP | GPS (navigator.geolocation) butuh HTTPS. Domain `himeal.juhuw.store` sudah HTTPS via Cloudflare + Let's Encrypt. |
| Google Maps embed | Short link resolve | `maps.app.goo.gl` di-resolve server-side. Jika Google ubah redirect behavior, bisa break. |
| Ongkir calculation | ORS dependency | Jika OpenRouteService down, order dengan titik lokasi akan gagal (no fallback). |
| Product images | External URLs | Foto produk pakai URL eksternal (Unsplash). Jika URL mati, gambar hilang. |
