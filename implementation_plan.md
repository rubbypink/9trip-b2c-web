# Implementation Plan

[Overview]
Xây dựng toàn bộ hệ thống 9Trip B2C Web từ Phase 2 đến Phase 8 — một nền tảng đặt tour du lịch & dịch vụ với 7 loại dịch vụ (Tour, Hotel, Room, Activity, Car, Rental, Combo), hệ thống booking, thanh toán đa cổng, quản lý tài khoản, review, và tối ưu SEO.

Hiện tại Phase 1 đã hoàn thành: Firebase init, Auth (Email/Google/Facebook), Cart (Zustand + persist), Layout (Header/Footer responsive), và các core libs (firebase.js, firestore.js, auth.js, cart.js, utils.js). Dự án chạy Next.js 16.2.4 với Turbopack, sử dụng Tailwind CSS v4, React 19 patterns (Server Components mặc định, Server Actions, useOptimistic, useFormStatus, useActionState). Toàn bộ dữ liệu sản phẩm (tours, hotels, rooms, activities, cars, rentals, locations, settings) là read-only từ ERP qua Firebase sync 1 chiều. Dữ liệu người dùng (bookings, reviews, users, coupons, notifications, inventory_holds) được đọc/ghi qua Firebase Web SDK với Security Rules phân quyền.

Kế hoạch chia làm 7 giai đoạn (Phase 2-8), mỗi giai đoạn xây dựng một tập hợp tính năng có thể test độc lập, tích hợp dần để tạo thành hệ thống hoàn chỉnh. Thứ tự triển khai tối ưu dựa trên dependency graph: Home → Listing → Detail → Checkout → Payment → Account → SEO.

[Types]
Không sử dụng TypeScript — dùng JSDoc để mô tả cấu trúc dữ liệu. Các JSDoc typedefs được định nghĩa trong từng file firestore helper tương ứng.

### Collection Document Shapes (Firestore)

**Tour:**
```
id, slug, title, excerpt, description, featuredImage, gallery[], duration, destinations[],
itinerary[{day, title, description, meals, accommodation}], inclusions[], exclusions[],
pricing: { basePrice, currency, discountPercent, discountLabel, maxPeople },
availability: { startDates[], calendar[{date, available, price}] },
categories[], tags[], rating, reviewCount, featured, status, metaTitle, metaDescription,
createdAt, updatedAt
```

**Hotel:**
```
id, slug, name, excerpt, description, featuredImage, gallery[],
address: { street, city, country, lat, lng }, starRating, amenities[],
policies: { checkInTime, checkOutTime, cancellation },
rating, reviewCount, featured, status, metaTitle, metaDescription, createdAt, updatedAt
```

**Room:**
```
id, hotelId, slug, name, description, images[], roomType, maxGuests, bedType,
pricing: { basePrice, currency, discountPercent }, amenities[],
availability: { totalRooms, calendar[{date, available, price}] },
status, createdAt, updatedAt
```

**Activity:**
```
id, slug, title, excerpt, description, featuredImage, gallery[], duration, location,
pricing: { basePrice, currency, discountPercent }, availability: { startDates[], calendar[] },
categories[], rating, reviewCount, featured, status, metaTitle, metaDescription,
createdAt, updatedAt
```

**Car:**
```
id, slug, name, excerpt, description, images[], carType, transmission, seats,
pricing: { basePrice, currency, pricePerDay, discountPercent }, features[],
availability: { calendar[] }, rating, reviewCount, featured, status,
metaTitle, metaDescription, createdAt, updatedAt
```

**Rental:**
```
id, slug, name, excerpt, description, images[], type, location,
pricing: { basePrice, currency, pricePerDay, discountPercent }, features[],
availability: { calendar[] }, rating, reviewCount, featured, status,
metaTitle, metaDescription, createdAt, updatedAt
```

**Location:**
```
id, slug, name, type, parentId, description, image, lat, lng, country, featured,
status, createdAt, updatedAt
```

**Booking:**
```
id, userId, serviceId, serviceType, startDate, endDate,
guests: { adults, children, infants },
pricing: { subtotal, discount, tax, total, currency },
paymentStatus ('pending'|'paid'|'failed'|'refunded'),
bookingStatus ('confirmed'|'cancelled'|'completed'),
transactionId, paymentGateway, contactInfo: { fullName, email, phone, specialRequests },
inventoryHoldId, erpSyncStatus, createdAt, updatedAt
```

