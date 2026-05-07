/**
 * getHotelImages.mjs — Booking.com hotel scraper using agent-browser CLI.
 *
 * Replaces legacy FireCrawl-based scraping with agent-browser automation:
 * - Opens page via browser automation (agent-browser CLI)
 * - Extracts structured hotel data from DOM via evaluate()
 * - Extracts gallery images from page HTML
 * - Post-processes and classifies images by room
 * - Returns JSON matching saveBookingDataSkill.js input schema
 *
 * Usage:
 *   node getHotelImages.mjs --url=https://www.booking.com/hotel/vn/...
 *
 * Output: JSON to stdout (all logs go to stderr)
 *
 * @module getHotelImages
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initSession,
  closeSession,
  openPage,
  evaluate,
  waitForNetworkIdle,
  clickByText,
  scroll,
  waitForText,
} from '../../../lib/browser-automation.mjs';
import { normalizeImageUrl, deduplicateUrls } from '../../../lib/image-helpers.mjs';
import { loadEnvConfig } from '../../../lib/firebase-helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// Constants
// ============================================================================

/** Booking.com CDN image regex pattern */
const BOOKING_IMAGE_REGEX = /https:\/\/cf\.bstatic\.com\/xdata\/images\/[^\s"')\]]+/gi;

// ============================================================================
// Local Helpers (business-logic specific, not in shared lib)
// ============================================================================

/**
 * Extract image URLs from text (booking.com CDN pattern).
 * @param {string} text - Raw HTML/text content
 * @returns {string[]} Extracted image URLs
 */
function extractImageUrls(text) {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(BOOKING_IMAGE_REGEX) || [];
  return matches.map((url) => url.replace(/[)\]},;]+$/, ''));
}

/**
 * Extract unique image ID from booking.com CDN URL for deduplication.
 * Pattern: /{numericId}.jpg — the numeric part before extension.
 * @param {string} url
 * @returns {string} Unique image identifier
 */
function getImageId(url) {
  const match = url.match(/\/(\d+)\.(?:jpg|webp|png|jpeg)/i);
  return match ? match[1] : url;
}

/**
 * Deduplicate image URLs by image ID (booking.com-specific),
 * keeping first occurrence. Augments generic deduplicateUrls.
 * @param {string[]} urls
 * @returns {string[]}
 */
