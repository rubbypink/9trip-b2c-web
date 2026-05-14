# Progress: 9Trip B2C

> **Cập nhật lần cuối:** 04/05/2026  
> **Phiên bản:** 2.0.0  
> **Giai đoạn:** Phase 13 SEO & Performance Complete

---

## 1. Tổng quan Tiến độ

| Giai đoạn                          | Trạng thái  | Hoàn thành |
| ---------------------------------- | ----------- | ---------- |
| Phase 0: Khởi tạo                  | ✅ Xong     | 100%       |
| Phase 1: Auth                      | ✅ Xong     | 100%       |
| Phase 2: Home                      | ✅ Xong     | 100%       |
| Phase 3: Tours                     | ✅ Xong     | 100%       |
| Phase 4: Checkout                  | ✅ Xong     | 100%       |
| Phase 5: Account                   | ✅ Xong     | 100%       |
| Phase 6: Hotels (v1)               | ✅ Xong     | 100%       |
| Phase 7: Activities                | ✅ Xong     | 100%       |
| Phase 8: Cars                      | ✅ Xong     | 100%       |
| Phase 9: Rentals                   | ✅ Xong     | 100%       |
| Phase 10: SEO/Deploy               | ✅ Xong     | 100%       |
| **Phase 11: Hotels v4 Refactor**   | **✅ Xong** | **100%**   |
| **Phase 12: Hotels v4 UI & Cart**  | **✅ Xong** | **100%**   |
| **Phase 13: SEO & Performance**    | **✅ Xong** | **100%**   |
| **Phase 14: Admin SDK + Webhooks** | **✅ Xong** | **100%**   |
| **Bug Fix & Cleanup (05/2026)**    | **✅ Xong** | **100%**   |

---

## 2. Phase 0: Khởi tạo Nền tảng (✅ Hoàn thành)

| #   | Task                                  | Status | Ghi chú                                 |
| --- | ------------------------------------- | ------ | --------------------------------------- |
| 1   | Khởi tạo Next.js 16 project           | ✅     | `create-next-app` với App Router        |
| 2   | Cấu hình Tailwind CSS v4              | ✅     | `postcss.config.mjs` + `globals.css`    |
| 3   | Cấu hình ESLint                       | ✅     | `eslint.config.mjs`                     |
| 4   | Cấu hình jsconfig.json (path aliases) | ✅     | `@/*`, `@/components/*`...              |
| 5   | Cấu hình Firebase Web SDK v9+         | ✅     | File `.env.local` đã có Firebase keys   |
| 6   | Tạo cấu trúc thư mục `src/`           | ✅     | `app/`, `components/`, `lib/`, `hooks/` |
| 7   | Viết `docs/project_requirements.md`   | ✅     | Phân tích WordPress theme gốc           |
| 8   | Thiết lập `.clinerules`               | ✅     | Memory Bank framework                   |
| 9   | Khởi tạo Memory Bank (6 core files)   | ✅     | Đã tạo đủ 6 file                        |
| 10  | Tạo Firebase config & helpers         | ✅     | `src/lib/firebase.js`, `firestore.js`   |
| 11  | Tạo Auth context                      | ✅     | `src/lib/auth.js` + AuthProvider        |

---

## 3. Phase 1: Authentication (✅ Hoàn thành)

| #   | Task                        | Status | Ghi chú                                |
| --- | --------------------------- | ------ | -------------------------------------- |
| 1   | AuthProvider + useAuth hook | ✅     | `src/lib/auth.js`                      |
| 2   | AuthGuard component         | ✅     | `src/components/auth/AuthGuard.jsx`    |
| 3   | Login page (`/login`)       | ✅     | `src/app/login/page.js`                |
| 4   | Register page (`/register`) | ✅     | `src/app/register/page.js`             |
| 5   | Proxy bảo vệ route          | ✅     | `src/proxy.js` (Next.js 16 convention) |
| 6   | Navigation login/user menu  | ✅     | Đã tích hợp trong Header               |

---

## 4. Phase 2: Home Page (✅ Hoàn thành)

| #   | Task                                | Status | Ghi chú                                    |
| --- | ----------------------------------- | ------ | ------------------------------------------ |
| 1   | LoadingSpinner component            | ✅     | `src/components/shared/LoadingSpinner.jsx` |
| 2   | EmptyState component                | ✅     | `src/components/shared/EmptyState.jsx`     |
| 3   | TourCard component                  | ✅     | `src/components/tours/TourCard.jsx`        |
| 4   | StarRating component                | ✅     | `src/components/shared/StarRating.jsx`     |
| 5   | SearchTabs (Server container)       | ✅     | `src/components/home/SearchTabs.jsx`       |
| 6   | SearchTabsClient (Client Component) | ✅     | `src/components/home/SearchTabsClient.jsx` |
| 7   | HeroBanner                          | ✅     | `src/components/home/HeroBanner.jsx`       |
| 8   | FeaturedTours                       | ✅     | `src/components/home/FeaturedTours.jsx`    |
| 9   | src/app/page.js (Home Page)         | ✅     |
| 10  | FeaturedDestinations                | ✅     |
| 11  | WhyChooseUs / TrustBadges           | ✅     |
| 12  | Testimonials / ReviewsCarousel      | ✅     |
| 13  | BlogPosts / LatestNews              | ✅     |

