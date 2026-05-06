# F2 — Code Quality Review Report

**Date:** 2026-05-06  
**Scope:** 28 files changed (HEAD~18..HEAD)  
**Verdict:** ✅ **APPROVE** (with minor recommendations)

---

## 1. Anti-Patterns Scan

| Pattern | Found in Changed Files | Severity |
|---------|------------------------|----------|
| `console.log` | `seedBlog.js` (script — acceptable) | None |
| `console.error` | `BlogDetail.jsx:44`, `WishlistList.jsx:31,50`, `UserReviewsList.jsx:51`, `LatestNews.jsx:47`, `RoomsPanel.jsx:332`, `firestore-admin.js` (40+ occurrences) | Minor |
| `TODO` / `FIXME` | None in changed files | None |
| `@ts-ignore` | None | None |
| `as any` | None | None |
| Empty catch blocks | None in changed files | None |

**Assessment:** No blocking anti-patterns. `console.error` in client components should ideally use the project's `logger` utility for consistency, but this is a minor style issue — the project already uses `logger` in server components correctly.

---

## 2. AI Slop Check

| Check | Result |
|-------|--------|
| Redundant comments | None found — comments are purposeful (JSDoc, section headers, business logic explanations) |
| Overly verbose patterns | None — code is concise and idiomatic |
| Unused imports | Not detected in spot-checked files |
| Unnecessary abstractions | None — patterns match existing codebase conventions |

**Assessment:** No AI slop detected. Code is clean, purposeful, and follows established patterns.

---

## 3. Error Handling

| File | Pattern | Verdict |
|------|---------|---------|
| `firestore-admin.js` | Every async function wrapped in try/catch with `console.error` + graceful fallback | ✅ Good |
| `firestore.js` | Every async function wrapped in try/catch with `logger.error` + graceful fallback | ✅ Good |
| `cart.js` | `useCart()` throws if used outside provider (correct pattern) | ✅ Good |
| `BlogDetail.jsx` | `handleCopyLink` has try/catch for clipboard API | ✅ Good |
| `LatestNews.jsx` | try/catch with mock data fallback | ✅ Good |
| `blog/[slug]/page.js` | try/catch for related blogs + image resolution | ✅ Good |
| `seedBlog.js` | try/catch with `process.exit(1)` on fatal error | ✅ Good |

**Assessment:** Error handling is thorough and consistent. Server-side functions always return safe defaults (empty arrays, null) on failure. Client components handle async errors gracefully.

---

## 4. Consistency Check

### 4.1 Naming Conventions
- ✅ Components: PascalCase (`BlogDetail`, `ImageCarousel`, `CustomerForm`)
- ✅ Functions: camelCase (`getDocById`, `resolveRoomPricing`, `calcBookingPrice`)
- ✅ Constants: UPPER_SNAKE_CASE (`BLUR_DATA_URL`, `AMENITY_ICONS`)
- ✅ Files: kebab-case for pages, PascalCase for components

### 4.2 Component Patterns
- ✅ `'use client'` directive present only where hooks/events are used
- ✅ Server Components remain server-only (no `'use client'` in page.js files)
- ✅ Props destructuring consistent across components
- ✅ Default parameter patterns consistent (`= []`, `= {}`, `= ""`)

### 4.3 Tailwind v4 Class Usage
- ✅ Semantic tokens used: `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary-600`
- ✅ No CSS modules or inline styles (except `dangerouslySetInnerHTML` for blog content — acceptable)
- ✅ Responsive patterns: `md:`, `lg:` prefixes used correctly
- ✅ No deprecated Tailwind v3 patterns detected

### 4.4 Firebase Modular Imports
- ✅ All imports use modular pattern: `import { getDoc, getDocs } from 'firebase/firestore'`
- ✅ No legacy `import firebase from 'firebase'` patterns

---

## 5. JSDoc Coverage

| Category | Coverage | Notes |
|----------|----------|-------|
| Lib files (`cart.js`, `firestore.js`, `firestore-admin.js`) | ✅ 100% | Every exported function has JSDoc with `@param` and `@returns` |
| Components with props | ✅ ~90% | `BlogDetail`, `ImageCarousel`, `CustomerForm`, `HotelCard`, `Header` all have JSDoc |
| Page components | ⚠️ Partial | `blog/[slug]/page.js` and `blog/page.js` have JSDoc; `not-found.js`, `loading.js`, `search/page.jsx` missing |
| Utility functions | ✅ 100% | `calcBookingPrice`, `getItemKey`, `serializeTimestamp` all documented |

**Missing JSDoc (minor):**
- `src/app/blog/[slug]/not-found.js` — no JSDoc on `BlogNotFound`
- `src/app/blog/loading.js` — no JSDoc on `BlogListLoading`
- `src/app/search/page.jsx` — no JSDoc on `SearchPage`
- `src/components/account/WishlistPageClient.jsx` — no JSDoc on default export

---

## 6. Spot-Check Summary (8 files)

| File | Quality | Notes |
|------|---------|-------|
| `src/app/blog/[slug]/page.js` | ✅ Good | Server component, ISR, JSON-LD, proper error handling |
| `src/components/blog/BlogDetail.jsx` | ✅ Good | Client component, clipboard API with error handling, responsive |
| `src/components/shared/ImageCarousel.jsx` | ✅ Good | Touch handlers, lightbox, accessibility labels, proper cleanup |
| `src/lib/cart.js` | ✅ Good | Full JSDoc, composite key pattern, proper state management |
| `src/lib/firestore.js` | ✅ Good | Full JSDoc, serialization helpers, consistent error handling |
| `src/lib/firestore-admin.js` | ✅ Good | Full JSDoc, consistent patterns, fallback queries on index errors |
| `src/components/checkout/CustomerForm.jsx` | ✅ Good | react-hook-form, validation rules, accessibility |
| `src/components/layout/Header.jsx` | ✅ Good | Cart dropdown, responsive nav, proper event handling |

---

## 7. Findings Summary

### Blocking Issues
**None.**

### Minor Issues (non-blocking)

1. **`console.error` in client components** — 5 client components use `console.error` instead of the project's `logger` utility. The `logger` module (`src/lib/logger.js`) exists and is used in server components. Client components should import and use it for consistency.
   - Files: `BlogDetail.jsx:44`, `WishlistList.jsx:31,50`, `UserReviewsList.jsx:51`, `LatestNews.jsx:47`, `RoomsPanel.jsx:332`

2. **Missing JSDoc on 4 page/component exports** — Minor gap in documentation coverage per project rule #9.
   - Files: `not-found.js`, `loading.js`, `search/page.jsx`, `WishlistPageClient.jsx`

3. **`dangerouslySetInnerHTML` in BlogDetail.jsx** — Used for blog content rendering. This is acceptable for CMS content but should ensure server-side sanitization before storage.

4. **`restoreCart` in cart.js uses Vietnamese comment** — Line 234: `// Hàm hồi sinh giỏ hàng từ mảng items backup`. Minor inconsistency with the rest of the file which uses English comments.

---

## VERDICT: ✅ APPROVE

The code is well-structured, follows project conventions consistently, has thorough error handling, and demonstrates good patterns throughout. The minor issues (console.error vs logger, missing JSDoc on 4 exports) are non-blocking and can be addressed in a follow-up pass.