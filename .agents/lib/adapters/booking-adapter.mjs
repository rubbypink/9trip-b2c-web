/**
 * Booking.com Hotel Adapter — extracts structured hotel data from booking.com pages.
 *
 * Three extraction modes:
 *   1. extractFromDOM() — runs inside Playwright's page.evaluate()
 *   2. extractFromMarkdown() — parses Firecrawl scrape() markdown
 *   3. getLazyRenderingSteps() — returns steps for agent-browser CLI to reveal room details
 *
 * @module booking-adapter
 * @version 2.0.0
 */

// ============================================================================
// DOM-Based Extraction (Playwright browser context)
// ============================================================================

export function extractFromDOM() {
  const result = {
    source: 'booking.com',
    url: document.location.href,
    extractedAt: new Date().toISOString(),
  };

  // Hotel Name
  const nameSelectors = [
    'h2.pp-header__title',
    '[data-testid="header-title"]',
    'h1.hp__hotel-title',
    '[data-testid="property-header"] h1',
    'h2[data-testid="property-name"]',
  ];
  for (const selector of nameSelectors) {
    const el = document.querySelector(selector);
    if (el?.textContent?.trim()) {
      result.name = el.textContent.trim();
      break;
    }
  }
  result.name = result.name || document.title?.split(/[-|]/)[0]?.trim() || '';

  // Star Rating
  const starContainer = document.querySelector(
    '[data-testid="rating-stars"], .b6f6d8ad57, [class*="rating"]'
  );
  if (starContainer) {
    const stars = starContainer.querySelectorAll('span, svg, i[class*="star"]');
    result.starRating = stars.length;
  } else {
    const starIcons = document.querySelectorAll('[class*="star"]:not([class*="empty"])');
    result.starRating = starIcons.length > 0 ? starIcons.length : null;
  }

  // Address
  result.address = extractAddress();

  // Description
  result.description = extractDescription();
  result.excerpt = result.description?.slice(0, 200) || '';

  // Gallery
  result.gallery = extractGallery();
  result.featuredImage = result.gallery[0] || '';

  // Amenities & Highlights
  result.amenities = extractAmenities();
  result.highlights = extractHighlights();

  // Rating
  result.rating = extractRating();

  // Rooms
  result.rooms = extractRooms();

  // Reviews
  result.reviews = extractReviews();

  // Policies
  result.policies = extractPolicies();

  // Map Coordinates
  result.map = extractMapCoordinates();

  // Contact Info
  result = extractContactInfo(result);

  return result;
}

// ============================================================================
// Extraction Helpers
// ============================================================================

function extractAddress() {
  const addressSelectors = [
    '[data-testid="property-address"]',
    '.hp__address',
    '[data-testid="header-address"]',
    '.address span',
    '[class*="address"]',
  ];
  for (const selector of addressSelectors) {
    const el = document.querySelector(selector);
    if (el?.textContent?.trim()) {
      return el.textContent.trim();
    }
  }
  return '';
}

function extractDescription() {
  const descSelectors = [
    '[data-testid="property-description"]',
    '#property_description_content',
    '.hp__hotel_desc',
    '[class*="description"]',
    'meta[name="description"]',
  ];
  for (const selector of descSelectors) {
    const el = document.querySelector(selector);
    if (el?.content) return el.content;
    if (el?.textContent?.trim()) return el.textContent.trim();
  }
  return '';
}

