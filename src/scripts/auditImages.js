/**
 * Audit Images Script — Quét toàn bộ Firestore collections để tìm, phân loại tất cả ảnh.
 *
 * Chạy: node src/scripts/auditImages.js
 *
 * Output: audit-report.json (danh sách tất cả URL ảnh, phân loại, trạng thái)
 *
 * Collections quét: tours, hotels, rooms, activities, cars, rentals,
 *                    locations, settings, coupons, reviews, users
 *
 * Image fields quét: featuredImage, gallery[], images[], media[],
 *                    logo, avatar, userAvatar, photoURL, coverImage
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// ─── Init Firebase Admin SDK ──────────────────────────────────────────

const serviceAccount = path.resolve(
  __dirname,
  "..",
  "..",
  "tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json"
);

if (!fs.existsSync(serviceAccount)) {
  console.error("❌ Không tìm thấy file service account:", serviceAccount);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccount)),
  });
}

const db = admin.firestore();

// ─── Config ───────────────────────────────────────────────────────────

/** Danh sách collection cần quét */
const COLLECTIONS = [
  "tours",
  "hotels",
  "rooms",
  "activities",
  "cars",
  "rentals",
  "locations",
  "settings",
  "coupons",
  "reviews",
  "users",
];

/** Field name patterns chứa ảnh */
const IMAGE_FIELDS = [
  "featuredImage",
  "gallery",
  "images",
  "media",
  "logo",
  "avatar",
  "userAvatar",
  "photoURL",
  "coverImage",
];

/** Các field chứa ảnh phụ (trong object con) */
const NESTED_IMAGE_PATHS = [
  "pricing.image",
  "pricing.icon",
  "category.image",
  "category.icon",
  "address.image",
  "user.photoURL",
  "user.avatar",
];

/** Các field cần bỏ qua (không phải ảnh) */
const SKIP_FIELDS = ["imageUrl", "icon"];

const WORDPRESS_PATTERN = /^https?:\/\/([^.]+\.)*rootytrip\.com\//i;
const PICSUM_PATTERN = /^https?:\/\/picsum\.photos\//i;
const GS_PATTERN = /^gs:\/\//;
const HTTP_PATTERN = /^https?:\/\//;
const DATA_URI_PATTERN = /^data:/;
const SVG_PATTERN = /\.svg$/i;

// ─── URL Classification ───────────────────────────────────────────────

/**
 * Phân loại một URL ảnh.
 * @param {string} url
 * @returns {{ type: string, status: string, note: string }}
 */
function classifyUrl(url) {
  if (!url || typeof url !== "string") {
    return { type: "empty", status: "broken", note: "URL trống hoặc null" };
  }

  const trimmed = url.trim();

  if (!trimmed) {
    return { type: "empty", status: "broken", note: "URL là chuỗi rỗng" };
  }

  if (DATA_URI_PATTERN.test(trimmed)) {
    return { type: "data-uri", status: "needs-conversion", note: "Data URI, cần convert sang file" };
  }

  if (SVG_PATTERN.test(trimmed)) {
    return { type: "svg", status: "non-image", note: "File SVG, không phải ảnh raster" };
  }

  if (GS_PATTERN.test(trimmed)) {
    return { type: "gs-path", status: "needs-verify", note: "gs:// path, cần resolve" };
  }

  if (trimmed.startsWith("/")) {
    return { type: "relative-path", status: "needs-verify", note: "Relative path, cần resolve" };
  }

  if (HTTP_PATTERN.test(trimmed)) {
    if (WORDPRESS_PATTERN.test(trimmed)) {
      return { type: "wordpress-url", status: "external", note: "URL từ WordPress cũ, cần download" };
    }
    if (PICSUM_PATTERN.test(trimmed)) {
      return { type: "placeholder", status: "placeholder", note: "Placeholder từ picsum.photos, cần thay thế" };
    }
    // Kiểm tra extension
    const ext = path.extname(new URL(trimmed).pathname).toLowerCase();
    const imageExts = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".bmp", ".tiff"];
    if (imageExts.includes(ext)) {
      return { type: "external-http", status: "external", note: `URL HTTP (${ext}), cần download & upload` };
    }
    return { type: "external-http", status: "unknown", note: `URL HTTP không rõ extension (${ext || "none"})` };
  }

  return { type: "unknown", status: "needs-review", note: "Không xác định được loại URL" };
}

