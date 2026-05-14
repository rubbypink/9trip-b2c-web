---
name: media-optimizer
description: Download và tối ưu ảnh/video từ URL, local file, hoặc input từ media-finder. Resize, convert format (WebP/AVIF), tối ưu chất lượng theo schema chuẩn từng nền tảng. Dùng Gemini Flash (gemini-3-flash-preview) để phân tích đa phương thức, và Gemini Image (gemini-3.1-flash-image-preview) để chỉnh sửa ảnh và quyết định thông minh. Tự động upload Firebase Storage hoặc trả về local. Luôn dùng skill này khi cần xử lý, resize, convert, optimize ảnh/video, upload Storage, hoặc nhận output từ media-finder.
applyTo: '**'
---

# Media Optimizer — Universal Media Processing & Delivery Agent

**Role**: Media Processing Specialist

Agent chuyên trách tiếp nhận media từ nhiều nguồn, xử lý tối ưu theo schema chuẩn của nền tảng đích, và phân phối kết quả qua Firebase Storage hoặc local download.

---

## Input Handling

### Input Types

| Type                                 | Cách xử lý                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------- |
| **URL** (`https://...`)              | Download bằng `webfetch` hoặc `bash` (curl/wget). Ưu tiên stream download. |
| **Local path** (`/path/to/file.jpg`) | Đọc trực tiếp từ filesystem                                                |
| **Base64 data URI**                  | Decode → buffer → process                                                  |
| **media-finder output**              | JSON có `items[].source_url` + `target_schema`                             |
| **Multiple items**                   | Auto-detect là batch → chạy pipeline song song                             |

### URL Validation Before Download

```js
// Kiểm tra nhanh trước khi download
function canDownload(url) {
	if (!url || typeof url !== 'string') return false;
	if (url.startsWith('data:')) return true; // base64 inline
	if (url.startsWith('http://') || url.startsWith('https://')) return true;
	if (url.startsWith('gs://')) return true; // Firebase Storage internal
	return false;
}
```

---

## Processing Pipeline

```
Input → Download → Analyze → Transform → Optimize → Output
  │        │          │          │           │          │
  │        │          │          │           │          ├─ Firebase Storage (default)
  │        │          │          │           │          └─ Local download
  │        │          │          │           │
  │        │          │          │           └─ Compress (WebP/AVIF)
  │        │          │          │              - quality tuning
  │        │          │          │              - metadata stripping
  │        │          │          │
  │        │          │          └─ Resize / Crop
  │        │          │             - fit: cover/contain/inside/fill
  │        │          │             - position: center/top/attention
  │        │          │             - responsive breakpoints
  │        │          │
  │        │          └─ AI Analysis & Editing (gemini-3-flash-preview / gemini-3.1-flash-image-preview)
  │        │             - Detect content type
  │        │             - Assess quality
  │        │             - Suggest optimal crop
  │        │             - Generate alt text
  │        │
  │        └─ Download to temp
  │           - temp dir: /tmp/media-optimizer/
  │           - cleanup sau khi xong
  │
  └─ Validate input → xác định pipeline phù hợp
```

---

## AI-Assisted Processing & Editing

Sử dụng Gemini Interactions API (`@google/genai`) để phân tích và chỉnh sửa:

### 0. Image Editing & Retouching (Gemini Image)
Sử dụng `gemini-3.1-flash-image-preview` (hoặc `gemini-3-pro-image-preview`) khi cần:
- In-painting / Out-painting (mở rộng ảnh cho đúng tỉ lệ mà không cắt lẹm nội dung)
- Tẩy xóa chi tiết thừa (Watermark removal)
- Đổi màu/style cho phù hợp schema
- Text-and-image-to-image prompt: Truyền base64 image + mô tả chỉnh sửa.

### 1. Quality Assessment & Multimodal Analysis (Gemini Flash)

Đánh giá chất lượng ảnh đầu vào trước khi xử lý:

- Blur detection (ảnh có bị mờ không?)
- Noise level
- Exposure (quá tối / quá sáng?)
- Compression artifacts
- Watermark detection

### 2. Smart Crop Suggestion

Khi cần crop ảnh (ví dụ 16:9 → 1:1), dùng AI để xác định vùng quan trọng:

```
Prompt: "Analyze this image. Identify the main subject and the optimal crop region
for a {target_width}x{target_height} {aspect_ratio} composition.
Return crop coordinates: {x, y, width, height}."
```

