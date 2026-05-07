/**
 * Shared module for extracting pricing data with mandatory child pricing support.
 * @module pricing-extractor
 */

// [DEAD CODE] — VND_PATTERN: Never imported by any skill script (extractPricing uses its own inline patterns)
// export const VND_PATTERN = /(?:Từ\s+)?([\d.,]+)\s*(?:đ|VND)?/gi;

// [DEAD CODE] — CHILD_PRICE_PATTERNS: Never imported by any skill script (extractChildPricing uses strategyMap instead)
// export const CHILD_PRICE_PATTERNS = [
//   /trẻ\s*em[:\s]*([\d.,]+)/gi,
//   /trẻ[:\s]*([\d.,]+)/gi,
//   /em\s*bé[:\s]*([\d.,]+)/gi,
//   /child(?:ren)?[:\s]*([\d.,]+)/gi,
//   /kid(?:'s|s)?\s*price[:\s]*([\d.,]+)/gi,
//   /giá\s*(?:trẻ\s*em|em\s*bé)[:\s]*([\d.,]+)/gi,
//   /\((?:trẻ\s*em|em\s*bé|child|children|kid)\s*[:\s]*([\d.,]+)/gi,
// ];

/**
 * Extracts pricing data from raw input for a specific type.
 *
 * @param {string|object} rawData - Raw pricing data (text or object with price fields)
 * @param {'tour'|'hotel'|'activity'} type - The type of pricing to extract
 * @returns {Object} Extracted pricing data
 * @returns {number|null} returns.adultPrice - Adult price in VND
 * @returns {number|null} returns.childPrice - Child price in VND
 * @returns {number|null} returns.infantPrice - Infant price in VND
 * @returns {string} returns.currency - Currency code (always 'VND')
 * @returns {boolean} returns.found - Whether any price was found
 * @returns {string[]} returns.missing - Array of missing price fields
 *
 * @example
 * extractPricing("Giá người lớn: 1.500.000 đ, Trẻ em: 1.200.000 đ", 'tour')
 * // Returns: { adultPrice: 1500000, childPrice: 1200000, infantPrice: null, currency: 'VND', found: true, missing: ['infantPrice'] }
 */
export function extractPricing(rawData, type) {
  const result = {
    adultPrice: null,
    childPrice: null,
    infantPrice: null,
    currency: 'VND',
    found: false,
    missing: [],
  };

  if (!rawData || (typeof rawData === 'string' && rawData.trim() === '')) {
    result.missing = ['adultPrice', 'childPrice', 'infantPrice'];
    return result;
  }

  // If rawData is an object with pricing fields already, use them directly
  if (typeof rawData === 'object' && !Array.isArray(rawData)) {
    const data = rawData;
    if (data.pricing?.adultPrice) {
      result.adultPrice = normalizePrice(data.pricing.adultPrice);
    } else if (data.adultPrice) {
      result.adultPrice = normalizePrice(data.adultPrice);
    }
    if (data.pricing?.childPrice) {
      result.childPrice = normalizePrice(data.pricing.childPrice);
    } else if (data.childPrice) {
      result.childPrice = normalizePrice(data.childPrice);
    }
    if (data.pricing?.infantPrice) {
      result.infantPrice = normalizePrice(data.pricing.infantPrice);
    } else if (data.infantPrice) {
      result.infantPrice = normalizePrice(data.infantPrice);
    }

    result.found = result.adultPrice !== null || result.childPrice !== null;
    if (result.adultPrice === null) result.missing.push('adultPrice');
    if (result.childPrice === null) result.missing.push('childPrice');
    if (result.infantPrice === null) result.missing.push('infantPrice');
    return result;
  }

  const text = typeof rawData === 'string' ? rawData : '';

  // Extract adult price - look for common patterns (NO /g flag for proper group capture)
  const adultPatterns = [
    /(?:người\s*lớn|adult|giá\s*(?:người\s*lớn))[:\s]*([\d.,]+)/i,
    /(?:Từ\s+)?([\d.,]+)\s*(?:đ|VND)/i,
    /(?:price|giá)[:\s]*([\d.,]+)/i,
  ];

  for (const pattern of adultPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      result.adultPrice = normalizePrice(match[1]);
      if (result.adultPrice !== null) break;
    }
  }

  // Extract child price using multiple strategies
  const childResult = extractChildPricing(text);
  if (childResult.found && childResult.price !== null) {
    result.childPrice = childResult.price;
  }

  // Try to extract infant price (typically lower than child)
  const infantPatterns = [
    /em\s*bé[:\s]*([\d.,]+)/gi,
    /infant[:\s]*([\d.,]+)/gi,
    /baby[:\s]*([\d.,]+)/gi,
    /(?:trẻ\s*sơ\s*sinh|trẻ\s*nhỏ)[:\s]*([\d.,]+)/gi,
  ];

  for (const pattern of infantPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const infantPrice = normalizePrice(match[1]);
      if (infantPrice !== null) {
        result.infantPrice = infantPrice;
        break;
      }
    }
  }

  // Determine what was found
  result.found = result.adultPrice !== null || result.childPrice !== null;

  if (result.adultPrice === null) result.missing.push('adultPrice');
  if (result.childPrice === null) result.missing.push('childPrice');
  if (result.infantPrice === null) result.missing.push('infantPrice');

  return result;
}

