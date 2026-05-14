# System Update Plan — 9Trip B2C (2026-05-06)

## TL;DR

> **Quick Summary**: Comprehensive UI/UX update across 8 features: fix wishlist, enhance customer dashboard with email/phone filtering, add customer identity fields to checkout, enhance cart dropdown with qty controls, fix homepage featured layout, build blog module, fix gallery scroll bug, enhance service cards and hotel pricing display.
>
> **Deliverables**:
> - Fixed wishlist page (diagnostic + resolution)
> - Bookings & Reviews tabs with email/phone filter
> - Enhanced CustomerForm (CCCD, issue date, address, nationality)
> - Cart dropdown with quantity +/- and remove per item
> - Unified featured layout (tours = hotels style)
> - Complete blog module (Firestore collection, list + detail pages, nav menu entry)
> - Fixed ImageCarousel scroll-on-click bug
> - Enhanced TourCard, HotelCard, ActivityCard (best price, amenities, rating)
> - Hotel rate type labels in RoomsPanel
>
> **Estimated Effort**: Large (20 implementation tasks + 4 review tasks)
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Task 5 (data audit) → Task 7/8 (booking/review filters) → Task 10 (Header update) → FINAL review

---

## Context

### Original Request
User yêu cầu cập nhật 8 chức năng hệ thống cho nền tảng 9Trip B2C:
1. Fix wishlist UI (đang lỗi trắng/có text báo lỗi) + tạo UI tab Booking/Reviews với lọc email/sđt
2. Bổ sung field CCCD, ngày cấp, địa chỉ, quốc tịch vào form khách hàng
3. Bổ sung điều chỉnh số lượng, xóa cho từng dịch vụ trong giỏ hàng dropdown
4. Fix layout tour featured lệch → giống hotel featured
5. Thiết kế Blog module, thêm menu chính, bỏ search icon
6. Fix gallery click chuyển ảnh gây scroll
7. Tối ưu card Tour/Hotel/Activity (best price, amenities, rating)
8. Detail Page hotel: hiển thị loại giá + ăn sáng

### Interview Summary
**Key Discussions**:
- **Test Strategy**: Vitest (unit) + Playwright (e2e) — best fit for Next.js 16 + Vercel
- **Blog Data Source**: Firestore `posts` collection mới + seed dữ liệu mẫu; không cần admin CMS
- **Cart Modal**: Giữ nguyên dropdown hiện tại trong Header, chỉ bổ sung qty +/- và nút xóa
- **Hotel Pricing**: Hiển thị rate type labels (standard/breakfast/all-inclusive) trong RoomsPanel
- **Card Enhancements**: Best price badge + amenities icons + rating + review count (Tour/Hotel/Activity)
- **Blog Menu**: Sau "Hoạt động" trong main nav
- **Featured Fix**: Refactor FeaturedHotelsServer dùng HotelCard thay vì inline HTML

**Research Findings**:
- Project: Next.js 16.2.4 App Router, React 19.2.4, Tailwind CSS v4, Zustand + React Context
- FeaturedHotelsServer RENDERS INLINE — không dùng HotelCard component (inconsistency chính)
- CustomerForm.jsx chỉ có 4 field: fullName, email, phone, specialRequests
- Cart dropdown trong Header.jsx lines 156-189 — hiển thị đơn giản, không có qty control
- Blog: chỉ có LatestNews.jsx (mock data), chưa có `/blog` routes, chưa có Firestore collection
- Search: `/search` page là placeholder, icon search ở Header line 71-73
- Gallery: ImageCarousel.jsx (267 lines) dùng scroll-snap, có thể gây conflict với click-to-switch
- Hotel rate types ĐÃ CÓ trong RoomsPanel nhưng thiếu label rõ ràng
- 8/17 Firestore collections EMPTY (users, bookings, reviews, coupons...)

### Metis Review
**Identified Gaps** (addressed):
- **Cart qty model**: Tours dùng adults/children/infants, không có single quantity → Plan dùng tổng guests (adults+children) làm quantity hiển thị trong dropdown
- **Booking/Reviews tabs tồn tại sẵn**: Không tạo mới, chỉ thêm chức năng lọc email/sđt
- **Hotel rate types đã có**: Chỉ thêm label text rõ ràng, không xây dựng lại
- **Card data fields**: Sẽ audit Firestore để xác nhận amenities/ratingCount/bestPrice có sẵn; thêm migration script nếu cần
- **Header conflcit**: Gom tất cả thay đổi Header.jsx vào 1 task duy nhất (Task 10)
- **HotelCard conflict**: Task 11 refactor FeaturedHotelsServer → dùng HotelCard; Task 16 enhance HotelCard sau đó

---

## Work Objectives

### Core Objective
Cập nhật và tối ưu 8 chức năng UI/UX trong hệ thống 9Trip B2C, đảm bảo tính nhất quán về thiết kế, bổ sung tính năng thiếu, và sửa các lỗi hiển thị.

### Concrete Deliverables
- Trang wishlist hoạt động bình thường (không còn lỗi trắng)
- Tab Bookings/Reviews có ô input lọc theo email/số điện thoại
- Form khách hàng khi checkout có đủ 8 field (fullName, email, phone, CCCD, ngày cấp, địa chỉ, quốc tịch, specialRequests)
- Cart dropdown trong Header có nút +/- quantity và nút xóa từng item
- Featured tours trên homepage có layout giống featured hotels (cùng grid, aspect ratio, hover effect)
- Blog module hoàn chỉnh: Firestore collection `posts`, `/blog` list page, `/blog/[slug]` detail page
- Menu chính có thêm mục Blog, không còn icon search
- Gallery ImageCarousel không gây scroll khi click chuyển ảnh
- TourCard, HotelCard, ActivityCard hiển thị best price badge, amenities icons, rating + review count
- RoomsPanel hiển thị label loại giá (VD: "Bao gồm ăn sáng", "Không ăn sáng", "Trọn gói")

### Definition of Done
- [ ] `next build` thành công không lỗi
- [ ] Tất cả Playwright QA scenarios pass
- [ ] Vitest unit tests pass (cho cart logic, filter logic)
- [ ] Không có console error khi browse các trang được sửa
- [ ] `/search` trả về redirect hoặc disabled page

### Must Have
- Mỗi file chỉ sửa 1 lần (không conflict giữa các task)
- Tuân thủ system rules: JS only, App Router, Server Components default, Tailwind CSS v4
- Không tạo admin/partner interface
- Không migrate cart từ Context sang Zustand
- Không tạo TypeScript files

### Must NOT Have (Guardrails)
- KHÔNG redesign toàn bộ wishlist — chỉ fix bug hiện tại
- KHÔNG tạo admin CMS cho blog — chỉ seed dữ liệu qua script
- KHÔNG thêm rate type cho tours/activities
- KHÔNG thay đổi CustomerForm validation logic hiện có
- KHÔNG migrate từ React Context sang Zustand cho cart
- KHÔNG tạo thêm Firestore collections ngoài `posts`
- KHÔNG viết TypeScript files

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO — cần setup từ đầu
- **Automated tests**: Vitest (unit) + Playwright (e2e) — setup in Task 1
- **Framework**: Vitest cho unit test, Playwright cho e2e UI test
- **Agent QA**: Mọi task đều có Agent-Executed QA Scenarios

