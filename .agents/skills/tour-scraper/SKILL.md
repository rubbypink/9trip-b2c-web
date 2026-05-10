---
name: tour-scraper
description: Nhận URL tour (list/detail) → Playwright browser scrape toàn bộ dữ liệu tour → map schema tours → lưu Firestore + Storage. Hỗ trợ đa domain qua adapter pattern với lazy rendering support.
---

# Tour Data Import Agent

**Role**: Tour Data Import Specialist

Agent chuyên trách nhận URL tour (list page hoặc detail page) từ bất kỳ website nào, truy cập qua **agent-browser CLI** hoặc **Playwright MCP**, trích xuất toàn bộ thông tin tour (bao gồm lazy rendering content như giá trẻ em, lịch trình chi tiết), xử lý ảnh, map đúng schema `tours/{tourId}`, và lưu vào hệ thống 9Trip B2C (Firestore + Firebase Storage).

## Trigger Conditions

Skill này tự động kích hoạt khi user context chứa một trong các từ khóa sau:
- `tạo tour`
- `create tour`
- `scrape tour`
- `use tour-scraper`

Khi phát hiện các từ khóa này, agent sẽ tự động thực thi workflow mà không cần user hướng dẫn chi tiết.

## Shared Modules

Các scraper đều sử dụng shared modules trong `.agents/lib/`:

| Module | Chức năng |
|--------|-----------|
| `.agents/lib/adapters/` | Domain adapters — Playwright DOM extraction per site |
| `.agents/lib/browser-automation.mjs` | **NEW**: agent-browser CLI wrapper cho lazy rendering |
| `.agents/lib/browser-helpers.mjs` | Browser interaction sequences, child pricing reveal |
| `.agents/lib/pricing-extractor.mjs` | Unified pricing extraction with mandatory child price |
| `.agents/lib/markdown-to-json.mjs` | Convert scraped markdown to structured JSON |
| `.agents/lib/firebase-helpers.mjs` | Firebase CRUD operations |
| `.agents/lib/image-helpers.mjs` | Download, resize, WebP conversion (multi-CDN) |
| `.agents/lib/scrape-helpers.mjs` | Utilities: slugify, temp files, reports |
| `.agents/lib/sanitize-data.mjs` | Làm sạch dữ liệu (thay thông tin đối thủ) |
| `.agents/lib/scape-schemas.mjs` | Tour schema + `mapTourToFirestore` + `TOUR_AGENT_PROMPT` |

## Input Format

User cần cung cấp **URL website** ở một trong hai dạng:

1. **Detail page** (ưu tiên): URL của trang tour cụ thể
   ```
   https://example.com/tour/abc-tour
   ```
2. **List page** (fallback): URL của trang danh sách tour → agent tự tìm và scrape từng tour
   ```
   https://example.com/tours/phu-quoc
   ```

**Prompt mẫu từ user:**
```
use tour-scraper
URL: https://example.com/tour/abc-tour
--lazy-rendering=true
```

## Cấu trúc Scripts

Tất cả scripts đều là **ES6 modules** (`.mjs`) — sử dụng `import/export` thay vì `require()`.

```
.agents/skills/tour-scraper/
├── SKILL.md
└── scripts/
    ├── tourScraper.mjs            # Main scraper — 3 modes (standard, lazy, markdown)
    ├── saveTourData.mjs           # Validate → images → Firestore → report
    └── batchScrapeTours.mjs       # Batch từ danh sách URL, Promise.allSettled(concurrency=2)
```

## Workflow Overview

### Mode 1: Standard Extraction (Playwright MCP)

```
[User cung cấp URL tour]
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ Giai đoạn A: Navigate & Extract                          │
│ Agent uses Playwright MCP to navigate to URL             │
│ → Extract page text/content                              │
└──────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ Giai đoạn B: Parse & Process                             │
│ scrapeTourFromText(pageText, url)                        │
│ → Adapter.extractFromMarkdown()                          │
│ → extractPricing() (mandatory child price)               │
└──────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ Giai đoạn C: Save to Firebase + Report                   │
│ node saveTourData.mjs --input=.temp/...                  │
└──────────────────────────────────────────────────────────┘
```