/**
 * Check if a string looks like a valid image URL.
 * @param {string} str
 * @returns {boolean}
 */
function isImageFieldValue(str) {
  if (!str || typeof str !== "string") return false;
  // Skip non-image string patterns (localStorage keys, IDs, etc.)
  if (str.length < 5) return false;
  if (/^[a-zA-Z0-9_-]{5,40}$/.test(str)) return false; // Looks like an ID
  return true;
}

// ─── Deep Scanner ─────────────────────────────────────────────────────

/**
 * Đệ quy tìm tất cả giá trị có thể là URL ảnh trong object.
 * @param {Object} obj
 * @param {string} path - Current path in the document
 * @param {Array} results - Accumulator
 */
function deepScanImages(obj, path, results) {
  if (!obj || typeof obj !== "object") return;

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;

    // Skip non-image fields
    if (SKIP_FIELDS.includes(key)) continue;

    if (Array.isArray(value)) {
      // Check if the array field is a known image gallery
      const isGallery = IMAGE_FIELDS.includes(key);
      if (isGallery) {
        value.forEach((item, idx) => {
          if (typeof item === "string" && isImageFieldValue(item)) {
            const classification = classifyUrl(item);
            results.push({
              collection: null, // Will be filled by caller
              docId: null,
              field: `${currentPath}[${idx}]`,
              url: item,
              ...classification,
            });
          }
        });
      }
      // Recurse into arrays of objects
      value.forEach((item, idx) => {
        if (item && typeof item === "object") {
          deepScanImages(item, `${currentPath}[${idx}]`, results);
        }
      });
      continue;
    }

    if (value && typeof value === "object") {
      deepScanImages(value, currentPath, results);
      continue;
    }

    // String value
    if (typeof value === "string") {
      // Check if this field name suggests it's an image
      const isImageField = IMAGE_FIELDS.includes(key) || key.toLowerCase().includes("image") || key.toLowerCase().includes("photo") || key.toLowerCase().includes("avatar") || key.toLowerCase().includes("logo") || key.toLowerCase().includes("icon") || key.toLowerCase().includes("cover") || key.toLowerCase().includes("banner") || key.toLowerCase().includes("thumbnail") || key.toLowerCase().includes("picture");

      if (isImageField && isImageFieldValue(value)) {
        const classification = classifyUrl(value);
        results.push({
          collection: null,
          docId: null,
          field: currentPath,
          url: value,
          ...classification,
        });
      }
    }
  }
}

// ─── Scanner for a Single Collection ──────────────────────────────────

/**
 * Quét một collection, tìm tất cả URL ảnh.
 * @param {string} collectionName
 * @returns {Promise<Object[]>}
 */
async function scanCollection(collectionName) {
  const results = [];
  console.log(`  📂 Scanning ${collectionName}...`);

  try {
    const snapshot = await db.collection(collectionName).get();
    console.log(`     → ${snapshot.size} documents found`);

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const searchResults = [];

      // Deep scan
      deepScanImages(data, "", searchResults);

      searchResults.forEach((r) => {
        results.push({
          ...r,
          collection: collectionName,
          docId: doc.id,
        });
      });
    }
  } catch (error) {
    console.error(`  ❌ Error scanning ${collectionName}:`, error.message);
    results.push({
      collection: collectionName,
      docId: null,
      field: null,
      url: null,
      type: "error",
      status: "error",
      note: `Scan error: ${error.message}`,
    });
  }

  return results;
}

// ─── Report Generator ─────────────────────────────────────────────────

/**
 * Tạo báo cáo tổng hợp từ kết quả scan.
 * @param {Object[]} allResults
 * @returns {Object}
 */
