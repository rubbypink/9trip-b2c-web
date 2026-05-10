/**
 * Save Booking.com Scraped Data — Firebase Handler Script.
 *
 * Script riêng của skill booking-scraper, đặt trong .agents/skills/booking-scraper/scripts/
 * để tránh xung đột khi cập nhật script chung trong src/scripts/.
 *
 * Nhận file JSON chứa dữ liệu hotel đã được FireCrawl scrape + agent xử lý,
 * thực hiện:
 *   1. Validate & check slug trùng
 *   2. Download ảnh → WebP (sharp) → Upload Firebase Storage
 *   3. Tạo document trong collection `hotels` (ID = slug)
 *   4. Tạo rooms field dạng embedded Map trong hotel document (key = {slug})
 *   5. Tạo report file trong /.report/
 *
 * Usage:
 *   node .agents/skills/booking-scraper/scripts/saveBookingData.mjs --input=path/to/data.json
 *
 * Input JSON format (xem SKILL.md để biết schema chi tiết):
 *   {
 *     "name": "string (required)",
 *     "starRating": "number",
 *     "address": { "street": "string", "city": "string", "country": "string" },
 *     "description": "string (HTML)",
 *     "excerpt": "string",
 *     "featuredImage": "string (URL)",
 *     "gallery": ["string (URLs)"],
 *     "amenities": ["string"],
 *     "highlights": ["string"],
 *     "rating": { "average": "number", "count": "number" },
 *     "policies": { "checkIn": "string", "checkOut": "string", ... },
 *     "map": { "lat": "number", "lng": "number" },
 *     "phone": "string", "email": "string", "website": "string",
 *     "tags": ["string"],
 *     "rooms": [
 *       {
 *         "name": "string",
 *         "description": "string",
 *         "bedType": "string",
 *         "maxAdults": "number",
 *         "maxChildren": "number",
 *         "maxGuests": "number",
 *         "roomSize": "number",
 *         "amenities": ["string"],
 *         "included": ["string"],
 *         "totalRooms": "number"
 *       }
 *     ]
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
// Script location: .agents/skills/booking-scraper/scripts/saveBookingData.mjs
// Need to go up 4 levels to reach project root

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
  console.error("❌ Usage: node .agents/skills/booking-scraper/scripts/saveBookingData.mjs --input=path/to/data.json");
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
 * @param {string} storagePath - e.g. "hotels/rosie-hillside/featured.webp"
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
 * @property {string} hotelName
 * @property {string|null} hotelId
 * @property {string|null} hotelSlug
 * @property {number} roomCount
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

  const filename = `scrape-booking-${timestampForFile()}.md`;
  const filepath = path.join(reportDir, filename);

  const lines = [];
  lines.push(`# Scrape Report — ${result.hotelName}`);
  lines.push("");
  lines.push(`- **Thời gian chạy**: ${result.timing.start} → ${result.timing.end}`);
  lines.push(`- **Thời gian xử lý**: ${result.timing.durationMs}ms`);
  lines.push(`- **Nguồn**: booking.com`);
  lines.push(`- **Hotel ID**: ${result.hotelId || "N/A"}`);
  lines.push(`- **Hotel Slug**: ${result.hotelSlug || "N/A"}`);
  lines.push("");

  if (result.success) {
    lines.push("## ✅ Kết quả: Thành công");
  } else {
    lines.push("## ❌ Kết quả: Thất bại");
  }
  lines.push("");

  const hotelPath = result.hotelId ? `hotels/${result.hotelId}` : "N/A";
  lines.push("### Firestore");
  lines.push(`- **Document**: \`${hotelPath}\``);
  lines.push(`- **Rooms**: ${result.roomCount} rooms → embedded Map field`);
  lines.push(`- **Reviews**: ${result.reviewCount || 0} reviews → embedded Map field`);
  lines.push("");

  lines.push("### Storage");
  lines.push(`- **Featured image**: ${result.featuredImageUrl || "Không có"}`);
  lines.push(`- **Gallery images**: ${result.galleryCount} files → \`hotels/${result.hotelId}/gallery/\``);
  lines.push(`- **Room images**: ${result.roomImageCount || 0} files (max 5/room) → \`hotels/${result.hotelId}/rooms/{roomId}/\``);
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
 * Hotel document ID = slug (e.g. "rosie-hillside-seaview-phu-quoc-apartment").
 * @param {Object} data
 * @returns {Promise<Object>} { hotelData, rooms, errors, warnings }
 */