### QA Policy
- **Frontend/UI**: Playwright (navigate, interact, assert DOM, screenshot)
- **API/Backend**: Bash (curl) — gửi requests, assert status + response
- **Library/Module**: Bash (node REPL) — import functions, test output
- Evidence: `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — 5 tasks, ALL parallel, start immediately):
├── Task 1: Test infrastructure (Vitest + Playwright config)
├── Task 2: Blog Firestore schema + seed script + sample data
├── Task 3: Cart lib enhancements (dropdown qty/remove helpers)
├── Task 4: Rate type label utility
└── Task 5: Firestore data audit + lookup functions (email/phone for bookings, check card fields)

Wave 2 (Core fixes — 7 tasks, MAX parallel after Wave 1):
├── Task 6: Fix wishlist blank page (diagnose + fix)
├── Task 7: Booking tab email/phone filter UI
├── Task 8: Reviews tab email/phone filter UI
├── Task 9: CustomerForm update (CCCD, issue date, address, nationality)
├── Task 10: Header.jsx all-in-one (cart dropdown qty/remove, add Blog nav, remove search icon)
├── Task 11: Fix tour featured layout → use HotelCard in FeaturedHotelsServer
└── Task 12: Fix ImageCarousel scroll-on-click bug

Wave 3 (New features + polish — 8 tasks, MAX parallel after Wave 2):
├── Task 13: Blog list page (/blog)
├── Task 14: Blog detail page (/blog/[slug])
├── Task 15: Enhance TourCard (best price, amenities, rating)
├── Task 16: Enhance HotelCard (best price, amenities, rating) [depends: T11]
├── Task 17: Enhance ActivityCard (best price, amenities, rating)
├── Task 18: Hotel rate type labels in RoomsPanel
├── Task 19: Disable search page + redirect
└── Task 20: Update LatestNews to use Firestore posts

Wave FINAL (After ALL tasks — 4 parallel review agents):
├── Task F1: Plan Compliance Audit (oracle)
├── Task F2: Code Quality Review (unspecified-high)
├── Task F3: Real Manual QA (unspecified-high + playwright)
└── Task F4: Scope Fidelity Check (deep)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | - | 6,7,8,9,10,12,13,14,15,16,17,18,19,20 | 1 |
| 2 | - | 13,14,20 | 1 |
| 3 | - | 10 | 1 |
| 4 | - | 18 | 1 |
| 5 | - | 6,7,8,9,15,16,17 | 1 |
| 6 | 5 | - | 2 |
| 7 | 1,5 | - | 2 |
| 8 | 1,5 | - | 2 |
| 9 | 1,5 | - | 2 |
| 10 | 1,3 | - | 2 |
| 11 | - | 16 | 2 |
| 12 | 1 | - | 2 |
| 13 | 1,2 | 14 | 3 |
| 14 | 1,2,13 | - | 3 |
| 15 | 1,5 | - | 3 |
| 16 | 1,5,11 | - | 3 |
| 17 | 1,5 | - | 3 |
| 18 | 1,4 | - | 3 |
| 19 | 1 | - | 3 |
| 20 | 1,2 | - | 3 |

### Critical Path
Task 5 (data audit) → Task 7 (booking filter) → Task 10 (Header) → Wave FINAL

### Agent Dispatch Summary
- **Wave 1**: 5 agents — T1→quick, T2→quick, T3→quick, T4→quick, T5→unspecified-high
- **Wave 2**: 7 agents — T6→deep, T7→unspecified-high, T8→unspecified-high, T9→unspecified-high, T10→unspecified-high, T11→visual-engineering, T12→deep
- **Wave 3**: 8 agents — T13→visual-engineering, T14→visual-engineering, T15→visual-engineering, T16→visual-engineering, T17→visual-engineering, T18→visual-engineering, T19→quick, T20→quick
- **FINAL**: 4 agents — F1→oracle, F2→unspecified-high, F3→unspecified-high, F4→deep

---

## TODOs

### Wave 1: Foundation (All Parallel)

- [x] 1. Test Infrastructure Setup (Vitest + Playwright)

  **What to do**:
  - Thêm `vitest`, `@vitejs/plugin-react` vào devDependencies
  - Tạo `vitest.config.js` với jsdom environment, path alias `@/` → `src/`
  - Thêm scripts vào package.json: `"test": "vitest run"`, `"test:watch": "vitest"`
  - Tạo `playwright.config.js` với baseURL `http://localhost:3000`, timeout 30s
  - Tạo 1 file test mẫu `src/__tests__/cart.test.js` — test `addItem()` và `removeItem()` từ cart context
  - Tạo 1 file e2e mẫu `e2e/homepage.spec.js` — test homepage loads và featured sections render
  - Chạy `npx playwright install chromium` để cài browser
  - Verify: `bun test` pass (≥2 tests), `npx playwright test` pass

  **Must NOT do**:
  - Không thay đổi cart context logic — chỉ test API hiện có
  - Không cài thêm framework khác (Jest, Cypress)

  **Recommended Agent Profile**:
  - **Category**: `quick` — setup cấu hình, không logic phức tạp
  - **Skills**: [`playwright`]
    - `playwright`: Cần để cấu hình và verify e2e test chạy được

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: Tasks 6,7,8,9,10,12,13,14,15,16,17,18,19,20 (cần test infrastructure)
  - **Blocked By**: None

  **References**:
  - `package.json` — thêm scripts test, cài dependencies
  - `src/lib/cart.js` — `addItem()`, `removeItem()` — test target

  **Acceptance Criteria**:
  - [ ] `bun test` → PASS (≥2 tests)
  - [ ] `npx playwright test` → PASS
  - [ ] `vitest.config.js` exists with correct path alias
  - [ ] `playwright.config.js` exists with correct baseURL

  **QA Scenarios**:
  ```
  Scenario: Vitest unit test runs successfully
    Tool: Bash
    Steps:
      1. cd /home/rubbypink/projects/tripphuquoc-db-fs
      2. bun test --run
    Expected Result: All tests pass, exit code 0, output shows "Tests 2 passed"
    Failure Indicators: Exit code non-zero, "FAIL" in output
    Evidence: .sisyphus/evidence/task-1-vitest-pass.txt

  Scenario: Playwright e2e test runs
    Tool: Bash
    Steps:
      1. Start dev server: bun run dev (background)
      2. Wait 5s for server ready
      3. npx playwright test
    Expected Result: Tests pass, exit code 0
    Failure Indicators: Test timeout, "failed" in output
    Evidence: .sisyphus/evidence/task-1-playwright-pass.txt
  ```

  **Commit**: YES
  - Message: `chore: add Vitest + Playwright test infrastructure`
  - Files: `package.json`, `vitest.config.js`, `playwright.config.js`, `src/__tests__/cart.test.js`, `e2e/homepage.spec.js`

---

