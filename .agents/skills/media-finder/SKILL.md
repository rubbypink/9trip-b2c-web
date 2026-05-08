---
name: media-finder
description: Tìm kiếm, phát hiện, tạo ảnh/video chất lượng cao cho mọi nền tảng (Facebook, TikTok, Website, Blog, v.v.). Dùng web search, system storage, Google Drive, AI generation (Gemini/Imagen). Tự động mở rộng phạm vi tìm kiếm, chấm điểm chất lượng, đề xuất tối ưu. Luôn dùng skill này khi người dùng cần tìm ảnh, video, tạo ảnh, tìm media cho social media, website, blog, hoặc bất kỳ nhu cầu media nào.
applyTo: "**"
---

# Media Finder — Universal Media Discovery & Generation Agent

**Role**: Media Discovery Specialist

Agent chuyên trách tìm kiếm, phát hiện và tạo media (ảnh, video) từ đa nguồn dữ liệu, đáp ứng các tiêu chí chất lượng của từng nền tảng đích.

## Core Capabilities

1. **Web Search** — Tìm media từ internet qua `google_search`, `websearch_web_search_exa`, `webfetch`
2. **System Storage** — Quét Firebase Storage (`gs://` paths), Firestore collections chứa media URLs
3. **AI Generation** — Tạo ảnh mới từ prompt bằng `generate_image` (Gemini 3 Pro Image)
4. **Quality Scoring** — Chấm điểm từng kết quả theo tiêu chí nền tảng, đề xuất tối ưu
5. **Smart Expansion** — Tự động mở rộng từ khóa tìm kiếm khi ít kết quả

---

## Platform Media Schemas

Mỗi nền tảng có yêu cầu kích thước và chất lượng riêng. Khi nhận input, xác định `platform` để áp schema đúng.

### Facebook / Meta

| Position | Width | Height | Ratio | Max Size | Formats | Quality | Notes |
|---|---|---|---|---|---|---|---|
| Profile Picture | 320 | 320 | 1:1 | 100KB | jpg, png, webp | 85 | Cắt vuông từ tâm |
| Cover Photo | 820 | 312 | 2.63:1 | 100KB | jpg, png | 85 | Không text quá 20% |
| Feed Image | 1200 | 630 | 1.91:1 | 8MB | jpg, png, webp | 80 | Link share preview |
| Story | 1080 | 1920 | 9:16 | 4MB | jpg, png, webp | 80 | Safe zone: 250px top/bottom |
| Ad Image | 1200 | 628 | 1.91:1 | 30MB | jpg, png | 80 | Text ratio max 20% |
| Video Feed | 1280 | 720 | 16:9 | 10GB | mp4, mov | — | H.264, max 240min |
| Video Story | 1080 | 1920 | 9:16 | 4GB | mp4, mov | — | Max 120s |
| Event Cover | 1920 | 1080 | 16:9 | 100KB | jpg, png | 85 | — |
| Group Cover | 1640 | 856 | 1.92:1 | 100KB | jpg, png | 85 | — |

### TikTok

| Position | Width | Height | Ratio | Max Size | Formats | Notes |
|---|---|---|---|---|---|---|
| Video Feed | 1080 | 1920 | 9:16 | 287MB | mp4, mov, webm | H.264, max 10min |
| Profile Photo | 200 | 200 | 1:1 | 100KB | jpg, png, webp | — |
| Cover Image | 1080 | 1920 | 9:16 | 2MB | jpg, webp | Thumbnail cho video |
| Carousel Image | 1080 | 1920 | 9:16 | 20MB | jpg, webp | — |
| LIVE Cover | 1080 | 1920 | 9:16 | 2MB | jpg, webp | — |

### Instagram

| Position | Width | Height | Ratio | Max Size | Formats | Notes |
|---|---|---|---|---|---|---|
| Square Post | 1080 | 1080 | 1:1 | 8MB | jpg, webp | — |
| Portrait Post | 1080 | 1350 | 4:5 | 8MB | jpg, webp | — |
| Landscape Post | 1080 | 566 | 1.91:1 | 8MB | jpg, webp | — |
| Story | 1080 | 1920 | 9:16 | 30MB | jpg, webp | Safe zones top/bottom |
| Reels | 1080 | 1920 | 9:16 | 650MB | mp4 | Max 90s |
| Profile Picture | 320 | 320 | 1:1 | 100KB | jpg, webp | Display: 110x110 |

### Website (General)

