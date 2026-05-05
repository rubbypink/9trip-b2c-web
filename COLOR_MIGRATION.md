# Tailwind Color Migration Guide — 9Trip B2C

> Tài liệu này định nghĩa mapping từ hardcoded colors sang design tokens.

## Color Mapping

### Surface/Background Colors (bg-white, bg-gray-* → tokens)

| Old (Hardcoded) | New (Token) | Usage |
|-----------------|-------------|-------|
| `bg-white` | `bg-background` hoặc `bg-card` | Page/card backgrounds |
| `bg-gray-50` | `bg-gray-50` hoặc `bg-muted/5` | Light section backgrounds |
| `bg-gray-100` | `bg-gray-100` | Card backgrounds, hover states |
| `bg-gray-200` | `bg-gray-200` | Borders, dividers |
| `bg-gray-800` | `bg-gray-800` | Dark sections |
| `bg-gray-900` | `bg-gray-900` | Footer, dark panels |

### Text Colors (text-gray-* → tokens)

| Old (Hardcoded) | New (Token) | Usage |
|-----------------|-------------|-------|
| `text-gray-400` | `text-gray-400` hoặc `text-muted` | Disabled text, placeholders |
| `text-gray-500` | `text-gray-500` hoặc `text-muted-foreground` | Secondary text |
| `text-gray-600` | `text-gray-600` | Body text |
| `text-gray-700` | `text-gray-700` | Emphasis text |
| `text-gray-800` | `text-gray-800` hoặc `text-foreground` | Headings |
| `text-gray-900` | `text-gray-900` hoặc `text-foreground` | Primary headings |
| `text-white` | `text-white` hoặc `text-card-foreground` (on dark) | White text |

### Border Colors (border-gray-* → tokens)

| Old (Hardcoded) | New (Token) | Usage |
|-----------------|-------------|-------|
| `border-gray-100` | `border-gray-100` hoặc `border-border/50` | Light borders |
| `border-gray-200` | `border-gray-200` hoặc `border-border` | Default borders |
| `border-gray-300` | `border-gray-300` | Input borders |

### Primary Colors (blue-* → primary-*)

| Old (Hardcoded) | New (Token) | Usage |
|-----------------|-------------|-------|
| `blue-50` | `primary-50` | Light backgrounds |
| `blue-100` | `primary-100` | Light borders, hover states |
| `blue-500` | `primary-500` | Primary buttons, links |
| `blue-600` | `primary-600` | Primary hover, active states |
| `blue-700` | `primary-700` | Darker accents |
| `text-blue-600` | `text-primary-600` | Link text |
| `bg-blue-600` | `bg-primary-600` | Button backgrounds |
| `border-blue-500` | `border-primary-500` | Focus rings, borders |
| `hover:bg-blue-700` | `hover:bg-primary-700` | Button hovers |

### Neutral Colors (slate-* → foreground/muted)

| Old (Hardcoded) | New (Token) | Usage |
|-----------------|-------------|-------|
| `slate-50` | `bg-background` | Page backgrounds |
| `slate-100` | `bg-muted/10` | Card backgrounds |
| `slate-200` | `border-border` | Borders |
| `slate-400` | `text-muted` | Secondary text |
| `slate-500` | `text-muted-foreground` | Placeholder text |
| `slate-600` | `text-foreground` | Body text |
| `slate-700` | `text-foreground` | Headings |
| `slate-800` | `text-foreground` | Dark text |
| `slate-900` | `text-foreground` | Dark headings |

### Accent Colors (orange-* → secondary-*)

| Old (Hardcoded) | New (Token) | Usage |
|-----------------|-------------|-------|
| `orange-500` | `secondary-500` | Prices, CTAs |
| `orange-600` | `secondary-600` | Price text |
| `text-orange-600` | `text-secondary-600` | Price display |
| `bg-orange-500` | `bg-secondary-500` | Cart badges |

### Semantic Colors

| Usage | Token |
|-------|-------|
| Star ratings | `text-yellow-400` (keep) hoặc `--color-star` |
| Success states | `text-emerald-600` → `text-accent` |
| Error states | `text-red-600` → `text-destructive` |

## Migration Priority

### Phase 1: Core Components (HIGH)
1. `layout/Header.jsx` — 19 blue-*
2. `layout/Footer.jsx` — 10 blue-*
3. `home/HeroBanner.jsx` — 4 blue-*
4. `shared/HotelCard.jsx` — 2 blue-*
5. `shared/ActivityCard.jsx` — 2 blue-*

### Phase 2: Account Components (MEDIUM)
1. `account/*` — 96 slate-* total
2. `cart/*` — mixed colors

### Phase 3: Detail Pages (MEDIUM)
1. `tours/TourDetailClient.jsx`
2. `hotels/HotelDetailClient.jsx`
3. `activities/ActivityDetailClient.jsx`

## Design Tokens Reference

```css
/* From globals.css @theme block */
--color-primary: oklch(62% 0.19 255);
--color-primary-50: oklch(97% 0.02 255);
--color-primary-100: oklch(93% 0.06 255);
--color-primary-500: oklch(62% 0.19 255);
--color-primary-600: oklch(55% 0.19 255);
--color-primary-700: oklch(47% 0.18 255);
--color-secondary: oklch(78% 0.16 82);
--color-foreground: oklch(20% 0.02 264);
--color-muted: oklch(55% 0.02 264);
--color-muted-foreground: oklch(46% 0.02 264);
--color-border: oklch(91% 0.01 264);
```

## Migration Commands (VS Code)

```bash
# Replace blue-* with primary-* (careful!)
# Find: bg-blue-(50|100|500|600|700)
# Replace: bg-primary-$1

# Replace slate-* with semantic tokens (manual review needed)
# Find: text-slate-(400|500|600|700|800|900)
# Replace: text-muted hoặc text-foreground (context-dependent)

# Replace orange-* with secondary-*
# Find: text-orange-(500|600)
# Replace: text-secondary-500 hoặc text-secondary-600
```
