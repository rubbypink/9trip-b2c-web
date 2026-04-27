/**
 * Format price to VND currency string.
 * @param {number} price
 * @returns {string} Formatted price (e.g. "1.200.000 ₫")
 */
export function formatPrice(price) {
  if (price == null || isNaN(price)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Calculate total for a list of items.
 * @param {Array<{price: number, quantity: number}>} items
 * @returns {number}
 */
export function calcTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}