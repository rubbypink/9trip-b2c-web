# System Patterns: 9Trip B2C

> **Last updated:** 05/05/2026

---

## 1. Kiến trúc Tổng thể

```
┌──────────────────────────────────────────────────────────────────────┐
│                         ERP NỘI BỘ (CMS)                             │
│  - Quản lý Tours, Hotels, Rooms, Activities, Cars, Locations         │
│  - Quản lý Bookings, Coupons, Settings                               │
│  - Quản lý Users (CRM)                                               │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ Đồng bộ 1 chiều (Batch/Realtime)
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      FIREBASE (BaaS)                                  │
│  ┌─────────────────────┐  ┌──────────────────────┐                   │
│  │ Firestore (DB)       │  │ Firebase Auth         │                   │
│  │ - tours (read-only)  │  │ - Email/Password       │                   │
│  │ - hotels (read-only) │  │ - Google Sign-In       │                   │
│  │ - rooms (read-only)  │  │ - Facebook Sign-In     │                   │
│  │ - activities (r/o)   │  └──────────────────────┘                   │
│  │ - cars (read-only)   │  ┌──────────────────────┐                   │
│  │ - locations (r/o)   │  │ Firebase Storage      │                   │
│  │ - bookings (r/w)    │  │ - gallery images      │                   │
│  │ - reviews (r/w)      │  │ - avatars             │                   │
│  │ - users (r/w)        │  │ - review images       │                   │
│  │ - coupons (r/w)      │  └──────────────────────┘                   │
│  │ - notifications(r/w) │                                             │
│  │ - settings (r/o)     │                                             │
│  │ - inventory_holds    │                                             │
│  │   (r/w + TTL auto)   │                                             │
│  └─────────────────────┘                                             │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ Firebase SDK (Client v11 + Admin)
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      NEXT.JS 16 APP                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐│
│  │ Server        │  │ Client        │  │ API Routes                   ││
│  │ Components    │  │ Components    │  │ /api/payments/create         ││
│  │ (default)     │  │ ('use client')│  │ /api/cart/validate           ││
│  │ - Layout      │  │ - SearchForm  │  │ /api/contact                 ││
│  │ - Pages       │  │ - BookingForm │  │ /webhooks/payment (GET+POST) ││
│  │ - Metadata    │  │ - Filters     │  │ /webhooks/erp (GET+POST)     ││
│  │ - Server      │  │ - Cart        │  └──────────────────────────────┘│
│  │   Actions     │  │ - UserProfile │                                  │
│  └──────────────┘  └──────────────┘                                   │
└──────────────────────────────────────────────────────────────────────┘
```

## 2. ⚠️ Inventory Hold Pattern (QUAN TRỌNG)

Khi nhiều khách cùng đặt 1 tour/phòng, Inventory Hold với Firestore TTL chống overbooking:

```
[Khách click "Đặt ngay"]
  → [Kiểm tra availability: totalSlots - confirmedBookings - activeHolds]
  → Còn chỗ → [Tạo inventory_holds document với expiresAt = now + 10 phút]
  → Redirect Checkout → Timer 10 phút bắt đầu
  → Thành công → [Tạo Booking + Xóa Hold + ERP Sync]
  → Hết 10 phút → [Firestore TTL tự động xóa Hold]
  → Hủy → [Client gọi API xóa Hold hoặc TTL tự xóa]
```

## 3. ⚠️ Payment Webhook Pattern (QUAN TRỌNG)

Tất cả gateways dùng chung 1 handler `/webhooks/payment`:

```
[4 Gateways: Stripe, VNPay, MoMo, PayPal]
  → Mỗi gateway có verify signature riêng
  → Chuẩn hóa payload về format chung:
    { transactionId, bookingId, amount, currency, status, rawResponse }
  → 1. Cập nhật booking (paymentStatus = 'paid', bookingStatus = 'confirmed')
  → 2. Xóa inventory hold
  → 3. Gửi email xác nhận
  → 4. Trigger ERP sync
```

- **GET** `/webhooks/payment` — Return redirect cho VNPay/MoMo/PayPal
- **POST** `/webhooks/payment` — IPN callback + Stripe webhook

## 4. Data Fetching Strategy

