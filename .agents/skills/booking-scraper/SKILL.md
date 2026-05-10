---
name: booking-scraper
description: Nhận tên khách sạn → tìm URL booking.com → Playwright browser scrape toàn bộ dữ liệu (hotel + rooms + images + reviews) → map schema hotels → lưu Firestore + Storage → seed pricing.
---

# Booking.com Scraper — Hotel Data Import Agent

**Role**: Hotel Data Import Specialist

Agent chuyên trách nhận tên khách sạn, tìm URL trên booking.com, gọi script `getHotelImages.mjs` để scrape TOÀN BỘ dữ liệu (hotel data + gallery + room data + room gallery + reviews), sau đó lưu vào Firestore + Firebase Storage và seed pricing test.

## Trigger Conditions

Skill này tự động kích hoạt khi user context chứa một trong các từ khóa sau:
- `tạo khách sạn`
- `create hotel`
- `use booking-scraper`

Khi phát hiện các từ khóa này, agent sẽ tự động thực thi workflow mà không cần user hướng dẫn chi tiết.

## Shared Modules

Các scraper đều sử dụng shared modules trong `.agents/lib/`:

| Module | Chức năng |
|--------|-----------|
| `.agents/lib/adapters/` | Domain adapters (booking-adapter, ivivu-adapter) — Playwright DOM extraction |
| `.agents/lib/browser-helpers.mjs` | Browser interaction sequences, child pricing reveal strategies |
| `.agents/lib/pricing-extractor.mjs` | Unified pricing extraction with mandatory child price |
| `.agents/lib/markdown-to-json.mjs` | Convert scraped markdown/text to structured JSON |
| `.agents/lib/firebase-helpers.mjs` | Firebase CRUD operations |
| `.agents/lib/image-helpers.mjs` | Download, resize, WebP conversion (multi-CDN support) |
| `.agents/lib/scrape-helpers.mjs` | Utilities: slugify, temp files, reports |
| `.agents/lib/sanitize-data.mjs` | Làm sạch dữ liệu (thay thông tin đối thủ) |
| `.agents/lib/scape-schemas.mjs` | Hotel schema + `HOTEL_AGENT_PROMPT` + `mapHotelToFirestore` |

## Workflow Overview

```
[User cung cấp tên hotel]
    │
    ▼
┌──────────────────────────────────────────────────┐
│  Giai đoạn A: Tìm URL trên Booking.com           │
│  searchForSiteUrl() → OpenRouter websearch       │
│  → Trả về URL hotel trên booking.com             │
└──────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────┐
│  Giai đoạn B: Scrape toàn bộ dữ liệu             │
│  scrapeWithAgent() → Firecrawl Agent (1 lần gọi) │
│  → Extract hotel + rooms + images + reviews       │
│  → Agent tự động xử lý lazy load, gallery         │
│  → Output JSON → lưu .temp/booking-hotel-{slug}.json │
└──────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────┐
│  Giai đoạn C: Save to Firebase + Report          │
│  node saveBookingData.mjs --input=.temp/...      │
│  → Download ảnh → WebP → Storage                  │
│  → Tạo hotels/{slug} document (rooms Map)         │
│  → Report tại .report/scrape-booking-*.md         │
└──────────────────────────────────────────────────┘
```

## Prerequisites

- **@mendable/firecrawl-js** đã có trong `package.json`
- **FIRECRAWL_API_KEY** trong `.env.local`
- **OPENROUTER_API_KEY** trong `.env.local` (cho web search tìm URL)
- **sharp** installed: `npm install sharp`
- **Firebase Admin SDK** service account: `tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json`

> **Lưu ý:** Không cần MCP server. Firecrawl Agent được gọi trực tiếp qua NPM SDK.

## Execution Steps

### Giai đoạn A: Tìm Hotel trên Booking.com

Sử dụng `firecrawc.mjs` để tìm URL của hotel trên booking.com.

**Prompt mẫu:**

```
Search booking.com for hotel: "{hotel_name}"
Find the official booking.com hotel page URL.
Return the exact URL of the hotel page (the one starting with https://www.booking.com/hotel/...).
```

