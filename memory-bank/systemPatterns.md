# System Patterns: 9Trip B2C Web

> **Last updated:** 05/12/2026
> 
> **Purpose:** Architectural patterns, data flow, auth, payments, SEO, performance, components, error handling, and schema compliance. Read this before building any feature.

---

## 1. Architecture Overview

### Stack Layers

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16 (App Router) | Server Components by default. No Pages Router. |
| UI | React 19 + Tailwind CSS v4 | Functional components only. No class components. |
| Language | JavaScript (ES6+) | No TypeScript. JSDoc for type annotations. |
| Backend | Firebase v11+ (Modular SDK) | Dual SDK pattern: Client + Admin. |
| State | Zustand v5 + React Context | Zustand with persist middleware for cart. Context for auth. |
| Hosting | Firebase Hosting | Cloud Functions for API, Next.js for SSR, CDN. |
| Package Manager | NPM Workspaces | Monorepo with @9trip/shared shared package. |
| Shared Package | @9trip/shared | Deduplicated code between Next.js and Functions. |

### Dual Firebase SDK Pattern

The project uses two Firebase SDKs that never mix:

- **Client SDK** (`src/lib/firebase.js` + `src/lib/firestore.js`): Browser-side. Uses `firebase/app`, `firebase/auth`, `firebase/firestore` modular imports. Runs only in Client Components.
- **Admin SDK** (`@9trip/shared/firebase/admin-init` + `@9trip/shared/firebase/admin-helpers`): Server-side. Initialized via the shared package factory `initFirebaseAdmin({ useLazyProxy: true/false })`.
  - **Next.js**: `useLazyProxy: true` (lazy Proxy for SSR, avoids cold-start overhead)
  - **Cloud Functions**: `useLazyProxy: false` (direct init, functions already warm)

**Rule:** Never import `firebase-admin` in a Client Component. Never import `firebase/app` in a Server Component or API Route.

### ISR/SSG Strategy

All detail pages use Incremental Static Regeneration (ISR) with `revalidate = 3600` (1 hour):

- **Detail pages** (tours, hotels, activities, cars, rentals): ISR with revalidate=3600. Content changes infrequently, so ISR gives us both SEO (static HTML) and freshness.
- **Listing pages**: ISR with revalidate=3600. Same reasoning.
- **Homepage**: SSG with periodic revalidation via on-demand revalidation.
- **Checkout/Account**: Dynamic (server-rendered per request). These need fresh data.
- **generateStaticParams**: Returns empty array. All routes render on first request, then cache via ISR.

### Project Structure Pattern

```
packages/shared/    — Shared code between Next.js and Functions (@9trip/shared)
src/
  app/          — Next.js App Router (Server Components only)
  components/   — React components (Client Components)
  lib/          — Next.js-specific utilities (Firebase client SDK, auth, cart)
  hooks/        — Custom React hooks
  stores/       — Zustand stores
  styles/       — Global CSS (Tailwind v4 entry point)
functions/
  src/          — Cloud Functions (Express micro-monoliths)
  index.js      — Functions entry point
```

Shared code (constants, utils, logger, email, schemas, etc.) lives in `packages/shared/`. Both `src/lib/` and `functions/src/lib/` import from `@9trip/shared`. Local lib files are thin wrappers or module-specific code.

### NPM Workspaces

The project uses NPM Workspaces for monorepo management:
- Root `package.json` has `"workspaces": ["packages/*"]`
- `packages/shared/package.json` defines `@9trip/shared` with subpath exports
- Both `src/` and `functions/` import from `@9trip/shared/*`
- No build step needed — NPM resolves workspace packages via symlinks

