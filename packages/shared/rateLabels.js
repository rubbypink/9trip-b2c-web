/**
 * @typedef {Object} RateType
 * @property {string} key - Unique identifier for the rate type
 * @property {string} label - Vietnamese display label
 * @property {number} multiplier - Price multiplier for this rate type
 * @property {string} icon - Emoji icon representing the rate type
 */

/** @type {RateType[]} */
export const RATE_TYPES = [
  { key: 'standard', label: 'Giá cơ bản', multiplier: 1.0, icon: '🏨' },
  { key: 'breakfast', label: 'Bao gồm ăn sáng', multiplier: 1.25, icon: '🍽️' },
  { key: 'all_inclusive', label: 'Trọn gói', multiplier: 1.6, icon: '⭐' },
];

/**
 * Get Vietnamese label for a rate type key.
 * @param {string} key - Rate type key (standard|breakfast|all_inclusive)
 * @returns {string} Vietnamese label
 */
export function getRateTypeLabel(key) {
  const type = RATE_TYPES.find((t) => t.key === key);
  return type ? type.label : key;
}

/**
 * Get icon for a rate type key.
 * @param {string} key - Rate type key (standard|breakfast|all_inclusive)
 * @returns {string} Emoji icon
 */
export function getRateTypeIcon(key) {
  const type = RATE_TYPES.find((t) => t.key === key);
  return type ? type.icon : '';
}

/**
 * Get price multiplier for a rate type key.
 * @param {string} key - Rate type key (standard|breakfast|all_inclusive)
 * @returns {number} Price multiplier
 */
export function getRateTypeMultiplier(key) {
  const type = RATE_TYPES.find((t) => t.key === key);
  return type ? type.multiplier : 1.0;
}
