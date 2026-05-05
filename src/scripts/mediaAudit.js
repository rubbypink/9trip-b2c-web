/**
 * Media Audit Script — Quét và phân loại tất cả ảnh trong hệ thống 9 Trip B2C.
 *
 * Triển khai media-finder skill:
 * 1. Quét tất cả Firestore collections tìm image fields
 * 2. Phân loại URL: wordpress-url, placeholder, gs-path, external, broken, empty
 * 3. Tạo báo cáo JSON chi tiết
 * 4. Đề xuất hướng xử lý
 *
 * Chạy: node src/scripts/mediaAudit.js
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");

// ─── Init Firebase Admin SDK ──────────────────────────────────────────

const serviceAccount = path.resolve(__dirname, "../..", "tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json");

if (!fs.existsSync(serviceAccount)) {
  console.error("❌ Không tìm thấy service account JSON tại:", serviceAccount);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(require(serviceAccount)) });
}
const db = admin.firestore();

// ─── Config ───────────────────────────────────────────────────────────

const COLLECTIONS_TO_SCAN = [
  "tours", "hotels", "rooms", "activities", "cars", "rentals",
  "locations", "settings", "coupons", "reviews", "users",
];

const IMAGE_FIELDS = [
  "featuredImage", "gallery", "images", "media", "logo",
  "avatar", "userAvatar", "photoURL", "coverImage",
];

// URL Classification Patterns
const WORDPRESS_PATTERN = /^https?:\/\/([^.]+\.)*rootytrip\.com\//i;
const PICSUM_PATTERN = /^https?:\/\/picsum\.photos\//i;
const GS_PATTERN = /^gs:\/\//;
const SVG_PATTERN = /\.svg$/i;
const DATA_URI_PATTERN = /^data:/;
const IMAGE_EXT_PATTERN = /\.(jpg|jpeg|png|webp|gif|avif|bmp|tiff)$/i;
const HTTP_PATTERN = /^https?:\/\//;
const RELATIVE_PATTERN = /^\//;

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Check if an HTTP/HTTPS URL is reachable.
 * @param {string} url
 * @returns {Promise<boolean>}
 */