---

## 5. Phase 3: Tour Pages (✅ Hoàn thành)

| #   | Task                                | Status | Ghi chú                                              |
| --- | ----------------------------------- | ------ | ---------------------------------------------------- |
| 1   | Tour listing page (`/tours`)        | ✅     | `src/app/tours/page.js` (SSR+ISR)                    |
| 2   | TourFilters sidebar                 | ✅     | `src/components/tours/TourFilters.jsx`               |
| 3   | TourList component                  | ✅     | `src/components/tours/TourList.jsx`                  |
| 4   | SearchFormPopup                     | ✅     | `src/components/shared/SearchFormPopup.jsx`          |
| 5   | Tour detail page (`/tours/[slug]`)  | ✅     | `src/app/tours/[slug]/page.js` (ISR)                 |
| 6   | TourHeader (gallery, price, rating) | ✅     | `src/components/tours/TourDetail/TourHeader.jsx`     |
| 7   | TourDetailClient (tabs container)   | ✅     | `src/app/tours/[slug]/TourDetailClient.jsx`          |
| 8   | ItineraryPanel                      | ✅     | `src/components/tours/TourDetail/ItineraryPanel.jsx` |
| 9   | ReviewsPanel                        | ✅     | `src/components/tours/TourDetail/ReviewsPanel.jsx`   |
| 10  | FAQPanel                            | ✅     | Render inline trong TourDetailClient                 |
| 11  | MapPanel                            | ✅     | Render inline qua GoogleMap component                |
| 12  | BookingSidebar (date, guest, price) | ✅     | Đã có trong TourDetailClient                         |
| 13  | Availability check real-time        | ✅     | Tích hợp `getRealAvailability()` từ firestore.js     |
| 14  | SEO: metadata + JSON-LD             | ✅     | Dynamic generateMetadata + TouristTrip schema        |
| 15  | Related tours                       | ✅     | `getRelatedTours` trong firestore.js                 |

---

## 6. Phase 4: Checkout & Payment (✅ Hoàn thành)

| #   | Task                                   | Status | Ghi chú                                   |
| --- | -------------------------------------- | ------ | ----------------------------------------- |
| 1   | Checkout page (`/checkout`)            | ✅     | Hoàn thành flow 2 bước                    |
| 2   | CustomerForm                           | ✅     | react-hook-form integration               |
| 3   | CartSummary                            | ✅     | Itemized list + Totals                    |
| 4   | CouponInput                            | ✅     | Firestore validation integration          |
| 5   | Inventory Hold — tạo hold khi checkout | ✅     | 15 mins TTL, real-time availability check |
| 6   | PaymentSelector                        | ✅     | Stripe, VNPay, MoMo, PayPal, Cash         |
| 7   | Stripe integration                     | ✅     | Module + Webhook handler                  |
| 8   | VNPay integration                      | ✅     | Module + Webhook handler                  |
| 9   | Momo integration                       | ✅     | Module + Webhook handler                  |
| 10  | PayPal integration                     | ✅     | Module + Webhook handler                  |
| 11  | Cash payment option                    | ✅     | Direct confirmed booking                  |
| 12  | Payment Webhook handler                | ✅     | `/api/webhooks/payment/route.js`          |
| 13  | Booking confirmation page              | ✅     | `/booking/confirmation/[id]`              |
| 14  | Email confirmation                     | ⬜     | Placeholder cho giai đoạn sau             |

---

## 7. Phase 5: Account Dashboard (✅ Hoàn thành)

| #   | Task                                       | Status | Ghi chú                                   |
| --- | ------------------------------------------ | ------ | ----------------------------------------- |
| 1   | Account layout + sidebar nav               | ✅     | `src/app/account/layout.js`               |
| 2   | Profile tab (edit info, avatar)            | ✅     | `src/app/account/profile/page.js`         |
| 3   | Booking history tab (list, detail, cancel) | ✅     | `src/app/account/bookings/page.js`        |
| 4   | Wishlist tab                               | ✅     | `src/app/account/wishlist/page.js`        |
| 5   | Reviews tab                                | ✅     | `src/app/account/reviews/page.js`         |
| 6   | Write review from completed booking        | ✅     | Tích hợp `ReviewModal` trong `Bookings`   |
| 7   | Firebase Security Rules for user data      | ✅     | `firestore.rules` đã được tạo và cập nhật |

---

## 8. Phase 6: Hotel Pages (✅ Hoàn thành)

| #   | Task                                  | Status | Ghi chú                                                 |
| --- | ------------------------------------- | ------ | ------------------------------------------------------- |
| 1   | Hotel listing page (`/hotels`)        | ✅     | `src/app/hotels/page.js` (SSR+ISR)                      |
| 2   | Hotel detail page (`/hotels/[slug]`)  | ✅     | `src/app/hotels/[slug]/page.js` (ISR)                   |
| 3   | HotelDetailClient component           | ✅     | Tab navigation: overview, rooms, map, reviews, policies |
| 4   | HotelHeader component                 | ✅     | `src/components/hotels/HotelHeader.jsx`                 |
| 5   | Room detail page                      | ✅     | `src/app/hotels/[slug]/rooms/[roomId]/page.js`          |
| 6   | Hotel search/filter                   | ✅     | `HotelFilters.jsx` + `searchHotels()`                   |
| 7   | SEO: JSON-LD Hotel schema             | ✅     | Dynamic generateMetadata + Hotel schema                 |
| 8   | `getHotelBySlug` + `getRelatedHotels` | ✅     | Thêm vào `src/lib/firestore.js`                         |

