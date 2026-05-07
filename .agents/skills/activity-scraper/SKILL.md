---
name: activity-scraper
description: Nhận URL activity (list/detail) → Playwright browser scrape toàn bộ dữ liệu activity → map schema activities → lưu Firestore + Storage.
---

# Web Scraper — Activity Data Import Agent

**Role**: Activity Data Import Specialist

Agent chuyên trách nhận URL activity (list page hoặc detail page) từ bất kỳ website nào, truy cập qua **agent-browser**, trích xuất toàn bộ thông tin activity, xử lý ảnh, map đúng schema `activities/{activityId}`, và lưu vào hệ thống 9Trip B2C (Firestore + Firebase Storage).

## Trigger Conditions

Skill này tự động kích hoạt khi user context chứa một trong các từ khóa sau:
- `tạo activity`
- `create activity`
- `scrape activity`
- `use activity-scraper`

Khi phát hiện các từ khóa này, agent sẽ tự động thực thi workflow mà không cần user hướng dẫn chi tiết.

## Shared Modules

Các scraper đều sử dụng shared modules trong `.agents/lib/`:

| Module | Chức năng |
|--------|-----------|
| `.agents/lib/adapters/` | Domain adapters — Playwright DOM extraction per site |
| `.agents/lib/browser-automation.mjs` | **agent-browser wrapper** — browser interaction, lazy rendering support |
| `.agents/lib/pricing-extractor.mjs` | Unified pricing extraction with mandatory child price |
| `.agents/lib/firebase-helpers.mjs` | Firebase CRUD operations |
| `.agents/lib/image-helpers.mjs` | Download, resize, WebP conversion (multi-CDN) |
| `.agents/lib/scrape-helpers.mjs` | Utilities: slugify, temp files, reports |
| `.agents/lib/sanitize-data.mjs` | Làm sạch dữ liệu (thay thông tin đối thủ) |
| `.agents/lib/schemas/activity-schema.mjs` | Activity schema + `ACTIVITY_AGENT_PROMPT` |

## Input Format

User cần cung cấp **URL website** ở một trong hai dạng:

1. **Detail page** (ưu tiên): URL của trang activity cụ thể
   ```
   https://example.com/activity/xyz-activity
   ```
2. **List page** (fallback): URL của trang danh sách activity → agent tự tìm và scrape từng activity
   ```
   https://example.com/activities/phu-quoc
   ```

**Prompt mẫu từ user:**
```
use activity-scraper
URL: https://example.com/activity/xyz-activity
```

## Workflow Overview

```
[User cung cấp URL activity (detail/list)]
    │
    ▼
┌──────────────────────────────────────────────────┐
│  Giai đoạn A: Validate & Parse URL               │
│  Xác định loại URL (detail/list), parse slug     │
│  Nếu là list → extract các URL detail            │
└──────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────┐
│  Giai đoạn B: Scrape bằng agent-browser          │
│  extractActivityPage() → Browser automation      │
│  → Click tabs, scroll, reveal lazy content       │
│  → Extract: gallery, FAQs, pricing, reviews      │
│  → Output JSON → lưu .temp/scraped-activity-{slug}.json │
└──────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────┐
│  Giai đoạn C: Save to Firebase + Report          │
│  node saveActivityData.mjs --input=.temp/...     │
│  → Download ảnh → WebP → Storage                 │
│  → Tạo activities/{slug} document                │
│  → Report tại .report/scrape-activity-*.md       │
└──────────────────────────────────────────────────┘
```

## Prerequisites

- **agent-browser CLI** đã được cài đặt và khả dụng trong PATH
- **sharp** installed: `npm install sharp` (đã có)
- **Firebase Admin SDK** service account key: `tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json` (đã có)

> **Lưu ý:** Sử dụng **agent-browser** — CLI tự động hóa trình duyệt dành cho AI agents. Không dùng FireCrawl.
>
> **Khác với hotel-scraper:** Activity không có rooms. Thay vào đó có `pricing` object với `tiers`, `openingHours`, `durationDetail`, `recommendation`, `capacity`, `faq`, `purchaseGuide`, `map`.
>
> Activities trên booking.com dùng field `title` thay vì `name`.

