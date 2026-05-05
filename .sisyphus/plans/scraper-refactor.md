# Refactor Scraper Skills — Simplified with Firecrawl Agent

## TL;DR

> **Quick Summary**: Simplify 3 scraper skills by leveraging **Firecrawl Agent** for autonomous scraping instead of building complex manual scrape flows. Focus on optimizing schemas and prompts for the Agent, plus shared helpers for image processing and Firebase CRUD.
> 
> **Key Change**: Instead of building `scrapeWithInteract()` with complex multi-step flows, use Firecrawl's built-in `agent()` API which handles lazy rendering, popups, and complex interactions autonomously.
>
> **Deliverables**:
> - `.agents/lib/schemas/` — 3 optimized schema modules + Agent prompts
> - `.agents/lib/firebase-helpers.mjs` — Shared Firebase Admin CRUD
> - `.agents/lib/image-helpers.mjs` — Shared image processing
> - `.agents/lib/firecrawl-agent.mjs` — Thin wrapper for Firecrawl Agent API
> - `.agents/lib/websearch.mjs` — OpenRouter websearch for finding URLs
> - Simplified scraper scripts using Firecrawl Agent
> - Updated SKILL.md files
> 
> **Estimated Effort**: Medium (simplified from Large)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Schema modules with Agent prompts → Shared helpers → Simplified scrapers

---

## Context

### Original Request
Refactor lại các skill scraper trong .agents/skills/, tập trung:
1. Không khai báo schema riêng — lấy từ memory-bank/schemas/
2. Sử dụng openrouter websearch cho search, Firecrawl Agent cho scrape
3. Tối ưu schema và prompts cho Firecrawl Agent tự xử lý lazy render
4. Xây dựng shared helpers firebase-admin cho CRUD Firestore + Storage
5. **Loại bỏ các hàm scrape phức tạp hiện tại**

### Simplified Approach (New)
**Key Decision**: Use **Firecrawl Agent** (`agent()` API) instead of manual `interact()` flows

**Why Agent is better**:
- Firecrawl Agent tự động xử lý lazy render, popup, accordion expand
- Không cần viết logic multi-step phức tạp (scrape → interact → stopInteraction)
- Agent tự quyết định actions cần thiết (click, scroll, wait) dựa trên prompt
- Code đơn giản hơn: 1 call `agent(url, prompt, schema)` thay vì 4-5 steps

**What changes**:
- ❌ Remove: `scrapeWithInteract()`, `scrapeGallery()`, complex multi-step flows
- ✅ Keep: `agent()` calls with optimized prompts, schema extraction, callbacks
- ✅ Shared helpers: firebase-helpers, image-helpers, websearch (for finding URLs)

---

## Work Objectives

### Core Objective
Simplify scraper implementation by leveraging Firecrawl Agent for autonomous data extraction, while centralizing schemas and maintaining shared helpers for Firebase operations and image processing.

### Concrete Deliverables
- `.agents/lib/schemas/hotel-schema.mjs` — Hotel schema + AGENT_PROMPT cho Firecrawl Agent
- `.agents/lib/schemas/tour-schema.mjs` — Tour schema + AGENT_PROMPT  
- `.agents/lib/schemas/activity-schema.mjs` — Activity schema + AGENT_PROMPT
- `.agents/lib/schemas/index.mjs` — Barrel export
- `.agents/lib/firebase-helpers.mjs` — Shared Firestore + Storage CRUD
- `.agents/lib/image-helpers.mjs` — Download → WebP → Upload pipeline
- `.agents/lib/firecrawl-agent.mjs` — **Simplified** wrapper chỉ cho `agent()` API
- `.agents/lib/websearch.mjs` — OpenRouter websearch (cho tìm URL)
- `.agents/lib/scrape-helpers.mjs` — slugify, generateReport, utilities
- Simplified scraper scripts using `agent()` thay vì multi-step interact

### Must Have
- Schema modules với optimized AGENT_PROMPT cho Firecrawl Agent
- Firecrawl Agent (`agent()` API) cho tất cả scraping
- OpenRouter websearch cho search operations
- Shared Firebase helpers cho CRUD
- Shared image helpers cho xử lý ảnh