#### @9trip/shared Package Exports
| Export | Description |
|--------|-------------|
| `@9trip/shared/constants` | SITE, COMPANY, SOCIAL, PAGE_SIZE, BLUR_DATA_URL |
| `@9trip/shared/utils` | formatCurrency, formatDate, slugify, cn, etc. |
| `@9trip/shared/logger` | Logger utility with configurable levels |
| `@9trip/shared/error-utils` | Error handling helpers |
| `@9trip/shared/rateLabels` | Rate type definitions |
| `@9trip/shared/env` | Environment variable resolution helpers |
| `@9trip/shared/schemas/*` | Firestore collection schemas |
| `@9trip/shared/email/templates` | Email HTML templates |
| `@9trip/shared/email/service` | SMTP transporter + send helpers |
| `@9trip/shared/firebase/admin-init` | Firebase Admin SDK initialization factory |
| `@9trip/shared/firebase/admin-helpers` | serializeSnap, serializeDocs, generateNextId |
| `@9trip/shared/firestore/collections` | Collection name constants |
| `@9trip/shared/storage/paths` | Storage path builders |
| `@9trip/shared/payments/helpers` | PaymentHelper (sortObject, generateHmac, etc.) |

### @9trip/shared Import Convention

All shared code is imported via the `@9trip/shared` package name, never via relative paths:

```js
// Correct — use package exports
import { formatCurrency } from "@9trip/shared/utils";
import { SITE } from "@9trip/shared/constants";
import { initFirebaseAdmin } from "@9trip/shared/firebase/admin-init";

// Wrong — never use relative paths into packages/shared/
import { formatCurrency } from "../../packages/shared/utils";
```

Subpath exports are enforced by the `exports` field in `packages/shared/package.json`. Only listed subpaths are importable. Adding a new shared module requires adding a corresponding export entry.

### API Boundary Rule

Each API endpoint belongs to ONLY ONE module:
- **Cloud Functions**: Background/event-driven tasks, payment processing, email sending, booking mutations, inventory holds, agent tasks
- **Next.js**: Synchronous/client-facing requests, Server Actions, SEO routes (sitemap, robots.txt), CRM webhook handlers

No endpoint should exist in both modules. If a route exists in Cloud Functions, the Next.js version should be removed (firebase.json rewrites handle routing).

### Environment Variables

- Both Next.js and Firebase Functions v2 auto-load `.env.local` — no `dotenv` dependency needed
- Single root `.env.local` is the canonical source (functions/.env.local has been removed)
- Cloud Functions secrets use `defineSecret()` from `firebase-functions/params` (in `functions/src/config/secrets.js`)
- Shared env helpers in `@9trip/shared/env`: `getEnvVar()`, `getRequiredEnvVar()`, `getFirebaseConfig()`, `getAdminCredentials()`
- No service account JSON files in repo — credentials come from env vars only

---

## 2. Server/Client Boundary Patterns

### Default to Server Components

Every component is a Server Component unless it needs browser APIs. Add `"use client"` only when:

- Using React hooks (`useState`, `useEffect`, `useContext`, etc.)
- Handling browser events (`onClick`, `onSubmit`, etc.)
- Using browser-only APIs (`localStorage`, `window`, etc.)
- Using Firebase Client SDK auth-dependent operations

### "use client" Directive Rules

- Place `"use client"` at the very top of the file (line 1).
- Keep Client Components thin. Fetch data in Server Components, pass as props.
- Use the Wrapper Pattern (see below) to inject client context into server layouts.

### Wrapper Pattern

Server Components cannot use context. To provide auth/cart context in server layouts:

```
layout.js (Server) → AuthWrapper (Client) → CartProvider (Client) → {children}
```

Example from `src/app/layout.js`:
```jsx
// layout.js — Server Component
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthWrapper>
          {children}
        </AuthWrapper>
      </body>
    </html>
  );
}
```

```jsx
// AuthWrapper.jsx — Client Component
"use client";
import { AuthProvider } from "@/lib/auth";
export default function AuthWrapper({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
```

### Data Serialization Boundary (`serializeSnap`)

Firestore returns special types (Timestamp, GeoPoint, DocumentReference) that cannot be serialized to JSON. All data crossing the server-client boundary must be serialized.

**Admin SDK** → `serializeSnap()` / `serializeDocs()` in `@9trip/shared/firebase/admin-helpers`:
- Timestamp → ISO string
- GeoPoint → `{lat, lng}`
- DocumentReference → `{_ref: path}`
- Bytes → base64

