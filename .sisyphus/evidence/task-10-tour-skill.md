# Task 10: Tour Scraper SKILL.md Enhancement — Evidence

## Date: 2026-05-06

## Changes Made

Updated `.agents/skills/tour-scraper/SKILL.md` with 5 additions (no content removed):

### 1. Agent-Browser Command Reference (NEW section)
- Added after "Lazy Rendering Support — Key Features" section
- References `.agents/lib/agent-browser-guide.md` as full reference
- Lists 8 key commands with tour-scraping-specific usage and examples
- Documents 4 wait command variants (networkidle, text, fn, @ref)
- Includes batch execution example

### 2. Scraping Workflow Patterns (NEW section)
- Pattern 1: Basic Tour Detail Scrape (Standard Mode)
- Pattern 2: Lazy Rendering Tour Scrape (Recommended for ivivu.com) — 6-step workflow
- Pattern 3: Tour List Page → Detail Pages (Batch)
- Pattern 4: Smart Wait Instead of Sleep — BAD vs GOOD examples

### 3. Lazy Rendering Best Practices (NEW section)
- Tour-specific wait strategies table (6 steps with action, wait strategy, and rationale)
- When to use `wait --load networkidle` vs `wait --text` vs fixed sleep
- Commenting convention for lazy steps with GOOD and ACCEPTABLE examples
- Explicit guidance: `waitForNetworkIdle` after scroll (lazy images load via network), `waitForText` after clicking expand sections

### 4. Shared Modules Table (UPDATED)
- Added row: `.agents/lib/agent-browser-guide.md` | **Command reference & scraping patterns** for agent-browser CLI

### 5. Troubleshooting (UPDATED)
- Expanded "No child pricing found" with 3 wait command examples
- Expanded "Itinerary missing details" with 3 wait command examples
- Added "Page loads but content is empty" with 3 wait alternatives to fixed sleep
- Added "Element reference (@ref) not found after interaction" with re-snapshot guidance
- Added "Images not loading during scroll" with networkidle wait after scroll

## grep -c Verification Results

| Pattern | Count | Status |
|---------|-------|--------|
| `Agent-Browser Command Reference` | 1 | ✅ |
| `Scraping Workflow Patterns` | 1 | ✅ |
| `Lazy Rendering Best Practices` | 1 | ✅ |
| `agent-browser-guide.md` | 2 | ✅ (1 in section header, 1 in Shared Modules table) |
| `wait --load networkidle` | 16 | ✅ |
| `wait --text` | 17 | ✅ |
| `Element reference` | 1 | ✅ |

## File Stats

- Original: 351 lines
- Updated: 578 lines
- Lines added: ~227

## No Content Removed

All original sections preserved:
- ✅ Trigger Conditions
- ✅ Shared Modules (expanded with 1 new row)
- ✅ Input Format
- ✅ Cấu trúc Scripts
- ✅ Workflow Overview (Mode 1 & Mode 2)
- ✅ Lazy Rendering Support — Key Features
- ✅ Execution Steps
- ✅ Report Template
- ✅ Usage Examples
- ✅ Data Sanitization
- ✅ Troubleshooting (expanded with 3 new subsections)
- ✅ Files liên quan