### Must NOT Have
- ❌ NO complex multi-step scrape flows (scrape → interact → stopInteraction)
- ❌ NO manual handling của lazy render/popups
- ❌ NO TypeScript
- ❌ NO changes to src/ directory
- ❌ NO inline schema definitions

---

## Execution Strategy

### Simplified Waves

```
Wave 1 (Foundation — all parallel):
├── Task 1: Create schema modules với AGENT_PROMPT optimized
├── Task 2: Create firebase-helpers.mjs + image-helpers.mjs
└── Task 3: Create firecrawl-agent.mjs (simplified) + websearch.mjs + scrape-helpers.mjs

Wave 2 (Simplified Scraper Refactor — parallel):
├── Task 4: Simplify booking-scraper — use agent() thay vì multi-step
├── Task 5: Simplify tour-scraper — use agent() thay vì Tavily + multi-step  
└── Task 6: Simplify activity-scraper — MCP→Agent (not SDK interact)

Wave 3 (Documentation):
└── Task 7: Update all 3 SKILL.md files

Wave FINAL (Verification):
├── Task F1: Plan compliance audit
├── Task F2: Code quality review
├── Task F3: Integration QA
└── Task F4: Scope fidelity check
```

---

## TODOs

- [x] 1. Create Schema Modules with Firecrawl Agent Prompts (.agents/lib/schemas/)

  **What to do**:
  - Create `.agents/lib/schemas/hotel-schema.mjs`:
    - Export schema object (fields, types, defaults) từ `memory-bank/schemas/hotels.schema.md`
    - Export **AGENT_PROMPT** — optimized prompt cho Firecrawl Agent:
      ```javascript
      export const HOTEL_AGENT_PROMPT = `
        You are a hotel data extraction specialist for 9Trip B2C platform.
        Extract structured hotel data from the booking.com hotel page at the provided URL.
        
        The hotel data must conform to this schema:
        ${JSON.stringify(HOTEL_SCHEMA, null, 2)}
        
        IMPORTANT: Handle lazy-rendered content:
        - Click on "Show all photos" or gallery buttons to load all images
        - Expand "Room details" sections to get complete room information  
        - Scroll down to load reviews and amenities
        - Extract ALL available images at max1024x768 resolution
        
        Return ONLY a JSON object matching the schema. No extra text.
      `;
      ```
    - Export EXTRACT_SCHEMA cho agent (simplified, Agent sẽ tự xử lý lazy render)
  - Tương tự cho tour-schema.mjs và activity-schema.mjs
  - Mỗi schema có AGENT_PROMPT riêng, optimized cho domain (hotel/tour/activity)

  **Simplification**:
  - Không cần viết logic multi-step — Agent tự xử lý
  - Prompts phải rõ ràng về việc cần click/expand gì
  - Agent sẽ tự động thực hiện actions cần thiết

  **QA Scenarios**:
  ```
  Scenario: Schema modules export with AGENT_PROMPT
    Steps:
      1. Run: node -e "import('./.agents/lib/schemas/hotel-schema.mjs').then(m => { console.log('Has AGENT_PROMPT:', !!m.HOTEL_AGENT_PROMPT); console.log('Prompt length:', m.HOTEL_AGENT_PROMPT?.length); })"
      2. Verify: AGENT_PROMPT exists và có độ dài hợp lý (>500 chars)
  ```

  **Commit**: YES
  - Message: `refactor(scraper): add schema modules with Firecrawl Agent prompts`

- [x] 2. Create Firebase Helpers + Image Helpers (.agents/lib/)

  **What to do**:
  - `.agents/lib/firebase-helpers.mjs`:
    - initFirebaseApp(), getFirestore(), getBucket()
    - docExists(), setDoc(), updateDoc(), getDocBySlug()
    - Giữ nguyên như plan cũ
  - `.agents/lib/image-helpers.mjs`:
    - downloadFile(), toWebP(), uploadToStorage()
    - processAndUploadImage(), processGalleryImages()
    - Giữ nguyên như plan cũ

  **QA Scenarios**:
  ```
  Scenario: Helpers export correctly
    Steps:
      1. Run: node -e "import('./.agents/lib/firebase-helpers.mjs').then(m => console.log(Object.keys(m)))"
      2. Verify: All CRUD functions exported
      3. Run: node -e "import('./.agents/lib/image-helpers.mjs').then(m => console.log(Object.keys(m)))"
      4. Verify: All image functions exported
  ```

  **Commit**: YES
  - Message: `refactor(scraper): add firebase and image helpers`