**Review:**
```
id, userId, serviceId, serviceType, bookingId, rating (1-5), title, content,
images[], helpfulCount, status ('pending'|'approved'|'rejected'), createdAt, updatedAt
```

**User (Firestore):**
```
uid, email, displayName, photoURL, phone, nationality, dateOfBirth,
preferences: { currency, language, notifications }, savedItems[], createdAt, updatedAt
```

**Coupon:**
```
id, code, discountType ('percentage'|'fixed'), discountValue, minOrderValue, maxDiscount,
usageLimit, usedCount, startDate, endDate, applicableServices[], status, createdAt
```

**Notification:**
```
id, userId, type, title, message, data: { bookingId, serviceId, url }, read, createdAt
```

**InventoryHold:**
```
id, serviceId, serviceType, startDate, endDate, quantity, userId, expiresAt, createdAt
```

**Settings:**
```
id, siteName, siteDescription, logo, favicon, socialLinks, contactEmail, contactPhone,
address, currency, defaultLanguage, metaDefaults, features: { enableReviews, enableCoupons, enableMultiCurrency }
```

[Files]
Tạo mới ~58 files, sửa đổi 5 files hiện có. Không xóa file nào.

### Files mới (theo phase)

**Phase 2 — Home Page (9 files):**
- `src/app/page.js` — Home Page (Server Component, fetch featured tours + settings)
- `src/components/home/HeroBanner.jsx` — Hero section với CTA search overlay
- `src/components/home/SearchTabs.jsx` — Server container cho search multi-tab
- `src/components/home/SearchTabsClient.jsx` — Client component interactive tabs (5 loại dịch vụ)
- `src/components/home/FeaturedTours.jsx` — Section tour nổi bật với grid
- `src/components/tours/TourCard.jsx` — Card tour tái sử dụng (grid/list variant, ảnh, giá, rating, badge)
- `src/components/shared/LoadingSpinner.jsx` — Loading skeleton/spinner animation
- `src/components/shared/EmptyState.jsx` — Trạng thái rỗng với icon + message
- `src/lib/hooks/useTours.js` — Custom hook fetch tours với filter/search/pagination

**Phase 3 — Service Listing Pages (11 files):**
- `src/app/tours/page.js` — Tour listing với search/filter/pagination
- `src/app/hotels/page.js` — Hotel listing
- `src/app/activities/page.js` — Activity listing
- `src/app/cars/page.js` — Car listing
- `src/app/rentals/page.js` — Rental listing
- `src/components/tours/TourFilters.jsx` — Bộ lọc tour (Server Component wrapper)
- `src/components/tours/TourFiltersClient.jsx` — Client interactive filters (category, price range, rating, duration)
- `src/components/tours/TourGrid.jsx` — Grid hiển thị danh sách tour với TourCard
- `src/components/shared/Pagination.jsx` — Phân trang (prev/next + page numbers)
- `src/components/shared/DateRangePicker.jsx` — Date picker (check-in/check-out)
- `src/components/shared/GuestSelector.jsx` — +/- counter cho adult/child/infant

**Phase 4 — Detail Pages (12 files):**
- `src/app/tours/[slug]/page.js` — Tour detail page với ISR (revalidate: 3600)
- `src/app/hotels/[slug]/page.js` — Hotel detail page với ISR
- `src/app/hotels/[slug]/rooms/page.js` — Room listing cho hotel cụ thể
- `src/app/activities/[slug]/page.js` — Activity detail page với ISR
- `src/app/cars/[slug]/page.js` — Car detail page với ISR
- `src/app/rentals/[slug]/page.js` — Rental detail page với ISR
- `src/components/tours/TourHeader.jsx` — Header tour detail (gallery ảnh, title, rating, location, giá)
- `src/components/tours/TourTabs.jsx` — Tabs: Overview, Itinerary, Reviews, Policies
- `src/components/tours/BookingSidebar.jsx` — Form đặt tour (date picker, guest counter, price calculator, nút "Book Now")
- `src/components/shared/GalleryWithLightbox.jsx` — Gallery ảnh + lightbox modal
- `src/components/shared/StarRating.jsx` — Hiển thị sao đánh giá (1-5)
- `src/components/shared/PriceDisplay.jsx` — Hiển thị giá + discount badge + currency

