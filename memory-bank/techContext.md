# Tech Context: 9Trip B2C

> **Last updated:** 05/05/2026

---

## 1. Tech Stack

| Layer        | Technology        | Version       | Ghi chú                                       |
| ------------ | ----------------- | ------------- | --------------------------------------------- |
| Framework    | Next.js           | 16            | **App Router ONLY** — không dùng Pages Router |
| Frontend     | React             | 19            | useOptimistic, useActionState, Server Actions  |
| Language     | JavaScript (ES6+) | —             | **TypeScript KHÔNG dùng** — JSDoc thay thế    |
| Styling      | Tailwind CSS      | v4            | Utility-first, không dùng CSS modules         |
| Backend/BaaS | Firebase          | v11+ (Modular) | Client SDK + Admin SDK (server-side)          |
| State Mgmt   | Zustand           | v5            | Persist middleware cho cart                    |
| Hosting      | Vercel            | —             | Edge functions, ISR, CDN                      |

### Dependencies Khác

- Firebase Admin SDK (server-side only)
- react-hook-form (checkout forms)

## 2. Ràng buộc Kỹ thuật (Code Standards)

### 2.1. KHÔNG ĐƯỢC LÀM

- ❌ **Không dùng Pages Router** (`pages/` directory) — chỉ App Router.
- ❌ **Không dùng TypeScript** — chỉ JavaScript + JSDoc.
- ❌ **Không tạo Admin Dashboard** — không có route `/admin`, `/wp-admin`.
- ❌ **Không tạo Partner Dashboard** — không có route `/partner`.
- ❌ **Không ghi vào collection read-only** (tours, hotels, rooms, activities, cars, locations, settings) từ web.
- ❌ **Không có role nào khác ngoài `customer`** trong Firebase Auth custom claims.
- ❌ **Không dùng Firebase Admin SDK từ client** — Admin SDK chỉ dùng server-side.
- ❌ **Không dùng CSS modules, styled-components** — chỉ Tailwind CSS v4.
- ❌ **Không dùng Suspense** cho nội dung chính — chỉ cho phần phụ.
- ❌ **Không trả kết quả giả** — luôn dùng data thật, không hardcoded.

### 2.2. BẮT BUỘC LÀM

- ✅ **JSDoc cho mọi function, component, Firebase payload**.
- ✅ **Server Components mặc định** — chỉ thêm `'use client'` khi cần hooks/event handlers.
- ✅ **React 19 patterns:** useOptimistic, useFormStatus, useActionState, Server Actions.
- ✅ **ISR/SSG cho SEO:** generateMetadata, generateStaticParams, revalidate.
- ✅ **JSON-LD Schema.org** cho mọi trang chi tiết (Tour → TouristTrip, Hotel → Hotel...).
- ✅ **Inventory Hold với TTL 10 phút** trước khi tạo booking.
- ✅ **Payment Webhook** xác thực signature trước khi xử lý.
- ✅ **Responsive mobile-first** (Tailwind responsive utilities).
- ✅ **Firestore Serialization** — luôn `serializeDoc()` trước khi truyền Firestore data xuống Client Component.
- ✅ **Tab Pattern** — tất cả tab content render trong HTML + `data-tab-panel` + CSS `hidden`.
- ✅ **Firebase modular imports** — `import { ... } from 'firebase/auth'`, không `import firebase from 'firebase'`.

## 3. Path Aliases (jsconfig.json)

```json
{ "compilerOptions": { "baseUrl": "src", "paths": { "@/*": ["./src/*"], "@/components/*": ["./src/components/*"], "@/lib/*": ["./src/lib/*"], "@/hooks/*": ["./src/hooks/*"] } } }
```

- `@/` → `src/`
- `@/components/*` → `src/components/*`
- `@/lib/*` → `src/lib/*`
- `@/hooks/*` → `src/hooks/*`

## 4. Environment Variables (.env.local)

**Firebase Config** (NEXT_PUBLIC_*)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

**Payment Gateways** (Server-only)
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- VNPay: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL`
- MoMo: `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`, `MOMO_ENDPOINT`
- PayPal: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`

**Site & Auth**
- `NEXT_PUBLIC_SITE_URL=https://9tripphuquoc.com`
- `ERP_WEBHOOK_SECRET` (cho ERP webhook validation)
```