### Mode 2: Lazy Rendering (agent-browser CLI) — **RECOMMENDED for ivivu.com**

```
[User cung cấp URL với --lazy-rendering=true]
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ Giai đoạn A: agent-browser CLI Interaction               │
│ scrapeTourWithLazyRendering(url)                         │
│ → initSession()                                          │
│ → openPage(url)                                          │
│ → Execute interaction steps từ adapter:                  │
│   • Click cookie banner                                  │
│   • Scroll để trigger lazy loading                       │
│   • Click "Xem tất cả" để expand itinerary              │
│   • Click "Trẻ em", "Em bé" tabs để lấy giá chi tiết    │
│ → Get final page text                                    │
└──────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ Giai đoạn B: Parse with Lazy Content                     │
│ Adapter.processLazyContent(pageText)                     │
│ → Extract child/infant pricing from expanded content    │
│ → Extract detailed itinerary descriptions               │
└──────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ Giai đoạn C: Save to Firebase                            │
│ Giống Mode 1 nhưng với data đầy đủ hơn                  │
└──────────────────────────────────────────────────────────┘
```

## Lazy Rendering Support — Key Features

### 1. Child Pricing Extraction

**Problem**: Giá trẻ em thường bị hidden trong tabs/collapsed sections.

**Solution**: agent-browser CLI automatically:
- Click vào tab "Trẻ em" để reveal giá
- Click vào tab "Em bé" để reveal giá
- Extract tất cả các mức giá từ expanded content

**Output**:
```json
{
  "adultPrice": 7590000,
  "childPrice": 5690000,
  "infantPrice": 1000000,
  "childPricingHints": [
    {
      "type": "child",
      "label": "Trẻ em (2-11 tuổi)",
      "ageRange": "2-11",
      "price": 5690000,
      "currency": "VND"
    },
    {
      "type": "infant",
      "label": "Em bé",
      "price": 1000000,
      "currency": "VND"
    }
  ]
}
```

### 2. Detailed Itinerary Extraction

**Problem**: Lịch trình chi tiết bị hidden trong collapsed sections.

**Solution**: agent-browser CLI automatically:
- Click "Xem tất cả" hoặc "Xem chi tiết"
- Click vào từng ngày để expand description
- Extract full description cho mỗi ngày

**Output**:
```json
{
  "itinerary": [
    {
      "day": 1,
      "title": "Hà Nội - Phú Quốc",
      "description": "Quý khách tập trung tại sân bay Nội Bài...",
      "meals": "Ăn tối"
    },
    {
      "day": 2,
      "title": "Tham quan đảo",
      "description": "Sáng: Ăn sáng tại khách sạn...",
      "meals": "Ăn sáng, trưa, tối"
    }
  ]
}
```

## Execution Steps

### Mode 1: Standard Extraction

```bash
node .agents/skills/tour-scraper/scripts/tourScraper.mjs \
  --url=https://www.ivivu.com/du-lich/tour/...
```

Kết quả:
```json
{
  "status": "ready_for_extraction",
  "url": "https://...",
  "message": "Use Playwright MCP or agent-browser CLI to navigate and extract..."
}
```

### Mode 2: Lazy Rendering (Đầy đủ dữ liệu)

```bash
node .agents/skills/tour-scraper/scripts/tourScraper.mjs \
  --url=https://www.ivivu.com/du-lich/tour/... \
  --lazy-rendering=true
```

Kết quả:
```json
{
  "success": true,
  "slug": "tour-phu-quoc-4n3d",
  "data": { /* full tour data */ },
  "tempFile": ".temp/scraped-tour-...",
  "lazyRendering": true,
  "timeline": [ /* extraction steps */ ]
}
```

