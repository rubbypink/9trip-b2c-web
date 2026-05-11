# Directory Index: 9Trip B2C

> **Last updated:** 11/05/2026
> 
> **Mục đích:** Tìm file nhanh theo mục đích. Mỗi thư mục mô tả ngắn gọn nội dung.

---

## Cấu trúc Tổng quan

```
tripphuquoc-db-fs/
├── src/                    # Source code chính
├── public/images/           # Static assets (favicon, social icons)
├── memory-bank/             # Project knowledge base (6 files)
├── .github/instructions/    # System rules cho agents
├── .agents/skills/          # Agent skills
└── Config files (root)      # package.json, next.config.mjs, jsconfig.json, etc.
```

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

## `src/lib/` — Libraries, Utils, Config (KHÔNG React components)

| File | Mục đích |
|---|---|
| `firebase.js` | Client SDK init |
| `firebase-admin.js` | Admin SDK init (server-side only) |
| `firestore.js` | Client SDK data access layer |
| `firestore-admin.js` | Admin SDK data access layer (server pages + webhooks) |
| `storage.js` | Client Storage helpers |
| `storage-admin.js` | Admin Storage helpers (signed URLs) |
| `auth.js` | AuthProvider + useAuth hook |
| `firebase-auth.js` | Auth utilities (login, register, social auth) |
| `cart.js` | Zustand cart store (persist to localStorage) |
| `constants.js` | Site constants (SITE, COMPANY, SOCIAL, PAGE_SIZE) |
| `utils.js` | General utilities |
| `error-utils.js` | Error handling helpers |
| `email.js` + `email-templates.js` | Email sending |
| `account-nav.js` | Account sidebar navigation config |
| `mockData.js` | Dev seed data |
| `logger.js` | Logging utility |
| `payments/payment.js` | Payment gateway main logic |
| `payments/paymentHelper.js` | Payment gateway helpers |
| `payments/utils.js` | Payment utility functions |

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
|---|---|
| `globals.css` | Tailwind CSS v4 imports + global styles |

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