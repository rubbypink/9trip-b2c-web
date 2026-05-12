---
applyTo: '**'
description: 'System-wide instructions for 9 Trip B2C — Memory Bank, project tenets, code quality, schema compliance, SEO/performance.'
---

# 9 Trip B2C — System Instructions

## 1. MANDATORY: Memory Bank Reading

Before starting ANY code task, you MUST read the following files in order (if you have not already):

1. `memory-bank/systemPatterns.md` — Understand architecture, patterns, conventions
2. `memory-bank/projectContext.md` — Understand project goals, constraints, scope
3. `memory-bank/directory-index.md` — Understand where files live and how they connect
4. Any schema files under `.agents/lib/` relevant to the data you are working with

After reading, you must confirm with this exact statement:

> "I have read the memory bank and understand the project structure."

**THIS IS MUST DO STEP.** Even for small changes. Context prevents regressions.

---

## 2. Core Project Tenets

### Backend Architecture
- **Cloud Functions in separate repo.** This project (tripphuquoc-db-fs) is the Next.js frontend. Backend logic (Firebase Cloud Functions, scheduled jobs) lives in a separate repository. Do not create Cloud Functions here.
- **Admin SDK for Server Components.** Use `@/lib/firestore-admin` (Admin SDK) in Server Components, Route Handlers, and Server Actions.
- **Client SDK for Client Components.** Use `@/lib/firebase` (Client SDK) in Client Components and hooks.

### Client Patterns
- **Preload / dynamic load pattern.** Use Next.js `dynamic()` with loading states for heavy components. Preload critical data with parallel data fetching.
- **Auto-load next page content.** Use Intersection Observer or `prefetch` to load adjacent content before navigation.
- **Server Components by default.** Only use Client Components (`'use client'`) when you need interactivity, browser APIs, or React hooks.

### Tech Stack
- **JavaScript only.** Never create `.ts` / `.tsx` files. Use JSDoc for type annotations.
- **Tailwind CSS v4 only.** Never use CSS modules, styled-components, or inline styles (except programmatic values).
- **Next.js 16 App Router.** Never use `pages/` directory or Pages Router APIs.
- **Firebase modular imports.** Always `import { ... } from 'firebase/auth'`, never `import firebase from 'firebase'`.

### Project Scope
- **Customer-facing only.** Only `customer` role exists. Never build `/admin`, `/partner`, or any dashboard.
- **Schema compliance is mandatory.** All data access must match canonical schema definitions in `memory-bank/schemas/`.

---

## 3. Code Quality Rules

### JSDoc
Every function, component, and module must have JSDoc comments describing:
- Purpose (one line)
- Parameters with types (using `@param {{ type }} name`)
- Return values (using `@returns { type }`)
- Last updated timestamp (using `@updated YYYY-MM-DD`)

Component template:
```jsx
/**
 * ComponentName — Short description.
 * @param {{ propName: Type }} props
 * @updated YYYY-MM-DD
 */
export default function ComponentName({ propName }) { ... }
```

### Error Handling
- Wrap all async operations in `try-catch` blocks.
- Use the project logger for errors: `import { logger } from '@/lib/logger'`.
- Console error format: `logger.error('Context:', error)` never raw `console.error`.
- Never swallow errors. Always log them and provide user feedback.

### Full Code Only
Never return partial, pseudo, or placeholder code. Always provide complete, working implementations.

### Server Components Default
- Most components should be Server Components.
- Only add `'use client'` when interactivity, browser APIs, or React hooks are required.
- Keep Client Components leaf nodes — push data fetching up to Server Components.

### Firestore Serialization
Before passing Firestore data to a Client Component, always serialize Timestamps:
```js
import { serializeDoc } from '@/lib/firestore';
return <ClientComponent data={serializeDoc(snapshot)} />;
```

---

## 4. Schema Compliance Enforcement

### Check Schemas Before Modifying Code
Before reading or writing any Firestore data, check the canonical schema definitions in `memory-bank/schemas/`:
- `memory-bank/schemas/hotels-schema.mjs` — Hotel-specific schema
- `memory-bank/schemas/tours-schema.mjs` — Tour-specific schema
- `memory-bank/schemas/activities-schema.mjs` — Activity-specific schema
...

### Field Names and Types Must Match
- Use the exact field name from the schema (e.g., `rating.average` not `ratingAverage`).
- Check nested field paths carefully. Dotted paths in Firestore queries use string literals: `'rating.average'`.
- Validate types match: if schema says `price: Number`, do not treat it as a string.

### New Fields Require Schema Update FIRST
If you need a field that does not exist in the schema:
1. Update the schema file FIRST (in `memory-bank/schemas/`).
2. Update Firestore security rules if needed.
3. Then update application code.

### Audit Your Changes
After modifying any code that accesses Firestore, cross-reference every field against the schema. Flag mismatches immediately.

---

## 5. SEO & Performance Rules

### ISR / SSG
- Use Incremental Static Regeneration for detail pages.
- Add `export const revalidate = 3600;` to all `[slug]/page.js` and similar dynamic page files.
- Revalidate goes right after imports, before any function or export declarations.

### JSON-LD Structured Data
- Every detail page (tour, hotel, activity, car, rental, blog post) must include JSON-LD structured data.
- Use `@/lib/json-ld` helpers for generating schema.org compliant markup.

### Image Optimization
- Use Next.js `Image` component with explicit `width`, `height`, and `priority` for above-the-fold images.
- Lazy-load below-the-fold images with `loading="lazy"`.
- Serve images in WebP format via Firebase Storage or optimized CDN.

### Dynamic Imports
- Use `next/dynamic` for heavy components that are not needed immediately.
- Use `dynamic(() => import('./Component'), { loading: () => <Skeleton /> })` with meaningful loading states.
- Avoid bundling large libraries in the critical path.

---

## 6. Additional Rules

1. **No fake code results or reports.** Never return hardcoded data or fake reports. Always return real results based on actual code and data.
2. **Use coding skills.** Example Load `tailwind-design-system` for UI consistency.
3. **No exceptions.** These rules apply to all code without exception. If a scenario seems to require breaking a rule, raise an issue for discussion instead of violating the rule.
4. **File organization.** Follow the existing directory structure established in `memory-bank/directory-index.md`. Do not create files in arbitrary locations.