---

## 9. Phase 7: Activity Pages (✅ Hoàn thành)

| #   | Task                                  | Status | Ghi chú                                              |
| --- | ------------------------------------- | ------ | ---------------------------------------------------- |
| 1   | Activity listing page (`/activities`) | ✅     | `src/app/activities/page.js` (SSR+ISR)               |
| 2   | Activity detail page                  | ✅     | `src/app/activities/[slug]/page.js` (ISR)            |
| 3   | ActivityDetailClient component        | ✅     | Tab navigation: overview, details, map, reviews, FAQ |
| 4   | Activity search/filter                | ✅     | `ActivityFilters.jsx` + `searchActivities()`         |
| 5   | SEO: JSON-LD TouristAttraction schema | ✅     | Dynamic generateMetadata                             |

---

## 10. Phase 7.5: Activities v2 — Multi-tier Pricing & Packages (✅ Hoàn thành)

| #   | Task                                                      | Status | Ghi chú                                                     |
| --- | --------------------------------------------------------- | ------ | ----------------------------------------------------------- |
| 1   | Crawl & phân tích trang rootytrip.com để đối chiếu        | ✅     | Phân tích gap chi tiết: pricing, widget, policies, schedule |
| 2   | Thiết kế schema Hybrid cho activities pricing             | ✅     | `packages/shared/schemas/activities.schema.md` (v2.0.0)         |
| 3   | Thêm `getActivityPricing(activityId)` vào firestore.js    | ✅     | Fetch pricing tiers từ subcollection                        |
| 4   | Thêm `getRelatedActivities(slug, count)` vào firestore.js | ✅     | Fetch activities liên quan (cùng location)                  |
| 5   | Tạo `ActivityBookingWidget.jsx`                           | ✅     | Date picker, package zone selector, qty adult/child, total  |
| 6   | Mở rộng Server Component page.js — fetch song song        | ✅     | Pricing + related + reviews parallel                        |
| 7   | Nâng cấp ActivityDetailClient.jsx — UI đầy đủ             | ✅     | Gallery carousel, badges, 8 tabs, booking widget, related   |
| 8   | Tạo schema documentation                                  | ✅     | `packages/shared/schemas/activities.schema.md`                  |
| 9   | Build verification                                        | ✅     | Turbopack production build pass                             |

---

## 11. Phase 7.6: Tours v2 — Multi-tier Pricing & Packages (✅ Hoàn thành)

| #   | Task                                                      | Status | Ghi chú                                                   |
| --- | --------------------------------------------------------- | ------ | --------------------------------------------------------- |
| 1   | Crawl & phân tích trang rootytrip.com tour                | ✅     | Phân tích gap: badges, pricing tiers, guide tab, carousel |
| 2   | Thêm `getTourPricing(tourId)` vào firestore.js            | ✅     | Fetch pricing tiers từ subcollection `tourPricing`        |
| 3   | Tạo `TourBookingWidget.jsx`                               | ✅     | Date picker, package type, qty adult/child/infant, total  |
| 4   | Mở rộng Server Component page.js — fetch song song        | ✅     | Pricing tiers + related + reviews parallel                |
| 5   | Nâng cấp TourDetailClient.jsx — pricing+guide tabs+badges | ✅     | 8 tabs, pricing table, guide steps, product info badges   |
| 6   | Nâng cấp TourHeader.jsx — gallery carousel                | ✅     | Grid → banner carousel với dot indicators                 |
| 7   | Tạo schema documentation                                  | ✅     | `packages/shared/schemas/tours.schema.md` (v2.0.0)            |
| 8   | Build verification                                        | ✅     | No errors                                                 |

---

## 12. Phase 8: Car Pages (✅ Hoàn thành)

| #   | Task                       | Status | Ghi chú                             |
| --- | -------------------------- | ------ | ----------------------------------- |
| 1   | Car listing page (`/cars`) | ✅     | `src/app/cars/page.js` (SSR+ISR)    |
| 2   | Car detail page            | ✅     | `src/app/cars/[slug]/page.js` (ISR) |
| 3   | Car search/filter          | ✅     | `CarFilters.jsx` + `searchCars()`   |

---

## 13. Phase A: Data Audit & Migration (✅ Hoàn thành)

| #   | Task                                                    | Status | Ghi chú                                                      |
| --- | ------------------------------------------------------- | ------ | ------------------------------------------------------------ |
| 1   | Tạo audit script `src/scripts/auditImages.js`           | ✅     | Quét 11 collections, phân loại URL ảnh, tạo báo cáo JSON     |
| 2   | Tạo diagnostic `src/scripts/diagnoseFirestore.js`       | ✅     | Kiểm tra cấu trúc dữ liệu thực tế trong Firestore            |
| 3   | Phát hiện field mismatches: hotels (minPrice, title...) | ✅     | Hotels dùng minPrice thay vì pricing.basePrice               |
| 4   | Tạo migration `src/scripts/migrateData.js`              | ✅     | Chuẩn hóa field names cho hotels, tours, activities, cars    |
| 5   | Chạy migration                                          | ✅     | 22 documents migrated thành công                             |
| 6   | Tạo seed data script `src/scripts/seedData.js`          | ✅     | Import từ \_raw_extract.json + cloned_activities_output.json |

