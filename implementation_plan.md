# Implementation Plan — 9Trip B2C Complete

> **Cập nhật:** 27/04/2026  
> **Trạng thái:** ✅ Tất cả Phase 0-10 đã hoàn thành  
> **Build:** ✅ `npm run build` thành công (21/21 static pages, Turbopack)

---

## ✅ Đã Hoàn thành

### Phase 0: Fix activeContext.md
- Xóa tham chiếu "Admin Dashboard" vi phạm project rules
- Cập nhật Next Steps đúng roadmap (Hotels → Tours → Activities → Cars+Rentals → SEO)

### Phase 1: Route Protection (proxy.js)
- Tạo `src/proxy.js` (Next.js 16 convention, thay `middleware.js` đã deprecated)
- Bảo vệ route: `/checkout`, `/cart`, `/account`, `/booking/confirmation`
- AuthProvider sync cookie `auth-session` cho defense-in-depth
- Fix pre-existing bug: `WishlistList.jsx` dùng `useAuthStore` → `useAuth`

### Phase 2: Hotels — Full Implementation
- `src/app/hotels/[slug]/page.js` — Hotel detail (ISR) + JSON-LD Hotel schema
- `src/app/hotels/[slug]/HotelDetailClient.jsx` — Tab navigation: overview, rooms, map, reviews, policies
- `src/components/hotels/HotelHeader.jsx` — Gallery + metadata header
- `src/app/hotels/[slug]/rooms/[roomId]/page.js` — Room detail (ISR)
- `getHotelBySlug()`, `getRelatedHotels()` thêm vào `firestore.js`

### Phase 3: Tours — Complete
- ItineraryPanel, ReviewsPanel: đã tồn tại ✅
- FAQ, Map: render inline trong TourDetailClient ✅
- BookingSidebar: tích hợp `getRealAvailability()` thay mock

### Phase 4: Activities — Full Implementation
- `src/app/activities/[slug]/page.js` + `ActivityDetailClient.jsx`
- JSON-LD TouristAttraction schema

### Phase 5: Cars & Rentals
- `src/app/cars/[slug]/page.js` — Car detail
- `src/app/rentals/[slug]/page.js` — Rental detail

### Phase 6: SEO & Foundations
- `src/app/sitemap.xml/route.js` — Dynamic sitemap từ Firestore
- `src/app/robots.txt/route.js`
- `src/app/loading.js` — Global loading UI
- `src/app/error.js` — Global error boundary

---

## Build Verification

```
Route (app)
┌ ○ /                          ┌ ○ /account/reviews
├ ○ /_not-found                ├ ○ /account/wishlist
├ ○ /account                   ├ ƒ /activities
├ ○ /account/bookings           ├ ● /activities/[slug]
├ ○ /account/profile           ├ ƒ /api/webhooks/payment
├ ƒ /booking/confirmation/[id] ├ ƒ /cars
├ ● /cars/[slug]               ├ ○ /cart
├ ○ /checkout                  ├ ƒ /hotels
├ ● /hotels/[slug]             ├ ● /hotels/[slug]/rooms/[roomId]
├ ○ /login                     ├ ○ /register
├ ƒ /rentals                   ├ ● /rentals/[slug]
├ ○ /robots.txt                ├ ○ /sitemap.xml
├ ƒ /tours                     └ ● /tours/[slug]

ƒ Proxy (Middleware)
● SSG  ○ Static  ƒ Dynamic
```

---

## Các file đã tạo/sửa

| File | Action |
|------|--------|
| `memory-bank/activeContext.md` | Fix Admin Dashboard → Hotels |
| `memory-bank/progress.md` | Update all phases completed |
| `src/proxy.js` | Tạo mới (Next.js 16 route protection) |
| `src/lib/auth.js` | Thêm cookie sync |
| `src/lib/firestore.js` | Thêm `getHotelBySlug`, `getRelatedHotels` |
| `src/app/hotels/[slug]/page.js` | Tạo mới |
| `src/app/hotels/[slug]/HotelDetailClient.jsx` | Tạo mới |
| `src/components/hotels/HotelHeader.jsx` | Tạo mới |
| `src/app/hotels/[slug]/rooms/[roomId]/page.js` | Tạo mới |
| `src/app/activities/[slug]/page.js` | Tạo mới |
| `src/app/activities/[slug]/ActivityDetailClient.jsx` | Tạo mới |
| `src/app/cars/[slug]/page.js` | Tạo mới |
| `src/app/rentals/[slug]/page.js` | Tạo mới |
| `src/app/sitemap.xml/route.js` | Tạo mới |
| `src/app/robots.txt/route.js` | Tạo mới |
| `src/app/loading.js` | Tạo mới |
| `src/app/error.js` | Tạo mới |
| `src/components/tours/TourDetail/BookingSidebar.jsx` | Tích hợp real availability |
| `src/components/account/WishlistList.jsx` | Fix `useAuthStore` → `useAuth` |
| `implementation_plan.md` | Cập nhật completion summary |