async function validateAndCheck(data) {
  const errors = [];
  const warnings = [];

  if (!data.name || typeof data.name !== "string" || data.name.trim() === "") {
    errors.push("Missing required field: 'name'");
    return { hotelData: null, rooms: [], errors, warnings };
  }

  const name = data.name.trim();
  const slug = slugify(name);

  if (!slug) {
    errors.push(`Could not generate slug from name: "${name}"`);
    return { hotelData: null, rooms: [], errors, warnings };
  }

  // Hotel document ID = slug
  const hotelId = slug;

  // Check for existing document with this ID
  const existingSnap = await db.collection("hotels").doc(hotelId).get();
  if (existingSnap.exists) {
    const existing = existingSnap.data();
    errors.push(`Hotel with slug "${slug}" already exists: hotels/${hotelId} ("${existing.name || "?"}")`);
    return { hotelData: null, rooms: [], errors, warnings };
  }

  /** @type {Object} */
  const hotelData = {
    id: hotelId,
    name,
    slug,
    starRating: data.starRating || null,
    address: data.address || null,
    pricing: data.pricing || null,
    description: data.description || "",
    excerpt: data.excerpt || (data.description ? data.description.replace(/<[^>]*>/g, "").slice(0, 200) : ""),
    featuredImage: "",
    gallery: [],
    amenities: Array.isArray(data.amenities) ? data.amenities : [],
    highlights: Array.isArray(data.highlights) ? data.highlights : [],
    rating: data.rating || { average: 0, count: 0 },
    policies: data.policies || {},
    map: data.map || null,
    isFeatured: false,
    tags: Array.isArray(data.tags) ? data.tags : [],
    phone: data.phone || "",
    email: data.email || "",
    website: data.website || "",
    rooms: {},
    reviews: {},  // embedded Map (key = review ID), max 25
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const rooms = Array.isArray(data.rooms) ? data.rooms : [];

  return { hotelData, rooms, errors, warnings };
}

/**
 * Process images: download → WebP → upload to Storage.
 * Handles featured image fallback: if no featuredImage, use gallery[0].
 * @param {string} hotelId
 * @param {Object} images - { featuredImage: string, gallery: string[] }
 * @returns {Promise<{ featuredUrl: string|null, galleryUrls: string[], errors: string[], warnings: string[] }>}
 */
async function processImages(hotelId, images) {
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
      const storagePath = `hotels/${hotelId}/featured.webp`;
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
      const storagePath = `hotels/${hotelId}/gallery/${padIdx}.webp`;
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
 * Build rooms embedded Map from room array.
 * Room key = {slug} (e.g. "studio-with-sea-view").
 * @param {Array} rooms - Array of room objects from input data
 * @returns {{ roomsMap: Object, count: number, errors: string[], warnings: string[] }}
 */
function buildRoomsMap(rooms) {
  const errors = [];
  const warnings = [];
  /** @type {Object} */
  const roomsMap = {};
  let count = 0;

  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    if (!room.name) {
      warnings.push(`Room at index ${i} has no name — skipping`);
      continue;
    }

    const roomSlug = slugify(room.name);
    const roomId = roomSlug;

    // Limit room images to max 5 per room
    const rawFeatured = room.featuredImage || "";
    const rawGallery = Array.isArray(room.gallery) ? room.gallery.slice(0, 5) : [];

    roomsMap[roomId] = {
      id: roomId,
      name: room.name.trim(),
      slug: roomSlug,
      description: room.description || "",
      featuredImage: "",
      gallery: [],
      _rawFeatured: rawFeatured,
      _rawGallery: rawGallery,
      bedType: room.bedType || "",
      maxAdults: room.maxAdults || 2,
      maxChildren: room.maxChildren || 0,
      maxGuests: room.maxGuests || (room.maxAdults || 2) + (room.maxChildren || 0),
      roomSize: room.roomSize || null,
      amenities: Array.isArray(room.amenities) ? room.amenities : [],
      included: Array.isArray(room.included) ? room.included : [],
      totalRooms: room.totalRooms || 1,
      isActive: true,
      sortOrder: room.sortOrder || i + 1,
    };

    console.log(`   ✅ Room: "${roomsMap[roomId].name}" → rooms.${roomId}`);
    count++;
  }

  return { roomsMap, count, errors, warnings };
}

/**
 * Process room images: download → WebP → upload to Storage for each room.
 * Each room gets images stored at: hotels/{hotelId}/rooms/{roomId}/
 * Giới hạn tối đa 5 ảnh mỗi room.
 * @param {string} hotelId
 * @param {Object} roomsMap - The rooms Map (key = roomId, value = roomData with _rawFeatured/_rawGallery)
 * @returns {Promise<{ processedMap: Object, totalImages: number, errors: string[], warnings: string[] }>}
 */
async function processRoomImages(hotelId, roomsMap) {
  const errors = [];
  const warnings = [];
  /** @type {Object} */
  const processedMap = { ...roomsMap };
  let totalImages = 0;

  const roomIds = Object.keys(roomsMap);
  for (let ri = 0; ri < roomIds.length; ri++) {
    const roomId = roomIds[ri];
    const room = roomsMap[roomId];
    const roomName = room.name;
    const gallerySrcs = Array.isArray(room._rawGallery) ? room._rawGallery.slice(0, 5) : [];
    let featuredSrc = room._rawFeatured || "";

    if (!featuredSrc && gallerySrcs.length > 0) {
      featuredSrc = gallerySrcs[0];
      warnings.push(`Room "${roomName}": No featuredImage — using first gallery image as featured`);
    }

    // Process featured image for this room
    let featuredUrl = "";
    if (featuredSrc) {
      try {
        console.log(`   🖼️  Room "${roomName}": Downloading featured image...`);
        const rawBuffer = await downloadFile(featuredSrc);
        const webpBuffer = await toWebP(rawBuffer, 1600);
        const storagePath = `hotels/${hotelId}/rooms/${roomId}/featured.webp`;
        featuredUrl = await uploadToStorage(webpBuffer, storagePath);
        console.log(`   ✅ Room "${roomName}": Featured uploaded → ${storagePath}`);
        totalImages++;
      } catch (err) {
        errors.push(`Room "${roomName}" featured image failed: ${err.message}`);
      }
    } else {
      warnings.push(`Room "${roomName}": No room images available`);
    }

    // Process gallery images for this room (max 5 total including featured)
    /** @type {string[]} */
    const galleryUrls = [];
    const maxGallery = 5 - (featuredUrl ? 1 : 0); // Remaining slots after featured
    for (let i = 0; i < Math.min(gallerySrcs.length, maxGallery); i++) {
      const src = gallerySrcs[i];
      // Skip if this URL was already used as featured
      if (src === featuredSrc && featuredUrl) {
        galleryUrls.push(featuredUrl);
        continue;
      }

      try {
        console.log(`   🖼️  Room "${roomName}": Downloading gallery ${i + 1}/${Math.min(gallerySrcs.length, maxGallery)}...`);
        const rawBuffer = await downloadFile(src);
        const webpBuffer = await toWebP(rawBuffer, 1600);
        const padIdx = String(i + 1).padStart(2, "0");
        const storagePath = `hotels/${hotelId}/rooms/${roomId}/gallery/${padIdx}.webp`;
        const url = await uploadToStorage(webpBuffer, storagePath);
        galleryUrls.push(url);
        console.log(`   ✅ Room "${roomName}": Gallery ${padIdx} uploaded → ${storagePath}`);
        totalImages++;
      } catch (err) {
        errors.push(`Room "${roomName}" gallery ${i + 1} failed: ${err.message}`);
        warnings.push(`Room "${roomName}": Skipped gallery ${i + 1}`);
      }
    }

    // Update room with processed URLs — remove raw temporary fields
    processedMap[roomId] = {
      ...room,
      featuredImage: featuredUrl,
      gallery: galleryUrls,
    };
    delete processedMap[roomId]._rawFeatured;
    delete processedMap[roomId]._rawGallery;
  }

  return { processedMap, totalImages, errors, warnings };
}

/**
 * Save hotel document to Firestore.
 * @param {string} hotelId
 * @param {Object} hotelData
 * @param {string|null} featuredUrl
 * @param {string[]} galleryUrls
 * @returns {Promise<void>}
 */
async function saveHotelDoc(hotelId, hotelData, featuredUrl, galleryUrls) {
  hotelData.featuredImage = featuredUrl || "";
  hotelData.gallery = galleryUrls;

  await db.collection("hotels").doc(hotelId).set(hotelData);
  console.log(`   ✅ Hotel document created: hotels/${hotelId}`);
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  const startISO = nowISO();

  console.log("=".repeat(60));
  console.log("  🏨 Save Booking.com Scraped Data — Firebase Handler");
  console.log("  📁 Skill: booking-scraper");
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
      hotelName: "N/A",
      hotelId: null,
      hotelSlug: null,
      roomCount: 0,
      featuredImageUrl: null,
      galleryCount: 0,
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
    const sanitized = await sanitizeScrapedData(inputData, { type: 'hotel', knownNames: [sourceDomain].filter(Boolean) });
    Object.assign(inputData, sanitized.data);
    if (sanitized.changes.length > 0) console.log(`   ✅ ${sanitized.changes.length} items sanitized`);
  } catch (err) {
    console.log(`   ⚠️ Sanitize warning: ${err.message}`);
  }

  // Validate & check slug
  console.log("📋 Step 1/4: Validating data & checking for duplicates...");
  const { hotelData, rooms, errors: validationErrors, warnings: validationWarnings } = await validateAndCheck(inputData);

  if (!hotelData) {
    console.error("❌ Validation failed:");
    validationErrors.forEach((e) => console.error(`   - ${e}`));
    generateReport({
      success: false,
      hotelName: inputData.name || "N/A",
      hotelId: null,
      hotelSlug: null,
      roomCount: 0,
      featuredImageUrl: null,
      galleryCount: 0,
      errors: validationErrors,
      warnings: validationWarnings,
      timing: { start: startISO, end: nowISO(), durationMs: Date.now() - startTime },
    });
    process.exit(1);
  }

  const hotelId = hotelData.id;
  const hotelName = hotelData.name;
  const hotelSlug = hotelData.slug;
  console.log(`   ✅ Name: "${hotelName}"`);
  console.log(`   ✅ ID/Slug: "${hotelId}"`);
  console.log(`   ✅ Rooms: ${rooms.length}`);
  console.log("");

  // Process images
  console.log("🖼️  Step 2/4: Processing images (download → WebP → upload)...");
  const imgInput = {
    featuredImage: inputData.featuredImage || "",
    gallery: inputData.gallery || [],
  };
  const { featuredUrl, galleryUrls, errors: imgErrors, warnings: imgWarnings } = await processImages(hotelId, imgInput);
  console.log(`   ✅ Featured: ${featuredUrl ? "Uploaded" : "None"}`);
  console.log(`   ✅ Gallery: ${galleryUrls.length} images`);
  console.log("");

  // Build rooms Map
  console.log("🛏️  Step 3a/4: Building rooms embedded Map...");
  const { roomsMap, count: roomCount, errors: roomErrors, warnings: roomWarnings } = buildRoomsMap(rooms);
  console.log(`   ✅ ${roomCount} rooms built`);
  console.log("");

  // Process room images (download → WebP → upload, max 5 per room)
  console.log("🖼️  Step 3b/4: Processing room images (download → WebP → upload)...");
  const { processedMap, totalImages: roomImageCount, errors: roomImgErrors, warnings: roomImgWarnings } =
    await processRoomImages(hotelId, roomsMap);
  hotelData.rooms = processedMap;
  console.log(`   ✅ ${roomImageCount} room images processed (${roomCount} rooms)`);
  console.log("");

  // Process reviews (max 25, embedded Map)
  const rawReviews = Array.isArray(inputData.reviews) ? inputData.reviews : [];
  const reviewsMap = {};
  for (let i = 0; i < Math.min(rawReviews.length, 25); i++) {
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
  hotelData.reviews = reviewsMap;
  const reviewCount = Object.keys(reviewsMap).length;
  if (reviewCount > 0) {
    console.log(`   ✅ Reviews: ${reviewCount} reviews processed (max 25)`);
  }
  console.log("");

  // Save hotel document (with rooms + images + reviews embedded)
  console.log("💾 Step 4/4: Saving to Firestore...");
  await saveHotelDoc(hotelId, hotelData, featuredUrl, galleryUrls);
  console.log("");

  // Collect all errors & warnings
  const allErrors = [...validationErrors, ...imgErrors, ...roomErrors, ...roomImgErrors];
  const allWarnings = [...validationWarnings, ...imgWarnings, ...roomWarnings, ...roomImgWarnings];

  // FireCrawl credits (from input data if provided)
  const firecrawlCredits = inputData._firecrawlCredits || 0;

  // Generate report
  console.log("📄 Step 4/4: Generating report...");
  const endTime = Date.now();
  const endISO = nowISO();

  const result = {
    success: allErrors.length === 0,
    hotelName,
    hotelId,
    hotelSlug,
    roomCount,
    reviewCount,
    firecrawlCredits,
    featuredImageUrl: featuredUrl,
    galleryCount: galleryUrls.length,
    roomImageCount,
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
  console.log(`  🏨 Hotel:  hotels/${hotelId}`);
  console.log(`  🛏️  Rooms:  ${roomCount}`);
  console.log(`  🖼️  Gallery: ${galleryUrls.length} images`);
  console.log(`  🖼️  Room images: ${roomImageCount} images (max 5/room)`);
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
    hotelName: "N/A",
    hotelId: null,
    hotelSlug: null,
    roomCount: 0,
    featuredImageUrl: null,
    galleryCount: 0,
    errors: [`Unhandled error: ${err.message}`],
    warnings: [],
    timing: { start: nowISO(), end: nowISO(), durationMs: 0 },
  });
  process.exit(1);
});