**Phase 5 — Booking & Checkout (6 files):**
- `src/app/checkout/page.js` — Checkout page (3-step: Customer Info → Cart Summary → Payment)
- `src/app/booking/confirmation/[id]/page.js` — Booking confirmation page
- `src/components/checkout/CustomerForm.jsx` — Form thông tin khách hàng (fullName, email, phone, specialRequests)
- `src/components/checkout/CartSummary.jsx` — Tóm tắt giỏ hàng (items, coupon, subtotal, tax, total)
- `src/components/checkout/PaymentSelector.jsx` — Chọn cổng thanh toán (Stripe, VNPay, Momo, PayPal)
- `src/lib/hooks/useBooking.js` — Custom hook tạo booking + inventory hold + giải phóng hold

**Phase 6 — Payment Integration (6 files):**
- `src/app/api/webhooks/payment/route.js` — Unified payment webhook handler (POST)
- `src/lib/payments/stripe.js` — Stripe integration (create PaymentIntent, verify webhook)
- `src/lib/payments/vnpay.js` — VNPay integration (create payment URL, verify return)
- `src/lib/payments/momo.js` — Momo integration (create payment URL, verify callback)
- `src/lib/payments/paypal.js` — PayPal integration (create order, capture order)
- `src/lib/payments/utils.js` — Payment helpers (normalizePayload, verifySignature, updateBookingStatus)

**Phase 7 — User Account & Reviews (8 files):**
- `src/app/account/page.js` — Account dashboard (tổng quan: upcoming bookings, recent reviews)
- `src/app/account/bookings/page.js` — Danh sách booking của user (filter theo status)
- `src/app/account/profile/page.js` — Edit profile (displayName, phone, nationality, preferences)
- `src/app/account/reviews/page.js` — Danh sách review của user
- `src/components/account/AccountSidebar.jsx` — Sidebar navigation (Dashboard, Bookings, Profile, Reviews)
- `src/components/account/BookingList.jsx` — Danh sách booking với status badge + action buttons
- `src/components/reviews/ReviewForm.jsx` — Form viết review (rating stars, title, content, upload ảnh)
- `src/components/reviews/ReviewsPanel.jsx` — Panel hiển thị reviews + rating summary chart

**Phase 8 — SEO & Optimization (6 files):**
- `src/app/sitemap.js` — Dynamic sitemap.xml generation (tất cả service slugs)
- `src/app/robots.js` — Robots.txt generation
- `src/app/not-found.js` — Custom 404 page với branded design
- `src/app/error.js` — Error boundary với retry button
- `src/lib/seo/schema.js` — JSON-LD schema generators (Tour, Hotel, Activity, Breadcrumb, Organization, FAQ)
- `src/lib/seo/metadata.js` — Dynamic metadata helpers (generateServiceMeta, generateListingMeta, generateHomeMeta)

### Files sửa đổi:

**`src/app/layout.js`:**
- Thêm `<Suspense>` boundary cho loading states
- Thêm analytics/error monitoring script
- Thêm metadata từ settings collection (fallback static)

**`src/app/globals.css`:**
- Bổ sung animation keyframes (fadeIn, slideUp, skeleton pulse)
- Bổ sung skeleton loading styles
- Tối ưu responsive utilities

**`src/lib/firestore.js`:**
- Thêm query helpers: `getFeaturedServices`, `getByCategory`, `searchServices`, `getAvailability`
- Thêm pagination support: `getDocsWithPagination`
- Thêm error handling + fallback data cho tất cả query functions

**`src/lib/cart.js`:**
- Thêm phương thức: `addServiceToCart(service, options)` — add với validation
- Thêm phương thức: `validateCartBeforeCheckout()` — kiểm tra availability trước checkout
- Thêm `expiresAt` tracking cho inventory hold
- Thêm `clearExpiredItems()` — tự động xóa item hết hạn

**`src/lib/utils.js`:**
- Thêm: `generateTourSchema`, `generateHotelSchema`, `generateActivitySchema` — JSON-LD
- Thêm: `calculateNights(checkIn, checkOut)` — tính số đêm
- Thêm: `formatGuestsText(adults, children, infants)` — format text số khách
- Thêm: `debounce(fn, delay)` — debounce utility
- Sửa: `formatCurrency` hỗ trợ multi-currency
- Sửa: `formatDate` hỗ trợ locale

[Functions]
Bổ sung ~82 functions mới, sửa đổi 10 functions hiện có.

### Functions mới (theo file):