## 14. Phase B: Media Processing Skills (✅ Hoàn thành)

| #   | Task                        | Status | Ghi chú                                                |
| --- | --------------------------- | ------ | ------------------------------------------------------ |
| 1   | Tạo skill `media-finder`    | ✅     | Phát hiện & phân loại ảnh trong hệ thống               |
| 2   | Tạo skill `media-optimizer` | ✅     | Download → xóa logo → WebP → upload → update Firestore |

## 15. Phase C: Hotel Schema v3 (✅ Hoàn thành)

| #   | Task                                | Status | Ghi chú                                                                                                          |
| --- | ----------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| 1   | Thiết kế hotel schema v3            | ✅     | `packages/shared/schemas/hotels.schema.v3.md`                                                                        |
| 2   | Thêm Firestore helpers cho v3       | ✅     | `getRoomTypesByHotel`, `getRoomTypePricing`, `getPhysicalRooms`, `getHotelInventory`, `getHotelRoomAvailability` |
| 3   | Backward compatibility với ERP sync | ✅     | Giữ nguyên rooms/ top-level collection                                                                           |

## 16. Phase D: Fix Detail Pages (✅ Hoàn thành)

| #   | Task                                    | Status | Ghi chú                                                                      |
| --- | --------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| 1   | Chạy diagnostic Firestore               | ✅     | Phat hiện 6 tours, 3 hotels, 14 activities, 2 cars có slug                   |
| 2   | Migration field names                   | ✅     | Hotels: minPrice→pricing.basePrice, ratingAverage→rating.average, title→name |
| 3   | Fix HotelBookingWidget cart integration | ✅     | Thêm `addItem` trước khi redirect checkout                                   |
| 4   | Fix TourBookingWidget cart integration  | ✅     | Thêm `addItem` trước khi redirect checkout                                   |
| 5   | Fix checkout empty cart handling        | ✅     | Hiển thị UI thân thiện + link khám phá thay vì silent fail                   |
| 6   | Tạo seed script                         | ✅     | `src/scripts/seedData.js` với dry-run mode                                   |

## 17. Phase E: Payment Gateway (✅ Đã fix, cần test)

| #   | Task                                               | Status | Ghi chú                                                    |
| --- | -------------------------------------------------- | ------ | ---------------------------------------------------------- |
| 1   | VNPay: lib + API route + webhook                   | ✅     | Hoàn chỉnh, cần test sandbox                               |
| 2   | MoMo: lib + API route + webhook                    | ✅     | Hoàn chỉnh, cần test sandbox                               |
| 3   | PayPal: lib + API route (create+capture) + webhook | ✅     | Hoàn chỉnh, cần test sandbox                               |
| 4   | Return page xử lý callback                         | ✅     | Xử lý VNPay, MoMo, PayPal redirect                         |
| 5   | Booking flow: widget → cart → checkout → payment   | ✅     | Đã kết nối: addItem → redirect checkout → gateway redirect |
| 6   | Stripe                                             | ⬜     | Cần STRIPE_SECRET_KEY (stub hiện tại)                      |
| 7   | PayPal secret key                                  | ⚠️     | PAYPAL_CLIENT_SECRET giống CLIENT_ID, cần key thật         |

---

## 13. Phase 9: Rental Pages (✅ Hoàn thành)

| #   | Task                             | Status | Ghi chú                                |
| --- | -------------------------------- | ------ | -------------------------------------- |
| 1   | Rental listing page (`/rentals`) | ✅     | `src/app/rentals/page.js` (SSR+ISR)    |
| 2   | Rental detail page               | ✅     | `src/app/rentals/[slug]/page.js` (ISR) |
| 3   | Rental search/filter             | ✅     | `searchRentals()` trong firestore.js   |

---

## 14. Phase 10: SEO & Deployment (✅ Hoàn thành)

| #   | Task                                | Status | Ghi chú                                               |
| --- | ----------------------------------- | ------ | ----------------------------------------------------- |
| 1   | Global metadata + og:image defaults | ✅     | `src/app/layout.js`                                   |
| 2   | Sitemap auto-generation             | ✅     | `src/app/sitemap.xml/route.js` — dynamic từ Firestore |
| 3   | Robots.txt                          | ✅     | `src/app/robots.txt/route.js`                         |
| 4   | Global loading.js                   | ✅     | `src/app/loading.js`                                  |
| 5   | Global error.js                     | ✅     | `src/app/error.js`                                    |
| 6   | Route protection proxy (Next.js 16) | ✅     | `src/proxy.js` — auth-session cookie check            |
| 7   | Auth cookie sync                    | ✅     | AuthProvider set/clear `auth-session` cookie          |
| 8   | Vercel deployment                   | ⬜     | Cần setup tài khoản Vercel                            |
| 9   | Custom domain + DNS                 | ⬜     | Cần setup domain                                      |

---

## 15. Phase 11: Hotels v2 — Hotel Detail Page Nâng cấp (✅ Hoàn thành)