**Client SDK** → `serializeTimestamp()` in `@/lib/firestore.js`:
- Same conversion logic for client-side reads.

Always call serialization before passing data from Server Component to Client Component props.

### Firebase Import Rules

| Import | Where to Use | Examples |
|--------|-------------|----------|
| `firebase/app` | Client Components only | `import { app } from "@/lib/firebase"` |
| `firebase/auth` | Client Components only | `import { getAuth } from "firebase/auth"` |
| `firebase/firestore` | Client Components only | `import { doc, getDoc } from "firebase/firestore"` |
| `firebase-admin` | Server/API/Webhooks only | `import admin from "firebase-admin"` (via `@9trip/shared/firebase/admin-init`) |
| `@9trip/shared/firebase/admin-init` | Server Components, API Routes, Functions | `import { initFirebaseAdmin } from "@9trip/shared/firebase/admin-init"` |
| `@9trip/shared/firebase/admin-helpers` | Server Components, API Routes, Functions | `import { serializeSnap } from "@9trip/shared/firebase/admin-helpers"` |
| `@/lib/firestore` | Client Components only | `import { createBooking } from "@/lib/firestore"` |

---

## 3. Data Flow Patterns

### Server Component → Firestore

This is the primary data-fetching path for page content:

```
Server Component (page.js)
  → @9trip/shared/firebase/admin-init (Admin SDK init)
  → @9trip/shared/firebase/admin-helpers (serializeSnap, etc.)
    → Firestore (direct read, no auth context needed)
```

All read operations for page content go through the shared Admin SDK helpers. The Admin SDK has full read access to Firestore, bypassing security rules. This is appropriate for server-side rendering and API routes.

**Pattern:**
```js
// page.js — Server Component
import { getTourBySlug } from "@/lib/firestore-admin";

export default async function Page({ params }) {
  const { tour } = await getTourBySlug(params.slug);
  if (!tour) notFound();
  return <TourDetailClient tour={tour} />;
}
```

### Client Component → Firestore

Used for authenticated operations and mutations:

```
Client Component (button click, form submit)
  → firestore.js (Client SDK data access layer)
    → firebase.js (Client SDK init)
      → Firestore (with current user's auth context)
```

Use for: creating bookings, reviews, wishlist toggles, cart operations. These operations need the current user's auth state, which only the Client SDK provides.

### API Routes → Firestore

```
API Route (route.js)
  → @9trip/shared/firebase/admin-init
  → @9trip/shared/firebase/admin-helpers
    → Firestore
```

API Routes run on the server, so they use the Admin SDK via the shared package. This includes:
- Payment initiation endpoints
- Cart validation endpoints
- Contact form submission

### Webhooks → Firestore

```
Webhook Handler (route.js in /webhooks/)
  → @9trip/shared/firebase/admin-init or adminDb directly
  → @9trip/shared/firebase/admin-helpers
    → Firestore
```

Webhooks receive external callbacks (payment gateways, ERP system) and update Firestore directly. They use the Admin SDK via the shared package for full write access.

### Cloud Functions → Firestore

Cloud Functions run in the same monorepo under `functions/`. They access Firestore via the shared Admin SDK (`@9trip/shared/firebase/admin-init` with `useLazyProxy: false`). The web app never calls Cloud Functions directly. Instead, Cloud Functions may trigger on Firestore writes made by the web app, or handle requests routed through firebase.json rewrites.

---

## 4. Auth Patterns

### Firebase Auth Integration

Auth is managed through Firebase Auth with three providers:
- Email/Password
- Google (social login)
- Facebook (social login)

The auth state flows through React Context:

```
AuthProvider (context) → useAuth hook → components
```

`AuthProvider` wraps the entire app in `layout.js` via `AuthWrapper`. It listens to `onAuthStateChanged` and syncs user state + Firestore profile.

### AuthGuard Wrapper Pattern

Protected routes (account pages) use `AuthGuard`:

