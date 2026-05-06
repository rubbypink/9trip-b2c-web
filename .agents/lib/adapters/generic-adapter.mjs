/**
 * Generic Page Adapter — text-based extraction for any website.
 *
 * Uses regex patterns and text parsing to extract structured data
 * without requiring DOM selectors or specific site knowledge.
 *
 * @module generic-adapter
 * @version 1.0.0
 */

// ============================================================================
// Text-Based Extraction
// ============================================================================

/**
 * Extract structured data from raw page text.
 * No DOM manipulation - works with any scraped text content.
 *
 * @param {string} pageText - Raw text content from the page
 * @param {string} url - Source URL
 * @returns {Object} Extracted data
 */
export function extractFromPage(pageText, url) {
  const result = {
    source: url ? new URL(url).hostname : 'unknown',
    url: url || '',
    extractedAt: new Date().toISOString(),
    detectedType: detectType(pageText),
  };

  // ── Title ──────────────────────────────────────────────────────────────
  // Try h1 first, then og:title meta
  const h1Match = pageText.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const ogTitleMatch = pageText.match(/<meta[^>]*og:title[^>]*content=["']([^"']+)["']/i);
  const titleMatch = pageText.match(/<title>([^<]+)<\/title>/i);

  result.title = h1Match?.[1]?.trim()
    || ogTitleMatch?.[1]?.trim()
    || titleMatch?.[1]?.trim()
    || '';

  // ── Price Extraction ───────────────────────────────────────────────────
  result.prices = extractPrices(pageText);
  result.currency = detectCurrency(pageText);

  // ── Description ─────────────────────────────────────────────────────────
  const metaDescMatch = pageText.match(
    /<meta[^>]*(?:name=["']description["']|property=["']og:description["'])[^>]*content=["']([^"']+)["']/i
  );

  if (metaDescMatch?.[1]) {
    result.description = metaDescMatch[1].trim();
  } else {
    // Fallback: find first substantial paragraph
    const paragraphs = pageText.match(/<p[^>]*>([^<]{50,})<\/p>/gi);
    if (paragraphs?.[0]) {
      result.description = paragraphs[0]
        .replace(/<[^>]+>/g, '')
        .trim()
        .slice(0, 500);
    }
  }

  // Generate excerpt
  result.excerpt = (result.description || '').slice(0, 200);

  // ── Image URLs ──────────────────────────────────────────────────────────
  result.images = extractImages(pageText);

  // ── Features / List Items ───────────────────────────────────────────────
  result.features = extractFeatures(pageText);

  // ── JSON-LD Schema.org Parsing ──────────────────────────────────────────
  result.schema = parseJSONLD(pageText);

  // ── Links ───────────────────────────────────────────────────────────────
  result.links = extractLinks(pageText, url);

  // ── Contact Information ─────────────────────────────────────────────────
  result.contact = extractContactInfo(pageText);

  // ── Location Hints ──────────────────────────────────────────────────────
  result.location = extractLocationHints(pageText);

  return result;
}

// ============================================================================
// Type Detection
// ============================================================================

/**
 * Detect the type of content based on keywords in the text.
 *
 * @param {string} pageText - Raw page text
 * @returns {'tour'|'hotel'|'activity'|'unknown'} Detected content type
 */
export function detectType(pageText) {
  const text = pageText.toLowerCase();

  // Tour keywords
  const tourKeywords = [
    'tour', 'du lịch', 'travel package', 'itinerary', 'lịch trình',
    'ngày \d+ đêm \d+', 'departure', 'khởi hành', 'guide', 'hướng dẫn viên',
    'sightseeing', 'tham quan', 'điểm đến', 'destinations'
  ];

  // Hotel keywords
  const hotelKeywords = [
    'hotel', 'khách sạn', 'room', 'phòng', 'check in', 'check out',
    'nights', 'đêm', 'amenities', 'tiện nghi', 'booking', 'reservation',
    'suite', 'deluxe', 'superior', 'standard', 'wifi', 'breakfast', 'spa',
    'star', 'sao', 'reception', 'front desk'
  ];

  // Activity keywords
  const activityKeywords = [
    'activity', 'hoạt động', 'experience', 'trải nghiệm', 'ticket', 'vé',
    'adventure', 'mạo hiểm', 'cruise', 'du thuyền', 'snorkeling', 'lặn',
    'hiking', 'trekking', 'workshop', 'class', 'lesson', 'lesson',
    'entrance fee', 'phí vào cửa', 'duration', 'thờ lượng'
  ];

  let tourScore = tourKeywords.filter(k => text.includes(k)).length;
  let hotelScore = hotelKeywords.filter(k => text.includes(k)).length;
  let activityScore = activityKeywords.filter(k => text.includes(k)).length;

  // Weight by specific phrases
  if (text.includes('tour trọn gói')) tourScore += 3;
  if (text.includes('đặt phòng khách sạn')) hotelScore += 3;
  if (text.includes('vé tham quan')) activityScore += 2;

  const maxScore = Math.max(tourScore, hotelScore, activityScore);

  if (maxScore === 0) return 'unknown';
  if (maxScore === tourScore) return 'tour';
  if (maxScore === hotelScore) return 'hotel';
  return 'activity';
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract prices from text using regex patterns.
 * @param {string} text - Page text
 * @returns {Array<{value: number, currency: string, context: string}>}
 */
function extractPrices(text) {
  const prices = [];

  // VND patterns
  const vndPatterns = [
    /(\d[\d.,\s]*)\s*(?:đ|đồng|vnd|₫)/gi,
    /(?:giá|price)[\s:]*(\d[\d.,\s]*)/gi,
  ];

  // USD patterns
  const usdPatterns = [
    /\$\s*(\d[\d.,]*)/g,
    /(\d[\d.,]*)\s*(?:usd|\$)/gi,
  ];

  // EUR patterns
  const eurPatterns = [
    /€\s*(\d[\d.,]*)/g,
    /(\d[\d.,]*)\s*(?:eur|€)/gi,
  ];

  const extractWithPattern = (patterns, currency) => {
    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const value = parseFloat(match[1].replace(/[\s,]/g, ''));
        if (value > 1000 && value < 100000000) { // Reasonable price range
          // Get surrounding context
          const start = Math.max(0, match.index - 50);
          const end = Math.min(text.length, match.index + match[0].length + 50);
          const context = text.slice(start, end).replace(/\s+/g, ' ').trim();

          prices.push({ value, currency, context });
        }
      }
    });
  };

  extractWithPattern(vndPatterns, 'VND');
  extractWithPattern(usdPatterns, 'USD');
  extractWithPattern(eurPatterns, 'EUR');

  // Remove duplicates
  const seen = new Set();
  return prices.filter((p) => {
    const key = `${p.value}-${p.currency}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Detect primary currency from text.
 * @param {string} text - Page text
 * @returns {string} Currency code
 */
function detectCurrency(text) {
  const lower = text.toLowerCase();
  if (lower.includes('vnd') || lower.includes('đồng') || lower.includes('₫')) return 'VND';
  if (lower.includes('usd') || lower.match(/\$\d/)) return 'USD';
  if (lower.includes('eur') || lower.includes('€')) return 'EUR';
  return 'VND'; // Default
}

/**
 * Extract all image URLs from page text.
 * @param {string} text - Page text
 * @returns {string[]} Image URLs
 */
function extractImages(text) {
  const images = new Set();

  // img src
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(text)) !== null) {
    const url = match[1];
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) {
      images.add(url);
    }
  }

  // data-src (lazy loading)
  const lazyRegex = /data-src=["']([^"']+)["']/gi;
  while ((match = lazyRegex.exec(text)) !== null) {
    const url = match[1];
    if (url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
      images.add(url);
    }
  }

  // Background images
  const bgRegex = /background(?:-image)?\s*:\s*url\(["']?([^"')]+)["']?\)/gi;
  while ((match = bgRegex.exec(text)) !== null) {
    images.add(match[1]);
  }

  // Meta og:image
  const ogImageRegex = /<meta[^>]*og:image[^>]*content=["']([^"']+)["']/i;
  const ogMatch = text.match(ogImageRegex);
  if (ogMatch?.[1]) {
    images.add(ogMatch[1]);
  }

  return [...images];
}

/**
 * Extract list items/features from text.
 * @param {string} text - Page text
 * @returns {string[]} Features
 */
function extractFeatures(text) {
  const features = new Set();

  // List items
  const liRegex = /<li[^>]*>([^<]{10,100})<\/li>/gi;
  let match;
  while ((match = liRegex.exec(text)) !== null) {
    const item = match[1].replace(/<[^>]+>/g, '').trim();
    if (item.length > 10 && item.length < 200) {
      features.add(item);
    }
  }

  // Bullet points in text
  const bulletRegex = /^\s*[•\-\*]\s*(.+)$/gim;
  while ((match = bulletRegex.exec(text)) !== null) {
    const item = match[1].trim();
    if (item.length > 10 && item.length < 200) {
      features.add(item);
    }
  }

  return [...features];
}

/**
 * Parse JSON-LD schema.org data.
 * @param {string} text - Page text
 * @returns {Object|null} Parsed schema data
 */
function parseJSONLD(text) {
  const schemas = [];
  const jsonLdRegex = /<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;

  let match;
  while ((match = jsonLdRegex.exec(text)) !== null) {
    try {
      const json = JSON.parse(match[1].trim());
      schemas.push(json);
    } catch {
      // Invalid JSON, skip
    }
  }

  // Return most relevant schema
  if (schemas.length === 0) return null;
  if (schemas.length === 1) return schemas[0];

  // Prefer specific types
  const priorityTypes = ['LodgingReservation', 'TouristAttraction', 'Product', 'Place'];
  for (const type of priorityTypes) {
    const found = schemas.find(s =>
      s['@type'] === type ||
      (Array.isArray(s['@type']) && s['@type'].includes(type))
    );
    if (found) return found;
  }

  return schemas[0];
}

/**
 * Extract links from page text.
 * @param {string} text - Page text
 * @param {string} baseUrl - Base URL for resolving relative links
 * @returns {Array<{url: string, text: string}>}
 */
function extractLinks(text, baseUrl) {
  const links = [];
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;

  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    let url = match[1];
    const linkText = match[2].trim();

    // Skip anchors and javascript
    if (url.startsWith('#') || url.startsWith('javascript:')) continue;

    // Resolve relative URLs
    if (baseUrl && !url.match(/^https?:\/\//i)) {
      try {
        url = new URL(url, baseUrl).href;
      } catch {
        continue;
      }
    }

    links.push({ url, text: linkText });
  }

  return links;
}

/**
 * Extract contact information from text.
 * @param {string} text - Page text
 * @returns {Object} Contact info
 */
function extractContactInfo(text) {
  const contact = {
    phone: '',
    email: '',
    website: '',
  };

  // Phone patterns
  const phoneRegex = /(?:tel[:\s]*)?(?:\+?84|0)\d{9,10}/g;
  const phones = text.match(phoneRegex);
  if (phones?.[0]) {
    contact.phone = phones[0];
  }

  // Email patterns
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = text.match(emailRegex);
  if (emails?.[0]) {
    contact.email = emails[0];
  }

  // Website from URL
  const urlMatch = text.match(/https?:\/\/[^\s"<>]+/);
  if (urlMatch) {
    contact.website = urlMatch[0];
  }

  return contact;
}

/**
 * Extract location hints from text.
 * @param {string} text - Page text
 * @returns {Object} Location hints
 */
function extractLocationHints(text) {
  const location = {
    city: '',
    country: '',
    address: '',
  };

  // Vietnamese cities
  const cityRegex = /(Hà Nội|TP\.?\s*Hồ Chí Minh|Đà Nẵng|Huế|Hội An|Nha Trang|Phú Quốc|Đà Lạt|Sapa|Hạ Long)/i;
  const cityMatch = text.match(cityRegex);
  if (cityMatch) {
    location.city = cityMatch[1];
  }

  // Address patterns
  const addressRegex = /(?:địa chỉ|address)[:\s]*([^\n<]{10,100})/i;
  const addressMatch = text.match(addressRegex);
  if (addressMatch) {
    location.address = addressMatch[1].trim();
  }

  return location;
}

export default { extractFromPage, detectType };