function deduplicateByImageId(urls) {
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
 * @returns {'hotel' | 'room'}
 */
function classifyImageType(url) {
  if (/\/room\//i.test(url)) return 'room';
  return 'hotel';
}

/**
 * Slugify a string — remove diacritics, lowercase, hyphenate.
 * @param {string} text
 * @returns {string}
 */
function slugifyText(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Normalize a room name for fuzzy matching.
 * @param {string} name
 * @returns {string}
 */
function normalizeRoomName(name) {
  return slugifyText(name).replace(/-/g, ' ');
}

/**
 * Log a message to stderr (keeps stdout clean for JSON output).
 * @param {'info'|'warn'|'error'} level
 * @param {string} message
 */
function log(level, message) {
  const prefix = { info: '[9Trip-Log]', warn: '[9Trip-Warn]', error: '[9Trip-Error]' }[level] || '[9Trip]';
  console.error(`${prefix} ${message}`);
}

// ============================================================================
// DOM Extraction Script (runs inside browser via evaluate)
// ============================================================================

/**
 * Build a JavaScript expression string for agent-browser eval that extracts
 * structured hotel data from booking.com DOM. Uses only double-quoted strings
 * to avoid shell escaping issues with evaluate().
 * @returns {string} JS expression that returns JSON string
 */
function buildExtractScript() {
  // Multi-part extraction: use function hoisting to keep it readable
  const extractors = {
    name: /* js */ `(function(){
      var sels=["h2.pp-header__title","[data-testid=\"header-title\"]","h1.hp__hotel-title","[data-testid=\"property-header\"] h1","h2[data-testid=\"property-name\"]"];
      for(var i=0;i<sels.length;i++){var el=document.querySelector(sels[i]);if(el&&el.textContent){return el.textContent.trim()}}
      var t=document.title.split(" - ")[0].split("|")[0];return t?t.trim():"";
    })()`,

    starRating: /* js */ `(function(){
      var c=document.querySelector("[data-testid=\"rating-stars\"],.b6f6d8ad57");
      if(c){return c.querySelectorAll("span,svg,i[class*=\"star\"]").length}
      var s=document.querySelectorAll("[class*=\"star\"]:not([class*=\"empty\"])");
      return s.length>0?s.length:null;
    })()`,

    address: /* js */ `(function(){
      var el=document.querySelector("[data-testid=\"property-address\"],.hp__address,[data-testid=\"header-address\"]");
      return el?el.textContent.trim():"";
    })()`,

    description: /* js */ `(function(){
      var el=document.querySelector("[data-testid=\"property-description\"],#property_description_content,.hp__hotel_desc");
      if(el) return el.textContent.trim();
      var m=document.querySelector("meta[name=\"description\"]");
      return m?m.content:"";
    })()`,

    checkIn: /* js */ `(function(){
      var el=document.querySelector("[data-testid=\"checkin-policy\"]");
      if(!el) return "";
      var m=el.textContent.match(/check\\s*-?\\s*in[\\s:]*(\\d{1,2}:?\\d{0,2})/i);
      return m?m[1]:"";
    })()`,

    checkOut: /* js */ `(function(){
      var el=document.querySelector("[data-testid=\"checkin-policy\"]");
      if(!el) return "";
      var m=el.textContent.match(/check\\s*-?\\s*out[\\s:]*(\\d{1,2}:?\\d{0,2})/i);
      return m?m[1]:"";
    })()`,

    amenities: /* js */ `(function(){
      var items=[];
      var sels=["[data-testid=\"property-most-popular-facilities\"] li","[data-testid=\"property-facilities\"] li",".hp__hotel_facilities li"];
      for(var i=0;i<sels.length;i++){
        document.querySelectorAll(sels[i]).forEach(function(el){
          var t=el.textContent.trim();
          if(t.length>2&&t.length<100&&items.indexOf(t)===-1) items.push(t);
        });
      }
      return items;
    })()`,

    rating: /* js */ `(function(){
      var el=document.querySelector("[data-testid=\"review-score\"],[data-testid=\"rating-score\"]");
      if(!el) return null;
      var m=el.textContent.match(/([0-9][.,]?[0-9]*)/);
      if(!m) return null;
      var avg=parseFloat(m[1].replace(",","."));
      var countEl=document.querySelector("[data-testid=\"review-count\"]");
      var cnt=null;
      if(countEl){var cm=countEl.textContent.match(/([0-9][0-9\\s,]*)/);if(cm)cnt=parseInt(cm[1].replace(/[\\s,]/g,""))}
      return {average:avg,count:cnt};
    })()`,

    rooms: /* js */ `(function(){
      var rooms=[];
      document.querySelectorAll("[data-testid=\"room-card\"],.room-row,[class*=\"room\"]").forEach(function(row){
        var nameEl=row.querySelector("[data-testid=\"room-name\"],h3,.room-title,.room-type");
        if(!nameEl) return;
        var name=nameEl.textContent.trim();
        if(!name) return;
        var room={name:name};
        var bedEl=row.querySelector("[data-testid=\"bed-configuration\"],.bed-type");
        room.bedType=bedEl?bedEl.textContent.trim():"";
        var occEl=row.querySelector("[data-testid=\"occupancy\"],.occupancy");
        if(occEl){
          var aM=occEl.textContent.match(/([0-9]+)\\s*(adult|người lớn)/i);
          room.maxAdults=aM?parseInt(aM[1]):2;
          var cM=occEl.textContent.match(/([0-9]+)\\s*(child|trẻ em)/i);
          room.maxChildren=cM?parseInt(cM[1]):0;
        }
        var sizeEl=row.querySelector("[class*=\"size\"],[class*=\"area\"]");
        if(sizeEl){var sM=sizeEl.textContent.match(/([0-9]+)\\s*m²/);room.roomSize=sM?parseInt(sM[1]):null}
        room.amenities=[];
        row.querySelectorAll("[class*=\"facility\"],[class*=\"amenity\"]").forEach(function(el){
          var t=el.textContent.trim();if(t.length>2)room.amenities.push(t);
        });
        room.gallery=[];
        row.querySelectorAll("img").forEach(function(img){
          var src=img.src||img.getAttribute("data-src")||"";
          if(src.indexOf("bstatic.com")!==-1)room.gallery.push(src);
        });
        rooms.push(room);
      });
      return JSON.stringify(rooms);
    })()`,

    reviews: /* js */ `(function(){
      var reviews=[];
      var blocks=document.querySelectorAll("[data-testid=\"review-card\"],.review_list .review-block");
      var count=0;
      blocks.forEach(function(block){
        if(count>=25)return;
        var r={};
        var n=block.querySelector("[class*=\"reviewer\"]");
        r.reviewerName=n?n.textContent.trim():"";
        var s=block.querySelector("[class*=\"score\"]");
        if(s){var m=s.textContent.match(/([0-9][.,]?[0-9]*)/);r.rating=m?parseFloat(m[1].replace(",",".")):null}
        var t=block.querySelector("[class*=\"review-text\"],[class*=\"review-content\"]");
        r.text=t?t.textContent.trim():"";
        var d=block.querySelector("[class*=\"date\"]");
        r.date=d?d.textContent.trim():"";
        if(r.text){reviews.push(r);count++}
      });
      return JSON.stringify(reviews);
    })()`,

    map: /* js */ `(function(){
      var scripts=document.querySelectorAll("script");
      for(var i=0;i<scripts.length;i++){
        var t=scripts[i].textContent||"";
        var latM=t.match(/["']latitude["']\\s*:\\s*(-?[0-9]+.?[0-9]*)/);
        var lngM=t.match(/["']longitude["']\\s*:\\s*(-?[0-9]+.?[0-9]*)/);
        if(latM&&lngM) return {lat:parseFloat(latM[1]),lng:parseFloat(lngM[1])};
        var cM=t.match(/(-?[0-9]+\\.[0-9]+)[,;]\\s*(-?[0-9]+\\.[0-9]+)/);
        if(cM) return {lat:parseFloat(cM[1]),lng:parseFloat(cM[2])};
      }
      return null;
    })()`,

    phone: /* js */ `(function(){
      var el=document.querySelector("[data-testid=\"property-phone\"],a[href^=\"tel:\"]");
      return el?(el.href?el.href.replace("tel:",""):el.textContent.trim()):"";
    })()`,

    website: /* js */ `(function(){
      var el=document.querySelector("a[href*=\"website\"],[class*=\"website\"] a");
      return el?el.href:"";
    })()`,
  };

  // Build the combined script
  const parts = Object.entries(extractors).map(([key, expr]) => `"${key}":${expr}`);
  return `JSON.stringify({${parts.join(',')}})`;
}

// ============================================================================
// Image Classification & Sorting
// ============================================================================

/**
 * Match image URLs to rooms by analyzing URL context in response text.
 * URLs near room name mentions are classified as room images.
 * @param {string[]} allUrls - All normalized, deduplicated image URLs
 * @param {Object[]} rooms - Room objects from structured extraction
 * @param {string} responseText - Raw text from page
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
   * @returns {string|null}
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
      const nameWords = normalizedName.split(' ').filter((w) => w.length > 2);
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
    if (type === 'room') {
      const matchedRoom = findMatchingRoom(url);
      if (matchedRoom && roomImageMap.has(matchedRoom)) {
        roomImageMap.get(matchedRoom).push(url);
        continue;
      }
    }
    hotelGallery.push(url);
  }

  return { hotelGallery, roomImageMap };
}

// ============================================================================
// Output Builder
// ============================================================================

/**
 * Build the final output object matching saveBookingDataSkill.js input schema.
 * @param {Object} extracted - Structured data from DOM extraction
 * @param {string[]} hotelGallery - Processed hotel gallery URLs
 * @param {Map<string, string[]>} roomImageMap - Room name → image URLs
 * @param {Object[]} rooms - Room definitions from extract
 * @param {string[]} warnings - Accumulated warnings
 * @returns {Object} Clean JSON matching saveBookingDataSkill.js input
 */
function buildOutput(extracted, hotelGallery, roomImageMap, rooms, warnings) {
  const extractGallery = Array.isArray(extracted.gallery)
    ? extracted.gallery.map(normalizeImageUrl)
    : [];
  const mergedHotelGallery = deduplicateUrls([...hotelGallery, ...extractGallery]).slice(0, 30);

  const featuredImage = normalizeImageUrl(extracted.featuredImage || mergedHotelGallery[0] || '');

  const outputRooms = (Array.isArray(extracted.rooms) ? extracted.rooms : rooms).map(
    (room, idx) => {
      const roomName = room.name || '';
      const roomImages = roomImageMap.get(roomName) || [];
      const dedupedRoomImages = deduplicateUrls(roomImages).slice(0, 7);
      return {
        name: roomName,
        description: room.description || '',
        bedType: room.bedType || '',
        maxAdults: room.maxAdults || 2,
        maxChildren: room.maxChildren || 0,
        maxGuests: room.maxGuests || (room.maxAdults || 2) + (room.maxChildren || 0),
        roomSize: room.roomSize || null,
        featuredImage: dedupedRoomImages[0] || '',
        gallery: dedupedRoomImages,
        amenities: Array.isArray(room.amenities) ? room.amenities : [],
        included: Array.isArray(room.included) ? room.included : [],
        totalRooms: room.totalRooms || 1,
        sortOrder: idx + 1,
      };
    },
  );

  const reviews = (Array.isArray(extracted.reviews) ? extracted.reviews : [])
    .slice(0, 25)
    .map((r, idx) => ({
      reviewerName: r.reviewerName || '',
      reviewerAvatar: r.reviewerAvatar || '',
      rating: r.rating || 0,
      text: r.text || '',
      date: r.date || '',
      country: r.country || '',
      sortOrder: idx + 1,
    }));

  // Infer tags from star rating and amenities
  const tags = Array.isArray(extracted.tags) ? [...extracted.tags] : [];
  if (extracted.starRating >= 4) tags.push('luxury');
  if (extracted.starRating === 5) tags.push('5-star');
  const amenityLower = (Array.isArray(extracted.amenities) ? extracted.amenities : []).map(
    (a) => (typeof a === 'string' ? a.toLowerCase() : ''),
  );
  if (amenityLower.some((a) => a.includes('pool') || a.includes('bể bơi'))) tags.push('pool');
  if (amenityLower.some((a) => a.includes('spa'))) tags.push('spa');
  if (amenityLower.some((a) => a.includes('beach') || a.includes('biển'))) tags.push('beach');

  return {
    name: extracted.name || '',
    starRating: extracted.starRating || null,
    address: extracted.address || null,
    description: extracted.description || '',
    excerpt:
      extracted.excerpt ||
      (extracted.description || '').replace(/<[^>]*>/g, '').slice(0, 200),
    featuredImage,
    gallery: mergedHotelGallery,
    amenities: Array.isArray(extracted.amenities) ? extracted.amenities : [],
    highlights: Array.isArray(extracted.highlights) ? extracted.highlights : [],
    rating: extracted.rating || { average: 0, count: 0 },
    policies: {
      checkIn: extracted.checkIn || '',
      checkOut: extracted.checkOut || '',
    },
    map: extracted.map || null,
    phone: extracted.phone || '',
    email: extracted.email || '',
    website: extracted.website || '',
    tags: [...new Set(tags)],
    rooms: outputRooms,
    reviews,
    _warnings: warnings,
  };
}

// ============================================================================
// Main Scrape Function
// ============================================================================

/**
 * Scrape toàn bộ dữ liệu khách sạn từ URL booking.com sử dụng agent-browser.
 *
 * Flow:
 * 1. Mở trang browser, chờ load, dismiss cookie
 * 2. Scroll để trigger lazy content
 * 3. Click "View details" rooms + gallery photos
 * 4. Evaluate DOM để lấy structured data
 * 5. Extract gallery image URLs từ page HTML
 * 6. Post-process: normalize, deduplicate, classify images by room
 * 7. Build output matching saveBookingDataSkill.js input schema
 *
 * @param {string} targetUrl - Booking.com hotel detail URL
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function scrapeHotelFromUrl(targetUrl) {
  /** @type {string[]} */
  const warnings = [];

  await initSession();
  try {
    // ── Step 1: Open page and wait for load ──────────────────────────
    log('info', 'Step 1/5: Opening page and waiting for content...');
    await openPage(targetUrl, { waitForLoad: true });
    await waitForNetworkIdle(5000);

    // Dismiss cookie banners
    await clickByText('Accept', { optional: true, timeout: 3000 });
    await clickByText('Đồng ý', { optional: true, timeout: 3000 });

    // ── Step 2: Scroll + expand content ─────────────────────────────
    log('info', 'Step 2/5: Scrolling and expanding room details...');
    await scroll('down', 1000);
    await waitForNetworkIdle(2000);
    await scroll('down', 1000);
    await waitForNetworkIdle(2000);

    // Click to expand room details ("View details" / "Xem chi tiết")
    await clickByText('View details', { optional: true, timeout: 5000 });
    await clickByText('Xem chi tiết', { optional: true, timeout: 5000 });
    await waitForNetworkIdle(2000);

    // ── Step 3: Open gallery to ensure photo URLs load ──────────────
    log('info', 'Step 3/5: Opening gallery to load photo URLs...');
    await clickByText('Photos', { optional: true, timeout: 5000 });
    await waitForText('×', 3000).catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));

    // ── Step 4: Extract structured data from DOM ────────────────────
    log('info', 'Step 4/5: Extracting structured data from DOM...');
    const extractScript = buildExtractScript();
    const dataRaw = await evaluate(extractScript);

    /** @type {Object} */
    let extracted = {};
    try {
      extracted = JSON.parse(dataRaw || '{}');
      // Parse nested JSON strings (rooms, reviews are stringified)
      if (typeof extracted.rooms === 'string') extracted.rooms = JSON.parse(extracted.rooms);
      if (typeof extracted.reviews === 'string') extracted.reviews = JSON.parse(extracted.reviews);
    } catch (e) {
      warnings.push(`DOM extraction JSON parse failed: ${e.message}`);
    }

    // Get page HTML for image URL extraction
    const pageHtml = await evaluate('document.documentElement.outerHTML');
    const pageText = await evaluate('document.body.innerText');

    log('info', `Extracted: "${extracted.name}" — ${Array.isArray(extracted.rooms) ? extracted.rooms.length : 0} rooms`);

    // Close gallery
    await clickByText('Close', { optional: true, timeout: 3000 });
    await clickByText('×', { optional: true, timeout: 3000 });

    // ── Step 5: Extract & process images ────────────────────────────
    log('info', 'Step 5/5: Processing image URLs...');
    let rawUrls = extractImageUrls(pageHtml);
    rawUrls = rawUrls.map((u) => normalizeImageUrl(u));
    rawUrls = deduplicateByImageId(rawUrls);

    const roomsFromExtraction = Array.isArray(extracted.rooms) ? extracted.rooms : [];
    const { hotelGallery, roomImageMap } = classifyAndSortImages(rawUrls, roomsFromExtraction, pageText);

    log('info', `Post-process: ${hotelGallery.length} hotel images, ${[...roomImageMap.entries()].filter(([, v]) => v.length > 0).length} rooms with images.`);

    // Build and return final output
    const output = buildOutput(extracted, hotelGallery, roomImageMap, roomsFromExtraction, warnings);
    return { success: true, data: output };
  } catch (err) {
    log('error', `Scrape error: ${err.message}`);
    return { success: false, error: err.message, data: null };
  } finally {
    await closeSession();
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  loadEnvConfig();

  const args = {};
  process.argv.slice(2).forEach((arg) => {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) args[match[1]] = match[2];
  });

  const targetUrl = args.url;

  if (!targetUrl) {
    console.error('Usage: node getHotelImages.mjs --url=https://www.booking.com/hotel/vn/...');
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