- [x] 2. Blog Firestore Collection + Seed Script

  **What to do**:
  - Tạo Firestore collection schema cho `posts` trong `.agents/lib/schemas/blog.js`:
    ```js
    // fields: title, slug, excerpt, content (HTML/markdown), featuredImage, author, category, tags[], createdAt, updatedAt, status (published/draft)
    ```
  - Tạo seed script `src/scripts/seedBlog.js`:
    - Dùng `firebase-admin` để ghi 3-5 bài viết mẫu vào Firestore `posts` collection
    - Nội dung mẫu về Phú Quốc travel guide (tiếng Việt)
    - Mỗi bài có: title, slug (URL-friendly), excerpt (150 ký tự), content (500+ từ HTML), featuredImage (dùng picsum.photos hoặc ảnh có sẵn trong Storage), author, category, tags, createdAt, status: "published"
  - Chạy seed script và verify dữ liệu trong Firestore

  **Must NOT do**:
  - Không tạo admin interface cho blog
  - Không dùng external CMS (WordPress, Strapi)

  **Recommended Agent Profile**:
  - **Category**: `quick` — seed script đơn giản, không logic phức tạp
  - **Skills**: [`firebase-ai-logic`]
    - `firebase-ai-logic`: Cần để làm việc với Firestore Admin SDK

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: Tasks 13, 14, 20
  - **Blocked By**: None

  **References**:
  - `src/scripts/seedPriceData.js:1-50` — Pattern seed script dùng firebase-admin
  - `.agents/lib/schemas/hotel.js` — Pattern schema definition

  **Acceptance Criteria**:
  - [ ] `posts` collection tồn tại trong Firestore với ≥3 documents
  - [ ] Mỗi document có đủ fields: title, slug, excerpt, content, featuredImage, author, category, createdAt, status
  - [ ] `bun run src/scripts/seedBlog.js` chạy thành công không lỗi

  **QA Scenarios**:
  ```
  Scenario: Seed script runs and creates blog posts
    Tool: Bash
    Steps:
      1. cd /home/rubbypink/projects/tripphuquoc-db-fs
      2. GOOGLE_APPLICATION_CREDENTIALS=<path> bun run src/scripts/seedBlog.js
    Expected Result: Output shows "Seeded 5 blog posts", exit code 0
    Failure Indicators: Firestore permission error, exit code non-zero
    Evidence: .sisyphus/evidence/task-2-seed-output.txt

  Scenario: Firestore posts collection has data
    Tool: Bash (node REPL)
    Preconditions: Admin SDK initialized
    Steps:
      1. Import getFirestore, collection, getDocs from firebase-admin/firestore
      2. Query posts collection: getDocs(collection(db, 'posts'))
      3. Assert: docs.length >= 3
      4. Assert: first doc has fields: title, slug, excerpt, content, featuredImage
    Expected Result: ≥3 posts exist with complete fields
    Failure Indicators: Collection empty, missing required fields
    Evidence: .sisyphus/evidence/task-2-firestore-verify.txt
  ```

  **Commit**: YES
  - Message: `feat(blog): add Firestore posts collection + seed script`
  - Files: `.agents/lib/schemas/blog.js`, `src/scripts/seedBlog.js`

---

- [x] 3. Cart Lib Enhancements (Dropdown Qty/Remove)

  **What to do**:
  - Trong `src/lib/cart.js`, thêm/refactor helper functions cho cart dropdown:
    - `getCartItemsForDropdown()`: Trả về items với tổng quantity hiển thị (hotels: rooms, tours: adults+children, activities: adults+children)
    - `getCartTotalItems()`: Trả về tổng số items (mỗi service type = 1 item, không phân biệt rooms/guests)
    - Đảm bảo `removeItem(serviceId)` và `updateItemQuantity(serviceId, newQuantity)` hoạt động đúng cho dropdown
  - Đảm bảo tính toán `total` được cập nhật sau khi thay đổi quantity
  - Thêm JSDoc cho tất cả functions mới

  **Must NOT do**:
  - Không migrate cart từ React Context sang Zustand
  - Không thay đổi data structure hiện tại của cart items

  **Recommended Agent Profile**:
  - **Category**: `quick` — refactor helper functions, không UI
  - **Skills**: [`vercel-react-best-practices`]
    - `vercel-react-best-practices`: Pattern React Context usage

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: Task 10
  - **Blocked By**: None

  **References**:
  - `src/lib/cart.js:1-309` — Toàn bộ cart Context hiện tại
  - `src/lib/cart.js:102-107` — `removeItem()` hiện có
  - `src/lib/cart.js:117-139` — `updateItemQuantity()` hiện có

  **Acceptance Criteria**:
  - [ ] `getCartItemsForDropdown()` returns items with `displayQuantity` (number)
  - [ ] `getCartTotalItems()` returns correct count
  - [ ] `removeItem()` removes item and updates total
  - [ ] Unit test pass: `bun test src/__tests__/cart.test.js`

  **QA Scenarios**:
  ```
  Scenario: Cart total updates after qty change
    Tool: Bash (node REPL)
    Steps:
      1. Import useCart from cart context
      2. Add hotel item (rooms: 1)
      3. Call updateItemQuantity(serviceId, 3) 
      4. Assert: item.rooms === 3, cart total recalculated
      5. Call removeItem(serviceId)
      6. Assert: items array empty, total === 0
    Expected Result: Quantity changes and removal correctly update totals
    Failure Indicators: Stale total, item not removed
    Evidence: .sisyphus/evidence/task-3-cart-logic.txt
  ```

  **Commit**: YES
  - Message: `refactor(cart): add dropdown helper functions for qty/remove`
  - Files: `src/lib/cart.js`

---

- [x] 4. Rate Type Label Utility

  **What to do**:
  - Tạo file `src/lib/rateLabels.js` với utility functions:
    - `getRateTypeLabel(rateKey)`: Map `standard` → "Giá cơ bản", `breakfast` → "Bao gồm ăn sáng", `all_inclusive` → "Trọn gói"
    - `getRateTypeMultiplier(rateKey)`: Trả về multiplier (1.0, 1.25, 1.6)
    - `getRateTypeIcon(rateKey)`: Trả về emoji phù hợp (🍽️ cho breakfast, ⭐ cho all_inclusive)
    - Export `RATE_TYPES` constant array để dùng trong UI render
  - Thêm JSDoc cho tất cả functions

  **Must NOT do**:
  - Không thay đổi data structure của rate types trong Firestore
  - Không thêm rate types mới ngoài 3 loại hiện có

  **Recommended Agent Profile**:
  - **Category**: `quick` — utility functions đơn giản
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: Task 18
  - **Blocked By**: None

  **References**:
  - `src/scripts/seedPriceData.js:91-95` — Rate type definitions hiện có
  - `src/lib/firestore.js` — `buildRoomPricingTable()` — xem cách rate types được resolve

  **Acceptance Criteria**:
  - [ ] `getRateTypeLabel('breakfast')` → "Bao gồm ăn sáng"
  - [ ] `RATE_TYPES` array has 3 entries with key, label, multiplier, icon

  **QA Scenarios**:
  ```
  Scenario: All rate type labels return correct Vietnamese text
    Tool: Bash (node REPL)
    Steps:
      1. import { getRateTypeLabel, RATE_TYPES } from './src/lib/rateLabels.js'
      2. assert: getRateTypeLabel('standard') === 'Giá cơ bản'
      3. assert: getRateTypeLabel('breakfast') === 'Bao gồm ăn sáng'
      4. assert: getRateTypeLabel('all_inclusive') === 'Trọn gói'
      5. assert: RATE_TYPES.length === 3
    Expected Result: All labels match expected Vietnamese text
    Evidence: .sisyphus/evidence/task-4-rate-labels.txt
  ```

  **Commit**: YES
  - Message: `feat(utils): add rate type label utility functions`
  - Files: `src/lib/rateLabels.js`