**Xử lý kết quả:**
- Nếu tìm thấy nhiều kết quả → chọn kết quả đầu tiên khớp nhất với tên hotel
- Nếu không tìm thấy → báo lỗi "Hotel not found on booking.com", dừng workflow
- Nếu URL không phải booking.com → thử lại với query khác

### Giai đoạn B: Scrape toàn bộ dữ liệu bằng `getHotelImages.mjs`

Gọi script `getHotelImages.mjs` với URL đã tìm được ở Giai đoạn A. Script này xử lý **toàn bộ** việc scrape bằng Firecrawl Agent:

```bash
node .agents/skills/booking-scraper/scripts/getHotelImages.mjs --url="https://www.booking.com/hotel/vn/..."
```

**Script tự động thực hiện:**

1. **Gọi `scrapeWithAgent()`** — Firecrawl Agent tự động xử lý:
   - Lazy load scrolling
   - Gallery interaction (click, extract all images)
   - Room details extraction
   - Reviews extraction (max 25)
   - Pricing info detection
2. **Post-process ảnh** — Extract URLs (regex `cf.bstatic.com`), normalize `→ max1024x768`, deduplicate, classify (hotel vs room theo context), sort vào đúng room bằng fuzzy name matching.
3. **Output JSON** — Chuẩn hóa theo schema hotels.

**Output:** JSON object in ra stdout, log in ra stderr. Agent capture stdout → parse JSON → lưu temp file:

```bash
mkdir -p .temp
node .agents/skills/booking-scraper/scripts/getHotelImages.mjs --url="..." > .temp/booking-hotel-{slug}.json
```

**Output JSON schema:**

```json
{
  "name": "Hotel Name",
  "starRating": 4,
  "address": { "street": "...", "city": "...", "country": "..." },
  "description": "...",
  "excerpt": "...",
  "featuredImage": "https://cf.bstatic.com/xdata/images/hotel/max1024x768/....jpg",
  "gallery": ["https://cf.bstatic.com/...", "..."],
  "amenities": ["...", "..."],
  "highlights": ["...", "..."],
  "rating": { "average": 8.5, "count": 100 },
  "policies": { "checkIn": "14:00", "checkOut": "12:00" },
  "map": { "lat": 10.0, "lng": 104.0 },
  "phone": "...",
  "email": "...",
  "website": "...",
  "tags": ["luxury", "pool"],
  "rooms": [
    {
      "name": "Deluxe Ocean View",
      "description": "...",
      "bedType": "1 King bed",
      "maxAdults": 2,
      "maxChildren": 1,
      "maxGuests": 3,
      "roomSize": 35,
      "featuredImage": "https://cf.bstatic.com/...max1024x768/....jpg",
      "gallery": ["https://cf.bstatic.com/...", "..."],
      "amenities": ["...", "..."],
      "included": ["Breakfast"],
      "totalRooms": 5,
      "sortOrder": 1
    }
  ],
  "reviews": [
    {
      "reviewerName": "John",
      "reviewerAvatar": "https://...",
      "rating": 9,
      "text": "Great hotel...",
      "date": "2026-04-15",
      "country": "Vietnam",
      "sortOrder": 1
    }
  ],
  "_firecrawlCredits": 25,
  "_warnings": []
}
```

> **Lưu ý:** `featuredImage` và `gallery` trong output là URLs gốc từ booking.com CDN (đã được normalize về `max1024x768`). Script `saveBookingData.mjs` ở Giai đoạn C sẽ download, convert WebP, và upload lên Firebase Storage.

**Xử lý kết quả:**
- Kiểm tra `success: true` trong JSON output
- Nếu `success: false` → đọc `error` field, báo lỗi cho user, dừng workflow
- Nếu `_warnings` không rỗng → log ra để user biết (ảnh thiếu, room không có gallery, etc.)
- Lưu JSON vào `.temp/booking-hotel-{slug}.json`

**Xử lý lỗi Agent:**
- Nếu Agent không lấy được đủ data → thử lại với `maxCredits` cao hơn
- Nếu vẫn thất bại sau 3 lần retry → báo user, dừng workflow

### Giai đoạn C: Save to Firebase + Report

Chạy script `saveBookingData.mjs` với file JSON đã chuẩn bị:

```bash
node .agents/skills/booking-scraper/scripts/saveBookingData.mjs --input=.temp/booking-hotel-{slug}.json
```

