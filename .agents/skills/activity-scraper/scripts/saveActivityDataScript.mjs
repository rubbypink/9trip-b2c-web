/**
 * Save Web Scraped Activity Data — Firebase Handler Script.
 *
 * Script riêng của skill activity-scraper, đặt trong scripts/.
 *
 * Nhận file JSON chứa dữ liệu activity đã được FireCrawl scrape + agent xử lý,
 * thực hiện:
 *   1. Validate & check slug trùng
 *   2. Download ảnh → WebP (sharp) → Upload Firebase Storage
 *   3. Tạo document trong collection `activities` (ID = slug)
 *   4. Kiểm tra pricing tiers
 *   5. Tạo report file trong /.report/
 *
 * Usage:
 *   node .agents/skills/activity-scraper/scripts/saveActivityDataScript.mjs --input=path/to/data.json
 *
 * Input JSON format (xem SKILL.md để biết schema chi tiết):
 *   {
 *     "title": "string (required)",
 *     "duration": "string",
 *     "durationDetail": "string",
 *     "location": "string",
 *     "locationDetail": "string",
 *     "description": "string (HTML)",
 *     "excerpt": "string",
 *     "featuredImage": "string (URL)",
 *     "gallery": ["string (URLs)"],
 *     "openingHours": "string",
 *     "highlights": ["string"],
 *     "included": ["string"],
 *     "excluded": ["string"],
 *     "categories": ["string"],
 *     "capacity": "number",
 *     "recommendation": "string",
 *     "childrenPolicy": "string",
 *     "cancellationPolicy": "string",
 *     "notes": ["string"],
 *     "purchaseGuide": ["string"],
 *     "rating": { "average": "number", "count": "number" },
 *     "map": { "lat": "number", "lng": "number" },
 *     "faq": [{"question": "string", "answer": "string"}],
 *     "pricing": {
 *       "price_standard": {
 *         "id": "price_standard",
 *         "name": "Vé tiêu chuẩn",
 *         "description": "string",
 *         "basePrice": "number",
 *         "childPrice": "number",
 *         "currency": "string",
 *         "discountPercent": "number"
 *       }
 *     },
 *     "phone": "string",
 *     "email": "string",
 *     "website": "string",
 *     "tags": ["string"],
 *     "reviews": [
 *       {
 *         "reviewerName": "string",
 *         "reviewerAvatar": "string",
 *         "rating": "number",
 *         "text": "string",
 *         "date": "string",
 *         "country": "string"
 *       }
 *     ],
 *     "_firecrawlCredits": "number"
 *   }
 */

import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import { slugify, nowISO } from '../../../lib/scrape-helpers.mjs';
import { downloadFile } from '../../../lib/image-helpers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Init Firebase Admin SDK ──────────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, "../../../..");
const serviceAccount = path.resolve(PROJECT_ROOT, "tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json");

if (!fs.existsSync(serviceAccount)) {
  console.error("❌ Không tìm thấy service account JSON tại:", serviceAccount);
  process.exit(1);
}