### Giai đoạn C: Save to Firebase

```bash
node .agents/skills/tour-scraper/scripts/saveTourData.mjs \
  --input=.temp/scraped-tour-{slug}.json
```

## Report Template

```markdown
# Báo cáo Scrape Tour

## Thông tin đầu vào
- URL: {url}
- Chế độ: {standard | lazy-rendering}
- Thởi gian bắt đầu: {datetime}

## Tiến trình

### ✅/❌ Giai đoạn A: Navigation
- URL truy cập: {url}
- Lazy rendering: {enabled/disabled}

### ✅/❌ Giai đoạn B: Extraction
- Tên tour: {title}
- Số field: {count}
- Giá người lớn: {adultPrice}
- Giá trẻ em: {childPrice}
- Giá em bé: {infantPrice}
- Số ngày lịch trình: {days}

### ✅/❌ Giai đoạn C: Save to Firebase
- Tour ID: {tourId}
- Ảnh featured: {uploaded}
- Gallery: {count}
- Pricing tiers: {count}

## Tổng kết
- Kết quả: {Thành công / Có lỗi}
- Strategy: {playwright | agent-browser-lazy}
```

## Usage Examples

### 1. Scrape một tour với lazy rendering (khuyến nghị cho ivivu.com)

```bash
node .agents/skills/tour-scraper/scripts/tourScraper.mjs \
  --url=https://www.ivivu.com/du-lich/tour-phu-quoc-4n3d \
  --lazy-rendering=true

node .agents/skills/tour-scraper/scripts/saveTourData.mjs \
  --input=.temp/scraped-tour-phu-quoc-4n3d.json
```

### 2. Scrape không lazy rendering (nhanh hơn nhưng thiếu data)

```bash
# Agent must use Playwright MCP to extract page text first
# Then call: scrapeTourFromText(pageText, url)
```

### 3. Batch scrape nhiều tour

```bash
node .agents/skills/tour-scraper/scripts/batchScrapeTours.mjs \
  --urls=https://url1,https://url2,https://url3 \
  --lazy-rendering=true
```

## Data Sanitization

Trước khi dữ liệu được lưu vào Firestore, script `saveTourData.mjs` tự động gọi `sanitizeScrapedData()` từ `.agents/lib/sanitize-data.mjs` để:

1. **Thay thế thông tin liên lạc**: `phone`, `email`, `website` → thông tin của **9 Trip Phú Quốc**
2. **Thay thế tên công ty đối thủ**: Dựa vào `knownNames` (trích từ domain URL nguồn) → thay bằng "9 Trip Phú Quốc"

**Các field được sanitize tự động:**
- `phone` → `0877.901.901`
- `email` → `info@9tripphuquoc.com`
- `website` → `https://9tripphuquoc.com`

## Troubleshooting

### "agent-browser command failed"

Chạy health check:
```bash
agent-browser doctor --quick
```

Nếu chưa install:
```bash
npm i -g agent-browser && agent-browser install
```

### "No child pricing found"

Đảm bảo sử dụng `--lazy-rendering=true` cho ivivu.com. Lazy rendering sẽ click vào tabs để reveal giá trẻ em.

### "Itinerary missing details"

Sử dụng lazy rendering mode. Standard mode chỉ extract visible text, không click để expand collapsed sections.

## Files liên quan

| File | Vai trò |
|------|---------|
| `.agents/skills/tour-scraper/scripts/tourScraper.mjs` | **Script scrape chính** — 3 modes |
| `.agents/skills/tour-scraper/scripts/saveTourData.mjs` | **Script lưu Firebase** |
| `.agents/lib/browser-automation.mjs` | **NEW**: agent-browser CLI wrapper |
| `.agents/lib/adapters/ivivu-adapter.mjs` | Ivivu.com specific extraction + lazy steps |
| `.agents/lib/adapters/booking-adapter.mjs` | Booking.com specific extraction |
| `.agents/lib/adapters/index.mjs` | Adapter registry |
| `.agents/lib/pricing-extractor.mjs` | Mandatory child pricing validation |

