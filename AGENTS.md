# 9Trip B2C — Agent Guidelines

## Build & Run

```bash
npm run dev    # Start dev server (Next.js 16 + Turbopack)
npm run build  # Production build
npm run lint   # ESLint
```

## Tech Stack (Non-Negotiable)

| Layer | Technology | Constraint |
|-------|-----------|------------|
| Framework | **Next.js 16** | App Router **only** — never use Pages Router |
| Frontend | **React 19** | Server Components by default; `'use client'` only when needed (state, effects, event handlers) |
| Language | **JavaScript (ES6+)** | No TypeScript — use **JSDoc** on every function, component, and complex object |
| Styling | **Tailwind CSS v4** | Design tokens in `globals.css` via `@theme inline` |
| Backend | **Firebase Web SDK v9+** | Modular imports only (`firebase/auth`, `firebase/firestore`, etc.) |
| State | **Zustand v5** | For cart, filters, client-side shared state |
| Hosting | **Vercel** | ISR, SSG, Edge |

## Path Alias

`@/` → `src/` (configured in `jsconfig.json`)

## Architecture: Headless CMS

```
ERP (nội bộ) ──sync 1 chiều──→ Firestore (read-only) ──read──→ 9Trip Web
```

- **Web NEVER writes** to: `tours`, `hotels`, `rooms`, `activities`, `cars`, `rentals`, `locations`, `settings`, `coupons`
- **Web reads & creates own data**: `bookings`, `reviews` (own), `users` (own profile)
- **No admin dashboard, no partner dashboard** — only 1 role: `customer`
- See `memory-bank/projectbrief.md` and `memory-bank/techContext.md` for full details

## Critical Patterns

### Server / Client Boundary

```jsx
// Pages are Server Components (default) — can be async, fetch directly
export default async function ToursPage({ searchParams }) {
  const { tours } = await searchTours(filters);
  return <TourList tours={tours} />;
}

// Client Components MUST have 'use client' directive
"use client";
export default function BookingForm({ tourId }) { /* state, effects, handlers */ }
```

### Firestore Data Serialization

Always use helpers before passing Firestore data to Client Components (avoids Next.js serialization errors with Timestamps):

```js
import { serializeDoc, serializeTimestamp } from "@/lib/firestore";
const doc = serializeDoc(snapshot); // → { id, ...data }
```

### Auth Wrapper Pattern

Root `layout.js` is a Server Component — wrap client context providers in a Client Component:

```
layout.js (Server) → AuthWrapper (Client) → AuthProvider → CartProvider → Header/Footer
```

### Component Documentation

Every function and component must have a JSDoc block:

```jsx
/**
 * TourFilters — Sidebar filter panel for tour listing.
 * Supports filtering by location, type, price range, rating, and sort.
 * @param {{ filters: Object, locations: Array<{id:string, name:string}> }} props
 */
export default function TourFilters({ filters, locations }) { ... }
```

### Cart State

Zustand-based cart with persist middleware. See `src/lib/cart.js`.

### Route Conventions

- Public: `/tours`, `/hotels`, `/activities`, `/cars`, `/rentals`
- Auth-protected: `/checkout`, `/cart`, `/account/**`
- API: `src/app/api/webhooks/payment/route.js`

## What NOT to Build

- ❌ Admin Dashboard / CMS pages
- ❌ Partner registration or partner portal
- ❌ CRUD endpoints for service collections (tours, hotels, etc.)
- ❌ Multi-language (phase 1: Vietnamese only)
- ❌ Pages Router routes (`pages/` directory)
- ❌ TypeScript files

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/firebase.js` | Firebase init, auth, db, storage exports |
| `src/lib/firestore.js` | All Firestore helpers — generic CRUD + domain-specific queries |
| `src/lib/auth.js` | AuthContext, AuthProvider, auth hooks |
| `src/lib/cart.js` | Cart context + useCart hook |
| `src/middleware.js` | Route protection (auth-required paths) |
| `firestore.rules` | Firestore security rules |
| `src/app/globals.css` | Tailwind v4 + design tokens |
| `next.config.mjs` | Next.js config (React Compiler enabled) |

For full project context, see `memory-bank/` (projectbrief, techContext, systemPatterns, productContext, activeContext, progress).