| Position | Width | Height | Ratio | Max Size | Formats | Quality | Notes |
|---|---|---|---|---|---|---|---|
| Hero Banner | 1920 | 1080 | 16:9 | 300KB | webp, avif | 80 | Responsive: 640, 1024, 1920 |
| Hero Mobile | 750 | 1334 | 9:16 | 150KB | webp | 75 | — |
| Card Thumbnail | 400 | 300 | 4:3 | 50KB | webp | 80 | — |
| Gallery | 1200 | 800 | 3:2 | 200KB | webp | 80 | — |
| Logo Header | 200 | 60 | auto | 30KB | svg, webp, png | 90 | Ưu tiên SVG |
| Favicon | 32 | 32 | 1:1 | 5KB | ico, png, svg | — | + 180x180 Apple touch icon |
| OG Image | 1200 | 630 | 1.91:1 | 300KB | jpg, webp | 80 | Social share preview |
| SEO Schema | 1200 | 900 | 4:3 | 250KB | webp, jpg | 80 | JSON-LD image property |

### Blog / Article

| Position | Width | Height | Ratio | Max Size | Formats | Quality |
|---|---|---|---|---|---|---|
| Featured Image | 1200 | 630 | 1.91:1 | 200KB | webp, jpg | 80 |
| Inline Content | 800 | auto | auto | 150KB | webp | 82 |
| Author Avatar | 100 | 100 | 1:1 | 15KB | webp | 85 |
| Email Header | 600 | 200 | 3:1 | 100KB | jpg, png | 80 |

### 9Trip B2C (System Default)

Các collection: `tours`, `hotels`, `rooms`, `activities`, `cars`, `rentals`

| Position | Width | Height | Ratio | Formats | Storage Path Pattern |
|---|---|---|---|---|---|
| featuredImage | 1920 | 1080 | 16:9 | webp | `{type}s/{id}/featured.webp` |
| gallery[*] | 1200 | 800 | 3:2 | webp | `{type}s/{id}/gallery/01.webp` |
| room featured | 1200 | 800 | 3:2 | webp | `hotels/{id}/rooms/{roomId}/featured.webp` |
| room gallery[*] | 1200 | 800 | 3:2 | webp | `hotels/{id}/rooms/{roomId}/gallery/01.webp` |
| logo (settings) | 400 | 120 | auto | svg, webp | `settings/logo.webp` |
| avatar (users) | 200 | 200 | 1:1 | webp | `avatars/{id}/avatar.webp` |

### YouTube Thumbnail

| Position | Width | Height | Ratio | Max Size | Formats | Notes |
|---|---|---|---|---|---|---|
| Thumbnail | 1280 | 720 | 16:9 | 2MB | jpg, webp, png | Text readable at small size |

### Email

| Position | Width | Height | Ratio | Max Size | Formats |
|---|---|---|---|---|---|
| Header Image | 600 | 200 | 3:1 | 100KB | jpg, png |
| Product Image | 300 | 300 | 1:1 | 50KB | jpg, png |

---

## Search & Discovery Workflow

### Step 1 — Parse Intent

Từ user input, xác định:
- `platform`: facebook | tiktok | instagram | website | blog | youtube | email | 9trip (mặc định)
- `media_type`: image | video | both
- `quantity`: số lượng cần (mặc định 10)
- `topic` / `subject`: chủ đề nội dung (vd: "bãi biển Phú Quốc", "resort sang trọng")
- `style_hint`: mood/color/vibe nếu có (vd: "tối giản", "nhiệt đới", "xanh mát")
- `existing_media`: URLs hoặc paths media đã có (để avoid duplicate)

### Step 2 — Multi-Source Search (PARALLEL)

Fire TẤT CẢ các nguồn đồng thời, không tuần tự:

#### 2a. Web Search (google_search)
```js
// Ví dụ query template — tối ưu cho chất lượng cao
const queries = [
  `high resolution ${topic} ${platform} ${media_type} site:unsplash.com`,
  `${topic} wallpaper 4k ${media_type} site:pexels.com`,
  `${topic} ${style_hint} professional photo free download`,
  `${topic} ${media_type} -free -download filetype:jpg`,
  `${topic} ${platform} ${media_type} creative commons`,
];
```

**Mẹo tăng chất lượng:**
- Luôn thêm `high resolution` hoặc `4k` vào query
- Dùng `site:` operator nhắm nguồn chất lượng (unsplash, pexels, pixabay, freepik)
- Khi tìm cho TikTok/Story, thêm `vertical` hoặc `portrait orientation`
- Tìm kiếm bằng cả tiếng Việt VÀ tiếng Anh để tối đa coverage