Script tự động thực hiện:
1. Validate dữ liệu + kiểm tra slug trùng trong Firestore
2. Gọi `sanitizeScrapedData()` để làm sạch dữ liệu (thay thông tin đối thủ)
3. Download ảnh hotel (featured + gallery) → convert WebP (sharp) → upload Firebase Storage
4. Build rooms embedded Map từ dữ liệu rooms (giới hạn 5 ảnh/room)
5. Download ảnh rooms → convert WebP → upload Firebase Storage
   - Storage path hotel: `hotels/{hotelId}/featured.webp`, `hotels/{hotelId}/gallery/{n}.webp`
   - Storage path rooms: `hotels/{hotelId}/rooms/{roomId}/featured.webp`, `hotels/{hotelId}/rooms/{roomId}/gallery/{n}.webp`
6. Tạo document `hotels/{hotelId}` với rooms là embedded Map (key = room.id), reviews là embedded Map
7. Tạo report file tại `.report/scrape-booking-*.md`

**Exit codes:**
- `0` — Thành công
- `1` — Có lỗi (đọc report để biết chi tiết)

**Đọc report** để xác nhận kết quả và kiểm tra warnings.

**Dọn dẹp:** Sau khi thành công, xóa temp file:
```bash
rm .temp/booking-hotel-{slug}.json
```

### Giai đoạn D: Seed Test Pricing (Tùy chọn)

Sau khi hotel được tạo, kiểm tra và seed pricing test nếu chưa có.

**Bước 1 — Kiểm tra pricing đã tồn tại:**
```bash
node .agents/skills/booking-scraper/scripts/seedTestPricing.mjs --checkOnly=true --hotelId={hotelId}
```
- Exit `0` → pricing đã tồn tại, bỏ qua
- Exit `1` → chưa có, chuyển sang Bước 2

**Bước 2 — Seed pricing test:**
```bash
node .agents/skills/booking-scraper/scripts/seedTestPricing.mjs \
  --hotelId={hotelId} \
  --name="{hotelName}" \
  --roomSlugs="{slug1,slug2,...}"
```

Room slugs lấy từ log của Giai đoạn C (dòng `✅ Room: "..." → rooms.room_{slug}`) — bỏ prefix `room_`.

## Schema Reference

### Hotel → Firestore `hotels/{hotelId}`

| Field | Nguồn | Ghi chú |
|-------|-------|---------|
| `id` / `slug` | Tự động từ name | lowercase, hyphenated, bỏ dấu |
| `name` | Extract (B) | Required |
| `starRating` | Extract (B) | Number 1-5 |
| `address` | Extract (B) | { street, city, country } |
| `description` | Extract (B) | HTML |
| `excerpt` | Extract (B) | Plain text ≤200 chars |
| `featuredImage` | Script (C) | WebP trên Storage |
| `gallery` | Script (C) | WebP trên Storage (max 30) |
| `amenities` | Extract (B) | Array of strings |
| `highlights` | Extract (B) | Array of strings |
| `rating` | Extract (B) | { average, count } |
| `policies` | Extract (B) | { checkIn, checkOut } |
| `map` | Extract (B) | { lat, lng } |
| `tags` | Script (B) | Suy luận từ starRating + amenities |
| `rooms` | Script (C) | Embedded Map (key = room_{slug}) |
| `reviews` | Script (C) | Embedded Map (key = review_{slug}), max 25 |
| `isFeatured` | Mặc định `false` | |
| `createdAt` / `updatedAt` | Script (C) | Server timestamp |

### Room — Embedded Map (key = `room_{slug}`)

| Field | Nguồn |
|-------|-------|
| `id`, `name`, `slug` | Tự động từ room name |
| `description`, `bedType` | Extract (B) |
| `maxAdults`, `maxChildren`, `maxGuests` | Extract (B) |
| `roomSize`, `totalRooms` | Extract (B) |
| `amenities`, `included` | Extract (B) |
| `featuredImage`, `gallery` (max 5) | Script (C) — WebP trên Storage |
| `isActive` | `true` |
| `sortOrder` | Extract (B) |

### Reviews — Embedded Map (key = `review_{slug}`, max 25)

