# Product Context: 9Trip B2C

> **Last updated:** 05/05/2026

---

## 1. Giải quyết Vấn đề gì?

| Vấn đề | Giải pháp |
|---|---|
| WordPress chậm, khó bảo trì | Next.js + Vercel, codebase JS thuần |
| Backend & Frontend ràng buộc | Headless CMS — ERP sync 1 chiều xuống Firestore |
| Overbooking trong đặt tour/KS | Inventory Hold với Firestore TTL 10 phút |
| SEO kém trên SPA | ISR/SSG + JSON-LD Schema.org |
| Thanh toán hạn chế | Stripe + VNPay + Momo + PayPal + Cash |
| Không có quản lý tập trung | ERP nội bộ quản lý toàn bộ dữ liệu |

## 2. Domain Concepts

### 2.1. Dịch vụ (Services)

Hệ thống có 5 loại dịch vụ chính, tất cả đều read-only từ web (ERP sync):

| Service | Collection | Đặc điểm |
|---|---|---|
| **Tour** | `tours` + `tourPricing` subcollection | Multi-tier pricing (Tour ghép, Tour riêng) |
| **Hotel** | `hotels` + embedded `rooms[]` + `hotel_price_schedules` | Rooms embedded trong hotel doc, pricing tách riêng |
| **Activity** | `activities` + `activityPricing` subcollection | Multi-tier pricing theo gói |
| **Car** | `cars` | Đơn giản, 1 giá |
| **Rental** | `rentals` | Đơn giản, 1 giá |

### 2.2. Firestore Collections — Quyền Truy cập

| Collection | Web Read | Web Write | Ghi chú |
|---|---|---|---|
| `tours` | ✅ | ❌ | Read-only — ERP sync |
| `hotels` | ✅ | ❌ | Read-only — ERP sync |
| `rooms` | ✅ | ❌ | Read-only — ERP sync |
| `activities` | ✅ | ❌ | Read-only — ERP sync |
| `cars` | ✅ | ❌ | Read-only — ERP sync |
| `rentals` | ✅ | ❌ | Read-only — ERP sync |
| `locations` | ✅ | ❌ | Read-only — ERP sync |
| `settings` | ✅ | ❌ | Read-only — ERP sync |
| `coupons` | ✅ (active) | ❌ | Read active coupons only |
| `bookings` | ✅ (own) | ✅ (create) | Customer tạo booking, xem booking của mình |
| `reviews` | ✅ | ✅ (own) | Customer viết review cho booking đã đi |
| `users` | ✅ (own) | ✅ (own) | Customer đọc/ghi profile của chính mình |
| `notifications` | ✅ (own) | ❌ | Đọc thông báo, không tự tạo |
| `inventory_holds` | ❌ | ✅ (create) | Auto-create/xóa bởi hệ thống, TTL 10 phút |

### 2.3. Mối quan hệ (Relationships)

```
tours/{tourId}
  └── tourPricing/{priceId}          ← Subcollection (multi-tier pricing)

hotels/{hotelId}
  ├── rooms: [...]                    ← Embedded array trong hotel doc
  └── hotel_price_schedules/{id}      ← Collection riêng (pricing theo thời gian)

activities/{activityId}
  └── activityPricing/{priceId}       ← Subcollection (multi-tier pricing)

bookings/{bookingId}
  └── Ref đến serviceId + serviceType  ← Polymorphic reference

inventory_holds/{holdId}
  └── expiresAt: Timestamp + TTL      ← Tự động xóa sau 10 phút

users/{uid}
  └── Thông tin profile khách hàng

reviews/{reviewId}
  └── Ref đến bookingId + serviceId    ← Poly reference
```

## 3. User Flow Chính

```
[Google Search] → [Landing Page] → [Xem chi tiết, ảnh, review]
→ [Chọn ngày + số khách] → [Xem giá realtime] → [Đặt ngay]
→ [Inventory Hold 10 phút] → [Điền thông tin + Thanh toán]
→ [Webhook xác nhận] → [Email xác nhận] → [Đi tour]
→ [Về viết review] → [Quay lại đặt tour khác]
```

## 4. Quy tắc Nghiệp vụ (Business Rules)

1. **Inventory Hold** — Khi khách click "Đặt ngay", tạo hold document với TTL 10 phút. Nếu hết thời gian → tự xóa. Nếu thanh toán thành công → xóa hold + tạo booking.
2. **Availability** = `totalSlots - confirmedBookings - activeHolds` (query real-time).
3. **Giá cả** — Hiển thị giá tổng cuối cùng trước khi thanh toán (bao gồm thuế, phí). Không hidden fee.
4. **Checkout** — Guest checkout được phép (không bắt buộc đăng nhập), nhưng có ưu đãi cho user đã đăng nhập.
5. **Payment Webhook** — Tất cả gateway (Stripe, VNPay, MoMo, PayPal) dùng chung 1 handler `/webhooks/payment`. GET cho return redirect, POST cho IPN.
6. **ERP Webhook** — `/webhooks/erp` nhận data từ ERP push. Web không tự ghi collection dịch vụ.

## 5. Key Constants

- **TTL Inventory Hold**: 10 phút
- **ISR Revalidate**: 3600 giây (1 giờ)
- **PAGE_SIZE**: 20 items/trang
- **Site URL**: `https://9tripphuquoc.com`
- **ERP Webhook Secret**: từ env `ERP_WEBHOOK_SECRET`

## 6. Shared Components Index

| Component | Vị trí | Dùng cho |
|---|---|---|
| `Badge` | `components/shared/Badge.jsx` | Badges cho tours, hotels, activities |
| `LoadingSpinner` | `components/shared/LoadingSpinner.jsx` | Loading skeleton |
| `EmptyState` | `components/shared/EmptyState.jsx` | Trạng thái rỗng |
| `StarRating` | `components/shared/StarRating.jsx` | Hiển thị sao |
| `PriceDisplay` | `components/shared/PriceDisplay.jsx` | Giá + discount badge |
| `GalleryWithLightbox` | `components/shared/GalleryWithLightbox.jsx` | Gallery ảnh + lightbox |
| `GoogleMap` | `components/shared/GoogleMap.jsx` | Bản đồ (lazy-loaded) |
| `SearchFormPopup` | `components/shared/SearchFormPopup.jsx` | Form tìm kiếm popup |
| `ImageCarousel` | `components/shared/ImageCarousel.jsx` | Snap-scroll gallery carousel |