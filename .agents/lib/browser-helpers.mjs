/**
 * Browser interaction utilities for Playwright-based scrapers
 * Pure JS config/data — no npm imports
 */

/** Strategies to reveal child pricing in booking flows */
export const CHILD_PRICING_INTERACTIONS = [
  {
    name: 'quantity-input',
    selectors: ['input[name*="child"]', 'input[name*="quantity"]'],
    actions: [
      { type: 'fill', value: '2' },
      { type: 'press', key: 'Tab' },
    ],
  },
  {
    name: 'dropdown-select',
    selectors: ['select[name*="childAge"]'],
    actions: [
      { type: 'select', value: '10' },
    ],
  },
  {
    name: 'button-increment',
    selectors: ['button[aria-label*="child"]', '[data-action*="add-child"]'],
    actions: [
      { type: 'click' },
      { type: 'click' },
    ],
  },
  {
    name: 'modal-open',
    selectors: ['button:has-text("Price")', 'button:has-text("Calculate")'],
    actions: [
      { type: 'click' },
    ],
  },
];

/** Common overlay/modal selectors to dismiss */
export const COMMON_OVERLAY_SELECTORS = [
  '.cookie-banner button',
  '[aria-label="Close"]',
  '.modal-close',
  '.dismiss',
];

/** Scroll wave pattern config */
export const SCROLL_PATTERNS = {
  stepPx: 800,
  maxWaves: 10,
  delayMs: 300,
};

/** Vietnamese UI text for load more / pagination */
export const LOAD_MORE_TEXT = ['Xem thêm', 'Hiển thị thêm'];

/** Vietnamese UI expand/collapse toggles */
export const EXPAND_SELECTORS = ['[class*="expand"]', '[class*="collapse"]'];

/**
 * Returns interaction sequence for domain + page type
 * @param {string} domain - e.g. 'booking.com'
 * @param {string} pageType - e.g. 'search', 'detail', 'booking'
 * @returns {Array<{selector:string, action:object}|{overlay:object}>}
 */
export function getInteractionPlan(domain, pageType) {
  const plan = [];

  // Always try to dismiss overlays first
  plan.push({ overlay: { selectors: COMMON_OVERLAY_SELECTORS } });

  // Domain-specific: 9trip.vn
  if (domain.includes('9trip') || domain.includes('9trip.vn')) {
    if (pageType === 'search') {
      plan.push(
        { selector: 'button:has-text("Xem thêm")', action: { type: 'click' } },
        { selector: '[class*="expand"]', action: { type: 'click' } },
        { selector: 'input[name*="child"]', action: { type: 'fill', value: '2' } },
        { selector: 'select[name*="childAge"]', action: { type: 'select', value: '10' } },
      );
    } else if (pageType === 'detail') {
      plan.push(
        { selector: '[class*="expand"]', action: { type: 'click' } },
        { selector: 'button:has-text("Giá")', action: { type: 'click' } },
        { selector: 'input[name*="child"]', action: { type: 'fill', value: '2' } },
        { selector: 'select[name*="childAge"]', action: { type: 'select', value: '10' } },
      );
    } else if (pageType === 'booking') {
      plan.push(
        { selector: 'button[aria-label*="child"]', action: { type: 'click' } },
        { selector: 'button[aria-label*="child"]', action: { type: 'click' } },
        { selector: 'select[name*="childAge"]', action: { type: 'select', value: '10' } },
      );
    }
    return plan;
  }

  // Domain-specific: booking.com
  if (domain.includes('booking') || domain.includes('booking.com')) {
    if (pageType === 'search') {
      plan.push(
        { selector: '#b2、人员入住', action: { type: 'click' } },
        { selector: 'select[name*="child"]', action: { type: 'select', value: '10' } },
      );
    } else if (pageType === 'detail') {
      plan.push(
        { selector: '[data-testid="price-per-stay"]', action: { type: 'click' } },
        { selector: 'select[name*="child_age"]', action: { type: 'select', value: '10' } },
      );
    }
    return plan;
  }

  // Fallback generic plan
  plan.push(
    { selector: 'input[name*="child"]', action: { type: 'fill', value: '2' } },
    { selector: 'select[name*="childAge"]', action: { type: 'select', value: '10' } },
    { selector: 'button[aria-label*="child"]', action: { type: 'click' } },
    { selector: 'button[aria-label*="child"]', action: { type: 'click' } },
  );

  return plan;
}