```jsx
// account/layout.js
import AuthGuard from "@/components/auth/AuthGuard";

export default function AccountLayout({ children }) {
  return <AuthGuard>{children}</AuthGuard>;
}
```

`AuthGuard` redirects unauthenticated users to `/login?redirect=<current_path>`. It shows a loading spinner while checking auth state. Uses `useEffect` with `router.replace` for the redirect.

### Guest Checkout Flow

Users can check out without logging in:
1. Guest adds items to cart (cart is client-side only, no auth needed).
2. Guest fills in customer form at checkout.
3. Guest pays via VNPay/MoMo/PayPal.
4. After payment, a user record is created from the form data if no account exists.
5. Guest receives confirmation email with booking reference.

Authenticated users get benefits: saved profiles, booking history, wishlist, faster checkout.

### Custom Claims

Only one role exists: `customer`. No admin or partner roles. Custom claims are set server-side (Cloud Functions) and read by the Admin SDK for authorization checks in API routes if needed. The frontend does not manage custom claims.

### Auth Cookie Sync

When a user logs in, the auth state syncs to a cookie for defense-in-depth:
```js
document.cookie = `auth-session=1; path=/; max-age=86400; SameSite=Lax`;
```

The `proxy.js` (Next.js 16 convention, replaces middleware.js) checks this cookie for route protection on the edge.

---

## 5. Payment Patterns

### Inventory Hold (TTL 10 min)

When a user clicks "Book Now":

1. Create an `inventory_holds` document with the service details.
2. Set a TTL of 10 minutes (Firestore TTL policy or manual cleanup).
3. Availability = `totalSlots - confirmedBookings - activeHolds`.
4. If payment succeeds within 10 minutes: delete hold, create booking.
5. If hold expires: Firestore auto-deletes it, slots become available again.

The hold prevents double-booking during the payment window. The 10-minute window gives the user enough time to complete payment without blocking inventory indefinitely.

### Payment Gateway Flow

Three gateways supported: **VNPay** (sandbox), **MoMo** (production), **PayPal**.

**Payment initiation:**
1. Server validates booking data, creates a pending booking in Firestore.
2. Server generates a payment URL with gateway-specific signature.
3. Client redirects the user to the payment URL.
4. User completes payment on the gateway's site.

**Gateway-specific details:**
- VNPay: HMAC-SHA512 signature, amount × 100 (VND format), IP address from `x-forwarded-for`.
- MoMo: Raw signature string with exact field order, `captureWallet` request type, `extraData` for additional params.
- PayPal: Standard PayPal REST API flow with order creation and capture.

### Webhook Handling (`/webhooks/payment`)

Single unified endpoint handles all payment gateway callbacks:

```
GET  /webhooks/payment?gateway=vnpay|momo|paypal   — User return redirect
POST /webhooks/payment                               — Server-to-server IPN
```

**Flow:**
1. Gateway detection via query param (GET) or header/body (POST).
2. Signature verification using gateway-specific logic.
3. Update booking status to `paid` + record transaction ID + payment date.
4. Release inventory hold.
5. Forward booking event to ERP (`/webhooks/erp/new-booking`).
6. Send confirmation email to customer.
7. Redirect user to confirmation page (GET only).

**Webhook signature verification** is mandatory. Never process a webhook without verifying its authenticity.

### Booking Confirmation Flow

1. User completes payment on gateway.
2. Gateway redirects back to `/webhooks/payment?gateway=...`.
3. Webhook verifies payment, updates booking to `paid`, releases hold.
4. User sees confirmation page with booking details.
5. Confirmation email sent.
6. ERP webhook notified asynchronously.

---

## 6. SEO Patterns

### generateMetadata

Every detail page and listing page exports a `generateMetadata` function:

