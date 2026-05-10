/**
 * Save Booking.com Scraped Tour Data — Firebase Handler Script.
 *
 * Script riêng của skill tour-scraper-from-bkcom, đặt trong scripts/.
 *
 * Nhận file JSON chứa dữ liệu tour đã được FireCrawl scrape + agent xử lý,
 * thực hiện:
 *   1. Validate & check slug trùng
 *   2. Download ảnh → WebP (sharp) → Upload Firebase Storage
 *   3. Tạo document trong collection `tours` (ID = slug)
 *   4. Tạo pricing tiers trong subcollection `tours/{tourId}/tourPricing/`
 *   5. Tạo report file trong /.report/
 *
 * Usage:
 *   node .agents/skills/tour-scraper-from-bkcom/scripts/saveTourDataSkill.mjs --input=path/to/data.json
 *
 * Input JSON format (xem SKILL.md để biết schema chi tiết):
 *   {
 *     "title": "string (required)",
 *     "duration": "string (e.g. '3 ngày 2 đêm')",
 *     "durationDays": "number",
 *     "location": "string",
 *     "address": "string",
 *     "description": "string (HTML)",
 *     "excerpt": "string",
 *     "featuredImage": "string (URL)",
 *     "gallery": ["string (URLs)"],
 *     "highlights": ["string"],
 *     "included": ["string"],
 *     "excluded": ["string"],
 *     "itinerary": [
 *       {
 *         "day": "number",
 *         "title": "string",
 *         "description": "string",
 *         "meals": "string",
 *         "overnight": "string",
 *         "images": ["string (URLs)"]
 *       }
 *     ],
 *     "rating": { "average": "number", "count": "number" },
 *     "categories": ["string"],
 *     "map": { "lat": "number", "lng": "number" },
 *     "pricing": {
 *       "adultPrice": "number",
 *       "childPrice": "number",
 *       "infantPrice": "number",
 *       "currency": "string",
 *       "minPeople": "number",
 *       "maxPeople": "number"
 *     },
 *     "cancellationPolicy": "string",
 *     "childrenPolicy": "string",
 *     "notes": ["string"],
 *     "faq": [{"question": "string", "answer": "string"}],
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
  console.error("❌ Usage: node .agents/skills/tour-scraper-from-bkcom/scripts/saveTourDataSkill.mjs --input=path/to/data.json");
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
 * @param {string} storagePath - e.g. "tours/abc-tour/featured.webp"
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
 * @property {string} tourTitle
 * @property {string|null} tourId
 * @property {string|null} tourSlug
 * @property {number} pricingTierCount
 * @property {number} itineraryCount
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

  const filename = `scrape-tour-${timestampForFile()}.md`;
  const filepath = path.join(reportDir, filename);

  const lines = [];
  lines.push(`# Scrape Report — ${result.tourTitle}`);
  lines.push("");
  lines.push(`- **Thời gian chạy**: ${result.timing.start} → ${result.timing.end}`);
  lines.push(`- **Thời gian xử lý**: ${result.timing.durationMs}ms`);
  lines.push(`- **Nguồn**: booking.com`);
  lines.push(`- **Tour ID**: ${result.tourId || "N/A"}`);
  lines.push(`- **Tour Slug**: ${result.tourSlug || "N/A"}`);
  lines.push("");

  if (result.success) {
    lines.push("## ✅ Kết quả: Thành công");
  } else {
    lines.push("## ❌ Kết quả: Thất bại");
  }
  lines.push("");

  const tourPath = result.tourId ? `tours/${result.tourId}` : "N/A";
  lines.push("### Firestore");
  lines.push(`- **Document**: \`${tourPath}\``);
  lines.push(`- **Itinerary days**: ${result.itineraryCount || 0} days`);
  lines.push(`- **Pricing tiers**: ${result.pricingTierCount || 0} tiers → subcollection tourPricing/`);
  lines.push(`- **Reviews**: ${result.reviewCount || 0} reviews → embedded Map`);
  lines.push("");

  lines.push("### Storage");
  lines.push(`- **Featured image**: ${result.featuredImageUrl || "Không có"}`);
  lines.push(`- **Gallery images**: ${result.galleryCount} files → \`tours/${result.tourId}/gallery/\``);
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
 * Tour document ID = slug (e.g. "phu-quoc-island-tour-3d2n").
 * @param {Object} data
 * @returns {Promise<Object>} { tourData, errors, warnings }
 */
