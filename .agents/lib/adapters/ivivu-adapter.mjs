/**
 * iVIVU.com Tour Adapter — extracts structured tour data from ivivu.com pages.
 *
 * Two extraction modes:
 *   1. extractFromDOM() — runs inside Playwright's page.evaluate(), zero Firecrawl credits
 *   2. extractFromMarkdown() — parses Firecrawl scrape() markdown output (1 Firecrawl credit)
 *   3. extractWithLazyRendering() — uses agent-browser CLI for lazy content interaction
 *
 * @module ivivu-adapter
 * @version 2.0.0
 */

import { normalizeImageUrl, deduplicateByContent } from '../image-helpers.mjs';
import { slugify } from '../scrape-helpers.mjs';

// ============================================================================
// DOM-Based Extraction (Playwright browser context)
// ============================================================================

export function extractFromDOM() {
  const body = document.body.innerText;
  const result = {};

  // Title
  const h1 = document.querySelector('h1');
  result.title = h1?.textContent?.trim() || document.title?.split(' - ')[0]?.trim() || '';

  // Slug
  result.slug = document.location.pathname
    .replace(/^\/du-lich\//, '')
    .replace(/\/\d+$/, '')
    .replace(/\/$/, '') || '';

  // Duration
  const durMatch = body.match(/(\d+)\s*[Nn]gày\s*(\d+)\s*[Đđ]êm/);
  result.duration = durMatch ? `${durMatch[1]} ngày ${durMatch[2]} đêm` : '';
  result.durationDays = durMatch ? parseInt(durMatch[1]) : null;

  // Location
  result.location = 'Phú Quốc';
  const depMatch = body.match(/Khởi hành từ[:\s]*([^\n]{2,30})/);
  result.departureCity = depMatch ? depMatch[1].trim().split(/\s{2,}/)[0].trim() : '';
  result.address = result.departureCity || '';

  // Pricing - with enhanced child pricing detection
  result = extractPricingWithLazyHints(result, body);

  // Description
  const metaDesc =
    document.querySelector('meta[name="description"]')?.content ||
    document.querySelector('meta[property="og:description"]')?.content ||
    '';
  result.description = metaDesc;
  result.excerpt = metaDesc.replace(/<[^>]*>/g, '').slice(0, 200);

  // Gallery
  result.gallery = extractGallery();
  result.featuredImage = result.gallery[0] || '';

  // Highlights
  const overviewEls = document.querySelectorAll('.tourOverview p, .tourOverviewContainer p, [class*="tourOverview"] p');
  result.highlights = [...overviewEls]
    .map((el) => el.textContent.trim())
    .filter((t) => t.length > 10);

  // Itinerary - with enhanced detail extraction
  result.itinerary = extractItineraryWithDetails(body);

  // Included / Excluded
  result.included = extractIncluded(body);
  result.excluded = extractExcluded(body);

  // Categories
  result.categories = ['Tour Trọn Gói', 'Du lịch Phú Quốc'];
  if (result.departureCity) result.categories.push(`Tour từ ${result.departureCity}`);

  // Policies & Notes
  result.cancellationPolicy = extractSection(body, 'Chính sách hủy', 'Điều kiện tham gia');
  result.childrenPolicy = extractSection(body, 'Chính sách trẻ em', 'Chính sách hủy');
  result.notes = extractNotes(body);

  // Meta
  result.metaTitle = document.querySelector('meta[property="og:title"]')?.content || result.title;
  result.metaDescription = document.querySelector('meta[property="og:description"]')?.content || '';
  result.ogImage = document.querySelector('meta[property="og:image"]')?.content || '';

  // Tags
  result.tags = ['Phú Quốc', 'Tour', result.departureCity].filter(Boolean);

  // Status
  result.isFeatured = false;
  result.status = 'active';

  return result;
}

// ============================================================================
// Enhanced Extraction Helpers
// ============================================================================

function extractPricingWithLazyHints(result, body) {
  // Adult price from visible content
  const pricePatterns = [
    /Từ\s*([\d.,]+)\s*đ\/khách/,
    /([\d.,]+)\s*đ\/khách/,
    /x\s*([\d.,]+)\s*đ/,
  ];
  for (const pat of pricePatterns) {
    const m = body.match(pat);
    if (m) { result.adultPrice = parseInt(m[1].replace(/[.,]/g, '')); break; }
  }
  result.currency = 'VND';

  // Child pricing hints from expanded content
  result.childPricingHints = [];
  
  // Look for child pricing in expanded sections
  const childPricePatterns = [
    { regex: /trẻ\s*em\s*\(\s*(\d+)\s*-\s*(\d+)\s*tuổi\s*\)[:\s]*([\d.,]+)\s*đ/gi, type: 'child', label: 'Trẻ em' },
    { regex: /trẻ\s*nhỏ[:\s]*([\d.,]+)\s*đ/gi, type: 'toddler', label: 'Trẻ nhỏ' },
    { regex: /em\s*bé[:\s]*([\d.,]+)\s*đ/gi, type: 'infant', label: 'Em bé' },
    { regex: /(\d+)\s*-\s*(\d+)\s*tuổi[:\s]*([\d.,]+)\s*đ/gi, type: 'child', label: 'Child' },
  ];

  for (const pattern of childPricePatterns) {
    let match;
    while ((match = pattern.regex.exec(body)) !== null) {
      if (pattern.type === 'child' && match[3]) {
        result.childPricingHints.push({
          type: 'child',
          label: `${pattern.label} (${match[1]}-${match[2]} tuổi)`,
          ageRange: `${match[1]}-${match[2]}`,
          price: parseInt(match[3].replace(/[.,]/g, '')),
          currency: 'VND'
        });
      } else if (match[1]) {
        result.childPricingHints.push({
          type: pattern.type,
          label: pattern.label,
          price: parseInt(match[1].replace(/[.,]/g, '')),
          currency: 'VND'
        });
      }
    }
  }

  // If child pricing found, set childPrice field
  const childPrice = result.childPricingHints.find(h => h.type === 'child');
  if (childPrice) {
    result.childPrice = childPrice.price;
  }

  const infantPrice = result.childPricingHints.find(h => h.type === 'infant');
  if (infantPrice) {
    result.infantPrice = infantPrice.price;
  }

  return result;
}

function extractGallery() {
  const imgs = document.querySelectorAll('img');
  const galleryRaw = [];
  imgs.forEach((img) => {
    const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
    if (src && src.includes('cdn') && !src.includes('icon') && !src.includes('.svg') && !src.includes('content/img')) {
      galleryRaw.push(src);
    }
  });

  // Deduplicate by content, keeping highest resolution
  const imgMap = new Map();
  for (const url of galleryRaw) {
    const nameMatch = url.match(/([^/]+?)(?:-\d+x\d+)?\.\w+$/);
    if (!nameMatch) continue;
    const baseName = nameMatch[1];
    const dimMatch = url.match(/\/?(\d+)x(\d+)/);
    const size = dimMatch ? parseInt(dimMatch[1]) * parseInt(dimMatch[2]) : 0;
    if (!imgMap.has(baseName) || imgMap.get(baseName).size < size) {
      imgMap.set(baseName, { url, size });
    }
  }
  return [...imgMap.values()].map((v) => v.url.replace(/\/\d{2,4}x\d{2,4}(\.\w+)$/, '/1200x800$1'));
}

function extractItineraryWithDetails(body) {
  const itineraryDays = [];
  
  // Try to find expanded day blocks first
  const dayBlocks = document.querySelectorAll('[id*="collapseDay"], [class*="collapseDay"], [class*="day-"]');
  dayBlocks.forEach((block) => {
    const text = block.textContent.trim();
    const dayMatch = text.match(/Ngày\s*(\d+)[\s:]*([^(
]+)/);
    const mealMatch = text.match(/\(([^)]*(?:Ăn|ăn)[^)]*)\)/);
    
    if (dayMatch) {
      // Extract full description from the block
      const description = text
        .substring(dayMatch[0].length)
        .trim()
        .split(/Giá Tour|Điều Khoản|Chính sách/)[0]
        .trim()
        .slice(0, 2000);

      itineraryDays.push({
        day: parseInt(dayMatch[1]),
        title: dayMatch[2].trim(),
        description: description,
        meals: mealMatch ? mealMatch[1].trim() : '',
      });
    }
  });

  // Fallback: parse from body text
  if (itineraryDays.length === 0) {
    const dayPattern = /Ngày\s*(\d+)[\s:]*([^(
]+?)(?:\s*\(([^)]*)\))?/g;
    let m;
    while ((m = dayPattern.exec(body)) !== null) {
      itineraryDays.push({ 
        day: parseInt(m[1]), 
        title: m[2].trim(), 
        meals: m[3] || '',
        description: ''
      });
    }
  }

  return itineraryDays.sort((a, b) => a.day - b.day);
}