function extractGallery() {
  const galleryRaw = [];
  const imgSelectors = [
    'img[data-src*="bstatic.com"]',
    'img[src*="bstatic.com"]',
    'img[srcset*="bstatic.com"]',
    '[class*="gallery"] img',
    '[data-testid="property-photo"] img',
    '.hotel_image img',
  ];

  imgSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((img) => {
      const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
      const srcset = img.srcset || img.getAttribute('data-srcset') || '';

      if (src.includes('bstatic.com')) {
        galleryRaw.push(src);
      }

      if (srcset.includes('bstatic.com')) {
        const urls = srcset.split(',').map((s) => s.trim().split(' ')[0]);
        galleryRaw.push(...urls);
      }
    });
  });

  // Deduplicate by image name, keeping highest resolution
  const imgMap = new Map();
  for (const url of galleryRaw) {
    const nameMatch = url.match(/\/([^/]+?)(?:-\d+x\d+)?\.[a-zA-Z]+$/);
    if (!nameMatch) continue;

    const baseName = nameMatch[1];
    const dimMatch = url.match(/-(\d+)x(\d+)\./);
    const size = dimMatch ? parseInt(dimMatch[1]) * parseInt(dimMatch[2]) : 0;

    if (!imgMap.has(baseName) || imgMap.get(baseName).size < size) {
      imgMap.set(baseName, { url, size });
    }
  }

  return [...imgMap.values()].map((v) => {
    return v.url.replace(/-\d+x\d+\./, '-max.').replace(/\?.*$/, '');
  });
}

function extractAmenities() {
  const amenitySelectors = [
    '[data-testid="property-most-popular-facilities"] li',
    '[data-testid="property-facilities"] li',
    '.hp__hotel_facilities li',
    '[class*="facility"]',
    '.hotel-facilities span',
  ];
  const amenities = new Set();
  amenitySelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length > 2 && text.length < 100) {
        amenities.add(text);
      }
    });
  });
  return [...amenities];
}

function extractHighlights() {
  const highlightSelectors = [
    '[data-testid="property-most-popular-facilities"] div[class*="icon"]',
    '.hp__hotel_facilities_highlight li',
    '[class*="highlight"] span',
  ];
  const highlights = new Set();
  highlightSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length > 2) {
        highlights.add(text);
      }
    });
  });
  return [...highlights];
}

function extractRating() {
  const ratingEl = document.querySelector(
    '[data-testid="review-score"], [data-testid="rating-score"], .review-score-widget__score'
  );
  
  if (!ratingEl?.textContent) return null;
  
  const ratingMatch = ratingEl.textContent.match(/(\d[.,]?\d*)/);
  const rating = ratingMatch ? {
    average: parseFloat(ratingMatch[1].replace(',', '.')),
    count: null,
  } : null;

  if (rating) {
    const countEl = document.querySelector(
      '[data-testid="review-count"], .review-score-widget__reviews'
    );
    if (countEl?.textContent) {
      const countMatch = countEl.textContent.match(/(\d[\d\s,]*)/);
      rating.count = countMatch ? parseInt(countMatch[1].replace(/[\s,]/g, '')) : null;
    }
  }
  
  return rating;
}

function extractRooms() {
  const rooms = [];
  const roomRows = document.querySelectorAll('.room-row, [data-testid="room-card"], [class*="room"]');

  roomRows.forEach((row) => {
    const room = {};

    // Room name
    const nameEl = row.querySelector(
      '.room-title, [data-testid="room-name"], h3, .room-type'
    );
    room.name = nameEl?.textContent?.trim() || '';

    // Bed type
    const bedEl = row.querySelector(
      '[data-testid="bed-configuration"], .bed-type, [class*="bed"]'
    );
    room.bedType = bedEl?.textContent?.trim() || '';

    // Max occupancy
    const occEl = row.querySelector(
      '[data-testid="occupancy"], .occupancy, [class*="guest"]'
    );
    if (occEl?.textContent) {
      const adultMatch = occEl.textContent.match(/(\d+)\s*(adult|người lớn)/i);
      const childMatch = occEl.textContent.match(/(\d+)\s*(child|trẻ em)/i);
      room.maxAdults = adultMatch ? parseInt(adultMatch[1]) : 2;
      room.maxChildren = childMatch ? parseInt(childMatch[1]) : 0;
    }

    // Room size
    const sizeEl = row.querySelector('[class*="size"], [class*="area"]');
    if (sizeEl?.textContent) {
      const sizeMatch = sizeEl.textContent.match(/(\d+)\s*m²/);
      room.roomSize = sizeMatch ? `${sizeMatch[1]} m²` : '';
    }

    // Room amenities
    const roomAmenities = [];
    row.querySelectorAll('[class*="facility"], [class*="amenity"]').forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length > 2) {
        roomAmenities.push(text);
      }
    });
    room.amenities = roomAmenities;

    // Room gallery from row (before popup)
    const roomGallery = [];
    row.querySelectorAll('img').forEach((img) => {
      const src = img.src || img.getAttribute('data-src') || '';
      if (src.includes('bstatic.com')) {
        roomGallery.push(src.replace(/-\d+x\d+\./, '-max.'));
      }
    });
    room.gallery = [...new Set(roomGallery)];

    if (room.name) {
      rooms.push(room);
    }
  });

  return rooms;
}