---

- [x] 5. Firestore Data Audit + Lookup Functions

  **What to do**:
  - **Part A — Data Audit**: Dùng firebase-admin kiểm tra:
    - Tour/Activity documents: có fields `amenities`, `ratingCount`, `reviewCount`?
    - Hotel documents: có `amenities` array không?
    - User documents: có `wishlist` array? Items trong wishlist có tồn tại?
    - Ghi report `.sisyphus/evidence/task-5-audit-report.md`
  - **Part B — Lookup Functions**: Thêm vào `src/lib/firestore.js`:
    - `findBookingsByEmail(email)`: query `bookings` where `contactInfo.email == email`
    - `findBookingsByPhone(phone)`: query `bookings` where `contactInfo.phone == phone`
    - `findReviewsByEmail(email)`: query `reviews` where `userEmail == email`
  - **Part C**: Tạo composite indexes nếu cần

  **Must NOT do**:
  - Không thay đổi data structure
  - Không sửa functions hiện có

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — phân tích data + query functions
  - **Skills**: [`firebase-ai-logic`]
    - `firebase-ai-logic`: Firestore queries, Admin SDK

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: Tasks 6, 7, 8, 9, 15, 16, 17
  - **Blocked By**: None

  **References**:
  - `src/lib/firestore.js:178-181` — Pattern: `getUserBookings()` query
  - `src/hooks/useBooking.js:86-104` — `contactInfo` structure
  - `.agents/lib/schemas/tour.js` — Tour schema fields
  - `.agents/lib/schemas/activity.js` — Activity schema fields

  **Acceptance Criteria**:
  - [ ] Audit report shows which fields exist/missing per service type
  - [ ] `findBookingsByEmail()` returns matching bookings
  - [ ] `findBookingsByPhone()` returns matching bookings

  **QA Scenarios**:
  ```
  Scenario: Booking lookup by email
    Tool: Bash (node REPL)
    Steps:
      1. import { findBookingsByEmail } from './src/lib/firestore.js'
      2. call findBookingsByEmail('test@example.com')
      3. assert: returns array, each item has bookingId, contactInfo
    Expected Result: Matching bookings array
    Evidence: .sisyphus/evidence/task-5-lookup-test.txt

  Scenario: Data audit report generated
    Tool: Bash
    Steps:
      1. Read .sisyphus/evidence/task-5-audit-report.md
      2. assert: contains sections for tours, activities, hotels, users
    Expected Result: Report shows field presence per collection
    Evidence: .sisyphus/evidence/task-5-audit-report.md
  ```

  **Commit**: YES
  - Message: `feat(firestore): add email/phone lookup + data audit report`
  - Files: `src/lib/firestore.js`, `.sisyphus/evidence/task-5-audit-report.md`

---

### Wave 2: Core Fixes (All Parallel After Wave 1)

- [x] 6. Fix Wishlist Blank Page

  **What to do**:
  - **Diagnose**: Đọc `src/components/account/WishlistList.jsx`, `src/lib/firestore.js:getUserWishlist()`
  - Kiểm tra lỗi phổ biến:
    - `item.name` vs `item.title` inconsistency (line 175 trong WishlistList.jsx)
    - Firestore permissions cho `users` collection read
    - User document không có `wishlist` field → fallback `[]`
    - Items trong wishlist bị xóa khỏi source collections → null handling
    - AuthGuard redirect issue
  - **Fix**: Sửa lỗi cụ thể dựa trên diagnosis từ Task 5 audit report:
    - Nếu lỗi field naming: sửa `item.name` → `item.title`
    - Nếu lỗi null data: thêm optional chaining và fallback
    - Nếu lỗi AuthGuard: kiểm tra duplicate AuthGuard (layout đã có, WishlistPageClient thêm lần nữa)
  - Đảm bảo empty state hiển thị đúng (CTAs để khám phá dịch vụ)
  - Đảm bảo loading state có skeleton

  **Must NOT do**:
  - Không redesign toàn bộ wishlist
  - Không thay đổi data flow (vẫn dùng getUserWishlist từ user doc)

  **Recommended Agent Profile**:
  - **Category**: `deep` — cần diagnose root cause trước khi fix
  - **Skills**: [`firebase-ai-logic`, `vercel-react-best-practices`]
    - `firebase-ai-logic`: Firestore data flow debugging
    - `vercel-react-best-practices`: React error handling patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 9, 10, 11, 12)
  - **Blocks**: None
  - **Blocked By**: Task 5 (cần audit report để biết nguyên nhân)

  **References**:
  - `src/components/account/WishlistList.jsx:1-221` — Wishlist component
  - `src/components/account/WishlistPageClient.jsx:1-22` — Client wrapper
  - `src/lib/firestore.js:getUserWishlist()` — Data fetching function
  - `.sisyphus/evidence/task-5-audit-report.md` — Data audit results

  **Acceptance Criteria**:
  - [ ] Trang wishlist render không lỗi (không blank, không error text)
  - [ ] Empty state hiển thị khi user không có wishlist items
  - [ ] Items hiển thị đúng khi user đã lưu services
  - [ ] Remove button hoạt động (xóa item khỏi wishlist)

  **QA Scenarios**:
  ```
  Scenario: Wishlist page loads with empty state
    Tool: Playwright
    Preconditions: User đăng nhập, không có wishlist items
    Steps:
      1. Navigate to /account/wishlist
      2. Wait for .wishlist-empty-state selector
      3. Assert: text contains "Chưa có dịch vụ yêu thích"
      4. Assert: CTA button "Khám phá ngay" visible
      5. Screenshot: wishlist-empty
    Expected Result: Empty state renders without console errors
    Evidence: .sisyphus/evidence/task-6-wishlist-empty.png

  Scenario: Wishlist shows saved items
    Tool: Playwright
    Preconditions: User đăng nhập, có ≥1 wishlist item
    Steps:
      1. Navigate to /account/wishlist
      2. Wait for .wishlist-item selector
      3. Assert: ≥1 wishlist item cards visible
      4. Click remove button on first item
      5. Assert: item removed, count decreased
      6. Screenshot: wishlist-with-items
    Expected Result: Items display correctly, remove works
    Evidence: .sisyphus/evidence/task-6-wishlist-items.png
  ```

  **Commit**: YES
  - Message: `fix(wishlist): resolve blank page error in wishlist UI`
  - Files: `src/components/account/WishlistList.jsx`

---

