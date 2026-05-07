# Draft: Browser Automation Optimization

## Requirements (confirmed)
- Tối ưu `browser-automation.mjs` dựa trên patterns trong `ivivu-test.mjs`
- Chuyển hardcoded data → generic params + JSDoc
- Hàm trùng tên/chức năng → cập nhật theo ivivu-test.mjs
- Hàm mới → tạo mới
- KHÔNG sửa `ivivu-test.mjs`

## Research Findings

### Consumers of browser-automation.mjs
1. `activityScraper.mjs` → `extractActivityPage`
2. `runScraper.mjs` → `extractActivityPage`
3. `getHotelImages.mjs` → `initSession, closeSession, openPage, evaluate, waitForNetworkIdle, clickByText, scroll, waitForText`
4. `tourScraper.mjs` → `extractWithInteractions, getSnapshot` (dynamic import)

### Test Infrastructure
- Framework: vitest
- Also has @playwright/test
- Only 1 test file: `src/__tests__/cart.test.js`
- No tests exist for `.agents/lib/` code

### Patterns in ivivu-test.mjs to extract

**NEW helpers to create:**
1. `STEALTH_ARGS` — const string (anti-detection browser args)
2. `parsePrice(text)` — generic price parser (khác `parsePricingFromRawText`)
3. `getElementCount(selector)` — wrapper `get count` 
4. `scrollThrough(options)` — multi-scroll with nativeSleep pattern
5. `waitForElements(selector, options)` — wait until element count > 0
6. `nativeSleep(ms)` — Promise-based sleep (already used internally as `new Promise`)

**Helpers to UPDATE (matching ivivu-test.mjs approach):**
1. `runEvalStdinSync` — add `--session` flag (currently env var only)
2. `evaluate` — improve escaping (match `runJS` pattern)
3. `injectDataAgentSync` — parameterize selectors
4. `extractPricePanelSync` — parameterize selectors

**Already adequate (keep as is):**
- `extractIvivuActivityPrices` — domain-specific
- `extractChildPricesPerTier` — domain-specific  
- `parsePricingFromRawText` — domain-specific (internal)

## Scope Boundaries
- INCLUDE: browser-automation.mjs only
- EXCLUDE: ivivu-test.mjs (không sửa)
- EXCLUDE: consumer files (activityScraper, getHotelImages, tourScraper)

## Open Questions
- [ ] Test strategy: TDD / tests-after / none?
- [ ] Có cần cập nhật consumer files để dùng helper mới không? Hay chỉ thêm export mới?
- [ ] `STEALTH_ARGS` có cần parameterized (user-agent, args) hay hardcoded constant?