| Field | Nguồn |
|-------|-------|
| `id`, `reviewerName`, `reviewerAvatar` | Extract (B) |
| `rating` (1-10), `text`, `date`, `country` | Extract (B) |
| `sortOrder` | Thứ tự extract |

## Error Handling

| Tình huống | Xử lý |
|-----------|--------|
| **Search không tìm thấy hotel** | Thử query khác. Vẫn không → báo user, dừng |
| **getHotelImages.mjs lỗi / timeout** | Đọc stderr log. Nếu `success: false` → thử retry với maxCredits cao hơn. Vẫn lỗi → báo user, dừng |
| **getHotelImages.mjs — thiếu ảnh** | `_warnings` ghi rõ, tiếp tục (Agent đã cố gắng extract tối đa) |
| **Slug đã tồn tại trong Firestore** | `saveBookingData.mjs` báo lỗi. Xóa document cũ hoặc đổi tên |
| **Download ảnh thất bại** | Script skip ảnh đó, ghi warning. Hotel/room vẫn được tạo |
| **Seed pricing — đã có** | Bỏ qua, không seed lại |
| **Seed pricing — thiếu roomSlugs** | Bỏ qua, hotel không có bảng giá test |

### Không được làm

- ❌ KHÔNG tự ý thêm field ngoài schema hotels v4
- ❌ KHÔNG tạo dữ liệu giả khi booking.com không có
- ❌ KHÔNG bỏ qua Giai đoạn B (getHotelImages.mjs) — mọi scrape phải qua script
- ❌ KHÔNG gọi `saveBookingData.mjs` khi `getHotelImages.mjs` trả về `success: false`
- ❌ KHÔNG tạo quá 5 ảnh/room, quá 30 ảnh hotel gallery, quá 25 reviews

## Ví dụ Usage

```bash
# Step 1 (A): Agent tìm URL qua OpenRouter websearch
# searchForSiteUrl("Premier Residences Phu Quoc Emerald Bay booking.com")

# Step 2 (B): Scrape toàn bộ dữ liệu bằng Firecrawl Agent
mkdir -p .temp
node .agents/skills/booking-scraper/scripts/getHotelImages.mjs \
  --url="https://www.booking.com/hotel/vn/premier-residences-phu-quoc-emerald-bay" \
  > .temp/booking-hotel-premier-residences-phu-quoc-emerald-bay.json

# Step 3 (C): Lưu vào Firebase
node .agents/skills/booking-scraper/scripts/saveBookingData.mjs \
  --input=.temp/booking-hotel-premier-residences-phu-quoc-emerald-bay.json

# Step 4: Đọc report
cat .report/scrape-booking-*.md

# Step 5 (D): Seed pricing (tùy chọn - từ log của Step 3, parse room slugs)
node .agents/skills/booking-scraper/scripts/seedTestPricing.mjs \
  --checkOnly=true \
  --hotelId=premier-residences-phu-quoc-emerald-bay

node .agents/skills/booking-scraper/scripts/seedTestPricing.mjs \
  --hotelId=premier-residences-phu-quoc-emerald-bay \
  --name="Premier Residences Phu Quoc Emerald Bay" \
  --roomSlugs="deluxe-garden-view,ocean-view-suite"

# Cleanup
rm .temp/booking-hotel-premier-residences-phu-quoc-emerald-bay.json
```

## Data Sanitization — Làm sạch dữ liệu trước khi lưu

Trước khi dữ liệu được lưu vào Firestore, script `saveBookingData.mjs` tự động gọi `sanitizeScrapedData()` từ `.agents/lib/sanitize-data.mjs` để:

1. **Thay thế thông tin liên lạc**: `phone`, `email`, `website` → thông tin của **9 Trip Phú Quốc**
2. **Thay thế tên công ty đối thủ**: Dựa vào `knownNames` (trích từ domain URL nguồn) → thay bằng "9 Trip Phú Quốc"
3. **Gemini AI scan** (nếu có key): Quét toàn bộ text fields để phát hiện các thông tin còn sót

**Các field được sanitize tự động:**
- `phone` → `0877.901.901`
- `email` → `info@9tripphuquoc.com`
- `website` → `https://9tripphuquoc.com`
- Tất cả text fields: `name`, `description`, `excerpt`, `amenities`, `highlights`, `address`, `policies`, `tags`, `rooms`, `cancellationPolicy`

