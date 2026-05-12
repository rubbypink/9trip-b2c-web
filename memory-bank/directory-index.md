# Directory Index: 9Trip B2C

> **Last updated:** 12/05/2026
> 
> **Mục đích:** Tìm file nhanh theo mục đích. Mỗi thư mục mô tả ngắn gọn nội dung.

---

## Cấu trúc Tổng quan

```
tripphuquoc-db-fs/
├── src/                    # Source code chính (Next.js)
├── functions/              # Firebase Cloud Functions
├── packages/shared/        # Shared code (@9trip/shared)
├── public/images/           # Static assets (favicon, social icons)
├── memory-bank/             # Project knowledge base (6 files)
├── .github/instructions/    # System rules cho agents
├── .agents/skills/          # Agent skills
└── Config files (root)      # package.json, next.config.mjs, jsconfig.json, etc.
```

---

## `packages/shared/` — Shared Code (@9trip/shared)

Mã dùng chung giữa Next.js và Cloud Functions. Không trùng lặp.

| File | Mục đích |
|------|-----------|
| `package.json` | Package config với subpath exports |
| `index.js` | Barrel export |
| `constants.js` | SITE, COMPANY, SOCIAL, PAGE_SIZE, BLUR_DATA_URL |
| `utils.js` | formatCurrency, formatDate, slugify, cn, v.v. |
| `logger.js` | Logger utility |
| `error-utils.js` | Error handling helpers |
| `rateLabels.js` | Rate type definitions |
| `env.js` | Environment variable resolution helpers |
| `firebase/admin-init.js` | Firebase Admin SDK initialization factory |
| `firebase/admin-helpers.js` | serializeSnap, serializeDocs, generateNextId |
| `firestore/collections.js` | Collection name constants |
| `firestore.rules` | Firestore security rules |
| `storage/paths.js` | Storage path builders |
| `email/templates.js` | Email HTML templates |
| `email/service.js` | SMTP transporter + send helpers |
| `payments/helpers.js` | PaymentHelper (sortObject, generateHmac, etc.) |
| `schemas/` | Firestore collection schemas (bookings, tours, hotels, etc.) |

---

## `src/app/` — Next.js App Router (SERVER ROUTING ONLY)

Mỗi route là 1 thư mục với `page.js` (Server Component). Client components đặt ở `src/components/`.

| Route | Mục đích | Strategy |
|---|---|---|
| `page.js` | Home page | SSR |
| `layout.js` | Root layout (metadata, providers) | — |
| `loading.js` | Global loading skeleton | — |
| `error.js` | Global error boundary (client) | — |
| `not-found.js` | 404 page | — |
| `proxy.js` | Auth middleware (Next.js 16) | — |
| `robots.txt/route.js` | Dynamic robots.txt | — |
| `sitemap.xml/route.js` | Dynamic sitemap từ Firestore | — |
| `tours/` | Tour listing + detail (`[slug]/page.js`) | ISR 1h |
| `hotels/` | Hotel listing + detail (`[slug]/page.js`) | ISR 1h |
| `activities/` | Activity listing + detail (`[slug]/page.js`) | ISR 1h |
| `cars/` | Car listing + detail | ISR 1h |
| `rentals/` | Rental listing + detail | ISR 1h |
| `checkout/page.js` | Thin server wrapper → CheckoutPageClient | CSR |
| `account/` | Protected routes (AuthGuard + sidebar) | CSR |
| `cart/`, `login/`, `register/`, `search/` | Utility pages | — |
| `booking/confirmation/[id]/` | Booking confirmation | — |
| `api/` | API routes (payments, cart, contact, webhooks) | — |
| `webhooks/` | Payment + ERP webhook handlers | — |

## `src/components/` — Tất cả Client/Shared Components (*.jsx)

