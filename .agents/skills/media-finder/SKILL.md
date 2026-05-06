---
name: media-finder
description: Tìm kiếm, phát hiện và phân loại tất cả ảnh trong hệ thống 9Trip B2C. Quét Firestore collections, phân tích URL ảnh, phát hiện ảnh thiếu/broken/placeholder, đề xuất ảnh thay thế.
applyTo: "src/**"
---

# Media Finder — Image Discovery & Audit Agent

**Role**: Image Audit Specialist

Agent chuyên trách quét toàn bộ hệ thống 9Trip B2C để tìm tất cả ảnh, phân loại, phát hiện vấn đề và đề xuất hướng xử lý.

## Workflow Overview

```
Firestore Collections → Deep Scan → URL Classification → Report Generation → Recommendation
```

## Image Fields to Scan

| Field Name | Type | Mô tả |
|-----------|------|-------|
| `featuredImage` | `string` | Ảnh đại diện chính |
| `gallery` | `string[]` | Mảng ảnh gallery |
| `images` | `string[]` | Mảng ảnh (alias) |
| `media` | `string[]` | Mảng media files |
| `logo` | `string` | Logo (settings, brands) |
| `avatar` | `string` | Ảnh đại diện người dùng |
| `userAvatar` | `string` | Avatar từ review |
| `photoURL` | `string` | Photo URL (Firebase Auth) |
| `coverImage` | `string` | Ảnh bìa |

Collections được quét: `tours`, `hotels`, `rooms`, `activities`, `cars`, `rentals`, `locations`, `settings`, `coupons`, `reviews`, `users`

## URL Classification System

### Types
| Type | Pattern | Action |
|------|---------|--------|
| `wordpress-url` | `https://*.rootytrip.com/*` | Download → WebP → Firebase Storage |
| `placeholder` | `https://picsum.photos/*` | Thay bằng ảnh thật |
| `external-http` | `https://*` (other) | Verify → Upload to Firebase Storage |
| `gs-path` | `gs://*` | Resolve to HTTPS URL |
| `relative-path` | `/path/to/file` | Resolve with bucket root |
| `data-uri` | `data:*` | Convert to file |
| `svg` | `*.svg` | Không phải ảnh raster, cần xử lý riêng |
| `empty` | `""` / `null` | Thiếu ảnh |
| `broken` | Unreachable | Cần ảnh thay thế |

### Status Levels
| Status | Meaning | Priority |
|--------|---------|----------|
| `broken` | URL không truy cập được | 🔴 Critical |
| `placeholder` | Ảnh placeholder (picsum) | 🟠 High |
| `external` | Ảnh từ WordPress cũ | 🟡 Medium |
| `needs-resolve` | gs:// path cần resolve | 🟢 Low |
| `valid` | OK, HTTPS accessible | ✅ Done |

## Execution Steps

### Step 1: Quét Firestore Collections

Sử dụng Firebase Admin SDK để đọc tất cả documents từ mỗi collection.

```javascript
// Pattern for scanning
const collections = ['tours', 'hotels', 'rooms', 'activities', 'cars', 'rentals', 'locations', 'settings', 'coupons', 'reviews', 'users'];
const imageFields = ['featuredImage', 'gallery', 'images', 'media', 'logo', 'avatar', 'userAvatar', 'photoURL', 'coverImage'];

for (const col of collections) {
  const snapshot = await db.collection(col).get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    // Deep scan all fields for image URLs
  }
}
```

### Step 2: Phân Loại URL

Với mỗi URL tìm được, phân loại theo hệ thống trên. Sử dụng regex patterns:

```javascript
const WORDPRESS = /^https?:\/\/([^.]+\.)*rootytrip\.com\//i;
const PICSUM = /^https?:\/\/picsum\.photos\//i;
const GS = /^gs:\/\//;
const SVG = /\.svg$/i;
const DATA_URI = /^data:/;
const IMAGE_EXTS = /\.(jpg|jpeg|png|webp|gif|avif|bmp|tiff)$/i;
```

### Step 3: Tạo Báo Cáo

Tạo báo cáo JSON với cấu trúc:

```json
{
  "summary": {
    "totalUrls": 0,
    "brokenUrls": 0,
    "wordpressUrls": 0,
    "placeholderUrls": 0,
    "gsPaths": 0,
    "validUrls": 0
  },
  "stats": {
    "byCollection": { "tours": 0, "hotels": 0, ... },
    "byStatus": { "broken": 0, "external": 0, ... },
    "byField": { "featuredImage": 0, "gallery": 0, ... }
  },
  "allUrls": [
    {
      "collection": "tours",
      "docId": "abc123",
      "field": "featuredImage",
      "url": "https://...",
      "type": "wordpress-url",
      "status": "external",
      "note": "Cần download & upload"
    }
  ],
  "priorityActions": {
    "mustFix": [...],
    "needsUpload": [...],
    "needsReplacement": [...]
  }
}
```

### Step 4: Đề Xuất Xử Lý

Dựa trên báo cáo, đề xuất:

1. **Broken/Empty URLs** → Tìm ảnh thay thế từ:
   - Firebase Storage bucket (cùng service type + ID)
   - Placeholder tạm thời

2. **WordPress URLs** → Gửi cho `media-optimizer` skill để:
   - Download ảnh
   - Convert WebP
   - Upload Firebase Storage
   - Cập nhật Firestore document

3. **Placeholder URLs** → Đánh dấu cần upload ảnh thật

## Output

Sau khi chạy, lưu báo cáo vào `audit-report.json`. Báo cáo này là đầu vào cho `media-optimizer` skill.

## Integration

```
media-finder (skill này)
    │
    ├── output: audit-report.json
    ├── web search (để tìm ảnh thay thế)
    │
    ▼
media-optimizer (skill kế tiếp)
    │
    ├── download WordPress images
    ├── convert to WebP
    ├── optimize sizes
    ├── upload to Firebase Storage
    └── update Firestore document URLs
```

## Error Handling

- Nếu Firestore không kết nối được → Báo lỗi, đề nghị kiểm tra service account key
- Nếu collection không tồn tại → Bỏ qua, ghi log
- Nếu field không phải string → Bỏ qua
- Nếu URL không parse được → Ghi vào danh sách "unknown"
