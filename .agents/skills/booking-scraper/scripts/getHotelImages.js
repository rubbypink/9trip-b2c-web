/**
 * getHotelImages.js — All-in-one Booking.com hotel scraper.
 *
 * Scrapes ALL data from a booking.com hotel URL in one pass:
 *   1. Extracts structured hotel + room + review data via app LLM (json format)
 *   2. Opens browser session (markdown scrape) → 2-step interact for gallery images
 *   3. Post-processes images: normalize resolution, classify (hotel vs room),
 *      deduplicate, match to rooms by name, sort into correct schema fields
 *   4. Fallback: firecrawl_agent (maxCredits=100) if interact returns no valid images
 *   5. Merges everything → returns clean JSON matching saveBookingDataSkill.js input
 *
 * Usage:
 *   node getHotelImages.js --url=https://www.booking.com/hotel/vn/palo-santo-phu-quo.vi.html
 *
 * Output: JSON to stdout (all logs go to stderr so stdout is clean parseable JSON)
 *
 * @module getHotelImages
 */

const { FireCrawl } = require('../../../lib/firecrawc.mjs');

const fs = require("fs");
const path = require("path");

// ─── Load .env.local ──────────────────────────────────────────────────

/**
 * Load environment variables from .env.local into process.env.
 * Only sets keys that are not already set.
 * Handles Windows line endings (\r\n), spaces around =, inline comments (#),
 * and quoted values.
 */
function loadEnv() {
  const envPath = path.resolve(__dirname, "../../../..", ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error(`[9Trip-Error] .env.local not found at: ${envPath}`);
    return;
  }
  const content = fs.readFileSync(envPath, "utf-8");
  for (let line of content.split(/\r?\n/)) {
    line = line.trim();
    // Skip empty lines and comments
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    // Strip inline comment (only if not inside quoted string)
    if (!value.startsWith('"') && !value.startsWith("'")) {
      const commentIdx = value.indexOf(" #");
      if (commentIdx !== -1) value = value.slice(0, commentIdx).trim();
    }
    // Remove surrounding quotes if any
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

// ─── Constants ────────────────────────────────────────────────────────

/** app LLM prompt for structured hotel data extraction (kế thừa từ SKILL.md B1). */
const EXTRACT_PROMPT = `Role: You are a 9Trip B2C hotel data extraction specialist. Extract structured data from this booking.com hotel page.

Context: The 9Trip platform manages hotel data in Firestore with a strict schema. Every field must conform.

Extract the following from the page:
1. Hotel name (exact name, trim whitespace)
2. Star rating (number 1-5, extract from stars/rating badge)
3. Address: street, city, country (from the address section)
4. Description (full hotel description, can include basic HTML)
5. Short excerpt (first 150 chars of description, plain text only)
6. Main/featured image URL (the primary hotel photo, full absolute URL)
7. Gallery image URLs (ALL available hotel photos, full absolute URLs, deduplicated)
8. Amenities/facilities list (all hotel facilities mentioned)
9. Highlights (top features or unique selling points, if available)
10. Guest rating: average score (number 1-10) and review count
11. Check-in and check-out times
12. Map coordinates (latitude, longitude) if available
13. Phone, email, website if available
14. Room types: for each room extract:
    - Room name
    - Description
    - Bed type (e.g. "1 King bed", "2 Twin beds")
    - Max adults
    - Max children
    - Max guests
    - Room size in m²
    - Room amenities
    - What's included (meal plans, etc.)
    - Total rooms of this type (if available)
15. Recent reviews (max 25): for each review extract:
    - reviewerName
    - reviewerAvatar URL (if available)
    - rating (number 1-10)
    - text (full review text)
    - date (review date)
    - country (reviewer country)

Return ONLY a JSON object matching the schema. No extra text, no markdown.`;

/** JSON Schema for app structured extraction. */
const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "Hotel name (required)" },
    starRating: { type: "number", description: "Star rating 1-5" },
    address: {
      type: "object",
      properties: {
        street: { type: "string" },
        city: { type: "string" },
        country: { type: "string" },
      },
    },
    description: { type: "string", description: "Full hotel description" },
    excerpt: { type: "string", description: "Short description, max 200 chars" },
    featuredImage: { type: "string", description: "Main photo URL" },
    gallery: {
      type: "array",
      items: { type: "string" },
      description: "All hotel photo URLs",
    },
    amenities: {
      type: "array",
      items: { type: "string" },
      description: "Hotel facilities",
    },
    highlights: {
      type: "array",
      items: { type: "string" },
      description: "Top features",
    },
    rating: {
      type: "object",
      properties: {
        average: { type: "number", description: "Average guest rating (1-10)" },
        count: { type: "number", description: "Number of reviews" },
      },
    },
    policies: {
      type: "object",
      properties: {
        checkIn: { type: "string", description: "Check-in time e.g. 14:00" },
        checkOut: { type: "string", description: "Check-out time e.g. 12:00" },
      },
    },
    map: {
      type: "object",
      properties: {
        lat: { type: "number" },
        lng: { type: "number" },
      },
    },
    phone: { type: "string" },
    email: { type: "string" },
    website: { type: "string" },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "Tags like 'resort', 'sea-view', 'pool'",
    },
    rooms: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Room type name (required)" },
          description: { type: "string" },
          bedType: { type: "string", description: "e.g. '1 King bed'" },
          maxAdults: { type: "number" },
          maxChildren: { type: "number" },
          maxGuests: { type: "number" },
          roomSize: { type: "number", description: "Room size in m²" },
          amenities: { type: "array", items: { type: "string" } },
          included: {
            type: "array",
            items: { type: "string" },
            description: "What's included e.g. breakfast",
          },
          totalRooms: { type: "number", description: "Total rooms of this type" },
        },
        required: ["name"],
      },
    },
    reviews: {
      type: "array",
      items: {
        type: "object",
        properties: {
          reviewerName: { type: "string" },
          reviewerAvatar: { type: "string", description: "Avatar URL" },
          rating: { type: "number", description: "Rating 1-10" },
          text: { type: "string", description: "Full review text" },
          date: { type: "string", description: "Review date" },
          country: { type: "string", description: "Reviewer country" },
        },
      },
    },
  },
  required: ["name"],
};

