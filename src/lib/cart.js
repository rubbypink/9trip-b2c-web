/**
 * Cart state management using React Context.
 * Supports multi-item cart, coupon application, real-time price calculation.
 * Hotel items are keyed by composite key: serviceId + roomId + rateType + startDate
 * to allow multiple room types in the same hotel.
 */
"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { validateCoupon } from "./firestore";

const CartContext = createContext(null);

/**
 * @typedef {Object} CartItem
 * @property {string} serviceId
 * @property {string} [roomId] - Room ID (for hotel_room items)
 * @property {string} [rateType] - Rate type (for hotel_room items)
 * @property {string} serviceType - 'tour' | 'hotel_room' | 'activity' | 'car'
 * @property {string} serviceTitle
 * @property {string} featuredImage
 * @property {*} startDate - Timestamp or ISO string
 * @property {*} endDate - Timestamp or ISO string (for hotel)
 * @property {number} adults
 * @property {number} children
 * @property {number} infants
 * @property {number} rooms - Number of rooms (for hotel)
 * @property {number} basePrice - Unit price
 * @property {number} discount - Discount amount per unit
  * @property {number} total - Line total
 * @property {string} currency
 * @property {number} [displayQuantity] - Formatted quantity for dropdown display
 */


/**
 * @typedef {Object} CartState
 * @property {CartItem[]} items
 * @property {string|null} couponCode
 * @property {number} couponDiscount
 * @property {Object|null} couponData
 */

/**
 * Build a composite key for matching cart items.
 * For hotel_room items: serviceId + roomId + rateType + startDate
 * For other items: serviceId + startDate
 * @param {CartItem} item
 * @returns {string}
 */
function getItemKey(item) {
  if (item.serviceType === 'hotel_room' && item.roomId) {
    return `${item.serviceId}_${item.roomId}_${item.rateType || ''}_${item.startDate}`;
  }
  return `${item.serviceId}_${item.startDate}`;
}

/**
 * Find the index of a matching item in the cart array.
 * @param {CartItem[]} items
 * @param {CartItem} item
 * @returns {number}
 */
function findItemIndex(items, item) {
  const key = getItemKey(item);
  return items.findIndex((i) => getItemKey(i) === key);
}

/**
 * CartProvider wraps checkout-related pages.
 * @param {{ children: React.ReactNode }} props
 */