```js
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { tour } = await getTourBySlug(resolvedParams.slug);
  if (!tour) return { title: "Not Found — 9 Trip" };

  return {
    title: `${tour.title} — 9 Trip`,
    description: tour.excerpt || `Book ${tour.title} at best price.`,
    alternates: { canonical: `/tours/${resolvedParams.slug}` },
    openGraph: {
      title: `${tour.title} — 9 Trip`,
      description: tour.excerpt,
      images: tour.featuredImage ? [{ url: tour.featuredImage, width: 1200, height: 630 }] : [],
      type: "article",
      locale: "vi_VN",
    },
    twitter: {
      card: "summary_large_image",
      title: `${tour.title} — 9 Trip`,
      description: tour.excerpt,
      images: tour.featuredImage ? [tour.featuredImage] : [],
    },
  };
}
```

### generateStaticParams

All detail pages export `generateStaticParams` returning an empty array. This tells Next.js to render pages on-demand and cache them via ISR rather than pre-building all pages at build time.

```js
export async function generateStaticParams() {
  return []; // All routes rendered on-demand + ISR cached
}
```

### JSON-LD Schema.org

Always generated in Server Components, never in Client Components. Each page type uses the appropriate schema:

| Page | Schema Type | Location |
|------|-------------|----------|
| Tour detail | `TouristTrip` | Server page.js |
| Hotel detail | `Hotel` | Server page.js |
| Activity detail | `LocalBusiness` or `Event` | Server page.js |
| Car detail | `Product` | Server page.js |
| Rental detail | `Product` | Server page.js |
| Listing pages | `ItemList` | Server page.js |
| Homepage | `WebSite` (with SearchAction) | Server page.js |

### Open Graph / Twitter Cards

- Root layout sets default OG image (`/images/og-default.jpg`) and Twitter card.
- Each detail page overrides with page-specific image, title, description.
- OG image dimensions: 1200×630px (standard).
- Twitter card type: `summary_large_image`.
- Locale: `vi_VN`.

### Canonical URLs

Every page sets a canonical URL via `alternates` in metadata:
```js
alternates: { canonical: `/tours/${slug}` }
```

This prevents duplicate content issues from URL variants (trailing slash, query params, etc.).

---

## 7. Performance Patterns

### Image Optimization

- Static assets in `public/images/` referenced by URL path, not module import.
- Next.js `<Image>` component with `width`, `height`, `priority` for above-fold images.
- Lazy loading for gallery images (native `loading="lazy"`).
- Placeholder images for missing content: `/placeholder-{type}.jpg`.

### Dynamic Imports

Heavy components use Next.js dynamic imports with SSR disabled:
```js
import dynamic from "next/dynamic";
const GalleryWithLightbox = dynamic(() => import("@/components/shared/GalleryWithLightbox"), {
  ssr: false,
  loading: () => <PhotoSkeleton />,
});
```

Components that are lazy-loaded:
- `GalleryWithLightbox` (heavy image gallery)
- `GoogleMap` (maps API)
- `ChatWidget` (chat widget)

### Preloading Strategies

- Critical fonts loaded via Next.js font system (`next/font/google`) with `display: swap`.
- Font subsets limited to `vietnamese` and `latin` where possible.
- Critical CSS inlined via Tailwind CSS v4 JIT compilation.
- No manual preloading of images — let the browser handle it via `<Image>` with `priority`.

### ISR Revalidation (3600s)

All detail and listing pages use `revalidate = 3600` (1 hour). This means:
- First visit: page rendered on-demand, cached on edge.
- Subsequent visits within 1 hour: served from cache instantly.
- After 1 hour: page regenerated in background, stale cache served until fresh is ready.
- Manual revalidation via `revalidatePath()` for urgent content updates.

### Code Splitting

Next.js App Router automatically code-splits by route. Additional splitting:
- Dynamic imports for heavy client components (lightbox, maps).
- Zustand stores split by domain (listing store separate from cart).
- Payment logic in `lib/payments/` separated from core data access.

---

## 8. Component Patterns

### Shared Components Index

All shared components live in `src/components/shared/` and re-export from an index pattern:

| Component | Purpose | Lazy Loaded? |
|-----------|---------|-------------|
| `Badge` | Badges for tours, hotels, activities with icon+label+value | No |
| `LoadingSpinner` | Loading skeleton | No |
| `EmptyState` | Empty/no-results state | No |
| `StarRating` | Star rating display | No |
| `PriceDisplay` | Price + discount badge | No |
| `GalleryWithLightbox` | Image gallery with lightbox | Yes |
| `GoogleMap` | Google Maps embed | Yes |
| `ImageCarousel` | Snap-scroll gallery carousel | No |
| `SearchFormPopup` | Search form popup | No |
| `Pagination` | Page navigation | No |

### Badge Component Pattern

Badge uses `"use client"` directive and accepts `icon`, `label`, `value`, `highlight` props. The icon rendering uses ternary operators per known label values (Thoi gian, Dia diem, Xuat phat, etc.).

### LoadingSpinner/EmptyState/StarRating/PriceDisplay

Thin presentational components. They accept data props and render directly. No side effects, no data fetching. These are the building blocks for larger components.

### GalleryWithLightbox / GoogleMap

Heavy components loaded via `dynamic()` with `ssr: false`. They:
- Have their own loading skeleton fallback.
- Only render on the client (browser APIs needed).
- Are placed below the fold or behind user interaction.

### Wrapper Pattern

Used to bridge Server and Client component boundaries:

```
Server Layout → [Client] Wrapper → [Client] Provider → children
```

Examples: `AuthWrapper` wraps `AuthProvider`, `CartProvider` wraps cart context. The wrapper is the thinnest possible client component — just a provider wrapper with `"use client"` and no other logic.

### Module Aliases

- `@/` maps to `src/` (configured in `jsconfig.json`).
- Always use `@/` imports, never relative paths with `../../`.

---

## 9. Error Handling Patterns

### try-catch for Async

Every async operation uses try-catch:

```js
try {
  const data = await fetchSomething();
  return { data };
} catch (error) {
  console.error("[Module] Error:", error);
  return { data: null, error: error.message };
}
```

Expected errors (empty results, missing optional data) are distinguished from unexpected errors using `isExpectedError()`:

```js
import { isExpectedError, logError } from "@/lib/error-utils";

try {
  // ...
} catch (error) {
  if (isExpectedError(error)) {
    logger.info("[Module] Expected:", error.message); // Info, not error
  } else {
    logger.error("[Module] Error:", error);
  }
}
```

### Console Error Format

Follow the pattern: `console.error('[ModuleName] Context:', error)`.
- Module name in square brackets: `[TourDetailPage]`
- Brief context of what failed
- The error object itself (not just `error.message` to preserve stack trace)

### Hydration Mismatch Prevention

Hydration mismatches happen when server HTML differs from client render. Prevention:
- Never use browser-only values (localStorage, window dimensions) in initial render.
- Use `useEffect` for client-only initialization.
- Dynamic imports with `ssr: false` for components that must differ between server/client.
- Theme initialization via inline `<script>` in `<head>` before React hydration.

### Firestore Serialization Errors

Firestore Timestamp and GeoPoint objects cannot be JSON-serialized. Always call `serializeSnap()` / `serializeDocs()` from `@9trip/shared/firebase/admin-helpers` or `serializeTimestamp()` from `@/lib/firestore.js` on data before:
- Passing from Server Component to Client Component via props.
- Returning from API Routes.
- Storing in Zustand or Context.

Serialization happens in the data access layer (shared package admin-helpers and `@/lib/firestore.js`), not in components. If you get `Error: Cannot serialize object as JSON`, the data access function is missing serialization.

### withErrorFallback Helper

For operations where failure is acceptable, use the `withErrorFallback` wrapper:

```js
const safeFetch = withErrorFallback(fetchData, null, "[Feature]");
const result = await safeFetch();
// result is null on error, no throw needed
```

---

## 10. Schema Compliance Rules

### All Code Must Reference Schemas

Every data structure used in the codebase must be documented in `packages/shared/schemas/`. Before writing data access code or rendering data fields, read the relevant schema file.

### Schema Files

