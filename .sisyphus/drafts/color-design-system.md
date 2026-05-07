# Draft: Color Design System for 9Trip ERP

## Requirements (confirmed)
- **Tech**: Tailwind CSS v4 + CSS vars
- **Test**: Full TDD (visual regression)
- **Style**: Light (Warm Yellow Pastel) + Dark (IDE-style Gray)
- **Override Bootstrap**: NO (Tailwind only)
- **Purpose**: Tourism platform (many images) - neutral backgrounds, accent UI elements

## Technical Context

### Current Setup
- **Tailwind v4** với `@tailwindcss/postcss`
- **globals.css** chứa `@theme` block với custom color tokens
- **OKLCH** color format (modern, perceptually uniform)
- **Dark mode**: Class-based (`.dark` class) - NOT `prefers-color-scheme`

### Current Color Tokens (globals.css:4-71)
```
Primary: oklch(80% 0.17 95) - Bright Yellow
Secondary: oklch(72% 0.17 50) - Orange
Accent: oklch(62% 0.12 185) - Teal
Background: oklch(100% 0 0) - White
Foreground: oklch(20% 0.02 264) - Dark Blue-Gray
```

### Current Issues (from user request)
- **Background**: Dùng trắng tinh (#FFFFFF) cho card - OK nhưng cần xám nhạt hơn
- **Text**: Dùng xám đậm (#212529) - hợp lý
- **Dark mode**: Dùng `.dark` class - cần đổi sang `prefers-color-scheme: dark`
- **Surface colors**: Cần bổ sung elevation system

## Proposed Color Palette

### LIGHT MODE (Warm Yellow Pastel)
| Token | OKLCH | Hex | Usage |
|-------|-------|-----|-------|
| `--color-primary` | oklch(80% 0.15 95) | #F5C542 | CTA buttons, active states |
| `--color-primary-50` | oklch(97% 0.03 95) | #FFF9E6 | Lightest tint |
| `--color-primary-100` | oklch(94% 0.05 95) | #FFF3CC | Subtle backgrounds |
| `--color-primary-200` | oklch(88% 0.10 95) | #FFE699 | Hover states |
| `--color-primary-300` | oklch(82% 0.12 95) | #FFD94D | Secondary emphasis |
| `--color-primary-400` | oklch(76% 0.14 95) | #F5C542 | Primary base |
| `--color-primary-500` | oklch(72% 0.15 95) | #E5B035 | Active/darker |
| `--color-primary-600` | oklch(65% 0.15 95) | #D4A028 | Pressed state |
| `--color-primary-foreground` | oklch(15% 0.02 264) | #1A1A2E | Text on primary |

| Token | OKLCH | Hex | Usage |
|-------|-------|-----|-------|
| `--color-bg-base` | oklch(99% 0.005 264) | #F8F9FA | Page background |
| `--color-bg-elevated` | oklch(100% 0 0) | #FFFFFF | Elevated surfaces |
| `--color-bg-sunken` | oklch(97% 0.008 264) | #EEF1F3 | Lowered areas |

| Token | OKLCH | Hex | Usage |
|-------|-------|-----|-------|
| `--color-surface` | oklch(100% 0 0) | #FFFFFF | Cards |
| `--color-surface-hover` | oklch(99% 0.005 264) | #F8F8F8 | Hover |
| `--color-surface-active` | oklch(97% 0.008 264) | #F0F0F0 | Active |

| Token | OKLCH | Hex | Usage |
|-------|-------|-----|-------|
| `--color-text-primary` | oklch(21% 0.02 264) | #212529 | Main text |
| `--color-text-secondary` | oklch(38% 0.02 264) | #495057 | Secondary |
| `--color-text-muted` | oklch(53% 0.02 264) | #868E96 | Muted |
| `--color-text-disabled` | oklch(68% 0.01 264) | #ADB5BD | Disabled |
| `--color-text-inverse` | oklch(100% 0 0) | #FFFFFF | On dark bg |

| Token | OKLCH | Hex | Usage |
|-------|-------|-----|-------|
| `--color-border` | oklch(91% 0.01 264) | #E9ECEF | Default |
| `--color-border-hover` | oklch(81% 0.02 264) | #CED4DA | Hover |
| `--color-border-focus` | oklch(80% 0.15 95) | #F5C542 | Focus ring |

| Token | OKLCH | Hex | Usage |
|-------|-------|-----|-------|
| `--color-success` | oklch(62% 0.15 145) | #52B788 | Success |
| `--color-warning` | oklch(76% 0.15 70) | #FFBA08 | Warning |
| `--color-danger` | oklch(53% 0.22 27) | #E63946 | Danger/Error |
| `--color-info` | oklch(62% 0.18 250) | #339AF0 | Info |

### DARK MODE (IDE-style Gray)
| Token | OKLCH | Hex | Usage |
|-------|-------|-----|-------|
| `--color-bg-base` | oklch(15% 0.01 264) | #121212 | Page background |
| `--color-bg-elevated` | oklch(20% 0.015 264) | #1A1A1A | Elevated surfaces |
| `--color-bg-sunken` | oklch(10% 0.01 264) | #0A0A0A | Lowered areas |

| Token | OKLCH | Hex | Usage |
|-------|-------|-----|-------|
| `--color-surface` | oklch(20% 0.02 264) | #1E1E1E | Cards |
| `--color-surface-hover` | oklch(22% 0.02 264) | #252525 | Hover |
| `--color-surface-active` | oklch(25% 0.02 264) | #2D2D2D | Active |

| Token | OKLCH | Hex | Usage |
|-------|-------|-----|-------|
| `--color-text-primary` | oklch(92% 0.01 264) | #E8E8E8 | Main text |
| `--color-text-secondary` | oklch(68% 0.02 264) | #B0B0B0 | Secondary |
| `--color-text-muted` | oklch(50% 0.02 264) | #707070 | Muted |

| Token | OKLCH | Hex | Usage |
|-------|-------|-----|-------|
| `--color-border` | oklch(25% 0.02 264) | #2A2A2A | Default |
| `--color-border-hover` | oklch(30% 0.02 264) | #3A3A3A | Hover |

| Token | OKLCH | Hex | Usage |
|-------|-------|-----|-------|
| `--color-primary` | oklch(72% 0.15 95) | #E0B440 | Desaturated yellow |
| `--color-primary-400` | oklch(72% 0.15 95) | #E0B440 | Base |
| `--color-primary-300` | oklch(78% 0.14 95) | #F0C450 | Lighter |

## Design Decisions

### Why OKLCH for Tourism Platform?
1. **Perceptual uniformity**: Mắt người nhận biết màu đồng đều hơn RGB
2. **Easy hue rotation**: Dễ dàng tạo variants (lighter/darker)
3. **Gamut clamping**: Tự động handle sRGB fallback
4. **Modern browser support**: Đã supported rộng rãi

### Why Desaturated Primary in Dark Mode?
- **Neon prevention**: Vàng bão hòa cao trên nền tối sẽ tạo hiệu ứng "phát sáng" khó chịu
- **IDE style**: Giống VSCode/GitHub Dark - primary desaturated nhưng vẫn nhận biết được
- **WARMTH preserved**: Không desaturate quá mức - giữ lại "vàng ấm" cảm giác

### Why Elevation System (not flat)?
- **Depth perception**: Cards "nổi" lên trên background
- **Visual hierarchy**: Người dùng hiểu ngay đâu là interactive element
- **Tourism context**: Nhiều ảnh + text overlay - cần layers rõ ràng

## Test Strategy (TDD)

### Visual Regression Testing
1. **Snapshot tests** cho color tokens (test computed values)
2. **Contrast ratio tests** (WCAG AA compliance)
3. **Dark/Light mode switching tests**
4. **Playwright** cho browser-based visual tests

## Open Questions
- [x] Tech choice: Tailwind v4 với CSS vars - CONFIRMED
- [x] Test strategy: Full TDD - CONFIRMED
- [ ] Dark mode trigger: `prefers-color-scheme` hay class-based? (User preference: prefers-color-scheme based on context)
- [ ] Bootstrap override: Có cần không? (User context: Tailwind only)

## Scope Boundaries
- IN: globals.css update, utility classes, dark mode, tests
- OUT: Bootstrap overrides (không dùng BS), TypeScript (JS only per project rules)