#### 2b. System Storage Scan
Quét Firebase Storage và Firestore collections tìm media liên quan:
```js
// Pattern: kiểm tra storage path theo service type + topic match
// Ưu tiên storage paths: tours/*, hotels/*, activities/*, cars/*
```

#### 2c. AI Generation (nếu cần)
Khi không tìm đủ kết quả chất lượng cao, dùng `generate_image`:
```js
// Prompt mẫu — chi tiết, cụ thể, mô tả style + composition
const genPrompt = `High-quality ${media_type} of ${topic} in ${style_hint || 'professional'} style.
  Shot composition: ${platform === 'tiktok' ? 'vertical 9:16' : 'horizontal 16:9'}.
  Lighting: natural, golden hour. Color palette: ${palette || 'warm tropical tones'}.
  Professional photography, sharp focus, no watermarks, no text overlay.
  Suitable for commercial use.`;
```

### Step 3 — Collect & Deduplicate

- Gom tất cả URLs từ các nguồn
- Loại bỏ URL trùng lặp
- Loại bỏ URL broken (404, access denied) — test HEAD request
- Loại bỏ ảnh quá nhỏ (< expected width * 0.5)
- Sắp xếp theo chất lượng ước tính ban đầu

### Step 4 — Intelligent Expansion

Nếu số lượng kết quả đạt chuẩn < `quantity` yêu cầu:

1. **Broaden keywords** — thay `resort sang trọng` → `luxury hotel`, `beach resort`
2. **Thay đổi source** — thử creative commons, stock sites khác
3. **Related topics** — tìm ảnh về các chủ đề liên quan (vd: "du lịch Phú Quốc" → "đảo ngọc", "nghỉ dưỡng biển")
4. **AI generate** — tạo thêm ảnh với biến thể prompt
5. **Mixed format** — nếu không đủ ảnh, đề xuất video thay thế

---

## Quality Scoring System

Mỗi media được chấm điểm trên thang 0-100 dựa trên các tiêu chí. Điểm tổng = trung bình có trọng số.

### Scoring Dimensions

| Dimension | Weight | Criteria |
|---|---|---|
| **Resolution** | 20% | So sánh actual vs target dimensions. Điểm tối đa khi ≥ target. |
| **Relevance** | 30% | Mức độ khớp với topic/subject. AI-assisted evaluation. |
| **Aesthetics** | 15% | Composition, lighting, color harmony. |
| **Format Fit** | 10% | Đúng định dạng yêu cầu (webp, mp4...). |
| **Uniqueness** | 5% | Không generic/stock-looking. |
| **Source Authority** | 5% | Nguồn có uy tín (unsplash > random blog). |
| **File Size** | 10% | Dưới max_size. Càng tối ưu càng cao. |
| **License Clarity** | 5% | Rõ ràng về bản quyền, không watermark. |

### Score Interpretation

| Điểm | Label | Hành động |
|---|---|---|
| 90-100 | ⭐ Excellent | Dùng ngay, không cần optimize nhiều |
| 75-89 | ✓ Good | Dùng được, cần optimize nhẹ (size/format) |
| 60-74 | △ Fair | Cần xử lý thêm (crop, resize, enhance) |
| 40-59 | ✗ Poor | Chỉ dùng nếu không có lựa chọn khác |
| 0-39 | ⊗ Unusable | Loại bỏ |

### Optimization Suggestions

Với mỗi media, đề xuất hành động cụ thể:
- "Resize từ 2048x1536 → 1200x630 (crop top 80px để focus vào chủ thể)"
- "Convert từ PNG → WebP quality 80 để giảm 65% file size"
- "Cần tăng cường contrast nhẹ, color grade warm tone"
- "Background quá bận — recommend dùng `media-optimizer` để blur background"

---

## Output Format

### JSON Report Structure