if (!admin.apps.length) {
  const serviceAccountObj = JSON.parse(fs.readFileSync(serviceAccount, 'utf-8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountObj),
    storageBucket: "tripphuquoc-db-fs.firebasestorage.app",
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();

// ─── CLI Args ─────────────────────────────────────────────────────────

const args = {};
process.argv.slice(2).forEach((arg) => {
  const match = arg.match(/^--(\w+)=(.+)$/);
  if (match) args[match[1]] = match[2];
});

const INPUT_FILE = args.input;

if (!INPUT_FILE) {
  console.error("❌ Usage: node .agents/skills/activity-scraper-from-bkcom/scripts/saveActivityDataScript.mjs --input=path/to/data.json");
  process.exit(1);
}

if (!fs.existsSync(INPUT_FILE)) {
  console.error(`❌ File not found: ${INPUT_FILE}`);
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Format a timestamp for filename use.
 * @returns {string} e.g. "20260501-143022"
 */
function timestampForFile() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/**
 * Convert an image buffer to WebP using sharp.
 * @param {Buffer} buffer
 * @param {number} [maxWidth=1920]
 * @returns {Promise<Buffer>}
 */
async function toWebP(buffer, maxWidth = 1920) {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    throw new Error("sharp is not installed. Run: npm install sharp");
  }

  const image = sharp(buffer);
  const metadata = await image.metadata();

  if (metadata.width > maxWidth) {
    image.resize({ width: maxWidth, withoutEnlargement: true });
  }

  return image.webp({ quality: 85, effort: 4 }).toBuffer();
}

/**
 * Upload a buffer to Firebase Storage and return the public download URL.
 * @param {Buffer} buffer
 * @param {string} storagePath - e.g. "activities/abc-activity/featured.webp"
 * @returns {Promise<string>} Download URL
 */
async function uploadToStorage(buffer, storagePath) {
  const file = bucket.file(storagePath);
  await file.save(buffer, {
    metadata: {
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
    },
  });
  await file.makePublic();
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  return publicUrl;
}

// ─── Report Builder ───────────────────────────────────────────────────

/**
 * @typedef {Object} ProcessingResult
 * @property {boolean} success
 * @property {string} activityTitle
 * @property {string|null} activityId
 * @property {string|null} activitySlug
 * @property {number} pricingTierCount
 * @property {string|null} featuredImageUrl
 * @property {number} galleryCount
 * @property {number} reviewCount
 * @property {number} firecrawlCredits
 * @property {string[]} errors
 * @property {string[]} warnings
 * @property {Object} timing - { start: string, end: string, durationMs: number }
 */

/**
 * Generate a report markdown file in /.report/
 * @param {ProcessingResult} result
 */
function generateReport(result) {
  const reportDir = path.resolve(PROJECT_ROOT, ".report");
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const filename = `scrape-activity-${timestampForFile()}.md`;
  const filepath = path.join(reportDir, filename);

  const lines = [];
  lines.push(`# Scrape Report — ${result.activityTitle}`);
  lines.push("");
  lines.push(`- **Thời gian chạy**: ${result.timing.start} → ${result.timing.end}`);
  lines.push(`- **Thời gian xử lý**: ${result.timing.durationMs}ms`);
  lines.push(`- **Nguồn**: booking.com`);
  lines.push(`- **Activity ID**: ${result.activityId || "N/A"}`);
  lines.push(`- **Activity Slug**: ${result.activitySlug || "N/A"}`);
  lines.push("");

  if (result.success) {
    lines.push("## ✅ Kết quả: Thành công");
  } else {
    lines.push("## ❌ Kết quả: Thất bại");
  }
  lines.push("");

  const activityPath = result.activityId ? `activities/${result.activityId}` : "N/A";
  lines.push("### Firestore");
  lines.push(`- **Document**: \`${activityPath}\``);
  lines.push(`- **Pricing tiers**: ${result.pricingTierCount || 0} tiers`);
  lines.push(`- **Reviews**: ${result.reviewCount || 0} reviews → embedded Map`);
  lines.push("");

  lines.push("### Storage");
  lines.push(`- **Featured image**: ${result.featuredImageUrl || "Không có"}`);
  lines.push(`- **Gallery images**: ${result.galleryCount} files → \`activities/${result.activityId}/gallery/\``);
  lines.push("");

  if (result.errors.length > 0) {
    lines.push("### ❌ Lỗi");
    result.errors.forEach((err) => lines.push(`- ${err}`));
    lines.push("");
  }

  if (result.warnings.length > 0) {
    lines.push("### ⚠️ Cảnh báo");
    result.warnings.forEach((w) => lines.push(`- ${w}`));
    lines.push("");
  }

  lines.push("### FireCrawl");
  lines.push(`- **Credits used**: ${result.firecrawlCredits || 0}`);
  lines.push("");

  lines.push("---");
  lines.push(`*Report generated at ${result.timing.end}*`);

  const content = lines.join("\n");
  fs.writeFileSync(filepath, content, "utf-8");
  console.log(`📄 Report saved: ${filepath}`);
  return filepath;
}

// ─── Core Logic ───────────────────────────────────────────────────────

/**
 * Validate input data and check for duplicate slug.
 * Activity document ID = slug (e.g. "symphony-of-the-sea-show").
 * @param {Object} data
 * @returns {Promise<Object>} { activityData, errors, warnings }
 */
async function validateAndCheck(data) {
  const errors = [];
  const warnings = [];

  if (!data.title || typeof data.title !== "string" || data.title.trim() === "") {
    errors.push("Missing required field: 'title'");
    return { activityData: null, errors, warnings };
  }

  const title = data.title.trim();
  const slug = slugify(title);

  if (!slug) {
    errors.push(`Could not generate slug from title: "${title}"`);
    return { activityData: null, errors, warnings };
  }

  // Activity document ID = slug
  const activityId = slug;

  // Check for existing document with this ID
  const existingSnap = await db.collection("activities").doc(activityId).get();
  if (existingSnap.exists) {
    const existing = existingSnap.data();
    errors.push(`Activity with slug "${slug}" already exists: activities/${activityId} ("${existing.title || "?"}")`);
    return { activityData: null, errors, warnings };
  }

  // Build ratings
  let ratingAverage = data.ratingAverage || 0;
  let ratingCount = data.ratingCount || 0;
  if (data.rating) {
    ratingAverage = data.rating.average || ratingAverage;
    ratingCount = data.rating.count || ratingCount;
  }

  /** @type {Object} */
  const activityData = {
    id: activityId,
    title,
    slug,
    duration: data.duration || "",
    durationDetail: data.durationDetail || "",
    location: data.location || "",
    locationDetail: data.locationDetail || "",
    description: data.description || "",
    excerpt: data.excerpt || (data.description ? data.description.replace(/<[^>]*>/g, "").slice(0, 200) : ""),
    featuredImage: "",
    gallery: [],
    openingHours: data.openingHours || "",
    highlights: Array.isArray(data.highlights) ? data.highlights : [],
    included: Array.isArray(data.included) ? data.included : [],
    excluded: Array.isArray(data.excluded) ? data.excluded : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    capacity: data.capacity || null,
    recommendation: data.recommendation || "",
    childrenPolicy: data.childrenPolicy || "",
    cancellationPolicy: data.cancellationPolicy || "",
    notes: Array.isArray(data.notes) ? data.notes : [],
    purchaseGuide: Array.isArray(data.purchaseGuide) ? data.purchaseGuide : [],
    faq: Array.isArray(data.faq) ? data.faq : [],
    ratingAverage,
    ratingCount,
    map: data.map || null,
    isFeatured: false,
    status: "active",
    tags: Array.isArray(data.tags) ? data.tags : [],
    phone: data.phone || "",
    email: data.email || "",
    website: data.website || "",
    pricing: data.pricing && typeof data.pricing === "object" && Object.keys(data.pricing).length > 0
      ? data.pricing
      : { price_default: { id: "price_default", name: "Vé tiêu chuẩn", description: "", basePrice: 0, childPrice: 0, currency: "VND", discountPercent: 0 } },
    reviews: {},
    metaTitle: data.metaTitle || title,
    metaDescription: data.metaDescription || data.excerpt || "",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  return { activityData, errors, warnings };
}

/**
 * Process images: download → WebP → upload to Storage.
 * Handles featured image fallback: if no featuredImage, use gallery[0].
 * @param {string} activityId
 * @param {Object} images - { featuredImage: string, gallery: string[] }
 * @returns {Promise<{ featuredUrl: string|null, galleryUrls: string[], errors: string[], warnings: string[] }>}
 */
async function processImages(activityId, images) {
  const errors = [];
  const warnings = [];
  let featuredUrl = null;
  const galleryUrls = [];

  const featuredSrc = images.featuredImage || "";
  const gallerySrcs = Array.isArray(images.gallery) ? images.gallery : [];

  let effectiveFeatured = featuredSrc;
  if (!effectiveFeatured && gallerySrcs.length > 0) {
    effectiveFeatured = gallerySrcs[0];
    warnings.push("No featuredImage provided — using first gallery image as featured image");
  }

  if (effectiveFeatured) {
    try {
      console.log(`   📥 Downloading featured image: ${effectiveFeatured.slice(0, 80)}...`);
      const rawBuffer = await downloadFile(effectiveFeatured);
      const webpBuffer = await toWebP(rawBuffer);
      const storagePath = `activities/${activityId}/featured.webp`;
      featuredUrl = await uploadToStorage(webpBuffer, storagePath);
      console.log(`   ✅ Featured image uploaded: ${storagePath}`);
    } catch (err) {
      errors.push(`Featured image failed: ${err.message}`);
    }
  } else {
    warnings.push("No featured image available (booking.com had none)");
  }

  for (let i = 0; i < gallerySrcs.length; i++) {
    const src = gallerySrcs[i];
    if (src === effectiveFeatured && featuredUrl) {
      galleryUrls.push(featuredUrl);
      continue;
    }

    try {
      console.log(`   📥 Downloading gallery image ${i + 1}/${gallerySrcs.length}: ${src.slice(0, 80)}...`);
      const rawBuffer = await downloadFile(src);
      const webpBuffer = await toWebP(rawBuffer);
      const padIdx = String(i + 1).padStart(2, "0");
      const storagePath = `activities/${activityId}/gallery/${padIdx}.webp`;
      const url = await uploadToStorage(webpBuffer, storagePath);
      galleryUrls.push(url);
      console.log(`   ✅ Gallery image ${padIdx} uploaded: ${storagePath}`);
    } catch (err) {
      errors.push(`Gallery image ${i + 1} failed: ${err.message}`);
      warnings.push(`Skipped gallery image ${i + 1} due to error`);
    }
  }

  return { featuredUrl, galleryUrls, errors, warnings };
}

/**
 * Save activity document to Firestore.
 * @param {string} activityId
 * @param {Object} activityData
 * @param {string|null} featuredUrl
 * @param {string[]} galleryUrls
 * @returns {Promise<void>}
 */
async function saveActivityDoc(activityId, activityData, featuredUrl, galleryUrls) {
  activityData.featuredImage = featuredUrl || "";
  activityData.gallery = galleryUrls;

  await db.collection("activities").doc(activityId).set(activityData);
  console.log(`   ✅ Activity document created: activities/${activityId}`);
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  const startISO = nowISO();

  console.log("=".repeat(60));
  console.log("  🎭  Save Booking.com Scraped Activity Data — Firebase Handler");
  console.log("  📁 Skill: activity-scraper-from-bkcom");
  console.log("=".repeat(60));
  console.log(`   Input file: ${INPUT_FILE}`);
  console.log("");

  // Read input
  /** @type {Object} */
  let inputData;
  try {
    const raw = fs.readFileSync(INPUT_FILE, "utf-8");
    inputData = JSON.parse(raw);
    console.log(`   📖 Read ${raw.length} bytes from input file`);
  } catch (err) {
    console.error(`❌ Failed to read/parse input file: ${err.message}`);
    generateReport({
      success: false,
      activityTitle: "N/A",
      activityId: null,
      activitySlug: null,
      pricingTierCount: 0,
      featuredImageUrl: null,
      galleryCount: 0,
      reviewCount: 0,
      firecrawlCredits: 0,
      errors: [`Input file error: ${err.message}`],
      warnings: [],
      timing: { start: startISO, end: nowISO(), durationMs: Date.now() - startTime },
    });
    process.exit(1);
  }

  // Sanitize contact info & company names
  console.log("🧹 Sanitizing contact info & company names...");
  try {
    const { sanitizeScrapedData } = await import('../../../lib/sanitize-data.mjs');
    const sourceUrl = inputData._sourceUrl || '';
    const sourceDomain = (() => {
      try { return new URL(sourceUrl).hostname.replace(/^www\./, '').split('.')[0]; } catch { return ''; }
    })();
    const sanitized = await sanitizeScrapedData(inputData, { type: 'activity', knownNames: [sourceDomain].filter(Boolean) });
    Object.assign(inputData, sanitized.data);
    if (sanitized.changes.length > 0) console.log(`   ✅ ${sanitized.changes.length} items sanitized`);
  } catch (err) {
    console.log(`   ⚠️ Sanitize warning: ${err.message}`);
  }

  // Validate & check slug
  console.log("📋 Step 1/5: Validating data & checking for duplicates...");
  const { activityData, errors: validationErrors, warnings: validationWarnings } = await validateAndCheck(inputData);

  if (!activityData) {
    console.error("❌ Validation failed:");
    validationErrors.forEach((e) => console.error(`   - ${e}`));
    generateReport({
      success: false,
      activityTitle: inputData.title || "N/A",
      activityId: null,
      activitySlug: null,
      pricingTierCount: 0,
      featuredImageUrl: null,
      galleryCount: 0,
      reviewCount: 0,
      firecrawlCredits: inputData._firecrawlCredits || 0,
      errors: validationErrors,
      warnings: validationWarnings,
      timing: { start: startISO, end: nowISO(), durationMs: Date.now() - startTime },
    });
    process.exit(1);
  }

  const activityId = activityData.id;
  const activityTitle = activityData.title;
  const activitySlug = activityData.slug;
  console.log(`   ✅ Title: "${activityTitle}"`);
  console.log(`   ✅ ID/Slug: "${activityId}"`);
  console.log(`   ✅ Duration: "${activityData.duration}"`);
  console.log(`   ✅ Location: "${activityData.location}"`);
  console.log("");

  // Process images
  console.log("🖼️  Step 2/5: Processing images (download → WebP → upload)...");
  const imgInput = {
    featuredImage: inputData.featuredImage || "",
    gallery: inputData.gallery || [],
  };
  const { featuredUrl, galleryUrls, errors: imgErrors, warnings: imgWarnings } = await processImages(activityId, imgInput);
  console.log(`   ✅ Featured: ${featuredUrl ? "Uploaded" : "None"}`);
  console.log(`   ✅ Gallery: ${galleryUrls.length} images`);
  console.log("");

  // Save activity document
  console.log("💾 Step 3/5: Saving to Firestore...");
  // Process reviews (max 10, embedded Map)
  const rawReviews = Array.isArray(inputData.reviews) ? inputData.reviews : [];
  const reviewsMap = {};
  for (let i = 0; i < Math.min(rawReviews.length, 10); i++) {
    const r = rawReviews[i];
    const reviewId = `review_${slugify(r.reviewerName || r.text || `review_${i}`)}`;
    reviewsMap[reviewId] = {
      id: reviewId,
      reviewerName: r.reviewerName || "",
      reviewerAvatar: r.reviewerAvatar || "",
      rating: r.rating || 0,
      text: r.text || "",
      date: r.date || "",
      country: r.country || "",
      sortOrder: i + 1,
    };
  }
  activityData.reviews = reviewsMap;
  const reviewCount = Object.keys(reviewsMap).length;
  if (reviewCount > 0) {
    console.log(`   ✅ Reviews: ${reviewCount} reviews processed (max 10)`);
  }

  await saveActivityDoc(activityId, activityData, featuredUrl, galleryUrls);
  console.log("");

  // Save pricing tiers to subcollection
  console.log("💰 Step 4/5: Saving pricing tiers...");
  // Pricing tiers are now embedded in the activity document
  // We just count them for the report
  const tierCount = inputData.pricing?.tiers?.length || 0;
  const tierErrors = [];
  const tierWarnings = [];
  console.log(`   ✅ ${tierCount} pricing tier(s) created`);
  console.log("");

  // Collect all errors & warnings
  const allErrors = [...validationErrors, ...imgErrors, ...tierErrors];
  const allWarnings = [...validationWarnings, ...imgWarnings, ...tierWarnings];

  // FireCrawl credits
  const firecrawlCredits = inputData._firecrawlCredits || 0;

  // Generate report
  console.log("📄 Step 5/5: Generating report...");
  const endTime = Date.now();
  const endISO = nowISO();

  const result = {
    success: allErrors.length === 0,
    activityTitle,
    activityId,
    activitySlug,
    pricingTierCount: tierCount,
    reviewCount,
    firecrawlCredits,
    featuredImageUrl: featuredUrl,
    galleryCount: galleryUrls.length,
    errors: allErrors,
    warnings: allWarnings,
    timing: { start: startISO, end: endISO, durationMs: endTime - startTime },
  };

  const reportPath = generateReport(result);
  console.log("");

  // Summary
  console.log("=".repeat(60));
  if (result.success) {
    console.log("  ✅ COMPLETE — All steps finished successfully");
  } else {
    console.log("  ⚠️  COMPLETE — Finished with errors");
  }
  console.log(`  📄 Report: ${reportPath}`);
  console.log(`  🎭  Activity: activities/${activityId}`);
  console.log(`  🖼️  Gallery: ${galleryUrls.length} images`);
  console.log(`  💰 Pricing tiers: ${tierCount}`);
  console.log(`  💬 Reviews:  ${reviewCount} reviews`);
  console.log(`  🔥 FireCrawl credits: ${firecrawlCredits}`);
  console.log(`  ⏱  Time:   ${result.timing.durationMs}ms`);
  console.log("=".repeat(60));

  if (allErrors.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Unhandled error:", err.message);
  generateReport({
    success: false,
    activityTitle: "N/A",
    activityId: null,
    activitySlug: null,
    pricingTierCount: 0,
    featuredImageUrl: null,
    galleryCount: 0,
    reviewCount: 0,
    firecrawlCredits: 0,
    errors: [`Unhandled error: ${err.message}`],
    warnings: [],
    timing: { start: nowISO(), end: nowISO(), durationMs: 0 },
  });
  process.exit(1);
});
