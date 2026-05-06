# Refactor Scape Skills — Playwright/Agent-Browser (No FireCrawl)

## TL;DR

> **Quick Summary**: Refactor all 3 scraper skills (tour, booking, activity) to use **Playwright MCP + agent-browser CLI** exclusively. Remove ALL FireCrawl dependencies: no FireCrawl SDK, no FireCrawl API calls, no `@mendable/firecrawl-js`. Fix the broken booking-scraper import, refactor activity-scraper away from raw API, and standardize on the tour-scraper pattern which already works correctly.
>
> **Key Change**: The `tour-scraper` already implements the correct pattern with dual modes (Playwright MCP standard / agent-browser CLI lazy). Booking and activity scraper must be refactored to match.
>
> **Deliverables**:
> - `browser-automation.mjs` — Enhanced with booking + activity domain helpers
> - `getHotelImages.mjs` — Refactored to use `browser-automation.mjs` (no FireCrawl)
> - `activityScraper.mjs` — Refactored to use `browser-automation.mjs` (no FireCrawl)
> - `websearch.mjs` — FireCrawl engine removed from OpenRouter
> - All schemas — FireCrawl prompts + credits tracking removed
> - All SKILL.md files — Updated for Playwright workflow
>
> **Estimated Effort**: Medium-Large (3 waves)
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: browser-automation enhancements → booking refactor + activity refactor (parallel) → documentation

---

## Context

### Original Request

User wants to:
1. Stop using FireCrawl entirely — uninstall, remove all references
2. Use Playwright MCP and agent-browser CLI (whichever is more optimal per scenario)
3. Guarantee ALL data extraction including JavaScript-rendered content

### Current Broken State (post-cleanup)

After Phase 1 cleanup (stale plans, duplicate scripts, archived files deleted), here's the actual state:

| Skill | Scraper File | Status | FireCrawl Usage |
|-------|-------------|--------|-----------------|
| **tour-scraper** | `tourScraper.mjs` | ✅ WORKS | None — uses Playwright + agent-browser |
| **booking-scraper** | `getHotelImages.mjs` | ❌ BROKEN | Imports from non-existent `firecrawl-agent.mjs` |
| **activity-scraper** | `activityScraper.mjs` | ❌ PARTIAL | `scrapeActivityFromUrl()` uses raw FireCrawl API; `scrapeActivityFromText()` is clean |

### Architecture: Two-Mode Approach (tour-scraper pattern)

The tour-scraper establishes the correct pattern that all scrapers should follow:

```
Mode 1 (Standard): Playwright MCP navigates → extract page text → scrapeFromText()
Mode 2 (Lazy Rendering): agent-browser CLI → interactions → extractWithInteractions() → scrapeFromText()
Mode 3 (Offline): --markdown=file → scrapeFromText()
```

**When to use each:**
- **Playwright MCP**: Static or simple pages, fast extraction, zero credits
- **agent-browser CLI**: JS-heavy pages with lazy loading, galleries, accordion content
- **Offline markdown**: Testing, debugging, re-processing

### Shared Infrastructure (already exists)

- `browser-automation.mjs` — Wraps agent-browser CLI with: session mgmt, navigation, click/scroll/wait, text extraction, domain-specific helpers
- `browser-helpers.mjs` — Browser interaction utilities (selectors, overlay dismissal)
- `adapters/ivivu-adapter.mjs` — ivivu-specific DOM/markdown extraction
- `adapters/booking-adapter.mjs` — booking.com-specific extraction
- `pricing-extractor.mjs` — Price parsing (clean, no FireCrawl)
- `sanitize-data.mjs` — Data sanitization (clean)
- `image-helpers.mjs` — Image processing (clean)
- `firebase-helpers.mjs` — Firebase CRUD (clean)

---

## Work Objectives

### Core Objective

Remove ALL FireCrawl usage from the codebase. Refactor booking-scraper and activity-scraper to match the proven tour-scraper pattern using Playwright MCP + agent-browser CLI. Ensure JavaScript-rendered content is captured through browser automation interaction steps.

### Concrete Deliverables

- **Enhanced `browser-automation.mjs`**: New `extractActivityPage()` domain helper
- **Fixed `getHotelImages.mjs`**: No FireCrawl imports, uses `browser-automation.mjs`
- **Fixed `activityScraper.mjs`**: `scrapeActivityFromUrl()` rewritten using browser automation
- **Clean `websearch.mjs`**: FireCrawl engine removed, generic web search
- **Clean schemas**: `_firecrawlCredits` removed, `AGENT_PROMPT` removed/renamed
- **Updated SKILL.md**: All 3 skills document Playwright workflow
- **Clean `saveBookingData.js`**: Comment updated (already done in Phase 1)

