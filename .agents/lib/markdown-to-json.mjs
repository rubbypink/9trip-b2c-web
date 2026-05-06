/**
 * Markdown-to-JSON Converter — converts scraped markdown/text into structured JSON
 * matching 9Trip Firestore schemas for tours, hotels, and activities.
 *
 * @module markdown-to-json
 * @version 1.0.0
 */

import { slugify } from './scrape-helpers.mjs';
import { normalizeImageUrl, deduplicateByContent } from './image-helpers.mjs';

/**
 * Convert scraped markdown/text to structured JSON.
 * @param {string} markdown - Raw markdown/text from page scrape
 * @param {'tour'|'hotel'|'activity'} type - Content type
 * @param {string} [url] - Source URL (for slug extraction)
 * @returns {Object} Structured data matching the respective schema
 */
export function markdownToJson(markdown, type, url = '') {
  if (!markdown || typeof markdown !== 'string') return {};

  switch (type) {
    case 'tour': return extractTour(markdown, url);
    case 'hotel': return extractHotel(markdown, url);
    case 'activity': return extractActivity(markdown, url);
    default: return {};
  }
}

// ============================================================================
// TOUR EXTRACTION
// ============================================================================

function extractTour(md, url) {
  const result = {};
  const body = md;

  // Title
  const h1 = body.match(/^#\s*\*?\*?(.+?)\*?\*?\s*$/m);
  result.title = h1 ? h1[1].replace(/\*\*/g, '').trim() : '';

  // Slug
  result.slug = url ? extractSlug(url) : slugify(result.title);

  // Duration
  const dur = body.match(/(\d+)\s*[Nn]gày\s*(\d+)\s*[Đđ]êm/);
  result.duration = dur ? `${dur[1]} ngày ${dur[2]} đêm` : '';
  result.durationDays = dur ? parseInt(dur[1]) : null;

  // Location
  const loc = body.match(/Khởi hành từ[:\s]*([^\n]{2,30})/);
  result.departureCity = loc ? loc[1].trim().split(/\s{2,}/)[0] : '';
  result.location = 'Phú Quốc';

  // Pricing
  const price = body.match(/Từ\s*([\d.,]+)\s*đ\/khách/) || body.match(/([\d.,]+)\s*đ\/khách/);
  result.adultPrice = price ? parseInt(price[1].replace(/[.,]/g, '')) : null;
  result.childPrice = extractChildFromText(body);
  result.currency = 'VND';

  // Description (from meta or first substantial paragraph)
  result.description = extractMetaContent(body, 'description') || extractMetaContent(body, 'og:description') || '';
  result.excerpt = (result.description || '').slice(0, 200);

  // Gallery
  const cdnImgs = body.match(/https?:\/\/[^\s)"'<>]+\.(?:gif|jpg|jpeg|png|webp)/gi) || [];
  const deduped = deduplicateByContent(cdnImgs);
  result.gallery = deduped.map((u) => normalizeImageUrl(u, 1200)).slice(0, 30);
  result.featuredImage = result.gallery[0] || '';

  // Highlights
  result.highlights = extractSectionItems(body, 'Điểm Nổi Bật', 'Chương trình tour|Lịch trình');

  // Itinerary
  result.itinerary = extractItinerary(body);

  // Included / Excluded
  result.included = extractSectionItems(body, 'Giá Tour Bao Gồm', 'Giá Tour Không Bao Gồm');
  result.excluded = extractSectionItems(body, 'Giá Tour Không Bao Gồm', 'Điều Khoản|Chính sách');

  // Categories
  result.categories = ['Tour Trọn Gói', 'Du lịch Phú Quốc'];
  if (result.departureCity) result.categories.push(`Tour từ ${result.departureCity}`);

  // Meta
  result.metaTitle = extractMetaContent(body, 'og:title') || result.title;
  result.metaDescription = extractMetaContent(body, 'og:description') || result.excerpt;
  result.tags = ['Phú Quốc', 'Tour', result.departureCity].filter(Boolean);
  result.isFeatured = false;
  result.status = 'active';

  return result;
}

// ============================================================================
// HOTEL EXTRACTION
// ============================================================================

function extractHotel(md, url) {
  const result = {};

  result.name = (md.match(/^#\s*(.+)/m) || [])[1]?.trim() || '';
  result.slug = url ? extractSlug(url) : slugify(result.name);

  const stars = md.match(/(\d)[\s-]star/i);
  result.starRating = stars ? parseInt(stars[1]) : null;

  result.description = extractMetaContent(md, 'description') || '';
  result.excerpt = result.description.slice(0, 200);

  const cdnImgs = md.match(/https?:\/\/[^\s)"'<>]+\.(?:jpg|jpeg|png|webp)/gi) || [];
  result.gallery = [...new Set(cdnImgs)].slice(0, 30);
  result.featuredImage = result.gallery[0] || '';

  result.amenities = extractSectionItems(md, 'Amenities|Facilities|Tiện nghi', 'Rooms|Reviews|Đánh giá');
  result.highlights = extractSectionItems(md, 'Highlights|Điểm nổi bật', 'Amenities|Rooms');
  result.rating = { average: 0, count: 0 };

  result.rooms = [];
  result.isFeatured = false;
  result.status = 'active';

  return result;
}

// ============================================================================
// ACTIVITY EXTRACTION
// ============================================================================

function extractActivity(md, url) {
  const result = {};

  result.title = (md.match(/^#\s*(.+)/m) || [])[1]?.trim() || '';
  result.slug = url ? extractSlug(url) : slugify(result.title);

  result.duration = '';
  result.location = '';
  result.description = extractMetaContent(md, 'description') || '';
  result.excerpt = result.description.slice(0, 200);

  const cdnImgs = md.match(/https?:\/\/[^\s)"'<>]+\.(?:jpg|jpeg|png|webp|gif)/gi) || [];
  result.gallery = [...new Set(cdnImgs)].slice(0, 30);
  result.featuredImage = result.gallery[0] || '';

  result.highlights = extractSectionItems(md, 'Điểm nổi bật|Highlights', 'Bao gồm|Included');
  result.included = extractSectionItems(md, 'Bao gồm|Included', 'Không bao gồm|Excluded');
  result.excluded = extractSectionItems(md, 'Không bao gồm|Excluded', 'Chính sách|Policy|FAQ');

  result.pricing = { basePrice: 0, adultPrice: 0, childPrice: null, currency: 'VND', tiers: [] };
  result.faq = [];
  result.isFeatured = false;
  result.status = 'active';

  return result;
}

// ============================================================================
// SHARED HELPERS
// ============================================================================

function extractSlug(url) {
  try {
    return new URL(url).pathname.replace(/\/$/, '').split('/').pop() || '';
  } catch { return ''; }
}

function extractMetaContent(text, name) {
  const re = new RegExp(`${name}["']\\s*content=["']([^"']+)["']`, 'i');
  const m = text.match(re);
  return m ? m[1] : '';
}

function extractSectionItems(text, startPattern, stopPattern) {
  const startRe = new RegExp(startPattern, 'i');
  const startMatch = text.match(startRe);
  if (!startMatch) return [];

  const sectionStart = startMatch.index + startMatch[0].length;
  let sectionEnd = text.length;
  if (stopPattern) {
    const stopRe = new RegExp(stopPattern, 'i');
    const stopMatch = text.substring(sectionStart).match(stopRe);
    if (stopMatch) sectionEnd = sectionStart + stopMatch.index;
  }

  const section = text.substring(sectionStart, sectionEnd);

  // Try bullet points
  const bullets = section.match(/[-•✓✔>]\s*.+/g);
  if (bullets && bullets.length >= 2) {
    return bullets.map((l) => l.replace(/^[-•✓✔>]\s*/, '').trim()).filter((t) => t.length > 5 && t.length < 300 && !t.startsWith('!['));
  }

  // Fallback: plain text lines
  return section.split('\n').map((l) => l.trim()).filter((t) => t.length > 10 && t.length < 300 && !t.startsWith('#') && !t.startsWith('!['));
}

function extractItinerary(body) {
  const days = [];
  const dayRegex = /\*\*Ngày\s*(\d+)\s*([^*]+?)(?:\s*\(([^)]*)\))?\*\*/g;
  let m;
  while ((m = dayRegex.exec(body)) !== null) {
    days.push({ day: parseInt(m[1]), title: m[2].trim(), meals: m[3] || '' });
  }

  if (days.length === 0) {
    const dayRegex2 = /Ngày\s*(\d+)[\s:]*([^(\n]+?)(?:\s*\(([^)]+)\))?/g;
    while ((m = dayRegex2.exec(body)) !== null) {
      if (!days.find((d) => d.day === parseInt(m[1]))) {
        days.push({ day: parseInt(m[1]), title: m[2].trim(), meals: m[3] || '' });
      }
    }
  }
  return days;
}

function extractChildFromText(text) {
  const patterns = [
    /(?:trẻ em|child|children|em bé)[^\d]*([\d.,]+)\s*[đd]/i,
    /(?:trẻ em|child|children|em bé)[^\d]*([\d.,]+)\s*VN[DĐ]/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return parseInt(m[1].replace(/[.,]/g, ''));
  }
  return null;
}

export default { markdownToJson };