| Route | Strategy | Lý do |
|---|---|---|
| `/` (Home) | SSR (no Suspense) | All async sections render directly in HTML for SEO |
| `/tours`, `/hotels`, `/activities`, `/cars`, `/rentals` | ISR (revalidate: 3600s) | Content rendered server-side |
| `/tours/[slug]`, `/activities/[slug]`, `/cars/[slug]`, `/rentals/[slug]` | ISR (revalidate: 3600s) | All tab content in HTML |
| `/hotels/[slug]` | ISR (revalidate: 3600s) | Hotel data changes infrequently |
| `/checkout` | CSR (protected) | Needs auth, cart state from client |
| `/account/*` | CSR (protected) | Dashboard cá nhân |

## 5. Component Architecture Pattern

```
Server Components (default — không có 'use client')
  ├── Layout components (Header, Footer, Breadcrumb)
  ├── Page components (thường thin wrapper → fetch data → pass xuống Client)
  └── Server-side data fetching (firestore-admin.js)

Client Components ('use client' — chỉ khi cần hooks/events)
  ├── Interactive components (SearchForm, BookingForm, Filters, Cart)
  ├── Feature components (TourDetailClient, HotelDetailClient, etc.)
  └── Auth components (AuthGuard, LoginPopup)
```

**Quy tắc:** Server Component là mặc định. Chỉ thêm `'use client'` ở level nhỏ nhất có thể (leaf components).

## 6. Cart State Management Pattern

Zustand + persist middleware:

```js
// src/lib/cart.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      couponDiscount: 0,
      addItem: (item) => set((state) => ({
        items: [...state.items, { ...item, cartItemId: Date.now().toString() }]
      })),
      removeItem: (cartItemId) => set((state) => ({
        items: state.items.filter(i => i.cartItemId !== cartItemId)
      })),
      getTotal: () => { /* subtotal - couponDiscount */ },
    }),
    { name: '9trip-cart' } // persist to localStorage
  )
);
```

## 7. React 19 Patterns

| Pattern | Usage |
|---|---|
| Server Components | **Mặc định** cho tất cả page/layout |
| Client Components | Thêm `'use client'` chỉ khi: state, event handlers, browser APIs |
| Server Actions | Form submit (booking, contact, review) |
| `useOptimistic` | Cart update, wishlist toggle — cập nhật UI ngay, revert nếu lỗi |
| `useFormStatus` | Loading state cho button submit form |
| `useActionState` | Form validation + error handling |
| Tab Pattern | Tất cả tab content render trong HTML + `data-tab-panel` + CSS `hidden` |
| `next/dynamic` | Chỉ dùng cho non-SEO-critical (GoogleMap) |

## 8. SEO Pattern

```js
// Server Component page.js
export async function generateMetadata({ params }) {
  const tour = await getTourBySlug(params.slug);
  return {
    title: `${tour.title} - 9Trip`,
    description: tour.excerpt,
    openGraph: { title: tour.title, description: tour.excerpt, images: [tour.featuredImage] },
  };
}

export async function generateStaticParams() {
  const slugs = await getTourSlugs();
  return slugs.map(slug => ({ slug }));
}

export const revalidate = 3600;
```

- **JSON-LD Schema.org** cho mọi trang chi tiết (Tour → TouristTrip, Hotel → Hotel, Car/Rental → Product)
- **Canonical URLs** trên tất cả trang
- **og:image + twitter:card** trên root layout + tất cả listing/detail pages
- **Sitemap** tự động từ Firestore (`/sitemap.xml`)
- **robots.txt** tự động (`/robots.txt`)

## 9. Firebase SDK Pattern

- **Server-side** (Server Components, API routes, webhooks): Dùng `firebase-admin.js` (Admin SDK)
  - Method chaining: `adminDb.collection('tours').where('slug', '==', slug).get()`
  - `serializeAdminDoc()` cho Timestamp → ISO, GeoPoint → {lat, lng}
- **Client-side** (Client Components, hooks): Dùng `firebase.js` (Client SDK)
  - Modular imports: `import { getDoc, doc } from 'firebase/firestore'`
- **Storage**: Server dùng `storage-admin.js` (`getSignedUrl()`), Client dùng `storage.js` (`getDownloadURL()`)

## 10. Auth & Route Protection Pattern

```
proxy.js (Next.js 16)
  → Kiểm tra cookie 'auth-session'
  → Redirect nếu chưa đăng nhập cho protected routes

AuthGuard.jsx (Client Component)
  → Double-check auth state từ AuthProvider
  → Hiển thị loading/error nếu cần

AuthProvider (src/lib/auth.js)
  → Firebase Auth state observer
  → Set/clear 'auth-session' cookie
```