---

## Còn lại (Out of Scope / Future)

| Task | Lý do |
|------|-------|
| Admin Dashboard | ❌ Project rules cấm |
| Partner Dashboard | ❌ Project rules cấm |
| Flight integration (TravelPayouts) | Cần research phase riêng |
| Multi-language | Phase 2 (sau launch) |
| PWA | Cân nhắc sau |
| Email confirmation (Resend) | Tích hợp sau khi có domain + Vercel deploy |
| Vercel deployment + domain + DNS | Cần setup tài khoản Vercel |

- `UserProfile`: { uid, email, displayName, photoURL, phone, address, wishlist: string[] }
- `Booking`: { id, userId, serviceId, serviceType, startDate, endDate, quantity, totalPrice, bookingStatus, paymentStatus, createdAt }
- `Review`: { id, userId, userName, userAvatar, serviceId, serviceType, rating, comment, status, createdAt }

[Files]
Tạo mới các file cấu trúc cho Dashboard và các components liên quan.

- `src/app/account/layout.js`: Layout chung cho dashboard (Sidebar + Content area).
- `src/app/account/page.js`: Trang tổng quan (mặc định chuyển hướng hoặc hiển thị Profile).
- `src/app/account/profile/page.js`: Trang chỉnh sửa thông tin cá nhân.
- `src/app/account/bookings/page.js`: Trang danh sách lịch sử đặt chỗ.
- `src/app/account/wishlist/page.js`: Trang danh sách yêu thích.
- `src/app/account/reviews/page.js`: Trang quản lý các đánh giá đã viết.
- `src/components/account/AccountSidebar.jsx`: Thanh điều hướng bên cho Dashboard.
- `src/components/account/ProfileForm.jsx`: Form cập nhật thông tin cá nhân.
- `src/components/account/BookingList.jsx`: Component hiển thị danh sách đặt chỗ.
- `src/components/account/WishlistList.jsx`: Component hiển thị danh sách yêu thích.
- `src/components/account/ReviewModal.jsx`: Modal cho phép người dùng viết đánh giá cho booking đã hoàn thành.

[Functions]
Bổ sung và cập nhật các hàm xử lý dữ liệu trong `src/lib/firestore.js`.

- `getUserBookings(userId)`: Đã có, cần kiểm tra logic hiển thị.
- `createReview(reviewData)`: Đã có, tích hợp vào UI.
- `updateProfileData(uid, data)`: Đã có trong `auth.js` (gọi `upsertUserProfile`).
- `getWishlistItems(userId)`: Lấy chi tiết các service trong mảng wishlist của user.

[Classes]
Không sử dụng class. Sử dụng React Functional Components và Hooks.

[Dependencies]
Sử dụng các thư viện hiện có.

- `lucide-react`: Cho các icon trong Sidebar.
- `react-hook-form`: Xử lý Profile Form.
- `sweetalert2`: Hiển thị thông báo thành công/lỗi.

[Implementation Order]
Thực hiện theo các bước tuần tự để đảm bảo tính ổn định.

1. Thiết lập cấu trúc thư mục và layout cơ bản cho `/account`.
2. Phát triển `AccountSidebar` và tích hợp vào layout.
3. Triển khai tab `Profile` với form chỉnh sửa thông tin (tích hợp `updateProfileData`).
4. Triển khai tab `Bookings` hiển thị danh sách từ Firestore.
5. Triển khai tab `Wishlist` hiển thị các tour/hotel đã lưu.
6. Tích hợp tính năng "Viết đánh giá" cho các booking có trạng thái `completed`.
7. Cập nhật `memory-bank` sau khi hoàn thành.

task_progress Items:
- [ ] Step 1: Create Account Layout and Sidebar
- [ ] Step 2: Implement Profile management tab
- [ ] Step 3: Implement Booking history tab
- [ ] Step 4: Implement Wishlist tab
- [ ] Step 5: Implement Review submission logic
- [ ] Step 6: Update Firebase Security Rules documentation