**`src/lib/firestore.js` (22 functions):**
- `getFeaturedTours(limit)` — Lấy tours featured cho homepage
- `getFeaturedServices(serviceType, limit)` — Lấy featured services tổng quát
- `getToursByCategory(category, limit)` — Lấy tours theo category
- `searchServices(serviceType, query, filters)` — Search đa dịch vụ với filters
- `getTourBySlug(slug)` — Lấy chi tiết 1 tour theo slug
- `getHotelBySlug(slug)` — Lấy chi tiết 1 hotel theo slug
- `getRoomsByHotel(hotelId)` — Lấy rooms của 1 hotel
- `getActivityBySlug(slug)` — Lấy chi tiết 1 activity theo slug
- `getCarBySlug(slug)` — Lấy chi tiết 1 car theo slug
- `getRentalBySlug(slug)` — Lấy chi tiết 1 rental theo slug
- `getServiceSlugs(serviceType)` — Lấy tất cả slugs cho generateStaticParams
- `getLocations()` — Lấy danh sách locations
- `getSettings()` — Lấy site settings
- `createBooking(bookingData)` — Tạo booking document trong bookings collection
- `getUserBookings(userId)` — Lấy bookings của user (sorted by createdAt desc)
- `getBookingById(bookingId)` — Lấy 1 booking theo ID
- `createReview(reviewData)` — Tạo review document
- `getServiceReviews(serviceId, serviceType)` — Lấy reviews của 1 service
- `getUserReviews(userId)` — Lấy reviews của user
- `createInventoryHold(holdData)` — Tạo inventory hold (15 phút TTL)
- `releaseInventoryHold(holdId)` — Xóa inventory hold
- `getRealAvailability(serviceId, date, totalSlots)` — Tính availability thực tế (total - holds - bookings)

**`src/lib/utils.js` (7 functions mới, 2 sửa):**
- `generateTourSchema(tour)` — JSON-LD schema.org/Tour
- `generateHotelSchema(hotel)` — JSON-LD schema.org/Hotel
- `generateActivitySchema(activity)` — JSON-LD schema.org/TouristAttraction
- `calculateNights(checkIn, checkOut)` — Tính số đêm từ 2 date
- `formatGuestsText(adults, children, infants)` — "2 adults, 1 child"
- `debounce(fn, delay)` — Debounce utility
- `truncateText(text, maxLength)` — Cắt text + "..."
- `formatCurrency(amount, currency)` — Sửa: hỗ trợ multi-currency (VND, USD, EUR)
- `formatDate(date, locale)` — Sửa: hỗ trợ locale (vi-VN, en-US)

**`src/lib/cart.js` (2 functions mới):**
- `addServiceToCart(service, options)` — Add service vào cart với validation (check trùng, check availability)
- `validateCartBeforeCheckout()` — Validate cart trước checkout (tồn tại, availability, pricing)

**`src/lib/hooks/useTours.js` (1 hook):**
- `useTours(initialFilters)` — Hook fetch tours với search/filter/pagination state management

**`src/lib/hooks/useBooking.js` (1 hook):**
- `useBooking()` — Hook quản lý flow booking: hold inventory → create booking → confirm → release hold on cancel

**`src/lib/payments/utils.js` (5 functions):**
- `normalizePaymentPayload(gateway, rawPayload)` — Chuẩn hóa payload từ các gateway về format chung
- `verifyWebhookSignature(gateway, request, rawBody)` — Verify webhook signature từng gateway
- `updateBookingAfterPayment(normalizedPayload)` — Cập nhật booking status + transaction ID
- `releaseInventoryAfterPayment(bookingId)` — Giải phóng inventory hold sau thanh toán thành công
- `triggerERPSync(bookingId)` — Trigger ERP sync (firestore flag)

**`src/lib/seo/schema.js` (6 functions):**
- `generateTourSchema(tour)` — Tour JSON-LD với offers, aggregateRating
- `generateHotelSchema(hotel, rooms)` — Hotel JSON-LD với containsPlace (rooms)
- `generateActivitySchema(activity)` — TouristAttraction JSON-LD
- `generateBreadcrumbSchema(items)` — BreadcrumbList JSON-LD
- `generateOrganizationSchema(settings)` — Organization JSON-LD (logo, sameAs)
- `generateFAQSchema(faqs)` — FAQPage JSON-LD

