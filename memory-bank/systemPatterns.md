# 9 Trip B2C - Core Patterns

## Tech Stack

- FE: Next.js 14+ (App Router), React, TailwindCSS.
- BE/DB: Firebase (Firestore, Auth, Storage).

## Rules

1. UI: Mobile-first Tailwind (e.g., `text-sm md:text-base`).
2. SEO: Semantic HTML (`<article>`, `<nav>`, `<h1>`). Image `alt` required.
3. Code: Functional components, Hooks. No Class components.
4. Error: Mandatory `try-catch` wrapper for async/API calls.
5. Log: Clear console errors (`console.error('[Module] Error:', err)`).
6. Output: FULL code only. NO `// rest of code`.

## Workflow

- Read `directory-index.md` for project fastest index.
- Read `projectContext.md` for project brief, tech patterns.
- Read `activeContext.md` before coding.
- Update `activeContext.md` after task completion.

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
