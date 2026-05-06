---
name: media-optimizer
description: Nhận danh sách ảnh từ media-finder skill, download từ WordPress cũ, xóa/thay logo, chuyển đổi sang WebP, tối ưu kích thước, upload lên Firebase Storage và cập nhật URL trong Firestore documents.
applyTo: "src/**"
---

# Media Optimizer — Image Processing & Upload Agent

**Role**: Image Processing Specialist

Agent chuyên trách nhận ảnh từ `media-finder` skill, xử lý (logo, format, kích thước), upload lên Firebase Storage, và cập nhật Firestore.

## Workflow Overview

```
audit-report.json → Download Images → Remove Old Logo → Add 9Trip Logo
    → Convert WebP → Optimize Size → Upload to Storage → Update Firestore
```

## Prerequisites

- `media-finder` skill đã chạy và tạo `audit-report.json`
- Có quyền đọc/ghi Firebase Storage (service account)
- Node.js với thư viện `sharp` (cài: `npm install sharp`)
- Thư mục tạm `temp/` để xử lý file

## Storage Directory Structure

```
/storage/
  /gallery/
    /tours/{tourId}/
    /hotels/{hotelId}/
    /rooms/{roomId}/
    /activities/{activityId}/
    /cars/{carId}/
  /avatars/{userId}/
  /reviews/{reviewId}/
  /settings/
```

## Execution Steps

### Step 1: Đọc audit-report.json

Đọc danh sách URL ảnh từ báo cáo, lọc theo priority:
1. 🔴 `broken` — Cần tìm ảnh thay thế trước
2. 🟠 `placeholder` — picsum.photos → download ảnh thật
3. 🟡 `wordpress-url` — Có thể download từ WordPress

### Step 2: Download Ảnh từ WordPress

```javascript
const https = require('https');
const fs = require('fs');
const path = require('path');

async function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(destPath);
      });
    }).on('error', reject);
  });
}
```

**Lưu ý:** Nếu WordPress không còn online, dùng ảnh từ Firebase Storage cũ (nếu có) hoặc báo cáo lại cho user.

### Step 3: Xử Lý Logo

#### 3a. Phát hiện logo
Dùng OCR heuristic hoặc AI (Gemini API nếu có) để detect logo region trong ảnh.

#### 3b. Xóa logo cũ
Dùng sharp để inpainting hoặc crop vùng logo:

```javascript
const sharp = require('sharp');

async function removeLogo(imagePath, logoRegion) {
  // logoRegion: { x, y, width, height } — vùng chứa logo
  // Có thể:
  // 1. Blur vùng logo
  // 2. Overlay màu nền
  // 3. Crop bỏ vùng logo nếu ở biên
  
  const metadata = await sharp(imagePath).metadata();
  
  if (logoRegion) {
    // Blur region
    // ... implementation depends on UI requirements
  }
  
  return imagePath;
}
```

#### 3c. Thêm logo 9Trip

```javascript
async function addWatermark(imagePath, logoPath, position = 'bottom-right') {
  const { width } = await sharp(imagePath).metadata();
  const logoSize = Math.round(width * 0.15); // Logo 15% chiều rộng ảnh
  
  return sharp(imagePath)
    .composite([{
      input: logoPath,
      top: position === 'bottom-right' ? null : 0,
      left: position === 'bottom-right' ? null : 0,
      gravity: position === 'bottom-right' ? 'southeast' : 'northwest',
    }])
    .toFile(imagePath.replace(/\.[^.]+$/, '_with_logo.webp'));
}
```

### Step 4: Convert WebP & Tối Ưu

```javascript
async function optimizeImage(inputPath, outputPath, options = {}) {
  const {
    width = 1920,      // Max width
    height = null,      // Auto aspect ratio
    quality = 80,       // WebP quality (0-100)
    fit = 'inside',     // Contain inside bounds
  } = options;

  const pipeline = sharp(inputPath)
    .resize(width, height, { fit, withoutReduction: false })
    .webp({ quality, effort: 6 }); // effort 0-6 (6 = slowest/best)

  await pipeline.toFile(outputPath);
}
```

**Size guidelines per service type:**
| Type | Max Width | Quality |
|------|-----------|---------|
| featuredImage | 1920px | 80 |
| gallery | 1200px | 80 |
| avatar | 200px | 85 |
| logo | 400px | 90 |

### Step 5: Upload Firebase Storage

```javascript
const { ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const { storage } = require('./src/lib/firebase');

async function uploadToStorage(localPath, storagePath) {
  const fileBuffer = fs.readFileSync(localPath);
  const storageRef = ref(storage, storagePath);
  
  const snapshot = await uploadBytes(storageRef, fileBuffer, {
    contentType: 'image/webp',
    cacheControl: 'public, max-age=31536000, immutable',
  });
  
  return getDownloadURL(snapshot.ref);
}
```