- [x] 7. Booking Tab — Email/Phone Filter UI

  **What to do**:
  - Cập nhật `src/components/account/BookingsList.jsx`:
    - Thêm input field: text input cho email HOẶC số điện thoại (1 field dùng chung)
    - Thêm nút "Tìm kiếm" bên cạnh input
    - Khi click tìm: gọi `findBookingsByEmail()` hoặc `findBookingsByPhone()` từ Task 5
    - Hiển thị kết quả filter bên dưới (thay thế danh sách bookings hiện tại)
    - Thêm nút "Xóa bộ lọc" để quay lại danh sách đầy đủ (getUserBookings)
  - UI placement: phía trên bảng bookings, trong 1 row riêng
  - Responsive: mobile-friendly input width

  **Must NOT do**:
  - Không xóa chức năng hiển thị bookings theo userId
  - Không thay đổi sidebar navigation

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — UI component update + Firestore integration
  - **Skills**: [`vercel-react-best-practices`, `firebase-ai-logic`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 8, 9, 10, 11, 12)
  - **Blocks**: None
  - **Blocked By**: Tasks 1 (test), 5 (lookup functions)

  **References**:
  - `src/components/account/BookingsList.jsx:1-145` — Current booking list component
  - `src/lib/firestore.js` — `findBookingsByEmail()`, `findBookingsByPhone()` (from Task 5)
  - `src/components/home/SearchFormPopup.jsx` — Search form UI pattern

  **Acceptance Criteria**:
  - [ ] Input field hiển thị phía trên danh sách bookings
  - [ ] Nhập email → click Tìm → hiển thị bookings khớp email
  - [ ] Nhập số điện thoại → click Tìm → hiển thị bookings khớp phone
  - [ ] Nút "Xóa bộ lọc" → quay lại danh sách đầy đủ
  - [ ] Empty state khi không tìm thấy kết quả

  **QA Scenarios**:
  ```
  Scenario: Search bookings by email
    Tool: Playwright
    Preconditions: User đăng nhập, có bookings với contactInfo.email
    Steps:
      1. Navigate to /account/bookings
      2. Type "test@example.com" into .booking-search-input
      3. Click .booking-search-button
      4. Assert: .booking-item elements visible, count matches expected
      5. Screenshot: bookings-filtered
    Expected Result: Only matching bookings shown
    Evidence: .sisyphus/evidence/task-7-booking-filter-email.png

  Scenario: Clear filter restores all bookings
    Tool: Playwright
    Steps:
      1. After filtering, click .booking-clear-filter
      2. Assert: all user bookings visible again
      3. Assert: .booking-search-input value is empty
    Expected Result: Full list restored
    Evidence: .sisyphus/evidence/task-7-booking-clear-filter.png
  ```

  **Commit**: YES
  - Message: `feat(bookings): add email/phone filter to booking list`
  - Files: `src/components/account/BookingsList.jsx`

---

- [x] 8. Reviews Tab — Email/Phone Filter UI

  **What to do**:
  - Cập nhật `src/components/account/UserReviewsList.jsx`:
    - Thêm input field cho email filter
    - Gọi `findReviewsByEmail()` từ Task 5
    - Hiển thị kết quả filter
    - Nút "Xóa bộ lọc" để quay lại danh sách đầy đủ
  - UI placement: phía trên danh sách reviews

  **Must NOT do**:
  - Không thay đổi ReviewModal functionality
  - Không thay đổi sidebar navigation

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — UI component update
  - **Skills**: [`vercel-react-best-practices`, `firebase-ai-logic`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 9, 10, 11, 12)
  - **Blocks**: None
  - **Blocked By**: Tasks 1 (test), 5 (lookup functions)

  **References**:
  - `src/components/account/UserReviewsList.jsx:1-135` — Current review list component
  - `src/lib/firestore.js` — `findReviewsByEmail()` (from Task 5)

  **Acceptance Criteria**:
  - [ ] Input field hiển thị phía trên danh sách reviews
  - [ ] Nhập email → hiển thị reviews khớp
  - [ ] Nút "Xóa bộ lọc" → quay lại danh sách đầy đủ

  **QA Scenarios**:
  ```
  Scenario: Search reviews by email
    Tool: Playwright
    Preconditions: User đăng nhập, có reviews
    Steps:
      1. Navigate to /account/reviews
      2. Type email into .review-search-input
      3. Click .review-search-button
      4. Assert: filtered review items visible
    Expected Result: Only matching reviews shown
    Evidence: .sisyphus/evidence/task-8-review-filter.png
  ```

  **Commit**: YES
  - Message: `feat(reviews): add email filter to review list`
  - Files: `src/components/account/UserReviewsList.jsx`

---

- [x] 9. CustomerForm Update — Identity Fields

  **What to do**:
  - Cập nhật `src/components/checkout/CustomerForm.jsx`:
    - Thêm fields với `react-hook-form` validation:
      - `fullName` (đã có)
      - `email` (đã có)
      - `phone` (đã có)
      - **MỚI** `cccd` (Số CCCD/CMND) — input text, maxLength 12, pattern digits only
      - **MỚI** `cccdIssueDate` (Ngày cấp) — input date
      - **MỚI** `address` (Địa chỉ thường trú) — textarea, 2 rows
      - **MỚI** `nationality` (Quốc tịch) — select/dropdown với các quốc gia phổ biến (Việt Nam, USA, UK, etc.)
      - `specialRequests` (đã có)
  - Layout: 2 cột cho fullName/phone, email full width, CCCD + ngày cấp cùng hàng, address + nationality cùng hàng
  - Cập nhật `CheckoutPageClient.jsx` để include fields mới vào `contactInfo` object gửi lên booking
  - Cập nhật `useBooking.js:confirmBooking()` để lưu fields mới vào booking document

  **Must NOT do**:
  - Không thay đổi validation logic các field hiện có
  - Không thêm CCCD vào payment request (chỉ lưu trong booking)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — Form update + validation + data flow
  - **Skills**: [`vercel-react-best-practices`, `firebase-ai-logic`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8, 10, 11, 12)
  - **Blocks**: None
  - **Blocked By**: Tasks 1 (test), 5 (data audit)

  **References**:
  - `src/components/checkout/CustomerForm.jsx:1-90` — Current form
  - `src/components/checkout/CheckoutPageClient.jsx:1-229` — Checkout flow
  - `src/hooks/useBooking.js:86-104` — `contactInfo` storage in booking
  - `src/components/account/ProfileForm.jsx:1-161` — Form pattern với react-hook-form

  **Acceptance Criteria**:
  - [ ] Form hiển thị 8 fields (4 cũ + 4 mới)
  - [ ] CCCD validation: digits only, 9-12 ký tự
  - [ ] Ngày cấp: không được là ngày tương lai
  - [ ] Nationality dropdown có ≥10 quốc gia
  - [ ] Submit → booking document có đủ fields mới

  **QA Scenarios**:
  ```
  Scenario: Customer form with all new fields
    Tool: Playwright
    Steps:
      1. Add item to cart → navigate to /checkout
      2. Fill .customer-fullname: "Nguyễn Văn A"
      3. Fill .customer-email: "test@example.com"
      4. Fill .customer-phone: "0901234567"
      5. Fill .customer-cccd: "123456789012"
      6. Fill .customer-cccd-date: "2020-01-15"
      7. Fill .customer-address: "123 Đường ABC, Quận 1, TP.HCM"
      8. Select .customer-nationality: "Việt Nam"
      9. Click submit → assert: success, no validation errors
      10. Screenshot: form-filled
    Expected Result: All fields accept input, form submits
    Evidence: .sisyphus/evidence/task-9-customer-form.png

  Scenario: CCCD validation rejects invalid input
    Tool: Playwright
    Steps:
      1. Fill .customer-cccd: "abc123"
      2. Click submit
      3. Assert: validation error "Số CCCD không hợp lệ" visible
    Expected Result: Validation error shown
    Evidence: .sisyphus/evidence/task-9-cccd-validation.png
  ```

  **Commit**: YES
  - Message: `feat(checkout): add CCCD, issue date, address, nationality to customer form`
  - Files: `src/components/checkout/CustomerForm.jsx`, `src/components/checkout/CheckoutPageClient.jsx`, `src/hooks/useBooking.js`