function checkUrlReachable(url) {
  return new Promise((resolve) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { timeout: 5000 }, (res) => {
      // 2xx or 3xx = reachable
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Classify a single image URL.
 * @param {string|null|undefined} url
 * @returns {{ type: string, status: string, actionable: boolean, note: string }}
 */
function classifyUrl(url) {
  if (!url || url === "") {
    return { type: "empty", status: "missing", actionable: true, note: "Thiếu ảnh — cần thêm ảnh mới" };
  }

  if (typeof url !== "string") {
    return { type: "invalid", status: "broken", actionable: true, note: "URL không phải string" };
  }

  // Data URI
  if (DATA_URI_PATTERN.test(url)) {
    return { type: "data-uri", status: "needs-convert", actionable: true, note: "Data URI — cần chuyển thành file WebP" };
  }

  // SVG
  if (SVG_PATTERN.test(url)) {
    return { type: "svg", status: "needs-review", actionable: true, note: "SVG — không phải ảnh raster, cần xử lý riêng" };
  }

  // Google Storage path
  if (GS_PATTERN.test(url)) {
    return { type: "gs-path", status: "needs-resolve", actionable: true, note: "gs:// path — cần resolve sang HTTPS" };
  }

  // WordPress old site
  if (WORDPRESS_PATTERN.test(url)) {
    return { type: "wordpress-url", status: "external", actionable: true, note: "Ảnh từ WordPress cũ — cần download → WebP → Firebase Storage" };
  }

  // Picsum placeholder
  if (PICSUM_PATTERN.test(url)) {
    return { type: "placeholder", status: "placeholder", actionable: true, note: "Ảnh placeholder picsum — cần thay bằng ảnh thật" };
  }

  // External HTTP URL (other)
  if (HTTP_PATTERN.test(url)) {
    // Check if it looks like an image
    if (IMAGE_EXT_PATTERN.test(url) || url.includes("firebasestorage") || url.includes("storage.googleapis")) {
      return { type: "external-image", status: "valid", actionable: false, note: "Ảnh external (có vẻ hợp lệ)" };
    }
    return { type: "external-url", status: "needs-verify", actionable: true, note: "URL external — cần verify có phải ảnh không" };
  }

  // Relative path
  if (RELATIVE_PATTERN.test(url)) {
    return { type: "relative-path", status: "needs-resolve", actionable: true, note: "Path tương đối — cần resolve với bucket root" };
  }

  return { type: "unknown", status: "needs-review", actionable: true, note: `Không xác định được loại URL: ${url.substring(0, 50)}` };
}

/**
 * Deep scan an object for image URLs in known image fields.
 * @param {Object} data - Document data
 * @param {string} docId - Document ID
 * @param {string} colName - Collection name
 * @returns {Array<{ field: string, url: string, classification: Object, docId: string, docName: string }>}
 */
function scanDocImages(data, docId, colName) {
  const results = [];
  const docName = data.name || data.title || docId;

  for (const field of IMAGE_FIELDS) {
    const value = data[field];
    if (!value) continue;

    if (Array.isArray(value)) {
      // Gallery/images array
      value.forEach((url, idx) => {
        const classification = classifyUrl(url);
        results.push({
          collection: colName,
          docId,
          docName,
          field: `${field}[${idx}]`,
          url: typeof url === "string" ? url.substring(0, 200) : String(url),
          ...classification,
        });
      });
    } else if (typeof value === "string") {
      const classification = classifyUrl(value);
      results.push({
        collection: colName,
        docId,
        docName,
        field,
        url: value.substring(0, 200),
        ...classification,
      });
    }
  }

  return results;
}

/**
 * Recursively find image URLs anywhere in an object (deep scan).
 * Finds URLs that match common image patterns even in unexpected fields.
 * @param {*} obj
 * @param {string} prefix
 * @returns {Array<{ field: string, url: string }>}
 */
function deepFindImageUrls(obj, prefix = "") {
  const results = [];

  if (!obj || typeof obj !== "object") return results;

  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      if (typeof item === "string" && (IMAGE_EXT_PATTERN.test(item) || HTTP_PATTERN.test(item) || GS_PATTERN.test(item))) {
        results.push({ field: `${prefix}[${idx}]`, url: item.substring(0, 200) });
      } else if (typeof item === "object") {
        results.push(...deepFindImageUrls(item, `${prefix}[${idx}]`));
      }
    });
    return results;
  }

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string" && (IMAGE_EXT_PATTERN.test(value) || HTTP_PATTERN.test(value) || GS_PATTERN.test(value) || DATA_URI_PATTERN.test(value))) {
      results.push({ field: fullKey, url: value.substring(0, 200) });
    } else if (typeof value === "object" && value !== null && !value._seconds) {
      // Skip Firestore Timestamp objects (have _seconds)
      results.push(...deepFindImageUrls(value, fullKey));
    }
  }

  return results;
}

// ─── Main Audit ───────────────────────────────────────────────────────

async function auditCollection(colName) {
  console.log(`\n📂 Scanning ${colName}...`);

  const result = {
    collection: colName,
    totalDocs: 0,
    docsWithImages: 0,
    totalUrls: 0,
    byType: {},
    byStatus: {},
    items: [],
    deepUrls: [],
  };

  try {
    const snapshot = await db.collection(colName).get();

    if (snapshot.empty) {
      console.log(`   ⚠️  Empty collection`);
      return result;
    }

    result.totalDocs = snapshot.size;

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Scan known image fields
      const imageItems = scanDocImages(data, doc.id, colName);
      if (imageItems.length > 0) {
        result.docsWithImages++;
        result.items.push(...imageItems);

        for (const item of imageItems) {
          result.totalUrls++;
          result.byType[item.type] = (result.byType[item.type] || 0) + 1;
          result.byStatus[item.status] = (result.byStatus[item.status] || 0) + 1;
        }
      }

      // Deep scan for hidden image URLs
      const deepUrls = deepFindImageUrls(data);
      const knownFields = new Set(imageItems.map((i) => i.field));
      const newDeepUrls = deepUrls.filter((u) => !knownFields.has(u.field));
      if (newDeepUrls.length > 0) {
        result.deepUrls.push({
          docId: doc.id,
          docName: data.name || data.title || doc.id,
          urls: newDeepUrls,
        });
      }
    }

    console.log(`   📊 ${result.totalDocs} docs, ${result.docsWithImages} with images, ${result.totalUrls} image URLs`);
    if (Object.keys(result.byType).length > 0) {
      console.log(`   📋 Types: ${Object.entries(result.byType).map(([k, v]) => `${k}=${v}`).join(", ")}`);
    }

  } catch (error) {
    console.error(`   ❌ Error scanning ${colName}:`, error.message);
  }

  return result;
}