| #   | Task                                             | Status | Ghi chú                                                  |
| --- | ------------------------------------------------ | ------ | -------------------------------------------------------- |
| 1   | Tạo `packages/shared/schemas/hotels.schema.md`       | ✅     | Schema hotels v2: hotel, room, roomPricing subcollection |
| 2   | Thêm `getRoomPricing(roomId)` vào firestore.js   | ✅     | Fetch pricing tiers từ subcollection `roomPricing`       |
| 3   | Thêm `getHotelPricing(hotelId)` vào firestore.js | ✅     | Fetch tổng hợp pricing cho hotel                         |
| 4   | Thêm `getHotelReviews(slug)` vào firestore.js    | ✅     | Fetch reviews cho hotel                                  |
| 5   | Tạo `ImageCarousel.jsx`                          | ✅     | Snap-scroll carousel + lightbox + "Xem ảnh" overlay      |
| 6   | Tạo `ReviewCard.jsx`                             | ✅     | Reusable review card: avatar, stars, tags, images        |
| 7   | Tạo `HotelBookingWidget.jsx`                     | ✅     | Date picker, guest selector, room picker, promo, total   |
| 8   | Nâng cấp `HotelHeader.jsx`                       | ✅     | Gallery grid → ImageCarousel, thêm score badge           |
| 9   | Nâng cấp `HotelDetailClient.jsx`                 | ✅     | 6 tabs, badges, room cards redesign, reviews breakdown   |
| 10  | Nâng cấp `page.js` server component              | ✅     | Parallel fetch, HotelBookingWidget, JSON-LD mở rộng      |
| 11  | Nâng cấp Room Detail page                        | ✅     | ImageCarousel, pricing tiers, promotions, JSON-LD        |
| 12  | Mobile sticky bottom bar                         | ✅     | Fixed bottom bar với giá + CTA "Chọn phòng"              |

---

## 16. Những gì Đã hoạt động (Verified)

| #   | Feature                                     | Status | Verified Date |
| --- | ------------------------------------------- | ------ | ------------- |
| 1   | Next.js dev server                          | ✅     | 04/2026       |
| 2   | Tailwind CSS hot reload                     | ✅     | 04/2026       |
| 3   | ESLint linting                              | ✅     | 04/2026       |
| 4   | Firebase Web SDK initialization             | ✅     | 04/2026       |
| 5   | Firestore read functions                    | ✅     | 04/2026       |
| 6   | AuthContext + AuthProvider                  | ✅     | 04/2026       |
| 7   | AuthGuard protected routes                  | ✅     | 04/2026       |
| 8   | Proxy route protection                      | ✅     | 04/2026       |
| 9   | Cart store (Zustand + persist)              | ✅     | 04/2026       |
| 10  | Production build (Turbopack)                | ✅     | 04/2026       |
| 11  | Hotels detail page (v2)                     | ✅     | 04/2026       |
| 12  | Room detail page (v2)                       | ✅     | 04/2026       |
| 13  | Activity detail page                        | ✅     | 04/2026       |
| 14  | Car detail page                             | ✅     | 04/2026       |
| 15  | Rental detail page                          | ✅     | 04/2026       |
| 16  | Sitemap + Robots.txt                        | ✅     | 04/2026       |
| 17  | Admin SDK data layer (firestore-admin.js)   | ✅     | 05/2026       |
| 18  | ERP Webhook (/webhooks/erp)                 | ✅     | 05/2026       |
| 19  | Unified Payment Webhook (/webhooks/payment) | ✅     | 05/2026       |

---

## 16. Known Issues

| #   | Issue                                      | Severity | Status  | Notes                                         |
| --- | ------------------------------------------ | -------- | ------- | --------------------------------------------- |
| 1   | Chưa có Firebase Firestore security rules  | Medium   | Open    | Sẽ deploy khi có project production           |
| 2   | Chưa có Stripe/VNPay/Momo/PayPal test keys | Medium   | Open    | Cần đăng ký sandbox accounts                  |
| 3   | Chưa có ERP sync mechanism                 | High     | Planned | Phase 14C: /webhooks/erp endpoint             |
| 4   | Firestore permission-denied khi build SSG  | Low      | Known   | Expected ở dev env, component handle fallback |

---

## 17. Phase 13: SEO & Performance Overhaul (✅ Hoàn thành)