| Thư mục | Nội dung chính |
|---|---|
| `home/` | HeroBanner, FeaturedHotelsServer, FlashDealsServer, SearchTabs |
| `tours/` | TourDetailClient, TourCard, TourBookingWidget, TourDetail/, TourFilters |
| `hotels/` | HotelDetailClient, HotelFilters, HotelHeader, HotelDetail/, HotelBookingWidget |
| `activities/` | ActivityDetailClient, ActivityFilters, ActivityBookingWidget |
| `cars/` | CarFilters, CarBookingWidget |
| `checkout/` | CheckoutPageClient, CustomerForm, CheckOutPayment, CouponInput |
| `cart/` | CartItem, CartSummary |
| `booking/` | ConfirmationClient |
| `auth/` | AuthGuard, AuthWrapper, LoginPopup |
| `account/` | BookingsPageClient, WishlistPageClient, ProfilePageClient |
| `layout/` | Header, Footer, Breadcrumb |
| `reviews/` | WriteReviewForm, ReviewCard |
| `shared/` | Badge, LoadingSpinner, EmptyState, StarRating, PriceDisplay, GoogleMap, ImageCarousel, Pagination, SearchFormPopup, GalleryWithLightbox |

## `src/lib/` — Next.js-specific Utilities

Shared code (constants, utils, logger, email, etc.) đã chuyển sang `@9trip/shared`. Chỉ còn lại Next.js-specific code:

| File | Mục đích |
|------|-----------|
| `firebase-admin.js` | Thin wrapper: initFirebaseAdmin({ useLazyProxy: true }) |
| `firestore-admin.js` | Collection refs + query functions (Next.js-specific) |
| `firebase.js` | Client SDK initialization |
| `firebase-auth.js` | Client auth (browser-only) |
| `firestore.js` | Client Firestore SDK (browser-only) |
| `storage.js` | Client Storage SDK (browser-only) |
| `storage-admin.js` | Admin Storage (signed URLs) |
| `auth.js` | React Auth context (AuthProvider) |
| `cart.js` | Zustand cart store |
| `mockData.js` | Dev mock data |
| `account-nav.js` | Account navigation config |
| `payments/payment.js` | PaymentService (local, uses @9trip/shared/payments/helpers) |
| `payments/paymentHelper.js` | Payment gateway helpers (local) |
| `payments/utils.js` | Payment utility functions |
| `agents/registry.js` | Agent skill/flow registry |

## `src/hooks/` — Custom React Hooks

| File | Mục đích |
|---|---|
| `useBooking.js` | Booking flow logic (tour/activity) |
| `useHotelBooking.js` | Hotel booking flow logic |

## `src/stores/` — State Management Stores

| File | Mục đích |
|---|---|
| `listing-store.js` | Zustand store cho listing page state (filters, sort) |
| `theme-store.js` | Theme store for project |

## `src/scripts/` — Admin/Utility Scripts

Dev & migration scripts (audit, seed, diagnostic).

## `src/styles/` — Global Styles

| File | Mục đích |
|------|-----------|
| `globals.css` | Tailwind CSS v4 imports + global styles |

---

## `functions/src/lib/` — Functions-specific Utilities

Shared code đã chuyển sang `@9trip/shared`. Chỉ còn lại Functions-specific code:

| File | Mục đích |
|------|-----------|
| `firebase-admin.js` | Thin wrapper: initFirebaseAdmin({ useLazyProxy: false }) |
| `firestore-admin.js` | Collection refs + query functions (Functions-specific) |
| `payments/payment.js` | PaymentService class (uses @9trip/shared/payments/helpers) |
| `payments/utils.js` | Payment utility functions |
| `agents/registry.js` | Agent skill/flow registry |

---

## Tìm file theo mục đích

**"Tôi cần sửa trang chi tiết tour"** → `src/app/tours/[slug]/page.js` + `src/components/tours/TourDetailClient.jsx`

**"Tôi cần sửa data fetching (server-side)"** → `src/lib/firestore-admin.js` (Admin SDK)

**"Tôi cần sửa data fetching (client-side)"** → `src/lib/firestore.js` (Client SDK)

**"Tôi cần thêm payment gateway"** → `src/lib/payments/payment.js` + `src/app/webhooks/payment/route.js`

**"Tôi cần sửa auth flow"** → `src/lib/auth.js` + `src/lib/firebase-auth.js` + `src/proxy.js` + `src/components/auth/`

**"Tôi cần sửa SEO metadata"** → Server `page.js` files + `src/app/layout.js`

**"Tôi cần sửa cart logic"** → `src/lib/cart.js` + `src/components/cart/`

**"Tôi cần thêm shared component"** → `src/components/shared/`

**"Tôi cần sửa header/footer"** → `src/components/layout/`

**"Tôi cần thêm API endpoint"** → `src/app/api/` hoặc `src/app/webhooks/`