function extractReviews() {
  const reviews = [];
  const reviewBlocks = document.querySelectorAll('.review_list .review-block, [data-testid="review-card"]');
  let reviewCount = 0;

  reviewBlocks.forEach((block) => {
    if (reviewCount >= 25) return;

    const review = {};

    const nameEl = block.querySelector('.reviewer-name, [class*="reviewer"]');
    review.reviewerName = nameEl?.textContent?.trim() || '';

    const ratingEl = block.querySelector('.review-score, [class*="score"]');
    if (ratingEl?.textContent) {
      const match = ratingEl.textContent.match(/(\d[.,]?\d*)/);
      review.rating = match ? parseFloat(match[1].replace(',', '.')) : null;
    }

    const textEl = block.querySelector('.review-content, [class*="review-text"]');
    review.text = textEl?.textContent?.trim() || '';

    const dateEl = block.querySelector('.review-date, [class*="date"]');
    review.date = dateEl?.textContent?.trim() || '';

    if (review.text) {
      reviews.push(review);
      reviewCount++;
    }
  });

  return reviews;
}

function extractPolicies() {
  const policies = { checkIn: '', checkOut: '' };

  const policySelectors = [
    '[data-testid="checkin-policy"]',
    '[data-testid="checkout-policy"]',
    '.checkin_policy',
    '.checkout_policy',
  ];

  policySelectors.forEach((selector) => {
    const el = document.querySelector(selector);
    if (el?.textContent) {
      const checkinMatch = el.textContent.match(/check[\s-]?in[:\s]*(\d{1,2}:?\d{0,2})/i);
      const checkoutMatch = el.textContent.match(/check[\s-]?out[:\s]*(\d{1,2}:?\d{0,2})/i);
      if (checkinMatch) policies.checkIn = checkinMatch[1];
      if (checkoutMatch) policies.checkOut = checkoutMatch[1];
    }
  });

  return policies;
}