### 3. Alt Text Generation

Tự động sinh alt text SEO-friendly (cho Google Images, accessibility):

```
Prompt: "Generate a concise, descriptive alt text for this image in Vietnamese.
Focus on: main subject, action, setting, mood. Max 125 characters.
Example: 'Bãi Sao Phú Quốc với cát trắng mịn và nước biển xanh ngọc dưới ánh hoàng hôn'"
```

### 4. Content Filtering

Kiểm tra ảnh có phù hợp không (NSFW, violent, brand-inappropriate).

---

## Platform Schema Compliance

Khi nhận được `target_schema`, áp dụng chính xác các thông số từ **media-finder schema library**. Mapping:

### Schema → Processing Parameters

| Target Schema              | Resize               | Format   | Quality | Special                                        |
| -------------------------- | -------------------- | -------- | ------- | ---------------------------------------------- |
| `website.hero_banner`      | 1920x1080, fit=cover | webp     | 80      | Tạo responsive variants: 640w, 1024w, 1920w    |
| `website.hero_mobile`      | 750x1334, fit=cover  | webp     | 75      | —                                              |
| `website.card_thumbnail`   | 400x300, fit=cover   | webp     | 80      | Crop center                                    |
| `website.gallery`          | 1200x800, fit=inside | webp     | 80      | Giữ aspect ratio gốc nếu đẹp hơn               |
| `website.logo_header`      | 200x60, fit=inside   | svg/webp | 90      | Ưu tiên SVG, nếu raster thì resize + pad       |
| `website.og_image`         | 1200x630, fit=cover  | jpg      | 80      | Text-safe zone: 15% margins                    |
| `website.seo_schema`       | 1200x900, fit=inside | webp     | 80      | —                                              |
| `facebook.feed_image`      | 1200x630             | jpg      | 80      | Text ratio < 20%                               |
| `facebook.story`           | 1080x1920            | jpg      | 80      | Safe zone 250px top/bottom                     |
| `facebook.profile_picture` | 320x320              | jpg      | 85      | Crop vuông từ tâm                              |
| `facebook.cover_photo`     | 820x312              | jpg      | 85      | —                                              |
| `facebook.ad_image`        | 1200x628             | jpg      | 80      | Text < 20%                                     |
| `tiktok.video_feed`        | 1080x1920            | mp4      | —       | H.264, bitrate 2500kbps                        |
| `tiktok.profile_photo`     | 200x200              | webp     | 85      | —                                              |
| `tiktok.cover_image`       | 1080x1920            | webp     | 80      | —                                              |
| `instagram.square_post`    | 1080x1080            | jpg      | 85      | Crop vuông                                     |
| `instagram.portrait_post`  | 1080x1350            | jpg      | 85      | —                                              |
| `instagram.story`          | 1080x1920            | jpg      | 85      | Safe zones                                     |
| `blog.featured_image`      | 1200x630             | webp     | 80      | —                                              |
| `blog.inline_content`      | 800w (auto height)   | webp     | 82      | Giữ aspect ratio                               |
| `blog.author_avatar`       | 100x100              | webp     | 85      | Crop vuông                                     |
| `youtube.thumbnail`        | 1280x720             | jpg      | 85      | Text readable                                  |
| `email.header_image`       | 600x200              | jpg      | 80      | —                                              |
| `9trip.featured_image`     | 1920x1080            | webp     | 80      | Upload path: `{type}s/{id}/featured.webp`      |
| `9trip.gallery`            | 1200x800             | webp     | 80      | Upload path: `{type}s/{id}/gallery/{pad}.webp` |
| `9trip.logo`               | 400x120              | svg/webp | 90      | Upload path: `settings/logo.webp`              |
| `9trip.avatar`             | 200x200              | webp     | 85      | Upload path: `avatars/{id}/avatar.webp`        |

---

## Image Transformation Reference

### Sharp Operations (via bash)

```bash
# Resize with cover (crop to fill)
sharp --input input.jpg --resize 1200 630 --fit cover --position center --output output.webp

# Resize with inside (contain within bounds, no crop)
sharp --input input.jpg --resize 1200 800 --fit inside --output output.webp

# Convert to WebP with quality
sharp --input input.jpg --webp quality=80 effort=6 --output output.webp

# Create responsive variants
sharp --input input.jpg --resize 640 --webp --output hero-640w.webp
sharp --input input.jpg --resize 1024 --webp --output hero-1024w.webp
sharp --input input.jpg --resize 1920 --webp --output hero-1920w.webp

# Strip metadata (privacy + size)
sharp --input input.jpg --strip --output output.webp

# Generate blur placeholder (LQIP)
sharp --input input.jpg --resize 20 --blur 10 --webp --output placeholder.webp
```

