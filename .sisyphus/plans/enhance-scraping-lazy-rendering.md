# Work Plan: Enhance Scraping with Lazy Rendering Support

## Executive Summary

**Goal**: Fix lazy rendering data extraction (child/infant pricing, itinerary details, hotel room galleries) by enabling browser interaction automation.

**Critical Discovery**: The system has **TWO competing half-built pipelines**:
1. **Firecrawl Agent** (current, working, 100-500 credits/page) — handles lazy rendering autonomously
2. **Playwright MCP** (defined but dead code) — has interaction steps but never executed

**Root Problem**: `getInteractionSteps()` and `getInteractionPlan()` are **dead code** — defined in adapters but never called by any scraper.

**Decision Required**: Choose between:
- **Option A**: Enhance Firecrawl Agent prompts (cheapest, leverages existing infrastructure)
- **Option B**: Build Playwright MCP automation (zero credits, more control, but more fragile)
- **Option C**: Hybrid approach (Playwright for interactions, existing scrapers for processing)

---

## Phase 1: Problem Validation (MANDATORY FIRST)

Before building anything, we must validate the problem exists and measure current data completeness.

### Task 1.1: Measure Current Data Completeness
**Assignee**: Sisyphus
**Estimated**: 30 minutes
**Depends**: None

**QA Scenario**: Run existing scrapers against 3-5 target URLs and document missing fields.

```bash
# Test URLs (from handoff context)
TOUR_URLS=(
  "https://www.ivivu.com/du-lich/tour-phu-quoc-4n3d-ha-noi-kham-pha-dao-ngoc-phu-quoc"
  # Add 2-3 more ivivu tour URLs
)
HOTEL_URLS=(
  "https://www.booking.com/hotel/vn/premier-residences-phu-quoc-emerald-bay"
  # Add 2-3 more booking hotel URLs
)

# Run scrapers and capture output
for url in "${TOUR_URLS[@]}"; do
  node .agents/skills/tour-scraper/scripts/tourScraper.mjs --url="$url" > .temp/baseline-tour-$(date +%s).json
done
```

**Acceptance Criteria**:
- [ ] Baseline report created at `.report/data-completeness-baseline-{timestamp}.md`
- [ ] List of fields present vs. missing for each URL
- [ ] Specific examples of "childPrice", "infantPrice", "itinerary[].description" missing
- [ ] Quantified: "X% of tours missing child pricing", "Y% of hotels missing room galleries"

---

### Task 1.2: Test Firecrawl Agent with Enhanced Prompts
**Assignee**: Sisyphus
**Estimated**: 45 minutes
**Depends**: Task 1.1

Before building Playwright MCP automation, test if Firecrawl Agent can capture missing data with better prompts.

**QA Scenario**: Enhance `TOUR_AGENT_PROMPT` and `HOTEL_AGENT_PROMPT` with explicit interaction guidance:

```javascript
// Add to prompts in .agents/lib/schemas/tour-schema.mjs
const ENHANCED_GUIDANCE = `
CRITICAL: Before extracting data, you MUST:
1. Scroll down to trigger lazy image loading (scroll 3-5 times with 500ms delay)
2. Click ALL "Xem thêm" / "Show more" buttons to expand collapsed content
3. Click on itinerary day boxes to reveal full day descriptions
4. Look for child pricing tabs/buttons and click to reveal child/infant prices
5. For hotels: click on room cards to open popup and extract full room details + gallery
6. Wait 2 seconds after each interaction for content to load
`;
```

**Acceptance Criteria**:
- [ ] Enhanced prompts saved to temp location for testing
- [ ] Re-run scrapers on same URLs from Task 1.1
- [ ] Compare completeness: baseline vs. enhanced prompts
- [ ] Document: "Enhanced prompts improved data capture by X%"

---

## Phase 2: Architecture Decision & Implementation

**GATE**: Only proceed to Phase 2 if:
- Firecrawl Agent with enhanced prompts still misses critical data, OR
- User explicitly chooses Playwright MCP approach for cost reasons (zero credits)

### Decision Point: Choose Implementation Path

**If Firecrawl Agent (enhanced) captures sufficient data**:
- SKIP to Phase 3 (Deploy Enhanced Prompts)

**If Playwright MCP required**:
- Continue with Phase 2.1-2.3

---

### Task 2.1: Create Browser Automation Module
**Assignee**: Sisyphus
**Estimated**: 2 hours
**Depends**: Task 1.2 decision
**Condition**: Only if Firecrawl Agent insufficient

Create `.agents/lib/browser-automator.mjs` that executes interaction plans via Playwright MCP.