function extractMapCoordinates() {
  const map = { lat: null, lng: null };

  // Try script tags
  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    const text = script.textContent || '';

    const latMatch = text.match(/["']latitude["']\s*:\s*(-?\d+\.?\d*)/);
    const lngMatch = text.match(/["']longitude["']\s*:\s*(-?\d+\.?\d*)/);

    if (latMatch && lngMatch) {
      map.lat = parseFloat(latMatch[1]);
      map.lng = parseFloat(lngMatch[1]);
      break;
    }

    const coordMatch = text.match(/(-?\d+\.\d+)[,;]\s*(-?\d+\.\d+)/);
    if (coordMatch && !map.lat) {
      map.lat = parseFloat(coordMatch[1]);
      map.lng = parseFloat(coordMatch[2]);
    }
  }

  // Try meta tags
  if (!map.lat) {
    const geoLat = document.querySelector('meta[property="place:location:latitude"]');
    const geoLng = document.querySelector('meta[property="place:location:longitude"]');
    if (geoLat?.content && geoLng?.content) {
      map.lat = parseFloat(geoLat.content);
      map.lng = parseFloat(geoLng.content);
    }
  }

  return map;
}

function extractContactInfo(result) {
  result.phone = '';
  result.email = '';
  result.website = '';

  const phoneEl = document.querySelector(
    '[data-testid="property-phone"], [class*="phone"], a[href^="tel:"]'
  );
  if (phoneEl) {
    result.phone = phoneEl.textContent?.trim() || phoneEl.getAttribute('href')?.replace('tel:', '') || '';
  }

  const websiteEl = document.querySelector('a[href*="website"], [class*="website"] a');
  if (websiteEl) {
    result.website = websiteEl.href || '';
  }

  return result;
}

// ============================================================================
// Lazy Rendering Extraction using agent-browser CLI
// ============================================================================

/**
 * Interaction steps for revealing lazy content on booking.com
 * These steps are used with agent-browser CLI to:
 * - Scroll to load room data
 * - Click on room cards to open popup
 * - Extract room gallery and details from popup
 * - Close popup and continue
 */
export function getLazyRenderingSteps() {
  return [
    // Close cookie banner
    { action: 'click', text: 'Accept', optional: true },
    { action: 'click', text: 'Đồng ý', optional: true },
    
    // Scroll to load rooms
    { action: 'scroll', direction: 'down', amount: 1000 },
    { action: 'wait', ms: 2000 },
    { action: 'scroll', direction: 'down', amount: 1000 },
    { action: 'wait', ms: 2000 },
    
    // Click on first room to see popup details
    { action: 'click', text: 'Select rooms', optional: true },
    { action: 'wait', ms: 3000 },
    
    // Click gallery if available
    { action: 'click', text: 'Photos', optional: true },
    { action: 'wait', ms: 2000 },
    
    // Navigate through gallery
    { action: 'click', text: 'Next', optional: true },
    { action: 'wait', ms: 1000 },
    { action: 'click', text: 'Next', optional: true },
    { action: 'wait', ms: 1000 },
    
    // Close popup
    { action: 'click', text: 'Close', optional: true },
    { action: 'click', text: '×', optional: true },
    { action: 'wait', ms: 1000 },
    
    // Scroll more for additional rooms
    { action: 'scroll', direction: 'down', amount: 1500 },
    { action: 'wait', ms: 2000 },
  ];
}

/**
 * Post-processing for lazy rendering extraction
 * Extracts additional room details from expanded page content
 */
export function processLazyContent(pageText) {
  const result = {
    roomDetails: [],
    expandedGallery: [],
  };

  if (!pageText) return result;

  // Extract room details from popup content
  const roomPatterns = [
    /(\w+[\w\s]*room)[\s\S]*?(\d+)\s*m²/gi,
    /(\w+[\w\s]*suite)[\s\S]*?(\d+)\s*m²/gi,
  ];

  for (const pattern of roomPatterns) {
    let match;
    while ((match = pattern.exec(pageText)) !== null) {
      result.roomDetails.push({
        name: match[1].trim(),
        size: match[2] ? `${match[2]} m²` : null,
      });
    }
  }

  return result;
}

/**
 * Enhanced DOM extraction for use after agent-browser interactions
 * Extracts room details from expanded/collapsed sections
 */
export function extractFromDOMEnhanced() {
  const result = extractFromDOM();
  
  // Extract additional room details from opened popups
  const roomDetails = [];
  const detailBlocks = document.querySelectorAll('[data-testid="room-popover"], [class*="room-details"], [class*="room-modal"]');
  
  detailBlocks.forEach((block) => {
    const room = {};
    
    // Room name from popup
    const nameEl = block.querySelector('h2, h3, [class*="title"]');
    room.name = nameEl?.textContent?.trim() || '';
    
    // Extended gallery from popup
    const gallery = [];
    block.querySelectorAll('img').forEach((img) => {
      const src = img.src || img.getAttribute('data-src') || '';
      if (src.includes('bstatic.com')) {
        gallery.push(src.replace(/-\d+x\d+\./, '-max.'));
      }
    });
    room.gallery = [...new Set(gallery)];
    
    // Room description from popup
    const descEl = block.querySelector('[class*="description"], p');
    room.description = descEl?.textContent?.trim() || '';
    
    // Room facilities from popup
    const facilities = [];
    block.querySelectorAll('[class*="facility"], [class*="amenity"]').forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length > 2) {
        facilities.push(text);
      }
    });
    room.facilities = facilities;
    
    if (room.name) {
      roomDetails.push(room);
    }
  });
  
  if (roomDetails.length > 0) {
    result.roomsEnhanced = roomDetails;
  }
  
  return result;
}

export default { 
  extractFromDOM, 
  extractFromDOMEnhanced,
  getLazyRenderingSteps,
  processLazyContent,
};