## Agent-Browser Command Reference

Khi cần tương tác trình duyệt trực tiếp (lazy rendering, click tabs, scroll), sử dụng **agent-browser CLI** thay vì sleep cố định.

| Lệnh | Mô tả | Ví dụ |
|------|--------|-------|
| `snapshot -i` | Chụp accessibility tree chỉ interactive elements | `agent-browser snapshot -i` |
| `wait --fn "JS"` | Chờ JS expression trả về truthy | `agent-browser wait --fn "!document.querySelector('.spinner')"` |
| `wait --text "..."` | Chờ text xuất hiện trên trang | `agent-browser wait --text "Kết quả"` |
| `wait --load networkidle` | Chờ network idle (AJAX xong) | `agent-browser wait --load networkidle` |
| `batch` | Chạy nhiều lệnh liên tiếp | `agent-browser batch "open URL" "snapshot -i"` |
| `click @ref` | Click element theo @ref từ snapshot | `agent-browser click @e3` |

> **Tài liệu đầy đủ:** [`.agents/lib/agent-browser-guide.md`](../../lib/agent-browser-guide.md)

### Quy tắc vàng

1. **Luôn `snapshot -i` trước khi tương tác** — @ref cũ không hợp lệ sau khi DOM thay đổi.
2. **Dùng `wait --fn` hoặc `wait --text`** thay vì `sleep(ms)` — chờ điều kiện thực tế, không đoán thời gian.
3. **Re-snapshot sau mỗi lần DOM thay đổi** (click, scroll, navigate).

## Lazy Rendering Best Practices

Khi scrape tour từ các website có lazy rendering (ivivu.com, v.v.), **KHÔNG dùng `sleep(1000)`** hoặc `wait <ms>` cố định. Thay vào đó, dùng `agent-browser` wait commands với điều kiện cụ thể:

### Scroll tải ảnh — dùng `{ action: 'wait' }` (NetworkIdle)

```bash
# ❌ SAI — sleep cố định, không biết khi nào ảnh load xong
agent-browser scroll down 1000
agent-browser wait 3000

# ✅ ĐÚNG — chờ network idle, đảm bảo ảnh đã load
agent-browser scroll down 1000
agent-browser wait --load networkidle
agent-browser snapshot -i
```

### Bung lịch trình — dùng `wait --text`

```bash
# ❌ SAI — đoán thời gian, có thể quá sớm
agent-browser click @e_xem_tat_ca
agent-browser wait 2000

# ✅ ĐÚNG — chờ nội dung lịch trình thực sự hiển thị
agent-browser click @e_xem_tat_ca
agent-browser wait --text "Ngày"
agent-browser snapshot -i
```

### Click tabs giá trẻ em — dùng `wait --fn`

```bash
# ❌ SAI — tab chưa kịp render
agent-browser click @e_tre_em_tab
agent-browser wait 1000

# ✅ ĐÚNG — chờ element giá xuất hiện
agent-browser click @e_tre_em_tab
agent-browser wait --fn "document.querySelector('.child-price')"
agent-browser snapshot -i
```

### Luồng khuyến nghị cho tour lazy rendering

```bash
agent-browser open https://www.ivivu.com/du-lich/tour/...
agent-browser wait --load networkidle
agent-browser snapshot -i

# Scroll để load ảnh
agent-browser scroll down 500
agent-browser wait --load networkidle
agent-browser snapshot -i

# Bung lịch trình
agent-browser click @e_xem_tat_ca
agent-browser wait --text "Ngày"
agent-browser snapshot -i

# Click tab giá trẻ em
agent-browser click @e_tre_em_tab
agent-browser wait --fn "document.querySelector('.child-price')"
agent-browser snapshot -i

# Extract toàn bộ dữ liệu
agent-browser get text body
```