- [x] 3. Create Simplified Firecrawl Agent + Websearch + Scrape Helpers

  **What to do**:
  - `.agents/lib/firecrawl-agent.mjs` — **Đơn giản hóa**:
    ```javascript
    import Firecrawl from '@mendable/firecrawl-js';
    
    export function initFirecrawl(apiKey) {
      return new Firecrawl({ apiKey });
    }
    
    /**
     * Use Firecrawl Agent for autonomous scraping
     * Agent tự động xử lý: lazy render, popups, accordion expand, scroll
     */
    export async function scrapeWithAgent(firecrawl, url, prompt, schema, maxCredits = 100) {
      const result = await firecrawl.agent({
        urls: [url],
        prompt: prompt,
        schema: schema,
        maxCredits: maxCredits,
        waitFor: 5000 // Agent sẽ tự động wait/click/scroll as needed
      });
      
      // Poll for completion
      let status = await firecrawl.agentStatus(result.id);
      while (status.status === 'processing') {
        await new Promise(r => setTimeout(r, 15000));
        status = await firecrawl.agentStatus(result.id);
      }
      
      return status.data;
    }
    ```
    - Chỉ export: initFirecrawl, scrapeWithAgent, agentStatus
    - **Không cần**: scrapeWithInteract, scrapeGallery, stopInteract, v.v.
  
  - `.agents/lib/websearch.mjs` — OpenRouter websearch (tìm URL):
    ```javascript
    export async function searchForUrl(query, engine = 'firecrawl') {
      // OpenRouter web_search_preview with firecrawl engine
    }
    ```
  
  - `.agents/lib/scrape-helpers.mjs`:
    - slugify(), generateReport(), writeJsonToTemp(), readJsonFromTemp()
    - Các utilities đơn giản, không có logic scrape phức tạp

  **Simplification**:
  - firecrawl-agent.mjs chỉ ~50 lines thay vì ~200+ lines
  - Không cần xử lý scrapeId, interact, stopInteraction
  - Agent tự động handle tất cả

  **QA Scenarios**:
  ```
  Scenario: Firecrawl agent wrapper works
    Steps:
      1. Run: node -e "import('./.agents/lib/firecrawl-agent.mjs').then(m => console.log(Object.keys(m)))"
      2. Verify: Exports initFirecrawl, scrapeWithAgent
  ```

  **Commit**: YES
  - Message: `refactor(scraper): add simplified firecrawl agent wrapper and helpers`

- [x] 4. Simplify Booking Scraper

  **What to do**:
  - Refactor `getHotelImages.js` → `getHotelImages.mjs`:
    ```javascript
    // SIMPLIFIED - dùng Agent thay vì multi-step interact
    import { initFirecrawl, scrapeWithAgent } from '../../../lib/firecrawl-agent.mjs';
    import { HOTEL_AGENT_PROMPT, HOTEL_SCHEMA } from '../../../lib/schemas/hotel-schema.mjs';
    import { searchForUrl } from '../../../lib/websearch.mjs';
    import { sanitizeScrapedData } from '../../../lib/sanitize-data.mjs';
    import { writeJsonToTemp } from '../../../lib/scrape-helpers.mjs';
    
    export async function scrapeHotel(hotelName) {
      // Phase A: Tìm URL bằng websearch
      const url = await searchForUrl(`booking.com ${hotelName}`);
      
      // Phase B: Dùng Agent để scrape tất cả (Agent tự xử lý lazy render)
      const firecrawl = initFirecrawl(process.env.FIRECRAWL_API_KEY);
      const data = await scrapeWithAgent(
        firecrawl,
        url,
        HOTEL_AGENT_PROMPT,
        HOTEL_SCHEMA,
        100 // maxCredits
      );
      
      // Sanitize và save
      const sanitized = await sanitizeScrapedData(data, { type: 'hotel' });
      await writeJsonToTemp(sanitized, sanitized.slug, 'booking-hotel');
      
      return sanitized;
    }
    ```
  - Refactor `saveBookingDataSkill.js` → `saveBookingData.mjs`:
    - Import từ firebase-helpers và image-helpers
    - Code giữ nguyên pattern CRUD, chỉ thay imports

  **Simplification**:
  - Không cần 4-step flow (static → interact rooms → interact gallery → fallback)
  - Không cần scrapeId, stopInteraction
  - 1 call `agent()` xử lý tất cả

  **Commit**: YES
  - Message: `refactor(booking): simplify using Firecrawl Agent`