// ─── Image Helpers ────────────────────────────────────────────────────

/**
 * Extract image URLs from text using regex (booking.com CDN pattern).
 * @param {string} text
 * @returns {string[]}
 */
function extractImageUrls(text) {
  if (!text || typeof text !== "string") return [];
  const regex = /https:\/\/cf\.bstatic\.com\/xdata\/images\/[^\s"')\]]+/gi;
  const matches = text.match(regex) || [];
  return matches.map((url) => url.replace(/[)\]},;]+$/, ""));
}

/**
 * Normalize image URL to max1024x768 resolution.
 * Replaces max500, max300, max200, max128x96, etc. with max1024x768.
 * @param {string} url
 * @returns {string}
 */
function normalizeImageUrl(url) {
  if (!url || typeof url !== "string") return "";
  return url.replace(/\/max\d+(?:x\d+)?\//i, "/max1024x768/");
}

/**
 * Extract unique image ID from booking.com CDN URL for deduplication.
 * Pattern: /{numericId}.jpg (or .webp, .png) — the numeric part before extension.
 * @param {string} url
 * @returns {string} unique image identifier
 */
function getImageId(url) {
  const match = url.match(/\/(\d+)\.(?:jpg|webp|png|jpeg)/i);
  return match ? match[1] : url;
}

/**
 * Deduplicate image URLs by image ID, keeping first occurrence.
 * @param {string[]} urls
 * @returns {string[]}
 */
function deduplicateUrls(urls) {
  const seen = new Set();
  const result = [];
  for (const url of urls) {
    const id = getImageId(url);
    if (!seen.has(id)) {
      seen.add(id);
      result.push(url);
    }
  }
  return result;
}

/**
 * Classify image as hotel or room based on URL path.
 * @param {string} url
 * @returns {"hotel" | "room"}
 */
function classifyImageType(url) {
  if (/\/hotel\//i.test(url)) return "hotel";
  if (/\/room\//i.test(url)) return "room";
  return "hotel"; // fallback: most booking.com CDN paths use /hotel/ even for rooms
}

/**
 * Slugify a string — remove diacritics, lowercase, hyphenate.
 * @param {string} text
 * @returns {string}
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Normalize a room name for fuzzy matching (lowercase, no diacritics, no extra spaces).
 * @param {string} name
 * @returns {string}
 */
function normalizeRoomName(name) {
  return slugify(name).replace(/-/g, " ");
}

// ─── Logging ──────────────────────────────────────────────────────────

/**
 * Log a message to stderr (keeps stdout clean for JSON output).
 * @param {"info"|"warn"|"error"} level
 * @param {string} message
 */
function log(level, message) {
  const prefix = { info: "[9Trip-Log]", warn: "[9Trip-Warn]", error: "[9Trip-Error]" }[level] || "[9Trip]";
  console.error(`${prefix} ${message}`);
}

// ─── Image Classification & Sorting ───────────────────────────────────

/**
 * Match image URLs to rooms by analyzing URL context in response text.
 * URLs near room name mentions are classified as room images.
 * Rooms without matching images get empty gallery arrays.
 * @param {string[]} allUrls - All normalized, deduplicated image URLs
 * @param {Object[]} rooms - Room objects from structured extraction
 * @param {string} responseText - Raw text from interact Step 2 response
 * @returns {{ hotelGallery: string[], roomImageMap: Map<string, string[]> }}
 */
function classifyAndSortImages(allUrls, rooms, responseText) {
  const hotelGallery = [];
  /** @type {Map<string, string[]>} */
  const roomImageMap = new Map();

  for (const room of rooms) {
    if (room.name) roomImageMap.set(room.name, []);
  }

  /**
   * Find best matching room name for a URL based on surrounding context.
   * @param {string} url
   * @returns {string|null} room name or null if classified as hotel
   */
  function findMatchingRoom(url) {
    if (!responseText) return null;
    const idx = responseText.indexOf(url);
    if (idx === -1) return null;
    const start = Math.max(0, idx - 200);
    const end = Math.min(responseText.length, idx + url.length + 200);
    const context = responseText.slice(start, end).toLowerCase();

    let bestRoom = null;
    let bestScore = 0;
    for (const room of rooms) {
      if (!room.name) continue;
      const normalizedName = normalizeRoomName(room.name);
      const nameWords = normalizedName.split(" ").filter((w) => w.length > 2);
      let score = 0;
      for (const word of nameWords) {
        if (context.includes(word)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestRoom = room.name;
      }
    }
    return bestScore >= 2 ? bestRoom : null;
  }

  for (const url of allUrls) {
    const type = classifyImageType(url);
    if (type === "room") {
      const matchedRoom = findMatchingRoom(url);
      if (matchedRoom && roomImageMap.has(matchedRoom)) {
        roomImageMap.get(matchedRoom).push(url);
        continue;
      }
    }
    // Default: classify as hotel gallery
    hotelGallery.push(url);
  }

  return { hotelGallery, roomImageMap };
}

// ─── Output Builder ───────────────────────────────────────────────────

/**
 * Build the final output object matching saveBookingDataSkill.js input schema.
 * @param {Object} extracted - Structured data from app extract
 * @param {string[]} hotelGallery - Processed hotel gallery URLs
 * @param {Map<string, string[]>} roomImageMap - Room name → image URLs
 * @param {Object[]} rooms - Room definitions from extract
 * @param {number} totalCredits - Total app credits used
 * @param {string[]} warnings - Accumulated warnings
 * @returns {Object} Clean JSON matching saveBookingDataSkill.js input
 */
function buildOutput(extracted, hotelGallery, roomImageMap, rooms, totalCredits, warnings) {
  const extractGallery = Array.isArray(extracted.gallery)
    ? extracted.gallery.map(normalizeImageUrl)
    : [];
  const mergedHotelGallery = deduplicateUrls([...hotelGallery, ...extractGallery]).slice(0, 30);

  const featuredImage = normalizeImageUrl(extracted.featuredImage || mergedHotelGallery[0] || "");

  const outputRooms = (Array.isArray(extracted.rooms) ? extracted.rooms : rooms).map(
    (room, idx) => {
      const roomName = room.name || "";
      const roomImages = roomImageMap.get(roomName) || [];
      const dedupedRoomImages = deduplicateUrls(roomImages).slice(0, 7);
      return {
        name: roomName,
        description: room.description || "",
        bedType: room.bedType || "",
        maxAdults: room.maxAdults || 2,
        maxChildren: room.maxChildren || 0,
        maxGuests: room.maxGuests || (room.maxAdults || 2) + (room.maxChildren || 0),
        roomSize: room.roomSize || null,
        featuredImage: dedupedRoomImages[0] || "",
        gallery: dedupedRoomImages,
        amenities: Array.isArray(room.amenities) ? room.amenities : [],
        included: Array.isArray(room.included) ? room.included : [],
        totalRooms: room.totalRooms || 1,
        sortOrder: idx + 1,
      };
    }
  );

  const reviews = (Array.isArray(extracted.reviews) ? extracted.reviews : [])
    .slice(0, 25)
    .map((r, idx) => ({
      reviewerName: r.reviewerName || "",
      reviewerAvatar: r.reviewerAvatar || "",
      rating: r.rating || 0,
      text: r.text || "",
      date: r.date || "",
      country: r.country || "",
      sortOrder: idx + 1,
    }));

  // Infer tags from star rating and amenities
  const tags = Array.isArray(extracted.tags) ? [...extracted.tags] : [];
  if (extracted.starRating >= 4) tags.push("luxury");
  if (extracted.starRating === 5) tags.push("5-star");
  const amenityLower = (Array.isArray(extracted.amenities) ? extracted.amenities : []).map(
    (a) => (typeof a === "string" ? a.toLowerCase() : "")
  );
  if (amenityLower.some((a) => a.includes("pool") || a.includes("bể bơi"))) tags.push("pool");
  if (amenityLower.some((a) => a.includes("spa"))) tags.push("spa");
  if (amenityLower.some((a) => a.includes("beach") || a.includes("biển"))) tags.push("beach");

  return {
    name: extracted.name || "",
    starRating: extracted.starRating || null,
    address: extracted.address || null,
    description: extracted.description || "",
    excerpt:
      extracted.excerpt ||
      (extracted.description || "").replace(/<[^>]*>/g, "").slice(0, 200),
    featuredImage,
    gallery: mergedHotelGallery,
    amenities: Array.isArray(extracted.amenities) ? extracted.amenities : [],
    highlights: Array.isArray(extracted.highlights) ? extracted.highlights : [],
    rating: extracted.rating || { average: 0, count: 0 },
    policies: extracted.policies || {},
    map: extracted.map || null,
    phone: extracted.phone || "",
    email: extracted.email || "",
    website: extracted.website || "",
    tags: [...new Set(tags)],
    rooms: outputRooms,
    reviews,
    _firecrawlCredits: totalCredits,
    _warnings: warnings,
  };
}

// ─── Main Scrape Function ─────────────────────────────────────────────
/**

* Scrape toàn bộ dữ liệu khách sạn từ URL booking.com.

*

* Flow (FireCrawl v2 API with Interaction):

* 1. Scrape initial markdown + json to get hotelData and scrapeId

* 2. Interact: Scroll down and wait

* 3. Interact: Open room details

* 4. Interact: Click gallery images to load URLs

* 5. Interact: Final extraction of all data (hotel + rooms + reviews) as JSON

* 6. Post-process and normalize results

*

* @param {string} targetUrl - Link trang chi tiết khách sạn trên booking.com

* @returns {Promise<{success: boolean, data: Object|null, error?: string}>}

*/

async function scrapeHotelFromUrl(targetUrl) {

// const apiKey = process.env.FIRECRAWL_API_KEY;

// if (!apiKey) {

// return { success: false, error: "FIRECRAWL_API_KEY not found in environment", data: null };

// }



// const app = new Firecrawl({ apiKey });
const app = FireCrawl;

let totalCredits = 0;

let scrapeId = null;

/** @type {string[]} */

const warnings = [];



try {

// ── Step 1: Initial Scrape with Actions (Markdown only) ──────────

log("info", "Step 1/4: Starting session and performing initial actions...");

const scrapeResult = await app.scrape(targetUrl, {

formats: ["markdown"],

actions: [

{ type: "scroll", direction: "down" },

{ type: "wait", milliseconds: 1000 },

{ type: "scroll", direction: "down" },

]

});



if (!scrapeResult || (!scrapeResult.markdown && !scrapeResult.data)) {

throw new Error(`Initial scrape failed: ${scrapeResult?.error || "Unknown error"}`);

}



scrapeId = scrapeResult.metadata?.scrapeId || scrapeResult.data?.metadata?.scrapeId;

let structuredData = {};

if (scrapeResult.metadata?.creditsUsed) totalCredits += scrapeResult.metadata.creditsUsed;



log("info", "Session started.");



if (scrapeId) {

// ── Step 2: Interact to expand rooms and click gallery ──────────

log("info", "Step 2/4: Expanding room details and loading gallery...");

await app.interact(scrapeId, {

prompt: "Find and click all 'View details' buttons for rooms. Then click on the hotel gallery images to load them."

});



// ── Step 3: Final Extraction ────────────────────────────────────

log("info", "Step 3/4: Final structured data extraction...");

const finalInteract = await app.interact(scrapeId, {

prompt: `${EXTRACT_PROMPT}\n\nIMPORTANT: Return ONLY a raw JSON string.`

});



if (finalInteract.success) {

try {

let cleanOutput = finalInteract.output || "";

cleanOutput = cleanOutput.replace(/```json\n?/, "").replace(/```\n?$/, "").trim();

const interactionData = JSON.parse(cleanOutput);

structuredData = { ...structuredData, ...interactionData };

} catch (e) {

log("warn", "Final JSON parse failed.");

}

}



// ── Step 4: Process Images ──────────────────────────────────────

log("info", "Step 4/4: Processing image URLs...");

const stateResult = await app.interact(scrapeId, { prompt: "Provide current page content in markdown." });

const finalMarkdown = stateResult.output || "";



let rawUrls = extractImageUrls(finalMarkdown);

rawUrls = rawUrls.map(normalizeImageUrl);

rawUrls = deduplicateUrls(rawUrls);


const roomsFromExtraction = Array.isArray(structuredData.rooms) ? structuredData.rooms : [];

const { hotelGallery, roomImageMap } = classifyAndSortImages(rawUrls, roomsFromExtraction, finalMarkdown);


log("info", `Post-process: ${hotelGallery.length} hotel images, ${[...roomImageMap.entries()].filter(([, v]) => v.length > 0).length} rooms with images.`);



const output = buildOutput(structuredData, hotelGallery, roomImageMap, roomsFromExtraction, totalCredits, warnings);


await app.stopInteraction(scrapeId).catch(err => log("warn", `Stop session error: ${err.message}`));


return { success: true, data: output };

} else {

log("warn", "No scrapeId, skipping interaction.");

const output = buildOutput(structuredData, [], new Map(), [], totalCredits, warnings);

return { success: true, data: output };

}

} catch (err) {

log("error", `Scrape error: ${err.message}`);

if (scrapeId) {

await app.stopInteraction(scrapeId).catch(() => {});

}

return { success: false, error: err.message, data: null };

}

}

// ─── CLI Entry Point ──────────────────────────────────────────────────

if (require.main === module) {
  loadEnv();

  const args = {};
  process.argv.slice(2).forEach((arg) => {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) args[match[1]] = match[2];
  });

  const targetUrl = args.url;

  if (!targetUrl) {
    console.error("Usage: node getHotelImages.js --url=https://www.booking.com/hotel/vn/palo-santo-phu-quo.vi.html");
    process.exit(1);
  }

  scrapeHotelFromUrl(targetUrl)
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error(`[9Trip-Error] Unhandled: ${err.message}`);
      console.log(JSON.stringify({ success: false, error: err.message, data: null }, null, 2));
      process.exit(1);
    });
}

// ─── Module Exports ───────────────────────────────────────────────────

module.exports = { scrapeHotelFromUrl };