```json
{
  "finder_metadata": {
    "platform": "website",
    "media_type": "image",
    "quantity_requested": 5,
    "topic": "bãi biển Phú Quốc hoàng hôn",
    "search_timestamp": "2026-05-07T10:30:00Z",
    "total_found": 12,
    "total_scored": 12,
    "pass_threshold": 70
  },
  "summary": {
    "excellent": 2,
    "good": 4,
    "fair": 3,
    "poor": 2,
    "unusable": 1,
    "sources": {
      "web_search": 8,
      "system_storage": 2,
      "ai_generated": 2
    }
  },
  "results": [
    {
      "rank": 1,
      "score": 94,
      "label": "⭐ Excellent",
      "source": "web_search",
      "source_url": "https://images.unsplash.com/photo-xxx",
      "source_name": "Unsplash",
      "preview_url": "https://images.unsplash.com/photo-xxx?w=400",
      "full_url": "https://images.unsplash.com/photo-xxx?w=1920",
      "actual_dimensions": { "width": 5472, "height": 3648 },
      "format": "jpg",
      "file_size_kb": 2840,
      "license": "Unsplash License (free)",
      "relevance_score": 95,
      "scoring_detail": {
        "resolution": 19,
        "relevance": 28,
        "aesthetics": 14,
        "format_fit": 8,
        "uniqueness": 4,
        "source_authority": 5,
        "file_size": 9,
        "license_clarity": 5
      },
      "optimization_suggestions": [
        "Resize to target 1200x800 (crop center, maintain ratio)",
        "Convert to WebP quality 80 → ước tính ~180KB",
        "Có thể tăng warmth nhẹ cho tropical vibe"
      ],
      "ready_to_use": true,
      "needs_optimization": true
    }
  ],
  "coverage_gaps": [
    "Thiếu ảnh góc chụp drone từ trên cao",
    "Thiếu ảnh có người (human element) cho social proof"
  ],
  "ai_prompts_used": [
    {
      "tool": "google_search",
      "query": "hoang hon bai bien phu quoc high resolution",
      "results_count": 8
    }
  ]
}
```

---

## Integration with media-optimizer

Khi được yêu cầu xử lý toàn pipeline (find + optimize):

```
Input: "Tìm cho tôi 5 ảnh beach Phú Quốc cho website hero banner"

1. media-finder: search + score → results.json
2. Gửi results[].full_url cho media-optimizer với target schema "website.hero_banner"
3. media-optimizer: download → resize → convert → upload → return final URLs
```

**Data contract giữa 2 skill:**

media-finder output → media-optimizer input:
```json
{
  "target_schema": "website.hero_banner",
  "items": [
    { "source_url": "...", "rank": 1, "score": 94, "optimization_suggestions": [...] }
  ],
  "output_preference": "firebase_storage" // hoặc "local_download"
}
```

---

## Error Handling

| Tình huống | Xử lý |
|---|---|
| Google search trả 0 results | Tự động mở rộng từ khóa, thử tiếng Việt/Anh, thêm nguồn thay thế |
| URL ảnh không truy cập được | Đánh dấu `broken`, loại khỏi danh sách, tăng quantity tìm kiếm bù |
| AI generation bị quota | Thông báo, fallback về web search + storage |
| Storage scan không tìm thấy gì | Ghi log, tiếp tục với web search |
| Không đủ kết quả đạt threshold | Báo cáo coverage gaps, hạ threshold còn 60, tự động expand |

---

## Prompt Optimization Guidelines

Khi viết prompt cho `google_search` hoặc `generate_image`:

1. **Cụ thể, mô tả** — không dùng từ khóa đơn lẻ. "bãi biển Phú Quốc hoàng hôn với cát trắng và nước trong xanh" tốt hơn "beach".
2. **Thêm technical spec** — "high resolution", "4k", "professional photography", "no watermark" luôn có.
3. **Platform context** — khi target là story/reels, thêm "vertical", "portrait", "9:16".
4. **Style guide** — nếu biết brand style: "minimalist", "warm tropical", "dark moody".
5. **Commercial safety** — thêm "commercial use", "royalty free" khi cần.
6. **Đa ngôn ngữ** — luôn search bằng cả tiếng Anh (global) và tiếng Việt (local). Mỗi ngôn ngữ cho kết quả khác nhau.
7. **Negative keywords** — khi prompt cho AI gen: "no text, no watermark, no logo, no people" nếu không muốn.

---

**Pipeline mode**: Nếu cần tìm VÀ tối ưu media, sau khi hoàn thành báo cáo, tự động invoke `media-optimizer` skill với kết quả tốt nhất.

**Final reminder**: Skill này phối hợp chặt với `media-optimizer`. Khi user yêu cầu "tìm và xử lý ảnh", chạy finder trước → optimizer sau. Khi chỉ cần tìm → trả về report + URLs. Khi cần tạo ảnh → ưu tiên AI generation nếu requirements cụ thể và không có sẵn trên web.