export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [couponCode, setCouponCode] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponData, setCouponData] = useState(null);

  /**
   * Add item to cart. Uses composite key for matching:
   * - hotel_room: serviceId + roomId + rateType + startDate
   * - other: serviceId + startDate
   * Does NOT reset coupon when updating existing items (only on add/remove).
   * @param {CartItem} item
   */
  const addItem = useCallback((item) => {
    setItems((prev) => {
      const existingIdx = findItemIndex(prev, item);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = item;
        return copy;
      }
      return [...prev, item];
    });
    // Only reset coupon when a completely new item is added
    // (updates to existing items keep the coupon)
  }, []);

  /**
   * Remove item from cart by index.
   * @param {number} index
   */
  const removeItem = useCallback((index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setCouponCode(null);
    setCouponDiscount(0);
    setCouponData(null);
  }, []);

  /**
   * Update quantity and recalculate total for a cart item.
   * Supports both index-based (legacy) and hotel key-based matching.
   * Does NOT reset coupon — quantity changes preserve the applied coupon.
   *
   * @param {number|Object} params - Index (number) or matching object { serviceId, roomId?, rateType?, startDate }
   * @param {number} newQuantity - New quantity value (1-10)
   */
  const updateItemQuantity = useCallback((params, newQuantity) => {
    setItems((prev) => {
      const copy = [...prev];
      let idx = -1;

      if (typeof params === 'number') {
        idx = params;
      } else {
        // Key-based matching for hotel items
        const key = `${params.serviceId}_${params.roomId || ''}_${params.rateType || ''}_${params.startDate}`;
        idx = prev.findIndex((i) => getItemKey(i) === key);
      }

      if (idx >= 0 && idx < copy.length) {
        const item = copy[idx];
        const qty = Math.max(1, Math.min(10, newQuantity));
        const unitPrice = item.basePrice || 0;
        copy[idx] = { ...item, rooms: qty, total: unitPrice * qty };
      }
      return copy;
    });
    // Do NOT reset coupon — quantity changes preserve the coupon
  }, []);

  /**
   * Update a cart item by composite key.
   * Merges the provided partial data into the matching cart item.
   * Used by RoomsPanel to sync room selections without resetting the cart.
   * If no matching item is found, adds it as a new item.
   *
   * @param {CartItem} item - Full or partial cart item data (must include composite key fields)
   */
  const updateCartItem = useCallback((item) => {
    setItems((prev) => {
      const existingIdx = findItemIndex(prev, item);
      const copy = [...prev];
      if (existingIdx >= 0) {
        // Merge: keep existing fields, override with new data
        copy[existingIdx] = { ...copy[existingIdx], ...item };
      } else {
        // Add as new item
        copy.push(item);
      }
      return copy;
    });
    // Do not reset coupon — updates preserve the coupon
  }, []);

  /**
   * Remove a hotel room from cart by composite key.
   * Only removes if the key matches exactly.
   * @param {{ serviceId: string, roomId: string, rateType: string, startDate: string }} key
   */
  const removeCartItemByKey = useCallback(({ serviceId, roomId, rateType, startDate }) => {
    const key = `${serviceId}_${roomId}_${rateType}_${startDate}`;
    setItems((prev) => {
      const idx = prev.findIndex((i) => getItemKey(i) === key);
      if (idx >= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      return prev;
    });
    setCouponCode(null);
    setCouponDiscount(0);
    setCouponData(null);
  }, []);

  /**
   * Clear the entire cart.
   */
  const clearCart = useCallback(() => {
    setItems([]);
    setCouponCode(null);
    setCouponDiscount(0);
    setCouponData(null);
  }, []);

  /**
   * Apply a coupon code.
   * @param {string} code
   * @returns {Promise<{success: boolean, message: string}>}
   */
  const applyCoupon = useCallback(async (code) => {
    if (!code) return { success: false, message: "Vui lòng nhập mã giảm giá" };
    const coupon = await validateCoupon(code);
    if (!coupon) return { success: false, message: "Mã giảm giá không hợp lệ hoặc đã hết hạn" };

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    if (coupon.minSpend && subtotal < coupon.minSpend) {
      return { success: false, message: `Đơn tối thiểu ${coupon.minSpend.toLocaleString()} để áp dụng mã này` };
    }

    let discount = 0;
    if (coupon.type === "percent") {
      discount = subtotal * (coupon.amount / 100);
    } else {
      discount = coupon.amount;
    }
    discount = Math.min(discount, subtotal);

    setCouponCode(code);
    setCouponDiscount(discount);
    setCouponData(coupon);
    return { success: true, message: `Đã áp dụng mã, giảm ${discount.toLocaleString()}` };
  }, [items]);

  /**
   * Remove applied coupon.
   */
  const removeCoupon = useCallback(() => {
    setCouponCode(null);
    setCouponDiscount(0);
    setCouponData(null);
  }, []);

  // Hàm hồi sinh giỏ hàng từ mảng items backup
  const restoreCart = (backupItems) => {
    if (backupItems && backupItems.length > 0) {
      setItems(backupItems); // Thay setItems bằng hàm cập nhật state giỏ hàng của bro
    }
  };

  // Derived values (rounded to avoid floating point errors)
  const subtotal = useMemo(() => Math.round(items.reduce((sum, item) => sum + item.total, 0)), [items]);

  /**
   * Get cart items formatted for dropdown display.
   * Adds displayQuantity based on service type.
   * @returns {CartItem[]}
   */
  const getCartItemsForDropdown = useCallback(() => {
    return items.map((item) => {
      let displayQuantity = 1;
      if (item.serviceType === "hotel_room") {
        displayQuantity = item.rooms || 1;
      } else if (item.serviceType === "tour" || item.serviceType === "activity") {
        displayQuantity = (item.adults || 0) + (item.children || 0);
      }
      return { ...item, displayQuantity };
    });
  }, [items]);

  /**
   * Get total number of distinct services in cart.
   * @returns {number}
   */
  const getCartTotalItems = useCallback(() => {
    return items.length;
  }, [items]);

  const itemCount = items.length;
  const taxRate = 0.08; // 8% default, can be overridden from settings
  const tax = useMemo(() => Math.round((subtotal - couponDiscount) * taxRate), [subtotal, couponDiscount]);
  const grandTotal = useMemo(() => Math.round(subtotal - couponDiscount + tax), [subtotal, couponDiscount, tax]);

  const value = {
    items,
    itemCount,
    couponCode,
    couponDiscount,
    couponData,
    subtotal,
    tax,
    grandTotal,
    getCartItemsForDropdown,
    getCartTotalItems,
    addItem,
    removeItem,
    updateItemQuantity,
    updateCartItem,
    removeCartItemByKey,
    clearCart,
    applyCoupon,
    removeCoupon,
    restoreCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * Hook to access cart context.
 * @returns {CartState & {
 *   itemCount: number,
 *   subtotal: number,
 *   tax: number,
 *   grandTotal: number,
 *   getCartItemsForDropdown: Function,
 *   getCartTotalItems: Function,
 *   addItem: Function,
 *   removeItem: Function,
 *   clearCart: Function,
 *   applyCoupon: Function,
 *   removeCoupon: Function,
 *   restoreCart: Function,
 *   updateItemQuantity: Function,
 *   updateCartItem: Function,
 *   removeCartItemByKey: Function,
 * }}
 */
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

/**
 * Compute total price for a single booking item.
 * @param {number} adultPrice
 * @param {number} childPrice
 * @param {number} infantPrice
 * @param {number} adults
 * @param {number} children
 * @param {number} infants
 * @param {number} discountPercent - Discount percentage (0-100)
 * @returns {{ baseTotal: number, discountAmount: number, finalTotal: number }}
 */
export function calcBookingPrice(adultPrice, childPrice, infantPrice, adults, children, infants, discountPercent = 0) {
  const baseTotal = adultPrice * adults + childPrice * children + infantPrice * infants;
  const discountAmount = baseTotal * (discountPercent / 100);
  const finalTotal = baseTotal - discountAmount;
  return { baseTotal, discountAmount, finalTotal };
}