### Must Have

- All 3 scrapers work without ANY FireCrawl dependency
- Booking scraper: `--url` and `--name` modes functional
- Activity scraper: `--url` mode functional (replaces FireCrawl API call)
- JavaScript-rendered content capture: lazy galleries, accordion pricing, dynamic itineraries
- No `@mendable/firecrawl-js` imports anywhere
- No FireCrawl API key references
- No `_firecrawlCredits` field in output

### Must NOT Have

- ❌ NO FireCrawl SDK imports (`@mendable/firecrawl-js`)
- ❌ NO raw FireCrawl API calls (`api.firecrawl.dev`)
- ❌ NO `FIRECRAWL_API_KEY` references in code (env var can stay but unused)
- ❌ NO `_firecrawlCredits` tracking
- ❌ NO FireCrawl Agent prompts in schemas
- ❌ NO `engine: 'firecrawl'` in websearch
- ❌ NO changes to `src/` directory (except comment fix — already done)
- ❌ NO TypeScript

---

## Execution Strategy

### Wave 1: Foundation & Enhancement (parallel)

```
Wave 1 (all parallel):
├── Task 1: Enhance browser-automation.mjs with booking + activity helpers
├── Task 2: Clean websearch.mjs — remove FireCrawl engine
└── Task 3: Clean schemas — remove FireCrawl prompts + credits tracking
```

### Wave 2: Scraper Refactor (parallel after Wave 1)

```
Wave 2 (parallel):
├── Task 4: Refactor booking-scraper (getHotelImages.mjs) to use browser-automation
└── Task 5: Refactor activity-scraper (activityScraper.mjs) to use browser-automation
```

### Wave 3: Documentation + Final Verification

```
Wave 3 (sequential):
├── Task 6: Update all 3 SKILL.md files
└── Wave FINAL: Verification (4 parallel review agents)
```

---

## TODOs

- [ ] 1. Enhance `browser-automation.mjs` with domain helpers

  **What to do**:
  - Add `extractActivityPage(url, options)` — wraps `extractWithInteractions()` with activity-specific interaction steps (gallery clicks, pricing tab expansion, FAQ accordion)
  - Add `extractBookingPage(url, options)` — wraps `extractWithInteractions()` with booking-specific interaction steps (cookie dismissal, room card expansion, photo gallery)
  - Add `extractPageText(url, adapterName)` — simple navigation + body text extraction for standard mode
  - Add `scrapeUrlToText(url, options)` — high-level: navigates, waits, returns `{bodyText, title, url, html}`
  - Ensure all interaction steps handle lazy rendering: scroll triggers, click-to-expand, waitForNetworkIdle
  - DO NOT modify existing function signatures — only add new exports
  - DO NOT import FireCrawl
  - Follow existing code patterns from `extractIvivuTour()` and `extractWithInteractions()`

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: [] (pure logic, no domain-specific skills needed)

  **Acceptance Criteria**:
  - `extractActivityPage` and `extractBookingPage` are exported
  - `scrapeUrlToText` returns `{bodyText, title, url}` from any URL
  - All new functions have JSDoc

  **QA**: `node -e "import('./.agents/lib/browser-automation.mjs').then(m => console.log(Object.keys(m).filter(k => k.includes('extract') || k.includes('scrape'))))"` → shows new exports

- [ ] 2. Clean `websearch.mjs` — remove FireCrawl engine

  **What to do**:
  - In `searchForUrl()`, remove `engine: 'firecrawl'` from the web_search_preview tool config
  - Simply omit the `engine` parameter — OpenRouter will use default
  - OR change to no engine specification at all
  - DO NOT change function signatures or exports
  - DO NOT remove the OpenRouter web search — it's still needed for URL discovery

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Acceptance Criteria**:
  - `searchForUrl()` still works (OpenRouter web search)
  - No `firecrawl` string in `websearch.mjs`
  - All existing exports unchanged

  **QA**: `grep -i firecrawl .agents/lib/websearch.mjs` → empty output

- [ ] 3. Clean schemas — remove FireCrawl prompts + credits tracking

  **What to do**:
  - In `hotel-schema.mjs`: Remove `HOTEL_AGENT_PROMPT` (keep HOTEL_SCHEMA, HOTEL_EXTRACT_SCHEMA, mapHotelToFirestore)
  - In `tour-schema.mjs`: Remove `TOUR_AGENT_PROMPT` (keep schema + mapper — but tour already works without it)
  - In `activity-schema.mjs`: Remove `ACTIVITY_AGENT_PROMPT` (keep schema + mapper)
  - In `schemas/index.mjs`: Remove AGENT_PROMPT exports
  - Remove any `_firecrawlCredits` field from schema mapping functions
  - DO NOT remove schema structures or mapping functions
  - DO NOT change field names in schemas

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Acceptance Criteria**:
  - No `AGENT_PROMPT` exports in any schema file
  - No `_firecrawlCredits` in mapping output
  - `mapHotelToFirestore()`, `mapTourToFirestore()`, `mapActivityToFirestore()` still work

  **QA**: `grep -r "AGENT_PROMPT\|_firecrawlCredits" .agents/lib/schemas/` → empty output