function generateReport(allResults) {
  const stats = {
    totalUrls: allResults.length,
    byType: {},
    byStatus: {},
    byCollection: {},
    byField: {},
  };

  const brokenImages = [];
  const externalImages = [];
  const placeholders = [];
  const gsPaths = [];
  const wordpressImages = [];

  for (const item of allResults) {
    // Stats by type
    if (!stats.byType[item.type]) stats.byType[item.type] = 0;
    stats.byType[item.type]++;

    // Stats by status
    if (!stats.byStatus[item.status]) stats.byStatus[item.status] = 0;
    stats.byStatus[item.status]++;

    // Stats by collection
    if (!stats.byCollection[item.collection]) stats.byCollection[item.collection] = 0;
    stats.byCollection[item.collection]++;

    // Stats by field
    const fieldBase = item.field ? item.field.split("[")[0].split(".")[0] : "unknown";
    if (!stats.byField[fieldBase]) stats.byField[fieldBase] = 0;
    stats.byField[fieldBase]++;

    // Categorize
    if (item.status === "broken" || item.status === "needs-review") {
      brokenImages.push(item);
    }
    if (item.type === "external-http" || item.type === "wordpress-url") {
      externalImages.push(item);
    }
    if (item.type === "placeholder") {
      placeholders.push(item);
    }
    if (item.type === "gs-path") {
      gsPaths.push(item);
    }
    if (item.type === "wordpress-url") {
      wordpressImages.push(item);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalCollections: COLLECTIONS.length,
      totalUrls: stats.totalUrls,
      brokenUrls: brokenImages.length,
      externalUrls: externalImages.length,
      wordpressUrls: wordpressImages.length,
      placeholderUrls: placeholders.length,
      gsPaths: gsPaths.length,
    },
    stats,
    priorityActions: {
      mustFix: brokenImages.slice(0, 50), // Top 50 broken
      needsUpload: externalImages.slice(0, 50), // Top 50 external
      needsReplacement: placeholders.slice(0, 50), // Top 50 placeholders
      needsResolve: gsPaths.slice(0, 50), // Top 50 gs:// paths
    },
    allUrls: allResults,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("🔍 9Trip — Firestore Image Audit");
  console.log("=".repeat(60));
  console.log();

  console.log(`📋 Collections to scan: ${COLLECTIONS.length}`);
  console.log(`🔎 Image fields: ${IMAGE_FIELDS.join(", ")}`);
  console.log();

  let allResults = [];

  for (const col of COLLECTIONS) {
    const results = await scanCollection(col);
    allResults = allResults.concat(results);
  }

  console.log();
  console.log("=".repeat(60));
  console.log("📊 Generating report...");

  const report = generateReport(allResults);

  // Save report
  const outputPath = path.resolve(__dirname, "..", "..", "audit-report.json");
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf-8");

  console.log();
  console.log("=".repeat(60));
  console.log("✅ AUDIT COMPLETE");
  console.log("=".repeat(60));
  console.log(`   Total URLs found:    ${report.summary.totalUrls}`);
  console.log(`   Broken/Missing:       ${report.summary.brokenUrls}`);
  console.log(`   External (need upload): ${report.summary.externalUrls}`);
  console.log(`   WordPress URLs:       ${report.summary.wordpressUrls}`);
  console.log(`   Placeholders:         ${report.summary.placeholderUrls}`);
  console.log(`   gs:// paths:          ${report.summary.gsPaths}`);
  console.log();
  console.log(`   📄 Report saved to: audit-report.json`);
  console.log();

  // Print stats by collection
  console.log("📈 URLs per collection:");
  for (const [col, count] of Object.entries(report.stats.byCollection).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${col}: ${count}`);
  }

  console.log();
  console.log("📈 URLs per field:");
  for (const [field, count] of Object.entries(report.stats.byField).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${field}: ${count}`);
  }

  console.log();
  console.log("📈 URLs by type:");
  for (const [type, count] of Object.entries(report.stats.byType).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${type}: ${count}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