async function main() {
  console.log("=".repeat(70));
  console.log("🖼️  9 Trip — Media Audit Script (media-finder)");
  console.log("=".repeat(70));

  const startTime = Date.now();
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalCollections: COLLECTIONS_TO_SCAN.length,
      totalDocs: 0,
      totalDocsWithImages: 0,
      totalImageUrls: 0,
      byType: {},
      byStatus: {},
      actionableCount: 0,
    },
    collections: {},
    deepScan: {},
    recommendations: [],
  };

  // Scan all collections
  for (const col of COLLECTIONS_TO_SCAN) {
    const result = await auditCollection(col);
    report.collections[col] = result;

    report.summary.totalDocs += result.totalDocs;
    report.summary.totalDocsWithImages += result.docsWithImages;
    report.summary.totalImageUrls += result.totalUrls;

    // Aggregate by type
    for (const [type, count] of Object.entries(result.byType)) {
      report.summary.byType[type] = (report.summary.byType[type] || 0) + count;
    }

    // Aggregate by status
    for (const [status, count] of Object.entries(result.byStatus)) {
      report.summary.byStatus[status] = (report.summary.byStatus[status] || 0) + count;
    }

    // Count actionable items
    report.summary.actionableCount += result.items.filter((i) => i.actionable).length;

    // Deep scan findings
    if (result.deepUrls.length > 0) {
      report.deepScan[col] = result.deepUrls;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Generate recommendations
  if (report.summary.byType["placeholder"] > 0) {
    report.recommendations.push({
      priority: "🟠 High",
      issue: `${report.summary.byType["placeholder"]} ảnh placeholder (picsum.photos) cần thay thế`,
      action: "Tải ảnh thật từ WordPress cũ hoặc tạo ảnh mới → upload lên Firebase Storage",
    });
  }

  if (report.summary.byType["wordpress-url"] > 0) {
    report.recommendations.push({
      priority: "🟡 Medium",
      issue: `${report.summary.byType["wordpress-url"]} ảnh từ WordPress cũ (rootytrip.com)`,
      action: "Dùng media-optimizer skill: download → xóa logo → WebP → Firebase Storage",
    });
  }

  if (report.summary.byType["gs-path"] > 0) {
    report.recommendations.push({
      priority: "🟢 Low",
      issue: `${report.summary.byType["gs-path"]} ảnh dạng gs:// path cần resolve`,
      action: "Resolve sang HTTPS URL qua Firebase Storage SDK",
    });
  }

  if (report.summary.byType["empty"] > 0 || report.summary.byType["missing"] > 0) {
    report.recommendations.push({
      priority: "🔴 Critical",
      issue: `${(report.summary.byType["empty"] || 0) + (report.summary.byType["missing"] || 0)} ảnh bị thiếu (null/empty)`,
      action: "Thêm ảnh mới cho các documents thiếu ảnh",
    });
  }

  // Print report
  console.log("\n" + "=".repeat(70));
  console.log("📊 AUDIT SUMMARY");
  console.log("=".repeat(70));
  console.log(`Time elapsed:       ${elapsed}s`);
  console.log(`Collections scanned: ${report.summary.totalCollections}`);
  console.log(`Total documents:    ${report.summary.totalDocs}`);
  console.log(`Docs with images:   ${report.summary.totalDocsWithImages}`);
  console.log(`Total image URLs:   ${report.summary.totalImageUrls}`);
  console.log(`Actionable items:   ${report.summary.actionableCount}`);
  console.log();

  console.log("📋 By Type:");
  for (const [type, count] of Object.entries(report.summary.byType).sort((a, b) => b[1] - a[1])) {
    const icon = type === "empty" ? "🔴" : type === "placeholder" ? "🟠" : type === "wordpress-url" ? "🟡" : type === "gs-path" ? "🟢" : type === "external-image" ? "✅" : "ℹ️";
    console.log(`   ${icon} ${type}: ${count}`);
  }

  console.log();
  console.log("📋 By Status:");
  for (const [status, count] of Object.entries(report.summary.byStatus).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${status}: ${count}`);
  }

  if (report.recommendations.length > 0) {
    console.log();
    console.log("💡 RECOMMENDATIONS:");
    for (const rec of report.recommendations) {
      console.log(`   ${rec.priority} — ${rec.issue}`);
      console.log(`           → ${rec.action}`);
    }
  }

  // Save report
  const outputPath = path.resolve(__dirname, "../..", "media-audit-report.json");
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\n📄 Full report saved to: media-audit-report.json`);

  console.log();
}

main().catch(console.error);