/**
 * Attempts to extract child pricing using multiple regex strategies.
 *
 * @param {string} pageText - Text content to search for child pricing
 * @returns {Object} Child pricing result
 * @returns {boolean} returns.found - Whether child price was found
 * @returns {number|null} returns.price - Extracted price in VND (null if not found)
 * @returns {string} returns.strategy - Name of the pattern that matched
 *
 * @example
 * extractChildPricing("Giá trẻ em: 1.200.000 đ")
 * // Returns: { found: true, price: 1200000, strategy: 'trẻ em' }
 */
export function extractChildPricing(pageText) {
  const result = {
    found: false,
    price: null,
    strategy: 'none',
  };

  if (!pageText || typeof pageText !== 'string' || pageText.trim() === '') {
    return result;
  }

  // Strategy names mapped to patterns (NO /g flag — we use exec() with index tracking instead)
  const strategyMap = [
    { pattern: /trẻ\s*em[:\s]*([\d.,]+)/i, name: 'trẻ em' },
    { pattern: /em\s*bé[:\s]*([\d.,]+)/i, name: 'em bé' },
    { pattern: /child(?:ren)?[:\s]*([\d.,]+)/i, name: 'child/children' },
    { pattern: /kid(?:'s|s)?\s*price[:\s]*([\d.,]+)/i, name: "kid's price" },
    { pattern: /giá\s*(?:trẻ\s*em|em\s*bé)[:\s]*([\d.,]+)/i, name: 'giá trẻ em' },
    { pattern: /\([\s]*trẻ\s*em[:\s]*([\d.,]+)/i, name: 'generic child pattern' },
  ];

  for (let i = 0; i < strategyMap.length; i++) {
    const { pattern, name } = strategyMap[i];
    const match = pageText.match(pattern);
    if (match && match[1]) {
      const price = normalizePrice(match[1]);
      if (price !== null) {
        result.found = true;
        result.price = price;
        result.strategy = name;
        return result;
      }
    }
  }

  return result;
}

/**
 * Normalizes a price string to integer VND.
 * Handles various formats:
 * - "7.590.000 đ" → 7590000
 * - "7590000" → 7590000
 * - "Từ 7.590.000 đ/khách" → 7590000
 * - "1,500,000 VND" → 1500000
 *
 * @param {string|number} priceText - Price text to normalize
 * @returns {number|null} Normalized price as integer, or null if invalid
 *
 * @example
 * normalizePrice("7.590.000 đ") // Returns: 7590000
 * normalizePrice("Từ 1,500,000 VND") // Returns: 1500000
 * normalizePrice(null) // Returns: null
 */
export function normalizePrice(priceText) {
  if (priceText === null || priceText === undefined) {
    return null;
  }

  // If already a number, return as integer
  if (typeof priceText === 'number') {
    return Math.floor(priceText);
  }

  // If not a string, return null
  if (typeof priceText !== 'string') {
    return null;
  }

  let text = priceText.trim();

  // Handle empty string
  if (text === '') {
    return null;
  }

  // Remove common prefixes like "Từ", "From", etc.
  text = text.replace(/^(?:Từ|from)\s+/gi, '');

  // Remove common suffixes like "/khách", "/person", "/đêm", etc.
  text = text.replace(/\/(?:khách|person|đêm|night|room|người)/gi, '');

  // Remove currency symbols and letters
  text = text.replace(/[đVNDvnd₫]/gi, '');

  // Remove any remaining non-numeric characters except dots and commas
  text = text.replace(/[^\d.,]/g, '');

  // Determine which delimiter is used (dots or commas for thousands)
  // Vietnamese format uses dots for thousands: 1.590.000
  // International format uses commas: 1,500,000
  const dotCount = (text.match(/\./g) || []).length;
  const commaCount = (text.match(/,/g) || []).length;

  let normalizedValue;

  if (dotCount > 0 && commaCount === 0) {
    // Vietnamese format: 1.590.000 → 1590000
    text = text.replace(/\./g, '');
    normalizedValue = parseInt(text, 10);
  } else if (commaCount > 0 && dotCount === 0) {
    // International format: 1,500,000 → 1500000
    text = text.replace(/,/g, '');
    normalizedValue = parseInt(text, 10);
  } else if (dotCount > 0 && commaCount > 0) {
    // Both present - last one is likely the decimal separator
    const lastDot = text.lastIndexOf('.');
    const lastComma = text.lastIndexOf(',');

    if (lastComma > lastDot) {
      // Comma is decimal separator: 1.590,00 → 159000
      text = text.replace(/\./g, '').replace(',', '.');
    } else {
      // Dot is decimal separator: 1,590.00 → 159000
      text = text.replace(/,/g, '');
    }
    normalizedValue = parseFloat(text);
  } else {
    // No delimiters, just a plain number
    normalizedValue = parseInt(text, 10);
  }

  // Validate the result
  if (isNaN(normalizedValue) || normalizedValue < 0) {
    return null;
  }

  // Return as integer
  return Math.floor(normalizedValue);
}