- [x] 5. Simplify Tour Scraper

  **What to do**:
  - Tương tự booking:
    - `tourScraper.mjs`: Dùng `scrapeWithAgent()` với TOUR_AGENT_PROMPT
    - Remove Tavily dependency (không cần enrich nữa, Agent tự extract đủ)
    - `saveTourData.mjs`: Import từ shared helpers
  - Xóa `enrichWithWebSearch.mjs` (Tavily) — Agent không cần fallback
  - Xóa `firecrawl-helpers.mjs` phức tạp — thay bằng firecrawl-agent.mjs đơn giản

  **Simplification**:
  - Tour không cần multi-step hay Tavily
  - Agent tự extract itinerary, pricing, gallery

  **Commit**: YES
  - Message: `refactor(tour): simplify using Firecrawl Agent, remove Tavily`

- [x] 6. Simplify Activity Scraper — MCP to Agent

  **What to do**:
  - Tạo `activityScraper.mjs` mới:
    - Dùng `scrapeWithAgent()` với ACTIVITY_AGENT_PROMPT
    - Agent tự xử lý: gallery click, accordion expand, FAQ extraction
    - Không cần B1/B2/B3/B4 phases riêng — Agent làm 1 lần
  - `saveActivityData.mjs`: Import từ shared helpers
  - Xóa MCP dependencies hoàn toàn

  **Simplification**:
  - Thay vì 4 phases (B1→B2→B3→B4), chỉ cần 1 call agent()
  - Agent tự quyết định cần click gì, scroll bao nhiêu

  **Commit**: YES
  - Message: `refactor(activity): migrate from MCP to Firecrawl Agent`

- [x] 7. Update All 3 SKILL.md Files

  **What to do**:
  - Cập nhật workflow mô tả:
    - Phase A: OpenRouter websearch (tìm URL)
    - Phase B: Firecrawl Agent (1 call xử lý tất cả lazy render, gallery, reviews)
    - Phase C: Save to Firebase (dùng shared helpers)
  - Đơn giản hóa mô tả — không cần chi tiết multi-step
  - Document cách sử dụng agent() API

  **Commit**: YES
  - Message: `docs(scraper): update SKILL.md for simplified Agent-based approach`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Verify: Tất cả scraper dùng agent(), không còn multi-step flows, schemas từ modules

- [x] F2. **Code Quality Review** — `unspecified-high`
  Verify: Code đơn giản hơn, không inline schemas, dùng shared helpers

- [x] F3. **Integration QA** — `unspecified-high`
  Verify: agent() hoạt động, imports không lỗi

- [x] F4. **Scope Fidelity Check** — `deep`
  Verify: Đã loại bỏ các hàm scrape phức tạp, chỉ còn agent() calls

---

## Verification Commands

```bash
# Schema modules với AGENT_PROMPT
node -e "import('./.agents/lib/schemas/index.mjs').then(m => console.log('AGENT_PROMPTs:', Object.keys(m).filter(k => k.includes('PROMPT'))))"

# Simplified agent wrapper
node -e "import('./.agents/lib/firecrawl-agent.mjs').then(m => console.log('Exports:', Object.keys(m)))"
# Expected: [ 'initFirecrawl', 'scrapeWithAgent', 'agentStatus' ]

# No complex multi-step flows
grep -r "scrapeId\|interact(\|stopInteraction" .agents/skills/*/scripts/
# Expected: (empty — Agent handles internally)

# All using agent()
grep -r "scrapeWithAgent\|\.agent(" .agents/skills/*/scripts/
# Expected: Matches found
```

## Success Criteria

- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] Code đơn giản hơn 60%+ so với trước (dùng Agent thay vì multi-step)
- [x] Không còn logic scrape phức tạp (interact chains, manual popup handling)
- [x] Tất cả scrapers dùng Firecrawl Agent
- [x] Shared helpers hoạt động cho image và Firebase