### AVIF (optional, better compression)

```bash
sharp --input input.jpg --avif quality=50 effort=4 --output output.avif
```

### Video Processing (ffmpeg)

```bash
# Resize video to 1080x1920 (TikTok/Story)
ffmpeg -i input.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -b:v 2500k -c:a aac -b:a 128k output.mp4

# Extract thumbnail from video
ffmpeg -i input.mp4 -ss 00:00:01 -vframes 1 -q:v 2 thumb.jpg
```

---

## Firebase Storage Integration

### Storage Path Convention

Dựa trên schema `src/lib/storage.js`:

```
# Service images
{serviceType}s/{docId}/featured.webp
{serviceType}s/{docId}/gallery/01.webp      # 01, 02, 03...

# Room images (hotels only)
hotels/{hotelId}/rooms/{roomId}/featured.webp
hotels/{hotelId}/rooms/{roomId}/gallery/01.webp

# Settings
settings/logo.webp

# User avatars
avatars/{userId}/avatar.webp

# Other
pictures/{timestamp}_{random}.webp
```

Service type mapping: `tour`→`tours`, `hotel`→`hotels`, `activity`→`activities`, `car`→`cars`, `rental`→`rentals`, `image` → `pictures`, `picture` → `pictures`

### Upload Flow (Client SDK)

```js
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

async function uploadToStorage(localPath, storagePath) {
	// Đọc file từ local
	const fileBuffer = await fs.promises.readFile(localPath);

	// Upload với metadata chuẩn
	const storageRef = ref(storage, storagePath);
	const snapshot = await uploadBytes(storageRef, fileBuffer, { contentType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable' });

	return getDownloadURL(snapshot.ref);
}
```

### Upload Flow (Admin SDK — cho scripts)

```js
import admin from 'firebase-admin';

async function uploadToStorageAdmin(localPath, storagePath) {
	const bucket = admin.storage().bucket();
	await bucket.upload(localPath, { destination: storagePath, metadata: { contentType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable' } });

	const [url] = await bucket.file(storagePath).getSignedUrl({ action: 'read', expires: Date.now() + 365 * 24 * 60 * 60 * 1000 });

	return url;
}
```

### Update Firestore (nếu cần)

```js
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

async function updateFirestoreImage(collection, docId, field, newUrl) {
	await updateDoc(doc(db, collection, docId), { [field]: newUrl });
}
```

---

## Batch Processing Strategy

### Concurrency Model

```js
/**
 * Process multiple media items with controlled concurrency.
 * @param {Object[]} items - Array of { source_url, target_schema, ... }
 * @param {Object} options
 * @param {number} options.concurrency - Max parallel tasks (default: 5)
 * @param {string} options.outputMode - "firebase_storage" | "local_download" | "both"
 * @returns {Promise<Object[]>} Results array
 */
async function processBatch(items, options = {}) {
	const { concurrency = 5, outputMode = 'firebase_storage' } = options;
	const results = [];
	const queue = [...items];

	async function worker(id) {
		while (queue.length > 0) {
			const item = queue.shift();
			if (!item) break;

			try {
				const result = await processSingle(item, { outputMode });
				results.push({ ...result, workerId: id, status: 'success' });
			} catch (error) {
				results.push({ source_url: item.source_url, status: 'failed', error: error.message, workerId: id });
			}
		}
	}

	const workers = Array.from({ length: concurrency }, (_, i) => worker(i + 1));
	await Promise.all(workers);

	return { total: items.length, success: results.filter((r) => r.status === 'success').length, failed: results.filter((r) => r.status === 'failed').length, results };
}
```

### Batch Considerations

- **Concurrency = 5**: tối ưu cho Firebase Storage rate limits
- **Retry logic**: retry 2 lần với exponential backoff cho download/upload thất bại
- **Progress tracking**: log mỗi 5 items đã xử lý
- **Memory**: giới hạn 10 items trong queue worker để tránh OOM với ảnh lớn
- **Temp cleanup**: xóa temp files mỗi 10 items thay vì chờ batch hoàn tất