| #   | Task                                                      | Status | Ghi chú                                                    |
| --- | --------------------------------------------------------- | ------ | ---------------------------------------------------------- |
| 1   | P13.0: HTTP→HTTPS redirect trong proxy.js                 | ✅     | Added redirect, function renamed to `middleware()`         |
| 2   | P13.1.1-6: Move client components out of app/             | ✅     | 6 files moved to components/                               |
| 3   | P13.1.7: Consolidate hooks (useBooking.js → hooks/)       | ✅     | Deleted lib/hooks/ directory                               |
| 4   | P13.1.8: Consolidate common/ → shared/                    | ✅     | FirebaseErrorHandler moved, common/ deleted                |
| 5   | P13.1.9-11: Rename .js → .jsx for client components       | ✅     | AuthGuard, CartItem, CartSummary                           |
| 6   | P13.1.12: Flatten firebase/auth.js → firebase-auth.js     | ✅     | Deleted lib/firebase/ subdirectory                         |
| 7   | P13.1.13: Move static assets to public/images/            | ✅     | Footer, Header updated to URL paths                        |
| 8   | P13.1.14: Update ALL import paths                         | ✅     | All 6 moved files + all referencing files updated          |
| 9   | P13.2: Remove Suspense from listing pages                 | ✅     | Tours, Hotels, Activities all render content directly      |
| 10  | P13.3.1: Create TabSwitcher component                     | ✅     | Created, later removed as dead code in P13.5               |
| 11  | P13.3.2: Refactor TourDetailClient — all tabs in HTML     | ✅     | data-tab-panel + CSS hidden pattern (reference)            |
| 12  | P13.3.3: Refactor HotelDetailClient — all tabs in HTML    | ✅     | data-tab-panel pattern, direct imports, shared Badge       |
| 13  | P13.3.4: Refactor ActivityDetailClient — all tabs in HTML | ✅     | data-tab-panel pattern, direct imports, shared Badge       |
| 14  | P13.4: SEO Enhancement (canonical, og:image, JSON-LD)     | ✅     | metadataBase, canonical, twitter card, JSON-LD all pages   |
| 15  | P13.5: Performance Optimization (ISR, dead code cleanup)  | ✅     | Hotel ISR (revalidate=3600), removed TabSwitcher + flights |
| 16  | P13.6: Cleanup (remove /flights + dead code)              | ✅     | Deleted flights/ route, added /flights→/ redirect in proxy |
| 17  | Bug fix: Firebase v12+ removed offset()                   | ✅     | Replaced with limit() approach                             |

### P13.3 Completed Work

| Component            | Previous                                             | After                                              |
| -------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| TourDetailClient     | Conditional rendering                                | `data-tab-panel` + `hidden` class (reference)      |
| HotelDetailClient    | `next/dynamic` imports + conditional rendering       | Direct imports + `data-tab-panel` + `hidden` class |
| ActivityDetailClient | `next/dynamic` for GoogleMap + conditional rendering | Direct import + `data-tab-panel` + `hidden` class  |

### P13.4 SEO Additions

| Feature                  | Pages                                    |
| ------------------------ | ---------------------------------------- |
| `metadataBase`           | Root layout                              |
| `og:image`               | Root layout, homepage, all listing pages |
| `canonical`              | All detail + listing pages, homepage     |
| `twitter:card`           | Root layout + all detail pages           |
| `WebSite` JSON-LD        | Homepage                                 |
| `Hotel` JSON-LD (server) | `/hotels/[slug]` (moved from client)     |
| `Product` JSON-LD        | `/cars/[slug]`, `/rentals/[slug]`        |
| `ItemList` JSON-LD       | All 5 listing pages                      |

### P13.5 Dead Code Removed

| File                                    | Reason                                         |
| --------------------------------------- | ---------------------------------------------- |
| `src/components/shared/TabSwitcher.jsx` | Unused (TourDetailClient uses inline nav)      |
| `src/app/flights/`                      | Placeholder coming-soon page removed           |
| `next/dynamic` in HotelDetailClient     | Converted to direct imports                    |
| `next/dynamic` in ActivityDetailClient  | Converted to direct imports                    |
| Local `Badge` in 3 DetailClients        | Extracted to `src/components/shared/Badge.jsx` |

---

## 18. Known Issues

## 17. Bug Fix & Cleanup Phase (05/2026 — ✅ Complete)

| #   | Task                                                                                        | Status | Ghi chú                                                                  |
| --- | ------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| 1   | Fix TourDetailPage crash — remove `ReferenceError: BookingSidebar not defined`              | ✅     | `TourDetailClient.jsx:273` — import lost during P13.1 move, line removed |
| 2   | Remove dead code in TourDetailClient.jsx (useRouter, handleBookNow)                         | ✅     | Cleaned unused imports/variables                                         |
| 3   | Create `storage-admin.js` — Admin Storage SDK version of resolveDocImages/resolveDocsImages | ✅     | Uses `getSignedUrl()` + public URL fallback                              |
| 4   | Migrate 9 server files from `@/lib/storage` to `@/lib/storage-admin`                        | ✅     | All server pages + FeaturedToursServer/FeaturedHotelsServer              |
| 5   | Strip 29 deprecated read-only functions from `firestore.js` (Client SDK)                    | ✅     | Removed duplicates from firestore-admin.js                               |
| 6   | Delete dead files: `BookingSidebar.jsx`, `TourTabs.jsx`                                     | ✅     | Replaced by TourBookingWidget + inline tabs                              |
| 7   | Build verification                                                                          | ✅     | 35/35 pages pass                                                         |
| 8   | Memory bank cập nhật                                                                        | ✅     | activeContext + progress                                                 |

## 18. Evolution of Project Decisions