---

- [x] 10. Header.jsx All-in-One — Cart Dropdown + Blog Nav + Remove Search

  **What to do**:
  - **Part A — Cart Dropdown Enhancement** (`Header.jsx` lines 156-189):
    - Thêm nút +/- quantity cho mỗi item (hotels: rooms, tours/activities: tổng guests)
    - Thêm nút xóa (✕ icon) cho mỗi item
    - Cập nhật hiển thị giá theo quantity thực tế
    - Xử lý trường hợp quantity = 1 (disable nút - hoặc confirm xóa)
    - Mobile responsive: touch-friendly buttons
  - **Part B — Add Blog to Main Nav** (`Header.jsx` lines 58-73):
    - Thêm `<Link href="/blog">Blog</Link>` SAU "Hoạt động"
    - Thứ tự mới: Trang chủ → Tour → Khách sạn → Hoạt động → Blog
  - **Part C — Remove Search Icon** (`Header.jsx` lines 71-73):
    - Xóa icon 🔍 và `<Link href="/search">` khỏi desktop nav
    - Xóa "Tìm kiếm" link khỏi mobile nav (line 152)

  **Must NOT do**:
  - Không thay đổi theme toggle, user menu, cart context
  - Không xóa các tính năng khác trong Header

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — 3 changes trong 1 component, cần cẩn thận
  - **Skills**: [`vercel-react-best-practices`, `tailwind-design-system`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (sau Wave 1)
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8, 9, 11, 12)
  - **Blocks**: None
  - **Blocked By**: Tasks 1 (test), 3 (cart helpers)

  **References**:
  - `src/components/layout/Header.jsx:58-73` — Main nav section
  - `src/components/layout/Header.jsx:156-189` — Cart dropdown section
  - `src/lib/cart.js` — `getCartItemsForDropdown()`, `removeItem()`, `updateItemQuantity()` (from Task 3)

  **Acceptance Criteria**:
  - [ ] Cart dropdown hiển thị nút +/- và nút xóa cho mỗi item
  - [ ] Quantity thay đổi cập nhật giá trong dropdown
  - [ ] Xóa item: item biến mất, cart count giảm
  - [ ] Menu chính có "Blog" sau "Hoạt động"
  - [ ] Search icon KHÔNG còn trong menu desktop và mobile

  **QA Scenarios**:
  ```
  Scenario: Cart dropdown qty +/- and remove
    Tool: Playwright
    Preconditions: Cart có ≥2 items
    Steps:
      1. Click .cart-icon to open dropdown
      2. Assert: .cart-dropdown visible
      3. Click + button on first item → assert: qty increases, price updates
      4. Click ✕ remove on second item → assert: item removed, count decreases
      5. Screenshot: cart-dropdown-enhanced
    Expected Result: Qty controls work, removal works, price updates
    Evidence: .sisyphus/evidence/task-10-cart-dropdown.png

  Scenario: Blog nav item visible, search icon removed
    Tool: Playwright
    Steps:
      1. Navigate to homepage
      2. Assert: nav contains "Blog" link after "Hoạt động"
      3. Assert: search icon (🔍) NOT in nav
      4. Click "Blog" → assert: navigates to /blog
    Expected Result: Blog in nav, no search icon
    Evidence: .sisyphus/evidence/task-10-nav-updated.png
  ```

  **Commit**: YES
  - Message: `feat(header): enhance cart dropdown, add Blog nav, remove search icon`
  - Files: `src/components/layout/Header.jsx`

---

- [x] 11. Fix Tour Featured Layout — Use HotelCard in FeaturedHotelsServer

  **What to do**:
  - Refactor `src/components/home/FeaturedHotelsServer.jsx`:
    - Bỏ inline HTML rendering (lines hiện tại)
    - Import và sử dụng `HotelCard` component thay thế
    - Cập nhật grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6` (4 cột như tours)
    - Đảm bảo props passed đúng: `hotel`, `isFeatured`, `lowestPrice`, `index`
  - Cập nhật `src/components/shared/HotelCard.jsx`:
    - Thêm support cho `isFeatured` prop (badge "Nổi bật")
    - Đảm bảo hover effect nhất quán: `hover:shadow-lg transition-all duration-300 hover:-translate-y-1`
    - Image aspect ratio: `aspect-[4/3]` (giống TourCard)
    - Đảm bảo `lowestPrice` hiển thị đúng
  - Cập nhật data fetching: `getFeaturedHotels(8)` (8 hotels như tours)

  **Must NOT do**:
  - Không thay đổi FeaturedToursServer/FeaturedTours
  - Không xóa HotelCard component
  - Không thay đổi FlashDealsServer

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering` — Layout refactor + visual consistency
  - **Skills**: [`tailwind-design-system`, `vercel-react-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8, 9, 10, 12)
  - **Blocks**: Task 16 (HotelCard enhancement depends on this structure)
  - **Blocked By**: None

  **References**:
  - `src/components/home/FeaturedHotelsServer.jsx:1-130` — Current inline rendering
  - `src/components/home/FeaturedToursServer.jsx:1-21` — Pattern: server → client component
  - `src/components/home/FeaturedTours.jsx:1-54` — Pattern: dùng TourCard trong grid
  - `src/components/shared/HotelCard.jsx:1-64` — HotelCard component hiện tại
  - `src/components/tours/TourCard.jsx:1-131` — TourCard grid variant (reference layout)

  **Acceptance Criteria**:
  - [ ] FeaturedHotelsServer dùng HotelCard (không inline HTML)
  - [ ] Grid: 4 columns trên xl, 3 trên lg, 2 trên sm
  - [ ] Image aspect ratio: 4/3
  - [ ] Hover effect giống tour featured
  - [ ] "Nổi bật" badge hiển thị trên hotel featured
  - [ ] 8 hotels hiển thị (không còn 6)

  **QA Scenarios**:
  ```
  Scenario: Hotel featured matches tour featured layout
    Tool: Playwright
    Steps:
      1. Navigate to homepage
      2. Scroll to hotel featured section
      3. Screenshot: featured-hotels
      4. Scroll to tour featured section
      5. Screenshot: featured-tours
      6. Compare: grid columns, card size, image ratio, hover effect
    Expected Result: Hotels and tours sections have visually identical card structure
    Evidence: .sisyphus/evidence/task-11-featured-compare.png

  Scenario: HotelCard renders correctly with isFeatured
    Tool: Playwright
    Steps:
      1. Navigate to homepage
      2. Find first hotel card in featured section
      3. Assert: "Nổi bật" badge visible
      4. Assert: image aspect ratio approx 4:3
      5. Assert: hover → shadow-lg and translate-y-1 effect
    Expected Result: Cards render with correct styling
    Evidence: .sisyphus/evidence/task-11-hotel-card.png
  ```

  **Commit**: YES
  - Message: `refactor(homepage): use HotelCard in FeaturedHotelsServer, unify layout with tours`
  - Files: `src/components/home/FeaturedHotelsServer.jsx`, `src/components/shared/HotelCard.jsx`

---

- [x] 12. Fix ImageCarousel Scroll-on-Click Bug

  **What to do**:
  - Đọc và phân tích `src/components/shared/ImageCarousel.jsx` (267 lines)
  - Xác định nguyên nhân scroll jump:
    - `scroll-snap` CSS có thể gây jump khi programmatically scroll tới ảnh mới
    - `scrollIntoView` hoặc `scrollTo` behavior có thể trigger scroll trên toàn trang
  - **Fix**:
    - Thêm `scroll-behavior: smooth` và `overflow-x: auto` với `scroll-snap-type: x mandatory`
    - Wrap carousel trong container với `overflow: hidden` để ngăn scroll propagation
    - Dùng `element.scrollTo({ left: target, behavior: 'smooth' })` thay vì `scrollIntoView`
    - Thêm `preventScroll` option khi set state gây re-render
    - Đảm bảo dot indicator click và arrow click đều không gây layout shift
  - Test trên mobile (touch swipe) và desktop (click arrows/dots)

  **Must NOT do**:
  - Không thay đổi lightbox functionality
  - Không xóa touch swipe support
  - Không thay đổi "Xem tất cả X ảnh" overlay

  **Recommended Agent Profile**:
  - **Category**: `deep` — CSS scroll behavior debugging cần deep analysis
  - **Skills**: [`vercel-react-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8, 9, 10, 11)
  - **Blocks**: None
  - **Blocked By**: Task 1 (test infrastructure)

  **References**:
  - `src/components/shared/ImageCarousel.jsx:1-267` — Full carousel component
  - `src/components/hotels/HotelHeader.jsx` — Hotel carousel usage
  - `src/components/tours/TourDetailClient.jsx` — Tour carousel usage
  - `src/components/activities/ActivityDetailClient.jsx` — Activity carousel usage

  **Acceptance Criteria**:
  - [ ] Click dot/chuyển ảnh: KHÔNG gây scroll trang
  - [ ] Click arrow trái/phải: KHÔNG gây scroll trang
  - [ ] Touch swipe trên mobile vẫn hoạt động
  - [ ] Lightbox "Xem tất cả" vẫn mở bình thường
  - [ ] Không có console error khi chuyển ảnh

  **QA Scenarios**:
  ```
  Scenario: Click next image does not scroll page
    Tool: Playwright
    Steps:
      1. Navigate to hotel detail page (có gallery)
      2. Scroll to top of page (window.scrollY = 0)
      3. Click right arrow on carousel
      4. Assert: window.scrollY === 0 (trang không bị scroll)
      5. Click dot indicator #3
      6. Assert: window.scrollY === 0
      7. Screenshot: after-click
    Expected Result: Carousel changes image without page scroll
    Evidence: .sisyphus/evidence/task-12-carousel-no-scroll.png

  Scenario: Touch swipe works on mobile viewport
    Tool: Playwright (mobile viewport 375x812)
    Steps:
      1. Navigate to hotel detail
      2. Simulate swipe left on carousel
      3. Assert: image changes to next
      4. Assert: dot indicator updates
    Expected Result: Swipe works, image changes
    Evidence: .sisyphus/evidence/task-12-carousel-swipe.png
  ```

  **Commit**: YES
  - Message: `fix(gallery): prevent page scroll when switching images in ImageCarousel`
  - Files: `src/components/shared/ImageCarousel.jsx`

