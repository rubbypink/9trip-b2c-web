# Task-11: Booking Scraper SKILL.md Enhancement — Evidence

**Date:** 2026-05-06
**File modified:** `.agents/skills/booking-scraper/SKILL.md`

## Changes Made

### 1. Agent-Browser Command Reference (NEW section)
- Added section referencing `.agents/lib/agent-browser-guide.md`
- Listed key commands: `open`, `click`, `scroll`, `snapshot`, `get`, `wait`, `eval`, `batch`
- Mapped each command to hotel scraping usage

### 2. Scraping Workflow Patterns (NEW section)
- **Pattern 1: Gallery Extraction** — full workflow: open page → dismiss cookies → open gallery overlay → scroll inside overlay → extract image URLs → close overlay
- **Pattern 2: Room Details Extraction** — scroll to trigger XHR → wait networkidle → snapshot → click room cards → extract details
- **Pattern 3: Full Hotel Page Scrape (Batch)** — batch command chaining cookie dismiss + scroll + snapshot

### 3. Hotel Data Extraction (NEW section)
- **Gallery Overlay Detection** — `wait --text "×"` for close button confirmation, lazy-load scrolling with `wait --load networkidle`, CSS selector extraction, overlay closing
- **Room Cards Loaded via XHR** — scroll triggers, `wait --load networkidle` for XHR settlement, click-to-expand with `wait --text`, multiple scroll rounds
- **batch() for Cookie Dismiss + Scroll** — why batch() preserves cookies/state/refs, example batch command

### 4. Shared Modules Table (UPDATED)
- Added row: `.agents/lib/agent-browser-guide.md` — "Agent-browser CLI command reference & scraping patterns — core commands, wait strategies, batch execution"

### 5. Troubleshooting (NEW section)
- 8 common issues with causes and agent-browser command fixes
- Key wait commands reference table: `wait --text`, `wait --load networkidle`, `wait --fn`, `wait @ref`, `wait N`

## grep -c Verification Results

| Pattern | Count | Status |
|---------|-------|--------|
| `Agent-Browser Command Reference` | 1 | ✅ |
| `Scraping Workflow Patterns` | 1 | ✅ |
| `Hotel Data Extraction` | 1 | ✅ |
| `agent-browser-guide.md` | 3 | ✅ (1 in Shared Modules table, 1 in Command Reference header, 1 in Troubleshooting) |
| `Troubleshooting` | 1 | ✅ |
| `wait --text` | 7 | ✅ |
| `wait --load networkidle` | 12 | ✅ |
| `batch` | 9 | ✅ |
| Total lines | 533 | ✅ (was 372, +161 lines of new content) |

## No Existing Content Removed

All original sections preserved:
- Trigger Conditions ✅
- Shared Modules ✅ (updated with new row)
- Workflow Overview ✅
- Prerequisites ✅
- Execution Steps (A, B, C, D) ✅
- Schema Reference ✅
- Error Handling ✅
- Ví dụ Usage ✅
- Data Sanitization ✅
- Files liên quan ✅