**`src/lib/seo/metadata.js` (3 functions):**
- `generateServiceMeta(service)` — Dynamic metadata cho service detail pages
- `generateListingMeta(serviceType, filters)` — Metadata cho listing pages
- `generateHomeMeta(settings)` — Metadata cho homepage

### Functions sửa đổi:

**`src/lib/firestore.js` (sửa hiện có):**
- Các query listing: thêm pagination (startAfter + limit pattern)
- Tất cả query functions: thêm try/catch + fallback data

**`src/lib/utils.js` (sửa):**
- `formatCurrency`: thêm currency parameter (VND, USD, EUR)
- `formatDate`: thêm locale parameter

**`src/app/layout.js` (sửa):**
- `<Suspense>` boundary bọc children
- Metadata dynamic từ settings

[Classes]
Không có class OOP truyền thống — dùng React Components (functional + hooks) và custom hooks pattern. Tất cả components đã liệt kê trong section [Files] với đường dẫn đầy đủ.

Các reusable patterns:
- **Wrapper pattern**: Server Component bọc Client Component (AuthWrapper, SearchTabs/SearchTabsClient)
- **Custom hooks**: useTours, useBooking (data fetching + state management)
- **Compound components**: TourHeader, TourTabs, BookingSidebar phối hợp trong detail page

[Dependencies]
Không thêm package mới. Tất cả dependency đã được cài trong Phase 1:

- `next@^16.2.4` — Next.js 16 App Router
- `react@^19.0.0`, `react-dom@^19.0.0`
- `firebase@^11.6.0` — Firebase Web SDK v9+ modular
- `zustand@^5.0.5` — State management (cart)
- `tailwindcss@^4.1.6`, `@tailwindcss/postcss@^4.1.6`

Payment gateways — dùng REST API trực tiếp (không cần SDK):
- Stripe: dùng Stripe REST API + stripe-js CDN (load động)
- VNPay: dùng redirect URL với hash signature
- Momo: dùng redirect URL với signature
- PayPal: dùng PayPal JS SDK CDN (load động) hoặc REST API

[Testing]
Testing thủ công bằng browser — không viết unit test trong scope này.

### Validation checklist cho mỗi phase:
1. Build thành công (`next build` không lỗi, không warning)
2. Dev server chạy (`next dev --turbo`)
3. UI responsive: mobile 375px, tablet 768px, desktop 1440px
4. SEO kiểm tra: View Source có metadata, schema.org JSON-LD
5. Firebase Security Rules: kiểm tra console rules playground
6. Lighthouse: Performance ≥ 85, SEO ≥ 95, Accessibility ≥ 90

### Per-phase validation:

**Phase 2 — Home Page:**
- [ ] Home page render đầy đủ sections
- [ ] Search tabs chuyển đổi mượt giữa 5 loại dịch vụ
- [ ] Featured tours fetch từ Firebase (hoặc fallback data nếu empty)
- [ ] Tour cards hiển thị đúng ảnh, giá, rating
- [ ] Responsive trên mobile/tablet/desktop

**Phase 3 — Service Listing Pages:**
- [x] 5 listing pages render đúng layout
- [x] Filters hoạt động: category, price range, rating, duration
- [x] URL search params sync với filter state
- [x] Pagination prev/next/page numbers hoạt động
- [x] DateRangePicker + GuestSelector functional
- [x] Empty state hiển thị khi không có kết quả

**Phase 4 — Detail Pages:**
- [ ] 6 detail pages render với ISR
- [ ] generateStaticParams tạo đúng paths
- [ ] Gallery lightbox mở/đóng, prev/next ảnh
- [ ] TourTabs chuyển đổi overview/itinerary/reviews/policies
- [ ] BookingSidebar: chọn date, chọn guests, tính giá, nút "Book Now" add to cart
- [ ] StarRating + PriceDisplay hiển thị đúng

**Phase 5 — Booking & Checkout:**
- [ ] Checkout 3-step flow mượt (Customer Info → Summary → Payment)
- [ ] CustomerForm validation (required fields, email format)
- [ ] CartSummary hiển thị đúng items + coupon + total
- [ ] Inventory hold được tạo khi vào checkout (15 phút)
- [ ] Inventory hold tự động giải phóng khi rời trang/hết hạn
- [ ] Booking confirmation page hiển thị sau checkout thành công