function extractIncluded(body) {
  const incSection = (body.split(/Giá Tour Bao Gồm/i)[1] || '').split(/Giá Tour (?:Không|Ko) Bao Gồm/i)[0] || '';
  const incLines = incSection.match(/[-•✓✔]\s*.+/g);
  return incLines
    ? incLines.map((l) => l.replace(/^[-•✓✔]\s*/, '').trim()).filter((t) => t.length > 5 && t.length < 200)
    : [];
}

function extractExcluded(body) {
  const exclSection = (body.split(/Giá Tour (?:Không|Ko) Bao Gồm/i)[1] || '').split(/Điều Khoản|Chính sách/i)[0] || '';
  const exclLines = exclSection.match(/[-•✓✔]\s*.+/g);
  return exclLines
    ? exclLines.map((l) => l.replace(/^[-•✓✔]\s*/, '').trim()).filter((t) => t.length > 5)
    : [];
}

function extractSection(text, startHeader, endHeader) {
  const start = text.indexOf(startHeader);
  if (start === -1) return '';
  const sectionStart = start + startHeader.length;
  const section = endHeader
    ? text.substring(sectionStart, text.indexOf(endHeader, sectionStart))
    : text.substring(sectionStart);
  return section.trim().slice(0, 3000);
}

function extractNotes(body) {
  const notesSection = extractSection(body, 'Điều kiện tham gia', null);
  const noteLines = notesSection.match(/[-•]\s*.+/g);
  return noteLines
    ? noteLines.map((l) => l.replace(/^[-•]\s*/, '').trim()).filter((t) => t.length > 10)
    : [];
}

