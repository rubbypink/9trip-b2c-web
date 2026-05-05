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

## Project Context
For full project context, see in `memory-bank/`. Choose to read the following files based on your needs:
1. **projectbrief** project overview, goals, target audience, key features.
2. **techContext** current tech stack, project structure, environment variable, coding standards.
3. **systemPatterns** system patterns, firebase architecture,  calculation logic, other patterns like Payment, data fetching, seo etc.
4. **productContext** project reality meaning like project goals, user needs...
5. **activeContext** current focus, recent changes, next steps. Refresh this before starting work to ensure alignment with current priorities and context.
6. **progress** Project progress, milestones, blockers, etc. Update this regularly to keep track of progress and challenges.
7. **schema** includes files like `hotels.schema.md`, `tours.schema.md`, etc. that define the Firestore document structure for each collection.