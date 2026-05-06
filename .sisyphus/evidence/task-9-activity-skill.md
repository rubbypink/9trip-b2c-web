# Task 9: Activity Skill — Add Agent-Browser Sections

## Date: 2026-05-06

## Changes Made

### 1. Added "Agent-Browser Command Reference" section
- References `.agents/lib/agent-browser-guide.md` for full reference
- Lists key commands: `snapshot -i`, `wait --fn`, `wait --text`, `batch`, `click @ref`, `get text @ref`
- Includes tip about re-snapshotting after DOM changes

### 2. Added "Scraping Workflow Patterns" section
- Pattern 1: Navigate + wait + snapshot + interact + extract
- Pattern 2: Batch operations for multi-step forms
- Pattern 3: Smart wait with `wait --fn` instead of sleep
- Pattern 4: Booking form interaction (click Chọn → snapshot → click + → wait → read price)

### 3. Added "Child Price Extraction" section
- Data flow diagram showing 3 layers:
  1. `extractActivityPage()` clicks tier buttons and extracts childPrices via browser
  2. `activityScraper.mjs` merges childPrices into `pricing.tiers[]`
  3. Adapter's `extractActivityTiersFromPlainText()` extracts from page text as fallback
- Priority rules: browser-extracted > text-extracted
- Practical explanation of how it works

### 4. Updated "Shared Modules" table
- Added row: `.agents/lib/agent-browser-guide.md` — Agent-browser CLI command reference & scraping patterns

### 5. Updated "Prerequisites" section
- Added reference to Agent-Browser Command Reference section
- Added reference to `.agents/lib/agent-browser-guide.md`
- Added prerequisite for familiarity with batch/wait patterns with link to Scraping Workflow Patterns

## grep -c Verification Results

| Check | Count | Status |
|-------|-------|--------|
| "Agent-Browser Command Reference" | 2 | ✅ |
| "Scraping Workflow Patterns" | 1 | ✅ |
| "Child Price Extraction" | 2 | ✅ |
| "agent-browser-guide.md" | 3 | ✅ |
| "batch/wait patterns" | 1 | ✅ |
| "Pattern 1" | 1 | ✅ |
| "Pattern 2" | 1 | ✅ |
| "Pattern 3" | 1 | ✅ |
| "Pattern 4" | 1 | ✅ |
| "snapshot -i" | 4 | ✅ |
| "wait --fn" | 8 | ✅ |
| "wait --text" | 3 | ✅ |
| "batch" | 4 | ✅ |
| "click @ref" or "click @e" | 3 | ✅ |
| "get text @ref" or "get text @e" | 4 | ✅ |

All required sections and references verified present.