## Execution Steps

### Giai đoạn A: Validate & Parse URL

Kiểm tra URL user cung cấp:

1. **Detail page** — URL dẫn đến trang activity cụ thể:
   - Parse slug từ URL
   - Dùng trực tiếp cho Giai đoạn B

2. **List page** — URL dẫn đến trang danh sách activity:
   - Parse URL để xác định context
   - Dùng `scrapeWithAgent()` để lấy danh sách các activity
   - Sau đó xử lý lần lượt từng activity detail page

**Xử lý kết quả:**
- Nếu URL không truy cập được → báo lỗi "Cannot access URL. Please check the URL and try again."
- Nếu list page không tìm thấy activity nào → báo lỗi "No activities found in the list page."

### Giai đoạn B: Scrape Activity Detail bằng agent-browser

Gọi `extractActivityPage()` từ `browser-automation.mjs` để scrape toàn bộ dữ liệu activity:

```javascript
import { extractActivityPage } from '.agents/lib/browser-automation.mjs';
const result = await extractActivityPage(url);
```

**agent-browser tự động thực hiện:**
- Mở trang bằng `agent-browser open`
- Chờ network idle với `wait --load networkidle`
- Click cookie consent buttons ("Đồng ý", "Accept")
- Scroll để kích hoạt lazy load
- Click các accordion/tabs để reveal nội dung ẩn
- Extract: activity info, pricing tiers, opening hours, FAQ, reviews, purchase guide, capacity, etc.
- Trả về JSON đã được map theo schema activities

**Output:** `.temp/scraped-activity-{slug}.json`

### Giai đoạn C: Save to Firebase + Report

```bash
node .agents/skills/activity-scraper/scripts/saveActivityData.mjs --input=.temp/scraped-activity-{slug}.json
```

Script tự động thực hiện:
1. Validate dữ liệu + kiểm tra slug trùng trong Firestore
2. Gọi `sanitizeScrapedData()` để làm sạch dữ liệu (thay thông tin đối thủ)
3. Download ảnh activity (featured + gallery) → convert WebP (sharp) → upload Firebase Storage
   - Storage path: `activities/{activityId}/featured.webp`, `activities/{activityId}/gallery/{n}.webp`
4. Xử lý extended fields: `openingHours`, `recommendation`, `purchaseGuide`, `faq`, `notes`, `highlights`, `included`, `excluded`, `map`
5. Xử lý pricing tiers → lưu trực tiếp vào trường `pricing.tiers`
6. Xử lý reviews → lưu vào field `reviews` dạng embedded Map
7. Tạo document `activities/{activityId}`
8. Tạo report file tại `/.report/scrape-activity-{timestamp}.md`

**Script exit codes:**
- `0` — Thành công
- `1` — Có lỗi (xem report để biết chi tiết)

## Activity → Firestore `activities/{activityId}`

