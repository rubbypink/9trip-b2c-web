---
applyTo: "**"
description: "System-wide non-negotiable rules for 9Trip B2C — JavaScript only, Next.js 16 App Router, Firebase read-only, JSDoc required, no admin/partner features."
---

# 9Trip B2C — System Rules

## Absolute Constraints (DO NOT VIOLATE)

1. **JavaScript only.** Never create `.ts` / `.tsx` files. Use JSDoc for type annotations.
2. **App Router only.** Never use `pages/` directory or Pages Router APIs.
3. **Server Components by default.** Only add `'use client'` when using hooks (`useState`, `useEffect`, `useContext`, event handlers).
4. **No admin, no partner.** Only `customer` role exists. Never build `/admin`, `/partner`, or any dashboard.
5. **Firebase read-only for services.** Collections `tours`, `hotels`, `rooms`, `activities`, `cars`, `rentals`, `locations`, `settings`, `coupons` — web reads only, never writes.
6. **Tailwind CSS v4 only.** Never use CSS modules, styled-components, or inline styles (except programmatic values).
7. **Firebase modular imports.** Always `import { ... } from 'firebase/auth'`, never `import firebase from 'firebase'`.

## Every Component Requires

```jsx
/**
 * ComponentName — Short description (one line).
 * @param {{ propName: Type }} props
 */
export default function ComponentName({ propName }) { ... }
```

## Firestore Serialization

Before passing Firestore data to a Client Component, always serialize Timestamps:

```js
import { serializeDoc } from "@/lib/firestore";
return <ClientComponent data={serializeDoc(snapshot)} />;
```
Failure to do this causes Next.js 16 "Objects are not valid as React child" errors.