// ============================================================================
// Markdown-Based Extraction
// ============================================================================

export function extractFromMarkdown(markdown, url) {
  const result = {};

  // Title - try markdown format first, then plain text
  const h1Match = markdown.match(/^#\s*\*?\*?(Tour[^\n]+)/m);
  if (h1Match) {
    result.title = h1Match[1].replace(/\*\*/g, '').trim();
  } else {
    // Plain text extraction - look for tour name pattern
    const titlePatterns = [
      /Tour\s+[^\n]{10,100}(?=\s*\d+\s*Ngày|\s*Giá|\s*Khởi hành)/i,
      /Tour\s+Du\s+Lịch\s+[^\n]{5,80}/i,
      /Tour\s+Phú\s+Quốc[^\n]{5,80}/i,
    ];
    for (const pattern of titlePatterns) {
      const match = markdown.match(pattern);
      if (match) {
        result.title = match[0].trim();
        break;
      }
    }
  }

  // Slug
  if (url) {
    result.slug = new URL(url).pathname
      .replace(/^\/du-lich\//, '')
      .replace(/\/\d+$/, '')
      .replace(/\/$/, '');
  }
  if (!result.slug && result.title) {
    result.slug = slugify(result.title);
  }

  // Duration
  const durMatch = markdown.match(/(\d+)\s*Ngày\s*(\d+)\s*Đêm/);
  result.duration = durMatch ? `${durMatch[1]} ngày ${durMatch[2]} đêm` : '';
  result.durationDays = durMatch ? parseInt(durMatch[1]) : null;

  // Location
  result.location = 'Phú Quốc';
  const depMatch = markdown.match(/Khởi hành từ[:\s]*([^\n]{2,30})/);
  result.departureCity = depMatch ? depMatch[1].trim().split(/\s{2,}/)[0].trim() : '';

  // Pricing with enhanced child pricing
  result = extractPricingFromMarkdown(result, markdown);

  // Description
  const metaMatch = markdown.match(/description["']\s*content=["']([^"']+)["']/);
  result.description = metaMatch ? metaMatch[1] : '';
  result.excerpt = (result.description || '').slice(0, 200);

  // Gallery
  const cdnUrls = markdown.match(/https:\/\/cdn\d*\.ivivu\.com\/[^\s)]+\.(?:gif|jpg|jpeg|png|webp)/g) || [];
  const deduped = deduplicateByContent(cdnUrls);
  result.gallery = deduped.map((u) => normalizeImageUrl(u, 1200));
  result.featuredImage = result.gallery[0] || '';

  // Highlights
  result.highlights = extractListItems(markdown, 'Điểm Nổi Bật', 'Chương trình tour');

  // Itinerary
  result.itinerary = extractItineraryFromMarkdown(markdown);

  // Included / Excluded
  result.included = extractListItems(markdown, 'Giá Tour Bao Gồm', 'Giá Tour Không Bao Gồm');
  result.excluded = extractListItems(markdown, 'Giá Tour Không Bao Gồm', 'Điều Khoản');

  // Categories
  result.categories = ['Tour Trọn Gói', 'Du lịch Phú Quốc'];
  if (result.departureCity) result.categories.push(`Tour từ ${result.departureCity}`);

  // Meta
  const ogTitle = markdown.match(/og:title["']\s*content=["']([^"']+)["']/);
  result.metaTitle = ogTitle ? ogTitle[1] : result.title;
  const ogDesc = markdown.match(/og:description["']\s*content=["']([^"']+)["']/);
  result.metaDescription = ogDesc ? ogDesc[1] : '';

  // Tags
  result.tags = ['Phú Quốc', 'Tour', result.departureCity].filter(Boolean);

  result.isFeatured = false;
  result.status = 'active';

  return result;
}

function extractPricingFromMarkdown(result, markdown) {
  // Adult price
  const priceMatch = markdown.match(/Từ\s*([\d.,]+)\s*đ\/khách/);
  result.adultPrice = priceMatch ? parseInt(priceMatch[1].replace(/[.,]/g, '')) : null;
  result.currency = 'VND';

  // Child pricing hints
  result.childPricingHints = [];
  
  const childPatterns = [
    { regex: /trẻ\s*em\s*\(\s*(\d+)\s*-\s*(\d+)\s*tuổi\s*\)[:\s]*([\d.,]+)\s*đ/gi, type: 'child' },
    { regex: /trẻ\s*nhỏ[:\s]*([\d.,]+)\s*đ/gi, type: 'toddler' },
    { regex: /em\s*bé[:\s]*([\d.,]+)\s*đ/gi, type: 'infant' },
  ];

  for (const pattern of childPatterns) {
    let match;
    while ((match = pattern.regex.exec(markdown)) !== null) {
      if (pattern.type === 'child' && match[3]) {
        result.childPricingHints.push({
          type: 'child',
          label: `Trẻ em (${match[1]}-${match[2]} tuổi)`,
          ageRange: `${match[1]}-${match[2]}`,
          price: parseInt(match[3].replace(/[.,]/g, '')),
          currency: 'VND'
        });
      } else if (match[1]) {
        result.childPricingHints.push({
          type: pattern.type,
          label: pattern.type === 'toddler' ? 'Trẻ nhỏ' : 'Em bé',
          price: parseInt(match[1].replace(/[.,]/g, '')),
          currency: 'VND'
        });
      }
    }
  }

  const childPrice = result.childPricingHints.find(h => h.type === 'child');
  if (childPrice) result.childPrice = childPrice.price;

  const infantPrice = result.childPricingHints.find(h => h.type === 'infant');
  if (infantPrice) result.infantPrice = infantPrice.price;

  return result;
}

function extractItineraryFromMarkdown(markdown) {
  const itinDays = [];
  
  // Match itinerary links: [![Ngày 1](...) **Ngày 1Title (Meals)** ...]
  const dayLinkRegex = /\*\*Ngày\s*(\d+)\s*([^*(]+?)(?:\s*\(([^)]*)\))?\*\*/g;
  let m;
  while ((m = dayLinkRegex.exec(markdown)) !== null) {
    itinDays.push({ 
      day: parseInt(m[1]), 
      title: m[2].trim(), 
      meals: m[3] || '',
      description: ''
    });
  }
  
  // Fallback: simpler pattern
  if (itinDays.length === 0) {
    const dayRegex2 = /Ngày\s*(\d+)\s*[:]*\s*([^(
]+?)(?:\s*\(([^)]+)\))?/g;
    while ((m = dayRegex2.exec(markdown)) !== null) {
      if (!itinDays.find(d => d.day === parseInt(m[1]))) {
        itinDays.push({ 
          day: parseInt(m[1]), 
          title: m[2].trim(), 
          meals: m[3] || '',
          description: ''
        });
      }
    }
  }
  
  return itinDays.sort((a, b) => a.day - b.day);
}

function extractListItems(text, startAfter, stopBefore) {
  const startRegex = new RegExp(startAfter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const startMatch = text.match(startRegex);
  if (!startMatch) return [];

  const sectionStart = startMatch.index + startMatch[0].length;
  const stopRegex = stopBefore ? new RegExp(stopBefore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
  let sectionEnd = text.length;
  if (stopRegex) {
    const stopMatch = text.substring(sectionStart).match(stopRegex);
    if (stopMatch) sectionEnd = sectionStart + stopMatch.index;
  }

  const section = text.substring(sectionStart, sectionEnd);
  const bullets = section.match(/[-•✓✔>]\s*.+/g);
  if (bullets && bullets.length >= 2) {
    return bullets
      .map((l) => l.replace(/^[-•✓✔>]\s*/, '').trim())
      .filter((t) => t.length > 5 && t.length < 300 && !t.startsWith('![') && !t.startsWith('http'));
  }

  return section
    .split('\n')
    .map((l) => l.trim())
    .filter((t) => t.length > 10 && t.length < 300 && !t.startsWith('#') && !t.startsWith('![') && !t.startsWith('http'));
}

// ============================================================================
// Lazy Rendering Extraction using agent-browser CLI
// ============================================================================

/**
 * Interaction steps for revealing lazy content on ivivu.com
 * These steps are used with agent-browser CLI to interact with the page
 */
export function getLazyRenderingSteps() {
  return [
    // Close cookie banner
    { action: 'click', text: 'Đồng ý', optional: true },
    { action: 'click', text: 'Accept', optional: true },
    
    // Scroll to trigger lazy loading
    { action: 'scroll', direction: 'down', amount: 800 },
    { action: 'wait', ms: 1000 },
    { action: 'scroll', direction: 'down', amount: 800 },
    { action: 'wait', ms: 1000 },
    
    // Expand itinerary section
    { action: 'click', text: 'Xem tất cả', optional: true },
    { action: 'click', text: 'Xem chi tiết', optional: true },
    { action: 'wait', ms: 1500 },
    
    // Click child pricing tabs
    { action: 'click', text: 'Trẻ em', optional: true },
    { action: 'wait', ms: 1000 },
    { action: 'click', text: 'Em bé', optional: true },
    { action: 'wait', ms: 1000 },
    { action: 'click', text: 'Người lớn', optional: true },
    { action: 'wait', ms: 1000 },
  ];
}

/**
 * Post-processing for lazy rendering extraction
 * Extracts child pricing and detailed itinerary from expanded page content
 */
export function processLazyContent(pageText) {
  const result = {
    childPricingHints: [],
    detailedItinerary: [],
  };

  if (!pageText) return result;

  // Extract child pricing from expanded content
  const childPatterns = [
    { regex: /trẻ\s*em\s*\(\s*(\d+)\s*-\s*(\d+)\s*tuổi\s*\)[:\s]*([\d.,]+)/gi, type: 'child' },
    { regex: /trẻ\s*nhỏ[:\s]*([\d.,]+)\s*đ/gi, type: 'toddler' },
    { regex: /em\s*bé[:\s]*([\d.,]+)\s*đ/gi, type: 'infant' },
  ];

  for (const pattern of childPatterns) {
    let match;
    while ((match = pattern.regex.exec(pageText)) !== null) {
      if (pattern.type === 'child' && match[3]) {
        result.childPricingHints.push({
          type: 'child',
          label: `Trẻ em (${match[1]}-${match[2]} tuổi)`,
          ageRange: `${match[1]}-${match[2]}`,
          price: parseInt(match[3].replace(/[.,]/g, '')),
        });
      } else if (match[1]) {
        result.childPricingHints.push({
          type: pattern.type,
          label: pattern.type === 'toddler' ? 'Trẻ nhỏ' : 'Em bé',
          price: parseInt(match[1].replace(/[.,]/g, '')),
        });
      }
    }
  }

  // Extract detailed itinerary
  const dayPattern = /Ngày\s*(\d+)[:\s]*([^\n]+)(?:\n|\r)*((?:(?!Ngày\s*\d).)*)/gi;
  let match;
  while ((match = dayPattern.exec(pageText)) !== null) {
    result.detailedItinerary.push({
      day: parseInt(match[1]),
      title: match[2].trim(),
      description: match[3] ? match[3].trim().slice(0, 1000) : '',
    });
  }

  return result;
}

// ============================================================================
// Enhanced Playwright Extraction
// ============================================================================

export function extractFromDOMPlaywright() {
  const result = extractFromDOM();
  const body = document.body.innerText;

  // Map extraction
  result.map = { lat: null, lng: null, embedUrl: null };
  const mapIframe = document.querySelector('iframe[src*="google.com/maps"], iframe[src*="maps.google"]');
  if (mapIframe?.src) {
    result.map.embedUrl = mapIframe.src;
    const coordMatch = mapIframe.src.match(/!2d(-?\d+\.?\d*)!3d(-?\d+\.?\d*)/);
    if (coordMatch) {
      result.map.lng = parseFloat(coordMatch[1]);
      result.map.lat = parseFloat(coordMatch[2]);
    }
  }

  // Contact info
  result.contactInfo = { phone: '', email: '', bookingUrl: '' };
  const phoneEl = document.querySelector('a[href^="tel:"]');
  if (phoneEl) {
    result.contactInfo.phone = phoneEl.href.replace('tel:', '');
  }

  return result;
}

export default { 
  extractFromDOM, 
  extractFromMarkdown, 
  extractFromDOMPlaywright,
  getLazyRenderingSteps,
  processLazyContent,
};