| Ngày    | Decision                                                                             | Lý do thay đổi                                                            |
| ------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 04/2026 | Chọn JavaScript thay vì TypeScript                                                   | Team quen JS, giảm rào cản                                                |
| 04/2026 | Chọn Zustand thay vì Redux                                                           | Nhẹ hơn, ít boilerplate                                                   |
| 04/2026 | Chọn Firestore TTL cho Inventory Hold                                                | Đơn giản hơn Cloud Function                                               |
| 04/2026 | Chọn webhook route chung cho tất cả payment gateways                                 | Tránh duplicate code, dễ maintain                                         |
| 04/2026 | Quyết định KHÔNG có Admin/Partner Dashboard trên web                                 | ERP nội bộ quản lý toàn bộ, web là B2C only                               |
| 04/2026 | Firestore collections dịch vụ là Read-only                                           | ERP là single source of truth                                             |
| 04/2026 | Chuyển `middleware.js` → `proxy.js` (Next.js 16)                                     | Next.js 16 deprecated middleware convention                               |
| 05/2026 | proxy.js kept as-is, function renamed `middleware()`                                 | Build confirms Next.js 16 expects proxy.js                                |
| 05/2026 | P13.1: Directory reorganization                                                      | app/ chỉ chứa routing, components/ chỉ chứa UI                            |
| 05/2026 | P13.2: Remove Suspense from listing pages                                            | Content must be in initial HTML for SEO                                   |
| 05/2026 | P13.3: Tab System = all content in HTML + CSS hidden                                 | Google sees all tab content, not just active                              |
| 05/2026 | Firebase v12+ removed offset()                                                       | Replaced with limit() approach                                            |
| 05/2026 | Static assets moved to public/images/                                                | URL paths instead of module imports                                       |
| 05/2026 | P14: Admin SDK cho server-side, Client SDK cho client                                | Giảm bundle size, tăng perf                                               |
| 05/2026 | Unified payment webhook /webhooks/payment                                            | Tất cả gateway returns + IPN trong 1 endpoint                             |
| 05/2026 | ERP webhook /webhooks/erp với secret key validation                                  | ERP push data to B2C, secret = 1702261981                                 |
| 05/2026 | ERP data format: handle {id,...data} and {...data}                                   | Auto-generate id if missing                                               |
| 05/2026 | firestore-admin.js: dùng method chaining (Admin SDK) thay vì functional API          | Admin SDK không hỗ trợ `query()` function pattern                         |
| 05/2026 | ERP webhook: cả inbound + outbound trong 1 route, phân biệt bằng ?action=            | Giữ được backward compat, 1 endpoint duy nhất                             |
| 05/2026 | ERP secret: `ERP_WEBHOOK_SECRET` environment variable thay vì hardcode               | Security best practice                                                    |
| 05/2026 | Payment webhook: GET cho return + POST cho IPN, chung 1 route `/webhooks/payment`    | Dễ maintain, pattern consistent với ERP                                   |
| 04/2026 | Cookie `auth-session` sync từ AuthProvider                                           | Defense-in-depth: proxy + AuthGuard layer                                 |
| 04/2026 | Gộp Rentals chung phase với Cars                                                     | Cả hai là dịch vụ cho thuê, pattern tương tự                              |
| 04/2026 | Fix lỗi `useAuthStore` → `useAuth` trong WishlistList                                | Pre-existing bug, import sai tên export                                   |
| 05/2026 | storage-admin.js: dùng Admin SDK `getSignedUrl()` thay Client SDK `getDownloadURL()` | Server components không được dùng Client SDK                              |
| 05/2026 | firestore.js cleanup: xóa 29 read-only functions đã migrate sang firestore-admin.js  | Chỉ giữ WRITE + client-used READ functions                                |
| 05/2026 | Xóa BookingSidebar.jsx, TourTabs.jsx (dead code)                                     | TourBookingWidget thay BookingSidebar, tabs inline trong TourDetailClient |

---

## 19. Dependency Status

| Dependency   | Version | Status       | Ghi chú         |
| ------------ | ------- | ------------ | --------------- |
| Next.js      | 16      | ✅ Installed | App Router      |
| React        | 19      | ✅ Installed |                 |
| Firebase     | 11      | ✅ Installed | Web SDK modular |
| Tailwind CSS | 4       | ✅ Installed |                 |
| Zustand      | 5       | ✅ Installed |                 |

## 20. Phase 11: Hotels v4 — Schema & Data Layer Refactor (✅ Hoàn thành)

| #   | Task                                            | Status | Ghi chú                                                                              |
| --- | ----------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| 1   | Tạo 3 schema files collection mới               | ✅     | hotel_price_schedules, service_price_schedules, tour_prices                          |
| 2   | Cập nhật hotels.schema.md → v4 (rooms embedded) | ✅     | rooms là array of objects trong hotel doc                                            |
| 3   | Cập nhật firestore.rules — 3 collection mới     | ✅     | Read-only từ web                                                                     |
| 4   | Thêm 4 hàm v4 trong firestore.js                | ✅     | getHotelPriceSchedule, resolveRoomPricing, getLowestRoomPrice, buildRoomPricingTable |
| 5   | Đánh dấu deprecated v2/v3                       | ✅     | getRoomPricing, getRoomsByHotel, getHotelPricing                                     |

## 20. Phase 12: Hotels v4 — UI & Full Client Flow (✅ Hoàn thành)