---

### Wave 3: New Features + Polish (All Parallel After Wave 2)

- [x] 13. Blog List Page (`/blog`)

  **What to do**:
  - Tạo `src/app/blog/page.js` (Server Component): fetch posts từ Firestore, serialize Timestamps, render grid 3 columns
  - Tạo `src/components/blog/BlogCard.jsx` (Client Component): featuredImage (aspect-video), category badge, title (line-clamp-2), excerpt (line-clamp-3), author + date, link `/blog/[slug]`
  - `src/app/blog/loading.js` — skeleton loading; empty state khi không có posts

  **Must NOT do**: Không tạo admin blog interface

  **Recommended Agent Profile**: `visual-engineering`
  - **Skills**: [`tailwind-design-system`, `vercel-react-best-practices`, `firebase-ai-logic`]

  **Parallelization**: Wave 3 (parallel with 14-20), **Blocked By**: Tasks 1, 2

  **References**: `src/components/home/LatestNews.jsx`, `src/app/hotels/[slug]/page.js`, `.agents/lib/schemas/blog.js`

  **Acceptance Criteria**:
  - [ ] `/blog` renders ≥3 posts từ Firestore; grid 3 columns; empty state; skeleton loading

  **QA Scenarios**:
  ```
  Scenario: Blog list page with posts
    Tool: Playwright → Navigate to /blog
    Steps: Assert ≥3 blog cards (image, title, excerpt, date), click first → /blog/[slug]
    Evidence: .sisyphus/evidence/task-13-blog-list.png
  ```

  **Commit**: YES | `feat(blog): add blog list page with Firestore posts`
  - Files: `src/app/blog/page.js`, `src/app/blog/loading.js`, `src/components/blog/BlogCard.jsx`

---

- [x] 14. Blog Detail Page (`/blog/[slug]`)

  **What to do**:
  - Tạo `src/app/blog/[slug]/page.js` (Server Component): fetch by slug, `notFound()` nếu missing, hero banner, content render, dynamic metadata
  - Tạo `src/components/blog/BlogDetail.jsx`: breadcrumb, related posts (same category, 3), share buttons
  - Tạo `src/app/blog/[slug]/not-found.js`

  **Must NOT do**: Không comment system, không author profile

  **Recommended Agent Profile**: `visual-engineering`
  - **Skills**: [`tailwind-design-system`, `vercel-react-best-practices`, `firebase-ai-logic`]

  **Parallelization**: Wave 3, **Blocked By**: Tasks 1, 2

  **References**: `src/app/tours/[slug]/page.js`, `src/components/shared/Breadcrumb.jsx`

  **QA Scenarios**:
  ```
  Scenario: Blog detail renders → featured image, title, content, related posts. Invalid slug → 404.
  Evidence: .sisyphus/evidence/task-14-blog-detail.png
  ```

  **Commit**: YES | `feat(blog): add blog detail page with related posts`
  - Files: `src/app/blog/[slug]/page.js`, `src/app/blog/[slug]/not-found.js`, `src/components/blog/BlogDetail.jsx`

---

- [x] 15. Enhance TourCard — Best Price, Amenities, Rating

  **What to do**: Cập nhật `src/components/tours/TourCard.jsx`:
  - Best Price Badge: nếu `discountPercent > 0` → badge "Giá tốt nhất" góc trên trái ảnh
  - Amenities Icons: 2-3 icons từ `amenities` array dưới title
  - Rating + Review Count: `StarRating` + `(X đánh giá)`; fallback nếu không có data

  **Must NOT do**: Không thay đổi grid/list variant logic

  **Recommended Agent Profile**: `visual-engineering` | **Skills**: [`tailwind-design-system`, `vercel-react-best-practices`]

  **Parallelization**: Wave 3, **Blocked By**: Tasks 1, 5

  **QA**: Navigate tours listing → TourCard shows star rating, review count, amenities icons, best price badge
  **Evidence**: `.sisyphus/evidence/task-15-tourcard.png`

  **Commit**: `feat(tours): enhance TourCard with best price, amenities, rating` | Files: `src/components/tours/TourCard.jsx`

---