**Phase 6 — Payment Integration:**
- [ ] Stripe: tạo PaymentIntent → redirect → webhook callback
- [ ] VNPay: tạo payment URL → redirect → return URL verify
- [ ] Momo: tạo payment URL → callback verify
- [ ] PayPal: tạo order → capture → webhook
- [ ] Webhook xử lý idempotency (ko duplicate booking update)
- [ ] Booking status cập nhật đúng sau thanh toán

**Phase 7 — User Account & Reviews:**
- [ ] Account dashboard hiển thị upcoming bookings
- [ ] Booking list filter theo status (upcoming/completed/cancelled)
- [ ] Profile edit form save + validate
- [ ] Review form: rating stars, text, image upload
- [ ] Review hiển thị trong service detail page
- [ ] Bảo vệ route: redirect nếu chưa login

**Phase 8 — SEO & Optimization:**
- [ ] Sitemap.xml chứa tất cả service slugs
- [ ] Robots.txt cho phép index tất cả pages
- [ ] JSON-LD schema có trên tất cả detail pages
- [ ] Metadata dynamic đúng cho từng page
- [ ] 404 page hiển thị branded design
- [ ] Error boundary catch lỗi + retry
- [ ] Lighthouse: Performance ≥ 90, SEO ≥ 95, Accessibility ≥ 90

[Implementation Order]
Thứ tự triển khai tối ưu dựa trên dependency graph. Mỗi phase phụ thuộc vào phase trước, đảm bảo tích hợp liền mạch và có thể test độc lập.

1. **Phase 2 — Home Page** (nền tảng UI entry point)
   - Tạo `page.js`, HeroBanner, SearchTabs/SearchTabsClient, FeaturedTours
   - Tạo TourCard (tái sử dụng xuyên suốt các phase sau)
   - Tạo LoadingSpinner, EmptyState (shared components)
   - Tạo useTours hook (data fetching pattern)
   - Sửa `firestore.js` (thêm getFeaturedTours, getSettings)
   - Sửa `utils.js` (thêm formatCurrency multi-currency)
   - Sửa `layout.js` (thêm Suspense boundary)
   - Sửa `globals.css` (thêm animation styles)

2. **Phase 3 — Service Listing Pages** (danh sách 5 loại dịch vụ)
   - Tạo 5 listing pages với URL search params
   - Tạo TourFilters/TourFiltersClient (bộ lọc)
   - Tạo TourGrid, Pagination, DateRangePicker, GuestSelector
   - Sửa `firestore.js` (thêm searchServices, getByCategory, pagination)

3. **Phase 4 — Detail Pages** (chi tiết từng dịch vụ)
   - Tạo 6 detail pages với ISR + generateStaticParams
   - Tạo TourHeader, TourTabs, BookingSidebar
   - Tạo GalleryWithLightbox, StarRating, PriceDisplay
   - Sửa `firestore.js` (thêm getTourBySlug, getHotelBySlug, getRoomsByHotel, etc.)
   - Sửa `cart.js` (thêm addServiceToCart)

4. **Phase 5 — Booking & Checkout** (đặt dịch vụ)
   - Tạo checkout page (3-step flow)
   - Tạo CustomerForm, CartSummary, PaymentSelector
   - Tạo useBooking hook (inventory hold pattern)
   - Sửa `firestore.js` (thêm createBooking, createInventoryHold, releaseInventoryHold, getRealAvailability)
   - Sửa `cart.js` (thêm validateCartBeforeCheckout, clearExpiredItems)

5. **Phase 6 — Payment Integration** (thanh toán đa cổng)
   - Tạo webhook route handler
   - Tạo 4 payment module (stripe, vnpay, momo, paypal)
   - Tạo payment utils (normalize, verify, update)
   - Sửa `firestore.js` (thêm updateBookingStatus)

6. **Phase 7 — User Account & Reviews** (tài khoản người dùng)
   - Tạo account dashboard + sidebar
   - Tạo booking list, profile edit, review list pages
   - Tạo ReviewForm, ReviewsPanel
   - Sửa `firestore.js` (thêm getUserBookings, getBookingById, createReview, getServiceReviews, getUserReviews)

7. **Phase 8 — SEO & Optimization** (hoàn thiện production)
   - Tạo sitemap.js, robots.js, not-found.js, error.js
   - Tạo seo/schema.js, seo/metadata.js
   - Sửa `utils.js` (thêm generate*Schema functions)
   - Sửa `layout.js` (dynamic metadata)
   - Lighthouse audit + optimization