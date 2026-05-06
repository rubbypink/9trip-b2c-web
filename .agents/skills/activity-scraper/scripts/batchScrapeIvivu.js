/**
 * batchScrapeIvivu.js — Batch scrape iVivu.com activity pages.
 *
 * Scrapes ALL activity detail pages from iVivu.com using Node.js HTTPS,
 * extracts structured data from Angular SSR HTML's embedded state JSON,
 * and saves temp JSON files matching the activity schema input format.
 *
 * Data source: <script id="appid01-state" type="application/json"> tag
 * which contains the full experience data including images, pricing, etc.
 *
 * Usage:
 *   node .agents/skills/activity-scraper/scripts/batchScrapeIvivu.js
 *
 * @module batchScrapeIvivu
 */

const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

// ─── Activity URLs from iVivu list page ─────────────────────────────

const ACTIVITY_URLS = [
  { title: "Phòng Chờ Sân Bay Phú Quốc", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/phu-quoc-phong-cho-cao-cap-sh-phu-quoc-1-dich-vu-phong-cho-san-bay-khoi-hanh-noi-dia-san-bay-quoc-te-phu-quoc/22037", price: 417000 },
  { title: "Vé Symphony Of The Sea Phú Quốc", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/symphony-of-the-sea-phu-quoc/21658", price: 450000 },
  { title: "Vé VinWonders Và Safari Phú Quốc", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/ve-cong-vien-giai-tri-vinwonders-phu-quoc-safari-phu-quoc-tuy-chon-cong-vien-giai-tri/9674", price: 345000 },
  { title: "Vé Show Kiss Of The Sea Phú Quốc", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/ve-show-kiss-of-the-sea-phu-quoc/10", price: 815000 },
  { title: "Vé Cáp Treo Sun World Hòn Thơm", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/ve-sun-world-phu-quoc-hon-thom/19", price: 105000 },
  { title: "Vé Grand World Phú Quốc", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/ve-vao-cong-grand-world-phu-quoc/9673", price: 190000 },
  { title: "Vé Ice Jungle Phú Quốc", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/ve-vao-cua-ice-jungle-phu-quoc-cong-vien-giai-tri-ky-thuat-so-va-trinh-dien-anh-sang-tai-phu-quoc-viet-nam/21566", price: 160000 },
  { title: "Xe đưa đón riêng từ sân bay Phú Quốc", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/xe-dua-don-rieng-tu-san-bay-phu-quoc-den-khach-san-pqc-dao-phu-quoc-viet-nam/22182", price: 318000 },
  { title: "Xe Đưa Đón Sân Bay Phú Quốc", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/dich-vu-xe-dua-don-san-bay-phu-quoc/1374", price: 254000 },
  { title: "Tour 3 Đảo Phú Quốc", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/tour-3-dao-phu-quoc-hon-mong-tay-hon-gam-ghi-va-hon-may-rut/274", price: 694000 },
  { title: "Tour 4 Đảo & Cáp Treo", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/tour-4-dao-phu-quoc-cap-treo-hon-thom-mong-tay-gam-ghi-may-rut/375", price: 1565000 },
  { title: "Trải Nghiệm Câu Mực Đêm", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/tour-trai-nghiem-cau-muc-dem-nam-dao-phu-quoc/1539", price: 331000 },
  { title: "Tour 4 đảo + Cáp Treo Hòn Thơm", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/tour-trong-ngay-tham-quan-4-dao-va-di-cap-treo-hon-thom/1538", price: 1842000 },
  { title: "Tour 3 Đảo Bao Gồm Cáp Treo", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/tour-trong-ngay-tour-3-dao-phu-quoc-bao-gom-cap-treo-hon-thom/1460", price: 1715000 },
  { title: "Tour 3 Đảo Junk Cruise", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/tour-ngay-tour-3-dao-phu-quoc-tren-du-thuyen-junk-tour-ghep-tau-tham-dao-trai-nghiem-lan-bien-bua-trua-hai-san-tren-thuyen-viet-nam/21571", price: 725000 },
  { title: "Làm Phi Hành Gia Dưới Đại Dương", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/trai-nghiem-lam-phi-hanh-gia-duoi-dai-duong-tai-hon-roi-bao-gom-dua-don-khach-san/1434", price: 1461000 },
  { title: "Workshop Làm Socola Thủ Công", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/trai-nghiem-so-co-la-phu-quoc-tham-quan-nha-may-so-co-la-dang-va-xuong-san-xuat-so-co-la/22100", price: 556000 },
  { title: "Tour Nam Đảo Phú Quốc", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/tour-tham-quan-nam-dao-phu-quoc-lang-chai-ham-ninh-chua-ho-quoc-va-nha-may-san-xuat-nuoc-mam/374", price: 612000 },
  { title: "Tour Nam Đảo + Cáp Treo", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/tour-tham-quan-nam-dao-phu-quoc-va-trai-nghiem-ngoi-cap-treo/368", price: 1600000 },
  { title: "Tour Bắc Phú Quốc", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/tour-trong-ngay-tour-chung-kham-pha-bac-phu-quoc-bai-sao-bien-trai-nghiem-thuyen-thung-tren-song-cua-can-viet-nam/21693", price: 1294000 },
  { title: "Tour Câu Cá Lớn", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/tour-ca-ngay-tour-cau-ca-lon/1386", price: 3494000 },
  { title: "Tour Câu Mực & Hoàng Hôn", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/tour-cau-muc-dem-phu-quoc-va-ngam-hoang-hon/273", price: 347000 },
  { title: "Xe Đưa Đón Sân Bay PQC", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/dua-don-xe-rieng-tu-san-bay-quoc-te-phu-quoc-pqc-den-thanh-pho-phu-quoc-va-nguoc-lai/1466", price: 491000 },
  { title: "Du thuyền Nemo Phú Quốc", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/du-thuyen-nemo-phu-quoc-hanh-trinh-ngam-binh-minh-hoang-hon-tu-phu-quoc-viet-nam/22012", price: 1294000 },
  { title: "Tour 3 đảo cao tốc", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/tour-3-dao-phu-quoc-bang-tau-cao-toc-hon-thom-hon-gam-ghi-hon-may-rut/370", price: 776000 },
  { title: "Vé thuyền thúng Phú Quốc", url: "https://www.ivivu.com/ve-vui-choi/hoat-dong/ve-thuyen-thung-o-phu-quoc/21920", price: 150000 },
];

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Slugify a string.
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
 * Fetch HTML from a URL with timeout.
 * @param {string} url
 * @param {number} [timeout=30000]
 * @returns {Promise<string>}
 */
function fetchHtml(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, {
      timeout,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).toString();
        return fetchHtml(redirectUrl, timeout).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve(data));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

/**
 * Unescape HTML entities in a string.
 * @param {string} str
 * @returns {string}
 */
function unescapeHtml(str) {
  return str
    .replace(/&q;/g, '"')
    .replace(/&l;/g, '<')
    .replace(/&g;/g, '>')
    .replace(/&a;/g, '&')
    .replace(/&n;/g, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Strip HTML tags from a string, keeping line breaks.
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Parse a VND price string to number.
 * @param {string|number} priceStr
 * @returns {number}
 */
function parsePrice(priceStr) {
  if (!priceStr) return 0;
  if (typeof priceStr === "number") return priceStr;
  const cleaned = priceStr.replace(/[^\d]/g, "");
  return parseInt(cleaned, 10) || 0;
}

// ─── Data Extraction ─────────────────────────────────────────────────

/**
 * Extract structured data from iVivu Angular SSR HTML.
 * Parses the embedded <script id="appid01-state"> JSON for accurate data.
 * @param {string} html
 * @param {Object} listInfo - Info from list page
 * @returns {Object} Extracted data matching activity schema
 */
function extractFromHtml(html, listInfo) {
  const title = listInfo.title;

  // ── Parse embedded state JSON ──────────────────────────────────────
  const scriptTag = '<script id="appid01-state" type="application/json">';
  const sIdx = html.indexOf(scriptTag);
  const eIdx = html.indexOf("</script>", sIdx);

  /** @type {Object|null} */
  let expData = null;
  /** @type {Array} */
  let packages = [];
  /** @type {Object|null} */
  let cityData = null;
  /** @type {Object|null} */
  let countryData = null;

  if (sIdx > -1 && eIdx > sIdx) {
    const raw = html.substring(sIdx + scriptTag.length, eIdx);
    const clean = unescapeHtml(raw);
    try {
      const stateData = JSON.parse(clean);
      const keys = Object.keys(stateData);
      const dataKey = keys.find((k) => k.includes("GetExperienceDetail"));
      if (dataKey && stateData[dataKey]?.data?.experience) {
        expData = stateData[dataKey].data.experience;
        packages = stateData[dataKey].data.experiencePackages || [];
        cityData = stateData[dataKey].data.city || null;
        countryData = stateData[dataKey].data.country || null;
      }
    } catch (e) {
      // Silently fail - will fall back to listInfo data
    }
  }

  // ── 1. Description ─────────────────────────────────────────────────
  let description = "";
  let excerpt = "";

  if (expData) {
    description = expData.overview || expData.descSeo || expData.programIntroduction || "";
    excerpt = expData.shortDescription?.replace(/<[^>]*>/g, "").slice(0, 200) || stripHtml(description).slice(0, 200);
  }

  if (!description) {
    const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
    description = metaDescMatch ? metaDescMatch[1] : "";
    excerpt = stripHtml(description).slice(0, 200);
  }

  if (!description) {
    description = `<p>${title} tại Phú Quốc</p>`;
    excerpt = `${title} tại Phú Quốc`;
  }

  // ── 2. Gallery images ──────────────────────────────────────────────
  let imageUrls = [];
  if (expData?.experienceImages) {
    imageUrls = expData.experienceImages
      .map((/** @type {{ imageLink: string }} */ img) => img.imageLink)
      .filter(Boolean);
  }

  // Fallback: regex extraction from HTML
  if (imageUrls.length === 0) {
    const imgRegex = /https?:\/\/cdn1\.ivivu\.com\/images\/[^\s"'<&]+/g;
    const matches = html.match(imgRegex) || [];
    imageUrls = matches
      .map((url) => url.replace(/\?w=\d+$/, ""))
      .filter((url) => !url.includes("avatar") && !url.includes("icon") && !url.includes("logo"))
      .filter((v, i, a) => a.indexOf(v) === i);
  }

  const featuredImage = imageUrls[0] || "";
  const gallery = imageUrls;

  // ── 3. Rating ──────────────────────────────────────────────────────
  let ratingAverage = expData?.avgPoint || 0;
  let ratingCount = expData?.numOfReview || 0;

  // ── 4. Pricing ─────────────────────────────────────────────────────
  /** @type {Object} */
  const pricing = {};

  // Try to build pricing from experiencePackages
  if (packages.length > 0) {
    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      const pkgName = pkg.name || pkg.packageName || `Gói ${i + 1}`;
      const pkgSlug = slugify(pkgName);
      // Try multiple price field names used by iVivu API
      const basePrice = pkg.publicPrice || pkg.salePrice || pkg.price || pkg.adultPrice || pkg.adult_price || 0;
      const salePrice = (pkg.salePrice || basePrice);
      const discount = basePrice > 0 ? Math.round((1 - salePrice / basePrice) * 100) : 0;

      if (basePrice > 0) {
        pricing[`price_${pkgSlug}`] = {
          id: `price_${pkgSlug}`,
          name: pkgName,
          description: pkg.description || pkg.shortDescription || "",
          basePrice: salePrice || basePrice,
          childPrice: pkg.childPrice || pkg.child_price || 0,
          currency: "VND",
          discountPercent: Math.max(0, discount),
        };
      }
    }
  }

  // Fallback: use experience-level publicPrice
  const expPrice = expData?.publicPrice || expData?.salePrice || 0;
  if (Object.keys(pricing).length === 0 && expPrice > 0) {
    pricing.price_default = {
      id: "price_default",
      name: "Vé tiêu chuẩn",
      description: `Vé ${title}`,
      basePrice: expPrice,
      childPrice: 0,
      currency: "VND",
      discountPercent: 0,
    };
  }

  // Fallback: use listInfo price
  if (Object.keys(pricing).length === 0 && listInfo.price > 0) {
    pricing.price_default = {
      id: "price_default",
      name: "Vé tiêu chuẩn",
      description: `Vé ${title}`,
      basePrice: listInfo.price,
      childPrice: 0,
      currency: "VND",
      discountPercent: 0,
    };
  }

  // ── 5. Location ────────────────────────────────────────────────────
  const location = "Phú Quốc";
  const locationDetail = expData?.address || "";

  // ── 6. Duration ────────────────────────────────────────────────────
  let duration = "";
  let durationDetail = "";
  if (expData?.duration) {
    duration = expData.duration;
  }
  if (!duration) {
    const durMatch = html.match(/(\d+\s*(giờ|ngày|phút|tiếng))/i);
    if (durMatch) duration = durMatch[1];
  }

  // ── 7. Highlights ──────────────────────────────────────────────────
  let highlights = [];
  if (expData?.overview) {
    const liItems = expData.overview.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    if (liItems) {
      highlights = liItems.map((/** @param {string} item */ item) => stripHtml(item)).filter(Boolean);
    }
  }

  // ── 8. Map coordinates ─────────────────────────────────────────────
  let map = null;
  if (expData?.latitude && expData?.longitude) {
    map = {
      lat: parseFloat(expData.latitude),
      lng: parseFloat(expData.longitude),
    };
  }

  // ── 9. Opening hours ──────────────────────────────────────────────
  let openingHours = "";
  if (expData?.notes) {
    const timeMatch = expData.notes.match(/(\d{1,2}:\d{2}\s*[-–to]+\s*\d{1,2}:\d{2})/i);
    if (timeMatch) openingHours = timeMatch[1];
  }
  if (!openingHours) {
    const hoursMatch = html.match(/(\d{1,2}:\d{2}\s*[-–to]+\s*\d{1,2}:\d{2})/i);
    if (hoursMatch) openingHours = hoursMatch[1];
  }

  // ── 10. Notes / Important info ─────────────────────────────────────
  let notes = [];
  if (expData?.notes) {
    const noteText = stripHtml(expData.notes);
    if (noteText.length > 20) {
      notes = noteText
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 10);
    }
  }

  // ── 11. Tags ────────────────────────────────────────────────────────
  const tags = ["phu-quoc"];
  const titleLower = title.toLowerCase();
  if (titleLower.includes("show") || titleLower.includes("symphony") || titleLower.includes("kiss")) tags.push("show");
  if (titleLower.includes("vinwonder") || titleLower.includes("safari") || titleLower.includes("vinpearl")) tags.push("theme-park");
  if (titleLower.includes("cap treo") || titleLower.includes("sun world")) tags.push("cable-car");
  if (titleLower.includes("tour")) tags.push("tour");
  if (titleLower.includes("xe") || titleLower.includes("dua don") || titleLower.includes("san bay")) tags.push("transport");
  if (titleLower.includes("ice") || titleLower.includes("jungle")) tags.push("attraction");
  if (titleLower.includes("grand world")) tags.push("attraction");
  if (titleLower.includes("phong cho") || titleLower.includes("lounge")) tags.push("airport-lounge");
  if (titleLower.includes("thuyen") || titleLower.includes("nemo") || titleLower.includes("du thuyen")) tags.push("cruise");
  if (titleLower.includes("cau muc") || titleLower.includes("cau ca")) tags.push("fishing");
  if (titleLower.includes("socola") || titleLower.includes("chocolate") || titleLower.includes("workshop")) tags.push("workshop");
  if (titleLower.includes("phi hanh gia") || titleLower.includes("ocean")) tags.push("diving");
  if (titleLower.includes("thuyen thung")) tags.push("basket-boat");

  // ── Build output ───────────────────────────────────────────────────
  return {
    title,
    duration: duration || "",
    durationDetail: durationDetail || "",
    location,
    locationDetail,
    description,
    excerpt,
    featuredImage,
    gallery,
    openingHours: openingHours || "",
    highlights: highlights.slice(0, 10),
    included: [],
    excluded: [],
    categories: tags.filter((t) => t !== "phu-quoc"),
    capacity: null,
    recommendation: "",
    childrenPolicy: "",
    cancellationPolicy: "",
    notes,
    purchaseGuide: [],
    rating: {
      average: ratingAverage,
      count: ratingCount,
    },
    map,
    faq: [],
    pricing,
    phone: "1900 2087",
    email: expData?.partnerEmail || "",
    website: expData?.urlDetail || "",
    tags,
    reviews: [],
    metaTitle: expData?.seotitle || title,
    metaDescription: expData?.descSeo || excerpt,
    _firecrawlCredits: 0,
    _source: "ivivu.com",
  };
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("  🎭  iVivu Activity Batch Scraper");
  console.log("=".repeat(60));
  console.log(`  Total activities: ${ACTIVITY_URLS.length}`);
  console.log("");

  const tempDir = path.resolve(__dirname, "../../../../.temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  /** @type {Array<{title: string, success: boolean, slug: string, error?: string}>} */
  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < ACTIVITY_URLS.length; i++) {
    const item = ACTIVITY_URLS[i];
    const slug = slugify(item.title);
    console.log(`[${i + 1}/${ACTIVITY_URLS.length}] ${item.title}`);

    try {
      console.log(`   📡 Fetching...`);
      const html = await fetchHtml(item.url, 30000);
      console.log(`   📄 Parsing (${(html.length / 1024).toFixed(0)}KB)...`);

      const data = extractFromHtml(html, item);
      data.title = item.title; // Use clean title from list

      // Save to temp file
      const filePath = path.join(tempDir, `scraped-activity-${slug}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");

      console.log(`   ✅ Saved: .temp/scraped-activity-${slug}.json`);
      console.log(`      Title: ${data.title}`);
      console.log(`      Gallery: ${data.gallery.length} images`);
      console.log(`      Price: ${data.pricing?.price_default?.basePrice || "N/A"}đ`);
      console.log(`      Rating: ${data.rating.average || "N/A"}/10 (${data.rating.count || 0} reviews)`);

      results.push({ title: item.title, success: true, slug });
      successCount++;
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message}`);
      results.push({ title: item.title, success: false, slug, error: err.message });
      failCount++;
    }

    // Small delay between requests
    if (i < ACTIVITY_URLS.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
    console.log("");
  }

  // Summary
  console.log("=".repeat(60));
  console.log("  📊 SUMMARY");
  console.log("=".repeat(60));
  console.log(`  ✅ Success: ${successCount}/${ACTIVITY_URLS.length}`);
  console.log(`  ❌ Failed: ${failCount}/${ACTIVITY_URLS.length}`);
  console.log("");

  if (results.filter((r) => r.success).length > 0) {
    console.log("  📁 Saved temp files:");
    for (const r of results) {
      if (r.success) {
        console.log(`     .temp/scraped-activity-${r.slug}.json`);
      }
    }
  }

  if (failCount > 0) {
    console.log("");
    console.log("  ❌ Failed activities:");
    for (const r of results) {
      if (!r.success) {
        console.log(`     - ${r.title}: ${r.error}`);
      }
    }
  }

  console.log("");
  console.log("  Next steps:");
  console.log("  Run save script for each activity:");
  console.log('  node .agents/skills/activity-scraper/scripts/saveActivityDataScript.js --input=.temp/scraped-activity-{slug}.json');
  console.log("");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