**QA Scenario**: The module must execute interaction steps before extraction.

```javascript
// Expected interface
export async function executeInteractionPlan(url, page, adapter) {
  const steps = adapter.getInteractionSteps ? adapter.getInteractionSteps() : getGenericSteps();
  
  for (const step of steps) {
    switch (step.action) {
      case 'click':
        await page.click(step.selector).catch(() => { /* optional */ });
        break;
      case 'scroll':
        await page.evaluate((y) => window.scrollBy(0, y), step.value);
        break;
      case 'wait':
        await page.waitForTimeout(step.value);
        break;
    }
  }
  
  return page.evaluate(() => document.body.innerText);
}
```

**Acceptance Criteria**:
- [ ] Module exports: `executeInteractionPlan`, `dismissOverlays`, `scrollForLazyLoad`
- [ ] Executes steps from `getInteractionSteps()` in sequence
- [ ] Handles optional steps gracefully (element not found = skip, don't fail)
- [ ] Returns page text after all interactions complete
- [ ] Test: `node -e "import('./browser-automator.mjs').then(m => console.log(Object.keys(m)))"` outputs expected exports

---

### Task 2.2: Validate & Update Selectors
**Assignee**: Sisyphus
**Estimated**: 1.5 hours
**Depends**: Task 2.1
**Condition**: Only if Firecrawl Agent insufficient

The existing selectors in `getInteractionSteps()` may be stale. Validate against live sites.

**QA Scenario**: Test each selector manually before automation.

**Files to update**:
- `.agents/lib/adapters/ivivu-adapter.mjs` — `getInteractionSteps()`
- `.agents/lib/adapters/booking-adapter.mjs` — add `getInteractionSteps()`
- `.agents/lib/browser-helpers.mjs` — `COMMON_OVERLAY_SELECTORS`, `LOAD_MORE_TEXT`

**Acceptance Criteria**:
- [ ] Selectors tested against live sites (ivivu.com, booking.com)
- [ ] Invalid/outdated selectors updated
- [ ] New selectors added for:
  - Child pricing tabs on ivivu tours
  - Itinerary expand buttons
  - Hotel room card click targets
  - Gallery "Show all" buttons
- [ ] Selector validation report at `.report/selector-validation-{timestamp}.md`

---

### Task 2.3: Integrate Browser Automation into Scrapers
**Assignee**: Sisyphus
**Estimated**: 2 hours
**Depends**: Task 2.2
**Condition**: Only if Firecrawl Agent insufficient

Modify scrapers to use `browser-automator.mjs` as pre-processing layer.

**Files to modify**:
- `.agents/skills/tour-scraper/scripts/tourScraper.mjs`
- `.agents/skills/booking-scraper/scripts/scrapeHotel.mjs`

**Key constraint**: Keep existing `scrapeXxxFromText(pageText, url)` interface intact. Add browser automation as PRE-processing.

**QA Scenario**: New flow should be:
```
URL → executeInteractionPlan() → get page text → scrapeXxxFromText() → process
```

**Acceptance Criteria**:
- [ ] `tourScraper.mjs` supports new flag: `--use-browser-automation`
- [ ] When flag present: navigates with Playwright MCP, executes interactions, then processes
- [ ] When flag absent: maintains existing behavior (text input only)
- [ ] `scrapeHotel.mjs` same pattern
- [ ] No breaking changes to existing CLI interface
- [ ] Test: Both `--url` (with automation) and `--markdown` (text input) modes work

---

## Phase 3: Deployment & Validation

### Task 3.1: Update SKILL.md Documentation
**Assignee**: Sisyphus
**Estimated**: 30 minutes
**Depends**: Phase 2 completion OR Task 1.2 success

Update documentation to reflect the chosen approach.

**Files to update**:
- `.agents/skills/tour-scraper/SKILL.md`
- `.agents/skills/booking-scraper/SKILL.md`
- `.agents/skills/activity-scraper/SKILL.md` (if applicable)

**Acceptance Criteria**:
- [ ] Documentation reflects chosen approach (Firecrawl enhanced OR Playwright automation)
- [ ] Clear usage examples for lazy rendering extraction
- [ ] Troubleshooting section for common interaction failures

---

### Task 3.2: End-to-End Validation
**Assignee**: Sisyphus
**Estimated**: 1 hour
**Depends**: Task 3.1

Run full validation against target URLs.

**QA Scenario**: Validate data completeness improvement.

```bash
# Final validation
node .agents/skills/tour-scraper/scripts/tourScraper.mjs \
  --url="https://www.ivivu.com/du-lich/tour-phu-quoc-4n3d..." \
  --use-browser-automation

# Check output
node -e "const data = require('./.temp/scraped-tour-xxx.json'); console.log({
  hasChildPrice: data.childPrice !== null,
  hasInfantPrice: data.infantPrice !== null,
  itineraryCount: data.itinerary?.length || 0,
  galleryCount: data.gallery?.length || 0
})"
```

**Acceptance Criteria**:
- [ ] Child pricing extracted for 100% of tested tours (where present on page)
- [ ] Itinerary details fully populated (not just titles)
- [ ] Hotel room galleries extracted
- [ ] Zero breaking changes to existing workflows
- [ ] Final report at `.report/lazy-rendering-validation-{timestamp}.md`

---

### Task 3.3: Clean Up Dead Code (Optional)
**Assignee**: Sisyphus
**Estimated**: 30 minutes
**Depends**: Task 3.2

If Firecrawl Agent approach chosen, remove dead code to avoid confusion.

**Files to potentially archive/remove**:
- `browser-helpers.mjs` (if unused)
- `ivivu-adapter.mjs` `getInteractionSteps()` (if unused)
- Dead adapter functions

**Acceptance Criteria**:
- [ ] Dead code identified and commented with `// DEPRECATED: Firecrawl Agent handles this`
- [ ] OR moved to `_archived/` directory
- [ ] No references to dead code remain in active files

---

## Final Verification Wave

**DO NOT PROCEED UNTIL USER CONFIRMS:**

1. **Architecture Decision**: Which approach?
   - [ ] **Option A**: Firecrawl Agent with enhanced prompts (recommended if sufficient)
   - [ ] **Option B**: Playwright MCP automation (if cost or control is priority)

2. **Scope Confirmation**: Which specific data fields MUST be captured?
   - [ ] Child pricing (tours)
   - [ ] Infant pricing (tours)
   - [ ] Full itinerary descriptions (tours)
   - [ ] Hotel room galleries (hotels)
   - [ ] Other: ___________

3. **Budget Confirmation**:
   - [ ] Accept Firecrawl credits cost (~100-500/page) for reliability
   - [ ] Prioritize zero cost (accept Playwright MCP complexity)

4. **Fallback Behavior**: When interactions fail?
   - [ ] Continue with partial data
   - [ ] Fail entire scrape
   - [ ] Retry with different strategy

---

## Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| Validate before building | Metis identified risk of solving non-existent problem |
| Preserve existing interface | Don't break `scrapeXxxFromText(pageText, url)` — add automation as pre-processing |
| Firecrawl first | Cheapest to test enhanced prompts before building Playwright automation |
| Optional automation flag | `--use-browser-automation` allows gradual adoption without breaking changes |

## Guardrails (from Metis)

- **MUST NOT**: Create two competing pipelines without clear selection strategy
- **MUST NOT**: Re-enable `playwright*` tools globally without security review
- **MUST NOT**: Assume existing selectors are current — validate against live sites
- **MUST**: Keep text-based scraper interface intact
- **MUST**: Define exact data fields and completeness thresholds

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Firecrawl Agent sufficient → wasted effort on Playwright | Phase 1 validation prevents this |
| Selector fragility | Validate selectors before automation; add retry/fallback |
| Breaking existing scrapers | Use opt-in flag (`--use-browser-automation`) |
| Playwright MCP not available | Fallback to text-only mode |

---

## Files Modified/Created

**Modified**:
- `.agents/skills/tour-scraper/scripts/tourScraper.mjs` (add automation flag)
- `.agents/skills/booking-scraper/scripts/scrapeHotel.mjs` (add automation flag)
- `.agents/lib/schemas/tour-schema.mjs` (enhanced prompts — if Option A)
- `.agents/lib/schemas/hotel-schema.mjs` (enhanced prompts — if Option A)
- `.agents/skills/tour-scraper/SKILL.md` (documentation)
- `.agents/skills/booking-scraper/SKILL.md` (documentation)

**Created** (if Option B chosen):
- `.agents/lib/browser-automator.mjs`
- `.report/data-completeness-baseline-*.md`
- `.report/selector-validation-*.md`
- `.report/lazy-rendering-validation-*.md`

**Potentially Archived**:
- `browser-helpers.mjs` (if dead code confirmed)
- Adapter `getInteractionSteps()` functions (if unused)

---

**Plan generated**: {timestamp}
**Next step**: User review and decision on architecture path (Option A vs B)
**Command to start**: `/start-work .sisyphus/plans/enhance-scraping-lazy-rendering.md`
