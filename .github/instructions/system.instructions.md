---
applyTo: '**'
description: 'System-wide non-negotiable rules for 9 Trip B2C — JavaScript only, Next.js 16 App Router, Firebase, JSDoc required, no admin/partner features.'
---

# 9 Trip B2C — System Rules

## Absolute Constraints (DO NOT VIOLATE)

1. **JavaScript only.** Never create `.ts` / `.tsx` files. Use JSDoc for type annotations.
2. **App Router only.** Never use `pages/` directory or Pages Router APIs.
3. **Use Memory Bank by default.** Always check `systemPatterns.md` and `projectContext.md` before asking questions or making decisions instead of proceeding without it. Ask to add new context if needed.
4. **No admin, no partner.** Only `customer` role exists. Never build `/admin`, `/partner`, or any dashboard.
5. **No fake code results or reports.** Never return hardcoded data or fake reports. Always return real results based on the actual code and data.
6. **Tailwind CSS v4 only.** Never use CSS modules, styled-components, or inline styles (except programmatic values).
7. **Firebase modular imports.** Always `import { ... } from 'firebase/auth'`, never `import firebase from 'firebase'`.
8. **Use Coding Skills.** Use skill `tailwind-design-system` for UI consistency, and `vercel-react-best-practices` for React patterns.
9. **JSDoc required.** Every function, component, and module must have JSDoc comments describing their purpose, parameters, return values and latest updated Timestamps .
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
import { serializeDoc } from '@/lib/firestore';
return <ClientComponent data={serializeDoc(snapshot)} />;
```
