/**
 * Shared utility functions for formatting, validation, and helpers.
 */

/**
 * Format a number as currency string.
 * @param {number} amount
 * @param {string} currency - Currency code (VND, USD)
 * @returns {string}
 */
export function formatCurrency(amount, currency = "VND") {
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN", { style: "decimal" }).format(amount) + " ₫";
  }
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  }
  return new Intl.NumberFormat("vi-VN").format(amount);
}

/**
 * Format a date string or timestamp to readable format.
 * @param {*} date - Date, Timestamp, ISO string, or milliseconds
 * @param {string} format - 'short' | 'long' | 'iso'
 * @returns {string}
 */
export function formatDate(date, format = "short") {
  if (!date) return "";
  const d = date?.toDate ? date.toDate() : new Date(date);
  if (isNaN(d.getTime())) return "";

  const locale = "vi-VN";
  switch (format) {
    case "long":
      return d.toLocaleDateString(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    case "iso":
      return d.toISOString().split("T")[0];
    default:
      return d.toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
  }
}

/**
 * Calculate number of nights between two dates.
 * @param {Date|*} checkIn
 * @param {Date|*} checkOut
 * @returns {number}
 */
export function calcNights(checkIn, checkOut) {
  const ci = checkIn?.toDate ? checkIn.toDate() : new Date(checkIn);
  const co = checkOut?.toDate ? checkOut.toDate() : new Date(checkOut);
  return Math.max(1, Math.round((co - ci) / (1000 * 60 * 60 * 24)));
}

/**
 * Generate a slug from a string (Vietnamese-friendly).
 * @param {string} str
 * @returns {string}
 */
export function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Truncate text to a given length.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function truncateText(text, maxLength = 100) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trimEnd() + "...";
}

/**
 * Get star rating label in Vietnamese.
 * @param {number} rating - 1-5
 * @returns {string}
 */
export function starRatingLabel(rating) {
  const labels = ["", "Tệ", "Kém", "Trung bình", "Tốt", "Tuyệt vời"];
  return labels[Math.round(rating)] || "";
}

/**
 * Build query string from an object.
 * @param {Object} params
 * @returns {string}
 */
export function buildQueryString(params) {
  const parts = [];
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null || val === "") continue;
    if (Array.isArray(val)) {
      val.forEach((v) => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`));
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
    }
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

/**
 * Debounce function.
 * @param {Function} fn
 * @param {number} delay - ms
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Classname helper - join class names, filtering out falsy values.
 * @param  {...(string|boolean|null|undefined)} classes
 * @returns {string}
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Generate a unique booking code.
 * @returns {string}
 */
export function generateBookingCode() {
  const prefix = "9T";
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

// ─── Pricing Helpers ──────────────────────────────────────────────────

/**
 * Resolve giá theo ngày từ mảng pricingPeriods.
 * Nếu không có pricingPeriods, fallback về pricing gốc.
 * Nếu ngày không nằm trong bất kỳ period nào, trả về null.
 *
 * @param {Object} pricing — pricing object từ Firestore document
 * @param {string} pricing.adultPrice — giá mặc định
 * @param {string} pricing.childPrice
 * @param {Array<{startDate: string, endDate: string, adultPrice: number, childPrice?: number}>} [pricing.pricingPeriods]
 * @param {string} date — ISO date string (YYYY-MM-DD)
 * @returns {{ adultPrice: number, childPrice: number }|null}
 */
export function getPriceForDate(pricing, date) {
  if (!pricing || !date) return null;

  const periods = pricing.pricingPeriods;
  if (!periods || periods.length === 0) {
    // Không có giai đoạn — dùng giá mặc định
    if (pricing.adultPrice) {
      return {
        adultPrice: Number(pricing.adultPrice),
        childPrice: Number(pricing.childPrice || 0),
      };
    }
    return null;
  }

  const targetDate = new Date(date);

  for (const period of periods) {
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    if (targetDate >= start && targetDate <= end) {
      return {
        adultPrice: Number(period.adultPrice),
        childPrice: Number(period.childPrice || 0),
      };
    }
  }

  // Ngày không nằm trong period nào — không có giá
  return null;
}

/**
 * Lấy giá thấp nhất từ tất cả pricingPeriods (dùng cho listing/card).
 * @param {Object} pricing
 * @returns {number}
 */
export function getMinPriceFromPeriods(pricing) {
  if (!pricing) return 0;

  const periods = pricing.pricingPeriods;
  if (!periods || periods.length === 0) {
    return Number(pricing.adultPrice || pricing.basePrice || 0);
  }

  let min = Infinity;
  for (const period of periods) {
    const price = Number(period.adultPrice || period.basePrice || 0);
    if (price < min) min = price;
  }

  return min === Infinity ? Number(pricing.adultPrice || pricing.basePrice || 0) : min;
}

/**
 * Tính số tiền giảm giá theo số lượng khách (quantity-based discount).
 * @param {{ quantityDiscounts?: Array<{minQuantity: number, maxQuantity: number, discountPercent: number}> }} pricing
 * @param {number} totalGuests — tổng số khách (adults + children)
 * @returns {number} Phần trăm giảm giá (0-100)
 */
export function getQuantityDiscount(pricing, totalGuests) {
  const discounts = pricing?.quantityDiscounts;
  if (!discounts || discounts.length === 0) return 0;

  for (const tier of discounts) {
    if (totalGuests >= tier.minQuantity && totalGuests <= tier.maxQuantity) {
      return tier.discountPercent || 0;
    }
  }
  return 0;
}

/**
 * Validate email format.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate Vietnamese phone number format.
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidVNPhone(phone) {
  return /^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(phone.replace(/\s|\.|-/g, ""));
}

/**
 * Get image URL with fallback placeholder.
 * @param {string} url
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
export function imageUrl(url, width = 400, height = 300) {
  if (!url) return `https://placehold.co/${width}x${height}?text=9Trip`;
  return url;
}