| Field | Nguồn từ website | Ghi chú |
|-------|------------------|---------|
| `id` | Tự động (script) | **Slug của activity** |
| `title` | Tiêu đề activity | Required |
| `slug` | Tự động từ title | lowercase, hyphenated, bỏ dấu |
| `duration` | Thời lượng | String (VD: "1/2 ngày", "1 ngày") |
| `location` | Địa điểm | String |
| `locationId` | Map từ location → ID | String (reference `locations`) |
| `description` | Mô tả activity | Có thể chứa HTML |
| `excerpt` | Rút gọn từ description | Plain text, ≤200 chars |
| `featuredImage` | Upload URL từ script | WebP trên Storage |
| `gallery` | Mảng URL đã upload | WebP trên Storage |
| `highlights` | Điểm nổi bật | Array of strings |
| `included` | Bao gồm | Array |
| `excluded` | Không bao gồm | Array |
| `categories` | Danh mục | Array of strings |
| `openingHours` | Giờ mở cửa | String |
| `durationDetail` | Thời lượng chi tiết | String |
| `locationDetail` | Địa chỉ chi tiết | String |
| `recommendation` | Khuyến nghị | String |
| `capacity` | Sức chứa | Number |
| `childrenPolicy` | Chính sách trẻ em | String |
| `cancellationPolicy` | Chính sách hủy | String |
| `notes` | Lưu ý | Array of strings |
| `purchaseGuide` | Hướng dẫn mua vé | Array of strings |
| `faq` | Câu hỏi thường gặp | Array of { question, answer } |
| `ratingAverage` | Guest review score | Number |
| `ratingCount` | Số lượng reviews | Number |
| `pricing` | **MAP** các gói giá — key = price ID | Object |
| `pricing.{id}.id` | ID gói giá (VD: `price_standard`) | String |
| `pricing.{id}.name` | Tên gói dịch vụ | String |
| `pricing.{id}.description` | Mô tả gói | String |
| `pricing.{id}.basePrice` | Giá người lớn (VND) | Number |
| `pricing.{id}.childPrice` | Giá trẻ em (VND, 0 nếu miễn phí) | Number |
| `pricing.{id}.currency` | Loại tiền tệ | String (mặc định "VND") |
| `pricing.{id}.discountPercent` | Phần trăm giảm giá (0-100) | Number |
| `map` | Tọa độ | { lat, lng, zoom? } |
| `isFeatured` | Mặc định `false` | Boolean |
| `tags` | Suy luận từ dữ liệu | Array of strings |
| `phone` | Số điện thoại | Nếu có |
| `email` | Email | Nếu có |
| `website` | Website | Nếu có |
| `metaTitle` | SEO title | String |
| `metaDescription` | SEO description | String |
| `status` | Mặc định "active" | String |
| `createdAt` | Firestore Timestamp | |
| `updatedAt` | Firestore Timestamp | |

### Reviews — Embedded Map trong activity document

Cấu trúc: `reviews: { "review_john-doe": { ... }, "review_maria": { ... } }`

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `id` | `string` | Review ID (VD: `review_john-doe`) |
| `reviewerName` | `string` | Tên người review |
| `reviewerAvatar` | `string` | URL avatar |
| `rating` | `number` | Điểm đánh giá (1-10) |
| `text` | `string` | Nội dung review |
| `date` | `string` | Ngày review |
| `country` | `string` | Quốc gia |
| `sortOrder` | `number` | Thứ tự hiển thị |

## Report Template

```markdown
# 📋 Báo cáo Scrape Activity

## Thông tin đầu vào
- **URL:** {url}
- **Loại URL:** {detail | list}
- **Thởi gian bắt đầu:** {datetime}

## Tiến trình

### ✅/❌ Giai đoạn A: Parse URL
- **Loại URL:** {detail/list}
- **Slug:** {slug}

### ✅/❌ Giai đoạn B: Scrape bằng agent-browser
- **Tên activity:** {title}
- **Số ảnh gallery:** {count}
- **Thởi lượng:** {duration}
- **Giá cơ bản:** {basePrice} {currency}
- **Số reviews:** {count}

### ✅/❌ Giai đoạn C: Save to Firebase
- **Activity ID:** {activityId}
- **Storage path:** activities/{activityId}/
- **Firestore path:** activities/{activityId}
- **Số ảnh đã upload:**
  - featured: {n} ảnh
  - gallery: {n} ảnh
- **Pricing tiers:** {count}
- **Report file:** {path}

## Tổng kết
- **Tổng thởi gian:** {duration}
- **Kết quả:** {Thành công / Có lỗi}
- **Ghi chú:** {nếu có}
```

## Data Sanitization — Làm sạch dữ liệu trước khi lưu

Trước khi dữ liệu được lưu vào Firestore, script `saveActivityData.mjs` tự động gọi `sanitizeScrapedData()` từ `.agents/lib/sanitize-data.mjs` để:

1. **Thay thế thông tin liên lạc**: `phone`, `email`, `website` → thông tin của **9 Trip Phú Quốc**
2. **Thay thế tên công ty đối thủ**: Dựa vào `knownNames` (trích từ domain URL nguồn) → thay bằng "9 Trip Phú Quốc"
3. **Gemini AI scan** (nếu có key): Quét toàn bộ text fields để phát hiện các thông tin còn sót

**Các field được sanitize tự động:**
- `phone` → `0877.901.901`
- `email` → `info@9tripphuquoc.com`
- `website` → `https://9tripphuquoc.com`
- Tất cả text fields: `title`, `description`, `excerpt`, `highlights`, `included`, `excluded`, `notes`, `location`, `openingHours`, `purchaseGuide`

**Cách gọi (tự động trong `saveActivityData.mjs`):**
```javascript
import { sanitizeScrapedData } from '../lib/sanitize-data.mjs';
const result = await sanitizeScrapedData(data, {
  type: 'activity',
  knownNames: ['booking'],  // từ domain URL nguồn
});
```

## Common URL patterns

Skill này hỗ trợ mọi URL web hợp lệ. Dưới đây là một số pattern tham khảo:

- **Detail page**: URL trang chi tiết activity (ưu tiên)
- **List page**: URL trang danh sách activity (fallback — agent tự tìm và scrape từng activity)

> **Lưu ý:** Skill không giới hạn nguồn web. Bạn có thể cung cấp URL từ bất kỳ website nào có chứa thông tin activity / điểm tham quan.

## agent-browser Command Reference

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

## Scraping Workflow Patterns

### Pattern 1: Navigate + Wait + Extract

Luồng cơ bản cho mọi trang activity:

```bash
# 1. Mở trang
agent-browser open https://example.com/activity/xyz
agent-browser wait --load networkidle

# 2. Snapshot để lấy @refs
agent-browser snapshot -i

# 3. Scroll để kích hoạt lazy load (ảnh, pricing)
agent-browser scroll down 500
agent-browser wait --fn "document.querySelectorAll('.gallery-img').length > 3"
agent-browser snapshot -i

# 4. Extract dữ liệu
agent-browser get text body
```

### Pattern 2: Batch Form Operations

Khi cần click nhiều tabs/accordions để reveal nội dung ẩn (FAQ, pricing tiers, itinerary):

```bash
agent-browser batch --bail \
  "open https://example.com/activity/xyz" \
  "wait --load networkidle" \
  "snapshot -i" \
  "click @e_faq_tab" \
  "wait --text 'Câu hỏi thường gặp'" \
  "snapshot -i" \
  "click @e_pricing_tab" \
  "wait --text 'Giá trẻ em'" \
  "snapshot -i" \
  "get text body"
```

## Child Price Extraction

Giá trẻ em thường bị ẩn trong tabs/collapsed sections trên trang activity. Luồng dữ liệu xử lý:

1. **`extractActivityPage(url)`** (trong `.agents/lib/browser-automation.mjs`) mở trang activity bằng agent-browser.
2. Sau khi page load, hàm gọi **`extractChildPricesPerTier(tierInfo)`** — duyệt từng pricing tier, click vào tab "Trẻ em" / "Em bé" để reveal giá, rồi extract từ DOM.
3. Kết quả child price được **merge vào `pricing.tiers`** trong `activityScraper.mjs`:
   ```javascript
   // activityScraper.mjs — merge child prices vào tiers
   if (idx < scrapeResult.data.pricing.tiers.length && priceData.childPrice) {
     scrapeResult.data.pricing.tiers[idx].childPrice = priceData.childPrice;
   }
   ```
4. Mỗi tier trong `pricing.tiers` sẽ có đầy đủ `basePrice` (người lớn) + `childPrice` (trẻ em) trước khi lưu vào Firestore.

> **Lưu ý:** Nếu `extractChildPricesPerTier` không tìm thấy giá trẻ em, `childPrice` sẽ là `0` (miễn phí) theo schema mặc định.
