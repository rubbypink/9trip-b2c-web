/**
 * Save Booking.com Scraped Data — Firebase Handler Script.
 *
 * Nhận file JSON chứa dữ liệu hotel đã được Playwright/agent-browser scrape + agent xử lý,
 * thực hiện:
 *   1. Validate & check slug trùng
 *   2. Download ảnh → WebP (sharp) → Upload Firebase Storage
 *   3. Tạo document trong collection `hotels`
 *   4. Tạo rooms field dạng embedded Map trong hotel document (key = room.id)
 *   5. Tạo report file trong /.report/
 *
 * Usage:
 *   node src/scripts/saveBookingData.js --input=path/to/hotel-data.json
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
 *         "featuredImage": "string (URL) — nếu có, sẽ dùng làm featured",
 *         "gallery": ["string (URLs)"] — mảng URL ảnh của phòng,
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

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
const crypto = require("crypto");

// ─── Init Firebase Admin SDK ──────────────────────────────────────────

const serviceAccount = path.resolve(__dirname, "../..", "tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json");

if (!fs.existsSync(serviceAccount)) {
  console.error("❌ Không tìm thấy service account JSON tại:", serviceAccount);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccount)),
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
const FORCE = args.force === "true";

if (!INPUT_FILE) {
  console.error("❌ Usage: node src/scripts/saveBookingData.js --input=path/to/data.json [--force=true]");
  process.exit(1);
}

if (!fs.existsSync(INPUT_FILE)) {
  console.error(`❌ File not found: ${INPUT_FILE}`);
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Generate a URL-friendly slug from a text string.
 * @param {string} text
 * @returns {string}
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove Vietnamese diacritics
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Generate a short random ID with a prefix.
 * @param {string} prefix - e.g. "hotel"
 * @param {number} length - Number of random hex chars
 * @returns {string} e.g. "hotel_a1b2c3d4"
 */
function generateId(prefix, length = 8) {
  return `${prefix}_${crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length)}`;
}

/**
 * Get current ISO timestamp string.
 * @returns {string}
 */
function nowISO() {
  return new Date().toISOString();
}

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
 * Download a file from a URL and return the buffer.
 * @param {string} url
 * @returns {Promise<Buffer>}
 */
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    if (!url || typeof url !== "string") {
      return reject(new Error("Invalid URL"));
    }

    const client = url.startsWith("https") ? https : http;

    client.get(url, { timeout: 30000, headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36" } }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).toString();
        return downloadFile(redirectUrl).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }

      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject).on("timeout", function () { this.destroy(); reject(new Error("Timeout")); });
  });
}

/**
 * Convert an image buffer to WebP using sharp.
 * Quality-optimized: uses high quality setting + smart subsample to avoid artifacts.
 * @param {Buffer} buffer
 * @param {number} [maxWidth=2048] — Max width, increase to preserve details on larger screens
 * @param {Object} [opts] — Optional overrides
 * @param {number} [opts.quality=90] — WebP quality (82-95 recommended; 90 balances quality/size)
 * @param {number} [opts.effort=6] — CPU effort 0-6 (6 = best compression, slower)
 * @returns {Promise<Buffer>}
 */
async function toWebP(buffer, maxWidth = 2048, opts = {}) {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    throw new Error("sharp is not installed. Run: npm install sharp");
  }

  const image = sharp(buffer);
  const metadata = await image.metadata();

  // Only resize if width exceeds maxWidth, preserving original detail otherwise
  if (metadata.width > maxWidth) {
    image.resize({
      width: maxWidth,
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3, // Highest-quality downscale kernel
    });
  }

  const quality = opts.quality ?? 90;
  const effort = opts.effort ?? 6;

  return image
    .webp({
      quality,
      effort,
      alphaQuality: 100,       // Preserve transparency fully
      smartSubsample: true,    // Better chroma handling → fewer color artifacts
      nearLossless: quality >= 95, // Enable near-lossless at very high quality
    })
    .toBuffer();
}

