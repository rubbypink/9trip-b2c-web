# Project Brief: 9Trip B2C

> **Last updated:** 05/05/2026

---

## 1. Vision

9Trip B2C là nền tảng đặt Tour & Khách sạn trực tuyến (B2C) — chuyển đổi toàn bộ WordPress Theme "Traveler" sang kiến trúc **Headless CMS** hiện đại: Next.js 16 + React 19 + Firebase + Tailwind CSS v4.

## 2. Nguyên tắc Kiến trúc Cốt lõi

- **Web KHÔNG phải CMS** — Web chỉ là lớp giao diện hiển thị và đặt vé.
- **ERP là single source of truth** — Mọi dữ liệu dịch vụ (tours, hotels, rooms, activities, cars, locations) đều do ERP đồng bộ 1 chiều xuống Firestore. Web chỉ READ.
- **Không có Admin/Partner Dashboard** — Không route `/admin`, `/partner`. Chỉ có role `customer`.
- **Server Components mặc định** — Chỉ thêm `'use client'` khi cần state, hooks, event handlers.
- **SEO-First** — Toàn bộ nội dung chính phải có trong HTML ban đầu (ISR/SSG + JSON-LD).
- **Mobile-First** — 60% traffic từ mobile, thiết kế mobile trước.

## 3. Mục tiêu Phát triển (Development Roadmap)

### Phase 0-14 ✅ Hoàn thành

Nền tảng cơ bản đã hoàn thành: Auth, Home, Tours, Checkout, Account, Hotels, Activities, Cars, Rentals, SEO/Performance, Admin SDK, Payment Webhooks, ERP Webhook.

### Phase Tiếp theo (Priorities)

1. **Production Deployment** — Vercel setup, custom domain, SSL, environment variables
2. **Stripe Integration** — Cần STRIPE_SECRET_KEY thật từ production
3. **Email Confirmation** — Booking confirmation emails (hiện placeholder)
4. **Real Data Seeding** — ERP sync dữ liệu thật thay vì seed data
5. **Performance Monitoring** — Web Vitals, Core Web Vitals tracking

### Strategic Direction

- **Tối ưu conversion** — Mỗi bước checkout phải mượt mà, tối giản, ít friction nhất có thể
- **Tốc độ là trên hết** — Page load < 2s, tương tác < 100ms
- **Minh bạch về giá** — Giá tổng cuối cùng hiện trước khi thanh toán (bao gồm thuế, phí)
- **Trust signals** — Badge verified, review thật, chính sách hủy rõ ràng

## 4. Phân giải Quyết định Kiến trúc (Architecture Decision Records)

| Quyết định | Lý do |
|---|---|
| JavaScript (không TypeScript) | Team quen JS, JSDoc đủ type safety, giảm rào cản |
| Zustand thay vì Redux | Nhẹ, ít boilerplate, persist middleware cho cart |
| Firestore TTL cho Inventory Hold | Đơn giản hơn Cloud Functions, tự động cleanup |
| Webhook route chung cho payment | Tránh duplicate code, dễ maintain |
| proxy.js thay middleware.js | Next.js 16 convention, build warning confirmed |
| Tab pattern: all content in HTML + CSS hidden | SEO: Google thấy tất cả tab content |
| Admin SDK cho server + Client SDK cho client | Giảm bundle size, tăng perf |
| ISR (revalidate=3600) cho hầu hết trang | Hotel/tour data thay đổi không thường xuyên |

## 5. Tham khảo

- Code base gốc: WordPress Theme "Traveler" by ShineTheme (v3.1.3) trong thư mục `_reference_wp`
- Xem `directory-index.md` để tìm file nhanh theo mục đích