### Step 6: Cập Nhật Firestore

```javascript
const { doc, updateDoc } = require('firebase/firestore');
const { db } = require('./src/lib/firebase');

async function updateDocumentUrl(collection, docId, field, newUrl, index = null) {
  const ref = doc(db, collection, docId);
  
  if (index !== null && Array.isArray(field)) {
    // Update array element
    const data = {};
    data[field] = admin.firestore.FieldValue.arrayRemove(...);
    // ...
  } else {
    // Update simple field
    await updateDoc(ref, { [field]: newUrl });
  }
}
```

## Full Processing Pipeline

```javascript
async function processImage(item, options = {}) {
  const {
    collection,
    docId,
    field,
    url,
    type,
  } = item;
  
  const tempDir = path.join(__dirname, 'temp');
  const tempFile = path.join(tempDir, `${collection}_${docId}_${Date.now()}`);
  const ext = path.extname(new URL(url).pathname) || '.jpg';
  const downloadPath = `${tempFile}${ext}`;
  const outputPath = `${tempFile}.webp`;
  
  try {
    // 1. Download
    await downloadImage(url, downloadPath);
    
    // 2. Determine storage path
    const serviceType = collection.replace(/s$/, ''); // 'tours' → 'tour'
    const isFeatured = field === 'featuredImage';
    let storagePath;
    
    if (isFeatured) {
      storagePath = `${serviceType}s/${docId}/featured.webp`;
    } else if (field.startsWith('gallery')) {
      const idx = field.match(/\[(\d+)\]/)?.[1] || '00';
      storagePath = `${serviceType}s/${docId}/gallery/${idx.padStart(2, '0')}.webp`;
    } else if (collection === 'settings' && field === 'logo') {
      storagePath = `settings/logo.webp`;
    } else if (collection === 'users') {
      storagePath = `avatars/${docId}/avatar.webp`;
    } else {
      storagePath = `${serviceType}s/${docId}/${field}.webp`;
    }
    
    // 3. Process: Remove old logo → Add 9Trip logo → WebP → Optimize
    await removeLogo(downloadPath, null); // Pass logoRegion if known
    await optimizeImage(downloadPath, outputPath, getSizeOptions(field));
    
    // 4. Upload
    const downloadUrl = await uploadToStorage(outputPath, storagePath);
    
    // 5. Update Firestore
    await updateDocumentUrl(collection, docId, field, downloadUrl);
    
    // 6. Cleanup temp files
    fs.unlinkSync(downloadPath);
    fs.unlinkSync(outputPath);
    
    return { success: true, docId, field, newUrl: downloadUrl };
  } catch (error) {
    console.error(`[media-optimizer] Failed: ${collection}/${docId}/${field}`, error.message);
    return { success: false, docId, field, error: error.message };
  }
}
```

## Batch Processing

Process nhiều ảnh song song (tối đa 5 concurrent):

```javascript
async function processBatch(items, concurrency = 5) {
  const results = [];
  const queue = [...items];
  
  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      const result = await processImage(item);
      results.push(result);
    }
  }
  
  const workers = Array(concurrency).fill(null).map(() => worker());
  await Promise.all(workers);
  
  return results;
}
```

## Output

Tạo báo cáo kết quả:

```json
{
  "processedAt": "2026-04-29T...",
  "total": 50,
  "success": 48,
  "failed": 2,
  "results": [
    { "success": true, "docId": "tour_abc", "field": "featuredImage", "newUrl": "https://storage.googleapis.com/..." },
    { "success": false, "docId": "hotel_xyz", "field": "gallery[2]", "error": "Download failed: 404" }
  ],
  "failures": [
    { "docId": "hotel_xyz", "field": "gallery[2]", "reason": "WordPress image not found" }
  ]
}
```

## Error Handling

| Error | Cause | Action |
|-------|-------|--------|
| Download 404 | WordPress ảnh không còn | Tìm ảnh thay thế từ Google hoặc báo user |
| Sharp error | File corrupt hoặc unsupported format | Try another format or skip |
| Upload failed | Storage permission hoặc network | Retry with exponential backoff |
| Firestore update | Document không tồn tại | Kiểm tra collection + docId |

## Integration

```
media-finder (phát hiện ảnh)
    │
    ▼
media-optimizer (skill này)
    │
    ├── download → process → upload → update
    │
    └── output: processing-report.json
```

## Dependencies

- `sharp` — Image processing (npm i sharp)
- `firebase-admin` — Đã có trong project
- Node.js built-in `https`, `fs`, `path` — Standard library
