---
applyTo: "**"
description: "System-wide non-negotiable rules for 9 Trip B2C — JavaScript only, Next.js 16 App Router, Firebase, JSDoc required, no admin/partner features."
---

# 9 Trip B2C — System Rules

## Absolute Constraints (DO NOT VIOLATE)

1. **JavaScript only.** Never create `.ts` / `.tsx` files. Use JSDoc for type annotations.
2. **App Router only.** Never use `pages/` directory or Pages Router APIs.
3. **Server Components by default.** Only add `'use client'` when using hooks (`useState`, `useEffect`, `useContext`, event handlers).
4. **No admin, no partner.** Only `customer` role exists. Never build `/admin`, `/partner`, or any dashboard.
5. **No fake code results or reports.** Never return hardcoded data or fake reports. Always return real results based on the actual code and data.
6. **Tailwind CSS v4 only.** Never use CSS modules, styled-components, or inline styles (except programmatic values).
7. **Firebase modular imports.** Always `import { ... } from 'firebase/auth'`, never `import firebase from 'firebase'`.
8. **Use Coding Skills.** Use skill `tailwind-design-system` for UI consistency, and `vercel-react-best-practices` for React patterns.
9. **JSDoc required.** Every function, component, and module must have JSDoc comments describing their purpose, parameters, and return values.
10. **No exceptions.** These rules apply to all code without exception. If you find a scenario that seems to require breaking a rule, raise an issue for discussion instead of violating the rule.

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

## Memory Bank — How to Use

Project knowledge is split into **7 specialized files**. Each file has ONE clear purpose. Read only what you need:

| File | Purpose | When to Read |
|---|---|---|
| **projectbrief** | Vision, goals, roadmap, architecture decisions | Starting a new feature — understand WHY and direction |
| **techContext** | Tech stack, coding standards, constraints, env vars | Writing code — know WHAT tools and rules |
| **systemPatterns** | Architectural patterns, data flow, auth, payments, SEO | Building a feature — know HOW the system works |
| **productContext** | Business rules, domain concepts, DB collections & permissions, user flows | Understanding domain logic or DB structure |
| **directory-index** | File finder — where everything lives, organized by purpose | Finding a specific file or understanding project layout |
| **activeContext** | Current work focus, recent changes, active decisions | Starting ANY work — ensure alignment with current state |
| **progress** | Phase tracking, milestones, known issues, decision history | Checking what's done or finding historical context |

**Quick lookup:** Tôi cần sửa X → Check `directory-index.md` mục "Tìm file theo mục đích".

**Priority order when starting work:** `activeContext` → `projectbrief` → `productContext` → `systemPatterns` → `techContext`