| Schema | Collection | File |
|--------|-----------|------|
| Tours | `tours` | `packages/shared/schemas/tours.md` |
| Hotels | `hotels` | `packages/shared/schemas/hotels.md` |
| Activities | `activities` | `packages/shared/schemas/activities.md` |
| Cars | `cars` | `packages/shared/schemas/cars.md` |
| Rentals | `rentals` | `packages/shared/schemas/rentals.md` |
| Bookings | `bookings` | `packages/shared/schemas/bookings.md` |
| Reviews | `reviews` | `packages/shared/schemas/reviews.md` |
| Inventory Holds | `inventory_holds` | `packages/shared/schemas/inventory-holds.md` |
| Hotel Price Schedules | `hotel_price_schedules` | `packages/shared/schemas/hotel-price-schedules.md` |
| Prepaid Pricing | `prepaid_pricing` | `packages/shared/schemas/prepaid-pricing.md` |
| Coupons | `coupons` | `packages/shared/schemas/coupons.md` |
| Users | `users` | `packages/shared/schemas/users.md` |
| Locations | `locations` | `packages/shared/schemas/locations.md` |
| Notifications | `notifications` | `packages/shared/schemas/notifications.md` |
| Counters | `counters` | `packages/shared/schemas/counters.md` |
| Blogs | `blogs` | `packages/shared/schemas/blogs.md` |
| Settings | `settings` | `packages/shared/schemas/settings.md` |

### Field Name Compliance

Field names in code must exactly match the schema definitions. Examples:
- If schema says `featuredImage`, use `featuredImage` not `featured_image` or `coverImage`.
- If schema says `startDate`, use `startDate` not `start_date` or `departureDate`.
- If schema says `totalSlots`, use `totalSlots` not `capacity` or `maxGuests`.

### Type Compliance

Types used in code must match schema types:
- Schema type `Timestamp` → JavaScript `Date` or ISO string (after serialization).
- Schema type `GeoPoint` → `{lat: number, lng: number}` after serialization.
- Schema type `Reference` → `{_ref: string}` after serialization.
- Schema type `Number` → JavaScript `number`.
- Schema type `String` → JavaScript `string`.
- Schema type `Boolean` → JavaScript `boolean`.
- Schema type `Array<...>` → JavaScript `Array`.

### New Fields Require Schema Update First

Before adding a new field to any collection:
1. Update the corresponding schema file in `packages/shared/schemas/`.
2. Add the field with its type, description, and whether it's required.
3. Then write code that uses the new field.
4. Never use a field that is not documented in the schema.

### Schema-Driven Development Workflow

```
1. Identify what data you need
2. Read the relevant schema file
3. Write code using exact field names and types from schema
4. If data is missing from schema, update schema first
5. Write data access functions that return typed objects
6. Serialize at the data access layer
7. Use in components
```

---

## Active Decisions

- **Server-content-first:** All meaningful text content must be in initial HTML for SEO.
- **Tabs = CSS hidden:** All tab content rendered, toggled by CSS class `hidden`, not JS conditional rendering.
- **proxy.js NOT middleware.js:** Next.js 16 uses `proxy.js` convention (confirmed by build warning).
- **Flat lib structure:** No nested `lib/firebase/` subdirectory, use `lib/firebase-auth.js` flat.
- **Public images:** Static assets in `public/images/` referenced by URL path, not module import.
- **Shared Badge component:** Single source of truth in `components/shared/Badge.jsx`.
- **Canonical URLs on all pages:** Full path canonical resolution via Next.js metadata `alternates`.
- **JSON-LD on server:** All structured data generated in Server Components, not client.
- **Hotel ISR:** Changed from force-dynamic to ISR (revalidate=3600) because hotel data changes infrequently.
- **Monorepo with NPM Workspaces:** Shared code lives in `packages/shared/` as `@9trip/shared`. No build step, symlink resolution.
- **Single .env.local:** Root `.env.local` is canonical source. No `dotenv` dependency. Functions v2 auto-loads it.
- **API routes in Cloud Functions only:** No duplicate endpoints between Next.js and Functions. firebase.json rewrites handle routing.