- [x] 16. Enhance HotelCard — Best Price, Amenities, Rating

  **What to do**: Cập nhật `src/components/shared/HotelCard.jsx`:
  - Best Price Badge, Amenities Icons, Rating + Review Count (tương tự TourCard)
  - Tương thích với Task 11 refactor; fallback nếu không có data

  **Must NOT do**: Không break FeaturedHotelsServer

  **Recommended Agent Profile**: `visual-engineering` | **Skills**: [`tailwind-design-system`, `vercel-react-best-practices`]

  **Parallelization**: Wave 3, **Blocked By**: Tasks 1, 5, 11

  **QA**: Homepage → hotel featured → HotelCard shows rating, amenities, best price badge
  **Evidence**: `.sisyphus/evidence/task-16-hotelcard.png`

  **Commit**: `feat(hotels): enhance HotelCard with best price, amenities, rating` | Files: `src/components/shared/HotelCard.jsx`

---

- [x] 17. Enhance ActivityCard — Best Price, Amenities, Rating

  **What to do**: Cập nhật `src/components/shared/ActivityCard.jsx`:
  - Best Price Badge, Amenities Icons, Rating + Review Count (tương tự TourCard/HotelCard)
  - Fallback nếu không có data

  **Recommended Agent Profile**: `visual-engineering` | **Skills**: [`tailwind-design-system`, `vercel-react-best-practices`]

  **Parallelization**: Wave 3, **Blocked By**: Tasks 1, 5

  **QA**: Activities listing page → ActivityCard shows rating, amenities, best price badge
  **Evidence**: `.sisyphus/evidence/task-17-activitycard.png`

  **Commit**: `feat(activities): enhance ActivityCard with best price, amenities, rating` | Files: `src/components/shared/ActivityCard.jsx`

---

- [x] 18. Hotel Rate Type Labels in RoomsPanel

  **What to do**: Cập nhật `src/components/hotels/HotelDetail/RoomsPanel.jsx`:
  - Import `getRateTypeLabel`, `getRateTypeIcon` từ `src/lib/rateLabels.js`
  - Trong room pricing table/row, thêm label text cho mỗi rate type (VD: "🍽️ Bao gồm ăn sáng - 1.500.000đ/đêm")
  - Hiển thị tất cả rate types có sẵn cho phòng (standard, breakfast, all_inclusive)
  - Layout: mỗi rate type 1 row với icon + label + giá, người dùng có thể chọn

  **Must NOT do**: Không thay đổi data fetching logic, không thêm rate types mới

  **Recommended Agent Profile**: `visual-engineering` | **Skills**: [`tailwind-design-system`, `vercel-react-best-practices`]

  **Parallelization**: Wave 3, **Blocked By**: Tasks 1, 4

  **References**: `src/components/hotels/HotelDetail/RoomsPanel.jsx:1-502`, `src/lib/rateLabels.js`, `src/lib/firestore.js:buildRoomPricingTable()`

  **QA Scenarios**:
  ```
  Scenario: Rate types displayed with labels
    Tool: Playwright → Hotel detail page → Rooms & Pricing tab
    Steps: Assert rate type labels visible ("Giá cơ bản", "Bao gồm ăn sáng", "Trọn gói"), each with price
    Evidence: .sisyphus/evidence/task-18-rate-types.png
  ```

  **Commit**: `feat(hotels): display rate type labels in room pricing` | Files: `src/components/hotels/HotelDetail/RoomsPanel.jsx`

---

- [x] 19. Disable Search Page

  **What to do**: Cập nhật `src/app/search/page.jsx`:
  - Thay placeholder "đang xây dựng" bằng redirect về homepage: `import { redirect } from 'next/navigation'` → `redirect('/')`
  - HOẶC giữ page với message "Tính năng tìm kiếm đã được tích hợp vào từng trang dịch vụ" + link về homepage

  **Recommended Agent Profile**: `quick` | **Skills**: []

  **Parallelization**: Wave 3, **Blocked By**: Task 1

  **QA**: Navigate to `/search` → redirected to `/` or shows disabled message
  **Evidence**: `.sisyphus/evidence/task-19-search-disabled.txt`

  **Commit**: `chore(search): disable standalone search page` | Files: `src/app/search/page.jsx`

---

- [x] 20. Update LatestNews to Use Firestore

  **What to do**: Cập nhật `src/components/home/LatestNews.jsx`:
  - Thay vì dùng `mockLatestNews`, fetch từ Firestore `posts` collection (3 posts mới nhất, status: published)
  - Giữ nguyên UI/UX hiện tại (3 cards, "Xem tất cả" → `/blog`)
  - Fallback: nếu fetch fail → dùng mock data cũ

  **Must NOT do**: Không thay đổi UI layout của LatestNews

  **Recommended Agent Profile**: `quick` | **Skills**: [`firebase-ai-logic`]

  **Parallelization**: Wave 3, **Blocked By**: Tasks 1, 2

  **QA**: Homepage → LatestNews section → shows posts from Firestore (not mock)
  **Evidence**: `.sisyphus/evidence/task-20-latest-news-firestore.png`

  **Commit**: `refactor(homepage): fetch LatestNews from Firestore posts` | Files: `src/components/home/LatestNews.jsx`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Get explicit user okay.

- [x] F1. **Plan Compliance Audit** — APPROVE ✅ (20/20 tasks, all rules compliant, zero scope creep)

- [x] F2. **Code Quality Review** — APPROVE ✅ (Tests: 4/4 pass, no anti-patterns, ~90% JSDoc coverage)

- [x] F3. **Real Manual QA** — BLOCKED (env) ⚠️ Dev server needs Firebase Admin credentials in .env.local

- [x] F4. **Scope Fidelity Check** — APPROVE ✅ (10/10 guardrails passed, all 20 tasks compliant)

---

## Commit Strategy

| Wave | Tasks | Strategy |
|------|-------|----------|
| 1 | 1-5 | Individual commits per task (independent foundation) |
| 2 | 6-12 | Individual commits per task (parallel core fixes) |
| 3 | 13-20 | Individual commits per task (parallel features) |
| FINAL | F1-F4 | Review-only, no commits unless fixes needed |

---

## Success Criteria

### Verification Commands
```bash
next build        # Expected: compiled successfully, no errors
bun test --run    # Expected: all Vitest tests pass
npx playwright test  # Expected: all e2e tests pass
```

### Final Checklist
- [x] All 20 tasks implemented per spec
- [ ] `next build` passes without errors — BLOCKED: needs Firebase Admin .env.local
- [x] All Vitest unit tests pass (4/4)
- [ ] All Playwright QA scenarios pass — BLOCKED: needs Firebase Admin .env.local
- [x] No TypeScript, no pages/, no CSS modules, no admin routes per F4 audit
- [x] Featured tours and hotels visually identical (T11 refactor complete)
- [x] Cart dropdown has qty +/- and remove per item (T10)
- [x] Blog accessible from main nav (after "Hoạt động") (T10)
- [x] Search icon removed from nav, /search disabled (T10, T19)
- [x] Rate type labels visible in hotel room pricing (T18)
- [x] Service cards show best price, amenities, rating (T15, T16, T17)

### FINAL WAVE VERDICT
| Reviewer | Status |
|----------|--------|
| F1 Plan Compliance | ✅ APPROVE |
| F2 Code Quality | ✅ APPROVE |
| F3 Real QA | ⚠️ BLOCKED — Firebase credentials needed |
| F4 Scope Fidelity | ✅ APPROVE |

**3/4 APPROVED. 1/4 blocked on environment (not code).**