/**
 * Upload a buffer to Firebase Storage and return the public download URL.
 * @param {Buffer} buffer
 * @param {string} storagePath - e.g. "hotels/abc123/featured.webp"
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
  // Make publicly readable
  await file.makePublic();
  // Construct public URL
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
 * @property {number} roomImageCount — Total room images processed
 * @property {string[]} errors
 * @property {string[]} warnings
 * @property {Object} timing - { start: string, end: string, durationMs: number }
 */

/**
 * Generate a report markdown file in /.report/
 * @param {ProcessingResult} result
 */
function generateReport(result) {
  const reportDir = path.resolve(__dirname, "../..", ".report");
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
  lines.push("");

  lines.push("### Storage");
  lines.push(`- **Featured image**: ${result.featuredImageUrl || "Không có"}`);
  lines.push(`- **Gallery images**: ${result.galleryCount} files → \`hotels/${result.hotelId}/gallery/\``);
  lines.push(`- **Room images**: ${result.roomImageCount || 0} files → \`hotels/${result.hotelId}/rooms/{roomId}/\``);
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
 * Returns the hotel data enriched with id and slug.
 * @param {Object} data
 * @returns {Promise<Object>} { hotelData, errors, warnings }
 */
async function validateAndCheck(data) {
  const errors = [];
  const warnings = [];

  // Required field
  if (!data.name || typeof data.name !== "string" || data.name.trim() === "") {
    errors.push("Missing required field: 'name'");
    return { hotelData: null, errors, warnings };
  }

  const name = data.name.trim();
  const slug = slugify(name);

  if (!slug) {
    errors.push(`Could not generate slug from name: "${name}"`);
    return { hotelData: null, errors, warnings };
  }

  // Check for existing slug
  const existingSnap = await db.collection("hotels").where("slug", "==", slug).limit(1).get();
  if (!existingSnap.empty) {
    const existing = existingSnap.docs[0];
    errors.push(`Hotel with slug "${slug}" already exists: ${existing.id} ("${existing.data().name || "?"}")`);
    return { hotelData: null, errors, warnings };
  }

  // Build hotel document
  const hotelId = generateId("hotel");

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
    featuredImage: "", // Will be filled after upload
    gallery: [], // Will be filled after upload
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
    rooms: {}, // Will be populated as embedded Map (key = room.id)
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Process rooms — keep array for iteration, will convert to Map later
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

  // Determine effective featured image
  let effectiveFeatured = featuredSrc;
  if (!effectiveFeatured && gallerySrcs.length > 0) {
    effectiveFeatured = gallerySrcs[0];
    warnings.push("No featuredImage provided — using first gallery image as featured image");
  }

  // Upload featured image
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

  // Upload gallery images
  for (let i = 0; i < gallerySrcs.length; i++) {
    const src = gallerySrcs[i];
    // Skip if this was used as featured and already processed
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

/**
 * Process room images: download → WebP → upload to Storage for each room.
 * Each room gets images stored at: hotels/{hotelId}/rooms/{roomId}/
 * Falls back: if no featuredImage but gallery exists, use gallery[0] as featured.
 * @param {string} hotelId
 * @param {Object} roomsMap - The rooms Map (key = roomId, value = roomData with raw image URLs)
 * @returns {Promise<{ processedMap: Object, totalImages: number, errors: string[], warnings: string[] }>}
 */
async function processRoomImages(hotelId, roomsMap) {
  const errors = [];
  const warnings = [];
  const /** @type {Object} */ processedMap = { ...roomsMap };
  let totalImages = 0;

  const roomIds = Object.keys(roomsMap);
  for (let ri = 0; ri < roomIds.length; ri++) {
    const roomId = roomIds[ri];
    const room = roomsMap[roomId];
    const roomName = room.name;
    const gallerySrcs = Array.isArray(room._rawGallery) ? room._rawGallery : [];
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
        const webpBuffer = await toWebP(rawBuffer, 1600, { quality: 88, effort: 5 });
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

    // Process gallery images for this room
    const /** @type {string[]} */ galleryUrls = [];
    for (let i = 0; i < gallerySrcs.length; i++) {
      const src = gallerySrcs[i];
      // Skip if this URL was already used as featured
      if (src === featuredSrc && featuredUrl) {
        galleryUrls.push(featuredUrl);
        continue;
      }

      try {
        console.log(`   🖼️  Room "${roomName}": Downloading gallery ${i + 1}/${gallerySrcs.length}...`);
        const rawBuffer = await downloadFile(src);
        const webpBuffer = await toWebP(rawBuffer, 1600, { quality: 88, effort: 5 });
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
 * Build rooms embedded Map from room array.
 * Each room becomes an entry in the Map with key = room.id.
 * Room image URLs are stored temporarily as _rawFeatured / _rawGallery
 * so they can be processed later by processRoomImages().
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
    const roomId = `room_${roomSlug}`;

    roomsMap[roomId] = {
      id: roomId,
      name: room.name.trim(),
      slug: roomSlug,
      description: room.description || "",
      featuredImage: "",          // Will be filled by processRoomImages()
      gallery: [],                // Will be filled by processRoomImages()
      _rawFeatured: room.featuredImage || "",   // Temporary — original URL before processing
      _rawGallery: Array.isArray(room.gallery) ? room.gallery : [], // Temporary
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

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  const startISO = nowISO();

  console.log("=".repeat(60));
  console.log("  🏨 Save Booking.com Scraped Data — Firebase Handler");
  console.log("=".repeat(60));
  console.log(`   Input file: ${INPUT_FILE}`);
  console.log(`   Force mode: ${FORCE}`);
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

  // Validate & check slug
  console.log("📋 Step 1/5: Validating data & checking for duplicates...");
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
      roomImageCount: 0,
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
  console.log(`   ✅ Slug: "${hotelSlug}"`);
  console.log(`   ✅ Hotel ID: ${hotelId}`);
  console.log(`   ✅ Rooms: ${rooms.length}`);
  console.log("");

  // Process hotel images
  console.log("🖼️  Step 2/5: Processing hotel images (download → WebP → upload)...");
  const imgInput = {
    featuredImage: inputData.featuredImage || "",
    gallery: inputData.gallery || [],
  };
  const { featuredUrl, galleryUrls, errors: imgErrors, warnings: imgWarnings } = await processImages(hotelId, imgInput);
  console.log(`   ✅ Featured: ${featuredUrl ? "Uploaded" : "None"}`);
  console.log(`   ✅ Gallery: ${galleryUrls.length} images`);
  console.log("");

  // Build rooms Map
  console.log("🛏️  Step 3/5: Building rooms embedded Map...");
  const { roomsMap, count: roomCount, errors: roomErrors, warnings: roomWarnings } = buildRoomsMap(rooms);
  console.log(`   ✅ ${roomCount} rooms built`);
  console.log("");

  // Process room images
  console.log("🖼️  Step 3b/5: Processing room images (download → WebP → upload)...");
  const { processedMap, totalImages: roomImageCount, errors: roomImgErrors, warnings: roomImgWarnings } =
    await processRoomImages(hotelId, roomsMap);
  hotelData.rooms = processedMap;
  console.log(`   ✅ ${roomImageCount} room images processed (${roomCount} rooms)`);
  console.log("");

  // Save hotel document (with rooms + images embedded)
  console.log("💾 Step 4/5: Saving to Firestore...");
  await saveHotelDoc(hotelId, hotelData, featuredUrl, galleryUrls);
  console.log("");

  // Collect all errors & warnings
  const allErrors = [...validationErrors, ...imgErrors, ...roomErrors, ...roomImgErrors];
  const allWarnings = [...validationWarnings, ...imgWarnings, ...roomWarnings, ...roomImgWarnings];

  // Generate report
  console.log("📄 Step 5/5: Generating report...");
  const endTime = Date.now();
  const endISO = nowISO();

  const result = {
    success: allErrors.length === 0,
    hotelName,
    hotelId,
    hotelSlug,
    roomCount,
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
  console.log(`  🖼️  Room images: ${roomImageCount} images`);
  console.log(`  ⏱  Time:   ${result.timing.durationMs}ms`);
  console.log("=".repeat(60));

  // Exit with error code if there were errors
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
    roomImageCount: 0,
    errors: [`Unhandled error: ${err.message}`],
    warnings: [],
    timing: { start: nowISO(), end: nowISO(), durationMs: 0 },
  });
  process.exit(1);
});
