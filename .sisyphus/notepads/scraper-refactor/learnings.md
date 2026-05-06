## [2026-05-06] Initial Setup

### Key Architecture
- `browser-automation.mjs` (~1210+ lines) — main browser wrapper, runCommand() at lines 60-80
- `ivivu-adapter.mjs` — extractActivityTiersFromMarkdown() ~line 738, extractActivityTiersFromPlainText() ~line 809
- `pricing-extractor.mjs` — extractActivityPricingTiersFromHTML() ~line 437
- `activityScraper.mjs` — main scraper, childPrices NEVER merged into pricing.tiers (CRITICAL BUG)

### Root Cause
extractChildPricesPerTier() extracts real child prices BUT activityScraper.mjs NEVER MERGES them into pricing.tiers[]

### Bugs to Fix
1. childPrice: 0 hardcoded (should be null) in ivivu-adapter.mjs lines ~738 and ~809
2. childPrice: 0 hardcoded in pricing-extractor.mjs line ~437
3. extractChildPricesPerTier() only processes first 3 tiers (need 10)
4. 20-line look-ahead limit in extractActivityTiersFromPlainText() (need 40)
5. activityScraper.mjs missing merge of childPrices into pricing.tiers[]

### Baseline (Pre-Refactor) — MUST PRESERVE
Adult prices: [625000, 435000, 240000, 145000, 630000, 780000, 780000, 680000, 820000, 820000]
Gallery: 30+ images
Location: "Tây Ninh"

### Constraints
- Do NOT change /gi regex patterns
- Do NOT change MAP_TO_FIRESTORE
- Do NOT change adapter pattern structure
- Do NOT remove browser-helpers.mjs
- Keep sleep() as fallback — do NOT remove entirely
- Do NOT add new agent-browser features (diff, annotate, tabs)

### agent-browser Key Patterns (from research)
- `snapshot -i` → interactive elements with refs
- `wait --fn "JS_EXPRESSION"` → smart JS condition wait
- `wait --text "content"` → wait for text to appear
- `wait --load networkidle` → wait for network idle
- `batch` → multi-command batch execution
- `get text @ref` → read text from element
- `find role/text/label` → find elements

### ivivu Booking Form DOM
- `.tkn__quantity--box non-pkg` containers
- `btn btn-more` (plus button), `btn btn-less` (minus button)
- Flow: click "Chọn" → form loads → click child "+" → price appears