async function validateAndCheck(data) {
  const errors = [];
  const warnings = [];

  if (!data.title || typeof data.title !== "string" || data.title.trim() === "") {
    errors.push("Missing required field: 'title'");
    return { tourData: null, errors, warnings };
  }

  const title = data.title.trim();
  const slug = slugify(title);

  if (!slug) {
    errors.push(`Could not generate slug from title: "${title}"`);
    return { tourData: null, errors, warnings };
  }

  // Tour document ID = slug
  const tourId = slug;

  // Check for existing document with this ID
  const existingSnap = await db.collection("tours").doc(tourId).get();
  if (existingSnap.exists) {
    const existing = existingSnap.data();
    errors.push(`Tour with slug "${slug}" already exists: tours/${tourId} ("${existing.title || "?"}")`);
    return { tourData: null, errors, warnings };
  }

  // Build duration object
  const durationObj = {};
  if (data.duration) durationObj.display = data.duration;
  if (data.durationDays) durationObj.days = data.durationDays;

  // Build ratings
  let ratingAverage = data.ratingAverage || 0;
  let ratingCount = data.ratingCount || 0;
  if (data.rating) {
    ratingAverage = data.rating.average || ratingAverage;
    ratingCount = data.rating.count || ratingCount;
  }

  /** @type {Object} */
  const tourData = {
    id: tourId,
    title,
    slug,
    duration: Object.keys(durationObj).length > 0 ? durationObj : null,
    location: data.location || "",
    address: data.address || "",
    description: data.description || "",
    excerpt: data.excerpt || (data.description ? data.description.replace(/<[^>]*>/g, "").slice(0, 200) : ""),
    featuredImage: "",
    gallery: [],
    highlights: Array.isArray(data.highlights) ? data.highlights : [],
    included: Array.isArray(data.included) ? data.included : [],
    excluded: Array.isArray(data.excluded) ? data.excluded : [],
    itinerary: Array.isArray(data.itinerary) ? data.itinerary.map((day, idx) => ({
      day: day.day || idx + 1,
      title: day.title || `Day ${day.day || idx + 1}`,
      description: day.description || "",
      meals: day.meals || "",
      overnight: day.overnight || "",
      images: Array.isArray(day.images) ? day.images : [],
    })) : [],
    ratingAverage,
    ratingCount,
    categories: Array.isArray(data.categories) ? data.categories : [],
    map: data.map || null,
    isFeatured: false,
    tags: Array.isArray(data.tags) ? data.tags : [],
    cancellationPolicy: data.cancellationPolicy || "",
    childrenPolicy: data.childrenPolicy || "",
    notes: Array.isArray(data.notes) ? data.notes : [],
    faq: Array.isArray(data.faq) ? data.faq : [],
    phone: data.phone || "",
    email: data.email || "",
    website: data.website || "",
    pricing: data.pricing || {
      adultPrice: 0,
      childPrice: 0,
      infantPrice: 0,
      currency: "VND",
      minPeople: 1,
      maxPeople: 10,
    },
    reviews: {},
    metaTitle: data.metaTitle || title,
    metaDescription: data.metaDescription || data.excerpt || "",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  return { tourData, errors, warnings };
}

/**
 * Process images: download → WebP → upload to Storage.
 * Handles featured image fallback: if no featuredImage, use gallery[0].
 * @param {string} tourId
 * @param {Object} images - { featuredImage: string, gallery: string[] }
 * @returns {Promise<{ featuredUrl: string|null, galleryUrls: string[], errors: string[], warnings: string[] }>}
 */
async function processImages(tourId, images) {
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
      const storagePath = `tours/${tourId}/featured.webp`;
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
      const storagePath = `tours/${tourId}/gallery/${padIdx}.webp`;
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
 * Build and save pricing tiers to subcollection tours/{tourId}/tourPricing/.
 * If no explicit pricing tiers in data, create a default one from pricing object.
 * @param {string} tourId
 * @param {Object} data - full input data
 * @returns {Promise<{ count: number, errors: string[], warnings: string[] }>}
 */
async function savePricingTiers(tourId, data) {
  const errors = [];
  const warnings = [];
  let count = 0;

  // Check if pricing tiers already provided in data
  let tiers = Array.isArray(data.pricingTiers) ? data.pricingTiers : [];

  // If no explicit tiers but pricing object exists with adultPrice > 0, create default
  if (tiers.length === 0 && data.pricing && data.pricing.adultPrice > 0) {
    const p = data.pricing;
    tiers = [{
      name: "Tour ghép",
      description: "Đi chung đoàn, tiết kiệm chi phí",
      adultPrice: p.adultPrice || 0,
      childPrice: p.childPrice || 0,
      infantPrice: p.infantPrice || 0,
      currency: p.currency || "VND",
      minPeople: p.minPeople || 1,
      maxPeople: p.maxPeople || 10,
      included: Array.isArray(data.included) ? data.included : [],
      isActive: true,
      sortOrder: 1,
    }];
    warnings.push("No explicit pricingTiers — created default tier from pricing object");
  }

  // Save each pricing tier
  const pricingCollection = db.collection("tours").doc(tourId).collection("tourPricing");

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (!tier.name || !tier.adultPrice) {
      warnings.push(`Pricing tier at index ${i} missing name or adultPrice — skipping`);
      continue;
    }

    const tierId = `tier_${slugify(tier.name)}`;
    const tierData = {
      id: tierId,
      name: tier.name,
      description: tier.description || "",
      adultPrice: tier.adultPrice,
      childPrice: tier.childPrice || 0,
      infantPrice: tier.infantPrice || 0,
      currency: tier.currency || "VND",
      minPeople: tier.minPeople || 1,
      maxPeople: tier.maxPeople || 10,
      included: Array.isArray(tier.included) ? tier.included : [],
      isActive: tier.isActive !== undefined ? tier.isActive : true,
      sortOrder: tier.sortOrder || i + 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
      await pricingCollection.doc(tierId).set(tierData);
      console.log(`   ✅ Pricing tier created: tours/${tourId}/tourPricing/${tierId} ("${tier.name}")`);
      count++;
    } catch (err) {
      errors.push(`Pricing tier "${tier.name}" failed: ${err.message}`);
    }
  }

  return { count, errors, warnings };
}

/**
 * Save tour document to Firestore.
 * @param {string} tourId
 * @param {Object} tourData
 * @param {string|null} featuredUrl
 * @param {string[]} galleryUrls
 * @returns {Promise<void>}
 */
async function saveTourDoc(tourId, tourData, featuredUrl, galleryUrls) {
  tourData.featuredImage = featuredUrl || "";
  tourData.gallery = galleryUrls;

  await db.collection("tours").doc(tourId).set(tourData);
  console.log(`   ✅ Tour document created: tours/${tourId}`);
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  const startISO = nowISO();

  console.log("=".repeat(60));
  console.log("  🏕️  Save Booking.com Scraped Tour Data — Firebase Handler");
  console.log("  📁 Skill: tour-scraper-from-bkcom");
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
      tourTitle: "N/A",
      tourId: null,
      tourSlug: null,
      pricingTierCount: 0,
      itineraryCount: 0,
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

  // Validate & check slug
  console.log("📋 Step 1/5: Validating data & checking for duplicates...");
  const { tourData, errors: validationErrors, warnings: validationWarnings } = await validateAndCheck(inputData);

  if (!tourData) {
    console.error("❌ Validation failed:");
    validationErrors.forEach((e) => console.error(`   - ${e}`));
    generateReport({
      success: false,
      tourTitle: inputData.title || "N/A",
      tourId: null,
      tourSlug: null,
      pricingTierCount: 0,
      itineraryCount: 0,
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

  const tourId = tourData.id;
  const tourTitle = tourData.title;
  const tourSlug = tourData.slug;
  console.log(`   ✅ Title: "${tourTitle}"`);
  console.log(`   ✅ ID/Slug: "${tourId}"`);
  console.log(`   ✅ Itinerary days: ${tourData.itinerary.length}`);
  console.log("");

  // Process images
  console.log("🖼️  Step 2/5: Processing images (download → WebP → upload)...");
  const imgInput = {
    featuredImage: inputData.featuredImage || "",
    gallery: inputData.gallery || [],
  };
  const { featuredUrl, galleryUrls, errors: imgErrors, warnings: imgWarnings } = await processImages(tourId, imgInput);
  console.log(`   ✅ Featured: ${featuredUrl ? "Uploaded" : "None"}`);
  console.log(`   ✅ Gallery: ${galleryUrls.length} images`);
  console.log("");

  // Save tour document (with itinerary, reviews, faq embedded)
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
  tourData.reviews = reviewsMap;
  const reviewCount = Object.keys(reviewsMap).length;
  if (reviewCount > 0) {
    console.log(`   ✅ Reviews: ${reviewCount} reviews processed (max 10)`);
  }

  await saveTourDoc(tourId, tourData, featuredUrl, galleryUrls);
  console.log("");

  // Save pricing tiers to subcollection
  console.log("💰 Step 4/5: Saving pricing tiers...");
  const { count: tierCount, errors: tierErrors, warnings: tierWarnings } = await savePricingTiers(tourId, inputData);
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
    tourTitle,
    tourId,
    tourSlug,
    pricingTierCount: tierCount,
    itineraryCount: tourData.itinerary.length,
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
  console.log(`  🏕️  Tour:    tours/${tourId}`);
  console.log(`  🗓️  Itinerary: ${tourData.itinerary.length} days`);
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
    tourTitle: "N/A",
    tourId: null,
    tourSlug: null,
    pricingTierCount: 0,
    itineraryCount: 0,
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
