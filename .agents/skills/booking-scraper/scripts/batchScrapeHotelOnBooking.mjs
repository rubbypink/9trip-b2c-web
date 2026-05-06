import {FireCrawl, saveFileSync} from '../../../lib/firecrawc.mjs';
import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';
import { scrapeHotelFromUrl } from './getHotelImages.js';


/**
 * Lược đồ JSON Schema ép Firecrawl trả về cấu trúc dữ liệu chính xác 100%
 * (Dựa trên EXTRACT_PROMPT của bạn)
 */
const hotelDataSchema = {
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
 * @param {Object} extracted - Structured data from FireCrawl extract
 * @param {string[]} hotelGallery - Processed hotel gallery URLs
 * @param {Map<string, string[]>} roomImageMap - Room name → image URLs
 * @param {Object[]} rooms - Room definitions from extract
 * @param {number} totalCredits - Total FireCrawl credits used
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

async function batchOldStyles(urls) {
  const processedResults = await Promise.all(urls.map(async (url) => {
  try {
    const result = await scrapeHotelFromUrl(url);
    if (!result || result.status !== "success" || !result.data) {
      console.log(`⚠️ No data returned for ${url}`);
      return null;
    } else return result;
  } catch (error) {
    console.error(`Error occurred while scraping ${url}:`, error);
    return null;
  }
  }));


  const finalData = processedResults.filter(r => r !== null);
  console.log(`✅ Processed ${finalData.length}/${urls.length} hotels successfully with old styles.`);
  if (finalData.length > 0) {
    await saveToDatabaseViaCLI(finalData);
  }
}

/**
 * Scrape toàn bộ dữ liệu khách sạn từ một mảng URL booking.com.
 * Sử dụng Advanced Batch Scraping.
 *
 * @param {string[]} targetUrls - Mảng các link trang chi tiết khách sạn
 * @returns {Promise<{success: boolean, results: Object[], errors: Object[]}>}
 */
async function scrapeHotelsBatch(targetUrls) {
    if (!targetUrls || !Array.isArray(targetUrls) || targetUrls.length === 0) {
        setTimeout(async () => {          
          const newDataFile = await fs.readFileSync('.agents\\lib\\phuquoc_hotel_links.json', 'utf8');
          const data = JSON.parse(newDataFile);
          console.log(`⚡ Đã đọc file JSON, bắt đầu batch scrape với ${data} URL...`);
          targetUrls = Array.isArray(data) && typeof data[0] === 'string' ? data.slice(0, 3) : Array.isArray(data) ? data.map(link => link?.url || link).slice(0, 3) : Object.values(data).slice(0, 3); // Giới hạn 3 link đầu tiên để test
        }, 100);
    } else if (!targetUrls) {
      const data = JSON.parse(dataFile);
      targetUrls = Array.isArray(data) && typeof data[0] === 'string' ? data.slice(0, 3) : data.map(link => link.url || link).slice(0, 3);
    } 

  const app = FireCrawl;
  
  console.log(`🚀 Bắt đầu Batch Scrape cho ${targetUrls?.length} khách sạn...`);

  try {
    const batchResult = await FireCrawl.batchScrape(targetUrls, {
      // 1. Khai báo các hành động (Actions) bằng CSS Selectors
      actions: [
        { type: "scroll", direction: "down" },
        { type: "wait", milliseconds: 1000 },

        { type: "scroll", direction: "down" },
        
        { type: "wait", milliseconds: 1000 },
        
        { type: "wait", selector : '[data-testid="PropertySectionsBelowRoomsTable-wrapper"]' },
        { type: "scroll", direction: "down" },
        // ⚠️ BẠN CẦN THAY CÁC SELECTOR NÀY BẰNG SELECTOR THỰC TẾ TRÊN BOOKING.COM
        // Click tất cả các nút mở thông tin phòng
        { type: "click", selector: ".hprt-roomtype-link", all: true },
        { type: "wait", milliseconds: 1000 },
        
        // Click để load ảnh gallery
        // { type: "click", selector: "picture", all: true },
        // { type: "wait", milliseconds: 500 },
        // {
        //   type: 'executeJavascript',
        //   script: 'document.querySelectorAll(\'[data-testid="rp-content"] picture\').forEach((img) => {img.click();})'
        // },
        // { type: "wait", milliseconds: 500 },
        
      ],
      waitFor: 1000,
      location: {country: 'VN'},
      removeBase64Images: true,
      blockAds: true,
      proxy: 'auto',
      storeInCache: true,
      maxConcurrency: 10, // Chạy song song 2 khách sạn để tăng tốc nhưng không quá tải
      onlyMainContent: true,
      maxAge: 172800000,
      minAge: 123,
      formats: [
        {
        type: "json",
        prompt: `Role: You are a 9Trip B2C hotel data extraction specialist. Extract structured data from this booking.com hotel page.

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
        
        Return ONLY a JSON object matching the schema. No extra text, no markdown.
        **CRITICAL INSTRUCTION FOR ROOM DETAILS**: You must find and open all room details popup by click room title (text display is Room Name). After opening the popup, the room gallery images are NOT in standard <img> tags. You must actively search for div elements with 'aria-roledescription="slide"' and extract the full absolute URLs from their inline styles (e.g., style="background-image: url('TARGET_URL')")  or find all tag 'picture' to get the URLs. Clean up the URLs by removing '&quot;' or url() wrappers.`,
        schema: hotelDataSchema
      },
      {type: "markdown"},
      ],
      timeout: 600000, // Tăng timeout lên 10 phút cho mỗi khách sạn vì có nhiều hành động
      maxDiscoveryDepth: 2, // Chỉ quét trang chính của khách sạn, không đi sâu vào các liên kết khác
    });
    log("info", "Step 3/4: Final structured data extraction...");
    if (batchResult.status === "completed") {
        console.log(`⚡ API phản hồi thành công. Bắt đầu xử lý Post-process Async...`);
        
        // Xử lý hậu kỳ đa luồng với Promise.all
        const processedResults = await Promise.all(batchResult.data.map(async (item, index) => {
          let cleanOutput = item.json || item.markdown || item.output || "";
          cleanOutput = cleanOutput.replace(/```json\n?/, "").replace(/```\n?$/, "").trim();
          // if (!item.json) {
          //    console.log(`⚠️ Bỏ qua URL #${index} do không có dữ liệu JSON.`);
          //    return null;
          // }
  
          try {
            const structuredData = [...cleanOutput];
            const finalMarkdown = item.markdown || item.output || "";
            await fs.writeFileSync(`debug_hotel_${index + 1}.md`, JSON.stringify(cleanOutput, null, 2), "utf-8");

            // Gọi các hàm xử lý logic cũ của bạn
            let rawUrls = extractImageUrls(finalMarkdown);
            rawUrls = rawUrls.map(normalizeImageUrl);
            rawUrls = deduplicateUrls(rawUrls);
            
            const roomsFromExtraction = Array.isArray(structuredData.rooms) ? structuredData.rooms : [];
            const { hotelGallery, roomImageMap } = classifyAndSortImages(rawUrls, roomsFromExtraction, finalMarkdown);
            
            return buildOutput(structuredData, hotelGallery, roomImageMap, roomsFromExtraction, 0, []);
          } catch (err) {
            console.error(`❌ Lỗi xử lý item #${index}:`, err.message);
            return null;
          }
        }));
  
        // Lọc các kết quả hợp lệ
        const finalData = processedResults.filter(r => r !== null);
        console.log(`✅ Xử lý xong ${finalData.length}/${targetUrls.length} khách sạn hợp lệ.`);
  
        // Đẩy qua script saveBookingData.js
        if (finalData.length > 0) {
          await saveToDatabaseViaCLI(finalData);
        }
  
        return { success: true, count: finalData.length, data: finalData };
      } else {
        throw new Error(`Batch job ended with status: ${batchResult.status}`);
      }
  
    } catch (error) {
      console.error(`❌ Lỗi hệ thống:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async function saveToDatabaseViaCLI(data) {
    // Tạo tên file tạm thời có gắn timestamp để tránh trùng lặp nếu chạy nhiều batch
    const tempPath = path.resolve(`./temp_booking_data_${Date.now()}.json`);
    
    console.log(`💾 Đang ghi ${data.length} records ra file tạm: ${tempPath}`);
    await fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    
    const cmd = `node .agents/skills/booking-scraper/scripts/saveBookingDataSkill.js --input="${tempPath}"`;
    console.log(`🚀 Đang thực thi: ${cmd}`);
  
    return new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {

  
        if (error) {
          console.error(`❌ Lỗi khi chạy saveBookingData: ${error.message}`);
          if (stderr) console.error(`⚠️ Chi tiết lỗi: ${stderr}`);
          return reject(error);
        }
        
        console.log(`✅ Kết quả lưu DB:\n${stdout}`);
        resolve(stdout);
      });
    });
  }


  const urls =  [
    "https://www.booking.com/hotel/vn/thien-thanh-thanh-pho-phu-quoc.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    ];
    
  const urls2 = [
    "https://www.booking.com/hotel/vn/the-hill-sunset-town-apartment-phu-quoc.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/sunset-beach-phu-quoc-resort-amp-spa.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/salinda-premium-resort-and-spa.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/m-phu-quoc.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/crowne-plaza-phu-quoc-starbay.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/sole-casa.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/dad-resort.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/amarin-resort-phu-quoc.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/tr-apart-villas-phu-quoc.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/sheraton-phu-quoc-long-beach-resort.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/solaro-amp-spa.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/la-festa-phu-quoc-curio-collection-by-hilton.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/radisson-blu-resort-phu-quoc.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/vinpearl-resort-phu-quoc.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/soul-boutique-phu-quoc.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/the-seashell.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/moc-lam-bungalow-phu-quoc-phu-quoc.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/crystal-apartment-hillside-phu-quoc-sunset-town-amp-firework.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/you-amp-we-phu-quoc-seafront-resort.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/thien-thanh-thanh-pho-phu-quoc.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/mercury-phu-quoc-resort-and-villas.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/m-village.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/marina-seaside.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/worldhotels-long-beach-resort-phu-quoc.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/bauhinia-resort.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
    "https://www.booking.com/hotel/vn/montana-resort-thanh-pho-phu-quoc.vi.html?aid=356980&label=gog235jc-10CAQoggJCDWNpdHlfLTM3MjYxNzdIKlgDaJUCiAEBmAEzuAEZyAEM2AED6AEB-AEBiAIBqAIBuAL-meTPBsACAdICJDNmZWJmNjM0LTQ3MzMtNGViYS1iY2M4LTNmMzk3M2NiYjRkMdgCAeACAQ",
  ]
  scrapeHotelsBatch(urls);