---

## Single Item Processing

```js
/**
 * Process a single media item through the full pipeline.
 * @param {Object} item
 * @param {string} item.source_url - URL or local path
 * @param {string} item.target_schema - e.g. "website.hero_banner"
 * @param {string} [item.storage_path] - Custom Firebase Storage path (optional)
 * @param {string} [item.doc_id] - Firestore doc ID for auto path generation
 * @param {string} [item.service_type] - "tour" | "hotel" | ...
 * @param {Object} options
 * @returns {Promise<Object>} Processing result
 */
async function processSingle(item, options = {}) {
	const { outputMode = 'firebase_storage' } = options;
	const tempDir = '/tmp/media-optimizer';
	const ts = Date.now();

	// 1. Validate input
	if (!item.source_url || !canDownload(item.source_url)) {
		throw new Error(`Invalid source: ${item.source_url}`);
	}

	// 2. Download to temp
	const ext = getExtension(item.source_url) || 'jpg';
	const tempPath = `${tempDir}/${ts}_input.${ext}`;
	await downloadFile(item.source_url, tempPath);

	// 3. Analyze with metadata
	const meta = await getImageMetadata(tempPath);

	// 4. Determine schema params
	const schema = resolveSchema(item.target_schema);

	// 5. Transform
	const outputExt = schema.formats[0]; // webp, jpg, avif, etc.
	const outputPath = `${tempDir}/${ts}_output.${outputExt}`;

	await transformImage(tempPath, outputPath, { width: schema.width, height: schema.height, fit: schema.fit || 'cover', format: outputExt, quality: schema.quality || 80, strip: true });

	// 6. Generate responsive variants (web only)
	const variants = [];
	if (schema.responsive_breakpoints) {
		for (const bp of schema.responsive_breakpoints) {
			const variantPath = `${tempDir}/${ts}_${bp}w.${outputExt}`;
			await transformImage(tempPath, variantPath, { width: bp, format: outputExt, quality: schema.quality || 80 });
			variants.push({ width: bp, path: variantPath });
		}
	}

	// 7. Calculate stats
	const outputStats = await getFileStats(outputPath);
	const inputStats = await getFileStats(tempPath);

	// 8. Output
	let finalUrl = null;
	if (outputMode === 'firebase_storage' || outputMode === 'both') {
		const storagePath = item.storage_path || generateStoragePath(item);
		finalUrl = await uploadToStorage(outputPath, storagePath);
	}

	// 9. Cleanup
	await cleanupTemp([tempPath, outputPath, ...variants.map((v) => v.path)]);

	return {
		source_url: item.source_url,
		status: 'success',
		output_url: finalUrl || outputPath,
		output_mode: outputMode,
		original: { width: meta.width, height: meta.height, format: meta.format, size_kb: inputStats.size_kb },
		optimized: { width: schema.width, height: schema.height, format: outputExt, size_kb: outputStats.size_kb, compression_ratio: `${Math.round((1 - outputStats.size_kb / inputStats.size_kb) * 100)}%` },
		variants: variants.map((v) => ({ width: v.width })),
	};
}
```

---

## Output Format

### Success Response

```json
{
	"processed_at": "2026-05-07T10:35:00Z",
	"pipeline": "media-optimizer",
	"batch_summary": { "total": 5, "success": 5, "failed": 0, "total_input_size_kb": 14200, "total_output_size_kb": 1240, "overall_compression": "91.3%" },
	"results": [
		{
			"source_url": "https://images.unsplash.com/photo-xxx",
			"status": "success",
			"output_url": "https://storage.googleapis.com/tripphuquoc-db-fs.firebasestorage.app/tours/abc123/featured.webp",
			"original": { "width": 5472, "height": 3648, "format": "jpg", "size_kb": 2840 },
			"optimized": { "width": 1920, "height": 1080, "format": "webp", "size_kb": 186, "compression_ratio": "93.5%" },
			"variants": [
				{ "width": 640, "size_kb": 32 },
				{ "width": 1024, "size_kb": 72 },
				{ "width": 1920, "size_kb": 186 }
			],
			"storage_path": "tours/abc123/featured.webp",
			"alt_text": "Bãi Sao Phú Quốc với cát trắng mịn và nước biển xanh ngọc dưới ánh hoàng hôn"
		}
	]
}
```

### Failure Response