- [ ] 4. Refactor booking-scraper (`getHotelImages.mjs`)

  **What to do**:
  - Remove import from non-existent `firecrawl-agent.mjs`
  - Replace with import from `browser-automation.mjs`: `{ scrapeUrlToText, extractBookingPage }`
  - Remove import of `HOTEL_AGENT_PROMPT` (deleted in Task 3)
  - Keep import of `HOTEL_EXTRACT_SCHEMA`, `mapHotelToFirestore`
  - Keep `searchForSiteUrl` from websearch
  - Rewrite `scrapeHotelFromUrl(url)`:
    ```javascript
    // Phase A: Use agent-browser to navigate + interact + extract
    const { bodyText, title, url: finalUrl } = await extractBookingPage(url);
    
    // Phase B: Process text through adapter + markdownToJson
    const rawData = markdownToJson(bodyText, 'hotel', finalUrl);
    const adapter = await findAdapter(finalUrl);
    const enriched = adapter?.extractFromMarkdown 
      ? { ...rawData, ...adapter.extractFromMarkdown(bodyText, finalUrl) }
      : rawData;
    
    // Phase C: Map, sanitize, save (existing logic — mostly unchanged)
    ```
  - Keep `scrapeHotelByName()` — it chains websearch → scrapeHotelFromUrl
  - Remove `creditsUsed` from return value (replace with tracking mode used)
  - Keep CLI entry point (--url, --name, --search)
  - DO NOT change the save/process pipeline (normalize images, sanitize, mapToFirestore)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Acceptance Criteria**:
  - `scrapeHotelFromUrl(url)` returns hotel data without any FireCrawl usage
  - No import from `firecrawl-agent.mjs` (file doesn't exist)
  - No `creditsUsed` in output
  - CLI modes `--url` and `--name` functional
  - `_strategy` field indicates 'agent-browser' or 'playwright'

  **QA**: `grep -i firecrawl .agents/skills/booking-scraper/scripts/getHotelImages.mjs` → empty

- [ ] 5. Refactor activity-scraper (`activityScraper.mjs`)

  **What to do**:
  - **DELETE/Rewrite** `scrapeActivityFromUrl()` (lines 164-228) — this is the raw FireCrawl API caller with hardcoded key
  - New implementation using `browser-automation.mjs`:
    ```javascript
    export async function scrapeActivityFromUrl(url) {
      const { extractActivityPage } = await import('../../../lib/browser-automation.mjs');
      const pageType = detectPageType(url);
      if (pageType === 'tour') throw new Error('...');
      
      // Extract with browser automation
      const result = await extractActivityPage(url);
      
      // Process through text pipeline
      const metadata = {
        ogTitle: result.data?.title || '',
        ogDescription: '',
        ogImage: '',
      };
      
      return scrapeActivityFromText(result.data?.bodyText || '', result.data?.url || url, { metadata });
    }
    ```
  - Remove hardcoded `FIRECRAWL_API_KEY` (line 165)
  - Remove `_firecrawlCredits` tracking
  - Keep `scrapeActivityFromText()` — already clean, no FireCrawl
  - Keep `detectPageType()`, `sanitizeTitle()`, `isPoorTitle()`
  - Keep `processAndSave()` — clean
  - Keep CLI entry point (--url, --markdown)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Acceptance Criteria**:
  - `scrapeActivityFromUrl(url)` no longer calls FireCrawl API
  - No hardcoded API key
  - No `_firecrawlCredits` in output
  - `--url` mode functional using browser automation
  - `--markdown` mode unchanged

  **QA**: `grep -i firecrawl .agents/skills/activity-scraper/scripts/activityScraper.mjs` → empty

- [ ] 6. Update all 3 SKILL.md files

  **What to do**:
  - `tour-scraper/SKILL.md`: Already documents Playwright + agent-browser — verify it's accurate
  - `booking-scraper/SKILL.md`: Change workflow from FireCrawl Agent to:
    - Phase A: `searchForSiteUrl()` (OpenRouter web search) → find booking.com URL
    - Phase B: `extractBookingPage()` (agent-browser CLI) → navigate + interact + extract text
    - Phase C: Process text → map → sanitize → save (Firebase helpers)
  - `activity-scraper/SKILL.md`: Change workflow from FireCrawl scrape+extract to:
    - Phase A: `extractActivityPage()` (agent-browser CLI) → navigate + interact + extract text
    - Phase B: `scrapeActivityFromText()` → markdownToJson + adapter extraction
    - Phase C: Process → map → sanitize → save (Firebase helpers)
  - Remove all mentions of: FireCrawl, firecrawl, Agent API, credits, FIRECRAWL_API_KEY
  - Document `--lazy-rendering` flag where applicable
  - Add troubleshooting section for common Playwright/agent-browser issues

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Acceptance Criteria**:
  - No "FireCrawl" or "firecrawl" in any SKILL.md
  - All workflows describe Playwright MCP + agent-browser CLI
  - Clear usage examples

  **QA**: `grep -ri firecrawl .agents/skills/*/SKILL.md` → empty

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Verify: All scrapers use Playwright/agent-browser, zero FireCrawl references, `_firecrawlCredits` removed

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Verify: No broken imports, consistent patterns across scrapers, no hardcoded keys

- [ ] F3. **Integration QA** — `unspecified-high`
  Verify: All 3 scrapers can import without errors, `grep -r firecrawl .agents/` returns zero results

- [ ] F4. **Scope Fidelity Check** — `deep`
  Verify: All "Must Have" present, all "Must NOT Have" absent

---

## Verification Commands

```bash
# 1. Zero FireCrawl references in agent code
grep -ri "firecrawl\|@mendable" .agents/ --include="*.mjs" --include="*.md"
# Expected: (empty)

# 2. No FireCrawl in websearch
grep -i firecrawl .agents/lib/websearch.mjs
# Expected: (empty)

# 3. All scrapers import correctly
for f in .agents/skills/*/scripts/*Scraper.mjs .agents/skills/*/scripts/getHotelImages.mjs; do
  echo "=== $f ===" && node -e "import('$f').then(() => console.log('OK')).catch(e => console.log('FAIL:', e.message))"
done

# 4. Browser-automation exports enhanced
node -e "import('./.agents/lib/browser-automation.mjs').then(m => console.log('Functions:', Object.keys(m).length))"

# 5. Schemas don't have AGENT_PROMPT
grep -r "AGENT_PROMPT" .agents/lib/schemas/
# Expected: (empty)
```

## Success Criteria

- [ ] Zero FireCrawl references in `.agents/` (code + docs)
- [ ] All 3 scrapers import without errors
- [ ] Booking scraper `--url` and `--name` modes functional
- [ ] Activity scraper `--url` mode functional (no FireCrawl API)
- [ ] Tour scraper unchanged (already working)
- [ ] JavaScript-rendered content captured via agent-browser interaction steps
- [ ] No `_firecrawlCredits` in any output
- [ ] No hardcoded API keys in code

---

## Files Modified/Created

**Modified:**
- `.agents/lib/browser-automation.mjs` (enhanced with domain helpers)
- `.agents/lib/websearch.mjs` (FireCrawl engine removed)
- `.agents/lib/schemas/hotel-schema.mjs` (AGENT_PROMPT removed)
- `.agents/lib/schemas/tour-schema.mjs` (AGENT_PROMPT removed, if present)
- `.agents/lib/schemas/activity-schema.mjs` (AGENT_PROMPT removed)
- `.agents/lib/schemas/index.mjs` (AGENT_PROMPT exports removed)
- `.agents/skills/booking-scraper/scripts/getHotelImages.mjs` (refactored)
- `.agents/skills/activity-scraper/scripts/activityScraper.mjs` (refactored)
- `.agents/skills/tour-scraper/SKILL.md` (verified/updated)
- `.agents/skills/booking-scraper/SKILL.md` (updated)
- `.agents/skills/activity-scraper/SKILL.md` (updated)

**Already removed (Phase 1):**
- `.agents/lib/_archived_firecrawl-agent.mjs`
- `.agents/lib/firecrawc.mjs`
- `.agents/skills/cloneWebData.md`
- All stale plans and notepads
- All duplicate `.js` scripts
- 6 cache files

**Not modified:**
- `.agents/lib/browser-helpers.mjs` (clean, no FireCrawl)
- `.agents/lib/adapters/` (clean, no FireCrawl)
- `.agents/lib/pricing-extractor.mjs` (clean, no FireCrawl)
- `.agents/lib/sanitize-data.mjs` (clean)
- `.agents/lib/image-helpers.mjs` (clean)
- `.agents/lib/firebase-helpers.mjs` (clean)
- `.agents/lib/scrape-helpers.mjs` (clean)
- `.agents/lib/markdown-to-json.mjs` (clean)
- `src/` (only comment updated, already done)
