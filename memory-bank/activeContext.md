# Active Context — 9Trip B2C Web

> **Last updated:** 05/05/2026

## Current Work Focus
- **All Phases (0-14)** — ✅ Complete
- **Memory-bank restructured** — Each file specialized (05/05/2026)

- **Next:** Production deployment, Stripe key setup, or new feature development.

## Completed Changes (Phase 13 Completion — 04/05/2026)

### P13.3.3 — HotelDetailClient Tab Refactor
- Removed all `next/dynamic()` imports (6 dynamic imports → direct imports)
- Replaced conditional tab rendering `{activeTab === "id" && ...}` with `data-tab-panel="id"` + `hidden` class pattern
- All 6 tab panels now rendered in initial HTML for SEO
- Removed local `Badge` sub-component, imported from `@/components/shared/Badge`
- Removed client-side JSON-LD (moved to server page.js)

### P13.3.4 — ActivityDetailClient Tab Refactor
- Removed `next/dynamic()` for `GoogleMap` (direct import now)
- Replaced conditional tab rendering for all 8 tabs with `data-tab-panel` + `hidden` pattern
- All 8 tab panels now rendered in initial HTML for SEO
- Removed local `Badge` sub-component, imported from `@/components/shared/Badge`

### P13.4 — SEO Enhancement
| Feature | Details |
|---------|---------|
| `metadataBase` | Added to root layout |
| `og:image` | Root layout + homepage + all 5 listing pages |
| `canonical` | All 6 detail pages + 5 listing pages + homepage |
| `twitter:card` | Root layout + all 6 detail pages |
| `WebSite` JSON-LD | Homepage with SearchAction |
| `Hotel` JSON-LD | Server-side in `/hotels/[slug]` (moved from client) |
| `Product` JSON-LD | Added to `/cars/[slug]`, `/rentals/[slug]` |
| `ItemList` JSON-LD | All 5 listing pages |

### P13.5 — Performance Optimization
- Changed hotel detail from `dynamic = "force-dynamic"` → `revalidate = 3600` (ISR)
- Removed dead code: `TabSwitcher.jsx` (unused), 3 local `Badge` definitions (shared now)

### P13.6 — Cleanup
- Deleted `src/app/flights/` (coming-soon placeholder page)
- Added `/flights` → `/` 301 redirect in `src/proxy.js`

### Shared Components Created
- `src/components/shared/Badge.jsx` — consolidated from 3 duplicated implementations

## Active Decisions
- **Server-content-first:** All meaningful text content must be in initial HTML
- **Tabs = CSS hidden:** All tab content rendered, toggled by CSS class
- **proxy.js NOT middleware.js:** Next.js 16 uses `proxy.js` convention (confirmed by build warning)
- **Flat lib structure:** No nested `lib/firebase/` subdirectory, use `lib/firebase-auth.js` flat
- **Public images:** Static assets in `public/images/` referenced by URL path, not module import
- **Shared Badge component:** Single source of truth in `components/shared/Badge.jsx`
- **Canonical URLs on all pages:** Full path canonical resolution via Next.js metadata `alternates`
- **JSON-LD on server:** All structured data generated in Server Components, not client
- **Hotel ISR:** Changed from force-dynamic to ISR (revalidate=3600) — hotel data changes infrequently

## Key Files for Phase 13 Completion
- `src/components/shared/Badge.jsx`: **NEW** — Shared Badge component (replaces 3 local copies)
- `src/components/hotels/HotelDetailClient.jsx`: **REFACTORED** — tabs → data-tab-panel, no next/dynamic
- `src/components/activities/ActivityDetailClient.jsx`: **REFACTORED** — tabs → data-tab-panel, no next/dynamic
- `src/components/tours/TourDetailClient.jsx`: **UPDATED** — uses shared Badge
- `src/app/hotels/[slug]/page.js`: **UPDATED** — server JSON-LD + ISR (revalidate=3600) + canonical/twitter
- `src/app/cars/[slug]/page.js`: **UPDATED** — Product JSON-LD + canonical/twitter
- `src/app/rentals/[slug]/page.js`: **UPDATED** — Product JSON-LD + canonical/twitter
- `src/app/layout.js`: **UPDATED** — metadataBase, og:image, twitter card
- `src/app/page.js`: **UPDATED** — page-level metadata + WebSite JSON-LD
- `src/proxy.js`: **UPDATED** — /flights → / redirect
- All 5 listing pages: **UPDATED** — openGraph + canonical + ItemList JSON-LD
- `src/components/shared/TabSwitcher.jsx`: **DELETED** — unused, was P13.3.1

## Important Patterns
- **Alias:** `@/` map đến `src/`
- **JSDoc:** Bắt buộc cho mọi function, component, và object phức tạp.
- **Firebase modular:** Import từ `firebase/auth`, `firebase/firestore`, etc.
- **Server/Client boundary:** Dùng wrapper pattern (AuthWrapper) để bọc client context trong server layout.
- **Tab pattern:** `data-tab-panel` attribute + CSS `hidden` class for SEO-friendly tab content
- **ISR:** All detail pages use `revalidate = 3600`
- **JSON-LD:** Always generated server-side in page.js, never in client components