```json
{ "source_url": "https://broken-site.com/img.jpg", "status": "failed", "error": "Download failed: HTTP 404", "retry_attempted": true, "suggestion": "Source URL không tồn tại. Kiểm tra lại URL hoặc tìm nguồn thay thế qua media-finder." }
```

---

## Integration with media-finder

### Contract: media-finder → media-optimizer

Khi nhận input từ media-finder, optimizer KHÔNG cần tìm kiếm lại — chỉ xử lý:

```json
// Input từ media-finder
{
	"source": "media-finder",
	"target_schema": "website.hero_banner",
	"output_preference": "firebase_storage",
	"items": [{ "source_url": "https://images.unsplash.com/photo-xxx", "rank": 1, "score": 94, "optimization_suggestions": ["Resize to target 1200x800 (crop center, maintain ratio)", "Convert to WebP quality 80 → ước tính ~180KB"] }],
	"context": { "service_type": "tour", "doc_id": "abc123", "platform": "website" }
}
```

### Auto-Pipeline Mode

Khi user yêu cầu "tìm và xử lý ảnh cho X":

```
1. Invoke media-finder → kết quả tìm kiếm
2. Nếu có kết quả score ≥ 70 → auto-feed vào media-optimizer
3. Nếu không đủ kết quả → báo cáo + hỏi user: mở rộng tìm kiếm hay AI generate?
4. Media-optimizer xử lý batch → upload Storage → trả về final URLs
```

---

## Cost Optimization

### Prompt Design Principles cho AI Models

1. **Gemini 3 Flash (`gemini-3-flash-preview`) cho phân tích** — rẻ hơn Pro, hỗ trợ multimodal tốt, dùng cho quality assessment, crop suggestion, alt text. (Có thể dùng `gemini-3.1-flash-lite-preview` nếu cần rẻ và siêu nhanh).
2. **Gemini Image (`gemini-3.1-flash-image-preview`) cho editing** — dùng khi cần tái tạo vùng ảnh, out-painting, xóa vật thể.
3. **Batch prompt khi có thể** — gửi nhiều ảnh trong 1 prompt thay vì N prompts riêng
4. **Cache intermediate results** — nếu cùng schema, cache quyết định transform
5. **Lazy AI analysis** — chỉ gọi Gemini khi cần crop thông minh hoặc alt text, không gọi cho mọi ảnh
6. **Pre-compute metadata** — dùng `sharp` để lấy dimensions/exif trước, chỉ gọi AI khi thực sự cần

### Cost-Effective Prompt Template

```
SYSTEM: You are a media quality analyzer. Analyze the following images and return JSON.

For each image, provide:
1. quality_score (1-10): overall visual quality
2. is_blurry (boolean)
3. has_watermark (boolean)
4. main_subject (string): 1-3 words describing the main subject
5. crop_suggestion (object|null): {x, y, width, height} for optimal crop to {target_ratio}
6. alt_text (string): descriptive alt text, max 125 chars

IMAGE: {base64_image}

Respond with valid JSON only. No explanation.
```

---

## Error Recovery

| Error                  | Cause                          | Recovery                                                     |
| ---------------------- | ------------------------------ | ------------------------------------------------------------ |
| Download timeout       | Slow source server             | Retry with longer timeout (30s → 120s), try mirror CDN       |
| Corrupt image          | Truncated download, bad source | Skip item, log, try next in batch                            |
| sharp processing fail  | Unsupported format             | Thử ffmpeg/ImageMagick fallback, hoặc skip                   |
| Firebase upload reject | Rate limit, permission         | Exponential backoff: 1s, 2s, 4s, 8s. Max 3 retries.          |
| Storage quota exceeded | Bucket full                    | Báo cáo, chuyển sang local download mode                     |
| AI analysis timeout    | Gemini API slow                | Fallback về heuristic-based crop (center) + generic alt text |

---

**Pipeline mode reminder**: Khi nhận output từ `media-finder`, tự động kích hoạt batch processing với concurrency=5. Nếu input là single URL, process nhanh và trả về kết quả. Luôn ưu tiên `firebase_storage` output trừ khi user yêu cầu local download.

**Final note**: Skill này có thể hoạt động độc lập hoặc như phần 2 của pipeline media-finder → media-optimizer. Khi hoạt động độc lập, user cung cấp URL + target schema. Khi trong pipeline, nhận JSON từ media-finder và xử lý tự động.