**Cách gọi (tự động trong `saveBookingData.mjs`):**
```javascript
import { sanitizeScrapedData } from '../lib/sanitize-data.mjs';
const result = await sanitizeScrapedData(data, {
  type: 'hotel',
  knownNames: ['booking'],  // từ domain URL nguồn
});
```

## Files liên quan

| File | Vai trò |
|------|---------|
| `.agents/skills/booking-scraper/scripts/getHotelImages.mjs` | **Script scrape chính** — gọi Firecrawl Agent để extract data + images + reviews |
| `.agents/skills/booking-scraper/scripts/saveBookingData.mjs` | **Script lưu Firebase** — download ảnh → WebP → Storage → Firestore |
| `.agents/skills/booking-scraper/scripts/seedTestPricing.mjs` | Seed test pricing cho hotel mới (tùy chọn) |
| `.agents/lib/firecrawl-agent.mjs` | Shared module: `initFirecrawl()`, `scrapeWithAgent()` |
| `.agents/lib/websearch.mjs` | Shared module: `searchForSiteUrl()` — tìm URL bằng OpenRouter |
| `.agents/lib/sanitize-data.mjs` | Shared module: `sanitizeScrapedData()` — làm sạch dữ liệu |
| `.agents/lib/scape-schemas.mjs` | Shared module: `HOTEL_AGENT_PROMPT` + `mapHotelToFirestore` |
| `memory-bank/schemas/hotels.schema.md` | Hotels schema v4 (rooms embedded Map) |
| `.env.local` | `FIRECRAWL_API_KEY`, `OPENROUTER_API_KEY` |
| `tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json` | Firebase Admin service account |

## Agent-Browser Command Reference

Khi cần tương tác trình duyệt trực tiếp (đóng popup, scroll load rooms, v.v.), sử dụng **agent-browser CLI** thay vì sleep cố định.

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

## Hotel Data Extraction Patterns

### Xử lý overlay popup

Booking.com thường hiển thị overlay popup (cookie consent, sign-up modal, promotion) chặn tương tác. Cách xử lý:

```bash
# Mở trang hotel
agent-browser open https://www.booking.com/hotel/vn/...
agent-browser wait --load networkidle
agent-browser snapshot -i

# Đóng popup — chờ nút đóng (×) xuất hiện rồi click
agent-browser wait --text "×"
agent-browser snapshot -i
agent-browser click @e_close_popup   # Click nút × hoặc "Dismiss"

# Verify popup đã đóng
agent-browser wait --fn "!document.querySelector('.modal-overlay')"
agent-browser snapshot -i
```

> **Lưu ý:** Nếu popup không có text "×", dùng `wait --fn` để chờ element đóng xuất hiện: `agent-browser wait --fn "document.querySelector('[aria-label=\"Dismiss\"]')"`

### Scroll XHR rooms — chờ network idle

Danh sách rooms trên booking.com load qua XHR khi scroll. Phải chờ network idle sau mỗi lần scroll:

```bash
# Scroll xuống phần rooms
agent-browser scroll down 1000
agent-browser wait --load networkidle
agent-browser snapshot -i

# Tiếp tục scroll nếu còn rooms
agent-browser scroll down 1000
agent-browser wait --load networkidle
agent-browser snapshot -i

# Verify tất cả rooms đã load
agent-browser wait --fn "document.querySelectorAll('[data-room-id]').length > 0"
agent-browser get text body
```

### Luồng khuyến nghị cho booking.com

```bash
# 1. Mở trang hotel
agent-browser open https://www.booking.com/hotel/vn/...
agent-browser wait --load networkidle
agent-browser snapshot -i

# 2. Đóng popup nếu có
agent-browser wait --text "×"
agent-browser snapshot -i
agent-browser click @e_close_popup

# 3. Scroll load rooms (XHR)
agent-browser scroll down 1000
agent-browser wait --load networkidle
agent-browser snapshot -i

# 4. Click gallery để lấy ảnh độ phân giải cao
agent-browser click @e_gallery
agent-browser wait --load networkidle
agent-browser snapshot -i

# 5. Extract toàn bộ dữ liệu
agent-browser get text body
```