| #   | Task                                                 | Status | Ghi chú                                                 |
| --- | ---------------------------------------------------- | ------ | ------------------------------------------------------- |
| 1   | HotelSearchForm — dynamic locations từ Firestore     | ✅     | Nhận locations prop, fallback hardcode                  |
| 2   | Xóa TopHotels.jsx (trùng FeaturedHotelsServer)       | ✅     | Giữ FeaturedHotelsServer                                |
| 3   | Fix HotelCard + FeaturedHotels — bỏ target="\_blank" | ✅     | Internal navigation đúng                                |
| 4   | SearchFormPopup + HotelFilters nâng cấp              | ✅     | Sort dropdown + Amenities checkboxes                    |
| 5   | Tách HotelDetail thành 6 panel components            | ✅     | Overview, Rooms, Amenities, Location, Reviews, Policies |
| 6   | RoomsPanel: pricing table + quantity +/- + cart sync | ✅     | SL còn lại, thành tiền real-time, "Xác nhận chọn phòng" |
| 7   | Detail page schema v4                                | ✅     | rooms embedded + hotel_price_schedules                  |
| 8   | CartItem: quantity +/- controls + line total         | ✅     | updateItemQuantity trong cart context                   |
| 9   | Cart page: coupon UI + grand total breakdown         | ✅     | Input mã, discount/tax display                          |
| 10  | Checkout: guest checkout (bỏ AuthGuard)              | ✅     | Không bắt buộc tài khoản                                |
| 11  | Confirmation: upsells section                        | ✅     | 3 activities phổ biến (debug data)                      |
| 12  | Build: 33/33 static pages pass                       | ✅     | npm run build không lỗi                                 |
| 13  | Memory Bank cập nhật                                 | ✅     | activeContext + progress                                |

---

## 21. Phase 14: Firebase Admin Server-Side + ERP/Payment Webhooks (🔄 In Progress)

### 14A. Firebase Admin SDK Migration — Server-side data fetching

| #   | Task                                                                                   | Status | Ghi chú                                                      |
| --- | -------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------ |
| 1   | Tạo `lib/firestore-admin.js` — data access layer dùng Firebase Admin SDK               | ✅     | `src/lib/firestore-admin.js` — 42 read-only functions mirror |
| 2   | Tạo helper `serializeAdminDoc()` cho Admin SDK (Timestamp → ISO, GeoPoint → {lat,lng}) | ✅     | Tích hợp trong firestore-admin.js                            |
| 3   | Migrate tất cả Server Components (page.js) sang dùng `firestore-admin.js`              | ✅     | 11 page.js + 4 Server Components migrated                    |
| 4   | Migrate API routes sang `firestore-admin.js` thay vì nhúng `adminDb` trực tiếp         | ✅     | payments/log + bookings/[id]/status                          |
| 5   | Giữ `firestore.js` (Client SDK) chỉ cho Client Components                              | ✅     | 9 file còn lại đều là Client Components/hooks                |
| 6   | Verify build + bundle size giảm                                                        | ✅     | 33/33 pages pass, no bundle regression                       |

### 14B. Payment Webhook Endpoint

| #   | Task                                                                               | Status | Ghi chú                                                         |
| --- | ---------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------- |
| 7   | Tạo `/webhooks/payment` — unified webhook nhận callback từ tất cả payment gateways | ✅     | `src/app/webhooks/payment/route.js` — GET (return) + POST (IPN) |
| 8   | Migrate logic từ `/api/payments/return` sang `/webhooks/payment`                   | ✅     | Logic return giữ nguyên, legacy redirect 307                    |
| 9   | Giữ `/api/payments/create` intact (client gọi tạo payment)                         | ✅     | Không thay đổi, chỉ cập nhật return URLs                        |
| 10  | Xử lý IPN (server-to-server) cho VNPay/MoMo/PayPal                                 | ✅     | POST handler: VNPay RspCode, MoMo 204, PayPal webhook           |
| 11  | Verify signature + update booking status + trigger ERP forward                     | ✅     | updateBookingAfterPayment + releaseInventoryHold + forwardToERP |

### 14C. ERP Webhook Endpoint — Nhận dữ liệu từ ERP

| #   | Task                                                                                  | Status | Ghi chú                                                          |
| --- | ------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| 12  | Refactor `/api/webhooks/erp/route.js` → `/webhooks/erp`                               | ✅     | `src/app/webhooks/erp/route.js` — both inbound + outbound handle |
| 13  | Thêm secret-key validation (ERP_WEBHOOK_SECRET từ env)                                | ✅     | Header `x-erp-secret` hoặc query param `secret`                  |
| 14  | Action `addTour`: nhận data → validate → tạo mới/cập nhật tour trên Firestore         | ✅     | + handles tourPricing subcollection upsert                       |
| 15  | Action `addHotel`: nhận data → validate → tạo mới/cập nhật hotel trên Firestore       | ✅     | + handles hotel_price_schedules subcollection                    |
| 16  | Action `addActivity`: nhận data → validate → tạo mới/cập nhật activity trên Firestore | ✅     | Upsert activity document                                         |
| 17  | Action `addCar` + `addRental`                                                         | ✅     | Upsert với auto slug generation                                  |
| 18  | Action `get`: truy vấn dữ liệu từ Firestore trả về ERP                                | ✅     | GET & POST support, col + id, limited to 8 validated collections |
| 19  | Error handling: 401 (sai key), 400 (sai dữ liệu), 500 (lỗi server)                    | ✅     | Chuẩn hoá response format: { success, error, message }           |
