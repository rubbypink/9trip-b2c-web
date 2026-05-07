# Tech Context: 9Trip B2C

> **Last updated:** 05/05/2026

---

## 1. Tech Stack

| Layer        | Technology        | Version        | Ghi chú                                       |
| ------------ | ----------------- | -------------- | --------------------------------------------- |
| Framework    | Next.js           | 16             | **App Router ONLY** — không dùng Pages Router |
| Frontend     | React             | 19             | useOptimistic, useActionState, Server Actions |
| Language     | JavaScript (ES6+) | —              | **TypeScript KHÔNG dùng** — JSDoc thay thế    |
| Styling      | Tailwind CSS      | v4             | Utility-first, không dùng CSS modules         |
| Backend/BaaS | Firebase          | v11+ (Modular) | Client SDK + Admin SDK (server-side)          |
| State Mgmt   | Zustand           | v5             | Persist middleware cho cart                   |
| Hosting      | Vercel            | —              | Edge functions, ISR, CDN                      |

## 2. Ràng buộc Kỹ thuật (Code Standards)

### 2.1. KHÔNG ĐƯỢC LÀM

- ❌ **Không dùng Pages Router** (`pages/` directory) — chỉ App Router.
- ❌ **Không dùng TypeScript** — chỉ JavaScript + JSDoc.
- ❌ **Không tạo Admin Dashboard** — không có route `/admin`, `/wp-admin`.
- ❌ **Không tạo Partner Dashboard** — không có route `/partner`.
- ❌ **Không có role nào khác ngoài `customer`** trong Firebase Auth custom claims.
- ❌ **Không dùng CSS modules, styled-components** — chỉ Tailwind CSS v4.
- ❌ **Không dùng Suspense** cho nội dung chính — chỉ cho phần phụ.
- ❌ **Không trả kết quả giả** — luôn dùng data thật, không hardcoded data khi report hay output.

### 2.2. BẮT BUỘC LÀM

- ✅ **Server Components mặc định** — chỉ thêm `'use client'` khi cần hooks/event handlers.
- ✅ **React 19 patterns:** useOptimistic, useFormStatus, useActionState, Server Actions.
- ✅ **ISR/SSG cho SEO:** generateMetadata, generateStaticParams, revalidate.
- ✅ **JSON-LD Schema.org** cho mọi trang chi tiết (Tour → TouristTrip, Hotel → Hotel...).
- ✅ **Inventory Hold với TTL 10 phút** trước khi tạo booking.
- ✅ **Payment Webhook** xác thực signature trước khi xử lý.
- ✅ **Responsive mobile-first** (Tailwind responsive utilities).

# Product Context: 9Trip B2C

> **Last updated:** 05/05/2026

## 1 User Flow Chính

```
[Google Search] → [Landing Page] → [Xem chi tiết, ảnh, review]
→ [Chọn ngày + số khách] → [Xem giá realtime] → [Đặt ngay]
→ [Inventory Hold 10 phút] → [Điền thông tin + Thanh toán]
→ [Webhook xác nhận] → [Email xác nhận] → [Đi tour]
→ [Về viết review] → [Quay lại đặt tour khác]
```

## 2. Quy tắc Nghiệp vụ (Business Rules)

1. **Inventory Hold** — Khi khách click "Đặt ngay", tạo hold document với TTL 10 phút. Nếu hết thời gian → tự xóa. Nếu thanh toán thành công → xóa hold + tạo booking.
2. **Availability** = `totalSlots - confirmedBookings - activeHolds` (query real-time).
3. **Giá cả** — Hiển thị giá tổng cuối cùng trước khi thanh toán (bao gồm thuế, phí). Không hidden fee.
4. **Checkout** — Guest checkout được phép (không bắt buộc đăng nhập), nhưng có ưu đãi cho user đã đăng nhập.
5. **Payment Webhook** — Tất cả gateway (VNPay, MoMo, PayPal) dùng chung 1 handler `/webhooks/payment`. GET cho return redirect, POST cho IPN.
6. **ERP Webhook** — `/webhooks/erp` nhận data từ ERP push. Web không tự ghi collection dịch vụ.

## 3. Key Constants

- **TTL Inventory Hold**: 10 phút
- **ISR Revalidate**: 3600 giây (1 giờ)
- **PAGE_SIZE**: 20 items/trang
- **Site URL**: `https://9tripphuquoc.com`
- **ERP Webhook Secret**: từ env `ERP_WEBHOOK_SECRET`

## 4. Shared Components Index

| Component             | Vị trí                                      | Dùng cho                             |
| --------------------- | ------------------------------------------- | ------------------------------------ |
| `Badge`               | `components/shared/Badge.jsx`               | Badges cho tours, hotels, activities |
| `LoadingSpinner`      | `components/shared/LoadingSpinner.jsx`      | Loading skeleton                     |
| `EmptyState`          | `components/shared/EmptyState.jsx`          | Trạng thái rỗng                      |
| `StarRating`          | `components/shared/StarRating.jsx`          | Hiển thị sao                         |
| `PriceDisplay`        | `components/shared/PriceDisplay.jsx`        | Giá + discount badge                 |
| `GalleryWithLightbox` | `components/shared/GalleryWithLightbox.jsx` | Gallery ảnh + lightbox               |
| `GoogleMap`           | `components/shared/GoogleMap.jsx`           | Bản đồ (lazy-loaded)                 |
| `SearchFormPopup`     | `components/shared/SearchFormPopup.jsx`     | Form tìm kiếm popup                  |
| `ImageCarousel`       | `components/shared/ImageCarousel.jsx`       | Snap-scroll gallery carousel         |

## Important Patterns

- **Alias:** `@/` map đến `src/`
- **JSDoc:** for all function, component, and complex object.
- **Firebase modular:** Import from `firebase/auth`, `firebase/firestore`, etc.
- **Server/Client boundary:** Use wrapper pattern (AuthWrapper) to wrap client context in server layout.
- **Tab pattern:** `data-tab-panel` attribute + CSS `hidden` class for SEO-friendly tab content
- **ISR:** All detail pages use `revalidate = 3600`
- **JSON-LD:** Always generated server-side in page.js, never in client components
